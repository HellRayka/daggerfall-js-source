// DOLL-SKIN (2026-10-11, the owner: "transform the paperdoll into a proper directional sprite with attack animations,
// jump animations, etc allowing the user to use their paperdoll instead of the eye of the Beholder skin system"):
// THE PAPERDOLL AS A SKIN - the puppet (characters/dollPuppet.js), the skin's slots and frames (player/dollSkin.js), the
// sprite door (eotbSprite.js), the body and the peers that wear it, the jump law (player/motor.js) and the wire.
//
// THE DOLL HERE IS OURS: a figure of plain rectangles in the compositor's own shape (110x184, labelled layers) - no
// ARENA2 pixel is read or written (Port-Doctrine "A RENDER OF GAME DATA IS GAME DATA").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DOLL_LAYER, dollLayerOfSlot, buildDollRig, renderDollFrame, posePuppet, placeParts, DOLL_TABLE_FRAMES, VIEW_DEGREES,
} from '../src/characters/dollPuppet.js';
import {
  PAPERDOLL_SKIN, DOLL_ARCHIVE, DOLL_FIGURE_PX, DOLL_RETIRE_MS, DOLL_PEER_SLOTS, localDoll, peerDoll, dollSprite, dollScale,
  onDollRetired, isRetiredTex, drawFrame, dollFramePixels, dollRecipe, dollPreview, setDollPeerEntity,
  _setDollSkinSeamsForTests, _resetDollSkinForTests, _dollSlotsForTests,
} from '../src/player/dollSkin.js';
import { spriteFor, spriteOffset, eotbSpriteUrl } from '../src/player/eotbSprite.js';
import { createEotbBody, decodeSprite } from '../src/player/eotbBody.js';
import { createEotbArt, createPeerWalkers } from '../src/net/peerRiders.js';
import { TABLE_FRAMES, ARCHIVE_FOOT } from '../src/player/eotbBillboard.js';
import { FOOT_SKIN_COUNT } from '../src/player/classSkins.js';
import { EQUIP_SLOTS } from '../src/characters/paperdoll.js';
import { airOf, createAirClock, airPoseOf, AIR_FALL_MS, motionBagOf } from '../src/player/motor.js';
import { validPose, validLook, poseChanged, FOOT_SKINS } from '../src/net/wire.js';
import { setModSetting, _resetModSettings, MOD_SETTINGS } from '../src/systems/modSettings.js';
import { FOOT_GROUPS, skinSets } from '../src/ui/skinCard.js';

const rd = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/** OUR figure: hair over a face, a neck, a tunic, arms apart from it, legs apart from each other, boots, a sword in the
 *  screen-left hand and a cloak's lining behind. */
