// CREW-MUSTER (FIELD BUGS 2026-10-14, "Crew Attacking Me": "After a battle my crew started attacking me. I jumped out of
// the seat to defend myself then they stopped attacking. I go back in, they resume ... my crew is only hostile to me when
// I'm in control of the boat"; Mac's call, 2026-10-14: "Both") - bible/01-Overview/Audit-NAV2.md F40 and
// bible/03-World/Naval-Combat.md LIVING CREW. No crew body ever takes the player for its foe;
// what turned on him was the F40 muster. A repel thrown back leaves her struck alongside, and at my helm a struck ship in
// BOARD_RANGE mustered my crew whatever my way - every man to the rail with his blade out, crying "Here they come!" and
// "Nobody sets foot on our deck!" at nobody but the player, for as long as he sat at the helm, and never off it.
//   1. A MUSTER IS FOR A BOARDING THE HELM COULD MAKE: my crew musters toward the struck ship the boarding's own
//      `boardable` would take now (in reach, my way under BOARD_SPEED), her crew toward a helm that could board her
//      (boardingGap) or feet that could go over her rail (footReach).
//   2. ITS WORDS ARE ITS SIDE OF THE BOARDING: the crew going over cries the boarding's (CREW_BLURBS.board), the crew
//      being boarded the repel's (CREW_BLURBS.repel) - the host says which (`way`), the grapple by its kind.
// The real naval host over Come Sail Away's real pool (test/navalSea.mjs), the real crew host (scenes/navalCrew.js) and
// scenes/world.js's navalCrewFrame lifted from its own text, as test/auditnav2_crew.test.js stands them.
import './modsOff.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { asleepHour } from '../src/systems/naval/shipWatch.js';
import { hourOf } from '../src/world/worldClock.js';
import { crewRoster, crewCount, CREW_BLURBS } from '../src/systems/naval/crewLife.js';
import { createNavalCrew, CREW_RANGE, CREW_KEEP } from '../src/scenes/navalCrew.js';
import { intoDeck } from '../src/systems/naval/navalDeck.js';
import { GRAPPLE_S, BOARD_SPEED } from '../src/systems/naval/navalBoarding.js';
import { hullBuild } from '../src/systems/naval/navalShips.js';
import { SHIP_STATES } from '../src/systems/naval/navalDamage.js';
import { sea } from './navalSea.mjs';
import { room } from './navalRoom.mjs';

const WORLD = readFileSync(new URL('../src/scenes/world.js', import.meta.url), 'utf8');
const WRECKED = { v: 1, boats: { 42: { hull: 0, sail: 0, crew: 24, fire: 0, state: 'wrecked', barrels: 4 } }, notoriety: {}, day: 1, raids: [] };

/** The crew host over a stand-in renderer and textures (test/auditnav2_crew.test.js's). */
function crewHost() {
  const textures = new Map();
  const renderer = { createBillboardBatch: (archive, record, size) => ({ archive, record, size }), destroyBillboardBatch: () => {}, textures };
  const tex = { getFrameCount: () => 4, getSize: () => ({ width: 40, height: 80 }), getScale: () => ({ width: 0, height: 0 }), recordCount: 20 };
  return createNavalCrew({ renderer, getTexture: async () => tex, uploadRecordFrame: (a, r, f) => textures.set(`${a}_${r}#${f}`, {}), rand: () => 0.3 });
}
/** scenes/world.js's navalCrewFrame, lifted from its own text with the block of helpers above it (`let _crewBoarding` on). */
function liftCrewFrame(s) {
  const from = WORLD.indexOf('  let _crewBoarding = null;');
  const at = WORLD.indexOf('\n  function navalCrewFrame(dt) {', from);
  assert.ok(from > 0 && at > from, 'the crews\' frame in the world');
  const end = WORLD.indexOf('\n  }\n', at) + 5;
  const names = ['csa', 'modes', 'naval', 'navalCrew', 'cam', 'walkMode', 'playerSpawned', 'player', 'hullBuild', 'crewCount', 'crewRoster', 'intoDeck', 'CREW_KEEP', 'CREW_RANGE', 'navalOn', 'online', 'csaRuntime', 'asleepHour', 'hourOf', 'minuteNow'];
  // eslint-disable-next-line no-new-func
  return new Function('s', `const { ${names.join(', ')} } = s;\n${WORLD.slice(from, end)}\nreturn { navalCrewFrame };`)({
    modes: null, walkMode: false, playerSpawned: false, player: null, cam: { pos: [0, 5, 0] }, online: null, csaRuntime: null, navalOn: () => true,
    hullBuild, crewCount, crewRoster, intoDeck, CREW_KEEP, CREW_RANGE, asleepHour, hourOf, minuteNow: () => 12 * 60, ...s,
  });
}
/** My crewed boat on a sea, its crews stood by the world's own frame - and each crew's muster as the frame hands it
 *  (`told`: her key's last side and way). */
