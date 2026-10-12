// TESA2 (2026-10-12, the owner: "Continue building"; bible/03-World/Arena-Provinces.md TESA2) - ARENA'S PLACES STAND,
// pinned. Each named Arena place beyond the Bay on a Bay pixel of its own province's land; on that pixel, as it builds, a
// non-mutating clone of one of Daggerfall's own places - a city, a hamlet, a village, a labyrinth or a keep by the
// place's kind - under Arena's name, an id in a lane of its own and an index of its own; offline alone; a save made in
// one loads into it; a pixel built before the places stood built again; no house sold, no spawn cloned from one; and the
// held map's press on a place the world stands is a journey there. No file ships: the pins lay synthetic traces and mint
// rows; where ARENA_PATH and ARENA2_PATH name the data they hold the pixels and the templates on the real files.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { parseArenaCityData, CITYDATA_BYTES, PROVINCE_BYTES, LOCATION_BYTES } from '../src/formats/arenaCityData.js';
import {
  standArenaPixels, placeArenaLocations, setArenaCityData, arenaPixels, arenaPlaceOnPixel, setArenaStanding, arenaStanding,
  arenaPlacesVersion, PIXEL_REACH,
} from '../src/world/arenaPlaces.js';
import {
  arenaPlaceId, isArenaPlaceId, arenaLocationIndex, arenaTemplates, arenaTemplateOf, synthesizeArenaLocation,
  ARENA_PLACE_SALT, ARENA_PLACE_BASE, ARENA_INDEX_BASE, ARENA_TEMPLATE_KINDS, ARENA_LOAD_WAIT_MS,
} from '../src/world/arenaLocations.js';
import { etherPlaceId, etherLocationIndex } from '../src/world/etherPlaces.js';
import { CELLS_W, CELLS_H } from '../src/world/ethericSea.js';
import { spawnedMapId, spawnTemplates, hash32 } from '../src/world/spawnedDungeons.js';
import { setTamrielTrace } from '../src/world/tamrielLand.js';
import { setTamrielFit, pictureToBay } from '../src/world/tamrielFrame.js';
import { LOCATION_TYPES, mapPixelToLongitudeLatitude } from '../src/formats/mapsFile.js';
import { buildTamrielInk, arenaInkCities, tamrielCityAt, CITY_HIT_PX } from '../src/ui/tamrielInk.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
afterEach(() => { setTamrielTrace(null); setTamrielFit(null); setArenaCityData(null); setArenaStanding(false); });

/** CITYDATA by the format's own law (as tesa1's): `provinces[p]` { name, rect, places: { id: { name, x, y } } }. */
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
      v.setUint16(at + 20, l.x, true); v.setUint16(at + 22, l.y, true);
    }
  });
  return b;
}
function rectTrace(rects) {
  const w = 320, h = 200, land = new Uint8Array(w * h), province = new Uint8Array(w * h);
  for (const [id, x0, y0, x1, y1] of rects) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { land[y * w + x] = 1; province[y * w + x] = id; }
  return { w, h, land, province };
}
/** A model's place by hand: the province, slot, kind and name, and its point on the picture. */
const at = (province, provinceIndex, id, kind, name, px, py) => ({ province, provinceIndex, id, kind, name, px, py, snapped: 0 });
/** A picture point for a Bay pixel's centre under a fit of 10 Bay pixels a picture pixel, the Bay at picture (40, 50). */
const FIT = { ox: 400, oy: 500, ppu: 10 };
const pic = (bx, by) => [(bx + 0.5 + FIT.ox) / FIT.ppu, (by + 0.5 + FIT.oy) / FIT.ppu];

