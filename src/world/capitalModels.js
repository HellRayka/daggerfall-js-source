// @ts-check
// TESA10 (bible/03-World/Arena-Provinces.md TESA10) - THE CAPITALS' LANDMARKS: the port's own models of the Imperial City's
// signatures - the White-Gold Tower, the towered outer wall of eight sides with its two gates, the ring wall round the
// tower's grounds, and the two bridges over the lake - in metres, every model's origin the city's middle on its ground
// (world/tamrielCapitals.js lays them as misc models of the heart's first block), and their pictures, made at boot from
// noise under a pseudo-archive of the port's own (world/lefayArt.js's law). No game data: nothing of them comes from
// ARENA2 or from any other game. Shapes of the port's own in the spirit of the city's look - never another game's mesh.
//
// installCapitals (scenes/modWorldData.js, beside installArena - behind no switch, as the arena's block is): the port
// blocks on the world-data door, the models on the model door (climate-free: the white stone is white in every climate),
// the pictures on the texture door.
import { registerCustomModel } from './customModels.js';
import { MeshBuilder } from './detStandIns.js';
import { registerPortBlock, installWorldDataReplacement } from '../formats/worldDataReplacement.js';
import { addVendorTextures } from '../systems/textureReplacement.js';
import { CAPITAL_MODELS, capitalPortBlocks, BLOCK_M } from './tamrielCapitals.js';

/** The pictures' pseudo-archive, past every classic one and the port's other art (LeFay's 38211, the galleon's 38131). */
export const CAPITAL_ARCHIVE = 38400;
export const CAPITAL_ART = Object.freeze({ marble: 0, gold: 1, wallStone: 2, roof: 3, bridgeStone: 4, dark: 5 });
const T = (record) => [CAPITAL_ARCHIVE, record];
const MARBLE = T(CAPITAL_ART.marble), GOLD = T(CAPITAL_ART.gold), STONE = T(CAPITAL_ART.wallStone), ROOF = T(CAPITAL_ART.roof), BRIDGE = T(CAPITAL_ART.bridgeStone), DARK = T(CAPITAL_ART.dark);

// ---------------------------------------------------------------- shapes

/** An n-gon's corner at angle index i, radius r, height y (the first corner at angle `phase`). */
const corner = (n, i, r, y, phase = 0) => { const a = phase + (i / n) * Math.PI * 2; return [Math.cos(a) * r, y, Math.sin(a) * r]; };
/** A frustum of n sides from (r0, y0) to (r1, y1), its sides only; `vRepeat` metres a picture. */
export function frustum(mb, tex, n, r0, y0, r1, y1, { phase = 0, vRepeat = 8, uRepeat = 1 } = {}) {
  for (let i = 0; i < n; i++) {
    const a = corner(n, i, r0, y0, phase), b = corner(n, i + 1, r0, y0, phase), c = corner(n, i + 1, r1, y1, phase), d = corner(n, i, r1, y1, phase);
    const am = phase + ((i + 0.5) / n) * Math.PI * 2, slope = (r0 - r1) / Math.max(1e-6, y1 - y0);
    const nl = Math.hypot(1, slope), nrm = [Math.cos(am) / nl, slope / nl, Math.sin(am) / nl];
    const v = -(y1 - y0) / vRepeat;
    mb.quad(tex, a, b, c, d, nrm, [[0, 0], [uRepeat, 0], [uRepeat, v], [0, v]]);
  }
}
/** A flat n-gon cap at height y, radius r, facing `up` (1) or down (-1). */
export function cap(mb, tex, n, r, y, up = 1, phase = 0) {
  for (let i = 0; i < n; i++) {
    const a = corner(n, i, r, y, phase), b = corner(n, i + 1, r, y, phase);
    mb.tri(tex, [0, y, 0], a, b, [0, up, 0], [0.5, -0.5], [0.5 + a[0] / (2 * r), -0.5 - a[2] / (2 * r)], [0.5 + b[0] / (2 * r), -0.5 - b[2] / (2 * r)]);
  }
}
/** An annulus at height y between radii rIn and rOut (a ledge's top). */
export function ring(mb, tex, n, rIn, rOut, y, phase = 0) {
  for (let i = 0; i < n; i++) mb.quad(tex, corner(n, i, rIn, y, phase), corner(n, i + 1, rIn, y, phase), corner(n, i + 1, rOut, y, phase), corner(n, i, rOut, y, phase), [0, 1, 0]);
}
/** A band: a short n-gon prism between y0 and y1 at radius r, its top a ledge back to rIn. */
export function band(mb, tex, n, r, rIn, y0, y1, phase = 0) {
  frustum(mb, tex, n, r, y0, r, y1, { phase, vRepeat: Math.max(0.5, y1 - y0) });
  ring(mb, tex, n, rIn, r, y1, phase);
  ring(mb, tex, n, rIn, r, y0, phase);
}
/** A straight wall from p to q on the ground (xz), `thick` across and `h` high, its foot sunk `sink` - its two long faces,
 *  its top and its two ends. */
