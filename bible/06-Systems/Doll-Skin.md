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

`composePaperDollPixels(..., { labels: true })` answers the composite with a label for each pixel, saying what drew
it, by the stuff it is (`DOLL_LAYER`, `dollLayerOfSlot`):
- the nude figure's skin (`body`) and its welds, the smallclothes it wears with nothing over them (`under`);
- the head (hair and face) and a helm;
- what is worn on the chest, the legs, the feet and the arms (gauntlets, pauldrons, bracers), and jewellery;
- the right hand's and the left hand's items - armour in a hand is a `shield`;
- a cloak's own layer, and its lining.

The labels are read off the buffer after each layer: a pixel the layer changed is the layer's. So
PaperDollRenderer's blits are untouched. A pixel a mask holed through to a clear panel is nobody's.

A layer can draw a pixel the colour it already was, and that changes nothing. Daggerfall's robes do this over their
cloak's lining. So the body, the head and every item are also drawn again into a clear buffer, and every pixel they
cover is theirs.

The lining is also kept WHOLE (`lining`): the buffer as it stood after the lining was drawn, before the body covered
it. Daggerfall's lining art is cut round the body, so this is little more than the rim the composite shows. The
cloak's back is drawn by the puppet (below).

## The puppet (`characters/dollPuppet.js`)

The first puppet cut the doll into flat cards and squeezed them as the view turned. Shown it on real dolls, the
owner: "The back facing is just so bad. Its half assed", then "Dont band aid fix. I want you to really really go as
deep as possible and make this perfection". So each part became a shape with a back.

**The rig** (`buildDollRig`) is read off the composite's figure: the body, the head and what is worn, not the cloak
(its drape hangs apart from the body like an arm) or the hands' items.
- **The neck** is the row under the head's own layers. **The shoulders** are just below it.
- **The crotch** is found by walking up from the feet while the legs stand apart. A robe that hides the gap falls to
  the proportion (`DOLL_PROPORTION.crotch`, 0.53 of the figure from the top of the head).
- **The torso's half-width** is its narrowest run through the centre between the chest and the crotch, held between
  6% and 11% of the figure's height.
- **The hands**: each arm stands apart from the body row by row, and its hand is the lowest row it does. Drawn against
  the body, an arm ends where its stuff (skin, a gauntlet) meets the torso's wear; else past the torso's half-width.
  Below the crotch the arm is only the hand hanging on from the row above: a fold of the trousers is no hand.
- **The elbows and knees** sit half way along their limbs; **the ankles** a foot's height (5.5%) above the floor.
- An arm behind a shield cannot be read: its joints are the other arm's, mirrored, and its pixels where the shield hid
  it are the other arm's too. So it is there when the shield swings away (pinned).

The pixels are cut into parts:
- a head, a torso; two upper arms, two forearms, two thighs, two shins, two feet;
- a robe that hides the legs is one **skirt** from the hips instead of the thighs and shins, the feet stepping under it;
- the cloak's lining (the cape) and its own layer (the drape);
- each hand's item. The weapon's hand is the side its pixels lie on.

**THE PARTS ARE SHAPES** (`PART_SHAPE`). Each part of the body is an elliptical cylinder round its bone, cut along the
doll's own rows (as its art is drawn). Each row's cross-section is the part's own width there, and a depth for it:

| Part | Depth for its width | Its middle |
|---|---|---|
| head | 0.95 | a little behind the face |
| torso, skirt | 0.62 (a skirt as deep as the hips, deepening toward its hem) | on the bone |
| arms, legs | 0.95 | on the bone |
| feet | 1.0 | forward of the leg, toes first |
| cape | 0.3 | hung against the torso's back, row by row |
| drape | 0.45 | a shell round the torso |

The front half of each shape wears the doll, which is exactly that half seen from the front. The back half wears the
doll's back (below).

