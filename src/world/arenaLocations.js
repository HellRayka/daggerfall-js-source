// @ts-check
// TESA2 (2026-10-12, the owner: "Continue building"; bible/03-World/Arena-Provinces.md TESA2) - ARENA'S PLACES STAND.
// Each named Arena place beyond the Bay stands on its Bay pixel (world/arenaPlaces.js standArenaPixels) as a NON-MUTATING
// CLONE of one of Daggerfall's own places - the Etheric Sea's and the spawned dungeons' law (world/etherPlaces.js,
// world/spawnedDungeons.js: the locations are cached objects the exterior layout shares) - under Arena's name, its own id
// and its own index. Pure: the world host (scenes/world.js `_locationToBuild`) asks it of a pixel beyond the Bay as the
// pixel builds, and stands the answer in its index.
//
// THE KIND, DAGGERFALL'S: an Arena city-state stands a CITY (MAPS.BSA's TownCity - 407 of them, 30 to 49 blocks), a town a
// HAMLET (TownHamlet, 4 to 12), a village a VILLAGE (TownVillage, 2 to 4); a staff dungeon a LABYRINTH and a staff map
// dungeon a KEEP (DungeonLabyrinth and DungeonKeep, each with its dungeon). Never a main-story place, never a town with a
// dungeon under it (the three capitals' castles), never a place the port made (a spawn, an isle's, an Arena place's own).
// The rows are the game's own as MAPS.BSA holds them (HUB1's law: a client's mods never move what a place stands), and the
// template is picked off the place's own hash in map-id order, so a place stands the same town every session.
//
// THE ID keeps DFU's law - MapId & 0xfffff the place's own number, the high 12 bits its lane (ARENA_PLACE_SALT, apart from
// the spawns' salts, the zone halls' 7, the Ocean Holes' 0x600, the Abyss Dungeons' 2049-4095 and the isles' 0xe7) - and
// its low 20 bits are ARENA_PLACE_BASE and more, past every pixel id the Bay has (getMapPixelID's ceiling is 500000): no
// Arena place shares an id - a discovery, a save's key - with a place of the Bay or a spawn. Its LOCATION INDEX is its
// own negative, never a row of MAPS.BSA, and past the isles' (-1000 to -403194: 806 x 499 cells).
import { mapPixelToLongitudeLatitude, LOCATION_TYPES } from '../formats/mapsFile.js';
import { hash32 } from './spawnedDungeons.js';
import { LOCATIONS_PER_PROVINCE } from '../formats/arenaCityData.js';

/** The places' lane in the id's high 12 bits, and the first low number a place takes. */
export const ARENA_PLACE_SALT = 0xa7;
export const ARENA_PLACE_BASE = 500000;
/** The places' location indices count down from here. */
export const ARENA_INDEX_BASE = 1000000;
/** TESA-ONLINE: the words. */
export const ARENA_PLACES_TEXT = Object.freeze({
  beyondWithout: 'Players with The Elder Scrolls: Arena attached see its cities and dungeons in these lands. Attach your own copy (free from Bethesda) in Mods & files.',
});
/** How long, at most, a boot's load waits for Arena's places to stand (the data and the trace landing) - a save made in an
 *  Arena town loads into it; a trace that never lands costs this and no more. */
export const ARENA_LOAD_WAIT_MS = 8000;

/** An Arena kind's template: the location type it clones, and whether the template has a dungeon. */
export const ARENA_TEMPLATE_KINDS = Object.freeze({
  'city-state': Object.freeze({ type: LOCATION_TYPES.TownCity, dungeon: false }),
  town: Object.freeze({ type: LOCATION_TYPES.TownHamlet, dungeon: false }),
  village: Object.freeze({ type: LOCATION_TYPES.TownVillage, dungeon: false }),
  'staff-dungeon': Object.freeze({ type: LOCATION_TYPES.DungeonLabyrinth, dungeon: true }),
  'map-dungeon': Object.freeze({ type: LOCATION_TYPES.DungeonKeep, dungeon: true }),
});

