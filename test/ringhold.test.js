// RING-HOLD (2026-10-11, a player on Discord: "I was with a trade lock because of a Ring, I got rid of the ring and now
// it says only 'something'"): a law hold that stands past STRIKES_FOR_REVIEW after the piece is gone says so, and a trade's
// refusal over my own hold names the piece the session heard - never "something".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../server-account/src/index.js';
import { standService } from './accountDb.mjs';
import { seatRealm, freshSave } from './realmSeat.mjs';
import { TRADE_HELD_NOTICES } from '../src/net/realmTradeLaw.js';
import { tradeHeldNotice, tradeHeldLawNotice } from '../src/systems/itemIds.js';
import { settleRealmTradeHalf } from '../src/systems/realmSaves.js';
import { STRIKES_FOR_REVIEW } from '../server-account/src/judge.js';

const ring = () => ({ templateIndex: 135, group: 'Jewellery', value: 80, hand: 1 });   // 'crafted': a hand on a ring no craft made

test('RING-HOLD: the third hold stands once the ring is gone - and the answer says it is staff\'s, never "until it is gone"', async () => {
  const s = await standService({ DEVELOPER_HANDLES: 'mac' });
  const who = await s.registered('ann'); const R = await seatRealm(s.env, who.secret, 'ann');
  const put = async (save) => {
    const at = R.at();
    const res = await worker.fetch(new Request(`https://accounts.invalid/v1/realm/${R.id}/data`, { method: 'PUT',
      headers: { authorization: `Bearer ${who.secret}`, 'x-realm-lease': at.lease, 'x-realm-seq': String(at.seq + 1), 'x-realm-summary': JSON.stringify({ level: 1 }) },
      body: JSON.stringify(save) }), s.env);
    return res.json();
  };
  const carry = freshSave({ name: 'ann', items: [ring()] });
  const dropped = freshSave({ name: 'ann', world: { piles: [{ items: [ring()] }] } });
  for (let i = 0; i < STRIKES_FOR_REVIEW; i++) {
    assert.deepEqual(await put(carry), { ok: true, seq: 2 + 2 * i, tradeHeld: 'law', tradeHeldWhy: { code: 'crafted', t: 135 } });
    if (i < STRIKES_FOR_REVIEW - 1) assert.equal((await put(dropped)).tradeHeld, null, 'dropped: lifted');
  }
  const gone = await put(dropped);
  assert.deepEqual([gone.tradeHeld, gone.tradeHeldWhy], ['law', { code: 'review', t: null }], 'held still - and said to be staff\'s');
  assert.equal(tradeHeldNotice('law', gone.tradeHeld, gone.tradeHeldWhy), TRADE_HELD_NOTICES.review);
  assert.doesNotMatch(TRADE_HELD_NOTICES.review, /something|until it is gone/);
});

test('RING-HOLD: a trade refused over my own law hold names the piece the session heard (it said "something")', async () => {
  const session = {
    tradeHeld: 'law', tradeHeldWhy: { code: 'crafted', t: 135 },
    transact: async (fn) => fn({ id: 'c', lease: 'l', seq: 1,
      io: { base: 'https://accounts.invalid', secret: 'x', fetch: async () => new Response(JSON.stringify({ state: 'refused', why: 'trade-held', held: 'mine' }), { status: 200, headers: { 'content-type': 'application/json' } }) } }),
  };
  const half = { sid: 's'.repeat(16), give: { items: [], gold: 1 }, get: { items: [], gold: 0 }, pick: [] };
  const r = await settleRealmTradeHalf({ session, half, wait: async () => {}, heldSaid: () => tradeHeldNotice(null, session.tradeHeld, session.tradeHeldWhy) });
  assert.equal(r.why, 'trade-held');
  assert.match(r.text, /a Ring it carries/);
  assert.doesNotMatch(r.text, /something/);
});

test('RING-WARN: a law hold\'s notice says each hold counts and the third is staff\'s - named or not - and the words\' "third" is the service\'s STRIKES_FOR_REVIEW', () => {
  assert.equal(STRIKES_FOR_REVIEW, 3, 'the notices say "the third time" and the review "three times" - a new count moves the words');
  const named = tradeHeldNotice(null, 'law', { code: 'crafted', t: 135 });
  assert.equal(named, tradeHeldLawNotice('Ring'));
  for (const text of [named, TRADE_HELD_NOTICES.law]) {
    assert.match(text, /until it is gone\. Each time the law holds it counts: the third time, trading stays frozen until staff have looked\.$/);
  }
  assert.match(TRADE_HELD_NOTICES.review, /three times/);
});
