// TESA6 (2026-10-12, the owner: "Do it" - the ports; bible/03-World/Arena-Provinces.md TESA6) - ARENA'S COASTAL CITIES
// ARE PORTS, pinned. A.EXE (ACD.EXE on the CD) unpacked (formats/arenaExe.js, OpenTESArena's ExeUnpacker) for its
// coastal list; a coastal city stands on its own province's shore (world/arenaPlaces.js standArenaPixels) and its clone
// answers a harbour (world/arenaLocations.js); the room knows the list by its print; the store keeps the executable and
// the card reads it; the host's ports past the Bay answer as the Etheric Sea's do.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

import { unpackArenaExe, arenaCoastalCities, ARENA_COASTAL_AT, COASTAL_CITY_COUNT, PKLITE_DATA_START } from '../src/formats/arenaExe.js';
import { parseArenaCityData, CITYDATA_BYTES, PROVINCE_BYTES, LOCATION_BYTES, arenaGlobalCityId } from '../src/formats/arenaCityData.js';
import {
  SHORE_REACH, pictureSea, standArenaPixels, placeArenaLocations, setArenaCityData, setArenaCoastal, arenaCoastal, arenaCoastalKnown,
  ARENA_COASTAL_PRINTS, isKnownCoastalPrint, arenaCityDataPrint, arenaPixels, arenaPlacesVersion, setArenaRoom,
} from '../src/world/arenaPlaces.js';
import { synthesizeArenaLocation } from '../src/world/arenaLocations.js';
import { setTamrielTrace, tamrielTrace } from '../src/world/tamrielLand.js';
import { setTamrielFit, inBay, pictureToBay } from '../src/world/tamrielFrame.js';
import { ARENA_FILES, ARENA_EXES, isArenaFile, registerArenaData, arenaCoastAttached, arenaCoastKnown } from '../src/scenes/dataSource.js';
import { arenaCard, ARENA_PORT_WORDS, ARENA_DATA_WORDS } from '../src/ui/enhancedMenu.js';
import { LOCATION_TYPES } from '../src/formats/mapsFile.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
afterEach(() => { setTamrielTrace(null); setTamrielFit(null); setArenaCityData(null); setArenaCoastal(null); setArenaRoom(false); });

// ── THE UNPACKING ───────────────────────────────────────────────

/** pklite_specification.md's two tables, restated here: the decoder is held to the spec, not to itself. */
const COUNT_SPEC = ['10', '11', '000', '0010', '0011', '0100', '01010', '01011', '01100', '011010', '011011', '011100', '0111010',
  '0111011', '0111100', '01111010', '01111011', '01111100', '011111010', '011111011', '011111100', '011111101', '011111110', '011111111'];
const HIGH_SPEC = ['1', '0000', '0001', '00100', '00101', '00110', '00111', '010000', '010001', '010010', '010011', '010100', '010101',
  '010110', '0101110', '0101111', '0110000', '0110001', '0110010', '0110011', '0110100', '0110101', '0110110', '0110111', '0111000',
  '0111001', '0111010', '0111011', '0111100', '0111101', '0111110', '0111111'];
/** A PKLITE stream made from ops: { lit }, { copy, back } (a count and a distance), { skip } (the 0xFE special). */
function pklite(ops, outLen, { lastWord = 0xffff } = {}) {
  const data = [0, 0];
  let slot = 0, bits = 0, word = 0;
  const flush = () => { data[slot] = word & 0xff; data[slot + 1] = word >> 8; };
  const bit = (b) => { if (b) word |= 1 << bits; if (++bits === 16) { flush(); slot = data.length; data.push(0, 0); bits = 0; word = 0; } };
  const code = (s) => { for (const c of s) bit(c === '1' ? 1 : 0); };
  const byte = (v) => data.push(v & 0xff);
  for (const op of ops) {
    if ('lit' in op) { bit(0); byte(op.lit ^ (16 - bits)); continue; }
    bit(1);
    if (op.skip) { code('011100'); byte(0xfe); continue; }
    if (op.copy >= 25) { code('011100'); byte(op.copy - 25); } else code(COUNT_SPEC[op.copy <= 12 ? op.copy - 2 : op.copy - 1]);
    if (op.copy !== 2) code(HIGH_SPEC[op.back >> 8]);
    byte(op.back & 0xff);
  }
  bit(1); code('011100'); byte(0xff);
  flush();
  const seg = outLen >> 4, off = outLen & 15;
  return Uint8Array.from([...new Array(PKLITE_DATA_START).fill(0), ...data, lastWord & 0xff, lastWord >> 8, seg & 0xff, seg >> 8, off & 0xff, off >> 8, 0, 0, 0, 0]);
}
/** What the ops unpack to. */
function expand(ops) {
  const out = [];
  for (const op of ops) {
    if ('lit' in op) out.push(op.lit);
    else if (!op.skip) for (let i = 0; i < op.copy; i++) out.push(out[out.length - op.back]);
  }
  return Uint8Array.from(out);
}

