# The Arena provinces - The Elder Scrolls: Arena on Daggerfall's Tamriel (TESA1, TESA2, TESA-ONLINE, TESA3)

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

## TESA2 - the places stand (2026-10-12)

The owner: *"Continue building"*. Arena's 248 named places beyond the Bay now stand in the streamed land - a town to walk
into, a dungeon to go down - and the held map takes the player there.

- **The pixel** (`world/arenaPlaces.js` standArenaPixels, PIXEL_REACH 3): a place stands on the Bay pixel under its point
  (the live fit's pictureToBay) where that pixel's CENTRE is its own province's land on the trace and no place before it
  (the model's order: province, then slot) took it; else the nearest such pixel within three, ring by ring and the
  nearest centre in a ring; else none. The Bay's own ground stands none (Daggerfall's places stand there), and a nameless
  dungeon none. `arenaPixels` keeps the set once a trace and a fit and makes it again when either moves;
  `arenaPlaceOnPixel` is the build's ask. On the freeware data all 248 stand on the pixel under their own point - none
  moved, none shared, none left.
- **The clone** (`world/arenaLocations.js`): a NON-MUTATING clone of one of Daggerfall's own places - the Etheric Sea's and
  the spawned dungeons' law (`world/etherPlaces.js`, `world/spawnedDungeons.js`) - by the place's kind: a city-state a CITY
  (MAPS.BSA's TownCity, 30 to 49 blocks: 407 of them), a town a HAMLET (TownHamlet, 4 to 12: 1,200), a village a VILLAGE
  (TownVillage, 2 to 4: 1,834), a staff dungeon a LABYRINTH (1,500) and a staff map dungeon a KEEP (843), each a dungeon's
  with its blocks. Never a main-story place (`isMainStoryDungeon`), never a town with a dungeon under it (the three
  capitals' castles), never a place the port made (a spawn, an isle's, an Arena place's own). The rows are the game's as
  MAPS.BSA holds them (HUB1's law), the template picked off `hash32(ARENA_PLACE_SALT, province, slot, 3)` in map-id order:
  the same town every session. Winterhold stands a 6 x 7 city of 243 buildings. The clone keeps the template's blocks
  and buildings by reference and carries Arena's name, its own MapId, its own location index, the pixel's longitude and
  latitude, the region and climate the pixel answers (the climate the province's, TAMRIEL2; the region the clamp's
  until TESA3), no harbour, and `arena` (province, slot, kind).
- **The id**: ARENA_PLACE_SALT (0xa7) in the high 12 bits, apart from every other lane, and ARENA_PLACE_BASE (500000)
  plus the place's ordinal (province x 48 + slot) in the low 20 - past every Bay pixel id, so no Arena place shares an id
  with a spawn under any salt, an isle's place or a place of the Bay. The location index counts down from
  -ARENA_INDEX_BASE (-1,000,000), past the isles' (-1000 to -403,194: 806 x 499 cells).
- **The host** (`scenes/world.js`): `arenaStands` - the land beyond the Bay streamed (TAMRIEL2) and `?arenaplaces` open.
  TESA2 stood them offline alone; TESA-ONLINE (below) stands them online too, from a release the room knows.
  `_arenaTemplates` is made off the game's rows before they go; `_locationToBuild` asks
  `arenaLocationAt` of every pixel past the Bay, which stands the clone in the index once (and takes an Arena place's
  clone out of the index when its place has gone); the built pixel keeps its Arena slot (its entry's
  `arenaSlot` - beside the colosseum's own `arena`, ARENA2).
- **Late, and changed** (`sweepArenaPixels`, sweepSdLate's shape): on the frame, when the pixels' set moves (the trace or
  the data landing after a pixel built, the Arena card's Attach or Remove), every built pixel past the Bay whose
  Arena slot is not the place standing on it now is built again.
- **A save made in an Arena town** loads into it: with the player's Arena attached, the boot's load waits for the data and
  the trace (`arenaTraced`), ARENA_LOAD_WAIT_MS (8 s) at most.
- **The journey** (`ui/heldMap.js` `_pickAt`, `ui/tamrielInk.js` tamrielCityAt): where a host stands the places
  (`setArenaStanding`, the world host's word at its mount) each inked place carries the pixel it stands on, and a press
  on one selects it as a journey to that pixel - the coordinates' own trip (DFU's calculator over every pixel of the way,
  `systems/travel.js` calculateTravelTime, on the composed climate reads) - and `fastTravelTo` lands the player by the
  town's start markers (DFU's DirectionFromStartMarker, as every journey lands). The cursor points at a place it travels to. TAMRIEL1's law that a press beyond the Bay picks
  nothing stands for everything else (PIN MOVED in `test/tamriel.test.js`).
- **What an Arena town is not yet**: no house is sold in one (`scenes/worldModes.js`, the isles' rule, AUDIT CAPTAIN'S SEA
  P9 - every Arena town answers the clamp's region until TESA3, so a deed's key would own the same key in all of them);
  no spawn ever clones one (`spawnTemplates`, AUDIT CAPTAIN'S SEA P3's law); its port byte is 0. `/tp` names Arena's
  places, stood or not yet. Shot mode's probe hooks `__tesaJump` and `__tesaPlace` jump to a pixel and read what it
  stands.
- **THE FOUR HOSTS.** `scenes/world.js` stands them. `scenes/worldModes.js` (interiors - an Arena town's buildings are its
  template's, entered the same way) and `scenes/dungeonContext.js` (an Arena dungeon's halls are its template's, built
  as any clone's) run in the world host's page over the same index; `worldModes.js` keeps the house rule above.
  `scenes/exterior.js`, the single-town bench, streams no land beyond the Bay: no place stands there.

## TESA-ONLINE - one Tamriel a room (2026-10-12)

The owner: *"yes online support for everything"*; asked how a room should agree on Arena's places when the places are
each player's own copy's, *"Whatever is best and doesnt get us in legal trouble"*. Three ways were weighed: committing
the place list (401 names and points out of CITYDATA.65 - Arena's data in the repo, a render of game data under the
doctrine: refused), keeping a player without Arena off the land past the Bay online (no wall exists to keep them, and
the open Abecean and the Etheric Sea's crossing lie past the Bay's west edge: refused), and the one taken: **each player's
own copy, and a room that agrees which copy**.

- **The print** (`world/arenaPlaces.js` ARENA_CITYDATA_PRINTS, arenaCityDataPrint, isKnownArenaPrint): CITYDATA.65's
  SHA-256 as Bethesda shipped it. Measured: the 2004 freeware (1.06) and a 1996 install (another A.EXE, 170,871 bytes
  against 174,021) hold the file byte for byte, so one print covers the releases seen. A print is not game data - no
  byte of the file is in it, and nothing can be made back from it. `registerArenaData` prints the stored file and
  installs the data with `known`.
- **The room** (`setArenaRoom`, the world host's word at its mount): online, `arenaPixels` answers null unless the data
  is a known release - so every player in a room who has Arena stands the same places, on the same pixels, with the same
  ids, and their towns' and dungeons' rooms on the relay are one room (`net/wire.js` WORLD_ROOM admits an Arena
  place's `dungeon:m<id>` and `interior:m<id>.<n>`, nine digits). A copy the room does not know (a mod's, a damaged
  file) keeps its places on its own map and stands none online; offline it stands them as before. The Arena card says
  which: "CITYDATA.65 attached", or "... - not a release a room knows: its places stand offline alone".
- **Nothing of Arena crosses the wire.** No name, no point and no pixel is sent: a player's places are their own file's.
- **A player without Arena**, online, is told once a session as they first cross onto the land past the Bay (never at
  sea, on the Bay or past the Veil; `arenaBeyondNotice`, on the frame's crossing): "Players with The Elder Scrolls: Arena
  attached see its cities and dungeons in these lands. Attach your own copy (free from Bethesda) in Mods & files."
  Recorded reading: where they walk through an Arena town, the players who stand it see them pass through its walls,
  on ground the town's own flattening has moved a little; the town's people, its shops and its dungeons are the
  holders' alone, as every room's are.

## TESA3 - the province's name and its people (2026-10-12)

The owner: *"Continue"*. Past the Bay the region read is still `getRegionIndexAt`'s clamp, the Alik'r Desert (TAMRIEL2),
and every town of Skyrim said so and named its people as Redguards.

**WHY NOT A REGION OF ITS OWN.** A sweep of every region read (world.js's 35, and the rest of `src/`) found the 62
regions are a wall the whole online game stands on: `net/wire.js` CHAT_REGION_COUNT and the relay's CHAT_ROOMS whitelist,
`net/hubShards.js` REGION_CHANNELS, `net/nodeLaw.js` regionOk (professions, the market, writs, contracts, cards, halls,
chapters, receipts), `net/townSeatLaw.js` seatRegionOk, the banks' BANK_REGION_COUNT, `systems/regionConditions.js`
REGION_COUNT (prices, flags, stock) and the save's 62 legal reputations - an index of 62 or past it is refused or
silently off in each, and the bare `REGION_NAMES[r]` / `REGION_RACES[r]` reads answer undefined. Nine more regions is the
save's shape, the services' and the relay's at once - its own arc, and the owner's to call. So the province answers what
the player READS and whose NAMES they hear, and never a region index.

- **The province** (`world/tamrielLand.js` provinceKeyBeyondBay): a Bay pixel past the Bay answers the province its
  CENTRE stands on (provinceKeyAt - the trace's, else the authored rings'), or null on the Bay's own pixels (Daggerfall's
  regions answer there) and at sea. Pure: the worker's land module (it reads nothing of characters/).
- **The host** (`scenes/world.js` provinceAt, provinceHere): the province where the land beyond the Bay streams, never on
  the Bay, at sea or past the Veil. It names:
  - the loading screen and a kept screenshot's place (LOAD1's `placeAtPixel`: a location, else the province, else the
    sea or the region);
  - the Overworld's line;
  - Travel Options' new region (`regionName`), and its EDGE: the region key of the crossing is the region and the
    province together, so walking from Skyrim into Morrowind past the Bay is a new region's word.
- **The people** (`world/tamrielPeople.js` provinceNameBank): each province's DFU name bank off its race through
  GetNameBank - High Rock Breton, Hammerfell Redguard, Skyrim Nord, Morrowind Dark Elf, Sumurset High Elf, Valenwood Wood
  Elf, Elsweyr Khajiit, Black Marsh the IMPERIAL bank (DFU's own law: "Imperial names appear where one would expect
  Argonian names", NameHelper.cs:50), the Imperial Province, which no race claims, Imperial. `nameBankHere` is the one
  answer - the province's past the Bay, else GetNameBankOfRegion, verbatim - and a raid's pinned region (AUDIT NAV1)
  names by its region. It answers the talk's names and %fn/%mn (`talkFullName`, the town talk's `nameBank`), the
  stranger's name (`randomFullName`: getRandomFullName's own draw from a bank in hand, `nameHelper.js`
  getRandomFullNameOfBank, which getRandomFullName now calls - the same coin, the same stream), the quest machine's
  people (`nameBankOfCurrentRegion`), the oath's race (`raceOfCurrentRegion`) and the town's building names (the town
  talk's nameOpts).
- **What stays the region's**: everything keyed by region index - chat and presence, banks, law and the guards, prices
  and stock, seats, the services, the quest machine's local sites (place.js picks from the region's MAPS rows), the
  quest macros' own name banks, the townsfolk's sprites (REGION_RACES: Breton and Redguard art alone). Recorded: a
  traveller in Skyrim talks to Nords whose law, prices and region chat are the Alik'r Desert's.
- **Online**: names are drawn on each client, as every talk name is - nothing crosses the wire; the province is read off
  each player's own trace of Daggerfall's picture.

## The arc - what comes next

- **The provinces as regions of their own** - their own chat rooms, banks, law, prices and quest sites. The save's shape,
  the relay's whitelist and the account services' validators move together: the owner's call.
- **The dungeons' names** - Arena's own roll (from A.EXE's tables) for the fourteen a province, so they stand too.
- **Roads** between Arena's places, and their ports.

## Pins

`test/tesa3_provinces.test.js` (5, TESA3): the province past the Bay (the centre's, none on the Bay's own ground with
land under it or at sea, the authored shape without a trace); the people's banks for all nine (GetNameBank's, the
Imperial arm, none for none); the stranger's draw equal to getRandomFullName's over six seeds and a Nord's -sen; the
host by source (provinceAt's gates, the pin's exception, the loading screen, the Overworld, the new region and its edge,
every name site, the town talk told, the player's region index untouched, the land module free of characters/); with
ARENA2_PATH, Winterhold's pixel Skyrim's, Mournhold's Morrowind's, Daggerfall none. Mutants `tools/mutants/tesa3.json`
(13, all dead). PIN MOVED: `test/audit58_magic.test.js` (the talk's and the stranger's names through nameBankHere and
getRandomFullNameOfBank).

`test/tesa2_online.test.js` (5, TESA-ONLINE): the print (SHA-256 in hex, every byte two digits, the one list, case
held), the room (online only a known release stands; offline any copy; the switch's version), the registration and the
card's three readings, the host by source (online and off, the room's word, the notice's gates and its once, on the
crossing) and the relay's rooms for an Arena dungeon and building; with ARENA_PATH, the freeware's file is the release
the room knows. Mutants `tools/mutants/tesa_online.json` (12, all dead). PIN MOVED: `test/tesa2_arena.test.js` (the
host stands them online too) and `test/tesa1_arena.test.js` (the card's reading names the release); TESA2's
TESA2-online-too record retired with the law it held; `tools/mutants/tesa1.json`'s TESA1-a-registration-installs-nothing
re-aimed by content (the install now carries `known`), judged dead again.

`test/tesa2_arena.test.js` (8, TESA2): the pixel (under the point, the centre's land deciding where the corner's would not,
the next nearest free one for a pixel taken, the reach in rings, the Bay's ground and a nameless dungeon none); the
installed pixels (once a trace and a fit, again when the fit moves, the switch moving the version once); the id (the lane,
the base, all 432 slots apart, never a spawn's under the same salt, past the isles' indices); the templates (the five
kinds' types, the dungeon test, the exclusions, map-id order, the province's own hash, and a spawn never cloning an Arena
place); the clone (every id field, the pixel, the region handed, no harbour, the template untouched); the map (the pixel
carried only where a host stands them, the hit, the press's arm by source); the host by source (online and off since TESA-ONLINE, the arm, one
clone a pixel, the key, the sweep, the load's wait, /tp, no house); and, where ARENA_PATH and ARENA2_PATH name the data,
all 248 stood under their own points, MAPS.BSA's five template counts and Winterhold's 6 x 7 city. Mutants
`tools/mutants/tesa2.json` (28, all dead). PIN MOVED: `test/tamriel.test.js` (a press beyond the Bay picks an Arena place
the world stands, and nothing else) and `test/auditcaptsea.test.js` (the house rule names an Arena town beside an isle's).
Re-aimed by content, each judged dead again: `tools/mutants/auditcaptsea.json`'s ACS-P3-spawn-filter and ACS-P9-deed
(each still drops the isles' own exclusion alone), `tools/mutants/tamriel.json`'s TAMRIEL1-the-hover-names-the-bay-too
(the hover's city read is `tamrielCityAt` now) and TAMRIEL1-window-hover-silent-beyond-the-bay (its line carries the
cursor). The boot load's wait stands above the save's own parse, so MWEARLY's record stands as it was.

**Seen in the game** (the freeware ARENA2 served by the dev middleware, CITYDATA.65 in the Arena store, headless
Chromium on SwiftShader, a scratch probe through `__tesaJump` and `__tesaPlace`): the trace landed, 401 places stood on the
picture, the jump to Winterhold's pixel (2200, -360) built in 59 s of software rendering, and the pixel stood
"Winterhold" - Arena key 2|2, a 6 x 7 city of 243 buildings, the region the clamp's (the Alik'r Desert) - with no page
error.

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
