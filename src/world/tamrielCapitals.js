// @ts-check
// TESA10 (2026-10-12, the owner: "Can we redesign each capital city as close to 1:1 with other games. For example,
// oblivion's capital, skyrims solitude, etc"; asked, "You build them yourself. No files needed"; bible/03-World/
// Arena-Provinces.md TESA10) - THE CAPITALS, BUILT BY HAND. A capital past the Bay is no clone of a Bay city: its block
// grid is laid out here, its districts of Daggerfall's own city blocks (the player's BLOCKS.BSA - a house, a shop, a
// guild, a temple, each with its interior and its people) round landmarks of the port's own (world/capitalModels.js: the
// White-Gold Tower, the Imperial City's walls and its bridges), each capital's signature in a layout of its own - never a
// copy of another game's level design. Pure: the world host (scenes/world.js `_locationToBuild`) asks it of a capital's
// pixel before anything else past the Bay, and stands the answer in its index.
//
// WHERE: the capital's point on Daggerfall's map of Tamriel (world/tamrielGeography.js CITIES - TAMRIEL1's, the port's own
// reading of the picture), on the live fit - every client's the same pixel, with Arena attached or not. With Arena
// attached, Arena's place of the capital's name stands on it too (world/arenaPlaces.js standArenaPixels' `pinned`), so its
// roads, its map ink and the journey all lead here.
//
// THE IMPERIAL CITY (IMPERIAL_CITY_PLAN): an island city in a ring of water - the 8 x 8 grid's outer ring the lake (port
// blocks all water), a 6 x 6 city inside it within a towered wall of eight sides, its four corners gardens the wall cuts
// across, the 2 x 2 at its heart the grounds of the White-Gold Tower inside a ring wall of its own, and round them the
// districts - the Market, Talos Plaza, the Waterfront, the Arena District, the Temple District, the Arboretum, the Elven
// Gardens and the Arcane University - each a few of Daggerfall's city blocks of the district's kind. Two bridges cross the
// water, east from Talos Plaza and south from the Arena District.
//
// THE BUILDINGS ARE THE BLOCKS' OWN (capitalBuildings): Daggerfall names, staffs and serves a building off its location's
// list, drawn by type in grid order (systems/talkTopics.js drawNamedBuildings); a capital's list is each block's own
// records in that order (its guild's faction, its temple's, its shop's quality) under name seeds of the capital's, so every
// building draws its own record and is named afresh.
//
// SOLITUDE (SOLITUDE_PLAN): a city on the shore of the Sea of Ghosts where the Karth meets it - the sea along the
// grid's north row, the river down its west two columns, the city walled on the land between them with fields south of
// its wall; in the river's mouth a sea stack with the Blue Palace on it, and the great arch from the stack to a terrace
// inside the city's west wall; Castle Dour and the Emperor's Tower in the city's east; the docks on the quay below the
// north wall - and round them its districts, Daggerfall's city blocks again.
//
// A PLAN READS AS A MAP: its first row the north. Daggerfall's block rows run from the south (DFU lays a location's
// block row y at Unity +z, north; the port keeps +z north), so the grid's row y is the plan's row (height - 1 - y)
// (capitalBlockNames); the landmarks are drawn as the map reads too (+z south) and turned into the world's frame where
// they are installed (world/capitalModels.js northward).
//
// A CAPITAL'S OWN BLOCKS (`blocks`, by the plan's cell): blocks of the port's own (capitalPortBlocks) whose ground, trees
// and closed cells are laws of the metres from its ANCHOR - the point its models stand at (`anchor`: a column and a row
// of the plan's lines) - x east, z south; and the first of them whose square has the anchor on it carries its models
// (`models`), every one's origin the anchor on its ground. The lake ('L') and the garden ('G') are every capital's.
//
// THE ID: its own lane (CAPITAL_LANE, after the lairs'), the capital's ordinal in the low 20 with 0x80000; its location
// index its own negative, past the lairs'.
import { mapPixelToLongitudeLatitude, LOCATION_TYPES } from '../formats/mapsFile.js';
import { hash32, BLOCK_M } from './spawnedDungeons.js';
import { pictureToBay, tamrielFit, inBay } from './tamrielFrame.js';
import { provinceKeyBeyondBay, tamrielLandVersion } from './tamrielLand.js';

