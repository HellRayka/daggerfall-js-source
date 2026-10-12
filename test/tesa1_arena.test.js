// TESA1 (2026-10-12, bible/03-World/Arena-Provinces.md) - ARENA'S PLACES ON DAGGERFALL'S TAMRIEL, pinned.
//
// The owner: "I think I want to begin implementing Elder Scrolls arena into our world of tamriel" - Arena's map, our
// engine, read from the player's own ARENA folder. CITYDATA.65 read (OpenTESArena's CityDataFile, verbatim), each
// province's places fit as a cloud onto its own land on the picture's trace and the rest snapped, the named ones beyond
// the Bay inked on the held map's continent in place of TAMRIEL1's authored cities, and the file kept in a store of its
// own behind the Arena card. No file ships: the pins mint CITYDATA by the format's own law and lay synthetic traces;
// where ARENA_PATH and ARENA2_PATH name the two games' data they hold the reader and the placement on the real files.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  parseArenaCityData, arenaLocationKind, arenaGlobalPoint, arenaGlobalCityId, arenaLocationVisible, isArenaCityId,
  PROVINCE_COUNT, PROVINCE_BYTES, NAME_BYTES, LOCATION_BYTES, LOCATIONS_PER_PROVINCE, CITYDATA_BYTES, IMPERIAL_PROVINCE,
} from '../src/formats/arenaCityData.js';
import {
  fitProvinceCloud, snapToProvince, provinceLand, placeArenaLocations, arenaWorldPoint, arenaProvinceKey,
  setArenaCityData, arenaCityData, arenaPlaces, arenaPlacesVersion, FIT_SCALES, FIT_SHIFTS, FIT_SPARE, SNAP_REACH, SNAP_INSET,
} from '../src/world/arenaPlaces.js';
import { setTamrielTrace } from '../src/world/tamrielLand.js';
import { setTamrielFit } from '../src/world/tamrielFrame.js';
import { buildTamrielInk, tamrielInkFor, tamrielPlaceAt, arenaInkCities, TAMRIEL_TEXT, ARENA_KIND_WORDS, ARENA_KIND_GLYPHS } from '../src/ui/tamrielInk.js';
import { isArenaFile, ARENA_FILES, ARENA_CITYDATA, registerArenaData, arenaDataRegistered, arenaDataAttached } from '../src/scenes/dataSource.js';
import { arenaPlacesOn } from '../src/scenes/shared.js';
import { arenaCard, ARENA_CARD_LINE, ARENA_PORT_WORDS } from '../src/ui/enhancedMenu.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
afterEach(() => { setTamrielTrace(null); setTamrielFit(null); setArenaCityData(null); });

/** CITYDATA by the format's own law (CityDataFile::init read backwards): `provinces[p]` is { name, rect, places } and
 *  `places[id]` is { name, x, y, visibility } - a slot left out is zeroed, as the file zeroes the Imperial Province's. */
function mintCityData(provinces) {
  const b = new Uint8Array(CITYDATA_BYTES);
  const v = new DataView(b.buffer);
  const put = (at, s) => { for (let i = 0; i < s.length; i++) b[at + i] = s.charCodeAt(i); };
  provinces.forEach((p, i) => {
    if (!p) return;
    const o = i * PROVINCE_BYTES;
    put(o, p.name);
    v.setUint16(o + 20, p.rect.x, true); v.setUint16(o + 22, p.rect.y, true); v.setUint16(o + 24, p.rect.w, true); v.setUint16(o + 26, p.rect.h, true);
    for (const [id, l] of Object.entries(p.places ?? {})) {
      const at = o + 28 + Number(id) * LOCATION_BYTES;
      put(at, l.name ?? '');
      v.setUint16(at + 20, l.x, true); v.setUint16(at + 22, l.y, true); b[at + 24] = l.visibility ?? 0;
    }
  });
  return b;
}

/** A 320 x 200 trace of rectangles: [id, x0, y0, x1, y1] (exclusive ends), the picker's ids (1 High Rock, 3 Skyrim). */
function rectTrace(rects) {
  const w = 320, h = 200, land = new Uint8Array(w * h), province = new Uint8Array(w * h);
  for (const [id, x0, y0, x1, y1] of rects) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { land[y * w + x] = 1; province[y * w + x] = id; }
  return { w, h, land, province };
}