test('TESA2 the pixel a place stands on: the Bay pixel under its point where that pixel\'s centre is its own province\'s land and no place before it stood; else the nearest such within PIXEL_REACH, ring by ring; else none - and the Bay\'s own ground, and a nameless dungeon, stand none (mutant: the centre, the ring, the taken test, the Bay)', () => {
  assert.equal(PIXEL_REACH, 3);
  setTamrielFit(FIT);
  // Skyrim's land is picture x 110..210, y 20..50: Bay pixels x 700..1699, y -300..-1 (the Bay at 0..999, 0..499)
  const trace = rectTrace([[3, 110, 20, 210, 50], [1, 60, 20, 100, 50]]);
  const model = { places: [
    at('Skyrim', 2, 0, 'city-state', 'Plain', ...pic(800, -200)),
    at('Skyrim', 2, 1, 'town', 'Twin', ...pic(800, -200)),   // the same pixel: the next nearest free one
    at('Skyrim', 2, 2, 'village', 'Shore', 109.95, 30.05),   // a sliver west of the land: the nearest land pixel east
    at('Skyrim', 2, 3, 'village', 'Far', 105, 30),   // 50 Bay pixels out: none
    at('Skyrim', 2, 34, 'dungeon', '', ...pic(900, -100)),   // nameless: none
    at('HighRock', 0, 0, 'city-state', 'Bayside', ...pic(500, 200)),   // on the Bay's own ground: Daggerfall's
  ] };
  const s = standArenaPixels(model, trace);
  assert.deepEqual(s.stood.map((p) => [p.name, p.bx, p.by]), [['Plain', 800, -200], ['Twin', 800, -201], ['Shore', 700, -200]]);
  assert.deepEqual(s.unstood.map((p) => p.name), ['Far']);
  assert.equal(s.byPixel.get('800,-200').name, 'Plain');
  assert.equal(s.byPixel.get('800,-201').name, 'Twin', 'the ring\'s nearest centre to the point, the first of a tie in reading order');
  assert.equal(s.byPixel.size, 3);
  // a point whose own pixel's centre is sea, and every pixel round it within the reach sea too, stands nowhere
  const lone = standArenaPixels({ places: [at('Skyrim', 2, 5, 'town', 'Lone', 100.5, 30)] }, trace);
  assert.deepEqual([lone.stood.length, lone.unstood.length], [0, 1]);
  // the CENTRE decides: with the land's edge at Bay x 699.3, pixel 699's corner is sea and its centre land - it stands
  setTamrielFit({ ox: 400.7, oy: 500, ppu: 10 });
  const mid = standArenaPixels({ places: [at('Skyrim', 2, 7, 'town', 'Mid', (699.6 + 400.7) / 10, 30.05)] }, trace);
  assert.deepEqual(mid.stood.map((p) => [p.bx, p.by]), [[699, -200]]);
  setTamrielFit(FIT);
  // the reach is in rings: 3 out is reached, 4 out is not
  const edge = (dx) => standArenaPixels({ places: [at('Skyrim', 2, 6, 'town', 'Edge', 110 - (dx - 0.5) / 10, 30.05)] }, trace).stood.length;
  assert.deepEqual([edge(3), edge(4)], [1, 0]);
});

test('TESA2 the installed pixels: made once a trace and a fit, made again when either moves, none with nothing installed; the place on a pixel; the standing switch moves the version only when it changes (mutant: the fit key, the switch)', () => {
  setTamrielFit(FIT);
  setTamrielTrace(rectTrace([[3, 110, 20, 210, 50]]));
  assert.equal(arenaPixels(), null);
  setArenaCityData(parseArenaCityData(mintCityData([null, null, { name: 'Skyrim', rect: { x: 112, y: 22, w: 94, h: 53 }, places: { 0: { name: 'Solitude', x: 112, y: 8 } } }])));
  const a = arenaPixels();
  assert.equal(a.stood.length, 1);
  assert.equal(arenaPixels(), a, 'once');
  const sol = a.stood[0];
  const [x, y] = pictureToBay(sol.px, sol.py);
  assert.deepEqual([sol.bx, sol.by], [Math.floor(x), Math.floor(y)]);
  assert.equal(arenaPlaceOnPixel(sol.bx, sol.by), sol);
  assert.equal(arenaPlaceOnPixel(sol.bx + 1, sol.by), null);
  setTamrielFit({ ...FIT, ox: FIT.ox + 10 });
  const b = arenaPixels();
  assert.notEqual(b, a, 'a new fit, new pixels');
  assert.equal(b.stood[0].bx, sol.bx - 10, 'ten Bay pixels west with the Bay ten east');
  const v = arenaPlacesVersion();
  assert.equal(arenaStanding(), false);
  setArenaStanding(true); setArenaStanding(true);
  assert.deepEqual([arenaStanding(), arenaPlacesVersion()], [true, v + 1], 'the version moves once, on the change');
  setArenaStanding(false);
  assert.equal(arenaPlacesVersion(), v + 2);
});