/** The capitals' lane - after the country places' 64 (0x300-0x33f) and the lairs' (0x340). */
export const CAPITAL_LANE = 0x341;
/** The location indices count down from here, past the lairs' (-40,000,000 and down 2^19). */
export const CAPITAL_INDEX_BASE = 41000000;
/** The hash's salt. */
export const CAPITAL_SALT = 0xca9c;
/** The port blocks' fixed indices (formats/worldDataReplacement.js registerPortBlock: past any BSA; the arena's 900100). */
export const CAPITAL_BLOCK_INDEX = 900200;
/** The port's own blocks a capital lays, by name. */
export const CAPITAL_BLOCKS = Object.freeze({
  lake: 'TESALAKE.RMB',
  garden: 'TESAGRDN.RMB',
  grounds: Object.freeze(['TESAWGT0.RMB', 'TESAWGT1.RMB', 'TESAWGT2.RMB', 'TESAWGT3.RMB']),
});
/** The landmarks' model ids (world/customModels.js registerCustomModel) - far past any ARCH3D record. */
export const CAPITAL_MODELS = Object.freeze({
  whiteGoldTower: 910100, imperialWall: 910101, imperialInnerWall: 910102, imperialBridges: 910103,
  solitudeArch: 910110, bluePalace: 910111, solitudeWall: 910112, castleDour: 910113, solitudeDocks: 910114,
});
/** RMB geometry: a block's side in its own units and in metres, its ground tiles, its automap cells. */
export const RMB_UNITS = 4096;
export { BLOCK_M };   // a block's side, metres (world/spawnedDungeons.js's: the terrain's eighth)
const TILE_M = 6.4, AUTO_M = 1.6;

/** A plan's cells: 'L' the lake, 'G' a garden, a code of the capital's own blocks (the Imperial City's 'C0'..'C3', the
 *  grounds at its heart), else a classic block's kind (its name's first four letters). Rows north to south (as a map
 *  reads - the grid's rows the other way), cells west to east (its x). */
export const IMPERIAL_CITY_PLAN = Object.freeze([
  'L L L L L L L L',
  'L G MAGE LIBR GENR ARMR G L',
  'L RESI BOOK CUST GEMS ALCH BANK L',
  'L RESI RESI C0 C1 GENR TVRN L',
  'L G G C2 C3 CUST RESI L',
  'L RESI CUST TEMP ARMR PAWN THIE L',
  'L G RESI RESI FIGH TVRN G L',
  'L L L L L L L L',
].map((r) => Object.freeze(r.split(' '))));
/** The Imperial City's districts, by cell (x, y) - the names its streets answer to. */
export const IMPERIAL_DISTRICTS = Object.freeze({
  'Market District': Object.freeze([[4, 1], [5, 1], [4, 2], [5, 2], [6, 2]]),
  'Talos Plaza District': Object.freeze([[5, 3], [6, 3], [5, 4], [6, 4]]),
  'Waterfront District': Object.freeze([[5, 5], [6, 5], [5, 6]]),
  'Arena District': Object.freeze([[4, 5], [4, 6], [3, 6]]),
  'Temple District': Object.freeze([[1, 5], [2, 5], [3, 5], [2, 6]]),
  'Arboretum': Object.freeze([[1, 4], [2, 4]]),
  'Elven Gardens District': Object.freeze([[1, 2], [1, 3], [2, 3]]),
  'Arcane University': Object.freeze([[2, 1], [3, 1], [2, 2], [3, 2]]),
  'Green Emperor Way': Object.freeze([[3, 3], [4, 3], [3, 4], [4, 4]]),
});

// ---------------------------------------------------------------- the capitals' own grounds

/** The Imperial City's heart: the tower's base, its plaza and the ring wall's band, by the metres from the city's middle. */
export const IMPERIAL_GROUNDS = Object.freeze({ plaza: 46, towerFoot: 38, ringIn: 92, ringOut: 100, gate: 6 });
/** The grounds' tile at a distance from the middle: the plaza's stone, Green Emperor Way's grass, the street's stone
 *  outside the ring. Stone 3, grass 2, water 0 (Daggerfall's tile records). */