test('TESA1 reader: CITYDATA is nine provinces of 1228 bytes - a 20-byte name, the world-map rectangle in four u16, 48 locations of 25 bytes (name, the province map\'s point, visibility); parsed field by field, the file\'s own order; any other length refused (mutant: a stride, a field offset, the size check)', () => {
  assert.deepEqual([PROVINCE_COUNT, PROVINCE_BYTES, NAME_BYTES, LOCATION_BYTES, LOCATIONS_PER_PROVINCE, CITYDATA_BYTES, IMPERIAL_PROVINCE], [9, 1228, 20, 25, 48, 11052, 8]);
  assert.equal(PROVINCE_BYTES, NAME_BYTES + 8 + LOCATIONS_PER_PROVINCE * LOCATION_BYTES, 'the province is its header and its locations, nothing else');
  const bytes = mintCityData([
    { name: 'High Rock', rect: { x: 41, y: 26, w: 83, h: 61 }, places: { 0: { name: 'North Point', x: 175, y: 14 }, 47: { name: 'Last Hold', x: 300, y: 190, visibility: 2 } } },
    null,
    { name: 'Skyrim', rect: { x: 112, y: 22, w: 94, h: 53 }, places: { 0: { name: 'Solitude', x: 112, y: 8 }, 32: { name: 'Labyrinthian', x: 147, y: 73 }, 33: { name: 'Fortress of Ice', x: 230, y: 40 } } },
    null, null, null, null, null,
    { name: 'Imperial Province', rect: { x: 107, y: 61, w: 130, h: 90 }, places: { 0: { name: 'Imperial City', x: 180, y: 65 } } },
  ]);
  const cd = parseArenaCityData(bytes);
  assert.deepEqual(cd.provinces.map((p) => p.name), ['High Rock', '', 'Skyrim', '', '', '', '', '', 'Imperial Province']);
  assert.deepEqual(cd.provinces[2].rect, { x: 112, y: 22, w: 94, h: 53 });
  assert.deepEqual(cd.provinces[2].locations[0], { id: 0, kind: 'city-state', name: 'Solitude', x: 112, y: 8, visibility: 0 });
  assert.deepEqual(cd.provinces[2].locations[32], { id: 32, kind: 'staff-dungeon', name: 'Labyrinthian', x: 147, y: 73, visibility: 0 });
  assert.deepEqual(cd.provinces[2].locations[33], { id: 33, kind: 'map-dungeon', name: 'Fortress of Ice', x: 230, y: 40, visibility: 0 });
  assert.deepEqual(cd.provinces[0].locations[47], { id: 47, kind: 'dungeon', name: 'Last Hold', x: 300, y: 190, visibility: 2 }, 'the last slot of the first province, read at its own offset');
  assert.deepEqual(cd.provinces[8].locations[0], { id: 0, kind: 'city-state', name: 'Imperial City', x: 180, y: 65, visibility: 0 });
  assert.deepEqual(cd.provinces[8].locations[1], { id: 1, kind: 'city-state', name: '', x: 0, y: 0, visibility: 0 }, 'a zeroed slot reads as nothing');
  assert.ok(cd.provinces.every((p) => p.locations.length === 48 && p.locations.every((l, i) => l.id === i)));
  // a name fills its twenty bytes with no terminator and stops there
  const full = mintCityData([{ name: 'ABCDEFGHIJKLMNOPQRST', rect: { x: 1, y: 2, w: 3, h: 4 } }]);
  assert.equal(parseArenaCityData(full).provinces[0].name, 'ABCDEFGHIJKLMNOPQRST');
  assert.deepEqual(parseArenaCityData(full).provinces[0].rect, { x: 1, y: 2, w: 3, h: 4 }, 'the rectangle straight after the twenty');
  for (const n of [0, CITYDATA_BYTES - 1, CITYDATA_BYTES + 1]) assert.equal(parseArenaCityData(new Uint8Array(n)), null, `${n} bytes refused`);
  assert.equal(parseArenaCityData(null), null);
});

