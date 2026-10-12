# The Etheric Sea - past the Veil (ETHER-SEA, ETHER-PLACES, ETHER-PORTS, ETHER-SHIPS, ETHER-LEGENDS, ETHER-CROSSING, ETHER-CHART, ETHER-LIGHT, 2026-10-11)

The owner, 2026-10-11: *"A brand new open sea map that allows you to traverse to the etheric sea. Sail far enough and
you are prompted to travel into the open sea. The etheric sea is a infinite procedural oceanscape with procedural
islands with towns, dungeons, exotic resources, deadly legendary ships, and whatever more you can add to give meaning
to the etheric sea. This is all yours."* The Iliac Bay's own sea - its crews, its captain's standing, its spyglass, its
contracts, its exchange - is `03-World/Captains-Sea.md`; this page is the sea past the Veil.

The pre-merge audit (AUDIT CAPTAIN'S SEA, the owner: "Lets do a comprehensive audit, enaure this is insanely detailed
and perfection. No exceptions") is `01-Overview/Audit-Captains-Sea.md`: its fixes stand in the sections below, each
under its finding's id.

**THE PORT'S OWN.** Nothing in Daggerfall or DFU lies past the Bay's western water, and nothing here is transcribed.
Where the game has a law it is used: the ground is grown by DFU's own terrain kernel from the two bytes a pixel it
always reads (WOODS.WLD's height, CLIMATE.PAK's climate - answered here instead of read), the isles' towns and ruins
are the game's own places cloned (MAPS.BSA's rows, as the spawned dungeons clone theirs), a hold is still the DFU loot
tables' roll, gold is gold. The departure is Port-Ledger section A's ETHERIC SEA row.

**THE SHAPE.** Sail far out on the open Abecean and the game asks whether to sail on into the open sea. Three days on,
the ship comes out off Veilhaven, the first port past the Veil - and from there the sea runs west for more than a
thousand leagues:

- **AN ENDLESS SEA, AND ITS DEPTHS** (ETHER-SEA): a box of the Bay's own pixel grid, 8,064 by 4,992 pixels (6,606 km
  by 4,089 km), far north of the continent; the deeper west of the Veil, the deadlier and the richer - the Shallows,
  the Reaches, the Deep Aether, the Abyss.