test('TESA2 the id: a lane of its own in the high 12 bits and a number past every Bay pixel id below, so no Arena place is a spawn\'s, an isle\'s or a Bay place\'s; the index its own negative past the isles\'; all 432 slots apart (mutant: the salt, the base, the ordinal)', () => {
  assert.deepEqual([ARENA_PLACE_SALT, ARENA_PLACE_BASE, ARENA_INDEX_BASE, ARENA_LOAD_WAIT_MS], [0xa7, 500000, 1000000, 8000]);
  const p = { provinceIndex: 2, id: 2 };
  assert.equal(arenaPlaceId(p), ((0xa7 << 20) | (500000 + 2 * 48 + 2)) >>> 0);
  assert.equal(arenaLocationIndex(p), -(1000000 + 98));
  const ids = new Set(), idx = new Set();
  for (let pi = 0; pi < 9; pi++) for (let id = 0; id < 48; id++) { ids.add(arenaPlaceId({ provinceIndex: pi, id })); idx.add(arenaLocationIndex({ provinceIndex: pi, id })); }
  assert.deepEqual([ids.size, idx.size], [432, 432]);
  for (const id of ids) {
    assert.ok(isArenaPlaceId(id));
    assert.ok((id & 0xfffff) >= 500000, 'past every pixel id');
  }
  assert.ok(Math.max(...[...idx].map((i) => -i)) < 1048576 && Math.min(...[...idx].map((i) => -i)) > 1000 + CELLS_W * CELLS_H, 'past the isles\' indices');
  assert.equal(isArenaPlaceId(spawnedMapId(0xa7, 999, 499)), false, 'a spawn under the same salt is still a spawn: its low bits are a pixel id');
  assert.equal(isArenaPlaceId(etherPlaceId({ cx: 3, cy: 4 })), false);
  assert.ok(-etherLocationIndex({ cx: CELLS_W - 1, cy: CELLS_H - 1 }) < ARENA_INDEX_BASE);
  assert.equal(isArenaPlaceId(1234), false, 'a Bay place');
});

/** A row of the game's own shape, enough for the templates and the clone. */
const row = (mapId, type, { dungeon = false, blocks = 1, extra = {} } = {}) => ({
  name: `Row ${mapId}`, regionIndex: 17, regionName: 'Daggerfall', politic: 145, climate: { worldClimate: 0 }, locationIndex: mapId % 100,
  mapTableData: { mapId, locationType: type, longitude: 1, latitude: 2 },
  exterior: { exteriorData: { width: blocks, height: 1, locationId: mapId, mapId, portTownAndUnknown: 1 }, recordElement: { header: { locationId: mapId } }, buildings: [{ n: 1 }] },
  hasDungeon: dungeon,
  ...(dungeon ? { dungeon: { blocks: [{}], recordElement: { header: { locationId: mapId } } } } : {}),
  ...extra,
});