test('TESA1 the location laws, verbatim: a location\'s kind by its id (0-7 city-states, 8-15 towns, 16-31 villages, 32 the staff dungeon, 33 the staff map dungeon, 34-47 the dungeons); getGlobalPoint\'s integer arithmetic; the global city id; visibility\'s 0x02 (mutant: a boundary, the truncation, the shift)', () => {
  const kinds = Array.from({ length: 49 }, (_, i) => arenaLocationKind(i));
  assert.deepEqual(kinds, [
    ...Array(8).fill('city-state'), ...Array(8).fill('town'), ...Array(16).fill('village'), 'staff-dungeon', 'map-dungeon', ...Array(14).fill('dungeon'), null,
  ]);
  assert.deepEqual([0, 31, 32, -1].map(isArenaCityId), [true, true, false, false]);
  // Skyrim's Solitude: ((112 * trunc(9400 / 320)) / 100) + 112, ((8 * trunc(5300 / 200)) / 100) + 22
  assert.deepEqual(arenaGlobalPoint(112, 8, { x: 112, y: 22, w: 94, h: 53 }), { x: 144, y: 24 });
  // the inner truncation is the game's: 83 * 100 / 320 is 25.9375, held at 25 - (9 * 25) / 100 is 2, where the exact ratio gives 2.33
  assert.deepEqual(arenaGlobalPoint(9, 162, { x: 41, y: 26, w: 83, h: 61 }), { x: 43, y: 74 });
  assert.deepEqual(arenaGlobalPoint(319, 199, { x: 41, y: 26, w: 83, h: 61 }), { x: 41 + Math.trunc((319 * 25) / 100), y: 26 + Math.trunc((199 * 30) / 100) });
  assert.equal(arenaGlobalPoint(319, 199, { x: 41, y: 26, w: 83, h: 61 }).x, 120);
  assert.deepEqual([arenaGlobalCityId(0, 0), arenaGlobalCityId(3, 2), arenaGlobalCityId(31, 8)], [0, 67, 287]);
  assert.deepEqual([0, 1, 2, 3, 0xfd].map(arenaLocationVisible), [false, false, true, true, false]);
  // the placement keeps the ratio's fractions (a world pixel is 15 km); the verbatim law stays the game's
  assert.deepEqual(arenaWorldPoint({ x: 9, y: 162 }, { x: 41, y: 26, w: 83, h: 61 }), { x: 41 + (9 * 83) / 320, y: 26 + (162 * 61) / 200 });
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8].map(arenaProvinceKey), ['HighRock', 'Hammerfell', 'Skyrim', 'Morrowind', 'Sumurset', 'Valenwood', 'Elsweyr', 'BlackMarsh', 'Imperial'], 'Arena\'s province order is the picker\'s');
});

test('TESA1 the cloud\'s fit: a cloud off its land by a shift is found at that shift; of the fits within FIT_SPARE of the most places on their land the one that moves them least wins - so a cloud shrunk to stand one more is NOT the fit; the identity on a tie (mutant: the spare, the move, the order of the pass)', () => {
  assert.deepEqual([FIT_SCALES[0], FIT_SCALES.at(-1), FIT_SCALES.length, FIT_SHIFTS[0], FIT_SHIFTS.at(-1), FIT_SHIFTS.length, FIT_SPARE], [0.6, 1.1, 11, -12, 12, 25, 1]);
  assert.ok(FIT_SCALES.includes(1) && FIT_SHIFTS.includes(0), 'the identity is a candidate');
  const trace = rectTrace([[3, 110, 20, 210, 80]]);
  const own = provinceLand(trace, 'Skyrim');
  assert.deepEqual([own(110, 20), own(209.9, 79.9), own(109.9, 50), own(150, 80), own(150, 19.99)], [true, true, false, false, false]);
  assert.equal(provinceLand(trace, 'HighRock')(150, 50), false, 'another province\'s land is not its own');
  // ten places 1.5 to 3.5 pixels north of the land: four pixels south stands them all, three leaves four in the sea
  const north = [16.5, 16.5, 16.5, 16.5, 17.5, 17.5, 17.5, 18.5, 18.5, 18.5].map((y, i) => ({ x: 130 + i * 6, y }));
  assert.deepEqual(fitProvinceCloud(north, own, 159, 48.5, { scales: [1] }), { s: 1, dx: 0, dy: 4, on: 10, n: 10 });
  // the count's bias: ten places on a ring inside the land and an eleventh outside - shrinking to 0.6 stands all eleven
  const sq = provinceLand(rectTrace([[3, 100, 100, 140, 140]]), 'Skyrim');
  const ring = Array.from({ length: 10 }, (_, i) => ({ x: 120 + 18 * Math.cos(i * 0.628), y: 120 + 18 * Math.sin(i * 0.628) }));
  const cloud = [...ring, { x: 150, y: 120 }];
  assert.deepEqual(fitProvinceCloud(cloud, sq, 120, 120, { scales: [0.6, 1], shifts: [0] }), { s: 1, dx: 0, dy: 0, on: 10, n: 11 }, 'one place for the snap, not the cloud crushed for it');
  assert.deepEqual(fitProvinceCloud(cloud, sq, 120, 120, { scales: [0.6, 1], shifts: [0], spare: 0 }), { s: 0.6, dx: 0, dy: 0, on: 11, n: 11 }, 'without the spare the count crushes it');
  assert.deepEqual(fitProvinceCloud(ring, sq, 120, 120), { s: 1, dx: 0, dy: 0, on: 10, n: 10 }, 'a cloud on its land stays where Arena put it');
});