test('TESA6 the unpacking: a byte of data XORed with 16 less the flags read of its word, a copy whose count and high byte are the spec\'s prefix codes - a count of 2 its distance one byte, the special\'s byte a long count, 0xFE nothing, 0xFF the end - into the length the trailer gives (mutant: the key, a table, the special, the high byte)', () => {
  const ops = [];
  for (let i = 0; i < 320; i++) ops.push({ lit: (i * 37 + 11) & 0xff });
  ops.push({ copy: 2, back: 2 }, { copy: 5, back: 300 }, { skip: true }, { copy: 13, back: 9 }, { copy: 24, back: 260 }, { copy: 40, back: 7 }, { copy: 3, back: 1 });
  for (let i = 0; i < 40; i++) ops.push({ lit: (i * 5) & 0xff });
  for (const n of [2, 4, 11, 12, 14, 23]) ops.push({ copy: n, back: 17 });
  const want = expand(ops);
  assert.deepEqual(unpackArenaExe(pklite(ops, want.length)), want);
});

test('TESA6 the unpacking refuses: a last word not 0xFFFF, a read past the data, a copy past the unpacked length or before its start; and a file too short to be one (mutant: the last word, the bounds)', () => {
  const ops = [{ lit: 1 }, { lit: 2 }, { lit: 3 }, { copy: 3, back: 3 }];
  const want = expand(ops);
  const good = pklite(ops, want.length);
  assert.deepEqual(unpackArenaExe(good), want);
  assert.equal(unpackArenaExe(pklite(ops, want.length, { lastWord: 0xfffe })), null);
  assert.equal(unpackArenaExe(pklite(ops, want.length - 1)), null, 'more than the trailer says');
  assert.equal(unpackArenaExe(pklite([{ lit: 1 }, { lit: 2 }], 1)), null, 'a byte of data past it');
  assert.equal(unpackArenaExe(pklite([{ lit: 1 }, { copy: 3, back: 2 }], 4)), null, 'a distance before the start');
  const cut = Uint8Array.from([...good.slice(0, PKLITE_DATA_START + 3), 0xff, 0xff, 0, 0, 4, 0, 0, 0, 0, 0]);
  assert.equal(unpackArenaExe(cut), null, 'the data ends before its end code');
  assert.equal(unpackArenaExe(new Uint8Array(100)), null);
  assert.equal(unpackArenaExe(null), null);
});

test('TESA6 the coastal list: the 58 ids at either release\'s offset - A.EXE\'s 0x3FEA8, ACD.EXE\'s 0x401E2 - where the city templates\' names follow at once; anything else none (mutant: an offset, the template\'s check, the count)', () => {
  assert.deepEqual(ARENA_COASTAL_AT, { 'A.EXE': 0x3fea8, 'ACD.EXE': 0x401e2 });
  assert.equal(COASTAL_CITY_COUNT, 58);
  const list = Uint8Array.from({ length: 58 }, (_, i) => i * 4);
  const exe = (at, head = 'town%d.mif\0townw%d.mif') => {
    const b = new Uint8Array(0x40300);
    b.set(list, at);
    for (let i = 0; i < head.length; i++) b[at + 58 + i] = head.charCodeAt(i);
    return b;
  };
  assert.deepEqual(arenaCoastalCities(exe(0x3fea8)), list, 'the floppy release');
  assert.deepEqual(arenaCoastalCities(exe(0x401e2)), list, 'the CD release');
  assert.equal(arenaCoastalCities(exe(0x3fea8, 'town%d.mix')), null, 'not the templates');
  assert.equal(arenaCoastalCities(exe(0x3fea0)), null, 'not at either offset');
  assert.equal(arenaCoastalCities(new Uint8Array(0x3fea8 + 60)), null, 'too short for its names');
  assert.equal(arenaCoastalCities(null), null);
});

