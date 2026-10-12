// DOLL-SKIN (2026-10-11, the owner: "transform the paperdoll into a proper directional sprite with attack animations,
// jump animations, etc allowing the user to use their paperdoll instead of the eye of the Beholder skin system"):
// THE PAPERDOLL AS A SKIN - the puppet (characters/dollPuppet.js), the skin's slots and frames (player/dollSkin.js), the
// sprite door (eotbSprite.js), the body and the peers that wear it, the jump law (player/motor.js) and the wire.
//
// THE DOLL HERE IS OURS: a figure of plain rectangles in the compositor's own shape (110x184, labelled layers) - no
// ARENA2 pixel is read or written (Port-Doctrine "A RENDER OF GAME DATA IS GAME DATA").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DOLL_LAYER, dollLayerOfSlot, buildDollRig, renderDollFrame, posePuppet, placeParts, DOLL_TABLE_FRAMES, VIEW_DEGREES,
} from '../src/characters/dollPuppet.js';
import {
  PAPERDOLL_SKIN, DOLL_ARCHIVE, DOLL_FIGURE_PX, DOLL_RETIRE_MS, DOLL_PEER_SLOTS, localDoll, peerDoll, dollSprite, dollScale,
  onDollRetired, isRetiredTex, drawFrame, dollFramePixels, dollRecipe, dollPreview, setDollPeerEntity,
  _setDollSkinSeamsForTests, _resetDollSkinForTests, _dollSlotsForTests,
} from '../src/player/dollSkin.js';
import { spriteFor, spriteOffset, eotbSpriteUrl } from '../src/player/eotbSprite.js';
import { createEotbBody, decodeSprite } from '../src/player/eotbBody.js';
import { createEotbArt, createPeerWalkers } from '../src/net/peerRiders.js';
import { TABLE_FRAMES, ARCHIVE_FOOT } from '../src/player/eotbBillboard.js';
import { FOOT_SKIN_COUNT } from '../src/player/classSkins.js';
import { EQUIP_SLOTS } from '../src/characters/paperdoll.js';
import { composePaperDollPixels, PAPERDOLL_W, PAPERDOLL_H, PAPERDOLL_ORIGIN } from '../src/ui/paperDoll.js';
import { equipItem } from '../src/systems/equip.js';
import { airborneOf, createAirClock, airPoseOf, AIR_FALL_MS, motionBagOf } from '../src/player/motor.js';
import { validPose, validLook, poseChanged, FOOT_SKINS } from '../src/net/wire.js';
import { setModSetting, _resetModSettings, MOD_SETTINGS } from '../src/systems/modSettings.js';
import { FOOT_GROUPS, skinSets } from '../src/ui/skinCard.js';

const rd = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/** OUR figure: hair over a face, a neck, a tunic, arms apart from it, legs apart from each other, boots, a sword in the
 *  screen-left hand and a cloak's lining behind. */
