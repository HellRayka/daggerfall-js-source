# FIELD BUGS 2026-10-14 - threads from the bug-reports channel

Discord threads from 2026-10-13 and 2026-10-14, handed over as screenshots, read on the code as it stands at main's
`e150f6ce`. Each is traced on the real modules first; the fixes are pinned one to a tag.

| | Report | What it was | Done |
|---|---|---|---|
| 1 | "Crash at Carpentry" - "Daggerfall: Newtower, cant interact. If try to access through Esc- Store get crash" (BioGud); "Same here, crashed trying to load the crafting bench" (a second player) | MENU-ORDER's station tiles asked each away station whether it held the pressed station's head with `children.some`; a browser's `children` is an HTMLCollection, with no `.some` - the press threw before it was spent, and every later Stores page threw with it | fixed (STORES-CRASH) |
| 2 | "Inns with this room layout can't be used to sleep" - "No prompt to rest or loiter when clicking the beds" (Mona Polca) | the interior builder listed a bed only when its placement was a prop (ObjectType 3), furniture's gate; a bed written as scenery - a dormitory's, a ship's bunks - was never a click target | fixed (INN-BEDS) |
| 3 | "Crew morale LIES sometimes between fleet window/shipwright and the helm!" - "Let me give them MORE grog!" (Cruor) | the yard's grog row wants no round once the day's is drunk, and the window read that as a crew at the top: "as high as they go", "No need", over a crew the helm called low | fixed (GROG-WORD) |
| 4 | "Bugs envolving configuration and enchantments" - "my 'Repair items' enchantment is not repairing anything" (Arbeck; the same thread's lifesteal and Look Around are below) | MEND-WORN's order mends the worn piece with the lowest share first, and a worn piece that wears itself on the same round (Cast When Held, Item Deteriorates) took +1 and -1 every tick: it stayed first and nothing else was mended | fixed (MEND-STARVE) |
| 5 | "Possible bug: Repeated ..." - "I was stopped by the guards and paid a fine of 560 gold. After that, I was stopped again and had to pay the same 560 gold, even though I hadn't committed any new crimes. Now it's happening for the third time" (Dweme...) | REP1 as designed: the fine bought a day's grace (about two real hours online) and nothing else, so the standing that stopped the player stopped them again for the same sum; the box's other two answers net nothing either | changed (FINE-MENDS), Mac's call |
| 6 | "my off-hand weapon is not having its lifesteal, unless i switch hands (but it was working fine 2 days ago)" (Arbeck) | the port has no dual wield: a weapon's leech heals on its own blows (`lootPowers.js` lootStrike), and the off hand strikes only once H switches to it; nothing on that path changed in the two days (BAL7's 10% cap, 2026-10-12, lowers a leech summed past it) | the card says so (LEECH-HAND), Mac's call: per hand |
| 7 | "the 'Look Around > With secrets' config is not even showing anything" (Arbeck) | not reproduced: nothing on its path changed since 2026-10-10 and its suite passes; it lights only in a dungeon, on an Info ask (F3 or the wheel's Info), within 8 m and in sight - and a thick secret wall can hide its own glow card | asked of the player |
| 8 | "Gold appears when I'm trading but not in my inventory" - "After I went to sleep my character lost 5000 of gold" (Soda_do_macaco...) | not reproduced: the trade window's figure, its refusal and its payment read one count (coins and letters of credit); the inventory's footer counts coins alone, and a payment spends letters first, so a 5000 letter spent leaves the coin figure where it was | asked of the player |
| 9 | "Mountain clipping and invisible" - "Mountain is invisible and you can go through it and get stuck" (BigOOF) | a video, no place named | asked of the player |
| 10 | "Daedra Summoning bugged" - "Summoned Hermaeus Mora at the Mages Guild online, paid 100k. No video, no offer, no message. The save now has Hermaeus Mora (faction 8) flags = 65 (Summoned set), and quest W0C00Y00 is not among the active quests"; then "trying to summon Mora in the Dak'Fron region - which does not meet the requirements for the quest" | DFU's own order: the gold spent and the Summoned flag set BEFORE the prince's quest is made, and a quest that cannot be made there (W0C00Y00 wants a palace in the region) offered nothing and said nothing | fixed (SUMMON-OFFER); the stuck save mended by staff (SUMMON-REPAIR) |

## STORES-CRASH: the Stores page walks a station's nodes as the browser mints them (1)

`src/ui/profPages.js` holdsHead (drawStationTiles).

THE REPORT. Two players at Newtower's Joinery (CARP-YARD): the bench's press crashed the game, and so did Esc, Stores,
after it. The crash box's stack: `TypeError: ((intermediate value) ?? []).some is not a function`, at the Stores page
(`stores`, under the pause's `holdings`).

FOUND. The Joinery's bench lands the Stores page on its Workbench (`focusStoresStation('workbench')`, STATION-DOOR's
landing). MENU-ORDER (#872, merged 2026-10-13) tiled the stations, and for each station the player is away from it asks
whether that station's box holds the pressed head, so an away station pressed is the one shown: `holdsHead` walked the
box with `(node?.children ?? []).some(...)`. In a browser `Element.children` is an HTMLCollection - indexed, iterable,
a length, and none of Array's methods - so the first away station (the Forge, at a joinery) threw. The Workbench, fourth
in the list, never drew, so its head never spent the press: `_storesFocus` stayed `'workbench'`, and every Stores page
drawn after it threw the same way until the game was reloaded. A home's alchemy and enchanting stations (STATION-DOOR's
own presses) threw the same way. The suite was green because the fake document's `children` are arrays; the walk beside
it, `stationWorkable`, already walked by iteration for exactly this reason.

FIXED. `holdsHead` walks by iteration, as `stationWorkable` does. Pinned by `test/fb1014_storescrash.test.js`, which draws
the page through its own draw on nodes whose `children` are shaped as the browser mints them; the old walk fails it with
the player's own message (`tools/mutants/fb1014_storescrash.json`, 1, dead).

## INN-BEDS: a bed is a bed whatever its ObjectType (2)

`src/scenes/interiorContext.js` buildInteriorContext (the placements loop).

THE REPORT. A tavern whose room is a dormitory - beds between wooden partitions - offered no Rest or Loiter on any bed.

FOUND. The builder lists the room's beds (RR1, Roleplay Realism's BedActivation on models 41000-41002) inside the
furniture chain, and AUDIT 64 F17 put that chain behind DFU's prop gate (`DaggerfallInterior.cs:500`,
`ObjectType == propModelType`) - so a bed written with another ObjectType never entered `beds`, and no `bed:` target was
built for it (`worldModes.js` interiorTargets). DFU's gate is furniture's actions (containers, shelves); a bed is a mod's
custom activation, keyed on the model id alone (`RoleplayRealism.cs:126-128`), and DFU stands a custom-activation model
on its own whatever its ObjectType (the CombineRMB note in the builder). Of the 39 bed placements in the vendored world
data, 34 are ObjectType 0 and 4 are ObjectType 4 (Roleplay Realism's RRFORT01, Detailed Ships' two cabins); the
reporter's building could not be read here (no ARENA2), and the dungeon builder already lists its beds with no ObjectType
test (`dungeonContext.js`).