// ── THE PLACEMENT ───────────────────────────────────────────────

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
// Skyrim (Arena's province 2, the trace's 3) on a block of land from picture (110, 20) to (210, 80); High Rock's beside it
const SKYRIM = { name: 'Skyrim', rect: { x: 112, y: 22, w: 94, h: 53 }, places: {
  0: { name: 'Solitude', x: 112, y: 30 },      // a city-state well inside the north coast
  1: { name: 'Windhelm', x: 200, y: 100 },     // inland, not on the list
  33: { name: 'Fortress of Ice', x: 113, y: 31 },   // a dungeon: never a port, whatever the list says
} };
const setUp = () => {
  setTamrielFit({ ox: 400, oy: 500, ppu: 10 });
  setTamrielTrace(rectTrace([[3, 110, 20, 210, 80], [1, 210, 20, 230, 80]]));
  return placeArenaLocations(parseArenaCityData(mintCityData([null, null, SKYRIM])), tamrielTrace());
};

test('TESA6 the shore: a coastal city stands on the nearest pixel of its own province\'s land beside the picture\'s sea - straight to the coast - and is a port; a city off the list, and a dungeon whatever the list says, stand as before; the sea is the picture\'s, never another province\'s land (mutant: the list read, the city\'s id, the sea, the own land, the reach)', () => {
  assert.equal(SHORE_REACH, 320);
  const model = setUp();
  const plain = standArenaPixels(model, tamrielTrace());
  const sol = plain.stood.find((p) => p.name === 'Solitude');
  assert.equal(sol.port, undefined, 'no list: no port');
  const coast = [arenaGlobalCityId(0, 2), arenaGlobalCityId(33, 2)];
  const withList = standArenaPixels(model, tamrielTrace(), coast);
  const port = withList.stood.find((p) => p.name === 'Solitude');
  assert.equal(port.port, true);
  const [x] = pictureToBay(model.places.find((p) => p.name === 'Solitude').px, 0);
  assert.equal(port.by, -300, 'north to the coast, the land\'s first row (picture 20 is Bay -300)');
  assert.ok(Math.abs(port.bx + 0.5 - x) <= 0.5 && Math.abs(port.bx - sol.bx) <= 1, `straight north - the centre nearest its own x (${port.bx}, ${x})`);
  assert.ok(pictureSea(tamrielTrace(), port.bx, port.by - 1) && !pictureSea(tamrielTrace(), port.bx, port.by));
  const keep = (n) => [withList, plain].map((s) => s.stood.find((p) => p.name === n)).map((p) => [p.bx, p.by, p.port]);
  assert.deepEqual(keep('Windhelm')[0], keep('Windhelm')[1], 'off the list');
  assert.deepEqual(keep('Fortress of Ice')[0], keep('Fortress of Ice')[1], 'a dungeon is no port');
  assert.ok(!withList.stood.some((p) => p.name === 'Fortress of Ice' && p.port));
  // the east edge is High Rock's land, not the sea: a coastal city there goes to Skyrim's own coast, never across
  const east = placeArenaLocations(parseArenaCityData(mintCityData([null, null, { ...SKYRIM, places: { 0: { name: 'Eastmarch', x: 318, y: 100 } } }])), tamrielTrace());
  const e = standArenaPixels(east, tamrielTrace(), coast).stood[0];
  assert.equal(e.port, true);
  assert.ok(e.bx < 1700, `onto Skyrim's coast, not at High Rock's border (${e.bx}, ${e.by})`);
  assert.ok(!inBay(e.bx, e.by));
  // out of reach: all land, the city in its middle - the picture's edge (off it is the sea) 480 pixels off at the nearest
  setTamrielTrace(rectTrace([[3, 0, 0, 320, 200]]));
  const mid = { ...SKYRIM, places: { 0: { name: 'Solitude', x: 160, y: 100 } } };
  const all = standArenaPixels(placeArenaLocations(parseArenaCityData(mintCityData([null, null, mid])), tamrielTrace()), tamrielTrace(), coast);
  assert.equal(all.stood.length, 1);
  assert.ok(all.stood.every((p) => !p.port), 'no shore within SHORE_REACH');
});