**The items are cards** in their hand, standing in front of the forearm. Seen edge-on a card keeps two pixels, so a
blade is never gone. From behind, a card shows its back: a shield's inside, and a blade's other side, which is itself.
- A shield faces the body's front wherever its arm goes (pinned).
- A raised bow turns a quarter about its forearm to stand upright along it. From the front it is edge-on, from the side
  whole (pinned).

**THE BACK** (`backOfDoll`, `capeOf`) is drawn in the doll's own pixels, stuff by stuff:
- Each stuff takes its own colour, across every part it is worn on (one garment, one colour). That is the commonest hue
  of its front (greys their own), so a gold trim is not a gauntlet's colour. It keeps its front's broad tone and fine
  grain but none of its features (a face, a buckle, a breastplate's boss). Jewellery is what it lies on.
- A garment open down the front is closed down the back.
- The body's shape is under it, lit from above: the spine (a backplate's ridge), the shoulder blades, the seat where
  the legs part, the backs of the knees. A seam where two stuffs meet, a sole under each heel.
- The head is the doll's own hair, strand by strand from the crown, falling as far as it falls beside the face (at
  least to the ears). Below it the nape is skin (the figure's bare skin, not a beard's), and only as wide as the neck.
  A band round the forehead goes round. A helm is its own stuff over all.
- A shield's inside is its rim, boards and two straps.
- A cloak's back closes each row from its first pixel to its last: the drape's own colour, the lining's folds in the
  cloak's outside colour, soft folds across the gap where the body was.

The back is its stuff's colour unlit. It is lit when it is drawn.

**The joints' underlays.** Each bending limb carries a band of its neighbour's pixels past each joint (3% of the
figure's height). And each part keeps what another part hid of it in the front (a hand on the hip, a blade across a
leg), each row closed across it. Both are drawn only where nothing at all was. A bent knee shows its own colours, never
a hole, and a hand lifted from the hip leaves none. At rest the parts cover them exactly (pinned).

**The views** (`placeParts`, `renderDollFrame`). The doll is drawn at the wheel's five records
(`eotbBillboard.js` RECORD_OFFSETS) and the wheel mirrors them for the other three orientations, as for every set:
- **Record 0** is the front; **record 4** is the back.
- **Records 1-3** are 45°, 90° and 135° round toward the figure's LEFT. The wheel draws them unmirrored at
  orientations 5-7, where `orientationFor`'s SignedAngle puts the eye to the left of the facing. So the figure faces
  the screen's left there, and its left side is the near one.

How a frame is drawn:
- Every part is posed in the figure's own frame (x its left, y down, z its forward) and seen from the record's angle:
  screen x = x cos φ − z sin φ, depth = x sin φ + z cos φ.
- Every pixel is traced back onto each part that may show there. On a shape, it is solved for its place along the bone
  and its angle round the ellipse, on the side that faces the eye. That angle says where on the picture, and which
  picture: the front where that bit faces forward, else the back.
- A limb pointed at the eye keeps a third of its length, so it is short but never gone.
- The nearest surface wins, pixel by pixel. Ties go by rule: the head over its collar, the torso's hem over the thighs.
- **The light.** The front is drawn lit, in its own art. The back is lit as its surface faces the eye (`DOLL_LIGHT`:
  from over the viewer's left shoulder, as the doll's own), metal with a sheen.
- **The stretch.** Where the front's picture would be stretched across a flank turned toward the eye (wider on screen
  than in the doll by `DOLL_STRETCH`, 1.6 to 2.6), the flank is the back's stuff, lit, not the doll's edge smeared
  across it (pinned).
- The made surfaces get the dark edge the doll's own art draws round itself.

The front-on stand is the doll exactly as drawn, pixel for pixel (pinned).

A frame takes about 6 ms, and a doll's rig about 40 ms (measured in node on the freeware dolls). So the skin draws
`DOLL_FRAMES_A_TASK` (2) a task.

**The frame.** Its bottom row is the floor the feet stand on and its middle column is the figure's centre line. So the
billboard stands it at the feet, and a frame that grows wider (a stroke, a fall) does not slide the figure.