test('TESA2 the templates: a city-state a CITY, a town a HAMLET, a village a VILLAGE, a staff dungeon a LABYRINTH and a staff map dungeon a KEEP - the game\'s rows of that type with an exterior, a dungeon where the kind has one and none where it has none, never main-story nor a place the port made, in map-id order; the pick off the place\'s own hash; a nameless dungeon none (mutant: a kind\'s type, the dungeon test, an exclusion, the order)', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(ARENA_TEMPLATE_KINDS).map(([k, v]) => [k, [v.type, v.dungeon]])), {
    'city-state': [LOCATION_TYPES.TownCity, false], town: [LOCATION_TYPES.TownHamlet, false], village: [LOCATION_TYPES.TownVillage, false],
    'staff-dungeon': [LOCATION_TYPES.DungeonLabyrinth, true], 'map-dungeon': [LOCATION_TYPES.DungeonKeep, true],
  });
  const rows = [
    row(30, LOCATION_TYPES.TownCity, { blocks: 40 }), row(10, LOCATION_TYPES.TownCity, { blocks: 36 }),
    row(20, LOCATION_TYPES.TownCity, { dungeon: true, blocks: 64 }),   // a capital's castle
    row(40, LOCATION_TYPES.TownHamlet, { blocks: 8 }), row(50, LOCATION_TYPES.TownVillage, { blocks: 4 }),
    row(60, LOCATION_TYPES.DungeonLabyrinth, { dungeon: true }), row(61, LOCATION_TYPES.DungeonLabyrinth, { dungeon: true }),
    row(70, LOCATION_TYPES.DungeonKeep, { dungeon: true }), row(71, LOCATION_TYPES.DungeonKeep, { extra: { hasDungeon: true, dungeon: { blocks: [] } } }),
    row(80, LOCATION_TYPES.TownCity, { extra: { spawned: true } }), row(81, LOCATION_TYPES.TownCity, { extra: { ether: 'k' } }),
    row(82, LOCATION_TYPES.TownCity, { extra: { arena: { id: 0 } } }), { name: 'no exterior', mapTableData: { mapId: 83, locationType: LOCATION_TYPES.TownCity } },
  ];
  const t = arenaTemplates(rows, (id) => id === 61);
  assert.deepEqual(Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v.map((l) => l.mapTableData.mapId)])), {
    'city-state': [10, 30], town: [40], village: [50], 'staff-dungeon': [60], 'map-dungeon': [70],
  });
  const place = { provinceIndex: 2, id: 0, kind: 'city-state' };
  assert.equal(arenaTemplateOf(t, place), t['city-state'][hash32(0xa7, 2, 0, 3) % 2]);
  assert.equal(arenaTemplateOf(t, { provinceIndex: 4, id: 0, kind: 'city-state' }), t['city-state'][hash32(0xa7, 4, 0, 3) % 2], 'another province, its own hash');
  assert.notEqual(arenaTemplateOf(t, place), arenaTemplateOf(t, { provinceIndex: 4, id: 0, kind: 'city-state' }), 'and the two differ here, so the hash is read');
  assert.equal(arenaTemplateOf(t, { provinceIndex: 2, id: 34, kind: 'dungeon' }), null);
  assert.equal(arenaTemplateOf({ ...t, town: [] }, { provinceIndex: 2, id: 8, kind: 'town' }), null);
  // a spawn never clones an Arena place - nor an isle's (AUDIT CAPTAIN'S SEA P3's law)
  const dun = (mapId, extra) => ({ ...row(mapId, LOCATION_TYPES.DungeonRuin, { dungeon: true }), ...extra });
  assert.deepEqual(spawnTemplates([dun(1, {}), dun(2, { arena: { id: 1 } }), dun(3, { ether: 'x' })]).map((l) => l.mapTableData.mapId), [1]);
});