/** A place's own number in the lane: its province's 48 slots, then its slot. */
const ordinal = (place) => place.provinceIndex * LOCATIONS_PER_PROVINCE + place.id;
/** An Arena place's map id. */
export const arenaPlaceId = (place) => (((ARENA_PLACE_SALT << 20) | (ARENA_PLACE_BASE + ordinal(place))) >>> 0);
/** An Arena place's location index: its own negative. */
export const arenaLocationIndex = (place) => -(ARENA_INDEX_BASE + ordinal(place));
/** Is a map id an Arena place's? */
export const isArenaPlaceId = (id) => ((Number(id) >>> 20) & 0xfff) === ARENA_PLACE_SALT && ((Number(id) >>> 0) & 0xfffff) >= ARENA_PLACE_BASE;

const idOf = (l) => (l?.mapTableData?.mapId ?? 0) >>> 0;
/**
 * THE TEMPLATES from the game's rows: one list an Arena kind (ARENA_TEMPLATE_KINDS), each in map-id order - the rows of
 * its location type with an exterior, a dungeon where the kind has one (with blocks) and none where it has none; never a
 * main-story place (`isMain`, by map id) nor one the port made.
 * @param {Iterable<any>} rows @param {(mapId: number) => boolean} [isMain]
 */
export function arenaTemplates(rows, isMain = () => false) {
  const list = [...(rows ?? [])].filter((l) => l?.exterior?.exteriorData && !l.spawned && !l.ether && !l.arena && !isMain(idOf(l)));
  const out = {};
  for (const [kind, { type, dungeon }] of Object.entries(ARENA_TEMPLATE_KINDS)) {
    out[kind] = list.filter((l) => l.mapTableData?.locationType === type && (dungeon ? !!(l.hasDungeon && l.dungeon?.blocks?.length) : !l.hasDungeon))
      .sort((a, b) => idOf(a) - idOf(b));
  }
  return out;
}

/** The template a place clones - off its own hash (its province and slot); null where its kind has none. */
export function arenaTemplateOf(templates, place) {
  const list = templates?.[place?.kind];
  return list?.length ? list[hash32(ARENA_PLACE_SALT, place.provinceIndex, place.id, 3) % list.length] : null;
}

/**
 * AN ARENA PLACE'S LOCATION: the template cloned onto the place's Bay pixel (bx, by) - its id (the map row's, the
 * exterior's location and map ids, its record's header, and the dungeon's header's), the pixel's longitude and latitude,
 * Arena's name, the region the pixel answers for (`where`: the host's), its own location index, and `arena` (its province,
 * its slot, its kind). Its exterior answers no harbour (`portTownAndUnknown` 0: Arena's ports are not yet).
 * @param {any} template
 * @param {{ province: string, provinceIndex: number, id: number, kind: string, name: string, bx: number, by: number }} place
 * @param {{ regionIndex?: number, regionName?: string, politic?: number, climate?: any }} [where]
 */
export function synthesizeArenaLocation(template, place, where = {}) {
  const mapId = arenaPlaceId(place);
  const ll = mapPixelToLongitudeLatitude(place.bx, place.by);
  const loc = {
    ...template,
    name: place.name,
    regionIndex: where.regionIndex ?? template.regionIndex,
    regionName: where.regionName ?? template.regionName,
    politic: where.politic ?? template.politic,
    climate: where.climate ?? template.climate,
    locationIndex: arenaLocationIndex(place),
    mapTableData: { ...template.mapTableData, mapId, longitude: ll.x, latitude: ll.y },
    exterior: {
      ...template.exterior,
      exteriorData: { ...template.exterior?.exteriorData, locationId: mapId, mapId, portTownAndUnknown: 0 },
      ...(template.exterior?.recordElement ? { recordElement: { ...template.exterior.recordElement, header: { ...template.exterior.recordElement.header, locationId: mapId } } } : {}),
    },
    arena: Object.freeze({ province: place.province, provinceIndex: place.provinceIndex, id: place.id, kind: place.kind }),
  };
  if (template.dungeon) loc.dungeon = { ...template.dungeon, recordElement: { ...template.dungeon?.recordElement, header: { ...template.dungeon?.recordElement?.header, locationId: mapId } } };
  return loc;
}
