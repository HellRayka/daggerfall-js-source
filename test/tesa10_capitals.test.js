// TESA10 (2026-10-12, the owner: "Can we redesign each capital city as close to 1:1 with other games. For example,
// oblivion's capital, skyrims solitude, etc"; "You build them yourself. No files needed"; bible/03-World/
// Arena-Provinces.md TESA10) - THE CAPITALS, BUILT BY HAND, pinned. The Imperial City first: its plan (a lake, a towered
// wall of eight sides, the districts of Daggerfall's own city blocks, the White-Gold Tower's grounds), its port blocks, its
// buildings (each block's own records under the capital's seeds), its landmarks and their pictures, its id, its pixel,
// Arena's place of its name pinned to it, and the host that stands it first past the Bay.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  CAPITAL_LANE, CAPITAL_INDEX_BASE, CAPITAL_SALT, CAPITAL_BLOCK_INDEX, CAPITAL_BLOCKS, CAPITAL_MODELS, CAPITALS, IMPERIAL_CITY_PLAN,
  IMPERIAL_DISTRICTS, IMPERIAL_GROUNDS, BLOCK_M, capitalPlaceId, capitalLocationIndex, isCapitalPlaceId, capitalPixel, capitalOnPixel,
  capitalPin, capitalBase, cityBlockNames, capitalBlockNames, capitalBuildings, portBlockJson, miscModelAt, tileCentre, autoCentre,
  capitalPortBlocks, synthesizeCapitalLocation, capitalDistrict,
} from '../src/world/tamrielCapitals.js';
import {
  CAPITAL_ARCHIVE, CAPITAL_ART, CAPITAL_ART_SIZE, WHITE_GOLD, IMPERIAL_WALL, IMPERIAL_INNER, IMPERIAL_BRIDGE, imperialWallCorners,
  buildWhiteGoldTower, buildImperialWall, buildImperialInnerWall, buildImperialBridges, capitalArt, installCapitals, _resetCapitals,
} from '../src/world/capitalModels.js';
import { LAIR_LANE, isCountryPlaceId } from '../src/world/tamrielCountry.js';
import { LAIR_INDEX_BASE } from '../src/world/tamrielDungeons.js';
import { standArenaPixels } from '../src/world/arenaPlaces.js';
import { setTamrielFit, pictureToBay, inBay, tamrielFit as tamrielFitNow } from '../src/world/tamrielFrame.js';
import { CITIES } from '../src/world/tamrielGeography.js';
import { blockFromJson } from '../src/formats/worldDataReplacement.js';
import { layoutRmbBlock } from '../src/world/rmbLayout.js';
import { customModelFor } from '../src/world/customModels.js';
import { hash32 } from '../src/world/spawnedDungeons.js';
import { LOCATION_TYPES, mapPixelToLongitudeLatitude } from '../src/formats/mapsFile.js';
import { capitalsOn } from '../src/scenes/shared.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
afterEach(() => setTamrielFit(null));

// ── THE ID, THE PIXEL, THE PIN ──────────────────────────────────

test('TESA10 the id: the capitals\' lane after the lairs\', the ordinal in the low 20 with 0x80000; a place the port made (no house sold, no deed read); the index past the lairs\'', () => {
  assert.equal(CAPITAL_LANE, LAIR_LANE + 1);
  for (const k of [0, 1, 7]) {
    const id = capitalPlaceId(k);
    assert.equal(id >>> 20, CAPITAL_LANE);
    assert.equal(id & 0xfffff, 0x80000 | k);
    assert.ok(isCapitalPlaceId(id) && isCountryPlaceId(id));
    assert.equal(capitalLocationIndex(k), -(CAPITAL_INDEX_BASE + k));
    assert.ok(capitalLocationIndex(k) < -(LAIR_INDEX_BASE + (1 << 19)));
  }
  assert.equal(isCapitalPlaceId((CAPITAL_LANE << 20) | 5), false, 'the low bit');
  assert.equal(isCapitalPlaceId((LAIR_LANE << 20) | 0x80000), false, 'a lair');
  assert.equal(isCountryPlaceId(((CAPITAL_LANE + 1) << 20) | 0x80000), false, 'nothing past it');
});

