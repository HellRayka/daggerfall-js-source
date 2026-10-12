# The paperdoll as a skin (DOLL-SKIN, 2026-10-11)

The owner: "On a second note. I want to transform the paperdoll into a proper directional sprite with attack
animations, jump animations, etc allowing the user to use their paperdoll instead of the eye of the Beholder skin
system". Asked how the views Daggerfall never drew should be made, they chose a **cut-out puppet** over a 3D figure
painted with the doll and over the flat doll animated facing the eye. They chose **everything in one pull request**:
the player and the others, every state.

Not a DFU member. Daggerfall draws the paperdoll from the front only, and no back or side record exists in ARENA2
(`ui/paperDoll.js`). Eye Of The Beholder (`06-Systems/Eye-Of-The-Beholder.md`) draws the third-person body from art of
its own. This skin draws it from the player's own doll. Ledger A (DOLL-SKIN).

## Where it is chosen

The Skin card's On foot panel (`ui/skinCard.js`) has a third shelf, **Your paperdoll**, after Eye of the Beholder's
sixteen sets and Daggerfall's twenty classes. It is `Graphics.OnFoot`'s last index, `PAPERDOLL_SKIN` =
`FOOT_SKIN_COUNT` (36). The setting's declaration (`systems/modSettings.js`) widens to it and labels it. Its tile shows
the player's doll front-on once one has been composed: the first time the body wears it. Until then the tile shows its
name. The saddle and the beast keep the mod's sets: a doll on a horse is not drawn, and the werewolf is the werewolf.

## The doll's layers (`ui/paperDoll.js`)

`composePaperDollPixels(..., { labels: true })` answers the composite with a label for each pixel, saying which layer
drew it (`DOLL_LAYER`): the body (the nude figure, its welds and every worn layer that moves with it), the head (hair
and face), a helm, the cloak's lining, the right hand's and the left hand's items, and a cloak's own layer.

The labels are read off the buffer after each layer: a pixel the layer changed is the layer's. So
PaperDollRenderer's blits are untouched. A pixel a mask holed through to a clear panel is nobody's.

The lining is also kept WHOLE (`lining`): the buffer as it stood after the lining was drawn, before the body covered
it. From behind, the cloak's back is the part the body hides from the front.

## The puppet (`characters/dollPuppet.js`)

**The rig** (`buildDollRig`) is read off the composite's body and head layers:
- **The neck** is the row under the head's own layers.
- **The shoulders** are just below the neck.
- **The crotch** is found by walking up from the feet while the legs stand apart. A robe that hides the gap falls to
  the proportion (`DOLL_PROPORTION.crotch`, 0.53 of the figure from the top of the head).
- **The torso's half-width** is its narrowest run through the centre between the chest and the crotch, held between
  6% and 11% of the figure's height.
- **The hands**: each arm stands apart from the body row by row (below the crotch, from the leg nearest it), and its
  hand is the lowest row it does.
- **The elbows and knees** sit half way along their limbs.

The pixels are cut by those joints into 12 parts:
- a head and a torso;
- two upper arms, two forearms, two thighs and two shins;
- the cloak's lining;
- each hand's items riding its forearm. The weapon's hand is the side its pixels lie on.

**The views** (`placeParts`, `renderDollFrame`). The doll is drawn at the wheel's five records
(`eotbBillboard.js` RECORD_OFFSETS) and the wheel mirrors them for the other three orientations, as for every set:
- **Record 0** is the front; **record 4** is the back.
- **Records 1-3** are 45°, 90° and 135° round toward the figure's LEFT. The wheel draws them unmirrored at
  orientations 5-7, where `orientationFor`'s SignedAngle puts the eye to the left of the facing. So the figure faces
  the screen's left there, and its left side is the near one.

How each part is placed:
- Its joints are placed in the figure's own frame (x its left, y down, z its forward), turned by the pose, and
  projected: screen x = x cos φ − z sin φ, depth = x sin φ + z cos φ.
- Each part is an affine map from its rest segment onto the projected one. Its width narrows by its depth as the view
  turns side-on (`PART_DEPTH`: the torso to half, the head to 0.68, a limb to 0.85, the cloak to 0.3).
- From behind, a part is drawn the other way round.
- A limb pointed at the eye keeps a third of its length, so it is short but never gone.
- The back of the head is the hair's colour (the median of the head's top quarter, shaded by each pixel it replaces).
  A helm keeps its own pixels.
- From behind, the cloak is drawn over the body; from the front, behind it.
- The parts are drawn far to near.

The front-on stand is the doll exactly as drawn, pixel for pixel (pinned).

**The frame.** Its bottom row is the floor the feet stand on and its middle column is the figure's centre line. So the
billboard stands it at the feet, and a frame that grows wider (a stroke, a fall) does not slide the figure.

**The clips** (`posePuppet`) are every on-foot table the body plays, at the body's own frame counts
(`DOLL_TABLE_FRAMES`, pinned equal to `TABLE_FRAMES`):