test('TESA6 the clone: a port answers a harbour (portTownAndUnknown 1) and says so in `arena`; any other place none (mutant: the byte, the flag)', () => {
  const tpl = { name: 'T', regionIndex: 17, regionName: 'R', politic: 145, mapTableData: { mapId: 40, locationType: LOCATION_TYPES.TownCity }, exterior: { exteriorData: { width: 6, height: 7, locationId: 40, mapId: 40, portTownAndUnknown: 0 }, buildings: [] } };
  const place = { province: 'Skyrim', provinceIndex: 2, id: 0, kind: 'city-state', name: 'Solitude', bx: 1049, by: -300 };
  const port = synthesizeArenaLocation(tpl, { ...place, port: true });
  assert.equal(port.exterior.exteriorData.portTownAndUnknown, 1);
  assert.equal(port.arena.port, true);
  const not = synthesizeArenaLocation({ ...tpl, exterior: { ...tpl.exterior, exteriorData: { ...tpl.exterior.exteriorData, portTownAndUnknown: 1 } } }, place);
  assert.equal(not.exterior.exteriorData.portTownAndUnknown, 0, 'never the template\'s');
  assert.equal(not.arena.port, false);
});

test('TESA6 the installed list and the room: 58 ids or none; its print the list\'s SHA-256; the pixels stand it at once; online a room stands places only from a known release AND a known list - its version moving on each install (mutant: the length, the print, the gate, the version)', async () => {
  setUp();
  setArenaCityData(parseArenaCityData(mintCityData([null, null, SKYRIM])), { known: true });
  const v = arenaPlacesVersion();
  setArenaCoastal(new Uint8Array(57), { known: true });
  assert.deepEqual([arenaCoastal(), arenaCoastalKnown(), arenaPlacesVersion()], [null, false, v + 1], 'not a list');
  const list = new Uint8Array(58); list[0] = arenaGlobalCityId(0, 2);
  assert.equal(arenaPixels().stood.find((p) => p.name === 'Solitude').port, undefined);
  setArenaCoastal(list);
  assert.deepEqual([arenaCoastal(), arenaCoastalKnown()], [list, false]);
  assert.equal(arenaPixels().stood.find((p) => p.name === 'Solitude').port, true, 'the pixels stand the list at once');
  assert.deepEqual(ARENA_COASTAL_PRINTS, ['50624be2a679f8098d9ef71f5b8dfec4aa11edd80c9e431b89003ae538ff5e1e']);
  assert.equal(await arenaCityDataPrint(list), createHash('sha256').update(list).digest('hex'));
  assert.equal(isKnownCoastalPrint(ARENA_COASTAL_PRINTS[0]), true);
  assert.equal(isKnownCoastalPrint(await arenaCityDataPrint(list)), false);
  setArenaRoom(true);
  assert.equal(arenaPixels(), null, 'online: a list the room does not know stands no places');
  setArenaCoastal(list, { known: true });
  assert.equal(arenaPixels()?.stood.length, 3, 'a known release and a known list');
  setArenaCoastal(null, { known: true });
  assert.equal(arenaCoastalKnown(), false, 'no list is never known');
});