test('TESA10 the pixel: the capital\'s point on Daggerfall\'s map (TAMRIEL1\'s CITIES) on the live fit, the one capital a pixel, kept a fit; Arena\'s place of its name and province pinned to it, no other', () => {
  const ic = CAPITALS[0];
  assert.equal(ic.name, 'Imperial City');
  assert.deepEqual(ic.at, CITIES.find((c) => c.name === 'Imperial City' && c.capital).at, 'TAMRIEL1\'s own point');
  setTamrielFit({ ox: 38 * 15.5, oy: 57 * 15.5, ppu: 15.5 });
  const [x, y] = pictureToBay(178.5, 96.5);
  assert.deepEqual(capitalPixel(ic), { px: Math.floor(x), py: Math.floor(y) });
  assert.deepEqual(capitalPixel(ic), { px: 2177, py: 612 }, 'the freeware\'s fit');
  assert.ok(!inBay(2177, 612));
  assert.equal(capitalOnPixel(2177, 612).cap, ic);
  assert.equal(capitalOnPixel(2177, 612).k, 0);
  assert.equal(capitalOnPixel(2178, 612), null);
  setTamrielFit({ ox: 400, oy: 500, ppu: 10 });
  assert.equal(capitalOnPixel(2177, 612), null, 'a new fit, the pixel moves');
  assert.equal(capitalOnPixel(1385, 465).cap, ic);
  assert.deepEqual(capitalPin({ name: 'Imperial City', province: 'Imperial' }), { px: 1385, py: 465 });
  assert.equal(capitalPin({ name: 'Imperial City', province: 'Skyrim' }), null);
  assert.equal(capitalPin({ name: 'Solitude', province: 'Skyrim' }), null, 'not yet built');
  assert.equal(capitalPin(null), null);
});

test('TESA10 Arena\'s place pinned: a place its pin names stands on that pixel exactly, before any other takes it; the rest as ever; a pin on the Bay none', () => {
  setTamrielFit({ ox: 400, oy: 500, ppu: 10 });
  const w = 320, h = 200, land = new Uint8Array(w * h).fill(1), province = new Uint8Array(w * h).fill(3);
  const trace = { w, h, land, province };
  const P = (id, name, bx, by) => ({ province: 'Skyrim', provinceIndex: 2, id, kind: 'city-state', name, px: (bx + 0.5 + 400) / 10, py: (by + 0.5 + 500) / 10, snapped: 0 });
  const model = { places: [P(0, 'First', 1500, -100), P(1, 'Pinned', 1600, -150), P(2, 'OnBay', 1700, -150)] };
  const pin = (p) => (p.name === 'Pinned' ? { px: 1500, py: -100 } : p.name === 'OnBay' ? { px: 10, py: 10 } : null);
  const s = standArenaPixels(model, trace, null, pin);
  assert.deepEqual(s.stood.map((p) => [p.name, p.bx, p.by, !!p.pinned]), [['First', 1500, -101, false], ['Pinned', 1500, -100, true], ['OnBay', 1700, -150, false]], 'the pinned first, the first moved off it; a pin on the Bay ignored');
  assert.equal(s.byPixel.get('1500,-100').name, 'Pinned');
  assert.deepEqual(standArenaPixels(model, trace).stood.map((p) => [p.name, p.bx, p.by]), [['First', 1500, -100], ['Pinned', 1600, -150], ['OnBay', 1700, -150]], 'no pin, no change');
  assert.match(read('src/world/arenaPlaces.js'), /_model\.pixels = standArenaPixels\(model, \/\*\* @type \{any\} \*\/ \(tamrielTrace\(\)\), _coastal, capitalPin\);/);
});

// ── THE PLAN ────────────────────────────────────────────────────

test('TESA10 the Imperial City\'s plan: 8 x 8 - the lake its outer ring, the city\'s four corners gardens, the Tower\'s grounds the heart, 26 of Daggerfall\'s city blocks round them and the Arboretum\'s gardens; every district\'s cells in the city', () => {
  const P = IMPERIAL_CITY_PLAN;
  assert.equal(P.length, 8);
  assert.ok(P.every((r) => r.length === 8));
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) assert.equal(P[y][x] === 'L', x === 0 || y === 0 || x === 7 || y === 7, `${x},${y}`);
  for (const [x, y] of [[1, 1], [6, 1], [1, 6], [6, 6]]) assert.equal(P[y][x], 'G');
  assert.deepEqual([P[3][3], P[3][4], P[4][3], P[4][4]], ['C0', 'C1', 'C2', 'C3']);
  const kinds = P.flat().filter((c) => !['L', 'G'].includes(c) && !/^C\d$/.test(c));
  assert.equal(kinds.length, 26, 'the Arboretum\'s two cells gardens too');
  for (const k of ['MAGE', 'TEMP', 'FIGH', 'THIE', 'TVRN', 'GENR', 'ARMR', 'ALCH', 'BANK', 'GEMS', 'PAWN', 'BOOK', 'LIBR', 'RESI', 'CUST']) assert.ok(kinds.includes(k), k);
  const seen = new Set();
  for (const [d, cells] of Object.entries(IMPERIAL_DISTRICTS)) for (const [x, y] of cells) { assert.notEqual(P[y][x], 'L', d); assert.equal(seen.has(`${x},${y}`), false, `${x},${y} in two districts`); seen.add(`${x},${y}`); }
  assert.equal(seen.size, 6 * 6 - 4, 'every cell of the city but its four corner gardens has a district');
  assert.equal(capitalDistrict(CAPITALS[0], 3, 3), 'Green Emperor Way');
  assert.equal(capitalDistrict(CAPITALS[0], 6, 3), 'Talos Plaza District');
  assert.equal(capitalDistrict(CAPITALS[0], 0, 0), null);
});