function figure({ sword = true, cape = true, robe = false } = {}) {
  const W = 110, H = 184;
  const rgba = new Uint8Array(W * H * 4), labels = new Uint8Array(W * H);
  const put = (x, y, c, l) => { const i = y * W + x; rgba.set([...c, 255], i * 4); labels[i] = l; };
  const rect = (x0, y0, x1, y1, c, l) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, c, l); };
  const cx = 55;
  let lining = null;
  if (cape) { rect(cx - 18, 30, cx + 18, 120, [120, 20, 20], DOLL_LAYER.lining); lining = rgba.slice(); }
  for (let y = 8; y <= 30; y++) for (let x = cx - 9; x <= cx + 9; x++) if ((x - cx) ** 2 / 81 + (y - 19) ** 2 / 121 <= 1) put(x, y, y < 15 ? [90, 60, 20] : [230, 190, 150], DOLL_LAYER.head);
  rect(cx - 3, 31, cx + 3, 34, [230, 190, 150], DOLL_LAYER.body);
  rect(cx - 15, 35, cx + 15, 95, [40, 80, 160], DOLL_LAYER.body);
  for (const s of [-1, 1]) {
    rect(s < 0 ? cx - 23 : cx + 17, 36, s < 0 ? cx - 17 : cx + 23, 70, [40, 80, 160], DOLL_LAYER.body);
    rect(s < 0 ? cx - 24 : cx + 18, 71, s < 0 ? cx - 18 : cx + 24, 108, [230, 190, 150], DOLL_LAYER.body);
    rect(s < 0 ? cx - 14 : cx + 2, 96, s < 0 ? cx - 2 : cx + 14, 140, [90, 70, 50], DOLL_LAYER.body);
    rect(s < 0 ? cx - 13 : cx + 3, 141, s < 0 ? cx - 3 : cx + 13, 178, [70, 50, 35], DOLL_LAYER.body);
  }
  if (robe) rect(cx - 15, 96, cx + 15, 178, [60, 40, 100], DOLL_LAYER.body);
  if (sword) rect(cx - 22, 109, cx - 21, 150, [200, 200, 210], DOLL_LAYER.right);
  return { width: W, height: H, rgba, labels, lining };
}
const opaque = (img) => { let n = 0; for (let i = 3; i < img.rgba.length; i += 4) if (img.rgba[i]) n++; return n; };
const bboxOf = (img) => {
  let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (img.rgba[(y * img.width + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
};
const px = (img, x, y) => Array.from(img.rgba.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4));

test('DOLL-SKIN the compositor names each pixel\'s layer - a diff after every layer, the blits untouched - and the doll\'s parts follow the slots: the hands\' items, the helm, the cloak, the rest the body\'s (mutants: a layer unmarked; the helm as the face)', () => {
  assert.equal(dollLayerOfSlot(EQUIP_SLOTS.RightHand), DOLL_LAYER.right);
  assert.equal(dollLayerOfSlot(EQUIP_SLOTS.LeftHand), DOLL_LAYER.left);
  assert.equal(dollLayerOfSlot(EQUIP_SLOTS.Head), DOLL_LAYER.helm, 'a helm keeps its own pixels from behind');
  assert.equal(dollLayerOfSlot(EQUIP_SLOTS.Cloak1), DOLL_LAYER.cloak);
  assert.equal(dollLayerOfSlot(EQUIP_SLOTS.ChestArmor), DOLL_LAYER.body);
  const src = rd('src/ui/paperDoll.js');
  const compose = src.slice(src.indexOf('async function composeDoll('), src.indexOf('export async function refreshPaperDoll('));
  assert.match(compose, /mark\(DOLL_LAYER\.lining\);\s*\n\s*if \(labels\) lining = out\.slice\(\);/, 'the lining marked, and kept whole before the body covers it');
  assert.equal((compose.match(/mark\(DOLL_LAYER\.body\)/g) ?? []).length, 2, 'the nude body and its welds');
  assert.match(compose, /blit\(out, headArt \?\? art\.head, art\.palette, \{ S \}\);\s*\n\s*mark\(DOLL_LAYER\.head\);/);
  assert.equal((compose.match(/mark\(dollLayerOfSlot\(it\.equipSlot\)\)/g) ?? []).length, 2, 'both item arms - the indexed blit and the truecolor one');
  assert.match(src, /labels\[i\] = out\[i \* 4 \+ 3\] \? kind : DOLL_LAYER\.none;/, 'a pixel a mask holed through to a clear panel is no one\'s');
});

test('DOLL-SKIN the rig is read off the doll: the neck under the head, the crotch where the legs\' gap closes, the hands where an arm last stands apart, the weapon\'s hand by its pixels; a robe that hides the gap falls to the proportion (mutants: the crotch read from the top; the weapon side fixed)', () => {
  const rig = buildDollRig(figure());
  assert.equal(rig.cx, 55);
  assert.equal(rig.yTop, 8); assert.equal(rig.yBot, 178);
  assert.equal(rig.neckY, 31, 'the row under the head');
  assert.equal(rig.crotchY, 95, 'the last row the legs touch, up from the feet');
  assert.equal(rig.weaponSide, -1, 'the sword is in the screen-left hand');
  assert.deepEqual(rig.joints.hand[-1].map(Math.round), [34, 108]);
  assert.deepEqual(rig.joints.hand[1].map(Math.round), [76, 108]);
  assert.ok(rig.joints.elbow[-1][1] > rig.shoulderY && rig.joints.elbow[-1][1] < 108, 'the elbow between');
  assert.deepEqual(Object.keys(rig.parts).sort(), ['cape', 'head', 'item-1', 'larm-1', 'larm1', 'shin-1', 'shin1', 'thigh-1', 'thigh1', 'torso', 'uarm-1', 'uarm1'].sort());
  assert.equal(rig.parts.cape.w, 37, 'the cloak\'s lining whole, not the rim the body leaves of it');
  const robed = buildDollRig(figure({ robe: true }));
  assert.equal(robed.crotchY, Math.round(robed.yTop + (robed.yBot - robed.yTop + 1) * 0.53), 'no gap: the proportion');
  assert.equal(buildDollRig({ width: 4, height: 4, rgba: new Uint8Array(64), labels: new Uint8Array(16) }), null, 'no figure, no rig');
});

test('DOLL-SKIN the stand from the front IS the doll - every pixel where it was drawn, on the floor, about its centre line (mutants: an arm abducted at rest; the frame off its centre)', () => {
  const doll = figure();
  const rig = buildDollRig(doll);
  const f = renderDollFrame(rig, 'Idle', 0, 0);
  assert.equal(f.height, rig.yBot + 1 - rig.yTop, 'the bottom row is the floor the feet stand on');
  const hw = f.width / 2, ox = rig.cx - hw, oy = rig.yBot + 1 - f.height;
  let differ = 0, n = 0;
  for (let y = 0; y < f.height; y++) for (let x = 0; x < f.width; x++) {
    const dx = x + ox, dy = y + oy;
    const want = dx >= 0 && dx < doll.width ? Array.from(doll.rgba.subarray((dy * doll.width + dx) * 4, (dy * doll.width + dx) * 4 + 4)) : [0, 0, 0, 0];
    const got = px(f, x, y);
    if (!want[3] && !got[3]) continue;
    n++;
    if (want.join() !== got.join()) differ++;
  }
  assert.ok(n > 3000);
  assert.equal(differ, 0, `${differ} of ${n} pixels moved`);
});

test('DOLL-SKIN the views turn: the back is the front mirrored, its head the hair\'s colour and the cloak over the back; side-on the figure narrows and faces the screen\'s left, the eye at its left (mutants: the back unmirrored; the face kept from behind; the cloak left under the body; the side facing right)', () => {
  const rig = buildDollRig(figure());
  const front = renderDollFrame(rig, 'Idle', 0, 0), back = renderDollFrame(rig, 'Idle', 0, 4), side = renderDollFrame(rig, 'Idle', 0, 2);
  assert.equal(back.width, front.width);
  // the sword hangs at the screen-left from the front, the screen-right from behind
  const swordAt = (img) => { for (let x = 0; x < img.width; x++) if (px(img, x, img.height - 40).join() === '200,200,210,255') return x; return -1; };
  assert.ok(swordAt(front) < front.width / 2 && swordAt(back) > back.width / 2, `the sword at ${swordAt(front)} then ${swordAt(back)}`);
  // the face is hair from behind; the tunic is the cloak
  const faceRow = 20 - (rig.yBot + 1 - front.height);
  assert.deepEqual(px(front, front.width / 2, faceRow).slice(0, 3), [230, 190, 150]);
  const hairBack = px(back, back.width / 2, faceRow);
  assert.ok(hairBack[0] < 150 && hairBack[1] < 110 && hairBack[2] < 60, `the back of the head is hair, not a face: ${hairBack}`);
  const chest = 60 - (rig.yBot + 1 - front.height);
  assert.deepEqual(px(front, front.width / 2, chest).slice(0, 3), [40, 80, 160], 'the tunic from the front');
  assert.deepEqual(px(back, back.width / 2, chest).slice(0, 3), [120, 20, 20], 'the cloak from behind');
  const w = (img, row) => { let a = -1, b = -1; for (let x = 0; x < img.width; x++) if (px(img, x, row)[3]) { if (a < 0) a = x; b = x; } return b - a; };
  assert.ok(w(side, chest) < w(front, chest) * 0.75, `side-on the body narrows: ${w(side, chest)} against ${w(front, chest)}`);
  // the cut, arm forward: side-on the forward is the screen's left
  const cut = renderDollFrame(rig, 'AttackMelee', 3, 2);
  const steel = []; for (let y = 0; y < cut.height; y++) for (let x = 0; x < cut.width; x++) if (px(cut, x, y).join() === '200,200,210,255') steel.push(x);
  assert.ok(steel.length && steel.reduce((a, b) => a + b, 0) / steel.length < cut.width / 2 - 10, 'the blade forward - to the screen\'s left');
  assert.deepEqual(VIEW_DEGREES, [0, 45, 90, 135, 180]);
});

test('DOLL-SKIN the clips: the body\'s own frame counts; a walk that steps, a stroke that rises over the head, a jump that tucks its feet off the floor and a fall that lies down (mutants: a clip frame skipped; the jump not laid over the table; the fall standing)', () => {
  for (const [t, n] of Object.entries(DOLL_TABLE_FRAMES)) assert.equal(TABLE_FRAMES[t], n, `${t}: the body's clip length`);
  const rig = buildDollRig(figure());
  const sig = (img) => `${img.width}x${img.height}:${opaque(img)}`;
  const walk = [0, 1, 2, 3].map((f) => Buffer.from(renderDollFrame(rig, 'Move', f, 1).rgba).toString('base64'));
  assert.equal(new Set(walk).size, 4, 'four steps, four pictures');
  const stroke = [0, 1, 2, 3, 4, 5].map((f) => renderDollFrame(rig, 'AttackMelee', f, 0));
  assert.ok(stroke[2].height > stroke[0].height + 10, 'the top of the stroke stands over the head');
  const up = renderDollFrame(rig, 'Idle', 0, 2, { air: 1 }), down = renderDollFrame(rig, 'Idle', 0, 2, { air: 2 });
  assert.ok(bboxOf(up).y1 < up.height - 5, `rising, the feet tucked off the floor (lowest row ${bboxOf(up).y1} of ${up.height})`);
  assert.notEqual(sig(up), sig(down));
  const armed = posePuppet('IdleMelee', 0, { weaponSide: -1, air: 1 });
  assert.equal(armed.arm[-1].sh, 35, 'the jump keeps the weapon ready');
  assert.equal(armed.leg[-1].knee, 75, 'and tucks the legs');
  const lying = renderDollFrame(rig, 'Death', 1, 0);
  assert.ok(lying.width > lying.height * 2, `the fallen lie: ${lying.width}x${lying.height}`);
  assert.equal(posePuppet('Death', 1, { air: 1 }).rot, 90, 'the dead do not jump');
});

test('DOLL-SKIN the sprite door: a paperdoll look with its doll answers the doll\'s archive, the wheel\'s record and mirror, the generation and the jump in its record; with none yet, the mod\'s first set; its offset is its own scale, its key its own URL (mutants: the doll ignored; the generation out of the record)', () => {
  const doll = { archive: DOLL_ARCHIVE, gen: 3 };
  const s = spriteFor('Move', 1, 2, { onFoot: PAPERDOLL_SKIN, doll, air: 1 });
  assert.deepEqual({ archive: s.archive, record: s.record, mirror: s.mirror, rec: s.rec, key: s.key },
    { archive: DOLL_ARCHIVE, record: 1, mirror: true, rec: 'Move.1-2mj1g3', key: `doll:${DOLL_ARCHIVE}:3:Move:1:2:1` });
  assert.equal(spriteFor('Idle', 6, 0, { onFoot: PAPERDOLL_SKIN, doll }).record, 2, 'orientation 6: record 2, unmirrored');
  assert.equal(spriteFor('Idle', 0, 0, { onFoot: PAPERDOLL_SKIN }).archive, ARCHIVE_FOOT, 'no doll yet: the mod\'s first set');
  assert.equal(spriteFor('IdleHorse', 0, 0, { onFoot: PAPERDOLL_SKIN, doll }).archive !== DOLL_ARCHIVE, true, 'the saddle is the mod\'s');
  assert.equal(eotbSpriteUrl(s.key), s.key);
  assert.equal(PAPERDOLL_SKIN, FOOT_SKIN_COUNT);
  assert.equal(FOOT_SKINS, PAPERDOLL_SKIN + 1, 'the wire bounds the look\'s set at the paperdoll');
  assert.equal(MOD_SETTINGS['eye-of-the-beholder'].keys['Graphics.OnFoot'].labels[PAPERDOLL_SKIN], 'Your paperdoll');
  assert.deepEqual(FOOT_GROUPS.at(-1), { label: 'Your paperdoll', from: PAPERDOLL_SKIN, to: Infinity });
  assert.deepEqual(skinSets().foot.at(-1), { index: PAPERDOLL_SKIN, name: 'Your paperdoll', key: null, url: null }, 'no doll: the tile says its name');
});

/** The skin's clock and timer in the test's hands. */
function seams() {
  _resetDollSkinForTests();
  let now = 0;
  const timers = [];
  _setDollSkinSeamsForTests({ compose: async () => figure(), now: () => now, after: (fn, ms) => timers.push({ fn, at: now + ms }) });
  return {
    tick(ms = 0) { now += ms; for (const t of timers.splice(0)) { if (t.at <= now) t.fn(); else timers.push(t); } },
    get now() { return now; }, set now(v) { now = v; }, timers,
  };
}
const flush = () => new Promise((r) => setImmediate(r));
const entity = (items = []) => ({ race: 'Breton', gender: 'male', faceIndex: 2, items, equip: { slots: [] } });

test('DOLL-SKIN the player\'s doll: composed off their own entity, re-composed when their gear changes, the old outfit\'s textures let go DOLL_RETIRE_MS on; its scale stands it DOLL_FIGURE_PX tall; its frames come out in the world\'s rows (mutants: the recipe blind to the gear; the retire told at once; the rows not turned)', async () => {
  const t = seams();
  const e = entity();
  assert.equal(localDoll(e), null, 'composing');
  await flush();
  const h = localDoll(e);
  assert.deepEqual(h, { archive: DOLL_ARCHIVE, gen: 1 });
  const rig = buildDollRig(figure());
  assert.equal(dollScale(DOLL_ARCHIVE), rig.figureHeight / DOLL_FIGURE_PX);
  assert.deepEqual(spriteOffset(DOLL_ARCHIVE, 0), { scale: rig.figureHeight / DOLL_FIGURE_PX, x: 0, y: 0 });
  // the frame, bottom row first
  const key = dollSprite('Idle', 0, 0, h).key;
  const out = drawFrame(key);
  const top = renderDollFrame(rig, 'Idle', 0, 0);
  assert.equal(out.width, top.width);
  const bottomRow = Array.from(top.rgba.subarray((top.height - 1) * top.width * 4, top.height * top.width * 4));
  assert.deepEqual(Array.from(new Uint8Array(out.colors.buffer, out.colors.byteOffset, top.width * 4)), bottomRow, 'row 0 is the picture\'s bottom');
  // a new outfit: a new generation, the old one retired a moment later
  const heard = [];
  onDollRetired((a, g) => heard.push([a, g]));
  const sword = { templateIndex: 120, group: 'Weapons', equipSlot: EQUIP_SLOTS.RightHand, material: 1 };
  const e2 = { ...entity([sword]), equip: { slots: Object.assign([], { [EQUIP_SLOTS.RightHand]: sword }) } };
  assert.notEqual(dollRecipe(e2), dollRecipe(e), 'the recipe sees the sword');
  t.tick(100);
  assert.deepEqual(localDoll(e2), { archive: DOLL_ARCHIVE, gen: 1 }, 'looked at only every DOLL_RECIPE_MS - and the old one stands while the new composes');
  t.tick(500);
  localDoll(e2);
  await flush();
  assert.deepEqual(localDoll(e2), { archive: DOLL_ARCHIVE, gen: 2 });
  assert.deepEqual(heard, [], 'not at once');
  t.tick(DOLL_RETIRE_MS);
  assert.deepEqual(heard, [[DOLL_ARCHIVE, 1]]);
  assert.ok(isRetiredTex(`${DOLL_ARCHIVE}:Idle.0-0g1`, DOLL_ARCHIVE, 1) && !isRetiredTex(`${DOLL_ARCHIVE}:Idle.0-0g2`, DOLL_ARCHIVE, 1));
  assert.throws(() => drawFrame(key), /no such doll/, 'an outgrown generation\'s frame is not drawn');
  assert.ok(dollPreview().width > 0, 'the card\'s picture');
  _resetDollSkinForTests();
});

test('DOLL-SKIN the peers\' dolls: composed off their looks\' stand-ins, a slot each, shared by one look, the least recently drawn let go past DOLL_PEER_SLOTS (mutants: a slot per call; no slot let go)', async () => {
  const t = seams();
  const made = [];
  setDollPeerEntity((look) => { made.push(look.race); return entity(); });
  const look = (race) => ({ race, gender: 'male', faceIndex: 0, items: [] });
  assert.equal(peerDoll(look('Nord')), null);
  assert.equal(peerDoll(look('Nord')), null, 'still composing - asked once');
  assert.deepEqual(made, ['Nord']);
  await flush();
  assert.deepEqual(peerDoll(look('Nord')), { archive: DOLL_ARCHIVE + 1, gen: 1 });
  const heard = [];
  onDollRetired((a, g) => heard.push([a, g]));
  const races = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
  for (const r of races) { t.now += 1; peerDoll(look(r)); }
  await flush();
  assert.equal(_dollSlotsForTests().length, DOLL_PEER_SLOTS);
  t.now += 1; peerDoll(look('Z'));
  assert.equal(_dollSlotsForTests().length, DOLL_PEER_SLOTS, 'one let go for the new one');
  t.tick(DOLL_RETIRE_MS);
  assert.deepEqual(heard, [[DOLL_ARCHIVE + 1, 1]], 'the Nord - the least recently drawn');
  _resetDollSkinForTests();
});

test('DOLL-SKIN the decode doors draw a doll\'s frame - the body\'s and the peers\' - a few a task, never fetched (mutants: a doll key fetched)', async () => {
  const t = seams();
  localDoll(entity());
  await flush();
  const h = localDoll(entity());
  const keys = [0, 1, 2, 3, 4].map((v) => dollSprite('Move', [0, 7, 6, 5, 4][v], 1, h).key);
  const all = Promise.all(keys.map((k) => decodeSprite(k)));
  t.tick(0);
  const got = await all;
  assert.ok(got.every((g) => g.width > 0 && g.colors.length === g.width * g.height));
  const one = dollFramePixels(keys[0]);
  t.tick(0);
  assert.ok((await one).width > 0);
  _resetDollSkinForTests();
});

test('DOLL-SKIN the jump: 0 on the ground, swimming, levitating, riding or on a wall; 1 the moment the body rises; 2 once it has fallen AIR_FALL_MS - a kerb is no jump; on the wire only in the air (mutants: the fall drawn at once; a rise held back)', () => {
  assert.equal(airOf({ grounded: true, velY: 5 }), 0);
  for (const k of ['swimming', 'levitating', 'riding', 'climbing']) assert.equal(airOf({ grounded: false, [k]: true, velY: 5 }), 0, k);
  assert.equal(airOf({ grounded: false, velY: 4 }), 1);
  assert.equal(airOf({ grounded: false, velY: -3 }), 2);
  const c = createAirClock();
  assert.equal(c({ grounded: false, velY: 4 }, 0), 1, 'a rise at once');
  assert.equal(c({ grounded: false, velY: -1 }, 50), 2, 'the same jump coming down');
  const k = createAirClock();
  assert.equal(k({ grounded: false, velY: -1 }, 1000), 0, 'stepping off a kerb');
  assert.equal(k({ grounded: false, velY: -2 }, 1000 + AIR_FALL_MS - 1), 0);
  assert.equal(k({ grounded: false, velY: -3 }, 1000 + AIR_FALL_MS), 2, 'a fall that lasts');
  assert.equal(k({ grounded: true }, 1200), 0);
  assert.equal(motionBagOf({ velY: 2.5 }).velY, 2.5);
  const player = { grounded: false, velY: 3 };
  assert.deepEqual(airPoseOf(player, 0), { jp: 1 });
  assert.deepEqual(airPoseOf({ grounded: true }, 0), {});
});

test('DOLL-SKIN the wire: a look may name the paperdoll and the relay keeps it; a pose in the air carries `jp` (1 or 2), omitted on the ground, and a jump begun or landed is news at once (mutants: jp dropped; jp unbounded; the change not news)', () => {
  const look = { race: 'Breton', gender: 'male', faceIndex: 0, eo: PAPERDOLL_SKIN, items: [] };
  assert.equal(validLook(look).eo, PAPERDOLL_SKIN);
  const pose = { x: 1, y: 2, z: 3, yaw: 0, pitch: 0 };
  assert.equal(validPose({ ...pose, jp: 1 }).jp, 1);
  assert.equal(validPose({ ...pose, jp: 2 }).jp, 2);
  assert.equal(validPose({ ...pose, jp: 9 }).jp, 2, 'bounded');
  assert.equal('jp' in validPose({ ...pose, jp: 0 }), false, 'omitted on the ground');
  assert.equal('jp' in validPose(pose), false);
  assert.equal(poseChanged({ ...pose, jp: 1 }, pose), true);
  assert.equal(poseChanged({ ...pose, jp: 1 }, { ...pose, jp: 1 }), false);
  assert.match(rd('src/scenes/world.js'), /\.\.\.airPoseOf\(player, performance\.now\(\)\),/, 'the host sends it');
});

const renderer = () => ({
  uploads: [], batches: [],
  uploadTexture(archive, rec, img) { this.uploads.push({ archive, rec, img }); },
  createBillboardBatch(archive, rec, size) { const b = { archive, rec, size, origin: [0, 0, 0] }; this.batches.push(b); return b; },
  destroyBillboardBatch() {}, drawBillboards() {}, evictTexture(k) { (this.evicted ??= []).push(k); },
});

test('DOLL-SKIN the body wears it: the paperdoll chosen, the rig\'s entity composes the doll, every frame is the doll\'s own (its archive), and in the air the record says so (mutants: the entity not handed; the jump not in the look)', async () => {
  const t = seams();
  _resetModSettings();
  setModSetting('eye-of-the-beholder', 'Graphics.OnFoot', PAPERDOLL_SKIN);
  const r = renderer();
  const b = createEotbBody({ count: () => 3035, urlFor: (k) => `/art/${k}.png`, decode: async () => ({ width: 4, height: 6, colors: new Uint32Array(24) }) });
  b.attach(r, () => ({}));
  await new Promise((res) => setTimeout(res, 5));
  b.toggle(true, false);
  const e = entity();
  const still = (extra = {}) => ({ motion: { forward: 0, standing: true, speed: 0, grounded: true, height: 1.8 }, feet: [0, 0, 0], yaw: 0, cameraPos: [0, 1.5, -2], entity: e, ...extra });
  for (let i = 0; i < 5; i++) b.tick(1 / 60, still());
  await flush();
  for (let i = 0; i < 5; i++) b.tick(1 / 60, still());
  await new Promise((res) => setTimeout(res, 5));
  b.draw(null, { eye: [0, 1.5, -2], feet: [0, 0, 0], yaw: 0 });
  assert.ok(r.uploads.some((u) => u.archive === DOLL_ARCHIVE), 'the doll\'s frames uploaded');
  assert.equal(r.batches.at(-1).archive, DOLL_ARCHIVE, 'and drawn');
  for (let i = 0; i < 3; i++) b.tick(1 / 60, still({ motion: { forward: 0, standing: true, speed: 0, grounded: false, velY: 4, height: 1.8 } }));
  b.draw(null, { eye: [0, 1.5, -2], feet: [0, 0, 0], yaw: 0 });
  await new Promise((res) => setTimeout(res, 5));
  b.draw(null, { eye: [0, 1.5, -2], feet: [0, 0, 0], yaw: 0 });
  assert.match(r.batches.at(-1).rec, /j1g1$/, 'rising');
  assert.match(rd('src/combat/weaponRig.js'), /\n\s*entity,\s*\/\/ DOLL-SKIN/, 'the rig hands the body its entity');
  _resetModSettings();
  _resetDollSkinForTests();
  void t;
});

test('DOLL-SKIN a peer wearing it: their doll composed here off their look - until then they stand as before - then drawn as it, jumping when the pose says (mutants: drawn as the mod\'s set; the pose\'s jump ignored; a flinch as the doll\'s fall)', async () => {
  seams();
  setDollPeerEntity(() => entity());
  const made = [];
  const rend = { uploadTexture() {}, createBillboardBatch: (archive, record, size) => { const b = { archive, record, size, origin: null }; made.push(b); return b; }, destroyBillboardBatch() {} };
  const art = createEotbArt({ renderer: rend, urlFor: (k) => `u:${k}`, decode: async () => ({ width: 50, height: 110, colors: new Uint32Array(50 * 110) }) });
  const w = createPeerWalkers({ art });
  const pose = (o = {}) => ({ x: 4, y: 0, z: 9, yaw: 0, pitch: 0, mv: 0, wd: 0, an: 0, sr: 0, cn: 0, ar: 0, ...o });
  const peer = { id: 'p1', look: { race: 'Nord', gender: 'male', faceIndex: 0, eo: PAPERDOLL_SKIN, items: [] }, shown: pose() };
  const toScene = (p) => [p.x, p.y, p.z];
  w.sync([peer], toScene, { eye: [4, 1, 20], dt: 0.01 });
  assert.equal(w.isWalking('p1'), false, 'composing: the class sprite still stands for them');
  await flush();
  w.sync([peer], toScene, { eye: [4, 1, 20], dt: 0.01 });
  await new Promise((res) => setTimeout(res, 5));
  w.sync([peer], toScene, { eye: [4, 1, 20], dt: 0.01 });
  assert.equal(w.isWalking('p1'), true);
  assert.equal(w.batches()[0].archive, DOLL_ARCHIVE + 1, 'their own doll');
  w.sync([{ ...peer, shown: pose({ jp: 2 }) }], toScene, { eye: [4, 1, 20], dt: 0.01, hurt: () => true });
  await new Promise((res) => setTimeout(res, 5));
  w.sync([{ ...peer, shown: pose({ jp: 2 }) }], toScene, { eye: [4, 1, 20], dt: 0.01, hurt: () => true });
  assert.match(w.batches()[0].record, /^Idle\..*j2g1$/, 'falling - and struck, no fall-table flinch');
  _resetDollSkinForTests();
});