test('TESA1 the snap: a place still off its land after the fit stands at the nearest point of its province within SNAP_REACH, SNAP_INSET inside the pixel it lands in; past the reach it is left off; on its land it does not move (mutant: the reach, the inset, the clamp)', () => {
  assert.deepEqual([SNAP_REACH, SNAP_INSET], [8, 0.1]);
  const own = provinceLand(rectTrace([[3, 100, 100, 140, 140]]), 'Skyrim');
  assert.deepEqual(snapToProvince(120.25, 120.75, own), { x: 120.25, y: 120.75, d: 0 });
  const west = snapToProvince(98.5, 120.5, own);
  assert.ok(Math.abs(west.x - 100.1) < 1e-9 && west.y === 120.5 && Math.abs(west.d - 1.6) < 1e-9, `straight east onto the edge pixel, 0.1 inside: ${JSON.stringify(west)}`);
  const corner = snapToProvince(98, 98, own);
  assert.ok(Math.abs(corner.x - 100.1) < 1e-9 && Math.abs(corner.y - 100.1) < 1e-9 && Math.abs(corner.d - Math.hypot(2.1, 2.1)) < 1e-9, 'the corner pixel, inset both ways');
  const south = snapToProvince(130.5, 145, own);
  assert.ok(Math.abs(south.y - 139.9) < 1e-9 && south.x === 130.5, 'from below, onto the last row, 0.1 inside it');
  assert.ok(snapToProvince(92.15, 120.5, own), '7.95 pixels is within the reach');
  assert.equal(snapToProvince(91.5, 120.5, own), null, '8.6 pixels is past it');
  assert.ok(snapToProvince(94.5, 94.5, own), '7.9 pixels on the diagonal is within the reach');
  assert.equal(snapToProvince(94, 94, own), null, '8.6 on the diagonal is not: the reach is a circle, not the square it scans');
  assert.equal(snapToProvince(98.5, 120.5, own, 1), null, 'the reach is the caller\'s');
});

test('TESA1 the model: every placed slot of every province fit and stood on the trace by its own province\'s key, a zeroed slot no place, a place no land takes counted lost, and no trace no places (mutant: the empty slot, the lost list, the key)', () => {
  const cd = parseArenaCityData(mintCityData([
    { name: 'High Rock', rect: { x: 41, y: 26, w: 83, h: 61 }, places: { 0: { name: 'North Point', x: 175, y: 14 }, 1: { name: 'In The Sea', x: 0, y: 199 } } },
    null,
    { name: 'Skyrim', rect: { x: 112, y: 22, w: 94, h: 53 }, places: { 0: { name: 'Solitude', x: 112, y: 8 }, 34: { name: '', x: 137, y: 167 } } },
  ]));
  assert.deepEqual(placeArenaLocations(cd, null), { provinces: [], places: [], lost: [] });
  const trace = rectTrace([[1, 70, 26, 100, 40], [3, 110, 20, 210, 80]]);
  const m = placeArenaLocations(cd, trace);
  assert.deepEqual(m.provinces.map((p) => [p.key, p.fit.n]), [['HighRock', 2], ['Hammerfell', 0], ['Skyrim', 2], ['Morrowind', 0], ['Sumurset', 0], ['Valenwood', 0], ['Elsweyr', 0], ['BlackMarsh', 0], ['Imperial', 0]]);
  assert.deepEqual(m.places.map((p) => [p.province, p.id, p.kind, p.name]), [['HighRock', 0, 'city-state', 'North Point'], ['Skyrim', 0, 'city-state', 'Solitude'], ['Skyrim', 34, 'dungeon', '']]);
  assert.deepEqual(m.lost.map((p) => [p.province, p.name]), [['HighRock', 'In The Sea']], 'the place far out at sea is left off, and counted');
  const sol = m.places.find((p) => p.name === 'Solitude');
  const at = arenaWorldPoint({ x: 112, y: 8 }, { x: 112, y: 22, w: 94, h: 53 });
  assert.ok(Math.abs(sol.px - at.x) < 1e-9 && Math.abs(sol.py - at.y) < 1e-9 && sol.snapped === 0, 'Skyrim\'s cloud on its land: the identity');
  for (const p of m.places) assert.equal(provinceLand(trace, p.province)(p.px, p.py), true, `${p.name || p.id} stands on its own province`);
});