const city = (mapId, names, o = {}) => ({ name: `C${mapId}`, mapTableData: { mapId, locationType: LOCATION_TYPES.TownCity, longitude: 0, latitude: 0 }, exterior: { exteriorData: { blockNames: names, width: 2, height: 1 }, buildings: [] }, hasDungeon: false, ...o });

test('TESA10 the blocks: every name the game\'s cities lay by its kind, sorted, never a wall or a palace; the plan\'s names - the port\'s own for its lake, gardens and grounds, a classic of each kind off the cell\'s hash; none where a kind has none', () => {
  const rows = [city(1, ['TVRNAL02.RMB', 'WALLAA00.RMB']), city(2, ['TVRNAL01.RMB', 'PALAAA00.RMB', 'TVRNAL02.RMB']), { ...city(3, ['GENRAL09.RMB']), mapTableData: { mapId: 3, locationType: LOCATION_TYPES.TownHamlet } }];
  const names = cityBlockNames(rows);
  assert.deepEqual([...names], [['TVRN', ['TVRNAL01.RMB', 'TVRNAL02.RMB']]]);
  const plan = [['L', 'G', 'TVRN'], ['C0', 'C1', 'TVRN'], ['C2', 'C3', 'L']];
  const out = capitalBlockNames(plan, 0, names);
  assert.deepEqual(out.slice(0, 2), [CAPITAL_BLOCKS.lake, CAPITAL_BLOCKS.garden]);
  assert.deepEqual(out.slice(3, 5), CAPITAL_BLOCKS.grounds.slice(0, 2));
  assert.equal(out[2], names.get('TVRN')[hash32(CAPITAL_SALT, 0, 2, 0) % 2]);
  assert.equal(out[5], names.get('TVRN')[hash32(CAPITAL_SALT, 0, 2, 1) % 2]);
  assert.equal(capitalBlockNames([['MAGE']], 0, names), null);
});

test('TESA10 the buildings: each classic block\'s own named records in grid order (its guild\'s faction, its quality), under the capital\'s seeds (1 to 65535, the cell\'s and the record\'s), its sector the cell, its location the capital', () => {
  const fh = (list) => ({ rmbBlock: { fldHeader: { numBlockDataRecords: list.length, buildingDataList: [...list, { buildingType: 2, factionId: 0, quality: 1 }] } } });
  const blocks = { 'MAGEAA00.RMB': fh([{ buildingType: 11, factionId: 40, quality: 18, nameSeed: 0 }, { buildingType: 18, factionId: 0, quality: 4 }]), 'TVRNAL00.RMB': fh([{ buildingType: 15, factionId: 0, quality: 9 }, { buildingType: 23, quality: 3 }]) };
  const list = capitalBuildings([CAPITAL_BLOCKS.lake, 'MAGEAA00.RMB', 'TVRNAL00.RMB'], (n) => blocks[n] ?? null, 0, 777);
  assert.deepEqual(list.map((d) => [d.buildingType, d.factionId, d.quality, d.sector, d.locationId]), [[11, 40, 18, 1, 777], [15, 0, 9, 2, 777]], 'houses, walls and the records past the count none');
  assert.equal(list[0].nameSeed, (hash32(CAPITAL_SALT, 0, 1, 0, 7) % 65535) + 1);
  assert.ok(list.every((d) => d.nameSeed >= 1 && d.nameSeed <= 65535));
  assert.notEqual(capitalBuildings(['MAGEAA00.RMB'], (n) => blocks[n], 1, 1)[0].nameSeed, capitalBuildings(['MAGEAA00.RMB'], (n) => blocks[n], 0, 1)[0].nameSeed, 'each capital its own');
  assert.equal(blocks['MAGEAA00.RMB'].rmbBlock.fldHeader.buildingDataList[0].nameSeed, 0, 'the block untouched');
});

// ── THE PORT BLOCKS ─────────────────────────────────────────────

