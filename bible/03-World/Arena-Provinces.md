# The Arena provinces - The Elder Scrolls: Arena on Daggerfall's Tamriel (TESA1)

Opened 2026-10-12. The owner: *"I think I want to begin implementing Elder Scrolls arena into our world of tamriel"*.
Asked how, they chose **Arena's map, our engine** (Arena's cities, towns, villages and named dungeons stand on the
continent at their Arena places, built in time from Daggerfall's own pieces, as the Etheric Sea's are) over a port of
Arena itself, and **the player's own ARENA folder** (its CITYDATA read at runtime, the way ARENA2 is) over an authored
list. TESA1 is the first slice: the reader, the door, the placement and the map. Nothing is walked or travelled yet.

TAMRIEL1-4 (`03-World/Tamriel.md`) laid the continent round the Bay and TAMRIEL2 streamed its land, and left it empty -
"no towns, roads, dungeons or regions - the later use". Arena is that use: it is the one Elder Scrolls game that laid
out the whole of Tamriel, nine provinces of named places.

## The decisions, taken 2026-10-12

1. **Arena's map, our engine.** Arena's places are Arena's - their names, their kinds, where they stand - and everything
   built on them is the port's: Daggerfall's blocks, Daggerfall's dungeons, Daggerfall's rules. No Arena art, sound or
   level is read. The reference for Arena's formats is OpenTESArena (MIT, The OpenTESArena Developers), which is to Arena
   what Daggerfall Unity is to Daggerfall (Port-Doctrine, Attribution).
2. **The player's own ARENA folder.** Bethesda released Arena as freeware (2004), and like ARENA2 it is not
   redistributable: it never enters the repo or the build (Port-Doctrine, Non-negotiables, the Arena paragraph). The
   player attaches it on the Arena card; nothing of it is uploaded.
3. **Seen on the held map first.** TESA1 inks the places on the enhanced world sheet's continent, in place of TAMRIEL1's
   sixty-seven authored cities. Standing them in the streamed land is the next slice.
4. **No cost on the Bay.** The placement is made once a trace (~90 ms, off the boot's critical path, beside TAMRIEL4's own
   ~0.4 s fit), and the ink is TAMRIEL1's: one rectangle test while the sheet shows the Bay.

## The file (`formats/arenaCityData.js`)

CITYDATA.65 is the world map as a new character starts it (BinaryAssetLibrary::initWorldMapDefs reads the .65; the .0x
files are a save's copy, whose random dungeons carry the names that save rolled). A translation of OpenTESArena's
CityDataFile and the location laws beside it (ArenaLocationUtils):

| Constant | Value | Source |
|---|---|---|
| PROVINCE_COUNT x PROVINCE_BYTES | 9 x 1228 = 11,052 | CityDataFile::init; the freeware file's own size |
| a province | a 20-byte name, its world-map rectangle (four u16), 48 locations | CityDataFile::init |
| a location (LOCATION_BYTES 25) | a 20-byte name, a point on the province's own 320 x 200 map (two u16), a visibility byte | initLocation |
| the location ids | 0-7 city-states, 8-15 towns, 16-31 villages, 32 the staff dungeon, 33 the staff map dungeon, 34-47 dungeons | getLocationData, getCityType, getDungeonType |
| the province order | High Rock, Hammerfell, Skyrim, Morrowind, Summurset Isle, Valenwood, Elsweyr, Black Marsh, the Imperial Province | the file; the picker's race order (`world/tamrielLand.js` PROVINCE_OF_ID, 1-9) |

`arenaGlobalPoint` is getGlobalPoint verbatim, the integer arithmetic and all (`(x * trunc(w * 100 / 320)) / 100 + x0`);
`arenaGlobalCityId` is getGlobalCityID's `(province << 5) + city`; `arenaLocationVisible` the dungeons' 0x02. The reader
refuses any length but 11,052.

What the freeware file holds: 401 placed slots, 273 of them named. The Imperial Province is the Imperial City and sixteen
dungeon places with no names, every other slot zeroed. The fourteen dungeons of every province have places and no
names - Arena rolls a name for each when a character is made. The two staff dungeons a province have theirs (the Crypt
of Hearts, Labyrinthian, Dagoth-Ur, the Crystal Tower ...).

## The one grid - measured

Arena's world map is 320 x 200, and so is Daggerfall's picture of Tamriel (TMAP00I0, its picker TAMRIEL2). The race
screen's map was drawn on Arena's: measured on the freeware releases of both, Arena's nine province masks (TAMRIEL.MNU,
the world map's click regions) lie on the picker's provinces (the TAMRIEL4 trace) at 82-97% overlap (intersection over
union) with no shift and no scale, and no shift or scale improves any province by more than a pixel's worth. So an
Arena world point is a picture point, and a picture point is a Bay point by the frame's own fit (`tamrielFrame.js`
pictureToBay). Matching Arena's places to Daggerfall's by name was tried first and refused: the two games' Iliac Bays
disagree (Arena puts Wayrest north of Daggerfall, Daggerfall puts it south), and only five of Arena's High Rock and
Hammerfell names are places of Daggerfall's.

