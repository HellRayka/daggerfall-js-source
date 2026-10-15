# FIELD BUGS 2026-10-14b - "Multiple enemies cannot pass through a doorway"

A thread from the Discord's bug reports, 2026-10-14, handed over with its screenshot: a dungeon corridor's wooden door
frame, several humanoid foes standing in it and none of them coming through. Read on the code as it stands at main's
`7c291d36`, and measured on the real ARENA2 (the freeware DaggerfallGameFiles, `tools/fetch-data.sh`, outside the tree).

| | Report | What it was | Done |
|---|---|---|---|
| 1 | "Multiple enemies cannot pass through a doorway at the same time because their hitboxes collide" | a foe's capsule is its idle sprite's height, and a Mage's, a Healer's, a Spellsword's, a Lich's and a Daedra Lord's are taller than nine in ten of the dungeons' doorways; DFU ducks such a foe under the lintel (EnemyMotor.HeightAdjust), and the port had never ported it - so each one walked into the lintel for good, and the ones behind stood in the doorway beside it | fixed (DOOR-JAM) |

## DOOR-JAM: a foe taller than a doorway ducks under its lintel (1)

`src/characters/enemyMotor.js` _heightAdjust, the motor's Moves; `src/player/collider.js` move's `sides`;
`src/characters/foeSpacing.js` sweepHeight; `src/ai/enhancedMotor.js` _stuckWatch.

THE REPORT. Foes chasing the player through a doorway jam in it and never come through. The player read it as their
hitboxes colliding.

NOT THE HITBOXES. The port's foes are not in the collider. FOE-SPACING (`characters/foeSpacing.js`) pushes two
overlapping capsules apart softly - half the overlap each, at most `FOE_SPACING_SPEED` (3 m/s) against a walk of 5 - at
two of the player's radius (0.7 m; DFU's enemy controller is 0.4, so 0.8), and nothing blocks. Driven on the real motor
over made door frames 1.0 to 2.0 m wide and 0.3 to 1.0 m deep, in the dungeon host's frame order (spaceFoes,
clearDoorways, update), foes of the player's height came through on both lanes - one at a time where the opening holds
one. Nothing about a crowd jams a doorway those foes fit.

FOUND. The foes do not fit.