test('TESA1 the installed set: the city data installed moves the version; no places without a trace; one model a trace, rebuilt when the land\'s version moves; null takes them off (mutant: the cache key, the trace gate)', () => {
  const cd = parseArenaCityData(mintCityData([null, null, { name: 'Skyrim', rect: { x: 112, y: 22, w: 94, h: 53 }, places: { 0: { name: 'Solitude', x: 112, y: 8 } } }]));
  const v0 = arenaPlacesVersion();
  setArenaCityData(cd);
  assert.equal(arenaPlacesVersion(), v0 + 1);
  assert.equal(arenaCityData(), cd);
  assert.equal(arenaPlaces(), null, 'no trace: nothing to stand them on');
  setTamrielTrace(rectTrace([[3, 110, 20, 210, 80]]));
  const a = arenaPlaces();
  assert.equal(a.places.length, 1);
  assert.equal(arenaPlaces(), a, 'once a trace');
  setTamrielTrace(rectTrace([[3, 110, 20, 210, 80]]));
  assert.notEqual(arenaPlaces(), a, 'a new trace, a new model');
  setArenaCityData({ provinces: 'no' });
  assert.equal(arenaCityData(), null, 'a shape that is not city data installs nothing');
  setArenaCityData(null);
  assert.equal(arenaPlaces(), null);
  assert.equal(arenaPlacesVersion(), v0 + 3);
});

