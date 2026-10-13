// @ts-check
// TESA10c (2026-10-13, bible/03-World/Arena-Provinces.md TESA10c) - THE OTHER CAPITALS' PLANS: Mournhold, Alinor,
// Falinesti, Torval and Helstrom - each its plan (as a map reads: its first row the north), its districts, its anchor,
// its own blocks' laws of the metres from the anchor (x east, z south) and its landmarks' measures
// (world/tamrielCapitals.js lays them; world/capitalMournhold.js and its kin build the landmarks). Pure.

const plan = (rows) => Object.freeze(rows.map((r) => Object.freeze(r.split(' '))));
const cells = (o) => Object.freeze(Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Object.freeze(v.map((c) => Object.freeze(c)))])));
/** A capital's own blocks: each code's name (`TESA<tag><code>.RMB`) under one tile law and one closed law. */
const ownBlocks = (tag, codes, tile, closed) => Object.freeze(Object.fromEntries(codes.map((code) => [code, Object.freeze({ name: `TESA${tag}${code}.RMB`, tile, closed })])));
const inBox = (dx, dz, x, z, w, d) => Math.abs(dx - x) < w / 2 && Math.abs(dz - z) < d / 2;

// ---------------------------------------------------------------- Mournhold

/** MOURNHOLD'S MEASURES, metres from its anchor (the grid's middle, Plaza Brindisi Dorom's): the plaza (its ring and
 *  its fountain and column), the High Fane east of it, the Royal Palace north of it, the Great Bazaar's stalls in the
 *  south-west, the walls of ochre stone round the city's six by six. */
export const MOURNHOLD = Object.freeze({
  plaza: Object.freeze({ r: 70, ring: 1.1, band: 1.2, gate: 8, fountain: 10, column: 1.8, columnH: 16 }),
  fane: Object.freeze({ x: 204.8, z: 0, plinth: 64, plinthH: 5, drumR: 22, drumH: 19, domeH: 20, pavilion: 22, pavR: 7, pavH: 13, porch: 12 }),
  palace: Object.freeze({ x: 0, z: -204.8, w: 70, d: 36, h: 16, domeR: 10, sideR: 7, tower: 4, towerH: 30 }),
  bazaar: Object.freeze({ x: -204.8, z: 153.6, w: 190, d: 90, cols: 6, rows: 3, stall: 12, deep: 8, poles: 3.2 }),
  wall: Object.freeze({ half: 330, thick: 5, h: 13, gate: 10, gateH: 9, tower: 6.5, towerH: 18, every: 110 }),
});
const mournholdTile = () => 3;
function mournholdClosed(dx, dz) {
  const M = MOURNHOLD, P = M.plaza, r = Math.hypot(dx, dz);
  if (r < P.fountain + 1) return true;
  if (Math.abs(r - P.r) < P.band && Math.min(Math.abs(dx), Math.abs(dz)) > P.gate / 2) return true;
  if (inBox(dx, dz, M.fane.x, M.fane.z, M.fane.plinth, M.fane.plinth)) return true;
  return inBox(dx, dz, M.palace.x, M.palace.z, M.palace.w, M.palace.d);
}
export const MOURNHOLD_BLOCKS = ownBlocks('MH', ['R0', 'R1', 'R2', 'R3', 'M0', 'M1', 'F0', 'F1', 'M2', 'M3', 'F2', 'F3', 'B0', 'B1'], mournholdTile, mournholdClosed);
export const MOURNHOLD_PLAN = plan([
  'G G G G G G G G',
  'G RESI RESI R0 R1 RESI RESI G',
  'G RESI TVRN R2 R3 MAGE LIBR G',
  'G GENR ALCH M0 M1 F0 F1 G',
  'G ARMR CUST M2 M3 F2 F3 G',
  'G B0 B1 GEMS BANK TEMP FIGH G',
  'G BOOK PAWN TVRN RESI THIE RESI G',
  'G G G G G G G G',
]);
export const MOURNHOLD_DISTRICTS = cells({
  'Royal Palace': [[3, 1], [4, 1], [3, 2], [4, 2]],
  'Plaza Brindisi Dorom': [[3, 3], [4, 3], [3, 4], [4, 4]],
  'Temple District': [[5, 3], [6, 3], [5, 4], [6, 4], [5, 5]],
  'Great Bazaar': [[1, 5], [2, 5], [3, 5], [4, 5], [1, 3], [2, 3], [1, 4], [2, 4]],
  'Godsreach': [[1, 1], [2, 1], [5, 1], [6, 1], [1, 2], [2, 2], [5, 2], [6, 2], [6, 5]],
  'Craftsmen\'s Quarter': [[1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6]],
});

// ---------------------------------------------------------------- Alinor

/** ALINOR'S MEASURES, metres from its anchor (its Royal Palace's middle): the palace, the Crystal Tower on its isle in
 *  the harbour, the quay's water edge and its piers, the white walls on its three landward sides. */
