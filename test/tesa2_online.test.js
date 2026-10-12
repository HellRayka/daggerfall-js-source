// TESA-ONLINE (2026-10-12, the owner: "yes online support for everything", then, asked how a room should agree on Arena's
// places: "Whatever is best and doesnt get us in legal trouble"; bible/03-World/Arena-Provinces.md TESA-ONLINE) - ARENA'S
// PLACES ONLINE, pinned. Nothing of Arena ships or crosses the wire: each player's places are their own copy's. Online they
// stand only from a CITYDATA.65 whose SHA-256 is a release the room knows, so every player in a room who has Arena stands
// the same Tamriel; a player without it is told once, on the land past the Bay, what the players beside them may see.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

import { parseArenaCityData, CITYDATA_BYTES, PROVINCE_BYTES, LOCATION_BYTES } from '../src/formats/arenaCityData.js';
import {
  ARENA_CITYDATA_PRINTS, arenaCityDataPrint, isKnownArenaPrint, setArenaCityData, arenaCityDataKnown, setArenaRoom, arenaRoom,
  arenaPixels, arenaPlacesVersion, setArenaStanding, setArenaCoastal,
} from '../src/world/arenaPlaces.js';
import { arenaPlaceId, ARENA_PLACES_TEXT } from '../src/world/arenaLocations.js';
import { setTamrielTrace } from '../src/world/tamrielLand.js';
import { setTamrielFit } from '../src/world/tamrielFrame.js';
import { registerArenaData, arenaDataKnown } from '../src/scenes/dataSource.js';
import { arenaCard, ARENA_DATA_WORDS } from '../src/ui/enhancedMenu.js';
import { isWorldRoom } from '../src/net/wire.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
afterEach(() => { setTamrielTrace(null); setTamrielFit(null); setArenaCityData(null); setArenaCoastal(null); setArenaRoom(false); setArenaStanding(false); });

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
const SKYRIM = [null, null, { name: 'Skyrim', rect: { x: 112, y: 22, w: 94, h: 53 }, places: { 0: { name: 'Solitude', x: 112, y: 8 } } }];

test('TESA-ONLINE the print: a file\'s SHA-256 in lowercase hex, the room\'s releases one list - Bethesda\'s CITYDATA.65, the 2004 freeware and a 1996 install alike (mutant: the list, the hex)', async () => {
  assert.deepEqual(ARENA_CITYDATA_PRINTS, ['db2dd184d96e7fb8df052d8e157b2bf2f15ccf6e37e53d8a943f0dd9a7ed5ab2']);
  assert.ok(Object.isFrozen(ARENA_CITYDATA_PRINTS));
  const bytes = mintCityData(SKYRIM);
  assert.equal(await arenaCityDataPrint(bytes), createHash('sha256').update(bytes).digest('hex'));
  assert.equal(await arenaCityDataPrint(new Uint8Array([0, 15, 255])), createHash('sha256').update(Buffer.from([0, 15, 255])).digest('hex'), 'every byte two digits');
  assert.equal(isKnownArenaPrint(ARENA_CITYDATA_PRINTS[0]), true);
  assert.equal(isKnownArenaPrint(await arenaCityDataPrint(bytes)), false, 'a file of the right shape is not therefore the room\'s');
  assert.equal(isKnownArenaPrint(ARENA_CITYDATA_PRINTS[0].toUpperCase()), false);
});

test('TESA-ONLINE the room: online, places stand only from a known release - an unknown copy keeps its map and stands none; offline any copy stands; the room\'s word moves the version once (mutant: the gate, the known flag, the switch)', () => {
  setTamrielFit({ ox: 400, oy: 500, ppu: 10 });
  setTamrielTrace(rectTrace([[3, 110, 20, 210, 80]]));
  const cd = parseArenaCityData(mintCityData(SKYRIM));
  setArenaCityData(cd);
  assert.equal(arenaCityDataKnown(), false, 'unknown unless said');
  assert.equal(arenaPixels()?.stood.length, 1, 'offline: the player\'s own copy, whatever it is');
  const v = arenaPlacesVersion();
  setArenaRoom(true); setArenaRoom(true);
  assert.deepEqual([arenaRoom(), arenaPlacesVersion()], [true, v + 1]);
  assert.equal(arenaPixels(), null, 'online: not a release the room knows - none stands');
  setArenaCityData(cd, { known: true });
  assert.equal(arenaCityDataKnown(), true);
  // PIN MOVED (TESA6, tesa6_ports): the coastal list moves places, so a room knows it too
  assert.equal(arenaPixels(), null, 'online: a known release with no coastal list a room knows - none stands');
  setArenaCoastal(new Uint8Array(58), { known: true });
  assert.equal(arenaPixels()?.stood.length, 1, 'online: a known release stands, the same for every player who has it');
  setArenaCityData(null, { known: true });
  assert.equal(arenaCityDataKnown(), false, 'no data is never known');
});