test('TESA2 the clone: the template under Arena\'s name, its own id on the map row, the exterior (its location and map ids, its record\'s header) and the dungeon\'s header, the pixel\'s longitude and latitude, the region the host hands, its own index, no harbour, and `arena` - and the template itself untouched (mutant: a header left the template\'s, the pixel, the port byte)', () => {
  const tpl = row(70, LOCATION_TYPES.DungeonKeep, { dungeon: true });
  const before = JSON.stringify(tpl);
  const place = { province: 'Skyrim', provinceIndex: 2, id: 33, kind: 'map-dungeon', name: 'Fortress of Ice', bx: 2200, by: -360 };
  const loc = synthesizeArenaLocation(tpl, place, { regionIndex: 0, regionName: "Alik'r Desert", politic: 128, climate: { worldClimate: 230 } });
  const id = arenaPlaceId(place), ll = mapPixelToLongitudeLatitude(2200, -360);
  assert.equal(loc.name, 'Fortress of Ice');
  assert.deepEqual([loc.regionIndex, loc.regionName, loc.politic, loc.climate.worldClimate, loc.locationIndex], [0, "Alik'r Desert", 128, 230, arenaLocationIndex(place)]);
  assert.deepEqual(loc.mapTableData, { ...tpl.mapTableData, mapId: id, longitude: ll.x, latitude: ll.y });
  assert.deepEqual(loc.exterior.exteriorData, { ...tpl.exterior.exteriorData, locationId: id, mapId: id, portTownAndUnknown: 0 });
  assert.equal(loc.exterior.recordElement.header.locationId, id);
  assert.equal(loc.dungeon.recordElement.header.locationId, id);
  assert.equal(loc.dungeon.blocks, tpl.dungeon.blocks, 'the blocks shared, never copied');
  assert.equal(loc.exterior.buildings, tpl.exterior.buildings);
  assert.deepEqual(loc.arena, { province: 'Skyrim', provinceIndex: 2, id: 33, kind: 'map-dungeon' });
  assert.ok(Object.isFrozen(loc.arena));
  assert.equal(JSON.stringify(tpl), before, 'the template is the game\'s and stays so');
  const town = synthesizeArenaLocation(row(40, LOCATION_TYPES.TownHamlet), { ...place, kind: 'town', name: 'T' });
  assert.equal(town.dungeon, undefined, 'a town clones no dungeon');
  assert.deepEqual([town.regionIndex, town.politic], [17, 145], 'no region handed: the template\'s');
});