test('TESA10 the port blocks: the lake all water, the garden grass with a tree in about five, the grounds\' plaza stone, Green Emperor Way grass, the street stone; the Tower\'s foot and the ring wall\'s band closed, its four gates open; the landmarks in the heart\'s first block at the city\'s middle', () => {
  const b = capitalPortBlocks();
  assert.deepEqual(b.map((x) => [x.name, x.index]), [[CAPITAL_BLOCKS.lake, CAPITAL_BLOCK_INDEX], [CAPITAL_BLOCKS.garden, CAPITAL_BLOCK_INDEX + 1], ...CAPITAL_BLOCKS.grounds.map((n, i) => [n, CAPITAL_BLOCK_INDEX + 2 + i])]);
  assert.ok(CAPITAL_BLOCK_INDEX >= 900000 && CAPITAL_BLOCK_INDEX !== 900100, 'past any BSA, apart from the arena\'s');
  const tiles = (j) => j.RmbBlock.FldHeader.GroundData.GroundTiles.map((t) => t.TileBitfield);
  assert.ok(tiles(b[0].json).every((t) => t === 0), 'the lake: water');
  assert.ok(tiles(b[1].json).every((t) => t === 2), 'the garden: grass');
  const trees = b[1].json.RmbBlock.FldHeader.GroundData.GroundScenery.filter((s) => s.TextureRecord >= 0).length;
  assert.ok(trees > 25 && trees < 80, `trees ${trees}`);
  for (const [q, blk] of b.slice(2).entries()) {
    const qx = q % 2, qy = q >> 1, ox = BLOCK_M * (1 - qx), oz = BLOCK_M * (1 - qy);
    const T = tiles(blk.json), A = blk.json.RmbBlock.FldHeader.AutoMapData;
    for (let ty = 0; ty < 16; ty++) for (let tx = 0; tx < 16; tx++) {
      const [x, z] = tileCentre(tx, ty), r = Math.hypot(x - ox, z - oz);
      assert.equal(T[ty * 16 + tx], r < IMPERIAL_GROUNDS.plaza || r > IMPERIAL_GROUNDS.ringOut ? 3 : 2);
    }
    for (let ay = 0; ay < 64; ay++) for (let ax = 0; ax < 64; ax++) {
      const [x, z] = autoCentre(ax, ay), dx = x - ox, dz = z - oz, r = Math.hypot(dx, dz);
      const want = r <= IMPERIAL_GROUNDS.towerFoot || (r >= IMPERIAL_GROUNDS.ringIn && r <= IMPERIAL_GROUNDS.ringOut && Math.abs(dx) > IMPERIAL_GROUNDS.gate && Math.abs(dz) > IMPERIAL_GROUNDS.gate);
      assert.equal(A[ay * 64 + ax], want ? 1 : 0);
    }
    assert.equal(blk.json.RmbBlock.Misc3dObjectRecords.length, q === 0 ? 4 : 0);
  }
  // the landmarks, laid by the classic law, stand at the city's middle: block (3, 3)'s far corner, on the ground
  const laid = layoutRmbBlock(blockFromJson(b[2].json, b[2].index));
  assert.deepEqual(laid.models.map((m) => m.modelIdNum).sort(), Object.values(CAPITAL_MODELS).sort());
  for (const m of laid.models) assert.deepEqual([...m.matrix.slice(12, 15)].map((v) => +v.toFixed(3)), [102.4, 0, 102.4]);
  assert.deepEqual(miscModelAt(5, 51.2, 25.6), { ModelId: '5', ModelIdNum: 5, ObjectType: 0, XPos: 2048, YPos: -4, ZPos: 1024 - 4096, XRotation: 0, YRotation: 0, ZRotation: 0 });
  // the stamp's own flips (world/terrainTiles.js setLocationTiles, world/cityNavigation.js setBlockData) - pinned at their source
  assert.match(read('src/world/terrainTiles.js'), /const tile = groundTiles\[tileX\]\[\(RMB_TILES_PER_BLOCK - 1\) - tileY\];/);
  assert.match(read('src/world/cityNavigation.js'), /const worldRow = yBlock \* NAV_CELLS_PER_BLOCK \+ \(NAV_CELLS_PER_BLOCK - 1 - y\);/);
  const one = portBlockJson('X.RMB', { tile: (x, z) => (z < 51.2 ? 3 : 2) });
  const converted = blockFromJson(one, 1).rmbBlock.fldHeader.groundData.groundTiles;
  assert.equal(converted[0][15].textureRecord, 3, 'data row 15 is the block\'s near edge (z 0..6.4)');
  assert.equal(converted[0][0].textureRecord, 2, 'data row 0 its far edge');
});

// ── THE LOCATION ────────────────────────────────────────────────