FIXED. A bed model is listed before the prop gate, whatever its ObjectType; the furniture chain stays the prop's.
Pinned by `test/fb1014_innbeds.test.js` (`tools/mutants/fb1014_innbeds.json`, 1, dead).

## GROG-WORD: the yard says a crew's spirits as the helm does (3)

`src/systems/naval/navalYard.js` provisionOffer; `src/ui/navalYardWindow.js` yardText.

THE REPORT. The shipwright's window (opened at a port or from the Fleet page) and the helm disagreed on the crew's
spirits; the guns reloaded slow while the yard would sell no grog.

FOUND. Both read the same `crew.morale`. The yard sells one round a port day (AUDIT CC-D5), so its grog row wants none
(`missing` 0) once the day's is drunk - the same 0 as a crew at 100 - and the window read only that: "Her crew's spirits
are as high as they go", its press "No need", over a crew of 40 the helm called low (`shipCrew.js` spiritsOf), whose
reload is slower under 50 (reloadScaleOf). A round lifts 15 and the sea takes a point every 150 seconds, so for the rest
of that day the two said different things.

FIXED. The row says why it wants none (`drunk`: below the top with the day's round drunk), and the window says the
crew's own spirits and that they have had today's round, its press Tomorrow. One round a port day stands. Pinned by
`test/fb1014_grogword.test.js` (`tools/mutants/fb1014_grogword.json`, 2, dead).

## MEND-STARVE: a piece that wears itself is mended last (4)

`src/systems/enchantments.js` repairsObjectsTarget, wearsItself.

THE REPORT. "My 'Repair items' enchantment is not repairing anything" - in the same thread as an off-hand lifesteal and
Look Around's secrets, all said to have stopped two days before.

FOUND. Repairs Objects mends one piece every fourth magic round, MEND-WORN's order (`itemTemplates.js` mendOrder: worn
first, the lowest share of its condition first). A worn Cast When Held piece loses a point on the same fourth round
(CastWhenHeld.cs:27, HELD_DEGRADE_RATE) and a worn Item Deteriorates piece the same (ItemDeteriorates.cs:29). AllowMagicRepairs
is the port's default and forced on online (DISC22-A), so such a piece, once it was the most worn, was mended +1 and worn
-1 on every tick: its share never rose, it stayed first, and nothing else - worn or carried - was mended again.
Reproduced through the round's payloads: a 20% Item Deteriorates helm beside a 99% cuirass, 400 rounds, nothing moved.
It dates from MEND-WORN (2026-10-07). The one change to the target inside the reported two days, AUDIT WAGONS4's
(the small cart and the horse are never mended by it), is intended.

