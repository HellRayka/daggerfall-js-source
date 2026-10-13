// @ts-check
// TESA10c (bible/03-World/Arena-Provinces.md TESA10c) - ALINOR'S LANDMARKS: the port's own models of the city's
// signatures (world/capitalPlans.js ALINOR says where each stands) - the Royal Palace of white stone with its gilt
// spires, the Crystal Tower on its isle in the harbour, the harbour's quay and piers, the white walls with their
// gold-capped towers - in metres, drawn as the map reads (+z south), every model's origin Alinor's anchor on its ground.
// Shapes of the port's own in the spirit of the city's look. No game data.
import { MeshBuilder } from './detStandIns.js';
import { CAPITAL_ART, art, taper, ledge, translated, gatedRun, roundTower, hall, gableRoof, darkDoor, rockColumn } from './capitalShapes.js';
import { ALINOR } from './capitalPlans.js';

const MARBLE = art(CAPITAL_ART.marble), GOLD = art(CAPITAL_ART.gold), CRYSTAL = art(CAPITAL_ART.crystal), ROCK = art(CAPITAL_ART.rock), DARK = art(CAPITAL_ART.dark), BRIDGE = art(CAPITAL_ART.bridgeStone);

/**
 * THE ROYAL PALACE: a keep of white stone banded in gold, its wings east and west under gilt gables, a spire at each of
 * the keep's corners and the great tower at its heart with its gilt crown; its door south, to the city and the sea.
 */
export function buildAlinorPalace(A = ALINOR) {
  const mb = new MeshBuilder(), P = A.palace, k = P.keep / 2;
  hall(mb, MARBLE, 0, 0, P.keep, P.keep, -3, P.keepH, 0.2);
  translated(mb, 0, P.keepH - 1.2, 0, () => mb.box(GOLD, [0, 0.6, 0], [P.keep + 0.6, 1.2, P.keep + 0.6], 0.5));
  const [ww, wd, wh] = P.wing;
  for (const s of [1, -1]) {
    hall(mb, MARBLE, s * (k + ww / 2), 0, ww, wd, -3, wh, 0.2);
    gableRoof(mb, GOLD, MARBLE, s * (k + ww / 2), 0, ww, wd, wh, 7);
  }
  for (const sx of [1, -1]) for (const sz of [1, -1]) roundTower(mb, sx * k, sz * k, P.spireR, P.spireH, { wall: MARBLE, roof: GOLD, roofH: P.spireRoof, sides: 12 });
  translated(mb, 0, 0, 0, () => {
    taper(mb, MARBLE, 12, P.towerR, P.keepH, P.towerR * 0.85, P.towerH, { vRepeat: 6, uRepeat: 2 });
    ledge(mb, GOLD, 12, P.towerR + 0.6, P.towerR * 0.85, P.towerH, P.towerH + 1.4);
    taper(mb, GOLD, 12, P.towerR * 0.85, P.towerH + 1.4, 0.05, P.towerH + 1.4 + P.crown, { vRepeat: 6 });
  });
  darkDoor(mb, DARK, 0, k, 5, 8, [0, 1]);
  return mb.build();
}

/**
 * THE CRYSTAL TOWER: its isle of rock in the harbour, a terrace of white stone on it, and the tower - six faces of
 * crystal tapering to their tip - ringed by six lesser shards.
 */
export function buildCrystalTower(A = ALINOR) {
  const mb = new MeshBuilder(), I = A.isle, C = A.crystal;
  rockColumn(mb, ROCK, MARBLE, I.x, I.z, 14, [[-4, I.r + 6], [0, I.r + 2], [I.top, I.r]], { rough: 2.5, seed: 0xa11 });
  translated(mb, I.x, I.top, I.z, () => {
    ledge(mb, MARBLE, 12, C.r0 + 6, 0, 0, 1.2);
    taper(mb, CRYSTAL, 6, C.r0, 1.2, C.r1, C.h, { vRepeat: 12 });
    taper(mb, CRYSTAL, 6, C.r1, C.h, 0.05, C.tip, { vRepeat: 6 });
    for (let i = 0; i < C.shards; i++) {
      const a = (i / C.shards) * Math.PI * 2 + Math.PI / C.shards, x = Math.cos(a) * C.shardAt, z = Math.sin(a) * C.shardAt;
      translated(mb, x, 1.2, z, () => taper(mb, CRYSTAL, 6, C.shardR, 0, 0.05, C.shardH * (0.6 + 0.4 * ((i % 3) / 2)), { vRepeat: 8 }));
    }
  });
  return mb.build();
}

/** THE HARBOUR: the quay's kerb along the water and piers of white stone out into the bay. */
export function buildAlinorHarbour(A = ALINOR) {
  const mb = new MeshBuilder(), Q = A.quay;
  hall(mb, MARBLE, 0, Q.edge - 0.5, 614, 1, -2, 0.6, 0.5);
  for (const x of Q.piers) {
    hall(mb, BRIDGE, x, (Q.edge + Q.pierTo) / 2, Q.pierW, Q.pierTo - Q.edge, -3, Q.deck, 0.3);
    for (const s of [1, -1]) hall(mb, MARBLE, x + s * (Q.pierW / 2 - 0.3), (Q.edge + Q.pierTo) / 2, 0.6, Q.pierTo - Q.edge, Q.deck, Q.deck + 0.9, 0.5);
  }
  return mb.build();
}

/** The walls' corners on the landward sides, in the order whose runs face their merlons out: the south-east end at the
 *  quay, the north-east, the north-west, the south-west end. */
export function alinorWallCorners(W = ALINOR.wall) {
  return [[W.east, W.south], [W.east, W.north], [W.west, W.north], [W.west, W.south]];
}
/** THE WALLS: white stone on the three landward sides - the north gate, a gate west and east - slender towers under
 *  gold cones at the corners, by the gates, at the quay and between. */
export function buildAlinorWall(A = ALINOR) {
  const mb = new MeshBuilder(), W = A.wall, [se, ne, nw, sw] = alinorWallCorners(W), side = W.south - W.north;
  gatedRun(mb, MARBLE, se, ne, W.thick, W.h, side / 2, W.gate, W.gateH);
  gatedRun(mb, MARBLE, ne, nw, W.thick, W.h, W.east, W.gate, W.gateH);
  gatedRun(mb, MARBLE, nw, sw, W.thick, W.h, side / 2, W.gate, W.gateH);
  for (const [x, z] of alinorTowers(W)) roundTower(mb, x, z, W.tower, W.towerH, { wall: MARBLE, roof: GOLD, roofH: W.roof, sides: 12 });
  return mb.build();
}
/** The walls' towers: the four ends, a pair at each gate, and between. */
export function alinorTowers(W = ALINOR.wall) {
  const g = W.gate / 2 + W.tower + 0.5, midZ = (W.south + W.north) / 2, out = /** @type {number[][]} */ (alinorWallCorners(W).slice());
  out.push([W.west, midZ - g], [W.west, midZ + g], [W.east, midZ - g], [W.east, midZ + g], [-g, W.north], [g, W.north]);
  for (let x = W.every; x < W.east - W.tower * 2; x += W.every) out.push([x + g, W.north], [-x - g, W.north]);
  return out;
}