**The clips** (`posePuppet`) are every on-foot table the body plays, at the body's own frame counts
(`DOLL_TABLE_FRAMES`, pinned equal to `TABLE_FRAMES`). The whole body moves: the shoulders turn (`twist`), the hips
turn against them, the head holds to the front, and a raised arm can turn off the body's front (`yw`).

| Table | Pose |
|---|---|
| Idle | The doll as drawn. |
| Move (4) | A step: contact, passing, contact, passing. The shoulders turn against the hips, the arms swing with a bend at the elbow, the body rises as it passes. |
| IdleMelee, MoveMelee | The weapon ready, the shield or the free arm on guard; the walk under it. |
| AttackMelee (6) | Ready, wind, top (over the head), cut, follow-through, return. The body winds back toward the weapon's side and drives through the cut; the legs lunge (pinned). |
| IdleRanged, MoveRanged | The bow held low, ready. |
| AttackRanged (4) | Side-on to the mark (pinned), the bow arm out at it and the bow upright; drawn to the cheek, held, loosed. |
| IdleSpell, MoveSpell, AttackSpell (4) | Both hands raised; then gathered at the chest, thrust with a step, held, returned. |
| Death (2) | A kneel, then lying on the ground (the figure turned 90° about its feet). |
| the jump | The port's own. Rising, the legs tuck and empty hands go out. Falling, the legs reach down. Laid over whichever table stands, so a raised weapon stays raised. Never over the fall. |

## The jump (`player/motor.js`)

Eye Of The Beholder has no jump table. The doll's jump is `airborneOf` over the one motion bag, which now carries the
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
  first). Their doll is composed off their look's stand-in (`peerStubEntity`, which `net/remotePlayers.js` hands the
  skin as it loads). The look travels, never a picture (Online-Arc's law).

**Generations and retirement.** Each slot has a generation, which moves when its gear changes. The player's gear is
looked at every `DOLL_RECIPE_MS`, 500 ms, by the look's own item fields (`LOOK_ITEM_FIELDS`). The last doll stands
while the next composes. A generation outgrown is told to every art store `DOLL_RETIRE_MS` (3 s) later, and they let
its textures go (EVERY ALLOCATION HAS AN OWNER). A doll that could not be composed (no art yet) is asked again after
`DOLL_SKIN_RETRY_MS`.

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

## The wire (world197)

- A look's `eo` may name the paperdoll: `FOOT_SKINS` is 37, the set after every on-foot skin.
- A pose in the air carries `jp`: 1 rising, 2 falling (`airPoseOf`, sent by the world host). It is omitted on the
  ground, so a pose there keeps its bytes. A jump begun, topped or landed is news at once (`poseChanged`).
- An older client draws a paperdoll-wearer as their class.

## Pins

`test/dollskin1.test.js`, 18 tests; `tools/mutants/dollskin1.json`, 55 mutants, all dead. The layers are pinned by a
real compose over a headless art set (helmMask.test.js's way): a body over a lining the same colour is the body's. The
shapes, the back, the hands' items and the moving body are pinned by what they draw on a figure of our own.

Moved with it:
- `test/skin2_class_skins.test.js`: the setting's max, the wire's bound, the card's shelves.
- `test/ww2_idlebob.test.js`: the motion bag's `velY`.
- Every relay-version pin: world197 (world196 on its branch, renumbered past main's CHAT-LANG world196 at the merge).

What is not pinned is taste. The joint angles of each clip and the depth ratios are the port's own, and no reference
says otherwise.

They were looked at against real dolls, composed from the freeware ARENA2 outside the repository, at every record and
through every clip:
- a Breton knight in plate with a longsword and kite shield;
- a High Elf mage in robes and a cloak;
- a Redguard rogue in an open shirt, trousers and a cloak;
- a Nord in a gold helm and plate with a tower shield;
- a Wood Elf archer with a long bow;
- a Khajiit in robes;
- an Argonian in smallclothes.

Most of the rules above came from those renders. Neither the art nor any render was committed.