| Table | Pose |
|---|---|
| Idle | The doll as drawn. |
| Move (4) | A step: contact, passing, contact, passing. The arms swing against the legs and the body bobs. |
| IdleMelee, MoveMelee | The weapon ready, the walk under it. |
| AttackMelee (6) | Ready, raise, top (over the head), cut, follow-through, return. The legs lunge for the cut. |
| IdleRanged, MoveRanged, AttackRanged (4) | The bow arm out, the draw arm drawn, held, loosed. |
| IdleSpell, MoveSpell, AttackSpell (4) | Both hands raised; then gathered, thrust, held, returned. |
| Death (2) | A kneel, then lying on the ground (the figure turned 90° about its feet). |
| the jump | The port's own. Rising, the legs tuck and empty hands go out. Falling, the legs reach down. Laid over whichever table stands, so a raised weapon stays raised. Never over the fall. |

## The jump (`player/motor.js`)

Eye Of The Beholder has no jump table. The doll's jump is `airOf` over the one motion bag, which now carries the
motor's vertical speed (`velY`):
- **0** on the ground, swimming, levitating, riding or on a wall.
- **1** rising (velY > `AIR_RISE`).
- **2** falling.

`createAirClock` draws a rise at once, and the fall that follows a rise at once too. A fall that began on its own is
drawn only once it has lasted `AIR_FALL_MS` (150 ms), so stepping off a kerb or down a stair is never a jump.

## The skin (`player/dollSkin.js`)

**The slots.** Each doll is a slot with its own texture archive:
- The player's doll is `DOLL_ARCHIVE` (905000). It is composed off their own entity, which the weapon rig hands the
  body (`eotbState.entity`), through the compositor's own deps (`paperDollDeps`), as the inventory composes it.
- Each other player wearing it takes a slot after (up to `DOLL_PEER_SLOTS`, 12; the least recently drawn goes
  first). Their doll is composed off their look's stand-in (`peerStubEntity`, handed in by the host). The look
  travels, never a picture (Online-Arc's law).

**Generations and retirement.** Each slot has a generation, which moves when its gear changes. The player's gear is
looked at every `DOLL_RECIPE_MS`, 500 ms, by the look's own item fields (`LOOK_ITEM_FIELDS`). The last doll stands
while the next composes. A generation outgrown is told to every art store `DOLL_RETIRE_MS` (3 s) later, and they let
its textures go (EVERY ALLOCATION HAS AN OWNER). A doll that could not be composed (no art yet) is asked again after
`DOLL_RETRY_MS`.

**The sprite door** (`eotbSprite.js spriteFor`):
- A paperdoll look with its doll (`look.doll`) answers the doll's archive and the wheel's record and mirror.
- Its record carries the generation and the jump (`Move.1-2mj1g3`).
- Its key (`doll:<archive>:<gen>:<table>:<view>:<frame>:<air>`) is its own URL.
- With no doll yet, the mod's first set stands in.
- `spriteOffset` gives a doll its own scale: its figure stands `DOLL_FIGURE_PX` (100) tall, as Eye Of The Beholder's
  sets do at 0.019 m a pixel.

**The frames** are drawn when the art store asks to decode one, through both decode doors (`eotbBody.js decodeSprite`,
`peerRiders.js decodeUrl`):
- A few are drawn per task (`DOLL_FRAMES_A_TASK`), so the body's whole-set preload never stalls a frame.
- Each is turned to the world's rows for the billboard.
- Nothing is written anywhere but the renderer: they are the player's game data (Port-Doctrine "A RENDER OF GAME DATA
  IS GAME DATA").

**The body** (`eotbBody.js`) asks for the player's doll each tick while the paperdoll is the set worn. It fetches a new
generation's frames whole, as a set chosen is. The look it draws with carries the doll and the jump.

**The others** (`peerRiders.js createPeerWalkers`): a peer whose look's `eo` is the paperdoll stands as their doll
once it is composed here. Until then they stand as they stood before (the class sprite, the flat doll). They jump when
their pose says, and a blow flinches them by the flash alone, as the mod's sets are.

## The wire (world196)

- A look's `eo` may name the paperdoll: `FOOT_SKINS` is 37, the set after every on-foot skin.
- A pose in the air carries `jp`: 1 rising, 2 falling (`airPoseOf`, sent by the world host). It is omitted on the
  ground, so a pose there keeps its bytes. A jump begun, topped or landed is news at once (`poseChanged`).
- An older client draws a paperdoll-wearer as their class.

## Pins

`test/dollskin1.test.js`, 13 tests; `tools/mutants/dollskin1.json`, 32 mutants, all dead.

Moved with it:
- `test/skin2_class_skins.test.js`: the setting's max, the wire's bound, the card's shelves.
- `test/ww2_idlebob.test.js`: the motion bag's `velY`.
- Every relay-version pin: world196.

What is not pinned is taste. The joint angles of each clip and the depth ratios are the port's own, and no reference
says otherwise. They were looked at in synthetic renders only. The art was never committed: no ARENA2 is in this
repository.