export function wallRun(mb, tex, p, q, thick, h, sink = 3, vRepeat = 6) {
  const dx = q[0] - p[0], dz = q[1] - p[1], len = Math.hypot(dx, dz);
  if (len < 1e-3) return;
  const ux = dx / len, uz = dz / len, nx = -uz, nz = ux, t = thick / 2;
  const P = (s, side, y) => [p[0] + ux * s + nx * t * side, y, p[1] + uz * s + nz * t * side];
  const u = len / vRepeat, v = -(h + sink) / vRepeat;
  for (const side of [1, -1]) mb.quad(tex, P(0, side, -sink), P(len, side, -sink), P(len, side, h), P(0, side, h), [nx * side, 0, nz * side], [[0, 0], [u, 0], [u, v], [0, v]]);
  mb.quad(tex, P(0, 1, h), P(len, 1, h), P(len, -1, h), P(0, -1, h), [0, 1, 0], [[0, 0], [u, 0], [u, -thick / vRepeat], [0, -thick / vRepeat]]);
  for (const [s, sign] of [[0, -1], [len, 1]]) mb.quad(tex, P(s, 1, -sink), P(s, -1, -sink), P(s, -1, h), P(s, 1, h), [ux * sign, 0, uz * sign], [[0, 0], [thick / vRepeat, 0], [thick / vRepeat, v], [0, v]]);
}
/** The merlons along a run: blocks `w` wide every `pitch` on its outer edge (the side the normal points). */
export function merlons(mb, tex, p, q, thick, h, w = 1.6, pitch = 3.6, mh = 1.6) {
  const dx = q[0] - p[0], dz = q[1] - p[1], len = Math.hypot(dx, dz);
  if (len < pitch) return;
  const ux = dx / len, uz = dz / len, nx = -uz, nz = ux;
  for (let s = pitch / 2; s + w / 2 < len; s += pitch) {
    const cx = p[0] + ux * s + nx * (thick / 2 - 0.4), cz = p[1] + uz * s + nz * (thick / 2 - 0.4);
    mb.box(tex, [cx, h + mh / 2, cz], [Math.abs(ux) * w + Math.abs(nx) * 0.8 + 0.01, mh, Math.abs(uz) * w + Math.abs(nz) * 0.8 + 0.01], 0.4);
  }
}
/** A round tower at (x, z): its drum, its crenel band, its conical roof. */
export function roundTower(mb, x, z, r, h, { roofH = r * 1.4, sides = 16 } = {}) {
  const at = (fn) => { const before = new Map([...mb.groups].map(([k, g]) => [k, g.positions.length])); fn(); for (const [k, g] of mb.groups) { const from = before.get(k) ?? 0; for (let i = from; i < g.positions.length; i += 3) { g.positions[i] += x; g.positions[i + 2] += z; } } };
  at(() => {
    frustum(mb, STONE, sides, r, -3, r, h, { vRepeat: 6, uRepeat: 2 });
    band(mb, STONE, sides, r + 0.6, r - 0.2, h, h + 1.8);
    frustum(mb, ROOF, sides, r + 0.4, h + 1.8, 0.01, h + 1.8 + roofH, { vRepeat: 4, uRepeat: 2 });
  });
}

// ---------------------------------------------------------------- the White-Gold Tower