const groundsTile = (r) => (r < IMPERIAL_GROUNDS.plaza || r > IMPERIAL_GROUNDS.ringOut ? 3 : 2);
/** The grounds' closed cells: the tower's foot and the ring wall's band, its four gates open. */
function groundsClosed(dx, dz) {
  const r = Math.hypot(dx, dz);
  if (r <= IMPERIAL_GROUNDS.towerFoot) return true;
  if (r < IMPERIAL_GROUNDS.ringIn || r > IMPERIAL_GROUNDS.ringOut) return false;
  return Math.abs(dx) > IMPERIAL_GROUNDS.gate && Math.abs(dz) > IMPERIAL_GROUNDS.gate;
}
/** The Imperial City's own blocks: the four of the grounds at its heart, by the metres from its middle (its anchor). */
export const IMPERIAL_BLOCKS = Object.freeze(Object.fromEntries(CAPITAL_BLOCKS.grounds.map((name, q) => [`C${q}`,
  Object.freeze({ name, tile: (dx, dz) => groundsTile(Math.hypot(dx, dz)), closed: groundsClosed })])));

/** SOLITUDE'S MEASURES, metres from its anchor (the grid point (2, 3): the city's west edge, level with the arch) - x
 *  east, z south: the sea stack, the arch (its deck from the stack's top to the terrace's, its opening between its
 *  springs over the river), the terrace and its ramp, the Blue Palace on the stack, the walls, Castle Dour, the keep and
 *  the Emperor's Tower, the quay and the docks. */
export const SOLITUDE = Object.freeze({
  stack: Object.freeze({ x: -160, z: 0, r: 35, top: 30 }),
  arch: Object.freeze({ from: -128, to: 2, w: 28, topW: 30, topE: 14, springW: -112, springE: -8, crown: 14, parapet: 1.1 }),
  landing: Object.freeze({ x0: -4, x1: 40, w: 34, top: 14, rampTo: 76, rampW: 12 }),
  palace: Object.freeze({
    hall: Object.freeze({ x: -166, z: 0, w: 40, d: 22, h: 14, roof: 10 }),
    wing: Object.freeze({ x: -140, z: 0, w: 12, d: 34, h: 12, roof: 8 }),
    tower: Object.freeze({ s: 11, h: 38, spire: 16 }),
    turret: Object.freeze({ r: 4, h: 28, roof: 10 }),
  }),
  wall: Object.freeze({
    west: -4, north: -106, east: 604, south: 413, thick: 5, h: 14, tower: 10, towerH: 20, gate: 10, gateH: 9,
    northGate: 250, southGate: 300, archGap: 17,
    along: Object.freeze({ north: Object.freeze([100, 430]), south: Object.freeze([120, 470]), west: Object.freeze([150, 290]), east: Object.freeze([40, 170, 300]) }),
  }),
  castle: Object.freeze({ x: 512, z: 204.8, half: 32, thick: 4, h: 14, tower: 10, towerH: 22, gate: 9, gateH: 8 }),
  keep: Object.freeze({ dx: 10, dz: 0, w: 24, d: 28, h: 24, roof: 9 }),
  emperorsTower: Object.freeze({ dx: -16, dz: -18, s: 9, h: 46, roof: 12 }),
  quay: Object.freeze({ x0: 102.4, x1: 409.6 }),
  docks: Object.freeze({ edge: -153.6, piers: Object.freeze([140, 216]), pierTo: -250, pierW: 7, deck: 1.4, warehouse: Object.freeze({ x: 330, z: -130, w: 52, d: 18, h: 9, roof: 6 }) }),
});
/** Solitude's closed cells: the terrace and its ramp, the north wall's band (its gate open), the warehouse, Castle
 *  Dour's curtain (its gate open), its towers, its keep and the Emperor's Tower, and the east wall's band. */
