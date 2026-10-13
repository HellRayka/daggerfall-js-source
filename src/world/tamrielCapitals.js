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
// THE ID: its own lane (CAPITAL_LANE, after the lairs'), the capital's ordinal in the low 20 with 0x80000; its location
// index its own negative, past the lairs'.
import { mapPixelToLongitudeLatitude, LOCATION_TYPES } from '../formats/mapsFile.js';
import { hash32, BLOCK_M } from './spawnedDungeons.js';
import { pictureToBay, tamrielFit } from './tamrielFrame.js';

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
export const CAPITAL_MODELS = Object.freeze({ whiteGoldTower: 910100, imperialWall: 910101, imperialInnerWall: 910102, imperialBridges: 910103 });
/** RMB geometry: a block's side in its own units and in metres, its ground tiles, its automap cells. */
export const RMB_UNITS = 4096;
export { BLOCK_M };   // a block's side, metres (world/spawnedDungeons.js's: the terrain's eighth)
const TILE_M = 6.4, AUTO_M = 1.6;

/** A plan's cells: 'L' the lake, 'G' a garden, 'C0'..'C3' the grounds at the heart, else a classic block's kind (its
 *  name's first four letters). Rows north to south (the grid's y), cells west to east (its x). */
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

/** The capitals the port builds, in their ordinal order: the name (Arena's and TAMRIEL1's), the province, the point on
 *  the picture (world/tamrielGeography.js CITIES), the plan. */
export const CAPITALS = Object.freeze([
  Object.freeze({ key: 'imperial-city', name: 'Imperial City', province: 'Imperial', at: Object.freeze([178, 96]), plan: IMPERIAL_CITY_PLAN, districts: IMPERIAL_DISTRICTS }),
]);

/** A capital's map id, its location index, and whether a map id is a capital's. */
export const capitalPlaceId = (k) => ((CAPITAL_LANE << 20) | 0x80000 | k) >>> 0;
export const capitalLocationIndex = (k) => -(CAPITAL_INDEX_BASE + k);
export const isCapitalPlaceId = (id) => ((Number(id) >>> 20) & 0xfff) === CAPITAL_LANE && ((Number(id) >>> 0) & 0x80000) !== 0;

/** A capital's pixel on the live fit: the Bay pixel under its picture point's centre. */
export function capitalPixel(cap) {
  const [x, y] = pictureToBay(cap.at[0] + 0.5, cap.at[1] + 0.5);
  return { px: Math.floor(x), py: Math.floor(y) };
}
const _onPixel = { fit: null, byPixel: new Map() };
/** The capital standing on a Bay pixel, or null - kept a fit. */
export function capitalOnPixel(px, py) {
  const fit = tamrielFit();
  if (_onPixel.fit !== fit) {
    _onPixel.fit = fit;
    _onPixel.byPixel = new Map(CAPITALS.map((cap, k) => { const p = capitalPixel(cap); return [`${p.px},${p.py}`, { cap, k }]; }));
  }
  return _onPixel.byPixel.get(`${px},${py}`) ?? null;
}
/** ARENA (world/arenaPlaces.js standArenaPixels' `pinned`): the pixel an Arena place of a capital's name stands on - the
 *  capital's - or null for any other place. */
export function capitalPin(place) {
  const cap = CAPITALS.find((c) => c.name === place?.name && c.province === place?.province);
  return cap ? capitalPixel(cap) : null;
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

/** A plan's block names: the port's own for its lake, gardens and grounds, a classic block of each other cell's kind off
 *  the cell's hash - null where a kind has none. */
export function capitalBlockNames(plan, k, names) {
  const out = [];
  for (let y = 0; y < plan.length; y++) {
    for (let x = 0; x < plan[y].length; x++) {
      const cell = plan[y][x];
      if (cell === 'L') out.push(CAPITAL_BLOCKS.lake);
      else if (cell === 'G') out.push(CAPITAL_BLOCKS.garden);
      else if (/^C[0-3]$/.test(cell)) out.push(CAPITAL_BLOCKS.grounds[Number(cell[1])]);
      else {
        const list = names?.get(cell);
        if (!list?.length) return null;
        out.push(list[hash32(CAPITAL_SALT, k, x, y) % list.length]);
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

/** The Imperial City's heart: the tower's base, its plaza and the ring wall's band, by the metres from the city's middle. */
export const IMPERIAL_GROUNDS = Object.freeze({ plaza: 46, towerFoot: 38, ringIn: 92, ringOut: 100, gate: 6 });
/** The grounds' tile at a distance from the middle: the plaza's stone, Green Emperor Way's grass, the street's stone
 *  outside the ring. Stone 3, grass 2 (Daggerfall's tile records). */
const groundsTile = (r) => (r < IMPERIAL_GROUNDS.plaza || r > IMPERIAL_GROUNDS.ringOut ? 3 : 2);
/** The grounds' closed cells: the tower's foot and the ring wall's band, its four gates open. */
function groundsClosed(dx, dz) {
  const r = Math.hypot(dx, dz);
  if (r <= IMPERIAL_GROUNDS.towerFoot) return true;
  if (r < IMPERIAL_GROUNDS.ringIn || r > IMPERIAL_GROUNDS.ringOut) return false;
  return Math.abs(dx) > IMPERIAL_GROUNDS.gate && Math.abs(dz) > IMPERIAL_GROUNDS.gate;
}
/** A garden's trees: one tile in five off its hash, of the climate's own trees (scenery records 12, 15, 16, 18). */
const GARDEN_TREES = Object.freeze([12, 15, 16, 18]);

/**
 * THE PORT'S BLOCKS: the lake (all water), the garden (grass and trees), and the four blocks of the grounds - grounds 0
 * (the north-west of the heart, its south-east corner the city's middle) carrying the landmarks, every model's origin
 * the city's middle on the ground.
 * @returns {Array<{ name: string, index: number, json: any }>}
 */
export function capitalPortBlocks() {
  const out = [];
  out.push({ name: CAPITAL_BLOCKS.lake, index: CAPITAL_BLOCK_INDEX, json: portBlockJson(CAPITAL_BLOCKS.lake, { tile: () => 0 }) });
  out.push({ name: CAPITAL_BLOCKS.garden, index: CAPITAL_BLOCK_INDEX + 1, json: portBlockJson(CAPITAL_BLOCKS.garden, {
    tile: () => 2,
    tree: (x, z) => { const h = hash32(CAPITAL_SALT, Math.floor(x), Math.floor(z), 9); return h % 5 === 0 ? GARDEN_TREES[(h >>> 3) % GARDEN_TREES.length] : -1; },
  }) });
  // the heart's four blocks: cell (3 + qx, 3 + qy), the city's middle at its corner (BLOCK_M * (1 - qx), BLOCK_M * (1 - qy))
  CAPITAL_BLOCKS.grounds.forEach((name, q) => {
    const qx = q % 2, qy = q >> 1, ox = BLOCK_M * (1 - qx), oz = BLOCK_M * (1 - qy);
    const models = q === 0 ? Object.values(CAPITAL_MODELS).map((id) => miscModelAt(id, ox, oz)) : [];
    out.push({ name, index: CAPITAL_BLOCK_INDEX + 2 + q, json: portBlockJson(name, {
      tile: (x, z) => groundsTile(Math.hypot(x - ox, z - oz)),
      closed: (x, z) => groundsClosed(x - ox, z - oz),
      models,
    }) });
  });
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