/** Its measures, metres: an octagon throughout. */
export const WHITE_GOLD = Object.freeze({ plinthR: 36, plinthH: 10, shaftR0: 25, shaftR1: 18, shaftTop: 200, galleryR: 26, galleryTop: 212, crownR0: 16, crownR1: 12, crownTop: 236, spireTop: 292, finR: 42, finTop: 150, finThick: 3.2 });
/**
 * THE WHITE-GOLD TOWER: an octagonal plinth, a tapering shaft banded in gold every 40 m, eight buttress fins at its
 * corners climbing from the plinth's edge to 150 m, a gallery at 200 m, the crown above it and a gilt spire to 292 m; a
 * dark door at its foot on the east.
 */
export function buildWhiteGoldTower() {
  const mb = new MeshBuilder(), W = WHITE_GOLD, n = 8, phase = Math.PI / 8;
  frustum(mb, MARBLE, n, W.plinthR, -3, W.plinthR, W.plinthH, { phase, vRepeat: 6, uRepeat: 3 });
  ring(mb, MARBLE, n, W.shaftR0, W.plinthR, W.plinthH, phase);
  frustum(mb, MARBLE, n, W.shaftR0, W.plinthH, W.shaftR1, W.shaftTop, { phase, vRepeat: 12, uRepeat: 2 });
  for (let y = 40; y <= W.shaftTop; y += 40) {
    const r = W.shaftR0 + (W.shaftR1 - W.shaftR0) * ((y - W.plinthH) / (W.shaftTop - W.plinthH));
    band(mb, GOLD, n, r + 0.5, r, y - 1.2, y, phase);
  }
  // the fins: at each corner of the shaft's octagon, a slab from the plinth's edge narrowing up the shaft
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + phase, ux = Math.cos(a), uz = Math.sin(a), nx = -uz, nz = ux, t = W.finThick / 2;
    const rAt = (y) => W.shaftR0 + (W.shaftR1 - W.shaftR0) * ((y - W.plinthH) / (W.shaftTop - W.plinthH));
    const inB = [ux * (rAt(W.plinthH) - 1), W.plinthH, uz * (rAt(W.plinthH) - 1)], outB = [ux * W.finR, W.plinthH, uz * W.finR];
    const inT = [ux * (rAt(W.finTop) - 1), W.finTop, uz * (rAt(W.finTop) - 1)], outT = [ux * (rAt(W.finTop) + 1.5), W.finTop, uz * (rAt(W.finTop) + 1.5)];
    const off = (p, s) => [p[0] + nx * t * s, p[1], p[2] + nz * t * s];
    for (const s of [1, -1]) mb.quad(MARBLE, off(inB, s), off(outB, s), off(outT, s), off(inT, s), [nx * s, 0, nz * s], [[0, 0], [2, 0], [2, -12], [0, -12]]);
    // the outer edge's face: across the fin (n) by up the edge, turned to face away from the shaft
    const e = [outT[0] - outB[0], outT[1] - outB[1], outT[2] - outB[2]];
    let outN = [nz * e[1], -(nz * e[0] - nx * e[2]), -nx * e[1]];
    const ol = Math.hypot(...outN) || 1;
    outN = outN.map((v) => v / ol);
    if (outN[0] * ux + outN[2] * uz < 0) outN = outN.map((v) => -v);
    mb.quad(MARBLE, off(outB, 1), off(outB, -1), off(outT, -1), off(outT, 1), outN, [[0, 0], [0.4, 0], [0.4, -12], [0, -12]]);
    mb.quad(GOLD, off(outT, 1), off(outT, -1), off(inT, -1), off(inT, 1), [0, 1, 0]);
  }
  band(mb, MARBLE, n, W.galleryR, W.shaftR1, W.shaftTop, W.galleryTop, phase);
  band(mb, GOLD, n, W.galleryR + 0.4, W.galleryR, W.galleryTop - 1, W.galleryTop + 0.2, phase);
  frustum(mb, MARBLE, n, W.crownR0, W.galleryTop, W.crownR1, W.crownTop, { phase, vRepeat: 8 });
  band(mb, GOLD, n, W.crownR1 + 0.6, W.crownR1, W.crownTop - 1.5, W.crownTop, phase);
  frustum(mb, GOLD, n, W.crownR1, W.crownTop, 0.05, W.spireTop, { phase, vRepeat: 10 });
  // the door at its foot, facing east: a dark recess's face proud of the plinth by a hair
  const dx = W.plinthR * Math.cos(Math.PI / 8) + 0.05;
  mb.quad(DARK, [dx, 0, -2.6], [dx, 0, 2.6], [dx, 7.5, 2.6], [dx, 7.5, -2.6], [1, 0, 0]);
  mb.quad(GOLD, [dx + 0.02, 7.5, -3.2], [dx + 0.02, 7.5, 3.2], [dx + 0.02, 8.4, 3.2], [dx + 0.02, 8.4, -3.2], [1, 0, 0]);
  return mb.build();
}