test('TESA1 the ink: on the trace, the continent\'s cities ARE Arena\'s named places beyond the Bay - a capital where TAMRIEL1 named one, the Bay\'s own and the unnamed dungeons not inked, each glyph its kind\'s; the ink rebuilds when the places come and go; the hover names the kind; off the trace the authored cities stand (mutant: the Bay test, the capital match, the version, the hover\'s kind)', () => {
  assert.deepEqual(ARENA_KIND_WORDS, { 'city-state': 'city-state', town: 'town', village: 'village', 'staff-dungeon': 'dungeon', 'map-dungeon': 'dungeon', dungeon: 'dungeon' });
  assert.deepEqual(ARENA_KIND_GLYPHS, { 'city-state': 'hamlet', town: 'village', village: 'village', 'staff-dungeon': 'dungeon', 'map-dungeon': 'dungeon', dungeon: 'dungeon' });
  const cd = parseArenaCityData(mintCityData([
    { name: 'High Rock', rect: { x: 41, y: 26, w: 83, h: 61 }, places: { 0: { name: 'North Point', x: 175, y: 14 }, 2: { name: 'Bayside', x: 100, y: 150 } } },
    null,
    { name: 'Skyrim', rect: { x: 112, y: 22, w: 94, h: 53 }, places: { 0: { name: 'Solitude', x: 112, y: 8 }, 1: { name: 'Dawnstar', x: 186, y: 23 }, 8: { name: 'Oakwood', x: 150, y: 120 }, 32: { name: 'Labyrinthian', x: 147, y: 73 }, 34: { name: '', x: 137, y: 167 } } },
  ]));
  const authored = buildTamrielInk();
  assert.equal(authored.arena, false);
  setArenaCityData(cd);
  assert.equal(buildTamrielInk().arena, false, 'the authored shape is not Arena\'s grid: no places on it');
  setTamrielTrace(rectTrace([[1, 40, 26, 101, 91], [3, 110, 20, 210, 80]]));
  const ink = buildTamrielInk();
  assert.equal(ink.arena, true);
  assert.equal(ink.arenaVersion, arenaPlacesVersion());
  assert.deepEqual(ink.cities.map((c) => [c.province, c.name, c.kind, c.capital]), [
    ['HighRock', 'North Point', 'city-state', false],
    ['Skyrim', 'Solitude', 'city-state', true],
    ['Skyrim', 'Dawnstar', 'city-state', false],
    ['Skyrim', 'Oakwood', 'town', false],
    ['Skyrim', 'Labyrinthian', 'staff-dungeon', false],
  ], 'Bayside stands inside the Bay\'s rectangle (Daggerfall\'s ground) and the unnamed dungeon has no name to ink');
  assert.deepEqual(arenaInkCities(arenaPlaces()), ink.cities);
  const sol = ink.cities.find((c) => c.name === 'Solitude');
  assert.equal(tamrielPlaceAt(sol.x, sol.y, { ox: 0, oy: 0, scale: 1 }, ink), 'Skyrim : Solitude (city-state, beyond the Bay)');
  const lab = ink.cities.find((c) => c.name === 'Labyrinthian');
  assert.equal(tamrielPlaceAt(lab.x, lab.y, { ox: 0, oy: 0, scale: 1 }, ink), 'Skyrim : Labyrinthian (dungeon, beyond the Bay)');
  assert.equal(TAMRIEL_TEXT.city('Skyrim', 'Solitude'), 'Skyrim : Solitude (beyond the Bay)', 'an authored city as it was');
  // the window's cache: the same ink until Arena's places come or go
  const held = tamrielInkFor(null);
  assert.equal(tamrielInkFor(null), held);
  setArenaCityData(null);
  const after = tamrielInkFor(null);
  assert.notEqual(after, held, 'removed: rebuilt');
  assert.equal(after.arena, false);
  assert.ok(after.cities.every((c) => c.kind === null), 'TAMRIEL1\'s authored cities again');
  // the painter draws a place by its kind
  assert.match(read('src/ui/tamrielInk.js'), /const glyph = c\.capital \? 'city' : \(ARENA_KIND_GLYPHS\[c\.kind\] \?\? 'hamlet'\);/);
});

test('TESA1 the store: Arena\'s own (not ARENA2\'s - KEEP\'s diet and the recovery wipe never see it), the database\'s upgrade additive, only CITYDATA.65 kept from a folder by its uppercase name; a registration with no IndexedDB installs nothing and says so; the picker says what it found (mutant: the filter, the store list, the version)', async () => {
  assert.deepEqual(ARENA_FILES, ['CITYDATA.65', 'A.EXE', 'ACD.EXE'], 'PIN MOVED (TESA6): and the executable, for its coastal list (tesa6_ports)');
  assert.equal(ARENA_CITYDATA, 'CITYDATA.65');
  assert.deepEqual(['CITYDATA.65', 'citydata.65', 'ARENA/CITYDATA.65', 'C:\\ARENA\\CityData.65', 'CITYDATA.00', 'CITYDATA.64', 'GLOBAL.BSA', 'CITYDATA.650', 'a.exe', 'ACD.EXE', 'INSTALL.EXE'].map(isArenaFile),
    [true, true, true, true, false, false, false, false, true, true, false], 'the template a new character starts from and the executable, nothing else');
  const ds = read('src/scenes/dataSource.js');
  assert.match(ds, /const ARENA_STORE = 'arena';/);
  assert.match(ds, /const ASSET_STORES = \[MUSIC_STORE, TEXTURE_STORE, MW_STORE, DERIVED_STORE, ARENA_STORE\];/);
  assert.match(ds, /indexedDB\.open\(DB_NAME, 6\);/, 'the store is a version of its own');
  const clear = ds.slice(ds.indexOf('export async function clearStoredData()'), ds.indexOf('// ---- M-EXT'));
  assert.doesNotMatch(clear, /ARENA_STORE/, 're-picking ARENA2 does not take Arena away');
  assert.match(ds, /return storeAssets\(ARENA_STORE, files, isArenaFile, \(f, base\) => normalizeName\(base\)\);/);
  assert.match(ds, /doneText: \(n\) => \(n \? 'Arena\\u2019s places will stand on the map of Tamriel' : 'no CITYDATA\.65 in that folder'\),/);
  assert.match(ds, /msg\.textContent = \(typeof doneText === 'function' \? doneText\(count\) : doneText\) \?\?/);
  // node has no IndexedDB: the read fails, the registration installs nothing and answers 0
  setArenaCityData(parseArenaCityData(mintCityData([])));
  assert.equal(await registerArenaData(), 0);
  assert.equal(arenaCityData(), null, 'what stood before is replaced by what the store holds - nothing');
  assert.deepEqual([arenaDataRegistered(), arenaDataAttached()], [true, false]);
});