## The placement (`world/arenaPlaces.js`)

A place is stored on its province's own map and projected by the province's rectangle - and that projection is coarse:
Skyrim's north-coast cities land in the Sea of Ghosts, Elsweyr's northern towns in Valenwood, Summurset's in the
Abecean. The province maps were not drawn to the rectangles' edges. So:

- **The point in fractions** (`arenaWorldPoint`): getGlobalPoint's ratio without its truncation - a world pixel is 15 km,
  and the province map's own resolution is about four times finer.
- **The cloud's fit** (`fitProvinceCloud`): each province's places, as one cloud, onto that province's land on the
  trace (`provinceLand`, provinceKeyAt's own reading over one mask a province) - one scale about the rectangle's
  centre (FIT_SCALES, 0.60 to 1.10) and one shift (FIT_SHIFTS, -12 to 12 picture pixels), the Bay's own fit's shape
  (TAMRIEL4 refused a scale a side). THE COUNT'S BIAS: a cloud shrunk far enough stands every place on some land, so
  the most places on their land does not choose the fit alone - of the fits within FIT_SPARE (1) of the most, the one
  that moves the places least wins. Arena's own rectangle is trusted until the land disagrees.
- **The snap** (`snapToProvince`): a place still off its land moves to the nearest point of its own province within
  SNAP_REACH (8 picture pixels, a circle), SNAP_INSET (0.1) inside the pixel it lands in; past that it is left off and
  counted (`lost`).

On the freeware data, on the TAMRIEL4 trace: **392 of 401 stood by the fit, 9 snapped (3.3 picture pixels at most),
none lost.** Every province fits within the search, Summurset at its edge (0.60, shifted 6 west and 10 south): Arena
spreads Summurset's places far wider than the picture draws its isles, and they stand on the main isle.

| Province | scale | shift (x, y) | on its land by the fit |
|---|---|---|---|
| High Rock | 0.90 | -2, 4 | 47 / 48 |
| Hammerfell | 0.95 | 0, 3 | 47 / 48 |
| Skyrim | 0.85 | 0, 4 | 47 / 48 |
| Morrowind | 1.05 | 2, 5 | 47 / 48 |
| Summurset Isle | 0.60 | -6, 10 | 47 / 48 |
| Valenwood | 0.80 | 0, 2 | 47 / 48 |
| Elsweyr | 0.80 | -4, 3 | 47 / 48 |
| Black Marsh | 0.80 | 2, 2 | 47 / 48 |
| Imperial Province | 0.95 | 1, 2 | 16 / 17 |

**On the trace only.** The one grid is the picture's. TAMRIEL1's authored shape was drawn from the lore map, not on
Arena's grid, and with it the places stand nowhere and the authored cities stand as before - `?tamrieltrace=off`, or the
moment before the trace lands. The model is made once a trace (`arenaPlaces`, keyed on the land module's version) and
the installed city data has a version of its own (`arenaPlacesVersion`).

## The map (`ui/tamrielInk.js`, `ui/heldMap.js`)

On the trace with Arena attached, the continent's cities ARE Arena's (`arenaInkCities`): every named place beyond the
Bay's rectangle - 248 on the freeware data. A place inside the rectangle is Daggerfall's ground and its own places stand
there (the Bay's painter inks them); an unnamed dungeon has no name to ink. A capital is one where TAMRIEL1 named one, by
name in its province - all eight are Arena city-states (Hegathe, Solitude, Mournhold, Alinor, Falinesti, Torval,
Helstrom, the Imperial City; High Rock's, Daggerfall, is the Bay's). The glyph is the kind's (ARENA_KIND_GLYPHS: a
capital the city's, a city-state the hamlet's, a town and a village the village's, a dungeon the dungeon's), the zoom law
TAMRIEL1's (capitals at any zoom, the rest once in to the Bay's own scale). The hover names the kind: "Skyrim :
Labyrinthian (dungeon, beyond the Bay)". The ink keeps the land's version as `version` and Arena's beside it as
`arenaVersion`, and `tamrielInkFor` rebuilds when either moves; the held map's static key carries both, so a pick or a
removal while the sheet is up repaints it.

## The door (`scenes/dataSource.js`, `ui/enhancedMenu.js`, `scenes/world.js`)

- **The store.** `arena`, a store of its own beside the Morrowind one (the database at version 6, the upgrade additive
  as every arm of it is). Not ARENA2's: KEEP's diet and `clearStoredData`'s recovery wipe never see it. A folder pick
  keeps ARENA_FILES alone - CITYDATA.65, by its uppercase name wherever it sits in the folder.
- **The one registration** (`registerArenaData`, the texture store's law, AUDIT VE R2): the stored file read, parsed and
  installed for every reader - by the world host at its boot, by a pick, by the card. No file, no IndexedDB or a file
  the reader refuses installs nothing, and the authored cities stand. `clearStoredArena` empties the store and takes
  the places off at once.
- **The Arena card** - Mods & files, Your files, after the packs: "The Elder Scrolls: Arena", one line, the data's
  reading, Attach data and (attached) Remove data behind the confirm. Attached is on (MWA4's law); the picker says
  "Arena's places will stand on the map of Tamriel" or that the folder held no CITYDATA.65. The menu runs before any
  host, so the card asks the store itself, once a page.
- **The host.** `scenes/world.js` registers the data at its boot, beside the trace's preload, and stands the places when
  both have landed (whichever lands second), saying once how many stood. `?arenaplaces=off` (`scenes/shared.js`
  arenaPlacesOn) installs nothing - a door for a day the fit reads a place wrong, no Features row.
- **THE FOUR HOSTS.** `scenes/world.js` wired as above. `scenes/worldModes.js` (interiors) and
  `scenes/dungeonContext.js` run inside the world host's page and open the same held map over the same installed
  places - nothing to wire. `scenes/exterior.js`, the single-town bench, traces no picture (TAMRIEL3), so its sheet
  shows no continent places: nothing to stand them on.

## Recorded departures and readings

- Daggerfall shows nothing past the Bay and DFU the same; Arena's places on Daggerfall's continent are the port's own
  (Port-Ledger section A, TESA1). The reader is OpenTESArena's, verbatim.
- The placement keeps getGlobalPoint's fractions where the game truncates (a world pixel is 15 km), and fits each
  province's cloud onto the picture's land; the verbatim integer law is exported and pinned beside it.
- The fourteen dungeons a province (and the Imperial Province's sixteen) stand without names until a later slice ports
  Arena's name roll; they are in the model and not on the map.
- Summurset's cloud fits at the edge of the search; Auridon carries none of its places.

## The arc - what comes next

- **TESA2 - the places stand.** Each named place beyond the Bay stood on its Bay pixel in the streamed land, a
  NON-MUTATING clone of one of Daggerfall's own places (the Etheric Sea's and the spawned dungeons' law,
  `world/etherPlaces.js`, `world/spawnedDungeons.js`): a city-state a city's blocks, a town a town's, a village a
  hamlet's, a dungeon a dungeon's, under Arena's name. Two places on one pixel, and a place on a Daggerfall location's
  pixel past the Bay, are that slice's to settle.
- **TESA3 - the provinces as regions.** Past the Bay the region still reads as `getRegionIndexAt`'s clamp, the Alik'r
  Desert (TAMRIEL2); a province of its own for weather, factions and the travel map's words.
- **Later.** Travel and the Overworld to Arena's places; the dungeons' names (Arena's own roll, from A.EXE's tables);
  roads between them.

## Pins

`test/tesa1_arena.test.js` (11): the file's layout field by field over a CITYDATA minted by the format's own law (a full
twenty-byte name, the last slot of a province, a zeroed slot, any other length refused); the location laws (the 49 kinds,
getGlobalPoint's truncation on a case the exact ratio moves, the city id's shift, the visibility bit, the province
order); the cloud's fit (a shift found, the count's bias held by FIT_SPARE and taken without it, the identity on a
tie); the snap (the inset, the corner, the reach a circle on the diagonal); the model (an empty slot, a lost place, the
keys, no trace no places); the installed set (the version, the trace gate, one model a trace); the ink (Arena's named
places beyond the Bay, the capitals, the kinds' glyphs and words, the rebuild, the authored cities back); the store (its
own, the version, the filter, a registration with no IndexedDB) and the doors (the host's two warms, the static key, the
card's rows and buttons); and, where ARENA_PATH and ARENA2_PATH name the data, the freeware CITYDATA.65 (401 placed, 273
named, the provinces and rectangles) and the placement on the real trace (392 by the fit, 9 snapped, none lost, 248
inked, the eight capitals). Mutants `tools/mutants/tesa1.json` (33, all dead).
PIN MOVED: `test/features.test.js`, `test/org2_options.test.js` and `test/settingsUI.test.js` name the Arena card in
Your files and in the card table. Re-aimed by content, each judged dead again: `tools/mutants/mwa4.json`'s
MWA4-the-card-off-the-head-of-the-files-page (the files row now ends with the Arena card), `tools/mutants/tamriel.json`'s
TAMRIEL1-one-model-a-call and `tools/mutants/tamriel3.json`'s TAMRIEL3-the-ink-never-rebuilds (the ink's cache now asks
one `stale` predicate, the land's version and Arena's).