// ---------------------------------------------------------------- the walls

/** The outer wall's measures, metres from the middle: flat sides at `apothem` for `flat` either side of each axis, the
 *  corners cut from (flat, apothem) to (apothem, flat); the gates east (+x) and south (+z), `gate` wide. */
export const IMPERIAL_WALL = Object.freeze({ apothem: 311, flat: 210, thick: 6, h: 20, towerR: 9, towerH: 30, gate: 12, gateH: 13 });
/** The wall's corners, round from the east gate's side: the eight vertices of its eight sides. */
export function imperialWallCorners(W = IMPERIAL_WALL) {
  const A = W.apothem, F = W.flat;
  return [[A, -F], [A, F], [F, A], [-F, A], [-A, F], [-A, -F], [-F, -A], [F, -A]];
}
/**
 * THE OUTER WALL: its eight runs with merlons on the outside, a round tower at every corner and at the middle of the north
 * and west sides, and on the east and south sides a gate between two towers - the run broken for its opening, a lintel
 * over it from the gate's height to the wall's top.
 */
export function buildImperialWall(W = IMPERIAL_WALL) {
  const mb = new MeshBuilder(), C = imperialWallCorners(W), g = W.gate / 2;
  const runs = [];
  for (let i = 0; i < C.length; i++) runs.push([C[i], C[(i + 1) % C.length]]);
  for (const [p, q] of runs) {
    const gateOn = p[0] === W.apothem && q[0] === W.apothem ? 'x' : p[1] === W.apothem && q[1] === W.apothem ? 'z' : null;
    if (!gateOn) { wallRun(mb, STONE, p, q, W.thick, W.h); merlons(mb, STONE, p, q, W.thick, W.h); continue; }
    // the side the gate stands in: two runs either side of it, and its lintel
    const along = gateOn === 'x' ? 1 : 0, sign = Math.sign(q[along] - p[along]);
    const a = [...p], b = [...p], c = [...p], d = [...q];
    b[along] = -g * sign; c[along] = g * sign;
    wallRun(mb, STONE, a, b, W.thick, W.h); merlons(mb, STONE, a, b, W.thick, W.h);
    wallRun(mb, STONE, c, d, W.thick, W.h); merlons(mb, STONE, c, d, W.thick, W.h);
    const lintel = new MeshBuilder();
    wallRun(lintel, STONE, b, c, W.thick, W.h - W.gateH, 0);
    for (const [, gr] of lintel.groups) for (let i = 1; i < gr.positions.length; i += 3) gr.positions[i] += W.gateH;
    for (const [key, gr] of lintel.groups) { const into = mb._group([gr.archive, gr.record]); const base = into.positions.length / 3; into.positions.push(...gr.positions); into.normals.push(...gr.normals); into.uvs.push(...gr.uvs); into.indices.push(...gr.indices.map((ix) => ix + base)); void key; }
    const t1 = [...b], t2 = [...c];
    t1[along] -= sign * (W.towerR + 0.5); t2[along] += sign * (W.towerR + 0.5);
    roundTower(mb, t1[0], t1[1], W.towerR, W.towerH);
    roundTower(mb, t2[0], t2[1], W.towerR, W.towerH);
  }
  for (const [x, z] of C) roundTower(mb, x, z, W.towerR, W.towerH);
  roundTower(mb, 0, -W.apothem, W.towerR, W.towerH);
  roundTower(mb, -W.apothem, 0, W.towerR, W.towerH);
  return mb.build();
}
/** The inner ring wall round the tower's grounds: a ring of `sides` at `r`, its four gates (the axes), a turret by each. */
export const IMPERIAL_INNER = Object.freeze({ r: 96, sides: 32, thick: 3, h: 9, gate: 8 });
export function buildImperialInnerWall(R = IMPERIAL_INNER) {
  const mb = new MeshBuilder(), half = Math.asin((R.gate / 2 + 0.25) / R.r);   // the run's end corners clear of the gate's width
  for (let i = 0; i < R.sides; i++) {
    const a0 = (i / R.sides) * Math.PI * 2, a1 = ((i + 1) / R.sides) * Math.PI * 2;
    // a run whose arc meets a gate's is cut back to the gate's edge; one inside a gate is none
    const gates = [0, Math.PI / 2, Math.PI, 1.5 * Math.PI, 2 * Math.PI];
    let s = a0, e = a1, skip = false;
    for (const ga of gates) {
      if (s >= ga - half && e <= ga + half) skip = true;
      else if (s < ga + half && s > ga - half) s = ga + half;
      else if (e > ga - half && e < ga + half) e = ga - half;
    }
    if (skip || e <= s) continue;
    const p = [Math.cos(s) * R.r, Math.sin(s) * R.r], q = [Math.cos(e) * R.r, Math.sin(e) * R.r];
    wallRun(mb, STONE, p, q, R.thick, R.h, 2, 4);
  }
  for (const ga of [0, Math.PI / 2, Math.PI, 1.5 * Math.PI]) {
    for (const side of [1, -1]) {
      const a = ga + side * (half + 0.06);
      roundTower(mb, Math.cos(a) * R.r, Math.sin(a) * R.r, 3.2, R.h + 4, { sides: 12 });
    }
  }
  return mb.build();
}
/** The bridges: east from the east gate and south from the south gate over the lake to the city's pixel's edge - a deck
 *  `w` wide a hand over the water, parapets either side, piers under it. */