- **ISLES** (ETHER-SEA, ETHER-PLACES, ETHER-PORTS): a lattice of isles grown off one hash, each a PORT (a town and a
  freeport's quay), a RUIN (a dungeon), a WILD isle (an Etheric good on its strand) or a bare ROCK, named, in its own
  climate, on every client the same.
- **ITS SHIPS AND ITS LEGENDS** (ETHER-SHIPS, ETHER-LEGENDS): corsairs and the isles' traders under the sea's own names,
  no crown's navy and no crown's law - and six legendary ships, each with her own haunt, her own terror and her own
  purse, who come back from the deep a month after they are sunk.
- **A REASON TO CROSS** (CAPT-TRADE's Etheric goods, the strands, the legends' purses, the charts): ether-amber,
  starglass and voidsilk made on the isles and wanted in every port of the Bay; the Bay's goods wanted on the isles.
- **A CHART OF ITS OWN** (ETHER-CHART): the travel map's door past the Veil opens the captain's chart of the isles
  charted, the depths, the Veil and the legends' haunts heard of.

## The slices

| slice | what | modules |
|---|---|---|
| ETHER-SEA | THE SEA'S LAW: its box, the Veil, the depths and their bands; the isles' lattice, kinds, sizes, climates and names; the ground the kernel grows there, composed over the world's reader (the host's and the worker's), streamed, on the far ring | `world/ethericSea.js`, `world/streamingWorld.js` (`frames`), `world/terrainGenWorker.js`, `world/terrainGenClient.js`, `render/farRing.js` (`climatePast`, `pastOwn`), `world/landforms.js` (the climate past the table), `scenes/shared.js` (`etherSeaOn`, `etherCrossOutOn`), `scenes/world.js` (the composition, the region's name, the Overworld's water) |
| ETHER-PLACES | THE ISLES' PLACES: a port's town and a ruin's dungeon cloned off the game's own rows onto the isle's centre pixel under their own id, name and index; a ruin of the deep elite | `world/etherPlaces.js`, `scenes/world.js` (`_locationToBuild`, `etherPlaceAt`, the templates, the online wake) |
| ETHER-PORTS | A FREEPORT: a port isle is a port to the deeds, the harbour book (its quays), the naval host's waters, the exchange (the Etheric goods made there) and its own harbourmaster's tab - the legends' rumours and a chart of its waters | `scenes/world.js` (`etherPortAt`, `etherPortNear`, `etherPortOf`, the port seams), `scenes/etherHost.js` (`office`, `chartOffer`, `buyChart`), `ui/navalYardWindow.js` (`etherOfficeText`) |
| ETHER-SHIPS | ITS TRAFFIC AND ITS LAW: corsairs and traders by the band, under the sea's names and the Isles' colours; no navy, no relief, no crown's law; corsairs' papers; the strands' casks | `systems/naval/etherShips.js`, `systems/naval/navalDirector.js` (`ctx.ether`), `scenes/navalHost.js` (`launch`, `chargeEther`, `etherCtx`, `pickStrand`), `scenes/etherHost.js` (`sites`, `gather`, `papers`), `systems/naval/shipKnowledge.js` (`coloursWords`) |
| ETHER-LEGENDS | SIX LEGENDARY SHIPS: their classes, haunts, terrors, purses; launched in their haunts, risen again a month after their end; the rumours | `systems/naval/etherShips.js`, `systems/naval/navalShips.js` (the six classes, `LEGEND_LEVEL`), `systems/naval/navalDirector.js` (`legendSpawn`), `scenes/navalHost.js` (`legendMend`, `reachOf`), `scenes/etherHost.js` (`legendHere`, `legendEnded`, `rumours`) |
| ETHER-CROSSING | THE CROSSING: asked at a helm on the open Abecean and in the Veil, once each time the ship comes into those waters; the voyage carries the captain, the ship, her crew and her hold | `systems/naval/etherCrossing.js`, `scenes/world.js` (`etherCrossStep`, `etherCross`, `crossLandPx`) |
| ETHER-CHART | THE CHART OF THE ETHERIC SEA: the travel map's door past the Veil | `ui/etherChartWindow.js`, `ui/navalPlunderDoor.js` (its slot), `scenes/etherHost.js` (`chart`), `scenes/world.js` (`openEtherChart`) |
| ETHER-LIGHT | THE LIGHT PAST THE VEIL: cold and violet on land, sea and hulls | `world/ethericSea.js` (`etherLight`), `scenes/world.js` (the frame's lights) |
| (the ledger) | WHAT A CAPTAIN KEEPS OF IT: the isles charted, the legends ended and heard of, the strands gathered, the way out, the crossings - in the Captain save | `systems/naval/captainLedger.js` (`ether`, `chartIsle`, `endLegend`, `gathered`, `setCrossedFrom`, `crossed`, `hearLegend`), `scenes/etherHost.js` |

THE FOUR HOSTS (Home.md; AUDIT CAPTAIN'S SEA H12 - the slices named none): the sea, its ships, the crossing, the chart
and the light are `scenes/world.js`'s - the streaming exterior's, where the sea is. `scenes/exterior.js` (the bench)
stands no sea: FLAGGED, nothing wired. `scenes/worldModes.js` (an isle town's buildings) is wired where an isle's place
reaches it - its houses never for sale nor owned by a Betony deed (`houseOwnedAt`, `currentHousesForSale` - P9) - and
otherwise FLAGGED. `scenes/dungeonContext.js` (an isle ruin's halls) builds the cloned dungeon as any spawn's, its elite
foes its own (`elite`): wired; the light is the exterior's alone there - FLAGGED.

## ETHER-SEA - where it lies, and what grows there

**THE BOX** (`ETHER_BOX`): pixels x 64 up to 8,128, y -7,680 up to -2,688, on the Bay's own grid (819.2 m a pixel - one
offset from the Bay, no scale, as Tamriel's frame). Three readings fixed it:

1. **The wire's world.** A pose's x and z travel as world units within `POSE_BOUND` (net/wire.js, 8,192 pixels' worth);
   a pose's z is (499 - y) pixels, so y must stay over -7,693 for a player there to be seen online. The box's
   southernmost row is -2,689 and its northernmost -7,680.
2. **Positive world units.** `worldCoordToMapPixel` truncates (world/streamingWorld.js); x and z are positive across
   the whole box (x from 64 pixels; z, 499 - y, from 3,188).
3. **Clear of the continent.** Tamriel's frame ends at y = -(picture row 76 at x21) = -1,596 at the farthest north any
   fit the probe allows reaches (TAMRIEL3's: row 52 and 24 either way, scales 15 to 21) - a thousand pixels and more
   south of the box. Nothing of the Bay or the continent is in sight of the sea, and nothing of the sea of them.

The law answers its open sea ETHER_MARGIN (64) pixels round the box too: the far ring's whole reach from a ship in the
box - RING_RADIUS (48), its rebuild's drift (RING_REBUILD_DRIFT, 12), a normal's neighbour (1) and its cliffs' fade
(landforms.js CLIFF_REACH, 3) - so neither the kernel's windows at its edge nor the ring ever read the world's other
ground (AUDIT CAPTAIN'S SEA G1/G10: at 4 the ring at the Veil drew the Bay's clamped row-0 mountains). Past the box
nothing streams: the world's edge, a thousand leagues out.

**THE VEIL AND THE DEPTHS.** The box's eastmost VEIL_PX (16) pixels are THE VEIL (`inVeil`) - the way home. DEPTH is
leagues west of it (`etherDepthAt`; a league LEAGUE_M, 4,828 m, the log's own - captainLedger.js re-exports it from here,
one home), and its BANDS are the sea's law:

| band | from | a cell's isle | ports / wild / ruins / rocks | peaks lifted | the ships' levels up | holds' tiers up | corsairs' weight |
|---|---|---|---|---|---|---|---|
| the Shallows | 0 leagues | 0.50 | 30 / 30 / 14 / 26 | 0 | +1 | +1 | x1 |
| the Reaches | 12 | 0.48 | 18 / 32 / 25 / 25 | +20% | +3 | +2 | x1.6 |
| the Deep Aether | 45 | 0.42 | 11 / 32 / 33 / 24 | +45% | +6 | +3 | x2.4 |
| the Abyss | 140 | 0.36 | 6 / 32 / 40 / 22 | +70% | +9 | +4 | x3.4 |

At the helm's fastest dial (Come Sail Away's x30, a galleon making 6 m/s) the Reaches are two minutes from
Veilhaven, the Deep a quarter of an hour, the Abyss an hour; online, where time at sea keeps the world's pace, the
Reaches are an hour's sail.

**THE ISLES** (`isleOfCell`): the box is a lattice of ISLE_CELL_PX (10) cells, 806 by 499. A cell holds an isle on its
band's chance of its own hash (`etherHash` - FNV-1a, finished, under ETHER_SALT; `etherRng` the mulberry32 step), its
kind drawn by the band's weights, its radius and peak in its kind's ranges (`ISLE_KINDS`):

| kind | radius (pixels) | peak (bytes, 8 m) | fall | climates |
|---|---|---|---|---|
| port | 0.9 - 1.1 | 10 - 15 (never lifted: a town a short climb from the water) | 1 | Subtropical, Woodlands, Rainforest |
| ruin | 1.4 - 2.4 | 15 - 34 | 1.5 | Mountain, Haunted Woodlands, Swamp, Desert |
| wild | 1.0 - 2.8 | 10 - 40 | 1.5 | Rainforest, Subtropical, Swamp, Desert2, Mountain Woods |
| rock | 0.6 - 1.1 | 8 - 18 | 1.5 | Mountain, Desert |

Its centre is jittered where its land and the kernel's pixel past it stay inside its cell (`margin` the radius's
ceiling and one), so ONE CELL ANSWERS ANY PIXEL: the ground's read never searches. A PORT ISLE is small and stands on its
town's pixel (`landCentre` - its land centred on the pixel a town's blocks stand in, `lx`, `ly`; the kernel takes a
pixel's byte as its south-east corner): the town whole on dry ground and its shore within ETHER_PORT_SHORE_M (900 m), so
the harbour book sounds a harbour there within ETHER_HARBOUR_REACH (900 m - `shipLife.js findHarbour`'s `reach`; AUDIT
CAPTAIN'S SEA H1/P2: an isle of two kilometres had its shore past the 420 m every Bay harbour is sounded within, and no
port past the Veil had a quay - a sample of 160 ports has every one its harbour now). A wild isle bears one of the
Etheric goods (`ETHER_GOODS`, the exchange's three - pinned equal). No isle stands in the box's edge cells, nor in any
cell east of Veilhaven's: the Veil's still water, the landfall's way clear. **VEILHAVEN** (`veilhaven`, VEILHAVEN_CELL
(800, 249), four cells west of the Veil on the box's middle row, its centre pixel VEILHAVEN_AT (4, 5) in it - (8068,
-5185), where the crossing has always made its landfall beside it) is always a port: radius 1, peak 12, Subtropical. The
isles are cached a cell (ISLE_CACHE_MAX 65,536, dropped whole).

**THE NAMES** (`isleName`): a head (40), a middle on half of them (12), a tail (30) - some sixteen thousand roots - and
the kind's forms: a port Port X / X-haven / X Landing / X's Anchorage / X-mouth; a wild isle X / X Isle / the Isle of X /
the Adjective Isle; a ruin always its root (the automap keys on a place's name): the Isle of X / X's Grave / Old X / the
Tomb of X; a rock the Adjective Stack / X Teeth. Ours; no table of the game's.

**THE GROUND.** `etherHeightByte`: 0 at sea; an isle's peak at its centre falling to its rim as (1 - t^2) to its kind's
`fall`, a lattice hash of +-HEIGHT_NOISE (2) on its land. `etherLargeMap`: the large map's 5 x 5 - 0..9 on land, 0..1 at
sea (the kernel lifts an open sea's larger bytes out of the water: a byte of 0 under large-map detail of 6 put 2% of a
tile over the sea level, measured through the kernel; 0..1 none). `etherClimateAt`: the isle's out to CLIMATE_REACH_PX
(1.5) past its rim, from its land's own centre (`lx`, `ly`) - the kernel's window carries an isle's land a pixel east and
south of its bytes, and that pixel must wear the isle's textures - the Ocean's else. The Landforms' lands read the same
climates past the Bay's table (`landforms.js` - G3: every isle's hills were shaped by the Bay's clamped corner pixel,
999, 0). Through the kernel (measured, `test/ethersea.test.js`): every port and ruin
stands on a dry plateau (a place can stand there), Veilhaven's own pixel is all land, its landfall's pixel
(LANDFALL_OFF_PX 4 east) all water, an empty cell's middle all water.

**THE COMPOSITION** (`etherWoods`, `etherClimateIndex`, `etherPoliticIndex`): a prototype child of the reader it is
handed - TAMRIEL2's `groundWoods` over the Bay's, or the Bay's alone - overriding the two reads WoodsFile builds its range
reads on, so the kernel's every read answers the sea inside the law's box and the reader's own to the byte outside it.
The world host composes it between the boot's repairs and the terrain client (after TAMRIEL2's), and the climate and
the politic beside it; the client tells the worker (`ether` on its init, off the reader's `isEtherGround`) and the
worker composes its own copy - its graph still world/ and formats/ alone (`ethericSea.js` imports formats/ only). The
stream's `frames` (`StreamingWorldState.frames`) carry the box apart from the continent's `frame`, which the picture's
fit resets as it lands; the far ring is handed the composed bytes past the map (with the continent off too) and, new,
`climatePast` - the clamp read the Bay's edge's climate there, and an isle stood in it: the continent's wherever it
stands, the sea's inside its law, the Bay edge's clamp else (G4/G9: with the continent off the Bay's edge's ring turned
green), its cliffs faded at their own pixels (`pastOwn` - G6). The Overworld's travel view reads an isle's land as land
and the open sea's as water (`tvWater`, `tvSceneOf` - G5: every isle read water with the continent off).

**THE REGION.** Past the map POLITIC.PAK answers -1, which MapsFile clamps to the Alik'r Desert. The sea answers
Betony's politic (ETHER_REGION 19 and 128): its people's names, its prices, its law and the far places its quests send
a captain to are Betony's - the Bay's westernmost isle with places of its own (the Bay's "Islands in the Western Iliac
Bay", region 12, hold none: a quest's far place there would be nowhere). The loading screen and the Overworld's line
say "the Etheric Sea". The world's events that walk a province (Raiding Parties) find none past the Veil (G7: Betony's
raids were announced to a captain at sea), and World of Daggerfall's pick never scans the sea's pixels (G8).

**THE SWITCH** (`etherSeaOn`, `etherCrossOutOn` - AUDIT CAPTAIN'S SEA G2/P7, THE SWITCH SPLIT): the SEA stands in every
game - its ground, its places, its ships and the way home through the Veil - so a save past the Veil loads under any
skin (it threw on load under the classic skin) and sails home; the CROSSING OUT is the enhanced skin's and online's.
`?ether=off` the kill door: the sea gone, a save made past the Veil lands at the way home - the waters of the last
crossing out, else the open Abecean - and a pixel past the map at the Bay's nearest, each said once it stands
(`_streamedLanding`, `_unstreamedLanding`; the load threw on it before).
No Features row: the crossing is the player's own choice each time it is asked.

## ETHER-PLACES - the isles' towns and ruins

A port isle's and a ruin isle's centre pixel stands a PLACE (`synthesizeEtherLocation`): a NON-MUTATING clone of one of
the game's own places (the spawned dungeons' law, `world/spawnedDungeons.js`), with

- **its id**: ETHER_PLACE_SALT (0xE7) in the high 12 bits - apart from the spawns' 1, the zone halls' 7, the Ocean
  Holes' 0x600 and the Abyss Dungeons' 2049 and up - and ETHER_PLACE_BASE (500,000) plus the cell's own number in the
  low 20: past getMapPixelID's ceiling, so no place of the sea shares an id (a discovery, a dungeon's room, a save's
  key) with one of the Bay. The map row's, the exterior's and the dungeon header's ids are all it.
- **its location index**: its own negative (-(1000 + the cell's number)) - the questors' pool keys on it (two places
  sharing a spawn's -1 kept the first one's pool) and the layout pins' location key stays apart from every real one.
- **its name**: the isle's; its region ETHER_REGION's index, politic and name - its region's own, Betony's (AUDIT
  CAPTAIN'S SEA P8: "the Etheric Isles" named no region, and a guild's local job threw on its first tick; the quests
  find an isle's place in the index it stands in); its climate the isle's (`getWorldClimateSettings`); its longitude and
  latitude its pixel's (MapsFile's own law round-trips any integer pixel); its exterior's map id and its record's header
  id its own (P12).
- a port's exterior answers a harbour by its kind (`portTownAndUnknown`: a port's 1, a ruin's 0 - P10: a ruin kept its
  template's port byte); a ruin in the Deep Aether or the Abyss is ELITE (ELITE_BANDS - dungeonContext.js's three foes
  a marker, each twice as hard).
- never `spawned`: no clock, no expiry, no nearby announcement - an isle's place stands for ever - and never a spawn's
  template (`!l.ether` - P3: a session that stood ruins past the Veil first cloned other templates than its party).
- its houses no deed's: never for sale, never owned by a house of the same key in Betony (`houseOwnedAt` - P9).

**THE TEMPLATES** (`etherTemplates`, kept at boot off the classic rows - HUB1's law, the game's own rows as MAPS.BSA
holds them, so a client's town pack never moves what an isle stands; read before the rows are let go): towns -
hamlets and villages of TOWN_BLOCKS.port (2 - 6) blocks; havens (Veilhaven's) - hamlets and villages of
TOWN_BLOCKS.haven (6 - 12: AUDIT CAPTAIN'S SEA P1 - MAPS.BSA's villages are 2 or 4 blocks and its cities 30 and more,
and the "villages and cities of 6 - 16" the list read was always empty, Veilhaven a 2 x 2 village); neither a
main-story place nor one with a dungeon under it, never a spawn nor an isle's own; ruins - dungeons with blocks and an
exterior, one block where any is. Each list in map-id order; an isle's pick off its own hash (`etherTemplateOf`).

**THE BUILD** (`scenes/world.js`): `_locationToBuild` answers an Etheric pixel from `etherPlaceAt` alone - the place
the isle's centre stands, stood in the location index once (a building's door, a quest's local site and a save's
records read it there), or nothing. The Overworld's far reads never clone a spawn past the Veil (`tvLocationAt` -
spawnedMapId's law is the Bay's and throws there). Saved inside a ruin, offline the load rebuilds the pixel and the
same place stands (its door matched by its header's id); online - where a load never puts a character back inside a
dungeon - the sleeper wakes at the ruin's own door (the region's search would read the Alik'r's past the map). A death
past the Veil rises at the nearest port isle's town (`etherRisePort`, ETHER_RISE_PX - P4: Betony's temple a crossing
away), and no cemetery of the Bay's takes a vampire there. No teleport crosses the Veil - Recall, a portal stone, the
Mages Guild's, a party's travel to its leader are refused across it (`veilRefused` - P6) - nor does the Fleet: no
Summon to the far side, no Send away from it, a ship laid up keeping her side (`veilApart` - P5).

## ETHER-PORTS - the freeports

A port isle answers as a port everywhere the Bay's ports are asked (`etherPortAt`: the isle's centre pixel;
`etherPortNear`: within a pixel): Come Sail Away's deeds and placing (`csaIsPortTown`), the naval host's waters
(`navalNearPort`, `navalPortHere` - `{ key, name, px, py, region, crown: null, ether: true }`), and the HARBOUR BOOK
(`navalHarbourNear` - its town's rectangle, the harbour sounded off the terrain as any port's, its quays laid by
QUAYS' law). No crown's: the harbour office's crown's tab stands none there, and THE FREEPORT'S HARBOURMASTER
(`etherHost.office`, `ui/navalYardWindow.js etherOfficeText`) is the tab instead - the port's waters, every legend's
rumour as the quay's talk (each legend then on the captain's chart - `hearLegend`), and a chart of its waters for sale:
every isle within CHART_BUY_PX (40) charted, at CHART_BUY_PRICE 150 gold and 75 a band deeper. THE EXCHANGE is
CAPT-TRADE's own: an Etheric port makes the three Etheric goods (cheap, a day's stock of 30) and wants every good of
the Bay at EXOTIC_K - and every port of the Bay wants the Etheric goods at EXOTIC_K. A crown's favours (the yard's
discount, the hands') are none past the Veil (`waters` answers no crown there). A freeport's quay moors the isles'
traders - never a Bay crown's navy (D4).

## ETHER-SHIPS - the sea's traffic, and no crown's law

**WHO SAILS** (`navalDirector.js`, `ctx.ether`): corsairs (the pirates' classes) and the isles' traders (the
merchantmen's) by the band's weights (`etherFactionWeights`: 30 times the band's `pirate`, 45; a port's waters
ETHER_PORT_WEIGHTS - traders 30 more, corsairs halved); every class the band's `level` levels over the captain's own; a
pair already at it only a corsair on a trader; no relief, no hunters - no crown's navy sails past the Veil. Every spec
carries `ether` (its band), and a ship launched there - or another's met there - wears the sea's names
(`etherShipNames`: ETHER_PIRATE_NAMES and ETHER_MERCHANT_NAMES, two words of each trade's own - 256 a trade, AUDIT
CAPTAIN'S SEA D20: sixteen moored two ships of one harbour under one name - on their own stream, her captain the Bay's
own law's) and colours (`etherFlagOf`: a trader the Isles' - "the Isles' merchant colours" through the glass - a corsair
the black flag; a corsair under false colours the Isles' too, D5), and a corsair the band's boldness (30%, 45%, 60%,
80%). Every hold there is the band's `tier` tiers richer
(`etherTier`) and every cask the deep's (CAPT-WATERS' DEEP_TIER).

**NO CROWN'S LAW** (`chargeEther`): a ship of the sea ended - fired on, sunk, taken - is no crime, no notoriety, no
crown's regard; the log keeps her by her trade ('ether'), and a contract's end event says no crown. A prize taken
there answers to no crown: burning her papers washes no notoriety of the Bay's ("No one hunts you in these waters" - D3:
the nearest Bay capital's waters were read for her). A corsair's papers
hold a chart of her waters on PAPERS_CHANCE (a quarter) of her seed's own stream: every isle within PAPERS_PX (30)
charted (`etherHost.papers`).

**THE STRANDS** (`etherHost.sites`, `gather`; the naval host's sites): a wild isle within HARVEST_REACH_PX (1) of the
ship is a site of kind `strand` - "Your boat pulls in to the strand and back out with its haul" - and HARVEST_CASKS (3)
casks float out alongside her: STRAND_ALONGSIDE_M (40 m) off the boat that pulled in, on open water, each cask on open
water (`alongsidePos` - AUDIT CAPTAIN'S SEA D2: they went 700 m off on no bearing of the isle's, some on its beach),
never again while they float (D1: each return to its reach floated three more), each STRAND_YIELD of the isle's good by
its band (2, 3, 4, 6); hauled (`pickStrand`), into the hold of the boat that sailed through it - a swimmer breaks his
open in the water, into his pack. A strand is bare HARVEST_DAYS (7) from the first cask hauled (a later cask never
pushes it on - D1).

## ETHER-LEGENDS - six legendary ships

| legend | captain | class (hull) | band | terror (`trait`) | purse |
|---|---|---|---|---|---|
| Sorrow's Wake | Ysolde the Unmourned | Legendary Brigantine (Small Ship): hull x1.8, 9.4 m/s - the swiftest hull afloat | the Reaches | swift | 2,500 |
| The Drowned Queen | Maraveth, Thrice Drowned | Legendary Carrack: hull x2.4 | the Reaches | mends - LEGEND_MEND_PER_S (0.4%) of her hull a second while no ball has struck her for LEGEND_MEND_QUIET_S (8 s), her fires out first | 3,000 |
| Ninefold Hunger | Ghorvak Ninefold | Legendary War Galley: 120 hands, 45 boarders | the Deep Aether | boarders - her first wave thrown back, half her hands come over the rail again (`winBoarding` - AUDIT CAPTAIN'S SEA D10: clamped like any flagship's, the terror did nothing) | 5,000 |
| The Lantern-Eater | the Hooded Pilot | Legendary Brigantine: hull x2, skill 0.9 | the Deep Aether | night - abroad between dusk and dawn alone: day come, she sails out of the world once no fight holds her (D17) | 5,500 |
| The Pale Regent | Lord Aumbrel the Pale | Legendary Carrack: hull x3.2, skill 0.95 | the Abyss | gunnery - her guns load in LEGEND_RELOAD_K (0.7) of a carrack's time (`createSeaShip`'s `reloadScale` - D11: the constant had no reader) | 9,000 |
| The Starless | no one living | Legendary Carrack: hull x3.6 | the Abyss | veiled - made out at LEGEND_VEIL_K (0.35) of every reach: the eye's, the lookout's and his hail's (D13), the glass's | 12,000 |

**THEIR CLASSES** are navalShips.js's own, after the nine (`legend: true`, a pirate's faction, never a flagship, no
weight, `minLevel` LEGEND_LEVEL 999): no draw by level ever finds one - `classFor`, the encounters, the board's
bounties, the raiders - and no hull's fighting range (`rangeOfHull`) moves. The wire carries them as any class.

**THEIR HAUNTS** (`hauntOf`, off each legend's own hash): a reach of HAUNT_PX (36) pixels about a centre in her band's
depths (HAUNT_PX inside its bounds; the Abyss's ABYSS_HAUNT_LEAGUES 120 deep), within HAUNT_SPREAD of Veilhaven's row
(60, 160, 320 pixels by band). Sailing her haunt (`legendAt`), while she sails (`legendSails`: never ended, or ended
LEGEND_RISE_DAYS - 30 - ago: the aether raises her) and is abroad (`legendAbroad`), a roll of the sea's traffic launches
her on LEGEND_CHANCE (0.3) of her own LEGEND_SALT stream - before anything else the roll would launch, on the spawn ring
with her bow on the captain - bold, said: "The sea goes still. A sail on the horizon: ...", to every captain whose sea
she comes into, a party's other captain too, once while she is in it (D12). ONE LEGEND AT SEA: never while any legend
sails in the sea - at any range, any stander's (`ctx.legends` - AUDIT CAPTAIN'S SEA D7/D14: two captains apart in her
haunt each launched her, and the Wake's and the Queen's haunts overlap) - and never by a freeport's quay (SEA-EASE's
`nearPort`); two standers' copies of her met, the stander law's claim holds her (`claimBeats`): the lower id's stands,
the other sails out of the world. Where two haunts reach a pixel, the nearer's (`legendAt` - H7). Her glass card's lore
is her own.

**HER END** (sunk or taken): every crown hears of it (the ledger's LEGEND_STANDING, 10 with each, the first time she is
ended), her name in the log, her purse paid (`legendEnded` - only while she sails by this captain's own ledger: D6,
another's copy of her paid it again and pushed her rise back), her day kept (she rises again a month on), and her hold
the richest at sea: her class's cargo 4, the band's tiers, and her last LEGEND_STRONGBOXES (2) lots her captain's
strongboxes (`navalPlunder.js strongboxesOf` - D15: a flagship's one beat her plunder).

**THE RUMOURS** (`rumourOf`, a freeport's harbourmaster; the way one of sixteen points, `compassPoint` - the chart's own): "The Drowned Queen has been seen some 40 leagues
west-south-west of here." (one league "a league", under half of one "hereabouts" - G12/D21; the Lantern-Eater "By
night."); ended: "...went down 3 days ago; they say the aether will raise her again."

## ETHER-CROSSING - the way out and the way home

**ASKED** (`etherCrossStep`, every CROSS_CHECK_S - half a second) at a helm in the exterior with no window up, never
while the world is being moved or a party's arrival waits (X3): OUT in the crossing waters - the enhanced skin's and
online's alone (`etherOut`) - (`crossingWaters`: west of CROSS_X - 230, west of the Bay's mouth (X4) - and
CROSS_LAND_PX - 20 - pixels and more from any land, measured by the map's one water law, `crossLandPx`, asked once a
pixel; never in the sea's box; past the Bay's west edge the Eltheric counts), HOME in the Veil (`crossingWayAt`) under
any skin. A way is asked ONCE each time the ship comes into its waters (`createCrossingGate`) - marked asked when the box
shows (X1: a refusal marked it, and it never came): refused, it is not asked again until she has left them. An enemy
near or another player aboard is said instead, once while she stays in those waters ("Not with an enemy at your
heels." / "The Veil is no place for passengers..."), and the question asked as soon as the deck is clear. YES IS THE
QUESTION AS IT STANDS NOW (`crossYes` - X2): a load, another helm, the waters left, an enemy or a passenger since - said,
no voyage, asked afresh (CROSS_STALE); the box is taken back at a load or a jump (`withdrawCrossing`), and a way out
kept is never one in the sea (`captainLedger.js wayOutOf`).

**SAILED** (`etherCross`): the way out remembered (the ledger's `setCrossedFrom` - the Bay's pixel she sets sail from);
the screen black; the helm let go - she lies where she is; the jump - a travel (`modEvent: 'travel'`: the seasons'
post-travel step, the Overworld's) of CROSS_DAYS (3) to the landfall (`crossingTarget`: out, open water
LANDFALL_OFF_PX east of Veilhaven, her bow west on it; home, the waters she set sail from, else HOME_WATERS - the open
Abecean off the Bay's mouth, pixel 180, 300) whose arrival brings her round onto the landfall pixel's middle where she
floats (`RepositionBoat` - her crew, her hold and every rank of her hands aboard her) and stands the captain on her
deck; the days on the clock; her helm taken again; the crossing counted; out, Veilhaven charted; home, the gate left
asked (she comes out in crossing waters, and is not asked out again at once). Come Sail Away is held paused while she
is carried across (`_etherCrossing`, as a party's arrival holds it). A voyage that cannot be made brings ship and
captain back where they set out, at her helm, the way out as it was (CROSS_FAILED - X9: her helm was let go).

## ETHER-CHART - the chart of the Etheric Sea

Past the Veil the travel map's door (`toggleTravelMap`) opens the captain's chart (`ui/etherChartWindow.js`, the naval
windows' door's third slot) - the Bay's travel map has no sea there to show, and nothing on the chart is travelled to.
On a canvas: the sea, darker to the west; the BANDS' bounds and names - each named on its own deeper side, the Shallows
by the Veil (X12); THE VEIL down the east edge, "to the Iliac Bay"; the HAUNTS of the legends heard of (the square a
haunt is - X13 - red while she sails, grey and "(sunk)" while she lies sunk); the ISLES CHARTED (a port gold, a ruin red,
a wild isle green, a rock grey - a port named at any zoom, the rest from x8, never a name lettered over another, ports
first: LABEL_CHAR_PX, LABEL_H - X14); the SHIP and her heading at her helm (the boat's, never where the captain looks -
X16). Zooms x1 - x16 (CHART_ZOOMS): the wheel about the pointer, a step each CHART_WHEEL_STEP of its travel (X18);
+ and - (the keys and the chart's own buttons) about the centre (`chartZoomAt` keeps the point under it - H17); a
pinch of CHART_PINCH_STEP.
A drag or the arrows to pan (`clampChartView` keeps the view over the sea), the drag ended however its press ends (X7);
C or the Ship button back to the ship; the key that opened it (Travel Map's or Automap's binding) or the back key to
close (X8); a pointer on an isle, or a tap of under CHART_TAP_PX, says it: "Port Pelleveth - a port - 12 leagues
west-north-west", a name opening the line raised (X17) - X6: a finger and a pad had no zoom and no note. A load or a
jump shuts it (X15). The header: isles charted, the deepest a captain has gone, the crossings, the legends ended.

**CHARTING** (`etherHost.sight`, the world's office tick, every 2 s in the sea's exterior): every isle within SIGHT_PX
(3) of the ship's pixel is charted the first time ("Land ho! Port Pelleveth - a port. It is on your charts."; Veilhaven,
the landfall, is charted at the crossing itself - H19) and counted in the log's `islands`; the deepest a captain has
gone is the log's `deepest`. A freeport's chart and a corsair's papers chart more - a freeport's never past the charts'
room, ETHER_CHARTED_MAX (X5: the gold was taken for nothing); a harbourmaster's rumours are heard (their haunts charted)
where his tab is shown (X11). The helm's plate says "The Veil" in the Veil itself (D19).

## ETHER-LIGHT - the light past the Veil

Both of the frame's lights lean, past the Veil, to a cold violet (`etherLight`: the ambient to ETHER_LIGHT_TINT 0.88,
0.9, 1.14; the sun to ETHER_KEY_TINT 0.95, 0.93, 1.07), outermost of the chain (after the dread's, the sun baby's and
the brass's). The sky's dome is the world's own: a fog or a dome graded apart met the sky a step apart at the skyline
(AUDIT SD III V8's finding), and the lights touch neither. Nothing is made while nothing leans (the light handed in
handed back, sdBrassLight's law).

## The ledger's record

The Captain save (CAPTAIN_SAVE_VENDOR, still v1 - a record without it reads as none) keeps `ether`: the isles charted
(their cell keys, ETHER_CHARTED_MAX 4,096, the first kept), the legends ended (their days), the strands gathered (their
days, the newest ETHER_HARVEST_KEEP 128), the way out (never one in the sea - X2), the crossings, the legends heard of.
Restored field by field, a junk entry dropped and the rest kept. Its days are the world's online and the character's
clock offline: Copy to offline and Bring online move them by the days between the clocks (`offlineCopy.js` - AUDIT
CAPTAIN'S SEA L4: a copy taken offline found a legend sunk for months). The log says "Etheric isles charted", "Deepest Etheric waters - N leagues past
the Veil", "Legends ended"; its trades count 'ether' and 'legend' ships.

## Recorded departures and readings

- **Infinite, read honestly.** The sea is a pure function of its pixel - its law answers its box and ETHER_MARGIN round
  it (AUDIT CAPTAIN'S SEA G13/H18: "unbounded in law" it is not) - and the stream's box is 6,600 by 4,100 km of it: more
  than a thousand leagues west of the Veil, some ten hours of real time at the helm's top speed.
  Past it nothing streams (the world's edge). The wire's pose bound, not taste, set its north.
- **The region is Betony's** for every system that asks one (quests, law, prices, names); only the place words say
  "the Etheric Sea". A quest given on an isle may send a captain back across the Veil.
- **A place's name may repeat** across the sea (sixteen thousand roots): two places of one name share an automap and a
  building's discovery. At fifty places charted, about one captain in twenty meets it (G11/P11 - measured; "one in
  fifty" was not).
- **The light, not the sky.** The dome, the clouds and the fog are the world's own past the Veil; a grade of the sky's
  four passes (as the brass's) is a later slice's.
- **No Deep Waters bathymetry of its own.** The sea's floor is the kernel's water; Deep Waters' promotions are the Bay's.
  TAMRIEL2 held the near promote alone, and the pump's deferred builds still carved the sea's floor: a player went over
  the side, stood on a seabed under the drawn surface and could neither swim nor float back to the ship (ETHER-HOLD,
  from play, 2026-10-11). The host's one `promote` now answers nothing for a pixel past the Bay's 1000 x 500, so every
  arm is held (`deepWatersHost.js:"function promote(pixel) {"`; test/ethersea_dwhold.test.js).
- **Online**, the crossing is each player's own; a party is not carried across together, and a player aboard another's
  ship holds the crossing back.

## Pins

`test/ethersea.test.js` (15): the box (the wire's bounds, positive units, clear of Tamriel's frame at every fit), the
Veil and the bands, the hash, the isles (the chance, the kinds' weights and ranges, every isle's land inside its cell,
the cache), the open edge and strip and Veilhaven, the names, the ground (the fall, the noise, the detail, the climate's
reach, the map's water law), the composition (every arm), through the kernel (dry places, the landfall's water), the
crossing's waters, the goods, the stream's frames, the far ring's `climatePast`, by source (the host's composition and
order, the worker's word, the module's purity), the light. `test/etherplaces.test.js` (7): the id's lane and base, the
index, the templates' filters and order, the pick by kind, the clone field by field, the host's seams, the ports'
seams. `test/ethership.test.js` (10): the six legends kept out of every draw, the names and colours, the weights, the
haunts, the rumours, the director past the Veil (no navy, no relief, the pairs, a legend's chance and her one), at sea
(names, colours, no crime, the log's trade, the purse, the papers, the plate), the mend and the veil, the strands, by
source. `test/ethercross.test.js` (10): the ways and the gate, the voyage's targets and words, the crossing by source
(each step in its order), the ledger's record and its log lines, the host's waters and charting, the strands, the
legends' host (rise, night, purse, the chart's sale, the papers' chance), the chart's sums and model, the doors.
PIN MOVED: `test/nav_c_ships.test.js` (fifteen classes, nine drawn), `test/tougherships.test.js` (the legends'
salvage), `test/terrainworker.test.js` (the worker's imports), `test/tamriel2.test.js` (the ring's bytes past the map),
`test/auditlandforms.test.js` and `test/tv8_party_walk.test.js` (the far read's guard), `test/csa_close.test.js` (the
crossing's pause), `test/seasonsIliacBay.test.js` (the crossing a travel), `test/sd19_presence.test.js`, `test/event1_live_event.test.js`,
`test/sunbaby1_event.test.js`, `test/sunbaby2_phases.test.js` and `test/wbx8_gate_sky.test.js` (the lights leaned once
more), `test/fb0929h_deedport.test.js` (the port test past the Veil - an isle's port is a port for the deed),
`test/fb0929h_spawnplate.test.js` and `test/spawneddungeons.test.js` (the build past the Veil),
`test/sd2d_castout.test.js` (an isle's ruin wakes at its own door). `test/fixtures/time1_census.json` names the new
clock readers: the Etheric host's day on the event clock, the crossing's arrival on the sky
(`bible/06-Systems/Online-Time-Arc.md` 5.2). Mutants `tools/mutants/ethersea.json`,
`tools/mutants/etherplaces.json`, `tools/mutants/ethership.json`, `tools/mutants/ethercross.json`.

AUDIT CAPTAIN'S SEA: `test/auditcaptsea.test.js` (68) holds the audit's findings, the sea's among them - the ground
(G1-G14: the margin, the switch split and the unstreamed landing, the isles' own lands, the ring's climate, water,
plates and fade, raids, the World of Daggerfall pick, Masser's key, the compass's words), the places (H1, P1-P12: a
harbour at every port, the game's hamlets for the haven - against the player's own data, ARENA2_PATH - the spawns,
the rise, the Veil's refusal, quests, deeds, the port gate, the Fleet's side of the Veil, the exterior's ids), the
crossing and the chart (X1-X18), the traffic and the legends (D1-D21) - in `tools/mutants/auditcaptsea.json`. Its
fixes moved pins in `test/ethersea.test.js` (the margin 64, the port isle's land, the mouth, the climates),
`test/etherplaces.test.js` (the havens, the ruin's port byte, the spawn filter, the quest region), `test/ethership.test.js`
(H7's tautology), `test/ethercross.test.js` (the refusal, the move, the way back, the hearing, the bands, the heading),
`test/moonlight.test.js` (Masser's key), `test/raid1_raidingParties.test.js` (no province past the Veil),
`test/audit_wod_branch.test.js` and `test/gateclear.test.js` (the pick the Bay's), `test/portal1_stone.test.js` (the
Veil's refusal), `test/travelmap.test.js` (the landing before the build), and P9's deed in eleven house suites; the
page names each.

**Not verified here:** the look and feel in a real browser (the isles on the horizon, the chart, the light), a crossing
end to end in a running world (its jump, the ship brought round, the stream past the Veil), a town's buildings and a
ruin's halls entered on an isle, and online play past the Veil.