- A foe's capsule is its idle sprite's height (SetupDemoEnemy.cs:103-115; `enemyAnchor.js` enemyControllerHeight, since
  INCIDENT 2026-09-04 - before it every foe wore the player's 1.8). On the player's data: the class foes 2.1-2.125 m; the
  Mage and the Healer 2.475 (their female records 2.375), the Spellsword 2.45; the Liches 2.475, the Daedra Lord 2.325,
  the Centaur 2.3, the Gargoyle and the Ice Atronach 2.275, the Frost Daedra 2.25, the Giant 2.65.
- The doorways: every action door in the 184 RDB blocks that hold one, 2,303 of them, measured floor to lintel at the
  door's middle over the block's own models with the door left out. 2,048 (89%) are lower than 2.3 m - nearly all
  2.25 to 2.30, 1.2 m wide, where the common door models (55000-55005, 2.2 by 1.2) hang; 2,177 (94.5%) are lower than
  2.45; none is lower than 2.2. The player's 1.8 passes every one.
- DFU passes them with EnemyMotor.HeightAdjust (EnemyMotor.cs:1448-1479, FixedUpdate's last call, :176): a controller
  whose last Move collided on its sides (CollisionFlags.CollidedSides) and whose originalHeight is over
  doorCrouchingHeight (1.65, :37) sweeps at 1.65 for half a second (:1462) - "If enemy bumps into something, temporarily
  reduce their height to 1.65, which should be short enough to fit through most if not all doorways". It began as a
  permanent clamp in SetupDemoEnemy ("Some particularly tall sprites (e.g. giants) require this hack to get through
  doors") and was made temporary in DFU's c799d9a0. ObstacleCheck is built around it: its capsule stops at
  `Mathf.Min(originalHeight, doorCrouchingHeight)` (:1152), so a lintel the foe can duck is no obstacle.
- The port had the probe's cap (`enemyMotor.js:"_obstacleCheck(dir) {"`, p2) and not the duck -
  `01-Overview/Port-Completion-Analysis.md` has listed "HeightAdjust unported - tall enemies cannot follow through
  doorways" since its sweep, and it began to bite the day INCIDENT 2026-09-04 sized the capsules. A foe taller than the
  opening saw nothing ahead, bought no detour, and walked its head into the lintel every step, forever. FOE-SPACING
  cannot part the ones that follow it in a 1.2 m opening, so they stood in the same doorway beside it: the screenshot.
- Measured, on the player's data: three Mage-height foes (2.475) sent at 40 real doorways lower than they stand, the
  player 5 m past each - before, not one foe came through any of the 40; now all three come through all 40. Over made
  corridors with the common door's opening (1.2 by 2.2), four foes, both lanes, the frame 0.3 or 0.6 m deep and the open
  door's leaf on neither side or either: 2.0 to 2.125 m bodies came through in the same numbers before and after, and
  2.325 to 2.475 m bodies not at all before and as many as the shorter ones after.

FIXED, HeightAdjust verbatim and what it needs:

- `enemyMotor.js:"this._heightAdjust(FIXED_DT);"` - after every fixed step's Moves, as FixedUpdate's last call. `height`
  stays DFU's `originalHeight`, which every probe and aim reads, as DFU's do (ObstacleCheck :1151-1152, FallCheck :1219,
  GetDestination :562); `controllerHeight` is the CharacterController's own, which every Move of both motors sweeps (the
  seven sites, `enhancedMotor.js` _stuckWatch's nudge among them); `collidedSides` is the last Move's CollidedSides, kept
  until the next as Unity keeps collisionFlags (isGrounded's law). `HEIGHT_CHANGE_SECONDS` 0.5; `DOOR_CROUCHING_HEIGHT`
  the one it already was. The capsule is bottom-justified in the port (feet + height), so DFU's `centerChange`, which
  keeps the sprite out of the ground, is the feet staying where they are. A puppet handed back stands at its own height.
- `collider.js:"out.sides = sides;"` - move() says CollidedSides: the sideways pass's resolve pushed the body off where
  its motion put it by more than `SIDE_CONTACT` (0.1 mm) along a face steeper than the slope limit (`GROUND_NY`, the
  collider's own wall law) - never a floor or a walkable slope the lower sphere rides, nor a resting touch. A step the
  ladder climbs is none when it lands the body where its motion ends; a rung the resolve threw anywhere else met
  something on the body's side (a head under a lintel's edge: the ladder "landed" the body backwards every other frame).
- `foeSpacing.js:"export const sweepHeight = (ai) =>"` - the pushes that stand in for two controllers meeting
  (spaceFoes, spaceAcross, clearDoorways' nudge) sweep the live controller height: at the full height a push swept a
  ducking body's head into the lintel it was passing. The ground check under a push keeps the body's own height
  (FallCheck's).

SQUEEZE1's sentence (`01-Overview/Field-Bugs-2026-09-26b.md`), "a doorway's lintel already stopped such a body, like
DFU's CharacterController", holds for one step: DFU's motor ducks the body on the next, and the port's does now.

KEEP FULL HEIGHT - Mac's call, 2026-10-15: "Keep full height". While a foe ducks, only its movement reads the duck:
every Move of both motors and the pushes that keep foes apart. Projectiles (`spellcast.js` missileHitsFoe), touch
spells (pickTouchTarget), its sight (`enemyMotor.js` _senses, and the target pass's in `enemyTargets.js`), a foe
hunting it (_targetHeight), the crosshair (`activate.js` foeAabb), the lock-on (`lockOn.js` chestPoint) and the
health bars read `height`, its whole body. DFU's own side effect of the duck is not carried - "while the enemy is
shortened, projectiles will not collide with the top of the enemy for the difference in height" (:1451), the eye
EnemySenses builds off the live controller (EnemySenses.cs:891-893) and the height a hunter aims by (EnemyMotor.cs:532)
all drop with it there. Port-Ledger A records the departure.

STILL AS DFU HAS IT: a body so tall its obstacle probe's capped top (0.36 of its height plus 1.0 m) clears the lintel -
past about 3.4 m, which nothing in the vanilla roster on land reaches - meets the lintel in the probe, and detours rather
than ducking. Found on the way and not this bug: ObstacleCheck is still cast at the player's radius (`Audit-65.md`'s open
item), and over a made doorway 1.0 m wide and 0.8 m deep, narrower than any dungeon door, a lone foe approaching off its
line paces the wall beside it - DFU's detour, which the port runs verbatim.

Pins: `test/fb1014b_doorjam.test.js` (12; the last on the player's ARENA2, skipped without it - six real 2.25 m doorways
and three Mages through each). Without the duck the report's corridor holds all three foes at the lintel on both lanes,
and on N0000000.RDB not one Mage comes through a door. KEEP FULL HEIGHT's two: a ducking Mage-height foe is hit by a
missile and found by a touch at its head over the crouch, met by the crosshair and held by the lock-on whole, aimed at
by a hunter at 2.475, and sees over a 1.6 m parapet a 1.65 eye cannot; and a sweep of `src/` in which every
`.controllerHeight` and every sweepHeight call is one of the seven Moves, the six push sites or the duck's own state.
The audit's four (below). `tools/mutants/fb1014b_doorjam.json`, 34: 33 dead, 1 recorded equivalent (the strict 1.65
gate - a body of exactly 1.65 ducked to 1.65 sweeps what it had); eight of them switch a reader - the lock-on, the
crosshair, the missile, the touch, the hunter's aim, the eye, a companion's bar, the target pass's eye - to the duck. Re-aimed at
`controllerHeight`: `test/incident_ceiling_bats.test.js`'s and `test/squeeze1.test.js`'s Move pins and
`tools/mutants/fbsea.json`'s walker record.

AUDIT (2026-10-15, an adversarial pass over the branch; Mac: "fix ALL at the root"):

- A TALL FOE SANK INTO THE FLOOR IN A CROWDED DOORWAY (medium). HeightAdjust stands a ducked foe back up wherever it
  is, with no look at the room over it - DFU's own law, kept: a headroom check on the stand would be a departure - so a
  foe that stops under a lintel stands with its head in it. The motor's Moves keep its floor there (SQUEEZE1's
  `keepFloor`, "every foe, by its motor's word"); the pushes that moved the same body did not - spaceFoes' push, the
  nudge spaceAcross and clearDoorways share, and the pathing motor's unstick - and a body of 2.1 to 2.475 m is under
  RIDE_HEIGHT, where the collider keeps a floor of its own accord, so the lintel pressed it down by all its head was
  over it: a Mage in a real door's 2.25 m opening, 0.225 m into the floor. ROOT: the floor-keeping was a flag each site
  had to remember, and three forgot. `enemyMotor.js:"export function moveFoeBody(collider, feet, dx, dy, dz, height, snap = true) {"`
  is now the one move of a foe's body - the motor's six Moves, the pushes and the unstick all go through it, and it
  passes FOE_KEEPS_FLOOR - and a sweep of `src/` fails on any move of a foe's feet that goes round it.
- FIVE MUTATIONS OF THE PORTED LAW LIVED (low): HeightAdjust's `!resetHeight` guard (:1452) and its `<= 0` (:1464),
  move()'s sub-step OR of `sides`, the step ladder's half-motion threshold and SIDE_CONTACT's 0.1 mm. Pinned: a
  40-step trace of a foe bumping all the while - ducked 31 steps, up on the 32nd, ducked again on the 33rd - and the
  timer run to exactly nought by four 0.125 s steps standing it up on the fifth (with `< 0` it was held ducked for
  good); one metre in one move, split into sub-steps, meeting a pillar only in its first; a body 0.3 mm into a wall
  bumps it, one 0.05 mm settles. The ladder's threshold is gone, not pinned: a climbed step is no side contact when it
  lands the body where its motion ends (SIDE_CONTACT, the sideways pass's own measure), which is the law the threshold
  stood in for - the same five stopped steps of 120 on a stair run, and the lintel's thrown-back landing still a bump.
- Pins: four tests in `test/fb1014b_doorjam.test.js` (the floor kept through all four pushes in the real door's
  opening; the source sweep; the trace; the sub-steps and the measure); `tools/mutants/fb1014b_doorjam.json` FLOORKEPT-1
  to -4, HEIGHTADJUST-1 and -2, SIDES-1 and -2 and DOORJAM-13 re-aimed, all dead. Re-aimed at moveFoeBody: the Move
  pins of `test/squeeze1.test.js`, `test/incident_ceiling_bats.test.js` and `test/fbsea_aquatic.test.js`, and
  `tools/mutants/fbsea.json`'s walker record.

THE FOUR HOSTS. The duck is the motor's own, and every host's foes step the motor; none of the four was edited.
`scenes/dungeonContext.js` - the dungeon's foes, where the report was: its spaceFoes and clearDoorways passes sweep the
controller now. `scenes/worldModes.js` - a building's foes and the indoor watch through its doors and inner swing doors:
its spaceAcross and clearDoorways passes, the same. `scenes/world.js` - the street's encounters and watch: its pools'
spaceFoes (`exteriorFoes.js`, `cityGuards.js`) and its spaceAcross and clearDoorways at the buildings' doors, the same.
`scenes/exterior.js` - the single town: the same two pools and their spaceFoes, no doorway pass of its own.