test('TESA10 the location: its plan\'s grid and its blocks\' buildings on a city\'s shape, its own id, index, longitude and latitude, the host\'s region, no dungeon, no harbour, `capital`, Arena\'s slot where one stands; none without a base or with a kind missing; the base untouched', () => {
  const kinds = [...new Set(IMPERIAL_CITY_PLAN.flat())].filter((c) => !['L', 'G'].includes(c) && !/^C\d$/.test(c));
  const names = new Map(kinds.map((k) => [k, [`${k}AA00.RMB`, `${k}AA01.RMB`]]));
  const fh = { rmbBlock: { fldHeader: { numBlockDataRecords: 1, buildingDataList: [{ buildingType: 9, factionId: 0, quality: 5 }] } } };
  const base = { ...city(9, ['X']), name: 'Broadvale', regionIndex: 1, regionName: 'R', politic: 129, climate: { worldClimate: 231 }, hasDungeon: false, exterior: { exteriorData: { blockNames: ['X'], width: 1, height: 1, mapId: 9, portTownAndUnknown: 1 }, buildings: [{ buildingType: 2 }], recordElement: { header: { locationId: 9 } } } };
  const snap = JSON.stringify(base);
  const slot = Object.freeze({ province: 'Imperial', provinceIndex: 8, id: 0, kind: 'city-state', port: false });
  const loc = synthesizeCapitalLocation({ cap: CAPITALS[0], k: 0 }, { base, names, blockOf: (n) => (n.startsWith('TESA') ? null : fh), px: 2177, py: 612, arena: slot, where: { regionIndex: 23, regionName: 'Wrothgarian Mountains', politic: 151, climate: { worldClimate: 230 } } });
  assert.equal(JSON.stringify(base), snap);
  const id = capitalPlaceId(0), ll = mapPixelToLongitudeLatitude(2177, 612), ed = loc.exterior.exteriorData;
  assert.equal(loc.name, 'Imperial City');
  assert.deepEqual([ed.width, ed.height, ed.blockNames.length, ed.mapId, ed.locationId, ed.portTownAndUnknown, ed.buildingCount], [8, 8, 64, id, id, 0, 26]);
  assert.deepEqual(ed.blockNames, capitalBlockNames(IMPERIAL_CITY_PLAN, 0, names));
  assert.equal(loc.exterior.buildings.length, 26, 'one named record a classic block');
  assert.ok(loc.exterior.buildings.every((d) => d.locationId === id));
  assert.equal(loc.exterior.recordElement.header.locationId, id);
  assert.deepEqual([loc.mapTableData.mapId, loc.mapTableData.locationType, loc.mapTableData.longitude, loc.mapTableData.latitude], [id, LOCATION_TYPES.TownCity, ll.x, ll.y]);
  assert.deepEqual([loc.locationIndex, loc.hasDungeon, loc.dungeon], [capitalLocationIndex(0), false, null]);
  assert.deepEqual([loc.regionIndex, loc.regionName, loc.politic, loc.climate.worldClimate], [23, 'Wrothgarian Mountains', 151, 230]);
  assert.deepEqual(loc.capital, { key: 'imperial-city', k: 0 });
  assert.equal(loc.arena, slot);
  assert.equal('arena' in synthesizeCapitalLocation({ cap: CAPITALS[0], k: 0 }, { base, names, blockOf: () => fh, px: 2177, py: 612 }), false, 'no Arena place, no slot');
  assert.equal(synthesizeCapitalLocation({ cap: CAPITALS[0], k: 0 }, { base: null, names, blockOf: () => fh, px: 0, py: 0 }), null);
  assert.equal(synthesizeCapitalLocation({ cap: CAPITALS[0], k: 0 }, { base, names: new Map(), blockOf: () => fh, px: 0, py: 0 }), null);
  const rows = [city(30, ['A']), city(10, ['A'], { hasDungeon: true }), city(20, ['A']), city(15, ['A'], { exterior: {} }), city(5, ['A'], { arena: {} }), city(6, ['A'])];
  assert.equal(capitalBase(rows, (mapId) => mapId === 6).mapTableData.mapId, 20, 'the first plain city of the game\'s, in map-id order');
});

// ── THE LANDMARKS ───────────────────────────────────────────────

const bounds = (m) => { const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < m.positions.length; i += 3) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], m.positions[i + a]); hi[a] = Math.max(hi[a], m.positions[i + a]); } return { lo, hi }; };
const sane = (m) => {
  assert.ok(m.positions.every(Number.isFinite) && m.uvs.every(Number.isFinite));
  for (let i = 0; i < m.normals.length; i += 3) assert.ok(Math.abs(Math.hypot(m.normals[i], m.normals[i + 1], m.normals[i + 2]) - 1) < 1e-4, 'unit normals');
  assert.ok(m.subMeshes.every((s) => s.textureArchive === CAPITAL_ARCHIVE && Object.values(CAPITAL_ART).includes(s.textureRecord)));
  assert.equal(m.subMeshes.reduce((n, s) => n + s.primitiveCount * 3, 0), m.indices.length);
  for (let t = 0; t < m.indices.length; t += 3) {
    const P = (k) => [0, 1, 2].map((a) => m.positions[m.indices[t + k] * 3 + a]);
    const [a, b, c] = [P(0), P(1), P(2)], n = [0, 1, 2].map((a2) => m.normals[m.indices[t] * 3 + a2]);
    const u = b.map((v, i) => v - a[i]), v = c.map((w, i) => w - a[i]);
    const cr = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (Math.hypot(...cr) > 1e-6) assert.ok(cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] > 0, 'every face wound along its normal');
  }
};