async function crewedSea(o = {}) {
  const h = await sea({ hull: 2, ...o });
  h.boat.crewed = true;
  const crew = crewHost();
  h.deps.board.crewOf = (boat, n, opts) => crew.takeByBoat(boat, n, opts);
  const told = new Map();
  const frame = crew.frame;
  crew.frame = (dt, eye, ctxOf) => frame(dt, eye, (key, ship) => { const c = ctxOf(key, ship); told.set(key, { muster: c.muster, way: c.way }); return c; });
  const w = liftCrewFrame({ csa: { deckOf: (hull, v) => h.pool.deckOf(hull, v), boats: h.pool.boats, peerBoats: [] }, naval: h.host, navalCrew: crew, csaRuntime: h.runtime });
  const step = (seconds, dt = 0.1, each = null) => { for (let t = 0; t < seconds - 1e-9; t += dt) { h.host.frame(dt); w.navalCrewFrame(dt); each?.(); } };
  return { h, crew, told, step };
}
/** A pirate grapples my wrecked boat and her boarders are thrown back: she lies struck alongside, the fight over. */
async function repelThrownBack() {
  const s = await crewedSea({ save: WRECKED });
  const id = s.h.host.spawnShip('pirateBrig', { range: 16, bearing: Math.PI / 2, yaw: 0 });
  const e = s.h.host._sea.get(id);
  e.ship.pos = [16, 0, 0];
  for (let t = 0; t < 30 && s.h.host.boarding?.phase !== 'fight'; t += 0.1) s.step(0.1);
  assert.equal(s.h.host.boarding?.kind, 'repel', 'she boarded me');
  for (const f of s.h.log.foes.filter((x) => x.side === 'enemy')) f.dead = true;
  s.step(0.3);
  assert.equal(s.h.host.boarding, null, 'her boarders thrown back');
  assert.equal(e.ship.damage.state, SHIP_STATES.struck, 'she lies struck');
  return { ...s, id, e };
}
const mustered = (ship) => ship.life.members.filter((m) => !m.gone && !m.station && (m.state === 'ready' || m.state === 'toMuster')).length;
/** Every line a crew says over `seconds`, by her crew host's key. */
function linesOver(s, seconds) {
  const said = new Map();
  s.step(seconds, 0.1, () => {
    for (const ship of s.crew.ships()) for (const l of ship.life.speech()) {
      if (!said.has(ship.key)) said.set(ship.key, new Set());
      said.get(ship.key).add(l.text);
    }
  });
  return said;
}

test('CREW-MUSTER (FIELD BUGS 2026-10-14, "Crew Attacking Me"; Mac\'s call): a repel thrown back leaves her struck 13 m off - at my helm with my way over BOARD_SPEED no boarding of mine is to be had and my crew musters to nobody, standing at their work (was: every man to the rail, blades out, crying the repel\'s words, for as long as I sat at the helm); her way off, they muster to board her and cry the boarding\'s words alone (mutants: the muster at the helm\'s range alone, the way untold)', async () => {
  const s = await repelThrownBack();
  const { h, crew, e } = s;
  const gap = Math.hypot(e.ship.pos[0], e.ship.pos[2]) - hullBuild(e.ship.hull).beam - hullBuild(h.boat.hull).beam;
  assert.ok(Math.abs(Math.hypot(e.ship.pos[0], e.ship.pos[2]) - 13) < 1 && gap <= 32, `she lies alongside, 13 m off: ${Math.hypot(e.ship.pos[0], e.ship.pos[2]).toFixed(2)}`);
  const mine = () => crew.ships().find((x) => x.boat === h.boat);
  // back at my helm, her way on
  h.runtime.sailing = true;
  h.runtime.state.velocityCurrent = [0, 0, BOARD_SPEED + 1.5];
  s.step(15);
  assert.equal(h.host.myCrew(h.boat).toward, null, 'no boarding at hand');
  assert.equal(mine().toward, null);
  assert.equal(mustered(mine()), 0, 'not a man at the rail');
  // her way off: the helm can board her now - a muster to board her, the boarding's words
  h.runtime.state.velocityCurrent = [0, 0, 0];
  s.step(0.2);
  const said = h.host.myCrew(h.boat);
  assert.deepEqual([said.toward, said.way], [e.ship.pos, 'board'], 'the struck ship the helm would board, mine to board');
  assert.equal(s.told.get(h.boat)?.way, 'board', 'the world tells her crew which side of it they are on');
  const lines = linesOver(s, 90).get(h.boat) ?? new Set();
  assert.ok(mustered(mine()) > 0, 'to the rail');
  const shouted = [...lines].filter((x) => CREW_BLURBS.board.includes(x) || CREW_BLURBS.repel.includes(x));
  assert.ok(shouted.length > 0, `the muster's words said: ${[...lines]}`);
  assert.deepEqual(shouted.filter((x) => !CREW_BLURBS.board.includes(x)), [], 'the boarding\'s words alone - never "Here they come!" at nobody');
});