test('TESA1 the doors: the world host reads the store at its boot behind `?arenaplaces=off` and stands the places once both the data and the trace have landed; the held map repaints on either; the Arena card is a title, a line, the data and Attach / Remove, at the foot of Your files (mutant: the door, a warm dropped, the static key)', async () => {
  assert.equal(arenaPlacesOn('?arenaplaces=off'), false);
  assert.equal(arenaPlacesOn(''), true);
  assert.equal(arenaPlacesOn('?tamrieltrace=off'), true);
  const world = read('src/scenes/world.js');
  assert.match(world, /const arenaReady = arenaPlacesOn\(\)\n\s+\? registerArenaData\(\)\.then\(\(n\) => \{ if \(n\) arenaWarm\(\); return n; \}\)/);
  assert.match(world, /: Promise\.resolve\(setArenaCityData\(null\)\)\.then\(\(\) => 0\);/, 'the door shut leaves nothing installed');
  assert.match(world, /arenaReady\.then\(\(n\) => \{ if \(n\) arenaWarm\(\); \}\);   \/\/ TESA1: the places onto the trace that just landed/);
  assert.ok(world.indexOf('const arenaReady = arenaPlacesOn()') < world.indexOf('preloadTamrielTrace({ fetchBytes, palette })'), 'the data asked for before the trace is');
  assert.match(read('src/ui/heldMap.js'), /tamrielLandVersion\(\),[^\n]*\n\s+arenaPlacesVersion\(\),/);
  assert.match(read('src/ui/settingsMap.js'), /"card:morrowind", "card:packs", "card:arena"\]/);
  // the card, with the store already asked (node: nothing attached) so it asks nothing more
  await registerArenaData();
  const mk = (tag) => {
    const n = {
      tag, children: [], className: '', _text: '',
      get textContent() { return n._text + n.children.map((c) => c.textContent).join(''); },
      set textContent(v) { n._text = String(v); n.children.length = 0; },
      append(...cs) { for (const c of cs) n.children.push(c); },
      setAttribute() {},
    };
    return n;
  };
  const kids = (n, tag) => n.children.filter((c) => c.tag === tag);
  const prev = globalThis.document;
  globalThis.document = { createElement: mk };
  try {
    for (const [attached, data, buttons, primary] of [[false, 'none attached', ['Attach data'], ['Attach data']], [true, 'CITYDATA.65 attached', ['Attach data', 'Remove data'], []]]) {
      const card = arenaCard({ attached, known: attached, coast: attached, coastKnown: attached });   // PIN MOVED (TESA-ONLINE): the reading names the release - the known one here (tesa2_online holds the other); TESA6: and its ports
      assert.equal(kids(card, 'h3')[0].textContent, 'The Elder Scrolls: Arena');
      assert.deepEqual(kids(card, 'p').map((p) => p.textContent), [ARENA_CARD_LINE]);
      const [dl] = kids(card, 'dl');
      assert.deepEqual(Object.fromEntries(kids(dl, 'dt').map((dt, i) => [dt.textContent, kids(dl, 'dd')[i].textContent])), attached ? { Data: data, Ports: ARENA_PORT_WORDS.known } : { Data: data }, 'PIN MOVED (TESA6): the ports\' row once data is attached');
      const bs = kids(card, 'div').flatMap((d) => kids(d, 'button'));
      assert.deepEqual(bs.map((b) => b.textContent), buttons);
      assert.deepEqual(bs.filter((b) => /primary/.test(b.className)).map((b) => b.textContent), primary);
      assert.equal(card.children.length, 4, 'title, line, data, buttons');
    }
  } finally { globalThis.document = prev; }
});

// ── THE PLAYER'S OWN FILES ─────────────────────────────────────────
const ARENA = process.env.ARENA_PATH;
const ARENA2 = process.env.ARENA2_PATH;
const HAVE_ARENA = !!ARENA && existsSync(join(ARENA, 'CITYDATA.65'));
const HAVE_BOTH = HAVE_ARENA && !!ARENA2 && ['TMAP00I0.IMG', 'TAMRIEL2.IMG', 'MAP.PAL', 'ART_PAL.COL'].every((f) => existsSync(join(ARENA2, f)));