export const IMPERIAL_BRIDGE = Object.freeze({ from: 311, to: 4 * BLOCK_M + 2, w: 10, deck: 0.3, parapet: 1.1, pier: 18 });
export function buildImperialBridges(B = IMPERIAL_BRIDGE) {
  const mb = new MeshBuilder(), hw = B.w / 2;
  for (const axis of ['x', 'z']) {
    const P = (s, t, y) => (axis === 'x' ? [s, y, t] : [t, y, s]);
    const len = B.to - B.from, u = len / 6;
    // the deck's top and its two edges
    mb.quad(BRIDGE, P(B.from, -hw, B.deck), P(B.to, -hw, B.deck), P(B.to, hw, B.deck), P(B.from, hw, B.deck), [0, 1, 0], [[0, 0], [u, 0], [u, -B.w / 6], [0, -B.w / 6]]);
    for (const side of [1, -1]) {
      const n = axis === 'x' ? [0, 0, side] : [side, 0, 0];
      mb.quad(BRIDGE, P(B.from, side * hw, -2), P(B.to, side * hw, -2), P(B.to, side * hw, B.deck + B.parapet), P(B.from, side * hw, B.deck + B.parapet), n, [[0, 0], [u, 0], [u, -0.5], [0, -0.5]]);
      mb.quad(BRIDGE, P(B.from, side * (hw - 0.5), B.deck), P(B.to, side * (hw - 0.5), B.deck), P(B.to, side * (hw - 0.5), B.deck + B.parapet), P(B.from, side * (hw - 0.5), B.deck + B.parapet), [-n[0], 0, -n[2]], [[0, 0], [u, 0], [u, -0.2], [0, -0.2]]);
      mb.quad(BRIDGE, P(B.from, side * (hw - 0.5), B.deck + B.parapet), P(B.to, side * (hw - 0.5), B.deck + B.parapet), P(B.to, side * hw, B.deck + B.parapet), P(B.from, side * hw, B.deck + B.parapet), [0, 1, 0]);
    }
    for (let s = B.from + B.pier; s < B.to - 4; s += B.pier) {
      const c = P(s, 0, -1.2);
      mb.box(BRIDGE, c, axis === 'x' ? [2.4, 3, B.w + 1.2] : [B.w + 1.2, 3, 2.4], 0.3);
    }
  }
  return mb.build();
}

// ---------------------------------------------------------------- the pictures