test('CREW-MUSTER: HER CREW, THE SAME LAW - struck alongside, her men muster toward a helm that could board her and never toward one too fast to (was: BOARD_RANGE alone); toward my feet within FOOT_BOARD_M of her side (the rail I could go over) - and theirs are the repel\'s words, the boarded side\'s (mutants: her helm arm at range alone, her side told the boarding\'s)', async () => {
  const s = await repelThrownBack();
  const { h, crew, id } = s;
  const hers = () => crew.ships().find((x) => x.key === id);
  h.runtime.sailing = true;
  h.runtime.state.velocityCurrent = [0, 0, BOARD_SPEED + 1.5];
  s.step(1);
  assert.equal(h.host.crewShips().find((x) => x.key === id).toward, null, 'a helm too fast to board her: no muster');
  h.runtime.state.velocityCurrent = [0, 0, 0];
  s.step(0.2);
  const her = h.host.crewShips().find((x) => x.key === id);
  assert.ok(her.toward, 'a helm that could board her: her crew to the rail');
  assert.equal(her.way, 'repel', 'the boarded side');
  // off the helm, my feet on my own deck within FOOT_BOARD_M of her side: still her rail I could go over
  h.runtime.sailing = false;
  s.step(0.2);
  const foot = h.host.crewShips().find((x) => x.key === id);
  assert.deepEqual([foot.toward, foot.way], [h.view.feet, 'repel'], 'toward my feet, the repel\'s side');
  assert.equal(h.host.myCrew(h.boat).toward, null, 'and my crew, off the helm, at their work');
  if (hers()?.life.members.some((m) => !m.gone)) {
    const lines = linesOver(s, 90).get(id) ?? new Set();
    const shouted = [...lines].filter((x) => CREW_BLURBS.board.includes(x) || CREW_BLURBS.repel.includes(x));
    assert.deepEqual(shouted.filter((x) => !CREW_BLURBS.repel.includes(x)), [], `the repel's words alone: ${[...lines]}`);
  }
});

test('CREW-MUSTER: THE GRAPPLE NAMES EACH SIDE - I throw mine on a struck ship and my crew is told the boarding\'s side, hers the repel\'s; a pirate closing on her board course, and throwing hers on me, turns the sides (mutants: the grapple\'s sides swapped, the kind unread, the closing ship\'s sides swapped)', async () => {
  const board = await crewedSea();
  const { h } = board;
  const id = h.host.spawnShip('merchantGalleon', { range: 30, bearing: Math.PI / 2, yaw: 0 });
  const e = h.host._sea.get(id);
  e.ship.pos = [hullBuild(e.ship.hull).beam + hullBuild(2).beam + 12, 0, 0];
  board.step(3);
  e.ship.damage.apply({ hull: Math.ceil(e.ship.damage.maxHull * 0.8), sail: 0, crew: 0 });
  board.step(4);
  assert.equal(e.ship.damage.state, SHIP_STATES.struck);
  assert.equal(h.host.activate(), true, 'the grapples');
  board.step(GRAPPLE_S / 2);
  assert.equal(h.host.boarding?.phase, 'grapple');
  assert.deepEqual([board.told.get(h.boat)?.way, board.told.get(id)?.way], ['board', 'repel'], 'mine go over, hers are boarded');

  const repel = await crewedSea({ save: WRECKED });
  const rid = repel.h.host.spawnShip('pirateBrig', { range: 200, bearing: 2.5 });   // F40's own approach: she closes to board
  const closing = new Set();
  for (let t = 0; t < 180 && repel.h.host.boarding?.phase !== 'grapple'; t += 0.1) {
    repel.step(0.1);
    if (repel.h.host.boarding) break;
    const m = repel.h.host.myCrew(repel.h.boat), her = repel.h.host.crewShips().find((x) => x.key === rid);
    if (m.toward) closing.add(`mine:${m.way}`);
    if (her?.toward) closing.add(`hers:${her.way}`);
  }
  assert.deepEqual([...closing].sort(), ['hers:board', 'mine:repel'], 'as she closes on her board course: she is to board, my crew to repel her');
  assert.equal(repel.h.host.boarding?.kind, 'repel');
  repel.step(0.2);
  assert.deepEqual([repel.told.get(repel.h.boat)?.way, repel.told.get(rid)?.way], ['repel', 'board'], 'hers go over, mine repel');
});

