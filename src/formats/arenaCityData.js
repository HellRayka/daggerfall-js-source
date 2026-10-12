// CITYDATA.65 reader - The Elder Scrolls: Arena's world map (TESA1, bible/03-World/Arena-Provinces.md).
// A translation of OpenTESArena's CityDataFile (Assets/CityDataFile.cpp, MIT, The OpenTESArena Developers) and the
// location laws beside it (WorldMap/ArenaLocationUtils.cpp). Arena is not Daggerfall and DFU has no reader for it:
// OpenTESArena is to Arena what DFU is to Daggerfall, and its constants are kept byte-exact here.
//
// The file is nine provinces of PROVINCE_BYTES each, in Arena's order (High Rock, Hammerfell, Skyrim, Morrowind,
// Summurset Isle, Valenwood, Elsweyr, Black Marsh, the Imperial Province last). A province is its name (NAME_BYTES,
// null-terminated), its rectangle on the 320 x 200 world map (four u16), and LOCATIONS_PER_PROVINCE locations of
// LOCATION_BYTES: a name, a point on the province's OWN 320 x 200 map (two u16) and a visibility byte. CITYDATA.65 is
// the template a new character starts from (BinaryAssetLibrary::initWorldMapDefs reads it); the .0x files are a
// save's copy, whose random dungeons carry the names that save rolled.

export const PROVINCE_COUNT = 9;
export const PROVINCE_BYTES = 1228;
export const NAME_BYTES = 20;
export const LOCATION_BYTES = 25;
export const LOCATIONS_PER_PROVINCE = 48;
export const CITYDATA_BYTES = PROVINCE_COUNT * PROVINCE_BYTES;
/** The center province: one city, the rest of its slots zeroed (CityDataFile.h). */
export const IMPERIAL_PROVINCE = 8;

/** A location's kind by its id within the province (ArenaProvinceData::getLocationData, ArenaLocationUtils::getCityType):
 *  0-7 the city-states, 8-15 the towns, 16-31 the villages, 32 the staff dungeon, 33 the staff map dungeon (listed in
 *  that order - "the second dungeon is listed first"), 34-47 the random dungeons (fixed places, a name each save rolls). */
export function arenaLocationKind(locationId) {
  if (locationId < 8) return 'city-state';
  if (locationId < 16) return 'town';
  if (locationId < 32) return 'village';
  if (locationId === 32) return 'staff-dungeon';
  if (locationId === 33) return 'map-dungeon';
  if (locationId < LOCATIONS_PER_PROVINCE) return 'dungeon';
  return null;
}
export const isArenaCity = (locationId) => locationId >= 0 && locationId < 32;

/** ArenaLocationData::isVisible - only read for dungeons; 0x02 is shown on the map. */
export const arenaLocationVisible = (visibility) => (visibility & 0x2) !== 0;

/** ArenaLocationUtils::getGlobalPoint, verbatim: a province-map point onto the world map by the province's rectangle, in
 *  the game's integer arithmetic. */
export function arenaGlobalPoint(x, y, rect) {
  return {
    x: Math.trunc((x * Math.trunc((rect.w * 100) / 320)) / 100) + rect.x,
    y: Math.trunc((y * Math.trunc((rect.h * 100) / 200)) / 100) + rect.y,
  };
}

/** ArenaLocationUtils::getGlobalCityID / getLocalCityAndProvinceID - a city's id across the world (cities only). */
export const arenaGlobalCityId = (localCityId, provinceId) => (provinceId << 5) + localCityId;

const cString = (bytes, at, max) => {
  let s = '';
  for (let i = 0; i < max; i++) {
    const c = bytes[at + i];
    if (!c) break;
    s += String.fromCharCode(c);
  }
  return s;
};

/**
 * Parse CITYDATA (CityDataFile::init). Answers { provinces } - each { index, name, rect: {x, y, w, h}, locations } and
 * each location { id, kind, name, x, y, visibility } - or null when the bytes are not nine provinces long.
 * @param {Uint8Array} bytes
 */
export function parseArenaCityData(bytes) {
  if (!bytes || bytes.length !== CITYDATA_BYTES) return null;
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const provinces = [];
  for (let p = 0; p < PROVINCE_COUNT; p++) {
    const start = p * PROVINCE_BYTES;
    const dims = start + NAME_BYTES;
    const rect = { x: v.getUint16(dims, true), y: v.getUint16(dims + 2, true), w: v.getUint16(dims + 4, true), h: v.getUint16(dims + 6, true) };
    const locations = [];
    for (let id = 0; id < LOCATIONS_PER_PROVINCE; id++) {
      const at = dims + 8 + id * LOCATION_BYTES;
      locations.push({
        id,
        kind: arenaLocationKind(id),
        name: cString(bytes, at, NAME_BYTES),
        x: v.getUint16(at + NAME_BYTES, true),
        y: v.getUint16(at + NAME_BYTES + 2, true),
        visibility: bytes[at + NAME_BYTES + 4],
      });
    }
    provinces.push({ index: p, name: cString(bytes, start, NAME_BYTES), rect, locations });
  }
  return { provinces };
}
