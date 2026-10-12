// @ts-check
// TESA6 (2026-10-12, the owner: "Do it" - the ports; bible/03-World/Arena-Provinces.md TESA6) - ARENA'S EXECUTABLE, READ
// FOR ONE LIST: which of its cities are COASTAL. Arena keeps it in A.EXE (ACD.EXE on the CD release), packed by PKLITE.
//
// THE UNPACKING is OpenTESArena's ExeUnpacker (OpenTESArena/src/Assets/ExeUnpacker.cpp, MIT - the LICENSE file's notice),
// itself after pklite_specification.md: the packed data starts 752 bytes in and ends 8 short of the file (its last word
// 0xFFFF, then the unpacked length as segment:offset); it reads 16-bit little-endian words of flags, low bit first - a 0
// a byte of data XORed with 16 less the flags read of the word, a 1 a copy whose count and the high byte of whose
// distance are prefix codes (its two tables, below) and the low byte a byte of data. The count's code 011100 is a
// special: its byte then is 0xFE (nothing), 0xFF (the end) or a count less 25.
//
// THE LIST is CityGeneration's CoastalCityList (OpenTESArena's data/exe/aExeStrings.txt and acdExeStrings.txt: 0x3FEA8 in
// A.EXE, 0x401E2 in ACD.EXE, ExeData.h's 58 bytes) - global city ids (formats/arenaCityData.js arenaGlobalCityId), and
// in both releases the city templates' names follow it at once ("town%d.mif"), which is how a file is known to be one
// the list is read from. Nothing of the file is kept but the list, and it never leaves the player's browser.

/** The count codes (pklite_specification.md 4.3.1): index i reads (i + 2) before the special at 11, (i + 1) after it. */
const COUNT_CODES = Object.freeze(['10', '11', '000', '0010', '0011', '0100', '01010', '01011', '01100', '011010', '011011',
  '011100', '0111010', '0111011', '0111100', '01111010', '01111011', '01111100', '011111010', '011111011', '011111100',
  '011111101', '011111110', '011111111']);
/** The distance's high byte codes (4.3.2): index i reads i. */
const HIGH_CODES = Object.freeze(['1', '0000', '0001', '00100', '00101', '00110', '00111', '010000', '010001', '010010', '010011',
  '010100', '010101', '010110', '0101110', '0101111', '0110000', '0110001', '0110010', '0110011', '0110100', '0110101',
  '0110110', '0110111', '0111000', '0111001', '0111010', '0111011', '0111100', '0111101', '0111110', '0111111']);
const SPECIAL = '011100';
const COUNT = new Map(COUNT_CODES.map((c, i) => [c, i < 11 ? i + 2 : i + 1]));
const HIGH = new Map(HIGH_CODES.map((c, i) => [c, i]));
/** Where the packed data starts. */
export const PKLITE_DATA_START = 752;

/**
 * A PKLITE-packed executable unpacked - OpenTESArena's ExeUnpacker::init, law for law - or null for a file that is not
 * one (its last word not 0xFFFF, a code no table holds, a read past either end).
 * @param {Uint8Array} src
 * @returns {Uint8Array | null}
 */
export function unpackArenaExe(src) {
  if (!src || src.length < PKLITE_DATA_START + 12) return null;
  const le16 = (o) => src[o] | (src[o + 1] << 8);
  const end = src.length - 8;
  if (le16(end - 2) !== 0xffff) return null;
  const out = new Uint8Array(le16(end) * 16 + le16(end + 2));
  let at = PKLITE_DATA_START, word = le16(at), read = 0, n = 0;
  at += 2;
  const byte = () => { if (at >= end) throw new RangeError('past the data'); return src[at++]; };
  const bit = () => {
    const b = (word >> read) & 1;
    if (++read === 16) { read = 0; word = byte() | (byte() << 8); }
    return b;
  };
  const code = (table) => {
    let c = '';
    for (;;) { c += bit() ? '1' : '0'; if (table.has(c)) return c; if (c.length > 9) throw new RangeError('no such code'); }
  };
  try {
    for (;;) {
      if (!bit()) {
        if (n >= out.length) return null;
        out[n++] = byte() ^ (16 - read);
        continue;
      }
      const c = code(COUNT);
      let count = COUNT.get(c);
      if (c === SPECIAL) {
        const e = byte();
        if (e === 0xfe) continue;
        if (e === 0xff) break;
        count = e + 25;
      }
      const high = count !== 2 ? HIGH.get(code(HIGH)) : 0;
      const back = byte() | (high << 8);
      if (back < 1 || back > n || n + count > out.length) return null;
      for (let i = 0; i < count; i++, n++) out[n] = out[n - back];
    }
  } catch { return null; }
  return out;
}

/** The coastal list's offset in each release's unpacked executable (OpenTESArena's address maps). */
export const ARENA_COASTAL_AT = Object.freeze({ 'A.EXE': 0x3fea8, 'ACD.EXE': 0x401e2 });
/** How many ids the list holds (ExeData.h coastalCityList[58]). */
export const COASTAL_CITY_COUNT = 58;
/** What follows the list in both releases - the city templates' first name. */
const TEMPLATE_HEAD = 'town%d.mif\0';

/**
 * THE COASTAL LIST of an unpacked executable: its 58 global city ids, from whichever release's offset has the city
 * templates' names straight after it - or null.
 * @param {Uint8Array | null} exe
 * @returns {Uint8Array | null}
 */
export function arenaCoastalCities(exe) {
  if (!exe) return null;
  for (const at of Object.values(ARENA_COASTAL_AT)) {
    const head = at + COASTAL_CITY_COUNT;
    if (head + TEMPLATE_HEAD.length > exe.length) continue;
    let ok = true;
    for (let i = 0; i < TEMPLATE_HEAD.length && ok; i++) ok = exe[head + i] === TEMPLATE_HEAD.charCodeAt(i);
    if (ok) return exe.slice(at, head);
  }
  return null;
}