// ── the boarding's two reaches, which the muster now reads: their gates are the boarding's own ──────────────────────

/** A ship of the sea by her seed, on one client of a room. */
const bySeed = (c, seed) => [...c.s.host._sea.values()].find((x) => x.ship.seed === seed) ?? null;
/** On foot by her side - within FOOT_BOARD_M of her, facing her - with no helm of mine. */
function besideHer(s, e) {
  const x = e.ship.pos[0] - hullBuild(e.ship.hull).beam - 3;
  s.view.feet = [x, 0, e.ship.pos[2]];
  s.view.look = { origin: [x, 5, e.ship.pos[2]], dir: [1, -0.05, 0] };
}

test('CREW-MUSTER: THE FEET\'S REACH IS A STRUCK SHIP\'S - a swimmer by the side of a ship still afloat and fighting goes over no rail of hers, and no crew musters toward him (footReach, the reach boardableOnFoot and her muster share; mutant: the struck gate dropped)', async () => {
  const h = await sea({ hull: null });
  const e = h.host._sea.get(h.host.spawnShip('merchantGalleon', { range: 20, bearing: Math.PI / 2, yaw: 0 }));
  e.ship.pos = [20, 0, 0];
  h.host.frame(0.1);
  assert.ok(e.boat, 'her hull stands');
  besideHer(h, e);
  assert.equal(e.ship.damage.state, SHIP_STATES.afloat);
  assert.equal(h.host.takesActivate(), false, 'nothing for Activate beside a ship afloat');
  assert.equal(h.host.activate(), false);
  assert.equal(h.host.boarding, null, 'no boarding of a ship afloat');
  assert.equal(h.host.crewShips().find((x) => x.key === e.id).toward, null, 'and no muster toward me');
  e.ship.damage.apply({ hull: Math.ceil(e.ship.damage.maxHull * 0.8), sail: 0, crew: 0 });
  h.host.frame(0.1);
  assert.equal(e.ship.damage.state, SHIP_STATES.struck);
  besideHer(h, e);
  assert.equal(h.host.takesActivate(), true, 'struck, her rail is mine to go over');
});

test('CREW-MUSTER: THE ROOM\'S BOARDED WORD - a struck ship another player is fighting on stands struck and `boarded` in my copy, and is no one else\'s to grapple from a helm nor to climb on foot, nor any crew\'s muster (boardingGap\'s and footReach\'s boarded gates; mutants: either dropped)', async () => {
  const r = await room([{ id: 'a', hull: 2 }, { id: 'b', hull: 2 }]);
  const A = r.get('a'), B = r.get('b');
  const ship = A.s.host._sea.get(A.s.host.spawnShip('merchantGalleon', { range: 40, bearing: Math.PI / 2, yaw: 0 }));
  ship.ship.pos = [40, 0, 0];
  ship.ship.damage.apply({ hull: Math.ceil(ship.ship.damage.maxHull * 0.8), sail: 0, crew: 0 });
  r.run(1);
  assert.equal(A.s.host.activate(), true, 'a grapples her');
  r.run(GRAPPLE_S + 0.5);
  const onB = bySeed(B, ship.ship.seed);
  assert.ok(onB?.boat, 'b stands her hull');
  assert.deepEqual([onB.ship.damage.state, onB.ship.boarded], [SHIP_STATES.struck, true], 'the room\'s word: struck, boarded');
  // b at its helm, way off, in reach of her and looking at her
  assert.equal(B.s.runtime.sailing, true);
  const gap = Math.hypot(onB.ship.pos[0], onB.ship.pos[2]) - hullBuild(onB.ship.hull).beam - hullBuild(B.s.boat.hull).beam;
  assert.ok(gap <= 32, `in my helm's reach: ${gap.toFixed(1)} m`);
  assert.equal(B.s.host.activate(), false, 'no grapple on a ship another is fighting on');
  assert.equal(B.s.host.boarding, null);
  assert.equal(B.s.host.myCrew(B.s.boat).toward, null, 'and my crew musters toward no boarding of hers');
  // b on foot beside her
  B.s.runtime.sailing = false;
  besideHer(B.s, onB);
  assert.equal(B.s.host.activate(), false, 'nor over her rail');
  assert.equal(B.s.host.boarding, null);
});