function solitudeClosed(dx, dz) {
  const S = SOLITUDE, W = S.wall, L = S.landing, C = S.castle, half = W.thick / 2 + 0.5;
  if (dx >= 0 && dx < L.rampTo && Math.abs(dz) < L.w / 2) return true;
  if (Math.abs(dz - W.north) < half && Math.abs(dx - W.northGate) > W.gate / 2) return true;
  if (Math.abs(dx - W.east) < half && dz > W.north && dz < W.south) return true;
  const H = S.docks.warehouse;
  if (Math.abs(dx - H.x) < H.w / 2 && Math.abs(dz - H.z) < H.d / 2) return true;
  const cx = dx - C.x, cz = dz - C.z, r = Math.max(Math.abs(cx), Math.abs(cz));
  if (Math.abs(r - C.half) < C.thick / 2 + 0.5 && !(cx < 0 && Math.abs(cz) < C.gate / 2)) return true;
  if (Math.abs(Math.abs(cx) - C.half) < C.tower / 2 && Math.abs(Math.abs(cz) - C.half) < C.tower / 2) return true;
  const K = S.keep, E = S.emperorsTower;
  if (Math.abs(cx - K.dx) < K.w / 2 && Math.abs(cz - K.dz) < K.d / 2) return true;
  return Math.abs(cx - E.dx) < E.s / 2 && Math.abs(cz - E.dz) < E.s / 2;
}
/** Solitude's ground: the quay's stone to its edge and the sea past it, stone everywhere else its own blocks lie. */
const solitudeTile = (dx, dz) => (dz < SOLITUDE.docks.edge ? 0 : 3);
/** Solitude's own blocks: the terrace (two), the quay (three), Castle Dour's square (four). */
export const SOLITUDE_BLOCKS = Object.freeze(Object.fromEntries(['P0', 'P1', 'Q0', 'Q1', 'Q2', 'D0', 'D1', 'D2', 'D3'].map((code) => [code,
  Object.freeze({ name: `TESASO${code}.RMB`, tile: solitudeTile, closed: solitudeClosed })])));
export const SOLITUDE_PLAN = Object.freeze([
  'L L L L L L L L',
  'L L L Q0 Q1 Q2 L L',
  'L L P0 MAGE GENR TVRN RESI G',
  'L L P1 LIBR ALCH GEMS RESI G',
  'L L RESI BOOK ARMR TEMP D0 D1',
  'L L GRVE RESI PAWN RESI D2 D3',
  'L L G RESI TVRN BANK FIGH G',
  'L L G G G G G G',
].map((r) => Object.freeze(r.split(' '))));
/** Solitude's districts, by cell (x, y). */
export const SOLITUDE_DISTRICTS = Object.freeze({
  'Blue Palace': Object.freeze([[2, 2], [2, 3]]),
  'Solitude Docks': Object.freeze([[3, 1], [4, 1], [5, 1]]),
  'The Avenues District': Object.freeze([[3, 2], [4, 2], [5, 2], [4, 3], [5, 3], [4, 4]]),
  'Bards College': Object.freeze([[3, 3]]),
  'Castle Dour District': Object.freeze([[5, 4], [6, 4], [7, 4], [6, 5], [7, 5]]),
  'Hall of the Dead': Object.freeze([[2, 5]]),
  'The Well District': Object.freeze([[6, 2], [6, 3], [2, 4], [3, 4], [3, 5], [4, 5], [5, 5], [3, 6], [4, 6], [5, 6], [6, 6]]),
});

/** The capitals the port builds, in their ordinal order: the name (Arena's and TAMRIEL1's), the province, the point on
 *  the picture (world/tamrielGeography.js CITIES), whether it stands on the shore, the plan and its districts, its
 *  anchor, its own blocks and its models. */
export const CAPITALS = Object.freeze([
  Object.freeze({ key: 'imperial-city', name: 'Imperial City', province: 'Imperial', at: Object.freeze([178, 96]), shore: false, plan: IMPERIAL_CITY_PLAN, districts: IMPERIAL_DISTRICTS,
    anchor: Object.freeze([4, 4]), blocks: IMPERIAL_BLOCKS, models: Object.freeze([CAPITAL_MODELS.whiteGoldTower, CAPITAL_MODELS.imperialWall, CAPITAL_MODELS.imperialInnerWall, CAPITAL_MODELS.imperialBridges]) }),
  Object.freeze({ key: 'solitude', name: 'Solitude', province: 'Skyrim', at: Object.freeze([136, 26]), shore: true, plan: SOLITUDE_PLAN, districts: SOLITUDE_DISTRICTS,
    anchor: Object.freeze([2, 3]), blocks: SOLITUDE_BLOCKS, models: Object.freeze([CAPITAL_MODELS.solitudeArch, CAPITAL_MODELS.bluePalace, CAPITAL_MODELS.solitudeWall, CAPITAL_MODELS.castleDour, CAPITAL_MODELS.solitudeDocks]) }),
]);