FIXED. A worn piece carrying either row is mended after every other damaged piece; once nothing else wants the tick, the
tick holds it against its own wear, as before. Port-Ledger's MEND-WORN row records it. Pinned by
`test/fb1014_mendstarve.test.js` (`tools/mutants/fb1014_mendstarve.json`, 3, dead).

## FINE-MENDS: a fine paid on the spot mends the name (5)

`src/systems/standing.js` settleChallenge; `src/scenes/standingHost.js` (the stop's P).

THE REPORT. A player in Daggerfall, "a scoundrel - known to the watch", stopped three times for the same 560 gold with
no new crime between, asking whether to stop playing until a fix.

FOUND. No fault in the code: REP1's design (`06-Systems/Standing-Arc.md`). The stop's trigger is the standing alone
(under -10, DFU's line); paying took the gold and granted a day's grace (CHALLENGE_GRACE_MINUTES, on the character's
own clock - about two real hours online at TimeScale 12, a third of it in one inn's night), and changed no standing. The
fine is the court's Conspiracy table at that standing, so the same standing asked the same 560 (-12 to -19). Coming
quietly charges a Conspiracy and the sentence gives it back whole; a standing mends a point a week. A player who read
"pay the fine" as settling the matter was stopped every couple of hours for days.

CHANGED (Mac, asked: "Fine raises standing"). A fine paid on the spot mends the name by a temple penance's step,
PENANCE_POINTS (5), never past the -10 line - the reporter is clear in one or two fines; a name far under the line pays
more fines, each its own standing's price, and the temple stays the way to mend it faster. The HUD's legal notice says
the rise. The grace is unchanged. Recorded in Port-Ledger's REP1 row. Pinned by `test/fb1014_finemends.test.js`
(`tools/mutants/fb1014_finemends.json`, 2, dead).

## LEECH-HAND: the leech line says whose blows it heals on (6)

`src/systems/lootRarity.js` AFFIX_KINDS.leech's label.

FOUND. A weapon's power rides the blows of the weapon that struck (`lootPowers.js` lootStrike, the strike listener's
`weapon`), and the port has DFU's hands, not dual wield: H chooses the hand that swings. An off-hand weapon's leech heals
on nothing until the player switches to it - the rule since LOOT4, unchanged in the reported two days (BAL7's cap,
2026-10-12, lowers a leech summed past 10%).

CHANGED (Mac, asked: "Keep per-hand"). The rule stands; the line says it - "5% life leech on this weapon's own blows",
on the item card, a gem's line and the Reforge. PIN MOVED: `test/loot4_procs.test.js`
(`tools/mutants/fb1014_leechhand.json`, 1, dead).

## Asked of the players (7, 8, 9)

LOOK AROUND, WITH SECRETS (7). `systems/dungeonSense.js`, `scenes/dungeonContext.js`, `render/nodeGlow.js` - none changed
since 2026-10-10, `test/sense1_dungeonsense.test.js` green. The tier lights nothing by itself: an Info ask in a dungeon
(F3 - unbound for a brand-new key file since MODE-WHEEL - or the wheel flicked to Info) lights what is within 8 m and in
sight for six seconds, a chain-moved secret among them, purple and the faintest form (its shimmer nothing under Reduced
Motion). Read on the code and not proven: a secret slab thicker than about 1.2 m hides its own glow card, planted at the
box's floor centre and pulled 0.6 m toward the eye. Asked: where, how the ask was made, and Reduced Motion.

GOLD IN TRADE (8). The trade window's "Your gold", its refusal and its payment are one hook (`worldModes.js`
openTradeWindow's `gold`, totalGoldAmount: coins and letters of credit). The inventory's footer counts coins alone, and
deductGold spends letters first - a payment past the coins (an Empire call at joining, a fine) spends a letter and the
coin figure does not move; the bank, the wagon's coin and a quest's gold stack in the pack are counted by no shop. Nothing
on the rest path takes gold but a death (a tenth) or an overdue loan's draw. Asked: the footer's two numbers, the line
seen on waking, and the Wallet's letters.

THE MOUNTAIN (9). A video, no place named. Asked: the place (the map's name or pixel).

## SUMMON-OFFER: a summoning whose quest cannot be made here spends and records nothing (10)
`src/systems/daedraSummoning.js` attemptSummoning, noQuestText; `src/systems/quest/offerFlow.js` offerNamedQuest;
`src/scenes/worldModes.js` (the summoning service's Yes, `summon`). Read at main's `7c291d36`, handed over after the
table above.

THE REPORT. At a Mages Guild online the player named Hermaeus Mora (SUMMON-NAME, `06-Systems/Online-Waits.md` WAIT3) and
paid 100,000 gold. No film, no offer, no box; his save holds faction 8's flags at 65 (FACTION.TXT's 0x01 and Summoned,
0x40) and no W0C00Y00. Then: the summoning was made in Dak'fron, a region without what the quest needs.

FOUND. The port did what DFU does. ConfirmSummon_OnButtonClick (DaggerfallQuestPopupWindow.cs) spends the gold before
the rolls, and for a prince not met before sets the Summoned flag and only then asks `QuestListsManager.GetQuest` for
his quest, pushing the summoned window only `if (offeredQuest != null)`. GetQuest answers null whenever the parse throws
(ParseQuest swallows every exception, QuestMachine.cs), and a remote Place or Person that finds no site in the player's
region is such a throw (Place.SetupRemoteSite, "Search failed to locate matching remote site"). W0C00Y00 holds `Place
_palace_ remote palace`, as Mephala's Z0C00Y00 does; the other fourteen want dungeons (a missing numbered kind falls
back to any) and three of them a tavern. The port's parse (`machine.js` parseQuestForLists) and its remote search
(`place.js` _setupRemoteSite) are DFU's, and `offerNamedQuest` answered the null quest with a silent `{ kind: 'close' }`
step, so the host's box chain drew nothing. With the flag set, every later summoning of him is the greeting arm, record
482 ("You have summoned %dae once ... Go away"), at full price - his quest is never offered again. SUMMON-NAME let a
player call him from any region on any day; DFU's own day (65) had the same hole in a region without a palace.

FIXED (a departure, Port-Ledger section A SUMMON-OFFER; Mac on SWIM-SPENT: "I dont care about DFU. We're our own thing
now"). The quest is asked for where DFU asks - after the rolls, for the prince who answered (Sheogorath's, when he
gatecrashes), never for one met before or on a missed roll - but inside the decision, through `offerQuest`, and the
decision is its step's: `offerNamedQuest` answers null, not a step, when no quest can be made, and `attemptSummoning`
answers `noQuest`. The host returns that box before `deductGold` and `setFlag`: no gold spent, the prince not recorded,
and the summoner says it (`summon.noQuest`, drafted in the 25 languages): "Hermaeus Mora answers, but has no task for
you in this region. You keep your gold - try the summoning in another region." Every other outcome is DFU's, paid as
before: a missed roll (a coven's reprisal with it), the prince met before, the quest offered on his film. The quest is
made once a summoning: the host's second ask, after the gold, is gone, and with it the "%dae answers your summons" box
of a quest arm that had no offer. Pinned by `test/fb1014_summonoffer.test.js`, which makes W0C00Y00 through the real
bridge in one crafted region with a palace and the same region without one; on the old law all four of its tests fail
(`tools/mutants/fb1014_summonoffer.json`, 10, dead).

THE FOUR HOSTS. `scenes/worldModes.js` - WIRED: the summoning service is the interior host's (the guild's, the temple's
and the coven's popups open it), and the fix is its `summon`. `scenes/world.js` and `scenes/exterior.js` - WIRED through
it: each builds its interiors with `createWorldModes` and hands it its quest bridge, so a summoning in a building of
either street host is that one arm. `scenes/dungeonContext.js` - FLAGGED, nothing to wire: a dungeon stands no summoner
(no guild popup, no coven), so no summoning is made there. Pinned by source in `test/fb1014_summonoffer.test.js`.

THE PLAYER'S SAVE - SUMMON-REPAIR (2026-10-15, acct133; Mac, asked: "Operator tool"). The fix stops new cases; it does
not mend a save that already holds the flag. Nothing in a save tells this flag from a summoning whose offer the player
refused - DFU sets it either way and never clears it (`factionRep.js` setFlag: OR only), and a refusal leaves no record,
so a load-time repair that clears Summoned where the prince's quest is not live would hand every player who refused an
offer a second one. Staff mend the one character instead: the review's `realm-repair` act
(`server-account/src/review.js`, `src/net/repairLaw.js`; `06-Systems/Integrity-Arc.md` INT6) clears one of FactionFile's
flag bits on one faction of a realm character's record and gives gold back as a letter of credit, once a ticket, behind
the developers' list like every review act and written among the character's findings. It refuses a faction the record
does not hold, a bit that is not set (a character that never summoned him), and a prince whose quest the record holds
live or finished (a summoning that worked - Mac: "Refuse if quest active/done"). It cannot tell an offer the player
refused from this bug - neither leaves a quest - so the report is what names the character. The record is seized one
sequence on, the rollback's way: the tab playing it cannot write over it, and its next join plays the mended record.
Pinned by `test/fb1014_summonrepair.test.js` (`tools/mutants/fb1014_summonrepair.json`, 22, dead). For the reporter,
once acct133 is live, signed in as a developer (DAGGER_HANDLE and DAGGER_PASSWORD), the first command naming the
character's id for the second:

```sh
node tools/realmReview.mjs characters sucean
node tools/realmReview.mjs repair <the id it names> fb1014-summon-offer 8 0x40 100000 "SUMMON-OFFER: Hermaeus Mora summoned in Dak'fron, W0C00Y00 could not be made"
```