test('TESA10 the White-Gold Tower: an octagon from its sunk plinth to a gilt spire at 292 m, its fins within 42 m of its axis, marble and gold, its door\'s dark face on the east', () => {
  const m = buildWhiteGoldTower();
  sane(m);
  const { lo, hi } = bounds(m);
  assert.ok(Math.abs(hi[1] - WHITE_GOLD.spireTop) < 1e-3 && lo[1] === -3);
  assert.ok(Math.max(-lo[0], hi[0], -lo[2], hi[2]) <= WHITE_GOLD.finR + 0.01);
  const recs = new Set(m.subMeshes.map((s) => s.textureRecord));
  assert.deepEqual([...recs].sort(), [CAPITAL_ART.marble, CAPITAL_ART.gold, CAPITAL_ART.dark].sort());
  const dark = m.subMeshes.find((s) => s.textureRecord === CAPITAL_ART.dark);
  for (let i = dark.startIndex; i < dark.startIndex + dark.primitiveCount * 3; i++) assert.ok(m.positions[m.indices[i] * 3] > WHITE_GOLD.plinthR * 0.9, 'the door on the east face');
});

test('TESA10 the walls: the outer wall\'s eight runs at its apothem with its corners cut, towers at every corner, open gates east and south under their lintels; the ring wall round the grounds open on its four axes; the bridges a deck a hand over the water from the gates to the pixel\'s edge', () => {
  const C = imperialWallCorners();
  assert.equal(C.length, 8);
  for (const [x, z] of C) assert.ok(Math.max(Math.abs(x), Math.abs(z)) === IMPERIAL_WALL.apothem && Math.min(Math.abs(x), Math.abs(z)) === IMPERIAL_WALL.flat);
  assert.ok(IMPERIAL_WALL.apothem > 3 * BLOCK_M && IMPERIAL_WALL.apothem - IMPERIAL_WALL.thick / 2 >= 3 * BLOCK_M, 'outside every city block');
  const w = buildImperialWall();
  sane(w);
  const { lo, hi } = bounds(w);
  assert.ok(hi[0] <= IMPERIAL_WALL.apothem + IMPERIAL_WALL.towerR + 1 && lo[0] >= -IMPERIAL_WALL.apothem - IMPERIAL_WALL.towerR - 1);
  // nothing stands in either gate below its lintel
  const inGate = (x, y, z) => y < IMPERIAL_WALL.gateH - 0.01 && y > -2.9 && ((Math.abs(x - IMPERIAL_WALL.apothem) < 3 && Math.abs(z) < IMPERIAL_WALL.gate / 2 - 0.01) || (Math.abs(z - IMPERIAL_WALL.apothem) < 3 && Math.abs(x) < IMPERIAL_WALL.gate / 2 - 0.01));
  for (let t = 0; t < w.indices.length; t += 3) {
    const c = [0, 1, 2].map((a) => (w.positions[w.indices[t] * 3 + a] + w.positions[w.indices[t + 1] * 3 + a] + w.positions[w.indices[t + 2] * 3 + a]) / 3);
    assert.ok(!inGate(...c), `a face in a gate at ${c.map((v) => v.toFixed(1))}`);
  }
  const has = (x0, x1, z0, z1, ymin) => { for (let i = 0; i < w.positions.length; i += 3) { const [x, y, z] = [w.positions[i], w.positions[i + 1], w.positions[i + 2]]; if (x >= x0 && x <= x1 && z >= z0 && z <= z1 && y >= ymin) return true; } return false; };
  assert.ok(has(IMPERIAL_WALL.apothem - 4, IMPERIAL_WALL.apothem + 4, -6, 6, IMPERIAL_WALL.gateH), 'the east lintel');
  assert.ok(has(-6, 6, IMPERIAL_WALL.apothem - 4, IMPERIAL_WALL.apothem + 4, IMPERIAL_WALL.gateH), 'the south lintel');
  assert.ok(has(-IMPERIAL_WALL.apothem - 1, -IMPERIAL_WALL.apothem + 1, -1, 1, IMPERIAL_WALL.towerH), 'the west side\'s tower');
  const inner = buildImperialInnerWall();
  sane(inner);
  for (let i = 0; i < inner.positions.length; i += 3) {
    const [x, y, z] = [inner.positions[i], inner.positions[i + 1], inner.positions[i + 2]], r = Math.hypot(x, z);
    if (y < IMPERIAL_INNER.h - 0.1 && r > IMPERIAL_INNER.r - 2 && r < IMPERIAL_INNER.r + 2) assert.ok(Math.min(Math.abs(x), Math.abs(z)) >= IMPERIAL_INNER.gate / 2 - 0.05, 'its gates open');
  }
  const br = buildImperialBridges();
  sane(br);
  const bb = bounds(br);
  assert.ok(Math.abs(bb.hi[0] - IMPERIAL_BRIDGE.to) < 1e-3 && Math.abs(bb.hi[2] - IMPERIAL_BRIDGE.to) < 1e-3, 'to the pixel\'s edge both ways');
  assert.equal(IMPERIAL_BRIDGE.from, IMPERIAL_WALL.apothem);
});