test('TESA2 the map: where a host stands the places, each inked place carries the pixel it stands on, and the press on one is a journey to that pixel, the trip the coordinates\' own; where none does it carries none and the press picks nothing; the cursor points at one it travels to (mutant: the switch, the pixel, the pick)', () => {
  setTamrielFit({ ox: 38 * 15.5, oy: 57 * 15.5, ppu: 15.5 });
  setTamrielTrace(rectTrace([[3, 110, 20, 210, 80]]));
  setArenaCityData(parseArenaCityData(mintCityData([null, null, { name: 'Skyrim', rect: { x: 112, y: 22, w: 94, h: 53 }, places: { 0: { name: 'Solitude', x: 112, y: 8 }, 1: { name: 'Dawnstar', x: 186, y: 23 } } }])));
  let ink = buildTamrielInk();
  assert.ok(ink.cities.every((c) => c.pixel === null), 'nobody stands them: no journeys');
  setArenaStanding(true);
  ink = buildTamrielInk();
  const px = arenaPixels();
  assert.deepEqual(ink.cities.map((c) => [c.name, c.pixel]), px.stood.map((p) => [p.name, { x: p.bx, y: p.by }]));
  const sol = ink.cities[0];
  assert.equal(tamrielCityAt(sol.x + 1, sol.y, { ox: 0, oy: 0, scale: 1 }, ink), sol);
  assert.equal(tamrielCityAt(sol.x + CITY_HIT_PX + 1, sol.y, { ox: 0, oy: 0, scale: 1 }, ink), null);
  assert.equal(tamrielCityAt(500, 250, { ox: 0, oy: 0, scale: 1 }, ink), null, 'the Bay\'s own ground is the Bay\'s');
  assert.deepEqual(arenaInkCities(placeArenaLocations(parseArenaCityData(mintCityData([])), null)), []);
  const held = read('src/ui/heldMap.js');
  const pick = held.slice(held.indexOf('  _pickAt(sx, sy) {'), held.indexOf('  _renderSearch(entries) {'));
  assert.match(pick, /if \(city\?\.pixel\) \{\n\s+this\._select\(\{ coords: true, x: city\.pixel\.x \+ 0\.5, y: city\.pixel\.y \+ 0\.5, colorIndex: -1, kind: 'coords', name: city\.name, summary: null, mapId: null, arena: true \}\);\n\s+this\._openPanel\('travel'\);/);
  assert.ok(pick.indexOf('// TESA2') < pick.indexOf('// WILD2'), 'before the zone\'s and the coordinates\' own arms');
  assert.match(held, /if \(selected\.coords\) return \{ pixel: \{ x: Math\.floor\(selected\.x\), y: Math\.floor\(selected\.y\) \}, name: selected\.name \};/, 'the journey is to its pixel, by its name');
  assert.match(held, /cursor: tamrielCityAt\(mx, my, this\._view, tamrielInkFor\(this\._model\)\)\?\.pixel \? 'pointer' : ''/);
});

test('TESA2 the host: offline on the land beyond the Bay it stands the places - the templates off the game\'s rows, the build asking Arena past the Bay, one clone a pixel in the index taken out when its place goes, the region and the climate the pixel\'s; the built pixel keeps its place for the sweep, which builds again what moved; a boot\'s load waits for the places; no house is sold in an Arena town; /tp names them (mutant: online, an arm, the wait)', () => {
  const w = read('src/scenes/world.js');
  assert.match(w, /const arenaStands = tamrielLand && arenaPlacesOn\(\) && !params\.has\('online'\);\n\s+setArenaStanding\(arenaStands\);/);
  assert.match(w, /const _arenaTemplates = arenaStands \? arenaTemplates\(_classicRows \?\? _hubRows\.map\(classicRow\)\.filter\(Boolean\), isMainStoryDungeon\) : null;/, 'the game\'s rows');
  assert.ok(w.indexOf('const _arenaTemplates = arenaStands') < w.indexOf('  _classicRows = null;   // read, let go'), 'before they go');
  assert.match(w, /if \(etherSea && inEther\(px, py\)\) return etherPlaceAt\(px, py\);[^\n]*\n\s+if \(_arenaTemplates && !onTheBay\(px, py\)\) return arenaLocationAt\(px, py\);/);
  const fn = w.slice(w.indexOf('  function arenaLocationAt(px, py) {'), w.indexOf('  /** AUDIT OW4 D4: THE CLONE a pixel\'s spawn IS'));
  assert.match(fn, /if \(place && had\.arena\.provinceIndex === place\.provinceIndex && had\.arena\.id === place\.id\) return had;\n\s+_locIndexGen \+= 1;\n\s+locationIndex\.delete\(key\);/, 'one clone a pixel, and out of the index when its place goes');
  assert.match(fn, /const regionIndex = maps\.getRegionIndexAt\(px, py\);\n\s+const loc = synthesizeArenaLocation\(template, place, \{ regionIndex, regionName: REGION_NAMES\[regionIndex\], politic: 128 \+ regionIndex, climate: getWorldClimateSettings\(maps\.getClimateIndex\(px, py\)\) \}\);/);
  assert.match(fn, /locationIndex\.set\(key, loc\);\n\s+return loc;/);
  assert.match(w, /location: dfLocation \? dfLocation\.name : null,\n\s+arena: dfLocation\?\.arena \?\? null,\n/, 'the built pixel keeps its Arena slot');
  const sweep = w.slice(w.indexOf('  function sweepArenaPixels() {'), w.indexOf('  // LocationLoader.cs:146-151'));
  assert.match(sweep, /if \(now === _arenaSwept\) return;/);
  assert.match(sweep, /if \(onTheBay\(p\.px, p\.py\)\) continue;/);
  assert.match(sweep, /if \(\(place \? `\$\{place\.provinceIndex\}\|\$\{place\.id\}` : null\) !== \(p\.arena \? `\$\{p\.arena\.provinceIndex\}\|\$\{p\.arena\.id\}` : null\)\) again\.push/);
  assert.match(sweep, /for \(const k of again\) destroyPixel\(k\.px, k\.py, \{ collectLoose: false \}\);\n\s+queue\.push\(\.\.\.again\.sort\(nearestFirstFrom\(state\.current\)\)\);/);
  assert.match(w, /if \(_arenaTemplates && !building\) sweepArenaPixels\(\);/);
  assert.match(w, /if \(_arenaTemplates && params\.has\('load'\)\) await arenaReady\.then\(\(n\) => \(n \? Promise\.race\(\[arenaTraced, new Promise\(\(r\) => setTimeout\(r, ARENA_LOAD_WAIT_MS\)\)\]\) : 0\)\);\n\s+let _loadedGame = false;/, 'a load waits before the boot decides its start');
  assert.match(w, /\.finally\(\(\) => arenaTraceLanded\(\)\);/, 'landed, or never will');
  assert.match(w, /if \(!arenaTraceAsked\) arenaTraceLanded\(\);/, 'the door shut: nothing to wait for');
  assert.ok(w.indexOf('const arenaTraced = ') < w.indexOf('if (_arenaTemplates && params.has(\'load\')) await arenaReady'), 'the trace\'s promise made before the load waits on it');
  assert.match(w, /if \(_arenaTemplates\) for \(const a of arenaPixels\(\)\?\.stood \?\? \[\]\) if \(!locationIndex\.has\(`\$\{a\.bx\},\$\{a\.by\}`\)\) places\.push\(\{ name: a\.name, px: a\.bx, py: a\.by \}\);/);
  const modes = read('src/scenes/worldModes.js');
  assert.match(modes, /if \(isArenaPlaceId\(dir\.mapId\)\) return \[\];/);
  assert.match(modes, /const houseOwnedAt = \(b, key\) => !isEtherPlaceId\(homeTownOf\(b\)\) && !isArenaPlaceId\(homeTownOf\(b\)\) && isHouseOwned\(/);
});

// ── THE PLAYER'S OWN FILES ─────────────────────────────────────────
const ARENA = process.env.ARENA_PATH;
const ARENA2 = process.env.ARENA2_PATH;
const HAVE_BOTH = !!ARENA && existsSync(join(ARENA, 'CITYDATA.65')) && !!ARENA2 && ['TMAP00I0.IMG', 'TAMRIEL2.IMG', 'MAP.PAL', 'ART_PAL.COL', 'MAPS.BSA'].every((f) => existsSync(join(ARENA2, f)));

test('TESA2 with ARENA and ARENA2: on the player\'s own trace all 248 named places beyond the Bay stand on a pixel of their own, every one under its own point; MAPS.BSA\'s templates are 407 cities, 1200 hamlets, 1834 villages, 1500 labyrinths and 843 keeps; Winterhold stands a 6 x 7 city', { skip: HAVE_BOTH ? false : 'ARENA_PATH and ARENA2_PATH not both set' }, async () => {
  const { DFPalette } = await import('../src/formats/dfPalette.js');
  const { preloadTamrielTrace } = await import('../src/ui/tamrielTrace.js');
  const { MapsFile } = await import('../src/formats/mapsFile.js');
  const fetchBytes = async (n) => new Uint8Array(readFileSync(join(ARENA2, n)));
  const pal = new DFPalette(); pal.load(await fetchBytes('ART_PAL.COL'), 'ART_PAL.COL');
  setTamrielTrace(await preloadTamrielTrace({ fetchBytes, palette: pal }));
  setTamrielFit({ ox: 38 * 15.5, oy: 57 * 15.5, ppu: 15.5 });
  setArenaCityData(parseArenaCityData(new Uint8Array(readFileSync(join(ARENA, 'CITYDATA.65')))));
  const px = arenaPixels();
  assert.deepEqual([px.stood.length, px.unstood.length, px.byPixel.size], [248, 0, 248]);
  for (const p of px.stood) { const [x, y] = pictureToBay(p.px, p.py); assert.deepEqual([p.bx, p.by], [Math.floor(x), Math.floor(y)], p.name); }
  const maps = new MapsFile();
  maps.load(await fetchBytes('MAPS.BSA'), await fetchBytes('CLIMATE.PAK'), await fetchBytes('POLITIC.PAK'));
  const rows = [];
  for (let r = 0; r < maps.regionCount; r++) { const reg = maps.getRegion(r); if (reg) for (let i = 0; i < reg.locationCount; i++) rows.push(maps.getLocation(r, i)); }
  const t = arenaTemplates(rows);
  assert.deepEqual(Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v.length])), { 'city-state': 407, town: 1200, village: 1834, 'staff-dungeon': 1500, 'map-dungeon': 843 });
  const wh = px.stood.find((p) => p.name === 'Winterhold');
  const loc = synthesizeArenaLocation(arenaTemplateOf(t, wh), wh);
  assert.deepEqual([loc.name, loc.exterior.exteriorData.width, loc.exterior.exteriorData.height, isArenaPlaceId(loc.mapTableData.mapId)], ['Winterhold', 6, 7, true]);
});