/** A capital's map id, its location index, and whether a map id is a capital's. */
export const capitalPlaceId = (k) => ((CAPITAL_LANE << 20) | 0x80000 | k) >>> 0;
export const capitalLocationIndex = (k) => -(CAPITAL_INDEX_BASE + k);
export const isCapitalPlaceId = (id) => ((Number(id) >>> 20) & 0xfff) === CAPITAL_LANE && ((Number(id) >>> 0) & 0x80000) !== 0;

/** How far, Bay pixels, a capital looks from its point for its own province's land - however far the picture's coast
 *  lies from TAMRIEL1's point (world/arenaPlaces.js SHORE_REACH's). */
export const CAPITAL_REACH = 320;
const RING8 = Object.freeze([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
/** Is a pixel past the Bay the sea - no province's land under its centre (world/tamrielLand.js: the trace's, or the
 *  authored shape's where none is set). */
const seaAt = (bx, by) => !inBay(bx, by) && provinceKeyBeyondBay(bx, by) === null;
/**
 * A CAPITAL'S PIXEL on the live fit and the land: the nearest pixel to its picture point's centre - ring by ring out to
 * CAPITAL_REACH, in each ring the nearest centre - whose centre is its own province's land past the Bay, and, for a
 * capital on the shore, one of whose eight is the sea; or null where none is in reach. The point itself where it is.
 */
export function capitalPixel(cap) {
  const [x, y] = pictureToBay(cap.at[0] + 0.5, cap.at[1] + 0.5);
  const own = (bx, by) => !inBay(bx, by) && provinceKeyBeyondBay(bx, by) === cap.province;
  const ok = cap.shore ? (bx, by) => own(bx, by) && RING8.some(([dx, dy]) => seaAt(bx + dx, by + dy)) : own;
  const fx = Math.floor(x), fy = Math.floor(y);
  if (ok(fx, fy)) return { px: fx, py: fy };
  for (let r = 1; r <= CAPITAL_REACH; r++) {
    let at = null, bd = Infinity;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;   // the ring alone - the ones inside it were asked
        const d = Math.hypot(fx + dx + 0.5 - x, fy + dy + 0.5 - y);
        if (d < bd && ok(fx + dx, fy + dy)) { bd = d; at = { px: fx + dx, py: fy + dy }; }
      }
    }
    if (at) return at;
  }
  return null;
}
const _onPixel = { fit: null, land: -1, pixels: [], byPixel: new Map() };
/** Every capital's pixel (or null), kept a fit and a land. */
function capitalPixels() {
  const fit = tamrielFit(), land = tamrielLandVersion();
  if (_onPixel.fit !== fit || _onPixel.land !== land) {
    _onPixel.fit = fit;
    _onPixel.land = land;
    _onPixel.pixels = CAPITALS.map((cap) => capitalPixel(cap));
    _onPixel.byPixel = new Map();
    _onPixel.pixels.forEach((p, k) => { if (p && !_onPixel.byPixel.has(`${p.px},${p.py}`)) _onPixel.byPixel.set(`${p.px},${p.py}`, { cap: CAPITALS[k], k }); });
  }
  return _onPixel;
}
/** The capital standing on a Bay pixel, or null - kept a fit and a land. */
export function capitalOnPixel(px, py) {
  return capitalPixels().byPixel.get(`${px},${py}`) ?? null;
}
/** ARENA (world/arenaPlaces.js standArenaPixels' `pinned`): the pixel an Arena place of a capital's name stands on - the
 *  capital's - or null for any other place, or a capital with no pixel. */