test('TESA-ONLINE the registration and the card: no IndexedDB, nothing known; the card reads the release - known, not known (offline alone), none (mutant: a reading)', async () => {
  assert.equal(await registerArenaData(), 0);
  assert.equal(arenaDataKnown(), false);
  assert.deepEqual(ARENA_DATA_WORDS, { none: 'none attached', known: 'CITYDATA.65 attached', unknown: 'CITYDATA.65 attached - not a release a room knows: its places stand offline alone' });
  const ds = read('src/scenes/dataSource.js');
  assert.match(ds, /const known = cityData \? isKnownArenaPrint\(await arenaCityDataPrint\(bytes\)\) : false;\n\s+setArenaCityData\(cityData, \{ known \}\);/);
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
    for (const [attached, known, words] of [[false, false, ARENA_DATA_WORDS.none], [true, true, ARENA_DATA_WORDS.known], [true, false, ARENA_DATA_WORDS.unknown]]) {
      const [dl] = kids(arenaCard({ attached, known }), 'dl');
      assert.equal(kids(dl, 'dd')[0].textContent, words);
    }
  } finally { globalThis.document = prev; }
});

test('TESA-ONLINE the host: the places stand online and off, the room\'s word given at the mount; a player who stands none is told once, crossing onto the land past the Bay - never at sea, on the Bay or past the Veil; an Arena dungeon\'s and building\'s rooms are rooms the relay admits (mutant: the notice\'s gates, its once)', () => {
  const w = read('src/scenes/world.js');
  assert.match(w, /const arenaStands = tamrielLand && arenaPlacesOn\(\);\n\s+setArenaRoom\(params\.has\('online'\)\);\n\s+setArenaStanding\(arenaStands\);/);
  assert.doesNotMatch(w, /arenaStands = [^\n]*params\.has\('online'\)/, 'online is not refused');
  const fn = w.slice(w.indexOf('  function arenaBeyondNotice(x, y) {'), w.indexOf('  /** AUDIT OW4 D4: THE CLONE a pixel\'s spawn IS'));
  assert.match(fn, /if \(_arenaNoticed \|\| !_arenaTemplates \|\| !params\.has\('online'\) \|\| onTheBay\(x, y\) \|\| \(etherSea && inEther\(x, y\)\)\) return;/);
  assert.match(fn, /if \(arenaPixels\(\) \|\| maps\.getClimateIndex\(x, y\) === CLIMATES\.Ocean\) return;\n\s+_arenaNoticed = true;\n\s+tvSay\(ARENA_PLACES_TEXT\.beyondWithout, 8\);/);
  assert.match(w, /ohAbyss\?\.onMapPixelChanged\(\);[^\n]*\n\s+arenaBeyondNotice\(r\.current\.x, r\.current\.y\);/, 'on the crossing, after PlayerGPS.OnMapPixelChanged\'s own hearers');
  assert.equal(ARENA_PLACES_TEXT.beyondWithout, 'Players with The Elder Scrolls: Arena attached see its cities and dungeons in these lands. Attach your own copy (free from Bethesda) in Mods & files.');
  const id = arenaPlaceId({ provinceIndex: 7, id: 33 });
  assert.equal(isWorldRoom(`dungeon:m${id}`), true, 'an Arena dungeon is one room for every player in it');
  assert.equal(isWorldRoom(`interior:m${id}.12`), true, 'and an Arena building');
});

const ARENA = process.env.ARENA_PATH;
test('TESA-ONLINE with ARENA: the player\'s own CITYDATA.65 is the release the room knows', { skip: ARENA && existsSync(join(ARENA, 'CITYDATA.65')) ? false : 'ARENA_PATH not set' }, async () => {
  const bytes = new Uint8Array(readFileSync(join(ARENA, 'CITYDATA.65')));
  assert.equal(isKnownArenaPrint(await arenaCityDataPrint(bytes)), true);
});