test('TESA10 the pictures: six of the port\'s own, 64 x 64, opaque, the same every time; the install puts the blocks, models and pictures on their doors once', () => {
  const a = capitalArt(), b = capitalArt();
  assert.deepEqual([...a.keys()].sort(), Object.values(CAPITAL_ART).sort());
  for (const [r, img] of a) {
    assert.deepEqual([img.width, img.height, img.data.length], [CAPITAL_ART_SIZE, CAPITAL_ART_SIZE, CAPITAL_ART_SIZE * CAPITAL_ART_SIZE * 4]);
    for (let i = 3; i < img.data.length; i += 4) assert.equal(img.data[i], 255);
    assert.deepEqual(img.data, b.get(r).data);
  }
  const marble = a.get(CAPITAL_ART.marble).data, gold = a.get(CAPITAL_ART.gold).data;
  assert.ok(marble[0] > 150 && marble[1] > 150 && marble[2] > 150, 'the marble pale');
  assert.ok(gold[0] > gold[2] + 40, 'the gold warm');
  _resetCapitals();
  const entries = [];
  assert.equal(installCapitals({ addTextures: (e) => { entries.push(...e); return e.length; } }), true);
  assert.equal(installCapitals({ addTextures: () => 0 }), false, 'once');
  assert.deepEqual(entries.map((e) => [e.archive, e.record, e.standIn]), Object.values(CAPITAL_ART).map((r) => [CAPITAL_ARCHIVE, r, true]));
  for (const id of Object.values(CAPITAL_MODELS)) assert.ok(customModelFor(id)?.positions?.length > 0, `model ${id}`);
  assert.match(read('src/scenes/modWorldData.js'), /await installArena\(\);[^\n]*\n\s+installCapitals\(\);/);
});

// ── THE HOST ────────────────────────────────────────────────────

const W = read('src/scenes/world.js');
const lift = (head) => { const i = W.indexOf(head); assert.ok(i > 0, head); return W.slice(i, W.indexOf('\n  }\n', i) + 4); };

test('TESA10 the host by source: the base and the blocks off the game\'s rows before they go, under its door; past the Bay a capital first, before Arena\'s place', () => {
  assert.equal(capitalsOn('?capitals=off'), false);
  assert.equal(capitalsOn(''), true);
  assert.match(W, /const _capitalBase = tamrielLand && capitalsOn\(\) \? capitalBase\(_classicRows \?\? _hubRows\.map\(classicRow\)\.filter\(Boolean\), isMainStoryDungeon\) : null;/);
  assert.match(W, /const _capitalNames = _capitalBase \? cityBlockNames\(_classicRows \?\? _hubRows\.map\(classicRow\)\.filter\(Boolean\)\) : null;/);
  assert.ok(W.indexOf('const _capitalNames = ') < W.indexOf('  _classicRows = null;   // read, let go'));
  assert.match(W, /if \(\(_arenaTemplates \|\| _countryTemplates \|\| _capitalBase\) && !onTheBay\(px, py\)\) return capitalLocationAt\(px, py\) \|\| \(_arenaTemplates && arenaLocationAt\(px, py\)\) \|\| countryLocationAt\(px, py\) \|\| lairLocationAt\(px, py\);/);
});