function figure({ sword = true, cape = true, robe = false, rim = false, drape = false, fold = false, buckle = false, outline = false, bare = false, shield = false, boxHead = false, swordRight = false } = {}) {
  const W = 110, H = 184;
  const rgba = new Uint8Array(W * H * 4), labels = new Uint8Array(W * H);
  const put = (x, y, c, l) => { const i = y * W + x; rgba.set([...c, 255], i * 4); labels[i] = l; };
  const rect = (x0, y0, x1, y1, c, l) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, c, l); };
  const cx = 55;
  let lining = null;
  if (cape) {
    rect(cx - 18, 30, cx + 18, 120, [120, 20, 20], DOLL_LAYER.lining);
    // Daggerfall's own lining is cut round the body: only its rim was ever drawn
    if (rim) for (let y = 35; y <= 120; y++) for (let x = cx - 15; x <= cx + 15; x++) { rgba.fill(0, (y * W + x) * 4, (y * W + x) * 4 + 4); labels[y * W + x] = 0; }
    lining = rgba.slice();
  }
  for (let y = 8; y <= 30; y++) for (let x = cx - 9; x <= cx + 9; x++) if (boxHead || (x - cx) ** 2 / 81 + (y - 19) ** 2 / 121 <= 1) put(x, y, y < 15 ? [90, 60, 20] : [230, 190, 150], DOLL_LAYER.head);
  // labelled by stuff, as the compositor labels them: the neck and forearms bare, a tunic, breeches, boots
  rect(cx - 3, 31, cx + 3, 34, [230, 190, 150], DOLL_LAYER.body);
  rect(cx - 15, 35, cx + 15, 95, [40, 80, 160], DOLL_LAYER.chest);
  for (const s of [-1, 1]) {
    rect(s < 0 ? cx - 23 : cx + 17, 36, s < 0 ? cx - 17 : cx + 23, 70, [40, 80, 160], DOLL_LAYER.chest);
    rect(s < 0 ? cx - 24 : cx + 18, 71, s < 0 ? cx - 18 : cx + 24, 108, [230, 190, 150], DOLL_LAYER.body);
    rect(s < 0 ? cx - 14 : cx + 2, 96, s < 0 ? cx - 2 : cx + 14, 140, [90, 70, 50], DOLL_LAYER.legs);
    rect(s < 0 ? cx - 13 : cx + 3, 141, s < 0 ? cx - 3 : cx + 13, 178, [70, 50, 35], DOLL_LAYER.feet);
  }
  if (robe) rect(cx - 15, 96, cx + 15, 178, [60, 40, 100], DOLL_LAYER.chest);
  if (drape) rect(cx + 26, 36, cx + 29, 130, [30, 140, 60], DOLL_LAYER.cloak);   // the cloak's own layer, hanging apart from the arm
  if (fold) rect(cx + 16, 115, cx + 17, 118, [90, 70, 50], DOLL_LAYER.legs);    // a fold of the trousers standing out from the leg
  if (bare) rect(cx - 15, 35, cx + 15, 95, [230, 190, 150], DOLL_LAYER.body);   // no tunic: the torso's own skin
  if (buckle) rect(cx - 2, 60, cx + 1, 63, [250, 220, 0], DOLL_LAYER.chest);   // a feature of the front alone
  if (outline) {   // the art's dark edge
    for (let y = 35; y <= 95; y++) for (const x of [cx - 15, cx + 15]) put(x, y, [10, 20, 40], DOLL_LAYER.chest);
    for (let y = 96; y <= 140; y++) for (const x of [cx - 14, cx + 14]) put(x, y, [10, 20, 40], DOLL_LAYER.legs);
  }
  if (shield) rect(cx + 16, 60, cx + 32, 112, [180, 180, 190], DOLL_LAYER.shield);   // over the left arm
  if (sword) rect(swordRight ? cx + 21 : cx - 22, 109, swordRight ? cx + 22 : cx - 21, 150, [200, 200, 210], DOLL_LAYER.right);
  return { width: W, height: H, rgba, labels, lining };
}
const opaque = (img) => { let n = 0; for (let i = 3; i < img.rgba.length; i += 4) if (img.rgba[i]) n++; return n; };
const bboxOf = (img) => {
  let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (img.rgba[(y * img.width + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
};
const px = (img, x, y) => Array.from(img.rgba.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4));
/** A made colour is its stuff's, lit by the way its surface faces: within `tol` of it in every channel. */
const near = (c, want, tol = 12) => want.every((v, j) => Math.abs(c[j] - v) <= tol);

// A headless art set in the compositor's own formats (helmMask.test.js's way): a body of index 9 over a cloak's lining of
// index 9 - the same colour, so the body's blit changes none of the lining's pixels it covers - and a face of index 7.
function imgBytes(xOff, yOff, w, h, fill) {
  const b = new Uint8Array(12 + w * h);
  const v = new DataView(b.buffer);
  v.setInt16(0, xOff, true); v.setInt16(2, yOff, true); v.setInt16(4, w, true); v.setInt16(6, h, true);
  v.setUint16(10, w * h, true);
  b.fill(fill, 12);
  return b;
}

test('DOLL-SKIN the compositor names each pixel\'s layer - a diff after every layer, the blits untouched, and every pixel a layer drew even the colour it was - and the doll\'s parts follow the slots: the hands\' items, the helm, the cloak, the rest the body\'s (mutants: a layer unmarked; the helm as the face; a pixel drawn its own colour left to the layer under it)', async () => {
  assert.equal(dollLayerOfSlot(EQUIP_SLOTS.RightHand), DOLL_LAYER.right);
  assert.equal(dollLayerOfSlot(EQUIP_SLOTS.LeftHand), DOLL_LAYER.left);
  assert.equal(dollLayerOfSlot(EQUIP_SLOTS.Head), DOLL_LAYER.helm, 'a helm keeps its own pixels from behind');
  assert.equal(dollLayerOfSlot(EQUIP_SLOTS.Cloak1), DOLL_LAYER.cloak);
  // by the stuff each is - the back of each is drawn as that stuff
  assert.equal(dollLayerOfSlot(EQUIP_SLOTS.ChestArmor), DOLL_LAYER.chest);
  assert.equal(dollLayerOfSlot(EQUIP_SLOTS.ChestClothes), DOLL_LAYER.chest);
  assert.equal(dollLayerOfSlot(EQUIP_SLOTS.LegsClothes), DOLL_LAYER.legs);
  assert.equal(dollLayerOfSlot(EQUIP_SLOTS.Feet), DOLL_LAYER.feet);
  assert.equal(dollLayerOfSlot(EQUIP_SLOTS.Gloves), DOLL_LAYER.arms);
  assert.equal(dollLayerOfSlot(EQUIP_SLOTS.RightArm), DOLL_LAYER.arms);
  assert.equal(dollLayerOfSlot(EQUIP_SLOTS.Amulet0), DOLL_LAYER.jewel);
  assert.equal(dollLayerOfSlot(EQUIP_SLOTS.LeftHand, { group: 'Armor' }), DOLL_LAYER.shield, 'armour in a hand is a shield');
  assert.equal(dollLayerOfSlot(EQUIP_SLOTS.LeftHand, { group: 'Weapons' }), DOLL_LAYER.left);
  const src = rd('src/ui/paperDoll.js');
  const compose = src.slice(src.indexOf('async function composeDoll('), src.indexOf('export async function refreshPaperDoll('));
  assert.match(compose, /mark\(DOLL_LAYER\.lining\);\s*\n\s*if \(labels\) lining = out\.slice\(\);/, 'the lining marked, and kept whole before the body covers it');
  assert.equal((compose.match(/mark\(DOLL_LAYER\.body[,)]/g) ?? []).length, 1, 'the nude body');
  assert.match(compose, /mark\(DOLL_LAYER\.under\);/, 'its welds, the smallclothes');
  assert.equal((compose.match(/mark\(dollLayerOfSlot\(it\.equipSlot, it\), \(b\) => blit/g) ?? []).length, 2, 'both item arms - the indexed blit and the truecolor one - by what each is, drawn again for their cover');
  assert.match(src, /labels\[i\] = out\[i \* 4 \+ 3\] \? kind : DOLL_LAYER\.none;/, 'a pixel a mask holed through to a clear panel is no one\'s');
  // the compose itself: the body over a lining the same colour
  const [ox, oy] = PAPERDOLL_ORIGIN;
  const fetchBytes = async (name) => {
    if (name.startsWith('SCBG')) return imgBytes(0, 0, 320, 200, 5);
    if (name.startsWith('BODY')) return imgBytes(ox + 40, oy + 40, 30, 100, 9);
    if (name.startsWith('FACE')) return imgBytes(ox + 45, oy + 20, 20, 20, 7);
    throw new Error(`unexpected art ${name}`);
  };
  const palette = { get: (i) => ({ r: i, g: i, b: i }) };
  const liningBmp = { width: 50, height: 120, data: new Uint8Array(50 * 120).fill(9), palette };
  const clear = { width: 50, height: 120, data: new Uint8Array(50 * 120), palette };
  // the cloak's interior (its template's record, 21) is the lining; its outer record (22) draws nothing
  const getTexture = async () => ({ recordCount: 64, getOffset: () => ({ x: ox + 30, y: oy + 40 }), getDFBitmap: (r) => (r === 21 ? liningBmp : clear) });
  const e = { race: 'Breton', gender: 'male', faceIndex: 0, items: [] };
  equipItem(e, { group: 'MensClothing', templateIndex: 154, name: 'Casual Cloak', dye: 0 });
  const doll = await composePaperDollPixels({ renderer: { uploadTexture: () => 'tex', releaseTexture: () => {} }, palette, getTexture, fetchBytes }, e, { background: false, labels: true });
  assert.ok(doll?.labels, 'composed, labelled');
  const at = (x, y) => doll.labels[(y - oy) * PAPERDOLL_W + (x - ox)];
  assert.deepEqual(Array.from(doll.rgba.subarray(((60) * PAPERDOLL_W + 50) * 4, ((60) * PAPERDOLL_W + 50) * 4 + 3)), [9, 9, 9], 'the body is the lining\'s colour');
  assert.equal(at(ox + 50, oy + 60), DOLL_LAYER.body, 'a body pixel over the lining the same colour is the body\'s');
  assert.equal(at(ox + 32, oy + 60), DOLL_LAYER.lining, 'beside the body the lining is the lining');
  assert.equal(at(ox + 50, oy + 25), DOLL_LAYER.head);
  assert.equal(at(ox + 5, oy + 5), DOLL_LAYER.none, 'the clear panel is no one\'s');
  assert.equal(doll.lining[((60) * PAPERDOLL_W + 50) * 4 + 3], 255, 'the lining kept whole, where the body went on to cover it');
  assert.equal(doll.width, PAPERDOLL_W); assert.equal(doll.height, PAPERDOLL_H);
});

test('DOLL-SKIN the rig is read off the doll: the neck under the head, the crotch where the legs\' gap closes, the hands where an arm last stands apart, the weapon\'s hand by its pixels; a robe that hides the gap falls to the proportion (mutants: the crotch read from the top; the weapon side fixed)', () => {
  const rig = buildDollRig(figure());
  assert.equal(rig.cx, 55);
  assert.equal(rig.yTop, 8); assert.equal(rig.yBot, 178);
  assert.equal(rig.neckY, 31, 'the row under the head');
  assert.equal(rig.crotchY, 95, 'the last row the legs touch, up from the feet');
  assert.equal(rig.weaponSide, -1, 'the sword is in the screen-left hand');
  assert.equal(buildDollRig(figure({ swordRight: true })).weaponSide, 1, 'and in the other, the other');
  assert.deepEqual(rig.joints.hand[-1].map(Math.round), [34, 108]);
  assert.deepEqual(rig.joints.hand[1].map(Math.round), [76, 108]);
  assert.ok(rig.joints.elbow[-1][1] > rig.shoulderY && rig.joints.elbow[-1][1] < 108, 'the elbow between');
  assert.deepEqual(Object.keys(rig.parts).sort(), ['cape', 'foot-1', 'foot1', 'head', 'item-1', 'larm-1', 'larm1', 'shin-1', 'shin1', 'thigh-1', 'thigh1', 'torso', 'uarm-1', 'uarm1'].sort());
  assert.equal(rig.ankleY, Math.round(rig.yBot + 1 - (rig.yBot - rig.yTop + 1) * 0.055), 'the feet a foot\'s height above the floor');
  assert.equal(rig.parts.cape.w, 37, 'the cloak\'s lining whole, not the rim the body leaves of it');
  const robed = buildDollRig(figure({ robe: true }));
  assert.equal(robed.crotchY, Math.round(robed.yTop + (robed.yBot - robed.yTop + 1) * 0.53), 'no gap: the proportion');
  assert.equal(buildDollRig({ width: 4, height: 4, rgba: new Uint8Array(64), labels: new Uint8Array(16) }), null, 'no figure, no rig');
});

test('DOLL-SKIN the real doll\'s ways: a cloak\'s drape beside the body is no arm (it hangs with the torso); below the crotch an arm is only the hand hanging on from above, never a fold standing out of the leg; a bent joint shows its own colours, not a hole; and the cloak\'s back is closed over a lining cut round the body (mutants: the cloak measured as the figure; a fold read as the hand; the underlays not drawn; the cloak\'s back left open)', () => {
  const plain = buildDollRig(figure());
  const draped = buildDollRig(figure({ drape: true }));
  assert.deepEqual(draped.joints.hand[1].map(Math.round), plain.joints.hand[1].map(Math.round), 'the hand where the arm is, not at the drape\'s hem');
  assert.equal(draped.parts.drape.x0 + draped.parts.drape.w - 1, 55 + 29, 'the drape is its own shell round the torso');
  assert.ok(draped.parts.torso.x0 + draped.parts.torso.w - 1 < 55 + 26, 'and not the torso\'s');
  const folded = buildDollRig(figure({ fold: true }));
  assert.deepEqual(folded.joints.hand[1].map(Math.round), plain.joints.hand[1].map(Math.round), 'the fold is the leg\'s');
  // the underlays: at rest nothing shows of them; a bent knee is closed by them
  const bare = (rig) => ({ ...rig, parts: Object.fromEntries(Object.entries(rig.parts).map(([k, p]) => [k, { ...p, ext: null }])) });
  assert.ok(plain.parts.shin1.ext && plain.parts.thigh1.ext && plain.parts.larm1.ext, 'each bending limb carries its neighbour\'s band');
  const still = renderDollFrame(plain, 'Idle', 0, 0), stillBare = renderDollFrame(bare(plain), 'Idle', 0, 0);
  assert.deepEqual(still.rgba, stillBare.rgba, 'at rest the parts cover their underlays');
  const tuck = renderDollFrame(plain, 'Idle', 0, 0, { air: 1 }), tuckBare = renderDollFrame(bare(plain), 'Idle', 0, 0, { air: 1 });
  assert.ok(opaque(tuck) > opaque(tuckBare), `the tucked knees closed: ${opaque(tuck)} against ${opaque(tuckBare)} drawn`);
  // the cloak's back, over a lining Daggerfall cut round the body
  const rimmed = buildDollRig(figure({ rim: true }));
  const front = renderDollFrame(rimmed, 'Idle', 0, 0), back = renderDollFrame(rimmed, 'Idle', 0, 4);
  const chest = 60 - (rimmed.yBot + 1 - front.height);
  const closed = px(back, back.width / 2, chest);
  assert.ok(near(closed, [120, 20, 20]) && closed[3] === 255, `from behind the cloak closes over the back: ${closed}`);
  const outside = renderDollFrame(buildDollRig(figure({ rim: true, drape: true })), 'Idle', 0, 4);
  const c = px(outside, outside.width / 2, chest);
  assert.ok(c[1] > c[0] && c[3] === 255, `the back is the cloak\'s outside colour, not its lining\'s: ${c}`);
});

const lumOf = (c) => c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;
const rowOf = (img, rig, y) => y - (rig.yBot + 1 - img.height);
const runOf = (img, row) => { let a = -1, b = -1; for (let x = 0; x < img.width; x++) if (px(img, x, row)[3]) { if (a < 0) a = x; b = x; } return [a, b]; };

test('DOLL-SKIN THE PARTS ARE SHAPES: each turns as a body does - side-on the head shows the face at its front edge and the hair behind it; a flank turned to the eye is its stuff, lit, never the doll\'s edge smeared across it; the light falls by the way each bit faces (mutants: the cross-section unread; the flank smeared; the made unlit)', () => {
  const rig = buildDollRig(figure({ cape: false, sword: false, outline: true }));
  const side = renderDollFrame(rig, 'Idle', 0, 2);
  const fr = rowOf(side, rig, 20), [a, b] = runOf(side, fr);
  assert.ok(near(px(side, a + 1, fr), [230, 190, 150], 20), `the face at the front edge: ${px(side, a + 1, fr)}`);
  const hair = px(side, b - 1, fr);
  assert.ok(hair[0] < 140 && hair[2] < 60, `the hair behind it: ${hair}`);
  // the art's dark edge, side-on: a few pixels where it faces the eye, not a smear down the leg's flank
  let dark = 0;
  for (let y = 110; y <= 138; y++) { const r = rowOf(side, rig, y); for (let x = 0; x < side.width; x++) if (near(px(side, x, r), [10, 20, 40], 8)) dark++; }
  assert.ok(dark < 30, `the edge stays an edge: ${dark} dark pixels`);
  // from behind, the tunic lit from over the viewer's left shoulder: its left flank toward the light, its middle facing
  // the eye, its right flank turned away
  const back = renderDollFrame(rig, 'Idle', 0, 4), br = rowOf(back, rig, 50), [l, r] = runOf(back, br);
  const tunic = []; for (let x = l; x <= r; x++) { const c = px(back, x, br); if (near(c, [40, 80, 160], 45)) tunic.push(c); }
  const mid = tunic[tunic.length >> 1], right = tunic[tunic.length - 2];
  assert.ok(tunic.length > 10 && lumOf(mid) > lumOf(right) + 2, `lit by its facing: the middle ${mid}, the flank turned away ${right}`);
});

test('DOLL-SKIN THE BACK IS DRAWN, stuff by stuff - a feature of the front alone is not on the back; a bare back has a spine; the hair falls to the nape and the head narrows to its neck; a garment open down the front is closed down the back (mutants: the back the front mirrored; no spine; the jaw from behind; the open shirt open behind)', () => {
  const buckled = buildDollRig(figure({ cape: false, buckle: true }));
  const back = renderDollFrame(buckled, 'Idle', 0, 4);
  let gold = 0;
  for (let i = 0; i < back.rgba.length; i += 4) if (near([back.rgba[i], back.rgba[i + 1], back.rgba[i + 2]], [250, 220, 0], 30)) gold++;
  assert.equal(gold, 0, 'no buckle behind');
  const chest = px(back, back.width / 2, rowOf(back, buckled, 61));
  assert.ok(near(chest, [40, 80, 160], 30), `the tunic behind it: ${chest}`);
  // a bare back: the spine down its middle, a crease lit on one wall and shaded on the other
  const bare = buildDollRig(figure({ cape: false, bare: true, sword: false }));
  const bb = renderDollFrame(bare, 'Idle', 0, 4), sr = rowOf(bb, bare, 70);
  const [l, r] = runOf(bb, sr), m = Math.round((l + r) / 2);
  let crease = 0;
  for (let x = m - 3; x <= m + 2; x++) crease = Math.max(crease, Math.abs(lumOf(px(bb, x, sr)) - lumOf(px(bb, x + 1, sr))));
  assert.ok(crease > 6, `the spine: a step of ${crease.toFixed(1)} across it`);
  // the head from behind: hair to the nape, then only the neck - narrower than a square jaw from the front
  const boxed = buildDollRig(figure({ cape: false, bare: true, sword: false, boxHead: true }));
  const front = renderDollFrame(boxed, 'Idle', 0, 0), behind = renderDollFrame(boxed, 'Idle', 0, 4);
  const [fa, fb] = runOf(front, rowOf(front, boxed, 29)), [ba, bb2] = runOf(behind, rowOf(behind, boxed, 29));
  assert.ok(bb2 - ba < fb - fa, `the nape narrower than the jaw: ${bb2 - ba} against ${fb - fa}`);
  // an open shirt: skin down the middle of the front, shirt down the middle of the back
  const open = figure({ cape: false, sword: false });
  for (let y = 40; y <= 90; y++) for (let x = 53; x <= 57; x++) { const i = y * 110 + x; open.rgba.set([230, 190, 150, 255], i * 4); open.labels[i] = DOLL_LAYER.body; }
  const orig = buildDollRig(open), ob = renderDollFrame(orig, 'Idle', 0, 4);
  const om = px(ob, ob.width / 2, rowOf(ob, orig, 65));
  assert.ok(near(om, [40, 80, 160], 30), `closed behind: ${om}`);
});

test('DOLL-SKIN what the hands hold: a shield faces the front wherever its arm goes, shows its strapped inside from behind, and the arm behind it is the other arm mirrored; a raised bow stands upright along its arm (mutants: the shield turned with the forearm; its inside its face; the hidden arm left out; the bow flat)', () => {
  const rig = buildDollRig(figure({ cape: false, shield: true }));
  assert.ok(rig.parts.item1.shield && rig.offhandItem, 'the shield is the left hand\'s');
  const fore = rig.parts.larm1;
  let under = 0;
  for (let y = 0; y < fore.h; y++) for (let x = 0; x < fore.w; x++) if (fore.rgba[(y * fore.w + x) * 4 + 3] && fore.x0 + x >= 55 + 16 && fore.y0 + y >= 71) under++;
  assert.ok(under > 20, `the forearm behind the shield, mirrored: ${under} pixels`);
  const pose = posePuppet('AttackMelee', 2, { weaponSide: -1, offhand: true, frames: 6 });
  const placed = placeParts(rig, pose, 0), by = Object.fromEntries(placed.map((p) => [p.name, p]));
  const dd = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
  assert.ok(dd(by.item1.d, by.torso.d) > 0.999, 'the shield faces the body\'s front');
  assert.ok(dd(by.larm1.d, by.torso.d) < 0.9, 'though the forearm under it has turned');
  // from behind, its inside: where it reaches past the arm holding it, it is there, and strapped
  const back = renderDollFrame(rig, 'Idle', 0, 4), bx = (x) => x - (rig.cx - back.width / 2);
  let inside = 0, strap = 0, area = 0;
  for (let y = 64; y <= 108; y++) for (let x = 2 * rig.cx - (55 + 32); x <= 2 * rig.cx - (55 + 26); x++) {
    const c = px(back, bx(x), rowOf(back, rig, y)); area++;
    if (c[3]) inside++;
    if (near(c, [64, 42, 26], 22)) strap++;
  }
  assert.ok(inside > area * 0.8 && strap > 6, `its inside from behind: ${inside} of ${area} drawn, ${strap} strapped`);
  // a bow raised: its card turned a quarter about the forearm, upright beside it
  const bowRig = buildDollRig(figure({ cape: false }));
  const aim = Object.fromEntries(placeParts(bowRig, posePuppet('AttackRanged', 1, { weaponSide: -1, frames: 4 }), 2).map((p) => [p.name, p]));
  assert.ok(Math.abs(dd(aim['item-1'].s, aim['larm-1'].d)) > 0.99, 'the bow\'s plane turned to stand upright');
  const hang = Object.fromEntries(placeParts(bowRig, posePuppet('Idle', 0, {}), 0).map((p) => [p.name, p]));
  assert.ok(Math.abs(dd(hang['item-1'].s, hang['larm-1'].s)) > 0.99, 'hanging, as drawn');
});

test('DOLL-SKIN the body moves whole: a robe that hides the legs is one skirt from the hips, the feet stepping under it; the walk turns the shoulders against the hips; the stroke winds the body up and drives it through; the archer stands side-on (mutants: the robe split in two legs; the walk stiff; the stroke all arm)', () => {
  const robed = buildDollRig(figure({ robe: true }));
  assert.ok(robed.parts.skirt && robed.parts['foot-1'] && robed.parts.foot1, 'one skirt, two feet');
  assert.ok(!robed.parts['thigh-1'] && !robed.parts.shin1, 'no legs to split it');
  const yawOf = (p) => Math.atan2(p.d[0], p.d[2]) / RAD_;
  const RAD_ = Math.PI / 180;
  const rig = buildDollRig(figure({ cape: false }));
  const step = Object.fromEntries(placeParts(rig, posePuppet('Move', 0, { weaponSide: -1, frames: 4 }), 0).map((p) => [p.name, p]));
  assert.ok(Math.abs(yawOf(step.torso)) > 4 && Math.sign(yawOf(step.torso)) === -Math.sign(yawOf(step['thigh-1'])), `the shoulders against the hips: ${yawOf(step.torso).toFixed(1)}, ${yawOf(step['thigh-1']).toFixed(1)}`);
  const wound = posePuppet('AttackMelee', 2, { weaponSide: -1, frames: 6 }), cut = posePuppet('AttackMelee', 4, { weaponSide: -1, frames: 6 });
  assert.ok(Math.sign(wound.twist) === -Math.sign(cut.twist) && Math.abs(wound.twist) > 15 && Math.abs(cut.twist) > 15, `wound ${wound.twist}, driven ${cut.twist}`);
  assert.ok(Math.abs(posePuppet('AttackRanged', 1, { weaponSide: -1, frames: 4 }).twist) >= 45, 'side-on to the mark');
});

test('DOLL-SKIN the stand from the front IS the doll - every pixel where it was drawn, on the floor, about its centre line (mutants: an arm abducted at rest; the frame off its centre)', () => {
  const doll = figure();
  const rig = buildDollRig(doll);
  const f = renderDollFrame(rig, 'Idle', 0, 0);
  assert.equal(f.height, rig.yBot + 1 - rig.yTop, 'the bottom row is the floor the feet stand on');
  const hw = f.width / 2, ox = rig.cx - hw, oy = rig.yBot + 1 - f.height;
  let differ = 0, n = 0;
  for (let y = 0; y < f.height; y++) for (let x = 0; x < f.width; x++) {
    const dx = x + ox, dy = y + oy;
    const want = dx >= 0 && dx < doll.width ? Array.from(doll.rgba.subarray((dy * doll.width + dx) * 4, (dy * doll.width + dx) * 4 + 4)) : [0, 0, 0, 0];
    const got = px(f, x, y);
    if (!want[3] && !got[3]) continue;
    n++;
    if (want.join() !== got.join()) differ++;
  }
  assert.ok(n > 3000);
  assert.equal(differ, 0, `${differ} of ${n} pixels moved`);
});

test('DOLL-SKIN the views turn: the back is the front mirrored, its head the hair\'s colour and the cloak over the back; side-on the figure narrows and faces the screen\'s left, the eye at its left (mutants: the back unmirrored; the face kept from behind; the cloak left under the body; the side facing right)', () => {
  const rig = buildDollRig(figure());
  const front = renderDollFrame(rig, 'Idle', 0, 0), back = renderDollFrame(rig, 'Idle', 0, 4), side = renderDollFrame(rig, 'Idle', 0, 2);
  assert.equal(back.width, front.width);
  // the sword hangs at the screen-left from the front, the screen-right from behind
  const swordAt = (img) => { for (let x = 0; x < img.width; x++) if (px(img, x, img.height - 40).join() === '200,200,210,255') return x; return -1; };
  assert.ok(swordAt(front) < front.width / 2 && swordAt(back) > back.width / 2, `the sword at ${swordAt(front)} then ${swordAt(back)}`);
  // the face is hair from behind; the tunic is the cloak
  const faceRow = 20 - (rig.yBot + 1 - front.height);
  assert.deepEqual(px(front, front.width / 2, faceRow).slice(0, 3), [230, 190, 150]);
  const hairBack = px(back, back.width / 2, faceRow);
  assert.ok(hairBack[0] < 150 && hairBack[1] < 110 && hairBack[2] < 60, `the back of the head is hair, not a face: ${hairBack}`);
  const chest = 60 - (rig.yBot + 1 - front.height);
  assert.deepEqual(px(front, front.width / 2, chest).slice(0, 3), [40, 80, 160], 'the tunic from the front');
  assert.ok(near(px(back, back.width / 2, chest), [120, 20, 20]), `the cloak from behind: ${px(back, back.width / 2, chest)}`);
  const w = (img, row) => { let a = -1, b = -1; for (let x = 0; x < img.width; x++) if (px(img, x, row)[3]) { if (a < 0) a = x; b = x; } return b - a; };
  assert.ok(w(side, chest) < w(front, chest) * 0.75, `side-on the body narrows: ${w(side, chest)} against ${w(front, chest)}`);
  // the cut, arm forward: side-on the forward is the screen's left
  const cut = renderDollFrame(rig, 'AttackMelee', 3, 2);
  const steel = []; for (let y = 0; y < cut.height; y++) for (let x = 0; x < cut.width; x++) if (px(cut, x, y).join() === '200,200,210,255') steel.push(x);
  assert.ok(steel.length && steel.reduce((a, b) => a + b, 0) / steel.length < cut.width / 2 - 10, 'the blade forward - to the screen\'s left');
  assert.deepEqual(VIEW_DEGREES, [0, 45, 90, 135, 180]);
});

test('DOLL-SKIN the clips: the body\'s own frame counts; a walk that steps, a stroke that rises over the head, a jump that tucks its feet off the floor and a fall that lies down (mutants: a clip frame skipped; the jump not laid over the table; the fall standing)', () => {
  for (const [t, n] of Object.entries(DOLL_TABLE_FRAMES)) assert.equal(TABLE_FRAMES[t], n, `${t}: the body's clip length`);
  const rig = buildDollRig(figure());
  const sig = (img) => `${img.width}x${img.height}:${opaque(img)}`;
  const walk = [0, 1, 2, 3].map((f) => Buffer.from(renderDollFrame(rig, 'Move', f, 1).rgba).toString('base64'));
  assert.equal(new Set(walk).size, 4, 'four steps, four pictures');
  const stroke = [0, 1, 2, 3, 4, 5].map((f) => renderDollFrame(rig, 'AttackMelee', f, 0));
  assert.ok(stroke[2].height > stroke[0].height + 10, 'the top of the stroke stands over the head');
  const up = renderDollFrame(rig, 'Idle', 0, 2, { air: 1 }), down = renderDollFrame(rig, 'Idle', 0, 2, { air: 2 });
  assert.ok(bboxOf(up).y1 < up.height - 5, `rising, the feet tucked off the floor (lowest row ${bboxOf(up).y1} of ${up.height})`);
  assert.notEqual(sig(up), sig(down));
  const armed = posePuppet('IdleMelee', 0, { weaponSide: -1, air: 1 });
  assert.equal(armed.arm[-1].sh, 35, 'the jump keeps the weapon ready');
  assert.equal(armed.leg[-1].knee, 75, 'and tucks the legs');
  const lying = renderDollFrame(rig, 'Death', 1, 0);
  assert.ok(lying.width > lying.height * 2, `the fallen lie: ${lying.width}x${lying.height}`);
  assert.equal(posePuppet('Death', 1, { air: 1 }).rot, 90, 'the dead do not jump');
});

test('DOLL-SKIN the sprite door: a paperdoll look with its doll answers the doll\'s archive, the wheel\'s record and mirror, the generation and the jump in its record; with none yet, the mod\'s first set; its offset is its own scale, its key its own URL (mutants: the doll ignored; the generation out of the record)', () => {
  const doll = { archive: DOLL_ARCHIVE, gen: 3 };
  const s = spriteFor('Move', 1, 2, { onFoot: PAPERDOLL_SKIN, doll, air: 1 });
  assert.deepEqual({ archive: s.archive, record: s.record, mirror: s.mirror, rec: s.rec, key: s.key },
    { archive: DOLL_ARCHIVE, record: 1, mirror: true, rec: 'Move.1-2mj1g3', key: `doll:${DOLL_ARCHIVE}:3:Move:1:2:1` });
  assert.equal(spriteFor('Idle', 6, 0, { onFoot: PAPERDOLL_SKIN, doll }).record, 2, 'orientation 6: record 2, unmirrored');
  assert.equal(spriteFor('Idle', 0, 0, { onFoot: PAPERDOLL_SKIN }).archive, ARCHIVE_FOOT, 'no doll yet: the mod\'s first set');
  assert.equal(spriteFor('IdleHorse', 0, 0, { onFoot: PAPERDOLL_SKIN, doll }).archive !== DOLL_ARCHIVE, true, 'the saddle is the mod\'s');
  assert.equal(eotbSpriteUrl(s.key), s.key);
  assert.equal(PAPERDOLL_SKIN, FOOT_SKIN_COUNT);
  assert.equal(FOOT_SKINS, PAPERDOLL_SKIN + 1, 'the wire bounds the look\'s set at the paperdoll');
  assert.equal(MOD_SETTINGS['eye-of-the-beholder'].keys['Graphics.OnFoot'].labels[PAPERDOLL_SKIN], 'Your paperdoll');
  assert.deepEqual(FOOT_GROUPS.at(-1), { label: 'Your paperdoll', from: PAPERDOLL_SKIN, to: Infinity });
  assert.deepEqual(skinSets().foot.at(-1), { index: PAPERDOLL_SKIN, name: 'Your paperdoll', key: null, url: null }, 'no doll: the tile says its name');
});

/** The skin's clock and timer in the test's hands. */
function seams() {
  _resetDollSkinForTests();
  let now = 0;
  const timers = [];
  _setDollSkinSeamsForTests({ compose: async () => figure(), now: () => now, after: (fn, ms) => timers.push({ fn, at: now + ms }) });
  return {
    tick(ms = 0) { now += ms; for (const t of timers.splice(0)) { if (t.at <= now) t.fn(); else timers.push(t); } },
    get now() { return now; }, set now(v) { now = v; }, timers,
  };
}
const flush = () => new Promise((r) => setImmediate(r));
const entity = (items = []) => ({ race: 'Breton', gender: 'male', faceIndex: 2, items, equip: { slots: [] } });

test('DOLL-SKIN the player\'s doll: composed off their own entity, re-composed when their gear changes, the old outfit\'s textures let go DOLL_RETIRE_MS on; its scale stands it DOLL_FIGURE_PX tall; its frames come out in the world\'s rows (mutants: the recipe blind to the gear; the retire told at once; the rows not turned)', async () => {
  const t = seams();
  const e = entity();
  assert.equal(localDoll(e), null, 'composing');
  await flush();
  const h = localDoll(e);
  assert.deepEqual(h, { archive: DOLL_ARCHIVE, gen: 1 });
  const rig = buildDollRig(figure());
  assert.equal(dollScale(DOLL_ARCHIVE), rig.figureHeight / DOLL_FIGURE_PX);
  assert.deepEqual(spriteOffset(DOLL_ARCHIVE, 0), { scale: rig.figureHeight / DOLL_FIGURE_PX, x: 0, y: 0 });
  // the frame, bottom row first
  const key = dollSprite('Idle', 0, 0, h).key;
  const out = drawFrame(key);
  const top = renderDollFrame(rig, 'Idle', 0, 0);
  assert.equal(out.width, top.width);
  const bottomRow = Array.from(top.rgba.subarray((top.height - 1) * top.width * 4, top.height * top.width * 4));
  assert.deepEqual(Array.from(new Uint8Array(out.colors.buffer, out.colors.byteOffset, top.width * 4)), bottomRow, 'row 0 is the picture\'s bottom');
  // a new outfit: a new generation, the old one retired a moment later
  const heard = [];
  onDollRetired((a, g) => heard.push([a, g]));
  const sword = { templateIndex: 120, group: 'Weapons', equipSlot: EQUIP_SLOTS.RightHand, material: 1 };
  const e2 = { ...entity([sword]), equip: { slots: Object.assign([], { [EQUIP_SLOTS.RightHand]: sword }) } };
  assert.notEqual(dollRecipe(e2), dollRecipe(e), 'the recipe sees the sword');
  t.tick(100);
  assert.deepEqual(localDoll(e2), { archive: DOLL_ARCHIVE, gen: 1 }, 'looked at only every DOLL_RECIPE_MS - and the old one stands while the new composes');
  t.tick(500);
  localDoll(e2);
  await flush();
  assert.deepEqual(localDoll(e2), { archive: DOLL_ARCHIVE, gen: 2 });
  assert.deepEqual(heard, [], 'not at once');
  t.tick(DOLL_RETIRE_MS);
  assert.deepEqual(heard, [[DOLL_ARCHIVE, 1]]);
  assert.ok(isRetiredTex(`${DOLL_ARCHIVE}:Idle.0-0g1`, DOLL_ARCHIVE, 1) && !isRetiredTex(`${DOLL_ARCHIVE}:Idle.0-0g2`, DOLL_ARCHIVE, 1));
  assert.throws(() => drawFrame(key), /no such doll/, 'an outgrown generation\'s frame is not drawn');
  assert.ok(dollPreview().width > 0, 'the card\'s picture');
  _resetDollSkinForTests();
});

test('DOLL-SKIN the peers\' dolls: composed off their looks\' stand-ins, a slot each, shared by one look, the least recently drawn let go past DOLL_PEER_SLOTS (mutants: a slot per call; no slot let go)', async () => {
  const t = seams();
  const made = [];
  setDollPeerEntity((look) => { made.push(look.race); return entity(); });
  const look = (race) => ({ race, gender: 'male', faceIndex: 0, items: [] });
  assert.equal(peerDoll(look('Nord')), null);
  assert.equal(peerDoll(look('Nord')), null, 'still composing - asked once');
  assert.deepEqual(made, ['Nord']);
  await flush();
  assert.deepEqual(peerDoll(look('Nord')), { archive: DOLL_ARCHIVE + 1, gen: 1 });
  const heard = [];
  onDollRetired((a, g) => heard.push([a, g]));
  const races = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
  for (const r of races) { t.now += 1; peerDoll(look(r)); }
  await flush();
  assert.equal(_dollSlotsForTests().length, DOLL_PEER_SLOTS);
  t.now += 1; peerDoll(look('Z'));
  assert.equal(_dollSlotsForTests().length, DOLL_PEER_SLOTS, 'one let go for the new one');
  t.tick(DOLL_RETIRE_MS);
  assert.deepEqual(heard, [[DOLL_ARCHIVE + 1, 1]], 'the Nord - the least recently drawn');
  _resetDollSkinForTests();
});

test('DOLL-SKIN the decode doors draw a doll\'s frame - the body\'s and the peers\' - a few a task, never fetched (mutants: a doll key fetched)', async () => {
  const t = seams();
  localDoll(entity());
  await flush();
  const h = localDoll(entity());
  const keys = [0, 1, 2, 3, 4].map((v) => dollSprite('Move', [0, 7, 6, 5, 4][v], 1, h).key);
  const all = Promise.all(keys.map((k) => decodeSprite(k)));
  for (let i = 0; i < keys.length && t.timers.length; i++) t.tick(0);   // a few a task: the rest the next
  const got = await all;
  assert.ok(got.every((g) => g.width > 0 && g.colors.length === g.width * g.height));
  const one = dollFramePixels(keys[0]);
  t.tick(0);
  assert.ok((await one).width > 0);
  _resetDollSkinForTests();
});

test('DOLL-SKIN the jump: 0 on the ground, swimming, levitating, riding or on a wall; 1 the moment the body rises; 2 once it has fallen AIR_FALL_MS - a kerb is no jump; on the wire only in the air (mutants: the fall drawn at once; a rise held back)', () => {
  assert.equal(airborneOf({ grounded: true, velY: 5 }), 0);
  for (const k of ['swimming', 'levitating', 'riding', 'climbing']) assert.equal(airborneOf({ grounded: false, [k]: true, velY: 5 }), 0, k);
  assert.equal(airborneOf({ grounded: false, velY: 4 }), 1);
  assert.equal(airborneOf({ grounded: false, velY: -3 }), 2);
  const c = createAirClock();
  assert.equal(c({ grounded: false, velY: 4 }, 0), 1, 'a rise at once');
  assert.equal(c({ grounded: false, velY: -1 }, 50), 2, 'the same jump coming down');
  const k = createAirClock();
  assert.equal(k({ grounded: false, velY: -1 }, 1000), 0, 'stepping off a kerb');
  assert.equal(k({ grounded: false, velY: -2 }, 1000 + AIR_FALL_MS - 1), 0);
  assert.equal(k({ grounded: false, velY: -3 }, 1000 + AIR_FALL_MS), 2, 'a fall that lasts');
  assert.equal(k({ grounded: true }, 1200), 0);
  assert.equal(motionBagOf({ velY: 2.5 }).velY, 2.5);
  const player = { grounded: false, velY: 3 };
  assert.deepEqual(airPoseOf(player, 0), { jp: 1 });
  assert.deepEqual(airPoseOf({ grounded: true }, 0), {});
});

test('DOLL-SKIN the wire: a look may name the paperdoll and the relay keeps it; a pose in the air carries `jp` (1 or 2), omitted on the ground, and a jump begun or landed is news at once (mutants: jp dropped; jp unbounded; the change not news)', () => {
  const look = { race: 'Breton', gender: 'male', faceIndex: 0, eo: PAPERDOLL_SKIN, items: [] };
  assert.equal(validLook(look).eo, PAPERDOLL_SKIN);
  const pose = { x: 1, y: 2, z: 3, yaw: 0, pitch: 0 };
  assert.equal(validPose({ ...pose, jp: 1 }).jp, 1);
  assert.equal(validPose({ ...pose, jp: 2 }).jp, 2);
  assert.equal(validPose({ ...pose, jp: 9 }).jp, 2, 'bounded');
  assert.equal('jp' in validPose({ ...pose, jp: 0 }), false, 'omitted on the ground');
  assert.equal('jp' in validPose(pose), false);
  assert.equal(poseChanged({ ...pose, jp: 1 }, pose), true);
  assert.equal(poseChanged({ ...pose, jp: 1 }, { ...pose, jp: 1 }), false);
  assert.match(rd('src/scenes/world.js'), /if \(seated\) arm\.st = seated\.st;[^\n]*\n\s*Object\.assign\(arm, airPoseOf\(player, performance\.now\(\)\)\);/, 'the host sends it, on the arm before it goes');
});

const renderer = () => ({
  uploads: [], batches: [],
  uploadTexture(archive, rec, img) { this.uploads.push({ archive, rec, img }); },
  createBillboardBatch(archive, rec, size) { const b = { archive, rec, size, origin: [0, 0, 0] }; this.batches.push(b); return b; },
  destroyBillboardBatch() {}, drawBillboards() {}, evictTexture(k) { (this.evicted ??= []).push(k); },
});

test('DOLL-SKIN the body wears it: the paperdoll chosen, the rig\'s entity composes the doll, every frame is the doll\'s own (its archive), and in the air the record says so (mutants: the entity not handed; the jump not in the look)', async () => {
  const t = seams();
  _resetModSettings();
  setModSetting('eye-of-the-beholder', 'Graphics.OnFoot', PAPERDOLL_SKIN);
  const r = renderer();
  const b = createEotbBody({ count: () => 3035, urlFor: (k) => `/art/${k}.png`, decode: async () => ({ width: 4, height: 6, colors: new Uint32Array(24) }) });
  b.attach(r, () => ({}));
  await new Promise((res) => setTimeout(res, 5));
  b.toggle(true, false);
  const e = entity();
  const still = (extra = {}) => ({ motion: { forward: 0, standing: true, speed: 0, grounded: true, height: 1.8 }, feet: [0, 0, 0], yaw: 0, cameraPos: [0, 1.5, -2], entity: e, ...extra });
  for (let i = 0; i < 5; i++) b.tick(1 / 60, still());
  await flush();
  for (let i = 0; i < 5; i++) b.tick(1 / 60, still());
  await new Promise((res) => setTimeout(res, 5));
  b.draw(null, { eye: [0, 1.5, -2], feet: [0, 0, 0], yaw: 0 });
  assert.ok(r.uploads.some((u) => u.archive === DOLL_ARCHIVE), 'the doll\'s frames uploaded');
  assert.equal(r.batches.at(-1).archive, DOLL_ARCHIVE, 'and drawn');
  for (let i = 0; i < 3; i++) b.tick(1 / 60, still({ motion: { forward: 0, standing: true, speed: 0, grounded: false, velY: 4, height: 1.8 } }));
  b.draw(null, { eye: [0, 1.5, -2], feet: [0, 0, 0], yaw: 0 });
  await new Promise((res) => setTimeout(res, 5));
  b.draw(null, { eye: [0, 1.5, -2], feet: [0, 0, 0], yaw: 0 });
  assert.match(r.batches.at(-1).rec, /j1g1$/, 'rising');
  assert.match(rd('src/combat/weaponRig.js'), /\n\s*entity,\s*\/\/ DOLL-SKIN/, 'the rig hands the body its entity');
  _resetModSettings();
  _resetDollSkinForTests();
  void t;
});

test('DOLL-SKIN a peer wearing it: their doll composed here off their look - until then they stand as before - then drawn as it, jumping when the pose says (mutants: drawn as the mod\'s set; the pose\'s jump ignored; a flinch as the doll\'s fall)', async () => {
  assert.match(rd('src/net/remotePlayers.js'), /^setDollPeerEntity\(peerStubEntity\);/m, 'the stand-in the flat doll is composed off is the skin\'s');
  seams();
  setDollPeerEntity(() => entity());
  const made = [];
  const rend = { uploadTexture() {}, createBillboardBatch: (archive, record, size) => { const b = { archive, record, size, origin: null }; made.push(b); return b; }, destroyBillboardBatch() {} };
  const art = createEotbArt({ renderer: rend, urlFor: (k) => `u:${k}`, decode: async () => ({ width: 50, height: 110, colors: new Uint32Array(50 * 110) }) });
  const w = createPeerWalkers({ art });
  const pose = (o = {}) => ({ x: 4, y: 0, z: 9, yaw: 0, pitch: 0, mv: 0, wd: 0, an: 0, sr: 0, cn: 0, ar: 0, ...o });
  const peer = { id: 'p1', look: { race: 'Nord', gender: 'male', faceIndex: 0, eo: PAPERDOLL_SKIN, items: [] }, shown: pose() };
  const toScene = (p) => [p.x, p.y, p.z];
  w.sync([peer], toScene, { eye: [4, 1, 20], dt: 0.01 });
  assert.equal(w.isWalking('p1'), false, 'composing: the class sprite still stands for them');
  await flush();
  w.sync([peer], toScene, { eye: [4, 1, 20], dt: 0.01 });
  await new Promise((res) => setTimeout(res, 5));
  w.sync([peer], toScene, { eye: [4, 1, 20], dt: 0.01 });
  assert.equal(w.isWalking('p1'), true);
  assert.equal(w.batches()[0].archive, DOLL_ARCHIVE + 1, 'their own doll');
  w.sync([{ ...peer, shown: pose({ jp: 2 }) }], toScene, { eye: [4, 1, 20], dt: 0.01, hurt: () => true });
  await new Promise((res) => setTimeout(res, 5));
  w.sync([{ ...peer, shown: pose({ jp: 2 }) }], toScene, { eye: [4, 1, 20], dt: 0.01, hurt: () => true });
  assert.match(w.batches()[0].record, /^Idle\..*j2g1$/, 'falling - and struck, no fall-table flinch');
  _resetDollSkinForTests();
});