test('TESA6 the store and the card: the folder keeps A.EXE and ACD.EXE beside CITYDATA.65; the registration reads the first that holds a list, prints the LIST, installs it; no IndexedDB, none; the card\'s Ports row once data is attached - none, known, not known (mutant: the files, a reading)', async () => {
  assert.deepEqual(ARENA_EXES, ['A.EXE', 'ACD.EXE']);
  assert.deepEqual(ARENA_FILES, ['CITYDATA.65', 'A.EXE', 'ACD.EXE']);
  assert.deepEqual(['a.exe', 'ARENA/ACD.EXE', 'AEXE', 'A.EXE.BAK'].map(isArenaFile), [true, true, false, false]);
  const ds = read('src/scenes/dataSource.js');
  assert.match(ds, /for \(const name of ARENA_EXES\) \{\n\s+let exe = null;\n\s+try \{ exe = await loadArenaFile\(name\); \} catch \{ exe = null; \}\n\s+coast = exe \? arenaCoastalCities\(unpackArenaExe\(exe\)\) : null;\n\s+if \(coast\) break;\n\s+\}/);
  assert.match(ds, /const coastKnown = coast \? isKnownCoastalPrint\(await arenaCityDataPrint\(coast\)\) : false;\n\s+setArenaCoastal\(coast, \{ known: coastKnown \}\);/, 'the list\'s print, never the file\'s');
  assert.match(ds, /setArenaCityData\(null\);\n\s+setArenaCoastal\(null\);/, 'Remove takes the ports too');
  setArenaCoastal(new Uint8Array(58), { known: true });
  await registerArenaData();
  assert.deepEqual([arenaCoastAttached(), arenaCoastKnown(), arenaCoastal()], [false, false, null], 'no IndexedDB: none');
  assert.deepEqual(ARENA_PORT_WORDS, { none: 'no A.EXE attached - no ports, and online no places', known: 'A.EXE attached - its coastal cities are ports', unknown: 'A.EXE attached - not a list a room knows: its ports stand offline alone' });
  const mk = (tag) => {
    const n = { tag, children: [], className: '', _text: '',
      get textContent() { return n._text + n.children.map((c) => c.textContent).join(''); },
      set textContent(v) { n._text = String(v); n.children.length = 0; },
      append(...cs) { for (const c of cs) n.children.push(c); }, setAttribute() {} };
    return n;
  };
  const kids = (n, tag) => n.children.filter((c) => c.tag === tag);
  const prev = globalThis.document;
  globalThis.document = { createElement: mk };
  try {
    const rows = (o) => { const [dl] = kids(arenaCard(o), 'dl'); return Object.fromEntries(kids(dl, 'dt').map((dt, i) => [dt.textContent, kids(dl, 'dd')[i].textContent])); };
    assert.deepEqual(rows({ attached: false, known: false, coast: true, coastKnown: true }), { Data: ARENA_DATA_WORDS.none }, 'no data: no ports row');
    assert.deepEqual(rows({ attached: true, known: true, coast: false, coastKnown: false }), { Data: ARENA_DATA_WORDS.known, Ports: ARENA_PORT_WORDS.none });
    assert.deepEqual(rows({ attached: true, known: true, coast: true, coastKnown: true }), { Data: ARENA_DATA_WORDS.known, Ports: ARENA_PORT_WORDS.known });
    assert.deepEqual(rows({ attached: true, known: true, coast: true, coastKnown: false }), { Data: ARENA_DATA_WORDS.known, Ports: ARENA_PORT_WORDS.unknown });
  } finally { globalThis.document = prev; }
});

test('TESA6 the host: an Arena port past the Bay answers where the Bay\'s ports are asked - Come Sail Away\'s port town, the naval host\'s port (no crown, the pixel\'s region), the harbour book\'s town, the nearest port\'s name and way, the waters\' port distance - and a city made a port is cloned again and built again (mutant: an arm, the crown, the clone\'s check, the sweep)', () => {
  const w = read('src/scenes/world.js');
  assert.match(w, /const arenaPorts = \(\) => \(_arenaTemplates \? arenaPixels\(\)\?\.stood\.filter\(\(q\) => q\.port\) \?\? \[\] : \[\]\);/);
  assert.match(w, /const arenaPortAt = \(x, y\) => \{ if \(!_arenaTemplates \|\| onTheBay\(x, y\)\) return null; const q = arenaPlaceOnPixel\(x, y\); return q\?\.port \? q : null; \};/);
  assert.match(w, /const arenaPortOf = \(q\) => \(\{ key: `\$\{q\.bx\},\$\{q\.by\}`, name: q\.name, px: q\.bx, py: q\.by, region: maps\.getRegionIndexAt\(q\.bx, q\.by\), crown: null \}\);/);
  assert.match(w, /if \(etherSea && inEther\(x, y\)\) return !!etherPortAt\(x, y\);[^\n]*\n\s+if \(!onTheBay\(x, y\)\) return !!arenaPortAt\(x, y\);/, 'Come Sail Away\'s port town (and with it navalNearPort)');
  assert.match(w, /if \(!onTheBay\(p\.x, p\.y\)\) \{   \/\/ TESA6: an Arena port past the Bay\n\s+const q = arenaPortNear\(p\.x, p\.y\);\n\s+_navalPortHereAt = \{ key, port: q \? arenaPortOf\(q\) : null \};/, 'the naval host\'s port here');
  assert.match(w, /const aq = !isle && !onTheBay\(p\.x, p\.y\) \? arenaPortNear\(p\.x, p\.y\) : null;[^\n]*\n\s+const aloc = aq \? capitalLocationAt\(aq\.bx, aq\.by\) \|\| arenaLocationAt\(aq\.bx, aq\.by\) : null;[^\n]*\n(?:\s+\/\/[^\n]*\n)*\s+if \(aloc\?\.exterior\?\.exteriorData\) town = \{ id: maskMapId\(aloc\.mapTableData\?\.mapId \?\? 0\), loc: aloc, x: aq\.bx, y: aq\.by, name: aq\.name \};/, 'PIN MOVED (AUDIT-TESA A4-F2/F3): the harbour book - a capital\'s own, keyed by its map id');
  assert.match(w, /for \(const q of arenaPorts\(\)\) \{ const d = Math\.hypot\(q\.bx - here\.x, q\.by - here\.y\); if \(d < nd\) \{ nd = d; near = q; \} \}/, 'the nearest port past the Bay');
  assert.match(w, /for \(const q of arenaPorts\(\)\) d = Math\.min\(d, Math\.max\(Math\.abs\(q\.bx - p\.x\), Math\.abs\(q\.by - p\.y\)\)\);/, 'the waters\' port distance');
  assert.match(w, /had\.arena\.id === place\.id && had\.arena\.port === !!place\.port\) return had;/);
  assert.match(w, /`\$\{place\.provinceIndex\}\|\$\{place\.id\}\|\$\{!!place\.port\}`/);
});