/** A picture's side, texels: Daggerfall's own texel size, the landmarks in the pixel world. */
export const CAPITAL_ART_SIZE = 64;
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function noise(seed, n, S = CAPITAL_ART_SIZE) {
  const r = rng(seed), lat = Float32Array.from({ length: n * n }, () => r());
  const at = (i, j) => lat[((j % n + n) % n) * n + ((i % n + n) % n)];
  const sm = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = (x / S) * n, fy = (y / S) * n, i = Math.floor(fx), j = Math.floor(fy), tx = sm(fx - i), ty = sm(fy - j);
    const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
}
const mix = (a, b, t) => { const k = Math.min(1, Math.max(0, t)); return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * k)); };
/** A picture by a texel's colour law - `{width, height, data}` (the texture door's shape, world/galleonArt.js's). */
function picture(fn, S = CAPITAL_ART_SIZE) {
  const img = { width: S, height: S, data: new Uint8Array(S * S * 4) };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const c = fn(x, y); const i = (y * S + x) * 4; img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255; }
  return img;
}
/** Courses of ashlar: rows `rowH` texels high, joints dark, each stone's own shade. */
function ashlar(seed, base, joint, rowH, stoneW, vary) {
  const n = noise(seed, 8), r = rng(seed + 1), shades = Array.from({ length: 64 }, () => r());
  return picture((x, y) => {
    const row = Math.floor(y / rowH), xo = x + (row % 2) * (stoneW / 2), col = Math.floor(xo / stoneW) % 16;
    if (y % rowH === 0 || xo % stoneW === 0) return joint;
    return mix(base, mix(base, [255, 255, 255], 0.2), (shades[(row * 16 + col) % 64] - 0.5) * vary + n(x, y) * 0.25);
  });
}
/** The pictures, by record. Deterministic (fixed seeds): every client's city is the same stone. */
export function capitalArt() {
  const out = new Map();
  const veins = noise(0x5a11, 6), cloud = noise(0x5a12, 3);
  out.set(CAPITAL_ART.marble, picture((x, y) => mix([228, 224, 214], [192, 188, 180], cloud(x, y) * 0.5 + Math.max(0, 1 - Math.abs(veins(x, y) - 0.5) * 18) * 0.5)));
  const burnish = noise(0x6a1d, 4);
  out.set(CAPITAL_ART.gold, picture((x, y) => mix([156, 112, 36], [236, 196, 92], 0.35 + burnish(x, y) * 0.55 + Math.sin(y / 3) * 0.08)));
  out.set(CAPITAL_ART.wallStone, ashlar(0x3a11, [176, 168, 150], [96, 90, 80], 8, 16, 0.5));
  const slate = noise(0x7001, 8);
  out.set(CAPITAL_ART.roof, picture((x, y) => (y % 6 === 0 ? [44, 50, 58] : mix([62, 72, 84], [92, 102, 112], slate(x, y) + ((x + (Math.floor(y / 6) % 2) * 4) % 8 === 0 ? -0.4 : 0)))));
  out.set(CAPITAL_ART.bridgeStone, ashlar(0x3b22, [150, 142, 128], [84, 78, 70], 16, 32, 0.4));
  out.set(CAPITAL_ART.dark, picture(() => [22, 20, 18]));
  return out;
}

let _installed = false;
/**
 * ONCE: the capitals' port blocks, models and pictures on their doors (scenes/modWorldData.js, beside installArena).
 * @param {{ addTextures?: (entries: any[]) => number }} [o]
 */
export function installCapitals({ addTextures = addVendorTextures } = {}) {
  if (_installed) return false;
  _installed = true;
  installWorldDataReplacement();
  for (const b of capitalPortBlocks()) registerPortBlock(b.name, b.json, b.index);
  const builds = {
    [CAPITAL_MODELS.whiteGoldTower]: buildWhiteGoldTower,
    [CAPITAL_MODELS.imperialWall]: () => buildImperialWall(),
    [CAPITAL_MODELS.imperialInnerWall]: () => buildImperialInnerWall(),
    [CAPITAL_MODELS.imperialBridges]: () => buildImperialBridges(),
  };
  for (const [id, build] of Object.entries(builds)) registerCustomModel(Number(id), build, () => true, { climateFree: true });
  let made = null;
  const art = (record) => (made ??= capitalArt()).get(record) ?? null;
  addTextures(Object.values(CAPITAL_ART).map((record) => ({ archive: CAPITAL_ARCHIVE, record, frame: 0, standIn: true, fileName: `capital-${CAPITAL_ARCHIVE}_${record}`, build: async () => art(record) })));
  return true;
}
/** Test seam. */
export function _resetCapitals() { _installed = false; }