test('TESA10 the host\'s ask: the capital on its pixel stood once, its region the pixel\'s; Arena\'s place on it its slot, and stood again when the slot changes; none elsewhere, and none with the door shut', () => {
  setTamrielFit({ ox: 38 * 15.5, oy: 57 * 15.5, ppu: 15.5 });
  const kinds = [...new Set(IMPERIAL_CITY_PLAN.flat())].filter((c) => !['L', 'G'].includes(c) && !/^C\d$/.test(c));
  const names = new Map(kinds.map((k) => [k, [`${k}AA00.RMB`]]));
  const base = { ...city(9, ['X']), exterior: { exteriorData: { blockNames: ['X'] }, buildings: [] } };
  const make = (open, arena) => new Function('capitalOnPixel', 'synthesizeCapitalLocation', 'base', 'names', 'arena', `
    const _capitalBase = ${open ? 'base' : 'null'}, _capitalNames = names, _arenaTemplates = {}, locationIndex = new Map();
    const arenaPlaceOnPixel = () => (arena.on ? arena.place : null), blocks = { getBlockByName: () => null };
    const maps = { getRegionIndexAt: () => 23, getClimateIndex: () => 231 }, REGION_NAMES = { 23: 'Wrothgarian Mountains' }, getWorldClimateSettings = (c) => ({ worldClimate: c });
    let _locIndexGen = 0;
    ${lift('  function capitalLocationAt(px, py) {')}
    return { capitalLocationAt, index: locationIndex, gen: () => _locIndexGen };`)(capitalOnPixel, synthesizeCapitalLocation, base, names, arena);
  const arena = { on: false, place: null };
  const h = make(true, arena);
  const loc = h.capitalLocationAt(2177, 612);
  assert.equal(loc.name, 'Imperial City');
  assert.equal(h.index.get('2177,612'), loc);
  assert.deepEqual([loc.regionIndex, loc.regionName, loc.politic, loc.climate.worldClimate], [23, 'Wrothgarian Mountains', 151, 231]);
  assert.equal(h.capitalLocationAt(2177, 612), loc, 'once');
  assert.equal(h.gen(), 1);
  assert.equal(h.capitalLocationAt(2178, 612), null);
  arena.on = true; arena.place = { province: 'Imperial', provinceIndex: 8, id: 0, kind: 'city-state', name: 'Imperial City' };
  const withArena = h.capitalLocationAt(2177, 612);
  assert.notEqual(withArena, loc, 'Arena landed: stood again');
  assert.deepEqual(withArena.arena, { province: 'Imperial', provinceIndex: 8, id: 0, kind: 'city-state', port: false });
  assert.equal(h.capitalLocationAt(2177, 612), withArena);
  setTamrielFit({ ox: 400, oy: 500, ppu: 10 });
  assert.equal(h.capitalLocationAt(2177, 612), null, 'the fit moved it off this pixel: out');
  assert.equal(h.index.has('2177,612'), false);
  setTamrielFit({ ox: 38 * 15.5, oy: 57 * 15.5, ppu: 15.5 });
  assert.equal(make(false, { on: false, place: null }).capitalLocationAt(2177, 612), null, 'the door shut');
});

test('TESA10 the sweep: on the frame, when the fit moves, every built pixel past the Bay whose capital came or went is built again, nearest first - the Bay\'s own pixels never; a fit unmoved sweeps nothing', () => {
  assert.match(W, /if \(_capitalBase && !building\) sweepCapitalPixels\(\);/);
  const sweep = lift('  function sweepCapitalPixels() {');
  const run = new Function('capitalOnPixel', 'tamrielFit', 'onTheBay', `
    const built = new Map([['2177,612', { px: 2177, py: 612 }], ['2300,600', { px: 2300, py: 600 }], ['5,5', { px: 5, py: 5 }], ['1385,465', { px: 1385, py: 465 }]]);
    const locationIndex = new Map([['2177,612', { capital: { k: 0 } }]]), destroyed = [], queue = [], state = { current: { x: 2177, y: 612 } };
    const walkMode = false, playerSpawned = false, nearestFirstFrom = () => () => 0, destroyPixel = (x, y) => destroyed.push(x + ',' + y);
    let _seasonHoldKey = null, _capitalSwept = null;
    ${sweep}
    return { sweep: sweepCapitalPixels, destroyed, queue };`);
  setTamrielFit({ ox: 38 * 15.5, oy: 57 * 15.5, ppu: 15.5 });
  const h = run(capitalOnPixel, () => tamrielFitNow(), inBay);
  h.sweep();
  assert.deepEqual(h.destroyed, [], 'the fit the capital was built by: nothing');
  setTamrielFit({ ox: 400, oy: 500, ppu: 10 });
  h.sweep();
  assert.deepEqual(h.destroyed.sort(), ['1385,465', '2177,612'], 'the capital gone from its old pixel and come to its new one; the Bay\'s pixel untouched');
  assert.deepEqual(h.queue.map((k) => `${k.px},${k.py}`).sort(), ['1385,465', '2177,612']);
  h.sweep();
  assert.equal(h.destroyed.length, 2, 'once a fit');
});