export function capitalPin(place) {
  const k = CAPITALS.findIndex((c) => c.name === place?.name && c.province === place?.province);
  return k < 0 ? null : capitalPixels().pixels[k];
}

// ---------------------------------------------------------------- the blocks

/** The city a capital stands on the shape of: the first TownCity of the game's rows in map-id order with an exterior and
 *  no dungeon, never a main-story place nor one the port made - the fields a city carries that a plan does not say.
 * @param {Iterable<any>} rows @param {(mapId: number) => boolean} [isMain] */
export function capitalBase(rows, isMain = () => false) {
  const id = (l) => (l?.mapTableData?.mapId ?? 0) >>> 0;
  return [...(rows ?? [])].filter((l) => l?.mapTableData?.locationType === LOCATION_TYPES.TownCity && l.exterior?.exteriorData && !l.hasDungeon
    && !l.spawned && !l.ether && !l.arena && !l.country && !l.capital && !isMain(id(l))).sort((a, b) => id(a) - id(b))[0] ?? null;
}

/** The classic city blocks by kind: every name a city of the game's rows lays, grouped by its first four letters,
 *  each group sorted - no wall, no palace (a palace stands its own castle). */
export function cityBlockNames(rows) {
  const out = new Map();
  for (const l of rows ?? []) {
    if (l?.mapTableData?.locationType !== LOCATION_TYPES.TownCity) continue;
    for (const n of l.exterior?.exteriorData?.blockNames ?? []) {
      const kind = String(n).slice(0, 4);
      if (kind === 'WALL' || kind === 'PALA') continue;
      if (!out.has(kind)) out.set(kind, new Set());
      out.get(kind).add(n);
    }
  }
  return new Map([...out].map(([k, s]) => [k, [...s].sort()]));
}

/** A plan's block names in the grid's order (row by row from the SOUTH - the plan's last row first): the port's own for
 *  its lake, its gardens and the capital's own blocks (`own`, the capital's `blocks`), a classic block of each other
 *  cell's kind off the cell's hash (its plan column and row) - null where a kind has none. */
export function capitalBlockNames(plan, k, names, own = CAPITALS[k]?.blocks ?? {}) {
  const out = [];
  for (let r = plan.length - 1; r >= 0; r--) {
    for (let x = 0; x < plan[r].length; x++) {
      const cell = plan[r][x];
      if (cell === 'L') out.push(CAPITAL_BLOCKS.lake);
      else if (cell === 'G') out.push(CAPITAL_BLOCKS.garden);
      else if (Object.hasOwn(own, cell)) out.push(own[cell].name);
      else {
        const list = names?.get(cell);
        if (!list?.length) return null;
        out.push(list[hash32(CAPITAL_SALT, k, x, r) % list.length]);
      }
    }
  }
  return out;
}