test('TESA1 with ARENA: the freeware CITYDATA.65 - nine provinces in the picker\'s order with their rectangles, 401 placed slots, 273 named, the Imperial Province one city and sixteen nameless dungeon places', { skip: HAVE_ARENA ? false : 'ARENA_PATH not set' }, () => {
  const cd = parseArenaCityData(new Uint8Array(readFileSync(join(ARENA, 'CITYDATA.65'))));
  assert.deepEqual(cd.provinces.map((p) => p.name), ['High Rock', 'Hammerfell', 'Skyrim', 'Morrowind', 'Summurset Isle', 'Valenwood', 'Elsweyr', 'Black Marsh', 'Imperial Province']);
  assert.deepEqual(cd.provinces.map((p) => [p.rect.x, p.rect.y, p.rect.w, p.rect.h]), [[41, 26, 83, 61], [48, 48, 94, 59], [112, 22, 94, 53], [198, 28, 81, 87], [31, 108, 65, 69], [97, 108, 71, 69], [148, 112, 59, 67], [208, 106, 64, 74], [107, 61, 130, 90]]);
  const all = cd.provinces.flatMap((p) => p.locations);
  assert.equal(all.filter((l) => l.x || l.y).length, 401);
  assert.equal(all.filter((l) => l.name).length, 273);
  assert.deepEqual(cd.provinces[2].locations.slice(0, 8).map((l) => l.name), ['Solitude', 'Dawnstar', 'Winterhold', 'Snowhawk', 'Riften', 'Falcrenth', 'Whiterun', 'Windhelm']);
  assert.deepEqual(cd.provinces.map((p) => p.locations[32].name), ['Crypt of Hearts', 'Fang Lair', 'Labyrinthian', 'Dagoth-Ur', 'Crystal Tower', 'Elden Grove', 'Halls of Colossus', 'Murkwood', '']);
  assert.ok(cd.provinces.every((p) => p.locations.slice(34).every((l) => !l.name)), 'the dungeons\' names are each save\'s');
  const imp = cd.provinces[8].locations;
  assert.deepEqual([imp[0].name, imp.slice(1, 32).filter((l) => l.x || l.y).length, imp.slice(32).filter((l) => l.x || l.y).length], ['Imperial City', 0, 16]);
});

test('TESA1 with ARENA and ARENA2: on the player\'s own trace every one of the 401 stands on its province - 392 by the fit, 9 snapped no more than 3.4 picture pixels, none lost - and 248 named places are inked beyond the Bay with TAMRIEL1\'s eight capitals', { skip: HAVE_BOTH ? false : 'ARENA_PATH and ARENA2_PATH not both set' }, async () => {
  const { DFPalette } = await import('../src/formats/dfPalette.js');
  const { preloadTamrielTrace } = await import('../src/ui/tamrielTrace.js');
  const fetchBytes = async (n) => new Uint8Array(readFileSync(join(ARENA2, n)));
  const pal = new DFPalette(); pal.load(await fetchBytes('ART_PAL.COL'), 'ART_PAL.COL');
  setTamrielTrace(await preloadTamrielTrace({ fetchBytes, palette: pal }));
  setTamrielFit({ ox: 38 * 15.5, oy: 57 * 15.5, ppu: 15.5 });   // TAMRIEL4's fit on the freeware data
  setArenaCityData(parseArenaCityData(new Uint8Array(readFileSync(join(ARENA, 'CITYDATA.65')))));
  const m = arenaPlaces();
  assert.equal(m.places.length, 401);
  assert.equal(m.lost.length, 0);
  const snapped = m.places.filter((p) => p.snapped > 0);
  assert.equal(snapped.length, 9);
  assert.ok(Math.max(...snapped.map((p) => p.snapped)) < 3.4);
  const ink = buildTamrielInk();
  assert.equal(ink.cities.length, 248);
  assert.deepEqual(ink.cities.filter((c) => c.capital).map((c) => c.name).sort(), ['Alinor', 'Falinesti', 'Hegathe', 'Helstrom', 'Imperial City', 'Mournhold', 'Solitude', 'Torval']);
});