const ARENA = process.env.ARENA_PATH, ARENA2 = process.env.ARENA2_PATH;
test('TESA6 with ARENA: the player\'s own A.EXE unpacks and its list is the one a room knows', { skip: ARENA && existsSync(join(ARENA, 'A.EXE')) ? false : 'ARENA_PATH not set' }, async () => {
  const list = arenaCoastalCities(unpackArenaExe(new Uint8Array(readFileSync(join(ARENA, 'A.EXE')))));
  assert.equal(list?.length, 58);
  assert.equal(isKnownCoastalPrint(await arenaCityDataPrint(list)), true);
});

const HAVE = !!ARENA && !!ARENA2 && ['TMAP00I0.IMG', 'TAMRIEL2.IMG', 'ART_PAL.COL', 'WOODS.WLD'].every((f) => existsSync(join(ARENA2, f))) && ['CITYDATA.65', 'A.EXE'].every((f) => existsSync(join(ARENA, f)));
test('TESA6 with ARENA2 and ARENA: all 248 places still stand, 51 of them ports, each beside the ground\'s sea', { skip: HAVE ? false : 'ARENA2_PATH and ARENA_PATH not set' }, async () => {
  const { DFPalette } = await import('../src/formats/dfPalette.js');
  const { preloadTamrielTrace } = await import('../src/ui/tamrielTrace.js');
  const { WoodsFile } = await import('../src/formats/woodsFile.js');
  const { groundWoods } = await import('../src/world/tamrielGround.js');
  const { WATER_BYTE } = await import('../src/world/roadsProducer.js');
  const bytes = (n) => new Uint8Array(readFileSync(join(ARENA2, n)));
  const pal = new DFPalette(); pal.load(bytes('ART_PAL.COL'), 'ART_PAL.COL');
  setTamrielTrace(await preloadTamrielTrace({ fetchBytes: async (n) => bytes(n), palette: pal }));
  setTamrielFit({ ox: 38 * 15.5, oy: 57 * 15.5, ppu: 15.5 });
  setArenaCityData(parseArenaCityData(new Uint8Array(readFileSync(join(ARENA, 'CITYDATA.65')))));
  setArenaCoastal(arenaCoastalCities(unpackArenaExe(new Uint8Array(readFileSync(join(ARENA, 'A.EXE'))))), { known: true });
  const woods = new WoodsFile(); woods.load(bytes('WOODS.WLD'));
  const g = groundWoods(woods);
  const px = arenaPixels();
  const ports = px.stood.filter((p) => p.port);
  assert.deepEqual([px.stood.length, px.unstood.length, ports.length], [248, 0, 51]);
  for (const p of ports) {
    assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([dx, dy]) => g.getHeightMapValue(p.bx + dx, p.by + dy) <= WATER_BYTE), `${p.name}: the sea beside it`);
  }
});