/** The named building types (world/buildingNames.js NAMED_BUILDING_TYPES): the ones a location's list speaks for. */
const NAMED = new Set([0, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
/**
 * THE BUILDINGS: each classic block's own records (its RMB's building data, up to its record count) in grid order, the
 * named ones alone, each under a name seed of the capital's (1 to 65535), its sector the cell and its location id the
 * capital's.
 * @param {string[]} blockNames @param {(name: string) => any} blockOf @param {number} k @param {number} locationId
 */
export function capitalBuildings(blockNames, blockOf, k, locationId) {
  const out = [];
  blockNames.forEach((name, sector) => {
    const fh = blockOf(name)?.rmbBlock?.fldHeader;
    if (!fh) return;
    const n = fh.numBlockDataRecords ?? 0;
    for (let r = 0; r < n; r++) {
      const d = fh.buildingDataList?.[r];
      if (!d || !NAMED.has(d.buildingType)) continue;
      out.push({ ...d, nameSeed: (hash32(CAPITAL_SALT, k, sector, r, 7) % 65535) + 1, sector, locationId });
    }
  });
  return out;
}

// ---------------------------------------------------------------- the port blocks

/** A tile's centre and an automap cell's, in the block's own metres (x east, z the grid's y): the stamp flips both rows
 *  (world/terrainTiles.js setLocationTiles `[x][15 - y]`, world/cityNavigation.js setBlockData `63 - y`). */
export const tileCentre = (tx, ty) => [(tx + 0.5) * TILE_M, (15 - ty + 0.5) * TILE_M];
export const autoCentre = (ax, ay) => [(ax + 0.5) * AUTO_M, (63 - ay + 0.5) * AUTO_M];

/** A block of the port's own in DFU's world-data JSON (formats/worldDataReplacement.js blockFromJson): its ground tiles
 *  (`tile(x, z)` - a record, by the tile centre's metres), its trees (`tree(x, z)` - a scenery record or -1), its automap
 *  (`closed(x, z)`), its misc models.
 * @param {string} name
 * @param {{ tile: (x: number, z: number) => number, tree?: (x: number, z: number) => number, closed?: (x: number, z: number) => boolean, models?: any[] }} o */
export function portBlockJson(name, { tile, tree = () => -1, closed = () => false, models = [] }) {
  const GroundTiles = [], GroundScenery = [], AutoMapData = [];
  for (let ty = 0; ty < 16; ty++) {
    for (let tx = 0; tx < 16; tx++) {
      const [x, z] = tileCentre(tx, ty);
      GroundTiles.push({ TileBitfield: tile(x, z) & 0x3f });
      GroundScenery.push({ TextureRecord: tree(x, z) });
    }
  }
  for (let ay = 0; ay < 64; ay++) for (let ax = 0; ax < 64; ax++) { const [x, z] = autoCentre(ax, ay); AutoMapData.push(closed(x, z) ? 1 : 0); }
  return {
    Name: name, Type: 'Rmb', Position: 0,
    RmbBlock: { FldHeader: { GroundData: { GroundTiles, GroundScenery }, AutoMapData, BuildingDataList: [], Name: name }, SubRecords: [], Misc3dObjectRecords: models, MiscFlatObjectRecords: [] },
  };
}
/** A misc model at a block's metres (x, z) on the ground, by DFU's own record law (world/rmbLayout.js: x * 0.025,
 *  (-y + PROPS_OFFSET_Y) * 0.025, (z + 4096) * 0.025). */
export const miscModelAt = (id, x, z) => ({ ModelId: String(id), ModelIdNum: id, ObjectType: 0, XPos: Math.round(x / 0.025), YPos: -4, ZPos: Math.round(z / 0.025) - RMB_UNITS, XRotation: 0, YRotation: 0, ZRotation: 0 });

/** A garden's trees: one tile in five off its hash, of the climate's own trees (scenery records 12, 15, 16, 18). */
const GARDEN_TREES = Object.freeze([12, 15, 16, 18]);

/** The code of a capital's own block that carries its models: the first in its plan's order whose square has the
 *  anchor on it (its edge or its corner), or null. */
export function capitalCarrier(cap) {
  const [ax, ar] = cap.anchor;
  for (let r = 0; r < cap.plan.length; r++) {
    for (let cx = 0; cx < cap.plan[r].length; cx++) {
      const cell = cap.plan[r][cx];
      if (Object.hasOwn(cap.blocks, cell) && cx <= ax && ax <= cx + 1 && r <= ar && ar <= r + 1) return cell;
    }
  }
  return null;
}
/** A capital's own block at the plan's (cx, r): the anchor's metres (x east, z south) of its own metres (x east, z
 *  north - the block's, world/rmbLayout.js and tileCentre's). */
export const anchorMetres = (cap, cx, r, x, z) => [(cx - cap.anchor[0]) * BLOCK_M + x, (r + 1 - cap.anchor[1]) * BLOCK_M - z];

/**
 * THE PORT'S BLOCKS: the lake (all water) and the garden (grass and trees), every capital's; then each capital's own
 * (its `blocks`, in its plan's order), their ground, trees and closed cells its laws of the metres from its anchor - and
 * the one capitalCarrier names carrying its models there.
 * @returns {Array<{ name: string, index: number, json: any }>}
 */
export function capitalPortBlocks() {
  const out = [];
  out.push({ name: CAPITAL_BLOCKS.lake, index: CAPITAL_BLOCK_INDEX, json: portBlockJson(CAPITAL_BLOCKS.lake, { tile: () => 0 }) });
  out.push({ name: CAPITAL_BLOCKS.garden, index: CAPITAL_BLOCK_INDEX + 1, json: portBlockJson(CAPITAL_BLOCKS.garden, {
    tile: () => 2,
    tree: (x, z) => { const h = hash32(CAPITAL_SALT, Math.floor(x), Math.floor(z), 9); return h % 5 === 0 ? GARDEN_TREES[(h >>> 3) % GARDEN_TREES.length] : -1; },
  }) });
  for (const cap of CAPITALS) {
    const carrier = capitalCarrier(cap);
    cap.plan.forEach((row, r) => row.forEach((cell, cx) => {
      const own = Object.hasOwn(cap.blocks, cell) ? cap.blocks[cell] : null;
      if (!own) return;
      // the anchor in the block's own metres: where anchorMetres answers (0, 0)
      const at = [(cap.anchor[0] - cx) * BLOCK_M, (r + 1 - cap.anchor[1]) * BLOCK_M];
      out.push({ name: own.name, index: CAPITAL_BLOCK_INDEX + out.length, json: portBlockJson(own.name, {
        tile: (x, z) => own.tile(...anchorMetres(cap, cx, r, x, z)),
        closed: (x, z) => own.closed(...anchorMetres(cap, cx, r, x, z)),
        models: cell === carrier ? cap.models.map((id) => miscModelAt(id, at[0], at[1])) : [],
      }) });
    }));
  }
  return out;
}

// ---------------------------------------------------------------- the location

/**
 * A CAPITAL'S LOCATION: a city of its own on `base`'s shape (a TownCity row of the game's, for the fields a city carries
 * that the plan does not say) - its plan's block grid, its blocks' own buildings, its id, its index, the pixel's longitude
 * and latitude, its name, the region the host says, no dungeon, and `capital` (its key and ordinal). `arena` the Arena
 * place standing on its pixel, where one does (world/arenaPlaces.js; the sweep and the ports read it). Null where a
 * kind of the plan has no block among the game's cities.
 * @param {{ cap: any, k: number }} at capitalOnPixel's
 * @param {{ base: any, names: Map<string, string[]>, blockOf: (name: string) => any, px: number, py: number,
 *   where?: { regionIndex?: number, regionName?: string, politic?: number, climate?: any }, arena?: any }} ctx
 */
export function synthesizeCapitalLocation({ cap, k }, ctx) {
  const plan = cap.plan, width = plan[0].length, height = plan.length;
  const blockNames = capitalBlockNames(plan, k, ctx.names);
  if (!blockNames || !ctx.base) return null;
  const mapId = capitalPlaceId(k);
  const ll = mapPixelToLongitudeLatitude(ctx.px, ctx.py);
  const buildings = capitalBuildings(blockNames, ctx.blockOf, k, mapId);
  const where = ctx.where ?? {};
  const base = ctx.base;
  return {
    ...base,
    name: cap.name,
    regionIndex: where.regionIndex ?? base.regionIndex,
    regionName: where.regionName ?? base.regionName,
    politic: where.politic ?? base.politic,
    climate: where.climate ?? base.climate,
    locationIndex: capitalLocationIndex(k),
    hasDungeon: false,
    dungeon: null,
    mapTableData: { ...base.mapTableData, mapId, locationType: LOCATION_TYPES.TownCity, longitude: ll.x, latitude: ll.y },
    exterior: {
      ...base.exterior,
      buildings,
      exteriorData: { ...base.exterior?.exteriorData, width, height, blockNames, blockIndex: null, blockNumber: null, blockCharacter: null, locationId: mapId, mapId, portTownAndUnknown: 0, buildingCount: buildings.length },
      ...(base.exterior?.recordElement ? { recordElement: { ...base.exterior.recordElement, header: { ...base.exterior.recordElement.header, locationId: mapId } } } : {}),
    },
    capital: Object.freeze({ key: cap.key, k }),
    ...(ctx.arena ? { arena: ctx.arena } : {}),
  };
}

/** The district a cell of a capital's grid belongs to, or null. */
export function capitalDistrict(cap, x, y) {
  for (const [name, cells] of Object.entries(cap?.districts ?? {})) if (cells.some(([cx, cy]) => cx === x && cy === y)) return name;
  return null;
}