export const ALINOR = Object.freeze({
  palace: Object.freeze({ keep: 36, keepH: 30, wing: Object.freeze([30, 20, 18]), spireR: 4, spireH: 50, spireRoof: 16, towerR: 8, towerH: 70, crown: 30 }),
  isle: Object.freeze({ x: 0, z: 565, r: 30, top: 3 }),
  crystal: Object.freeze({ r0: 14, r1: 9, h: 150, tip: 176, shards: 6, shardR: 3, shardAt: 22, shardH: 80 }),
  quay: Object.freeze({ edge: 470, piers: Object.freeze([-260, -150, 150, 260]), pierTo: 548, pierW: 6, deck: 1.2 }),
  wall: Object.freeze({ west: -329.2, east: 329.2, north: -124.4, south: 466, thick: 4, h: 12, gate: 10, gateH: 9, tower: 4.5, towerH: 20, roof: 10, every: 120 }),
});
const alinorTile = (dx, dz) => (dz >= ALINOR.quay.edge ? 0 : 3);
function alinorClosed(dx, dz) {
  const P = ALINOR.palace;
  if (inBox(dx, dz, 0, 0, P.keep, P.keep)) return true;
  return inBox(dx, dz, 0, 0, P.keep + 2 * P.wing[0], P.wing[1]);
}
export const ALINOR_BLOCKS = ownBlocks('AL', ['P0', 'P1', 'P2', 'P3', 'Q0', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5'], alinorTile, alinorClosed);
export const ALINOR_PLAN = plan([
  'G G G G G G G G',
  'G RESI MAGE P0 P1 LIBR RESI G',
  'G RESI GENR P2 P3 GEMS RESI G',
  'G ALCH TVRN RESI RESI TEMP BANK G',
  'G RESI ARMR BOOK FIGH PAWN RESI G',
  'G RESI TVRN CUST GENR RESI THIE G',
  'L Q0 Q1 Q2 Q3 Q4 Q5 L',
  'L L L L L L L L',
]);
export const ALINOR_DISTRICTS = cells({
  'Royal Palace': [[3, 1], [4, 1], [3, 2], [4, 2]],
  'Mages\' Terrace': [[1, 1], [2, 1], [5, 1], [6, 1]],
  'Court of the Kinlords': [[1, 2], [2, 2], [5, 2], [6, 2], [3, 3], [4, 3]],
  'Temple Ward': [[1, 3], [2, 3], [5, 3], [6, 3]],
  'Merchants\' Ward': [[1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5]],
  'Alinor Harbour': [[1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6]],
});

// ---------------------------------------------------------------- Falinesti

/** FALINESTI'S MEASURES, metres from its anchor (the Great Graht-Oak's axis): the trunk's levels, its roots, its
 *  limbs, the crown of leaves over the whole city, the platforms round the trunk. */
export const FALINESTI = Object.freeze({
  trunk: Object.freeze([[-3, 34], [20, 28], [60, 22], [100, 18], [140, 15], [170, 12]]),
  roots: 10, rootOut: 64,
  limbs: 9, limbFrom: Object.freeze([100, 150]), limbOut: Object.freeze([95, 140]), limbTop: Object.freeze([150, 185]),
  crown: Object.freeze({ y: 178, r: 160, blobs: 26 }),
  platforms: Object.freeze([30, 62, 94]), platformW: 8,
  foot: 40, soil: 70,
});
const falinestiTile = (dx, dz) => (Math.hypot(dx, dz) < FALINESTI.soil ? 1 : 2);
const falinestiClosed = (dx, dz) => Math.hypot(dx, dz) < FALINESTI.foot;
export const FALINESTI_BLOCKS = ownBlocks('FA', ['T0', 'T1', 'T2', 'T3'], falinestiTile, falinestiClosed);
export const FALINESTI_PLAN = plan([
  'G G G G G G G G',
  'G RESI RESI MAGE LIBR RESI RESI G',
  'G RESI TVRN GENR ALCH TEMP RESI G',
  'G ARMR RESI T0 T1 GEMS RESI G',
  'G BOOK RESI T2 T3 TVRN BANK G',
  'G RESI FIGH GENR PAWN RESI THIE G',
  'G RESI RESI CUST RESI RESI RESI G',
  'G G G G G G G G',
]);
export const FALINESTI_DISTRICTS = cells({
  'The Roots of the Graht-Oak': [[3, 3], [4, 3], [3, 4], [4, 4]],
  'Northbough': [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1]],
  'Eastbough': [[5, 2], [6, 2], [5, 3], [6, 3], [5, 4], [6, 4]],
  'Westbough': [[1, 2], [2, 2], [3, 2], [4, 2], [1, 3], [2, 3], [1, 4], [2, 4]],
  'Southbough': [[1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6]],
});

// ---------------------------------------------------------------- Torval

/** TORVAL'S MEASURES, metres from its anchor (between the Mane's Palace and the Temple of the Two Moons): the palace
 *  north, the temple's terraces south with Masser's dome and Secunda's, the quay on Topal Bay, the sandstone walls. */
export const TORVAL = Object.freeze({
  palace: Object.freeze({ x: 0, z: -102.4, w: 64, d: 52, h: 18, domeR: 18, drumH: 6, domeH: 22, minaretR: 3.5, minaretH: 42 }),
  temple: Object.freeze({ x: 0, z: 102.4, tiers: Object.freeze([70, 54, 40]), tierH: 4, masser: Object.freeze([-9, 11, 13]), secunda: Object.freeze([12, 7, 9]), drumH: 5 }),
  quay: Object.freeze({ edge: 368, piers: Object.freeze([-260, -120, 120, 260]), pierTo: 440, pierW: 6, deck: 1.2 }),
  wall: Object.freeze({ west: -329.2, east: 329.2, north: -226.8, south: 364, thick: 5, h: 12, gate: 10, gateH: 8, tower: 9, towerH: 17, every: 115 }),
});
const torvalTile = (dx, dz) => (dz >= TORVAL.quay.edge ? 0 : 3);
function torvalClosed(dx, dz) {
  const P = TORVAL.palace, T = TORVAL.temple;
  if (inBox(dx, dz, P.x, P.z, P.w + 2 * P.minaretR, P.d + 2 * P.minaretR)) return true;
  return inBox(dx, dz, T.x, T.z, T.tiers[0], T.tiers[0]);
}
export const TORVAL_BLOCKS = ownBlocks('TO', ['P0', 'P1', 'P2', 'P3', 'M0', 'M1', 'M2', 'M3', 'Q0', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5'], torvalTile, torvalClosed);
export const TORVAL_PLAN = plan([
  'G G G G G G G G',
  'G RESI RESI P0 P1 RESI RESI G',
  'G MAGE TVRN P2 P3 GEMS LIBR G',
  'G ALCH GENR M0 M1 TEMP RESI G',
  'G RESI ARMR M2 M3 BANK RESI G',
  'G RESI FIGH PAWN TVRN THIE RESI G',
  'L Q0 Q1 Q2 Q3 Q4 Q5 L',
  'L L L L L L L L',
]);
export const TORVAL_DISTRICTS = cells({
  'The Mane\'s Palace': [[3, 1], [4, 1], [3, 2], [4, 2]],
  'Temple of the Two Moons': [[3, 3], [4, 3], [3, 4], [4, 4], [5, 3]],
  'Sugar Market': [[1, 2], [2, 2], [5, 2], [6, 2], [1, 3], [2, 3], [6, 3], [5, 4]],
  'Moonlit Quarter': [[1, 1], [2, 1], [5, 1], [6, 1], [1, 4], [2, 4], [6, 4]],
  'Lower Torval': [[1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5]],
  'Torval Docks': [[1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6]],
});

// ---------------------------------------------------------------- Helstrom

/** HELSTROM'S MEASURES, metres from its anchor (the Great Xanmeer's axis): the stepped pyramid and its shrine, the Hist
 *  on its isle in the canal, the boardwalks over the canal, the palisade round the city with its watchtowers. */
export const HELSTROM = Object.freeze({
  xanmeer: Object.freeze({ tiers: Object.freeze([84, 68, 52, 36, 20]), tierH: 6, shrine: 14, shrineH: 8, stair: 8 }),
  hist: Object.freeze({ x: -51.2, z: 153.6, isle: 40, r: 7, h: 44, crown: 22 }),
  canal: Object.freeze({ z0: 102.4, z1: 204.8 }),
  walks: Object.freeze([-153.6, 153.6]), walkW: 6, walkDeck: 0.8,
  palisade: Object.freeze({ west: -327.2, east: 327.2, north: -224.8, south: 429.6, h: 6, gate: 10, tooth: 0.8, tower: 6, towerH: 12 }),
});
function helstromTile(dx, dz) {
  const H = HELSTROM.hist;
  if (dz > HELSTROM.canal.z0 && dz < HELSTROM.canal.z1) return Math.hypot(dx - H.x, dz - H.z) < H.isle ? 2 : 0;
  return 3;
}
function helstromClosed(dx, dz) {
  const X = HELSTROM.xanmeer, H = HELSTROM.hist;
  if (Math.abs(dx) < X.tiers[0] / 2 && Math.abs(dz) < X.tiers[0] / 2) return true;
  return Math.hypot(dx - H.x, dz - H.z) < H.r + 2;
}
export const HELSTROM_BLOCKS = ownBlocks('HE', ['X0', 'X1', 'X2', 'X3', 'H0'], helstromTile, helstromClosed);
export const HELSTROM_PLAN = plan([
  'L L G L L G L L',
  'L RESI RESI RESI MAGE RESI RESI L',
  'G TVRN GENR X0 X1 ALCH RESI G',
  'L RESI ARMR X2 X3 TEMP RESI L',
  'L L L H0 L L L L',
  'G GEMS FIGH PAWN BANK TVRN RESI G',
  'L RESI BOOK RESI THIE RESI RESI L',
  'L L G L L G L L',
]);
export const HELSTROM_DISTRICTS = cells({
  'The Great Xanmeer': [[3, 2], [4, 2], [3, 3], [4, 3]],
  'The Hist': [[3, 4]],
  'Northmarsh': [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [1, 2], [2, 2], [5, 2], [6, 2], [1, 3], [2, 3], [5, 3], [6, 3]],
  'Southmarsh': [[1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6]],
});
