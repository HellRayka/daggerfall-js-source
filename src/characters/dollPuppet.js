// DOLL-SKIN (2026-10-11, the owner: "transform the paperdoll into a proper directional sprite with attack animations,
// jump animations, etc allowing the user to use their paperdoll instead of the eye of the Beholder skin system"):
// THE PAPERDOLL AS A PUPPET - the player's own composed doll, cut into parts and posed, drawn from the eight views and
// through the clips the Eye Of The Beholder body plays (player/eotbBillboard.js's tables and clip lengths).
//
// NO DFU SOURCE AND NO ART OF OUR OWN. Daggerfall draws the paperdoll from the front alone (ui/paperDoll.js: no back
// or side record exists in ARENA2), so every other view and every clip here is MADE at run time from the player's own
// composite - the owner's pick among three ways (a cut-out puppet; a 3D figure painted with the doll; the flat doll
// animated facing the eye): the cut-out. Nothing here is a picture and nothing is committed: the rig is a few numbers
// read off the doll's own silhouette, and every frame is drawn from the player's ARENA2 in their browser (Port-Doctrine
// "A RENDER OF GAME DATA IS GAME DATA" - player/dollSkin.js keeps the frames in the renderer and nowhere else).
//
// THE RIG (buildDollRig). The joints are read off the composite's figure (DOLL_LAYER, the compositor's labels, by the
// stuff each pixel is) - the neck under the head, the shoulders just below it, the crotch where the gap between the
// legs closes, the hands where an arm last stands apart from the body (or where the arm's stuff meets the torso's), the
// elbows and knees half way, the ankles a foot above the floor - with a proportion where the silhouette does not say.
// The pixels are cut by those joints into a head, a torso, two upper arms, two forearms, two thighs, two shins, two
// feet, the cloak (its lining, and its drape over the shoulders), and the two hands' items.
//
// THE PARTS ARE SHAPES (PART_SHAPE). Each part of the body is an elliptical cylinder round its bone, deep for its width
// as a head, a chest or a limb is, a foot reaching forward of the leg. Its front half wears the doll - which is exactly
// that half, seen from the front - and its back half wears the doll's BACK, drawn here stuff by stuff (backOfDoll): the
// plate, the cloth, the skin, the hair, each in its own colours and lit as a body is, with a spine, shoulder blades, a
// seat, the backs of the knees, the heels, the hair falling to the nape, a shield's strapped inside. The items are cards
// in their hand: a blade stays a blade, a shield turns edge-on and shows its back.
//
// THE VIEWS (renderDollFrame). Five records, as the wheel draws them (eotbBillboard.js RECORD_OFFSETS): 0 the front, 4
// the back, 1-3 between - and unmirrored, the eye at the figure's LEFT (the wheel's orientations 5-7: orientationFor's
// SignedAngle, camera to the left of the facing), so the figure faces the screen's left and its left side is the near
// one; the wheel mirrors them for the other half. Every part is posed in the figure's own frame (x its left, y down, z
// its forward), every pixel of the frame is traced back onto the surface that shows there - the front's picture or the
// back's, by which way that bit of the surface faces - and the nearest surface wins (a depth per pixel). The front-on
// stand is the doll, pixel for pixel.
//
// THE CLIPS (posePuppet). Every table the body plays, at its own frame count (TABLE_FRAMES): a stand, a four-step walk,
// the weapon ready and its six-frame stroke, the bow drawn and loosed, the spell readied and cast, the fall - and the
// jump, the port's own (`air` 1 rising, 2 falling), laid over whichever table the body stands in.

import { EQUIP_SLOTS } from './paperdoll.js';

/** What drew each pixel of a labelled composite (ui/paperDoll.js composePaperDollPixels `labels`), by the stuff it is
 *  made of - the back of each is drawn as that stuff (backOfDoll): the nude figure's skin (`body`), the head (hair and
 *  face), a helm, the cloak's lining (behind the body) and its own layer, the right hand's and the left hand's items (a
 *  shield its own), what is worn on the chest, the legs, the feet and the arms (gauntlets, pauldrons, bracers), the
 *  smallclothes the body wears with nothing over them (`under`), and jewellery. 0 is nothing drawn. */
export const DOLL_LAYER = Object.freeze({
  none: 0, body: 1, head: 2, lining: 3, right: 4, left: 5, cloak: 6, helm: 7,
  chest: 8, legs: 9, feet: 10, arms: 11, shield: 12, under: 13, jewel: 14,
});
const L = DOLL_LAYER;

const SLOT_LAYER = new Map([
  [EQUIP_SLOTS.Head, L.helm], [EQUIP_SLOTS.Cloak1, L.cloak], [EQUIP_SLOTS.Cloak2, L.cloak],
  [EQUIP_SLOTS.ChestArmor, L.chest], [EQUIP_SLOTS.ChestClothes, L.chest],
  [EQUIP_SLOTS.LegsArmor, L.legs], [EQUIP_SLOTS.LegsClothes, L.legs], [EQUIP_SLOTS.Feet, L.feet],
  [EQUIP_SLOTS.Gloves, L.arms], [EQUIP_SLOTS.RightArm, L.arms], [EQUIP_SLOTS.LeftArm, L.arms],
  [EQUIP_SLOTS.Bracer0, L.arms], [EQUIP_SLOTS.Bracer1, L.arms],
  [EQUIP_SLOTS.Amulet0, L.jewel], [EQUIP_SLOTS.Amulet1, L.jewel], [EQUIP_SLOTS.Bracelet0, L.jewel], [EQUIP_SLOTS.Bracelet1, L.jewel],
  [EQUIP_SLOTS.Ring0, L.jewel], [EQUIP_SLOTS.Ring1, L.jewel], [EQUIP_SLOTS.Mark0, L.jewel], [EQUIP_SLOTS.Mark1, L.jewel],
  [EQUIP_SLOTS.Crystal0, L.jewel], [EQUIP_SLOTS.Crystal1, L.jewel],
]);
/** The layer an item worn in `slot` draws as - armour in a hand (`item.group`) is a shield. */
export function dollLayerOfSlot(slot, item = null) {
  if (slot === EQUIP_SLOTS.RightHand || slot === EQUIP_SLOTS.LeftHand) {
    if (item?.group === 'Armor') return L.shield;
    return slot === EQUIP_SLOTS.RightHand ? L.right : L.left;
  }
  return SLOT_LAYER.get(slot) ?? L.body;
}

/** The figure's proportions where its silhouette does not say, as fractions of its height from the top of the head:
 *  the neck, the crotch (and the bounds a found one is held to), the torso's half-width bounds, the foot's height. */
export const DOLL_PROPORTION = Object.freeze({
  neck: 0.14, neckMin: 0.08, neckMax: 0.22,
  crotch: 0.53, crotchMin: 0.42, crotchMax: 0.66,
  shoulderDrop: 0.03, torsoHalfMin: 0.06, torsoHalfMax: 0.11, hipHalf: 0.045, handPastCrotch: 0.02, foot: 0.055,
});

/**
 * THE PARTS' SHAPES: each part of the body an elliptical cylinder round its bone - `depth` its depth for its width (the
 * ellipse's two axes), `forward` where its middle stands forward of the bone, for its half-width (a foot reaches forward
 * of the leg, a skull back from the face). The cloak hangs behind the torso's back.
 */
export const PART_SHAPE = Object.freeze({
  head: Object.freeze({ depth: 0.95, forward: -0.12 }),
  torso: Object.freeze({ depth: 0.62, forward: 0 }),
  arm: Object.freeze({ depth: 0.95, forward: 0 }),
  leg: Object.freeze({ depth: 0.95, forward: 0 }),
  foot: Object.freeze({ depth: 1, forward: 0.55 }),
  cape: Object.freeze({ depth: 0.3, forward: 0 }),
  drape: Object.freeze({ depth: 0.45, forward: 0 }),
  skirt: Object.freeze({ depth: 0.62, forward: 0 }),
});
const shapeOf = (name) => PART_SHAPE[
  name === 'head' || name === 'torso' || name === 'cape' || name === 'drape' || name === 'skirt' ? name : name.startsWith('foot') ? 'foot' : /^(thigh|shin)/.test(name) ? 'leg' : 'arm'];
/** Where two surfaces meet at one depth, the nearer by rule: the head over its collar, the torso's hem over the thighs,
 *  the thigh over the shin, the boot over the trouser's hem, the robe over the feet under it. */
const DEPTH_BIAS = Object.freeze({ head: 1, thigh: -2, shin: -2.5, foot: -2.2, item: 0.01, drape: 0.5, skirt: -0.5 });
const biasOf = (name) => DEPTH_BIAS[name.replace(/-?1$/, '')] ?? 0;

/** The view each drawn record stands for: the eye's angle round the figure from its front, toward its left. */
export const VIEW_DEGREES = Object.freeze([0, 45, 90, 135, 180]);

const ITEMS = new Set([L.right, L.left, L.shield]);
/** The figure the rig is measured on: not the cloak (its drape beside the body is no arm), its lining, or what the hands
 *  hold. */
const isFigure = (l) => l !== L.none && l !== L.lining && l !== L.cloak && !ITEMS.has(l);
/** What the torso wears, and what an arm is: where an arm drawn against the body meets it, the one gives on the other. */
const TORSO_WEAR = new Set([L.chest, L.under, L.jewel]);
const ARM_STUFF = new Set([L.body, L.arms]);
const SIDES = Object.freeze([-1, 1]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lumAt = (px, o) => px[o] * 0.299 + px[o + 1] * 0.587 + px[o + 2] * 0.114;

const PART_NAMES = Object.freeze(['head', 'torso', 'cape', 'drape', 'skirt', 'uarm-1', 'larm-1', 'uarm1', 'larm1',
  'thigh-1', 'shin-1', 'foot-1', 'thigh1', 'shin1', 'foot1', 'item-1', 'item1']);
/** Each part's bone, rest joint to rest joint: a card rides its holder's. */
const BONE = Object.freeze({
  head: ['neck', 'top'], torso: ['pelvis', 'neck'], cape: ['pelvis', 'neck'], drape: ['pelvis', 'neck'], skirt: ['pelvis', 'hem'],
  uarm: ['shoulder', 'elbow'], larm: ['elbow', 'hand'], item: ['elbow', 'hand'],
  thigh: ['hip', 'knee'], shin: ['knee', 'ankle'], foot: ['ankle', 'foot'],
});
const CARDS = new Set(['item-1', 'item1']);

/**
 * THE RIG, off one labelled composite: `{ width, height, rgba, labels, lining }` (top row first, as the compositor
 * answers). Null when there is no figure in it. Pure.
 */
export function buildDollRig(doll) {
  const { width: W, height: H, rgba } = doll ?? {};
  if (!W || !H || !rgba) return null;
  const labels = doll.labels ?? null;
  const lab = (i) => (rgba[i * 4 + 3] ? (labels ? labels[i] : L.body) : L.none);
  const fig = (x, y) => x >= 0 && x < W && y >= 0 && y < H && isFigure(lab(y * W + x));
  let yTop = -1, yBot = -1;
  for (let y = 0; y < H && yTop < 0; y++) for (let x = 0; x < W; x++) if (fig(x, y)) { yTop = y; break; }
  for (let y = H - 1; y >= 0 && yBot < 0; y--) for (let x = 0; x < W; x++) if (fig(x, y)) { yBot = y; break; }
  if (yTop < 0 || yBot <= yTop) return null;
  const Hf = yBot - yTop + 1;
  const P = DOLL_PROPORTION;

  // the head: its own layers' box, else the top of the figure
  let hx = 0, hn = 0, hy0 = H, hy1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const l = lab(y * W + x);
    if (l !== L.head && l !== L.helm) continue;
    hx += x; hn++; if (y < hy0) hy0 = y; if (y > hy1) hy1 = y;
  }
  let cx;
  if (hn) cx = Math.round(hx / hn);
  else {
    let s = 0, n = 0;
    const band = yTop + Math.round(Hf * 0.05);
    for (let x = 0; x < W; x++) if (fig(x, band)) { s += x; n++; }
    cx = n ? Math.round(s / n) : W >> 1;
  }
  const neckY = Math.round(clamp(hn ? hy1 + 1 : yTop + Hf * P.neck, yTop + Hf * P.neckMin, yTop + Hf * P.neckMax));
  const shoulderY = neckY + Math.max(2, Math.round(Hf * P.shoulderDrop));

  // the runs of the figure along a row
  const runsAt = (y) => {
    const out = [];
    let x0 = -1;
    for (let x = 0; x <= W; x++) {
      const on = x < W && fig(x, y);
      if (on && x0 < 0) x0 = x;
      else if (!on && x0 >= 0) { out.push([x0, x - 1]); x0 = -1; }
    }
    return out;
  };
  const gapAtCentre = (y) => !fig(cx, y) && !fig(cx - 1, y) && runsAt(y).some(([, b]) => b < cx) && runsAt(y).some(([a]) => a > cx);

  // the crotch: up from the feet while the legs stand apart
  let crotchY;
  const crotchFound = gapAtCentre(yBot) || gapAtCentre(yBot - 1);
  if (crotchFound) {
    let y = yBot;
    while (y > yTop && gapAtCentre(y - 1)) y--;
    crotchY = y - 1;
  } else crotchY = yTop + Hf * P.crotch;
  crotchY = Math.round(clamp(crotchY, yTop + Hf * P.crotchMin, yTop + Hf * P.crotchMax));

  // the torso's half-width: its narrowest run through the centre between the chest and the crotch, held to a man's
  let narrow = Infinity;
  for (let y = shoulderY + Math.round((crotchY - shoulderY) * 0.25); y < crotchY; y++) {
    const r = runsAt(y).find(([a, b]) => a <= cx && b >= cx);
    if (r) narrow = Math.min(narrow, Math.max(cx - r[0], r[1] - cx));
  }
  const torsoHalf = Math.round(clamp(Number.isFinite(narrow) ? narrow : Hf * 0.08, Hf * P.torsoHalfMin, Hf * P.torsoHalfMax));

  // where an arm drawn against the body meets it: out from the centre, the first of an arm's stuff (skin, gauntlet)
  // past the torso's wear - a bare arm beside a shirt, a gauntlet beside a cuirass
  const wornEdge = (y, s) => {
    let wore = false;
    for (let d = 0; d <= Math.round(torsoHalf * 1.6); d++) {
      const x = cx + s * d;
      if (!fig(x, y)) return null;
      const l = lab(y * W + x);
      if (TORSO_WEAR.has(l)) wore = true;
      else if (wore && ARM_STUFF.has(l) && d >= torsoHalf * 0.5) return x;
    }
    return null;
  };

  // each arm: where it stands apart from the body, row by row, and the lowest row it does
  const handLimit = Math.round(crotchY + Hf * 0.15);
  const arm = {};
  for (const s of SIDES) {
    const bound = new Map();
    let handY = -1, wasApart = false;
    for (let y = shoulderY; y <= Math.min(handLimit, yBot); y++) {
      const runs = runsAt(y);
      // the body's run on this side: the one through the centre, or below the crotch the leg nearest it
      const core = runs.find(([a, b]) => a <= cx && b >= cx)
        ?? (s < 0 ? runs.filter(([, b]) => b < cx).pop() : runs.find(([a]) => a > cx));
      const apart = !!core && runs.some(([a, b]) => (s < 0 ? b < core[0] : a > core[1]));
      // below the crotch the arm is only the hand hanging on from above it, apart from the leg: once it is not, the rows
      // under it are the legs' (a fold of the trousers standing out is no hand)
      if (y > crotchY && !(apart && wasApart)) break;
      wasApart = apart;
      if (apart) { bound.set(y, s < 0 ? core[0] - 1 : core[1] + 1); handY = y; }
      else {
        // drawn against the body: where its stuff meets the torso's, else what lies past the torso's own half-width (a
        // little wider at the shoulder)
        const t = (y - shoulderY) / Math.max(1, crotchY - shoulderY);
        bound.set(y, wornEdge(y, s) ?? cx + s * Math.round(torsoHalf * (1 + 0.25 * Math.max(0, 1 - t * 5))));
      }
    }
    if (handY < 0) handY = Math.round(crotchY + Hf * P.handPastCrotch);
    arm[s] = { bound, handY, elbowY: Math.round(shoulderY + (handY - shoulderY) * 0.47) };
  }
  const kneeY = Math.round(crotchY + (yBot - crotchY) * 0.5);
  const ankleY = Math.max(kneeY + 2, Math.round(yBot + 1 - Hf * P.foot));

  // what each hand holds, by the side its pixels lie on (two cannot share a hand: the second is the other's)
  const ID = Object.fromEntries(PART_NAMES.map((n, i) => [n, i]));
  const held = new Map([[L.right, [0, 0]], [L.left, [0, 0]], [L.shield, [0, 0]]]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const h = held.get(lab(y * W + x)); if (h) { h[0] += x; h[1]++; } }
  const itemSide = new Map();
  let first = 0;
  for (const [l, [sx, n]] of held) {
    let side = n ? (sx / n < cx ? -1 : 1) : (l === L.right ? -1 : 1);
    if (n && first && side === first) side = -first;
    if (n && !first) first = side;
    itemSide.set(l, side);
  }
  // an arm behind its shield cannot be read: its joints are the other arm's, mirrored (its pixels stay as read)
  const shieldArm = held.get(L.shield)[1] ? itemSide.get(L.shield) : 0;
  const sideOf = (x) => (x < cx ? -1 : 1);

  // every pixel to its part
  const partOf = new Int8Array(W * H).fill(-1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, l = lab(i);
    if (l === L.none) continue;
    if (ITEMS.has(l)) { partOf[i] = ID[`item${itemSide.get(l)}`]; continue; }
    if (l === L.lining) { partOf[i] = ID.cape; continue; }
    if (l === L.cloak) { partOf[i] = ID.drape; continue; }
    if (l === L.head || l === L.helm || y < neckY) { partOf[i] = ID.head; continue; }
    const s = sideOf(x), a = arm[s];
    if (y >= shoulderY && y <= a.handY && a.bound.has(y) && s * (x - a.bound.get(y)) >= 0) { partOf[i] = ID[`${y < a.elbowY ? 'uarm' : 'larm'}${s}`]; continue; }
    // a robe hides the legs' gap: down to the feet it is one skirt from the hips, the feet stepping under it
    if (y > crotchY) { partOf[i] = y >= ankleY ? ID[`foot${s}`] : !crotchFound ? ID.skirt : ID[`${y < kneeY ? 'thigh' : 'shin'}${s}`]; continue; }
    partOf[i] = ID.torso;
  }

  // the joints, in the doll's own pixels
  const centroid = (name, y0, y1) => {
    let s = 0, n = 0;
    const id = ID[name];
    for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = 0; x < W; x++) if (partOf[y * W + x] === id) { s += x; n++; }
    return n ? s / n : null;
  };
  const joints = { pelvis: [cx, crotchY], neck: [cx, neckY], top: [cx, hn ? hy0 : yTop], hem: [cx, ankleY], foot: {}, ankle: {}, hand: {}, elbow: {}, shoulder: {}, hip: {}, knee: {} };
  const legApart = (() => { const a = centroid('thigh-1', crotchY + 1, crotchY + 4), b = centroid('thigh1', crotchY + 1, crotchY + 4); return a != null && b != null ? (b - a) / 2 : null; })();
  for (const s of SIDES) {
    const a = arm[s];
    const sx = a.bound.get(shoulderY + Math.min(2, a.handY - shoulderY)) ?? cx + s * torsoHalf;
    joints.shoulder[s] = [sx + s, shoulderY + 1];
    joints.elbow[s] = [centroid(`uarm${s}`, a.elbowY - 2, a.elbowY) ?? centroid(`larm${s}`, a.elbowY, a.elbowY + 2) ?? sx, a.elbowY];
    joints.hand[s] = [centroid(`larm${s}`, a.handY - 3, a.handY) ?? joints.elbow[s][0], a.handY];
    const hipX = cx + s * Math.max(2, Math.round(legApart ?? Hf * P.hipHalf));
    joints.hip[s] = [hipX, crotchY];
    joints.knee[s] = [centroid(`thigh${s}`, kneeY - 2, kneeY) ?? centroid(`shin${s}`, kneeY, kneeY + 2) ?? hipX, kneeY];
    joints.ankle[s] = [centroid(`shin${s}`, ankleY - 3, ankleY - 1) ?? centroid(`foot${s}`, ankleY, ankleY + 2) ?? joints.knee[s][0], ankleY];
    joints.foot[s] = [centroid(`foot${s}`, yBot - 3, yBot) ?? joints.ankle[s][0], yBot + 1];
  }
  if (shieldArm) for (const k of ['shoulder', 'elbow', 'hand']) joints[k][shieldArm] = [2 * cx - joints[k][-shieldArm][0], joints[k][-shieldArm][1]];

  // THE JOINTS' UNDERLAYS: each limb carries a band of its neighbour's pixels past each joint it bends at, drawn where
  // nothing else was (renderDollFrame), so a bent knee or elbow shows its own colours in the wedge the bend opens
  const OV = Math.max(2, Math.round(Hf * 0.03));
  const bands = {};
  const band = (to, from, ya, yb, side = 0) => (bands[to] ??= []).push({ id: ID[from], ya, yb, side });
  for (const s of SIDES) {
    band(`thigh${s}`, 'torso', crotchY - OV + 1, crotchY, s);
    band('skirt', 'torso', crotchY - OV + 1, crotchY, s);
    band('torso', 'skirt', crotchY + 1, crotchY + OV, s);
    band('torso', `thigh${s}`, crotchY + 1, crotchY + OV);
    band(`shin${s}`, `thigh${s}`, kneeY - OV, kneeY - 1);
    band(`thigh${s}`, `shin${s}`, kneeY, kneeY + OV - 1);
    band(`larm${s}`, `uarm${s}`, arm[s].elbowY - OV, arm[s].elbowY - 1);
    band(`uarm${s}`, `larm${s}`, arm[s].elbowY, arm[s].elbowY + OV - 1);
  }

  // the doll's back, stuff by stuff, in the doll's own pixels
  const { back, gloss } = backOfDoll({ width: W, height: H, rgba, lab, partOf, names: PART_NAMES, cx, neckY, shoulderY, crotchY, kneeY, yBot, torsoHalf, figureHeight: Hf, joints, crotchFound });

  // the parts, cut out: each its front (the doll) and back, and - where it bends - the same with its underlays
  const parts = {};
  const pixelsOf = new Map();
  for (let i = 0; i < W * H; i++) if (partOf[i] >= 0 && rgba[i * 4 + 3]) { const id = partOf[i]; if (!pixelsOf.has(id)) pixelsOf.set(id, []); pixelsOf.get(id).push(i); }
  const restOf = (name) => {
    const key = name.replace(/-?1$/, ''), s = name.endsWith('-1') ? -1 : name.endsWith('1') ? 1 : 0;
    const at = (k) => (s ? joints[k][s] : joints[k]);
    const [j, k] = BONE[key].map(at);
    let u = [k[0] - j[0], k[1] - j[1]];
    const n0 = Math.hypot(u[0], u[1]);
    u = n0 > 1e-6 ? [u[0] / n0, u[1] / n0] : (key === 'head' || key === 'torso' || key === 'cape' || key === 'drape' ? [0, -1] : [0, 1]);
    // across the bone, toward the figure's left (+x); a bone that runs down the doll is cut along the doll's own rows
    // (as its art is drawn, and as the parts were cut), across it the row (`h`)
    const n = -u[1] > 0 || (-u[1] === 0 && u[0] < 0) ? [-u[1], u[0]] : [u[1], -u[0]];
    const rows = !CARDS.has(name) && Math.abs(u[1]) >= 0.5;
    return { j, u, n, h: rows ? [1, 0] : n, rows };
  };
  for (const name of PART_NAMES) {
    if (name === 'cape') continue;
    const id = ID[name], mine = pixelsOf.get(id);
    if (!mine) continue;
    const own = cutWhere(rgba, back, gloss, W, mine);
    const card = CARDS.has(name);
    const banded = [];
    for (const b of bands[name] ?? []) for (const i of pixelsOf.get(b.id) ?? []) { const y = (i / W) | 0; if (y >= b.ya && y <= b.yb && (!b.side || sideOf(i % W) === b.side)) banded.push(i); }
    let ext = banded.length ? cutWhere(rgba, back, gloss, W, mine.concat(banded)) : null;
    // what another part hid of this one in the front (a hand on the hip, a blade across a leg): the row closed across it,
    // drawn only where nothing else is - so the doll stands as it was drawn, and a hand lifted leaves no hole
    if (!card) {
      const shut = closeRows(ext ?? own, rgba, W);
      if (shut) ext = shut;
    }
    parts[name] = { name, ...own, ext: ext ?? null, bone: restOf(name), card };
  }
  if (doll.lining && background0(doll.lining, W, H)) {
    const cape = capeOf(doll.lining, rgba, W, H, lab);
    parts.cape = { name: 'cape', ...cape, gloss: new Uint8Array(cape.w * cape.h), ext: null, bone: restOf('cape'), card: false };
  }
  // the arm behind a shield: the other arm's pixels, mirrored, where the shield hid it (so it is there when the shield
  // swings away, and from the side) - in front of nothing the doll drew, so it stands as drawn
  if (shieldArm) for (const seg of ['uarm', 'larm']) {
    const src = parts[`${seg}${-shieldArm}`], name = `${seg}${shieldArm}`, shieldId = ID[`item${shieldArm}`];
    if (!src) continue;
    const add = [];
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const o = y * src.w + x;
      if (!src.rgba[o * 4 + 3]) continue;
      const X = 2 * cx - (src.x0 + x), Y = src.y0 + y;
      if (X < 0 || X >= W || partOf[Y * W + X] !== shieldId || lab(Y * W + X) !== L.shield) continue;
      add.push([X, Y, o]);
    }
    if (add.length) parts[name] = withPixels(parts[name] ?? { name, bone: restOf(name), card: false, ext: null }, src, add);
  }
  for (const p of Object.values(parts)) if (!p.card) p.prof = profileOf(p.ext ?? p, p.bone);
  // the cloak hangs behind the torso's back, its inside against it, step by step down its bone (below the hips, as deep
  // as the hips)
  if (parts.cape && parts.torso) {
    const tp = parts.torso.prof, cp = parts.cape.prof;
    const deepAt = (lam) => {
      let k = clamp(lam - tp.kMin, 0, tp.a.length - 1);
      while (k > 0 && !tp.a[k]) k--;
      return tp.a[k] * PART_SHAPE.torso.depth;
    };
    parts.cape.zShiftAt = Float32Array.from(cp.a, (a, k) => -(deepAt(cp.kMin + k) + a * PART_SHAPE.cape.depth));
  }
  // a robe starts as deep as the hips it hangs from and deepens toward its hem, however wide it flares
  if (parts.skirt && parts.torso) {
    const tp = parts.torso.prof, sp = parts.skirt.prof;
    let k = clamp(crotchY - tp.kMin, 0, tp.a.length - 1);
    while (k > 0 && !tp.a[k]) k--;
    const hips = tp.a[k] * PART_SHAPE.torso.depth;
    parts.skirt.deepAt = Float32Array.from(sp.a, (a, j) => Math.min(a * PART_SHAPE.skirt.depth, hips + 0.3 * Math.max(0, sp.kMin + j - crotchY)));
  }
  // a card in a hand stands in front of the forearm that holds it
  for (const s of SIDES) {
    const fore = parts[`larm${s}`], item = parts[`item${s}`];
    if (!item) continue;
    item.zShift = fore ? Math.max(...p_a(fore.prof)) * PART_SHAPE.arm.depth + 0.5 : 3;
    item.shield = shieldArm === s;
  }
  const weaponSide = held.get(L.right)[1] ? itemSide.get(L.right) : -1;
  const offhandItem = !!(held.get(L.left)[1] || held.get(L.shield)[1]);
  return { width: W, height: H, cx, yTop, yBot, figureHeight: Hf, neckY, shoulderY, crotchY, kneeY, ankleY, torsoHalf, joints, parts, weaponSide, offhandItem };
}

const p_a = (prof) => Array.from(prof?.a ?? [0]);
/** A part with more pixels (`add`: [x, y, offset into `src`]), taken from `src`'s front, back and gloss. */
function withPixels(part, src, add) {
  const has = !!part.rgba;
  let x0 = has ? part.x0 : Infinity, y0 = has ? part.y0 : Infinity, x1 = has ? part.x0 + part.w - 1 : -Infinity, y1 = has ? part.y0 + part.h - 1 : -Infinity;
  for (const [x, y] of add) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const out = { ...part, x0, y0, w, h, rgba: new Uint8Array(w * h * 4), back: new Uint8Array(w * h * 4), gloss: new Uint8Array(w * h) };
  const copy = (from, fx, fy, o, x, y) => {
    const d = (y - y0) * w + (x - x0);
    if (out.rgba[d * 4 + 3]) return;
    out.rgba.set(from.rgba.subarray(o * 4, o * 4 + 4), d * 4); out.back.set(from.back.subarray(o * 4, o * 4 + 4), d * 4); out.gloss[d] = from.gloss[o];
  };
  if (has) for (let y = 0; y < part.h; y++) for (let x = 0; x < part.w; x++) { const o = y * part.w + x; if (part.rgba[o * 4 + 3]) copy(part, x, y, o, part.x0 + x, part.y0 + y); }
  for (const [x, y, o] of add) copy(src, 0, 0, o, x, y);
  if (part.ext) out.ext = withPixels({ ...part.ext, ext: null }, src, add);
  return out;
}

/** Does a layer hold anything at all. */
function background0(rgba, W, H) {
  for (let i = 0; i < W * H; i++) if (rgba[i * 4 + 3]) return true;
  return false;
}
/** The pixels `list` (indices into the doll), cut to their box from the front, the back and the gloss alike: { x0, y0,
 *  w, h, rgba, back, gloss }. */
function cutWhere(rgba, back, gloss, W, list) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (const i of list) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const front = new Uint8Array(w * h * 4), rear = new Uint8Array(w * h * 4), shine = new Uint8Array(w * h);
  for (const i of list) {
    const o = (((i / W) | 0) - y0) * w + (i % W) - x0;
    front.set(rgba.subarray(i * 4, i * 4 + 4), o * 4);
    rear.set(back.subarray(i * 4, i * 4 + 4), o * 4);
    shine[o] = gloss[i];
  }
  return { x0, y0, w, h, rgba: front, back: rear, gloss: shine };
}
/** A part's picture with each row closed across what hid it in the front - a gap between two of its own pixels where
 *  the doll was drawn (by another part) takes the colours either side of it, front and back. Null when nothing was. */
function closeRows(img, doll, W) {
  const { w, h } = img;
  const out = { ...img, rgba: img.rgba.slice(), back: img.back.slice(), gloss: img.gloss.slice() };
  let shut = 0;
  for (let y = 0; y < h; y++) {
    let last = -1;
    for (let x = 0; x < w; x++) {
      if (!img.rgba[(y * w + x) * 4 + 3]) continue;
      if (last >= 0 && x - last > 1) {
        let hidden = true;
        for (let v = last + 1; v < x && hidden; v++) hidden = !!doll[((img.y0 + y) * W + img.x0 + v) * 4 + 3];
        if (hidden) for (let v = last + 1; v < x; v++) {
          const t = (v - last) / (x - last), o = (y * w + v) * 4, a = (y * w + last) * 4, b = (y * w + x) * 4;
          for (const pic of [out.rgba, out.back]) { for (let j = 0; j < 3; j++) pic[o + j] = Math.round(pic[a + j] * (1 - t) + pic[b + j] * t); pic[o + 3] = 255; }
          out.gloss[y * w + v] = img.gloss[y * w + last];
          shut++;
        }
      }
      last = x;
    }
  }
  return shut ? out : null;
}
/** A part's cross-section along its bone: for each of the doll's rows it spans (or each unit step along a bone that
 *  does not run down the doll; `kMin` the first), where the part's pixels lie across it - their middle `c` and
 *  half-width `a` (0 where none). */
function profileOf(img, { j, u, n, rows }) {
  let kMin = Infinity, kMax = -Infinity;
  const lo = new Map(), hi = new Map();
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    if (!img.back[(y * img.w + x) * 4 + 3] && !img.rgba[(y * img.w + x) * 4 + 3]) continue;
    const dx = img.x0 + x + 0.5 - j[0], dy = img.y0 + y + 0.5 - j[1];
    // by rows: the row itself, and across it from where the bone crosses it; else unit steps along the bone and across
    const k = rows ? img.y0 + y : Math.floor(dx * u[0] + dy * u[1]);
    const X = rows ? dx - (dy / u[1]) * u[0] : dx * n[0] + dy * n[1];
    if (k < kMin) kMin = k; if (k > kMax) kMax = k;
    lo.set(k, Math.min(lo.get(k) ?? Infinity, X)); hi.set(k, Math.max(hi.get(k) ?? -Infinity, X));
  }
  const len = kMax - kMin + 1;
  const c = new Float32Array(len), a = new Float32Array(len);
  for (let k = kMin; k <= kMax; k++) {
    if (!lo.has(k)) continue;
    c[k - kMin] = (lo.get(k) + hi.get(k)) / 2;
    a[k - kMin] = (hi.get(k) - lo.get(k)) / 2 + 0.5;
  }
  return { kMin, c, a };
}

/** A colour's distance from another, summed over its channels. */
const far = (px, o, c) => Math.abs(px[o] - c[0]) + Math.abs(px[o + 1] - c[1]) + Math.abs(px[o + 2] - c[2]);
/** A stuff's own colour among the colours at `at` (offsets into `px`): the commonest hue (greys their own), and the
 *  median by lightness of that - a gold trim is not a gauntlet's colour. Null for none. */
function medianColour(px, at) {
  if (!at.length) return null;
  const bins = new Map();
  for (const o of at) {
    const r = px[o], g = px[o + 1], b = px[o + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let bin = -1;
    if (mx && (mx - mn) / mx >= 0.18) {
      const d = mx - mn;
      const hue = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      bin = Math.floor(hue * 2) % 12;
    }
    if (!bins.has(bin)) bins.set(bin, []);
    bins.get(bin).push(o);
  }
  let best = null;
  for (const list of bins.values()) if (!best || list.length > best.length) best = list;
  const s = best.sort((a, b) => lumAt(px, a) - lumAt(px, b));
  const m = s[s.length >> 1];
  return [px[m], px[m + 1], px[m + 2]];
}
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/**
 * THE DOLL'S BACK, in the doll's own pixels (the parts' back halves wear it, and their flanks where the front's picture
 * would stretch): every pixel drawn again as the back of the stuff it is - its colour, unlit: the renderer lights it as
 * the surface it lies on faces (renderDollFrame). `{ back, gloss }`, gloss 1 where the stuff is metal (a sheen down it).
 * Pure.
 *
 * - Each stuff of each part (a shirt on the torso, a gauntlet on a forearm) takes its own colour - the median of its
 *   front - with its front's broad tone and fine grain but none of its features (a face, a buckle, a breastplate's
 *   boss). Jewellery is what it lies on.
 * - The body under it has a back: the spine (a plate's ridge), the shoulder blades, the seat, the backs of the knees,
 *   the heels; where two stuffs meet, a seam.
 * - The head is its hair - the doll's own, from the crown - falling as far down the back as it falls beside the face,
 *   the nape and the ears skin below it, and any band round the forehead going round. A helm is its own stuff over all.
 * - A shield shows its inside: a rim, boards, two straps. A blade is the same from either side.
 */
export function backOfDoll({ width: W, height: H, rgba, lab, partOf, names, cx, shoulderY, crotchY, kneeY, yBot, torsoHalf, figureHeight: Hf, joints, crotchFound }) {
  const N = W * H, out = new Uint8Array(N * 4), gloss = new Uint8Array(N);
  const nameOf = (i) => (partOf[i] < 0 ? '' : names[partOf[i]]);
  const isBody = (i) => { const n = nameOf(i); return n && n !== 'cape' && !n.startsWith('item'); };
  // the stuff of each pixel - jewellery is what it lies on
  const mat = new Uint8Array(N);
  for (let i = 0; i < N; i++) mat[i] = lab(i);
  for (let pass = 0, left = true; left && pass < 24; pass++) {
    left = false;
    for (let i = 0; i < N; i++) {
      if (mat[i] !== L.jewel) continue;
      const x = i % W;
      const near = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W].find((j) => j >= 0 && j < N && partOf[j] === partOf[i] && mat[j] !== L.jewel && mat[j] !== L.none);
      if (near != null) mat[i] = mat[near]; else left = true;
    }
  }
  for (let i = 0; i < N; i++) if (mat[i] === L.jewel) mat[i] = L.body;
  // a garment open down the front is closed down the back: on the torso, skin between two of a row's worn pixels is
  // the nearer one's stuff
  const torsoPart = names.indexOf('torso');
  const WORN = new Set([L.chest, L.under, L.legs]);
  for (let y = 0; y < H; y++) {
    let first = -1, last = -1;
    for (let x = 0; x < W; x++) { const i = y * W + x; if (partOf[i] === torsoPart && WORN.has(mat[i])) { if (first < 0) first = x; last = x; } }
    if (first < 0) continue;
    for (let x = first + 1; x < last; x++) {
      const i = y * W + x;
      if (partOf[i] !== torsoPart || mat[i] !== L.body) continue;
      let l = x, r = x;
      while (l > first && !(partOf[y * W + l] === torsoPart && WORN.has(mat[y * W + l]))) l--;
      while (r < last && !(partOf[y * W + r] === torsoPart && WORN.has(mat[y * W + r]))) r++;
      mat[i] = mat[y * W + (x - l <= r - x ? l : r)];
    }
  }
  const keyOf = (i) => partOf[i] * 16 + mat[i];
  const lum = new Float32Array(N);
  for (let i = 0; i < N; i++) lum[i] = lumAt(rgba, i * 4);

  // each stuff of each part: its colour, its lightness, whether it is metal (grey, and lit hard)
  const keys = new Map();
  for (let i = 0; i < N; i++) {
    if (!rgba[i * 4 + 3] || !isBody(i)) continue;
    const k = keyOf(i);
    if (!keys.has(k)) keys.set(k, []);
    keys.get(k).push(i);
  }
  // one garment, one colour: each stuff's own across every part it is worn on
  const whole = new Map();
  for (const [k, list] of keys) { const m = k & 15; if (!whole.has(m)) whole.set(m, []); for (const i of list) whole.get(m).push(i * 4); }
  const wholeBase = new Map([...whole].map(([m, at]) => [m, medianColour(rgba, at)]));
  const stuff = new Map();
  for (const [k, list] of keys) {
    const base = wholeBase.get(k & 15);
    const ls = list.map((i) => lum[i]).sort((a, b) => a - b);
    const q = (f) => ls[Math.min(ls.length - 1, Math.floor(ls.length * f))];
    let sat = 0;
    for (const i of list) { const o = i * 4, mx = Math.max(rgba[o], rgba[o + 1], rgba[o + 2]), mn = Math.min(rgba[o], rgba[o + 1], rgba[o + 2]); sat += mx ? (mx - mn) / mx : 0; }
    sat /= list.length;
    const m = k & 15;
    const metal = m !== L.body && m !== L.head && m !== L.under && sat < 0.2 && q(0.85) - q(0.15) > 60;
    stuff.set(k, { base, mean: ls.reduce((s, v) => s + v, 0) / ls.length, metal });
  }
  // the broad tone within each stuff (its folds, kept) and its grain (the weave, kept small)
  // a box average of the lightness within each stuff (its own pixels only): running sums across, then down, its box
  const boxWithin = (r) => {
    const o = new Float32Array(N);
    for (const list of keys.values()) {
      let x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (const i of list) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      const w = x1 - x0 + 1, h = y1 - y0 + 1;
      const v = new Float32Array(w * h), c = new Float32Array(w * h), hv = new Float32Array(w * h), hc = new Float32Array(w * h);
      for (const i of list) { const l = (((i / W) | 0) - y0) * w + (i % W) - x0; v[l] = lum[i]; c[l] = 1; }
      for (let y = 0; y < h; y++) {
        let sv = 0, sc = 0;
        for (let x = 0; x < Math.min(w, r); x++) { sv += v[y * w + x]; sc += c[y * w + x]; }
        for (let x = 0; x < w; x++) {
          if (x + r < w) { sv += v[y * w + x + r]; sc += c[y * w + x + r]; }
          hv[y * w + x] = sv; hc[y * w + x] = sc;
          if (x - r >= 0) { sv -= v[y * w + x - r]; sc -= c[y * w + x - r]; }
        }
      }
      for (let x = 0; x < w; x++) {
        let sv = 0, sc = 0;
        for (let y = 0; y < Math.min(h, r); y++) { sv += hv[y * w + x]; sc += hc[y * w + x]; }
        for (let y = 0; y < h; y++) {
          if (y + r < h) { sv += hv[(y + r) * w + x]; sc += hc[(y + r) * w + x]; }
          v[y * w + x] = sv; c[y * w + x] = sc;
          if (y - r >= 0) { sv -= hv[(y - r) * w + x]; sc -= hc[(y - r) * w + x]; }
        }
      }
      for (const i of list) { const l = (((i / W) | 0) - y0) * w + (i % W) - x0; o[i] = c[l] ? v[l] / c[l] : lum[i]; }
    }
    return o;
  };
  const broad = boxWithin(Math.max(2, Math.round(Hf * 0.04))), fine = boxWithin(1);
  const grainCap = new Map();
  for (const [k, list] of keys) {
    const d = list.map((i) => Math.abs(lum[i] - fine[i])).sort((a, b) => a - b);
    grainCap.set(k, 1.5 * (d[d.length >> 1] ?? 0) + 1);
  }

  // where across its part each pixel lies (-1 one flank, 1 the other): the part's run along the row
  const across = new Float32Array(N);
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      const p = partOf[y * W + x];
      if (p < 0 || !rgba[(y * W + x) * 4 + 3]) { x++; continue; }
      let e = x;
      while (e + 1 < W && partOf[y * W + e + 1] === p && rgba[(y * W + e + 1) * 4 + 3]) e++;
      const mid = (x + e + 1) / 2, half = Math.max(0.5, (e - x + 1) / 2);
      for (let v = x; v <= e; v++) across[y * W + v] = clamp((v + 0.5 - mid) / half, -1, 1);
      x = e + 1;
    }
  }

  // the body's shape under its stuff: a height for each pixel, lit from above
  const bump = new Float32Array(N);
  const T = Math.max(1, crotchY - shoulderY);
  const torsoId = names.indexOf('torso');
  for (let y = shoulderY; y <= crotchY; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (partOf[i] !== torsoId || !rgba[i * 4 + 3]) continue;
    const dx = x + 0.5 - (cx + 0.5), fade = smooth((y - shoulderY) / (T * 0.15)) * smooth((crotchY - y) / (T * 0.1));
    if (stuff.get(keyOf(i))?.metal) bump[i] += 1.6 * Math.exp(-((dx / 1.6) ** 2)) * fade;   // a backplate's ridge
    else {
      bump[i] -= 1.4 * Math.exp(-((dx / 1.1) ** 2)) * fade;   // the spine
      for (const s of SIDES) bump[i] += 2.2 * Math.exp(-(((x - (cx + s * 0.48 * torsoHalf)) / (0.32 * torsoHalf)) ** 2) - (((y - (shoulderY + 0.3 * T)) / (0.15 * T)) ** 2));   // the blades
    }
  }
  // the seat, where the legs part below it (a robe hides it)
  if (crotchFound) {
    for (let y = Math.round(crotchY - 0.2 * T); y <= crotchY + 2; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, n = nameOf(i);
      if (!rgba[i * 4 + 3] || !(n === 'torso' || n.startsWith('thigh')) || stuff.get(keyOf(i))?.metal) continue;
      const dx = x + 0.5 - (cx + 0.5);
      if (y >= crotchY - 0.16 * T) bump[i] -= 1.6 * Math.exp(-((dx / 0.9) ** 2));   // the cleft
      for (const s of SIDES) {
        const hw = Math.max(2, Math.abs(joints.hip[s][0] - cx));
        bump[i] += 1.8 * Math.exp(-(((x - joints.hip[s][0]) / (0.75 * hw)) ** 2) - (((y - (crotchY - 0.05 * T)) / (0.12 * T)) ** 2));
      }
    }
  }
  // the backs of the knees
  for (let y = kneeY - 2; y <= kneeY + 4; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, n = nameOf(i);
    if (y < 0 || y >= H || !rgba[i * 4 + 3] || !(n.startsWith('thigh') || n.startsWith('shin'))) continue;
    bump[i] -= 1.1 * Math.exp(-(((y - (kneeY + 1)) / 1.3) ** 2)) * (1 - across[i] ** 4);
  }

  // the stuff's back, pixel by pixel: its colour, its broad tone and grain, the body's shape under it lit from above
  const colourOf = (i, k) => {
    const st = stuff.get(k);
    if (!st) return null;
    const x = i % W;
    const up = i - W >= 0 ? bump[i - W] : bump[i], dn = i + W < N ? bump[i + W] : bump[i];
    const lf = x > 0 ? bump[i - 1] : bump[i], rt = x < W - 1 ? bump[i + 1] : bump[i];
    const relief = 1 + 0.14 * (up - dn) + 0.06 * (lf - rt);   // lit from above, and from the doll's left - the eye's left, seen from behind
    const bl = Math.max(1, lumAt(st.base, 0));
    const cap = grainCap.get(k) ?? 4;
    const grain = clamp(lum[i] - fine[i], -cap, cap);
    const tone = st.metal ? 0 : 0.35 * (broad[i] - st.mean);
    const shade = relief * (bl + tone + 0.8 * grain) / bl;
    return st.base.map((v) => clamp(Math.round(v * shade), 0, 255));
  };
  for (let i = 0; i < N; i++) {
    if (!rgba[i * 4 + 3] || !isBody(i) || mat[i] === L.head) continue;
    const c = colourOf(i, keyOf(i));
    if (c) { out.set(c, i * 4); out[i * 4 + 3] = 255; gloss[i] = stuff.get(keyOf(i))?.metal ? 1 : 0; }
  }
  // the soles under the heels
  for (const s of SIDES) {
    const id = names.indexOf(`foot${s}`);
    for (let y = yBot - 1; y <= yBot; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (partOf[i] === id && out[i * 4 + 3]) for (let j = 0; j < 3; j++) out[i * 4 + j] = Math.round(out[i * 4 + j] * 0.55);
    }
  }

  // the figure's skin, where it shows bare (a neck, an arm): the head's skin is that, not a beard's
  const bare = [];
  for (let i = 0; i < N; i++) if (rgba[i * 4 + 3] && lab(i) === L.body) bare.push(i * 4);
  // the neck's half-width, under the head
  let neckHalf = Math.max(2, torsoHalf * 0.45);
  for (let y = joints.neck[1]; y < joints.neck[1] + 4 && y < H; y++) {
    let a = cx, b = cx;
    while (a > 0 && rgba[(y * W + a - 1) * 4 + 3] && partOf[y * W + a - 1] === torsoPart) a--;
    while (b < W - 1 && rgba[(y * W + b + 1) * 4 + 3] && partOf[y * W + b + 1] === torsoPart) b++;
    if (b > a) { neckHalf = Math.max(2, (b - a + 1) / 2); break; }
  }
  backOfHead({ W, H, rgba, out, partOf, headId: names.indexOf('head'), lab, colourOf, keyOf, skinRef: bare.length >= 12 ? medianColour(rgba, bare) : null, cx, neckHalf });
  backOfShields({ W, H, rgba, out, partOf, names, lab, across });
  // a blade, a staff, a bow: the same from either side
  for (let i = 0; i < N; i++) if (rgba[i * 4 + 3] && nameOf(i).startsWith('item') && lab(i) !== L.shield) out.set(rgba.subarray(i * 4, i * 4 + 4), i * 4);

  // the seams where two stuffs meet (a hem, a belt's edge)
  for (let i = 0; i < N; i++) {
    if (!out[i * 4 + 3] || !isBody(i)) continue;
    const x = i % W;
    const seam = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W].some((j) => j >= 0 && j < N && rgba[j * 4 + 3] && partOf[j] === partOf[i]
      && mat[j] !== mat[i] && mat[i] !== L.head && mat[j] !== L.head && mat[j] > mat[i]);
    if (seam) for (let j = 0; j < 3; j++) out[i * 4 + j] = Math.round(out[i * 4 + j] * 0.78);
  }
  return { back: out, gloss };
}

/** The back of the head (backOfDoll): the doll's own hair, strand by strand - each column's hair from the crown,
 *  drawn down the back as far as the hair falls beside the face (at least to the ears); the nape and the ears skin
 *  under it; a band round the forehead going round; a helm over all, as its own stuff. */
function backOfHead({ W, H, rgba, out, partOf, headId, lab, colourOf, keyOf, skinRef, cx, neckHalf }) {
  const px = [];
  let x0 = W, x1 = -1, y0 = H, y1 = -1;
  for (let i = 0; i < W * H; i++) {
    if (partOf[i] !== headId || !rgba[i * 4 + 3]) continue;
    px.push(i);
    const x = i % W, y = (i / W) | 0;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (!px.length) return;
  const hw = x1 - x0 + 1, hh = y1 - y0 + 1, mx = (x0 + x1) / 2;
  const isHead = (i) => partOf[i] === headId && lab(i) === L.head;
  // the skin: the figure's bare skin, else the cheeks and the nose (above any beard)
  const face = px.filter((i) => { const x = i % W, y = (i / W) | 0; return isHead(i) && y >= y0 + hh * 0.4 && y <= y0 + hh * 0.62 && Math.abs(x - mx) <= hw * 0.25; }).map((i) => i * 4);
  const skin = skinRef ?? medianColour(rgba, face) ?? [200, 150, 120];
  const skinLike = (i) => far(rgba, i * 4, skin) < 75;
  // the hairline down the middle, and the hair above it
  let hl = y0;
  for (let y = y0; y <= y1; y++) {
    let n = 0;
    for (let x = Math.round(mx) - 1; x <= Math.round(mx) + 1; x++) { const i = y * W + x; if (x >= 0 && x < W && isHead(i) && rgba[i * 4 + 3] && skinLike(i)) n++; }
    if (n >= 2) { hl = y; break; }
    hl = y + 1;
  }
  const crown = px.filter((i) => isHead(i) && ((i / W) | 0) < hl && !skinLike(i));
  const hair = crown.length >= 6 ? medianColour(rgba, crown.map((i) => i * 4)) : null;
  const hairLike = (i) => !!hair && isHead(i) && !!rgba[i * 4 + 3] && !skinLike(i) && far(rgba, i * 4, hair) < 120;
  // each column's strands: its hair from the crown - the run of hair its top pixel starts (a brow or an eye below the
  // hairline is no strand)
  const strand = new Map();
  for (let x = x0; x <= x1; x++) {
    let top = -1;
    for (let y = y0; y <= y1 && top < 0; y++) if (partOf[y * W + x] === headId && rgba[(y * W + x) * 4 + 3]) top = y;
    if (top < 0) continue;
    let y = top;
    while (y <= top + 2 && !hairLike(y * W + x)) y++;
    if (y > top + 2) continue;
    const from = y;
    while (y + 1 <= y1 && hairLike((y + 1) * W + x)) y++;
    if (y > from) strand.set(x, [from, y]);
  }
  const strandAt = (x) => { for (let d = 0; d <= hw; d++) for (const v of [x - d, x + d]) if (strand.has(v)) return [v, strand.get(v)]; return null; };
  // how far the hair falls, beside the face on either side: at least to the ears
  const reach = (side) => {
    let lowest = -1;
    for (const i of px) {
      const x = i % W;
      if (!hairLike(i) || (side < 0 ? x > x0 + hw * 0.25 : x < x1 - hw * 0.25)) continue;
      lowest = Math.max(lowest, (i / W) | 0);
    }
    return lowest;
  };
  const floor = hl + 0.78 * (y1 - hl);
  const yl = Math.max(floor, reach(-1)), yr = Math.max(floor, reach(1));
  const hairTo = (x) => yl + (yr - yl) * clamp((x - x0) / Math.max(1, hw - 1), 0, 1);
  // a band round the head: a row of the forehead, above the eyes, mostly neither hair nor skin, across its whole width
  const bandRow = new Set();
  for (let y = y0; y < y0 + hh * 0.4; y++) {
    let n = 0, other = 0, l = W, r = -1, a = W, b = -1;
    for (let x = x0; x <= x1; x++) {
      const i = y * W + x;
      if (!isHead(i) || !rgba[i * 4 + 3]) continue;
      n++; a = Math.min(a, x); b = Math.max(b, x);
      if (!skinLike(i) && !hairLike(i)) { other++; l = Math.min(l, x); r = Math.max(r, x); }
    }
    if (n && other >= n * 0.6 && l <= a + (b - a) * 0.2 && r >= b - (b - a) * 0.2) bandRow.add(y);
  }
  // a helm's span on each row: the head inside it is under the helm
  const helmSpan = new Map();
  for (const i of px) if (lab(i) === L.helm) { const y = (i / W) | 0, x = i % W, sp = helmSpan.get(y) ?? [x, x]; helmSpan.set(y, [Math.min(sp[0], x), Math.max(sp[1], x)]); }
  const helmKey = (() => { const i = px.find((j) => lab(j) === L.helm); return i == null ? null : keyOf(i); })();
  for (const i of px) {
    if (!isHead(i)) continue;
    const x = i % W, y = (i / W) | 0, o = i * 4;
    let c;
    const span = helmSpan.get(y), to = hairTo(x), st = hair && strandAt(x);
    if (helmKey != null && span && x >= span[0] && x <= span[1]) c = colourOf(i, helmKey);
    else if (bandRow.has(y) && !skinLike(i) && !hairLike(i)) c = [rgba[o], rgba[o + 1], rgba[o + 2]];
    else if (st && y < to) {
      // down the column's own strand, stretched from the crown to where the hair ends, darker toward the nape
      const [sx, [sy0, sy1]] = st, f = clamp((y - y0) / Math.max(1, to - y0), 0, 1);
      const t = Math.round(sy0 + f * (sy1 - sy0)) * W + sx;
      c = (hairLike(t) ? [rgba[t * 4], rgba[t * 4 + 1], rgba[t * 4 + 2]] : hair).map((v) => v * (1 - 0.2 * f * f));
    } else if (Math.abs(x + 0.5 - (cx + 0.5)) > neckHalf + 1 && y > to) { out[o + 3] = 0; continue; }   // below the hair the head is its neck: the jaw is the front's
    else c = skin.map((v) => v * 0.92);
    out[o] = clamp(Math.round(c[0]), 0, 255); out[o + 1] = clamp(Math.round(c[1]), 0, 255); out[o + 2] = clamp(Math.round(c[2]), 0, 255); out[o + 3] = 255;
  }
}

/** A shield's inside (backOfDoll): its rim, in its own front's colour; boards; two straps across the middle. */
function backOfShields({ W, H, rgba, out, partOf, names, lab, across }) {
  for (const s of SIDES) {
    const id = names.indexOf(`item${s}`);
    const px = [];
    let y0 = H, y1 = -1;
    for (let i = 0; i < W * H; i++) if (partOf[i] === id && lab(i) === L.shield) { px.push(i); const y = (i / W) | 0; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (!px.length) continue;
    const isShield = (i) => i >= 0 && i < W * H && partOf[i] === id && lab(i) === L.shield;
    // the rim: two pixels in from the edge
    const edge = new Uint8Array(W * H);
    for (const i of px) { const x = i % W; if ([x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W].some((j) => !isShield(j))) edge[i] = 1; }
    for (const i of px) { if (edge[i]) continue; const x = i % W; if ([x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W].some((j) => edge[j] === 1)) edge[i] = 2; }
    const rim = medianColour(rgba, px.filter((i) => edge[i]).map((i) => i * 4)) ?? [120, 110, 100];
    const face = medianColour(rgba, px.map((i) => i * 4)) ?? [120, 100, 80];
    const wood = face.map((v, j) => 0.6 * [96, 66, 40][j] + 0.4 * v * 0.5);
    const hh = y1 - y0 + 1, strapH = Math.max(2, Math.round(hh * 0.05));
    const straps = [Math.round(y0 + hh * 0.36), Math.round(y0 + hh * 0.62)];
    for (const i of px) {
      const x = i % W, y = (i / W) | 0, u = across[i], o = i * 4;
      let c;
      if (edge[i]) c = rim.map((v) => v * 0.9 * (0.85 + 0.25 * Math.max(0, 0.45 * u + 0.89 * Math.sqrt(Math.max(0, 1 - u * u)))));
      else {
        const strap = straps.findIndex((sy) => y >= sy && y < sy + strapH);
        if (strap >= 0 && Math.abs(u) < 0.75) {
          const f = y === straps[strap] ? 1.3 : y === straps[strap] + strapH - 1 ? 0.75 : 1;
          c = [64, 42, 26].map((v) => v * f);
        } else {
          const grain = 1 + 0.08 * Math.sin(x * 1.7 + 0.6 * Math.sin(y * 0.21)) + 0.04 * Math.sin(x * 5.3 + y * 0.7);
          c = wood.map((v) => v * grain * (0.8 + 0.25 * u * u));
        }
      }
      out[o] = clamp(Math.round(c[0]), 0, 255); out[o + 1] = clamp(Math.round(c[1]), 0, 255); out[o + 2] = clamp(Math.round(c[2]), 0, 255); out[o + 3] = 255;
    }
  }
}

/**
 * The cloak's part: its lining (cut round the body, so the composite's rim) in the box of the whole cloak - the lining
 * and the cloak's own layer - and its BACK: each row of the cloak closed from its first pixel to its last. The cloak's
 * own pixels keep their colour (its drape over the shoulders, seen from either side); the lining's take the cloak's
 * outside colour lit by the lining's folds; the rest is the outside colour in a few soft folds, darker to the edges.
 * Pure.
 */
export function capeOf(lining, rgba, W, H, lab) {
  const isCloak = (i) => lab(i) === L.cloak;
  const isLining = (i) => !!lining[i * 4 + 3];
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (isLining(i) || isCloak(i)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const front = new Uint8Array(w * h * 4), back = new Uint8Array(w * h * 4);
  const outer = (() => { const at = []; for (let i = 0; i < W * H; i++) if (isCloak(i)) at.push(i * 4); return medianColour(rgba, at); })();
  const ls = [];
  for (let i = 0; i < W * H; i++) if (isLining(i)) ls.push(lumAt(lining, i * 4));
  ls.sort((p, q) => p - q);
  const mid = Math.max(1, ls[ls.length >> 1] ?? 1);
  const base = outer ?? (() => { for (let i = 0; i < W * H; i++) if (isLining(i)) return [lining[i * 4], lining[i * 4 + 1], lining[i * 4 + 2]]; return [0, 0, 0]; })();
  for (let y = y0; y <= y1; y++) {
    let a = -1, b = -1;
    for (let x = x0; x <= x1; x++) { const i = y * W + x; if (isLining(i) || isCloak(i)) { if (a < 0) a = x; b = x; } }
    if (a < 0) continue;
    const half = Math.max(1, (b - a) / 2), m = (a + b) / 2;
    for (let x = a; x <= b; x++) {
      const i = y * W + x, o = ((y - y0) * w + (x - x0)) * 4;
      if (isLining(i)) front.set(lining.subarray(i * 4, i * 4 + 4), o);
      let c;
      if (isCloak(i)) c = [rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]];
      else {
        const u = (x - m) / half;
        const lit = isLining(i)
          ? clamp(lumAt(lining, i * 4) / mid, 0.55, 1.35)
          : (0.9 + 0.12 * Math.cos(u * 3 * Math.PI)) * (1 - 0.25 * u ** 4);
        c = base.map((v) => v * lit);
      }
      for (let j = 0; j < 3; j++) back[o + j] = clamp(Math.round(c[j]), 0, 255);
      back[o + 3] = 255;
    }
  }
  return { x0, y0, w, h, rgba: front, back };
}

// ── the clips ────────────────────────────────────────────────────────────────────────────────────────────────────

/** An arm: `sh` swung forward at the shoulder, `el` bent forward at the elbow, `ab` out to the side, `yw` turned toward
 *  its own side about the shoulder (a raised arm pointed off the body's front), in degrees. */
const arm = (sh = 0, el = 0, ab = 0, yw = 0) => ({ sh, el, ab, yw });
/** A leg: `hip` swung forward, `knee` bent back. */
const leg = (hip = 0, knee = 0) => ({ hip, knee });
/** The walk's four steps, by the weapon side's leg and arm (`a`) and the other's (`b`): contact, passing, contact,
 *  passing. The shoulders turn against the hips (`twist`, `hips`), the body rises as it passes (`dy`). */
const WALK = Object.freeze([
  { la: leg(24, 4), lb: leg(-18, 14), aa: arm(-20, 12), ab: arm(22, 18), twist: 7, hips: -6, dy: 0 },
  { la: leg(4, 0), lb: leg(6, 42), aa: arm(-2, 8), ab: arm(4, 10), twist: 0, hips: 0, dy: -2 },
  { la: leg(-18, 14), lb: leg(24, 4), aa: arm(22, 18), ab: arm(-20, 12), twist: -7, hips: 6, dy: 0 },
  { la: leg(6, 42), lb: leg(4, 0), aa: arm(4, 10), ab: arm(-2, 8), twist: 0, hips: 0, dy: -2 },
]);
const walkStep = (f, n) => WALK[Math.round((f / Math.max(1, n)) * 4) % 4];

/** The weapon's six-frame stroke: the ready, the wind, the top, the cut, the follow-through, the return - the weapon
 *  arm (shoulder, elbow, out), the body's lean and its turn toward the weapon's side (wound back, then driven through). */
export const DOLL_STROKE = Object.freeze([
  [35, 55, 8, 5, 0], [110, 70, -5, -5, 18], [165, 30, -10, -10, 24], [95, 0, 12, 15, -20], [35, -5, 25, 20, -28], [25, 35, 8, 8, -8],
]);
/** The bow, side-on to the mark: drawn, at full draw, held, loosed - the draw arm's shoulder, elbow and turn. */
export const DOLL_BOW = Object.freeze([[80, 70, 10], [85, 125, -25], [85, 125, -25], [75, 30, 25]]);
/** The cast: gathered at the chest, thrust, held, returned - both arms (shoulder, elbow, out), and the lean. */
export const DOLL_CAST = Object.freeze([[50, 100, -12, 0], [90, 5, 5, 10], [95, 0, 12, 12], [35, 40, 5, 4]]);

/**
 * THE POSE for one table's frame: { lean (forward), twist (the shoulders' turn toward the figure's left), hips (the
 * hips' turn), head (the head's turn against the shoulders), dy (the body's rise, up negative), rot (the fall's turn on
 * the ground), arm: { -1, 1 }, leg: { -1, 1 }, turn (a raised bow's quarter turn) }, in degrees. `weaponSide` the side
 * the weapon is held on; `air` 1 rising, 2 falling (the port's own jump, laid over the table's arms). Pure.
 */
export function posePuppet(table, frame, { weaponSide = -1, offhand = false, air = 0, frames = 1 } = {}) {
  const w = weaponSide, o = -weaponSide;
  const pose = { lean: 0, twist: 0, hips: 0, head: 0, dy: 0, rot: 0, arm: { [-1]: arm(), [1]: arm() }, leg: { [-1]: leg(), [1]: leg() } };
  // a turn of the shoulders by the weapon side: `t` toward the weapon side's back (wound), the head held to the front
  const turn = (t) => { pose.twist = w * t; pose.head = -pose.twist * 0.8; };
  const walk = (n) => {
    const st = walkStep(frame, n);
    pose.leg[w] = { ...st.la }; pose.leg[o] = { ...st.lb };
    pose.arm[w] = { ...st.aa }; pose.arm[o] = { ...st.ab };
    turn(st.twist); pose.hips = w * st.hips;
    pose.dy = st.dy;
  };
  const guard = () => (offhand ? arm(45, 50, 6) : arm(18, 25, 8));
  const ready = () => { pose.arm[w] = arm(35, 55, 8); pose.arm[o] = guard(); pose.lean = 5; };
  // side-on to the mark, the bow arm out at it and the bow upright along it (its card turned a quarter about the
  // forearm); the head turned to the mark
  const aim = (draw) => {
    pose.twist = -w * 55; pose.head = -pose.twist * 0.9; pose.hips = -w * 35;
    pose.arm[w] = arm(85, 0, 0, w * 55);
    pose.arm[o] = arm(draw[0], draw[1], 0, w * draw[2]);
    pose.turn = { [w]: 90 };
  };
  const spellHands = (f) => { const k = f % 2; pose.arm[w] = arm(30 + 5 * k, 60 + 10 * k, 10); pose.arm[o] = arm(30 + 5 * k, 60 + 10 * k, 10); };
  switch (table) {
    case 'Move': walk(frames); break;
    case 'IdleMelee': ready(); break;
    case 'MoveMelee': walk(frames); ready(); break;
    case 'AttackMelee': {
      const [sh, el, ab, lean, t] = DOLL_STROKE[clamp(frame, 0, DOLL_STROKE.length - 1)];
      pose.arm[w] = arm(sh, el, ab); pose.arm[o] = offhand ? guard() : arm(20 - lean, 25, 10 + Math.max(0, -t) / 2);
      pose.lean = lean; turn(t);
      if (frame === 2) { pose.leg[o] = leg(10, 6); }
      if (frame >= 3) { pose.leg[w] = leg(frame === 5 ? 10 : 20, 10); pose.leg[o] = leg(frame === 5 ? -6 : -14, 12); pose.hips = -w * (frame === 5 ? 4 : 10); }
      break;
    }
    case 'IdleRanged': pose.arm[w] = arm(30, 10, 5); pose.arm[o] = arm(20, 20, 5); break;   // the bow held low, ready
    case 'MoveRanged': walk(frames); pose.arm[w] = arm(30, 10, 5); break;
    case 'AttackRanged': aim(DOLL_BOW[clamp(frame, 0, DOLL_BOW.length - 1)]); break;
    case 'IdleSpell': spellHands(frame); break;
    case 'MoveSpell': walk(frames); spellHands(frame); break;
    case 'AttackSpell': {
      const [sh, el, ab, lean] = DOLL_CAST[clamp(frame, 0, DOLL_CAST.length - 1)];
      pose.arm[w] = arm(sh, el, ab); pose.arm[o] = arm(sh, el, ab); pose.lean = lean;
      if (frame === 1 || frame === 2) { pose.leg[w] = leg(14, 6); pose.leg[o] = leg(-10, 8); }
      break;
    }
    case 'Death':
      if (frame <= 0) { pose.leg[w] = leg(40, 60); pose.leg[o] = leg(35, 70); pose.lean = 25; pose.rot = 12; pose.arm[w] = arm(25, 30, 15); pose.arm[o] = arm(25, 30, 15); }
      else { pose.leg[w] = leg(5, 10); pose.leg[o] = leg(0, 15); pose.rot = 90; pose.arm[w] = arm(10, 10, 20); pose.arm[o] = arm(10, 10, 20); }
      break;
    default: break;   // Idle, and anything the doll has no clip for: the stand
  }
  if (air && table !== 'Death') {
    const plain = table === 'Idle' || table === 'Move';
    if (air === 1) {
      pose.leg[w] = leg(40, 75); pose.leg[o] = leg(25, 60); pose.lean = Math.min(pose.lean, -4);
      if (plain) { pose.arm[w] = arm(20, 20, 35); pose.arm[o] = arm(20, 20, 35); }
    } else {
      pose.leg[w] = leg(18, 12); pose.leg[o] = leg(-6, 24);
      if (plain) { pose.arm[w] = arm(10, 10, 50); pose.arm[o] = arm(10, 10, 50); }
    }
    pose.dy = 0; pose.hips = 0;
  }
  return pose;
}

// ── the view ─────────────────────────────────────────────────────────────────────────────────────────────────────

const RAD = Math.PI / 180;
/** A turn about the figure's left-right axis by `deg` (rows of a 3x3) - a hanging limb's forward swing, its foot coming
 *  forward. */
const pitchM = (deg) => { const c = Math.cos(deg * RAD), s = Math.sin(deg * RAD); return [1, 0, 0, 0, c, -s, 0, s, c]; };
/** A turn about the figure's up axis by `deg`, its forward toward its left. */
const yawM = (deg) => { const c = Math.cos(deg * RAD), s = Math.sin(deg * RAD); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
/** A turn about the figure's forward axis by `deg`. */
const rollM = (deg) => { const c = Math.cos(deg * RAD), s = Math.sin(deg * RAD); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
const mul = (A, B) => [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]));
const app = (M, v) => [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[3] * v[0] + M[4] * v[1] + M[5] * v[2], M[6] * v[0] + M[7] * v[1] + M[8] * v[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Every part posed and seen from one record: { name, at (its bone's first joint, in the figure's frame: the pelvis its
 * origin, x its left, y down, z its forward), u (along its bone), s (across it, toward the figure's left), h (the way
 * its cross-section runs: across it, or along the doll's rows), d (its forward), phi (the eye's angle), rot (the fall's
 * turn on the ground, degrees) }. Pure.
 */
export function placeParts(rig, pose, record) {
  const phi = VIEW_DEGREES[clamp(record | 0, 0, 4)] * RAD;
  const J = rig.joints;
  const [px, py] = J.pelvis;
  const rest = (p) => [p[0] - px, p[1] - py, 0];
  const root = [0, pose.dy || 0, 0];
  const lean = mul(yawM(pose.twist || 0), pitchM(-(pose.lean || 0)));   // the shoulders: turned, then leant
  const hips = yawM(pose.hips || 0);
  const onTorso = (p) => add(root, app(lean, rest(p)));
  const frames = { torso: { at: root, R: lean }, head: { at: onTorso(J.neck), R: mul(yawM((pose.twist || 0) + (pose.head || 0)), pitchM(-(pose.lean || 0))) } };
  frames.cape = frames.torso; frames.drape = frames.torso; frames.skirt = { at: root, R: hips };
  for (const s of SIDES) {
    const a = pose.arm[s] ?? arm(), l = pose.leg[s] ?? leg();
    const Ru = mul(lean, mul(yawM(a.yw || 0), mul(rollM(-s * a.ab), pitchM(a.sh))));
    const Rl = mul(lean, mul(yawM(a.yw || 0), mul(rollM(-s * a.ab), pitchM(a.sh + a.el))));
    const sh = onTorso(J.shoulder[s]);
    const el = add(sh, app(Ru, sub3(rest(J.elbow[s]), rest(J.shoulder[s]))));
    frames[`uarm${s}`] = { at: sh, R: Ru };
    frames[`larm${s}`] = { at: el, R: Rl };
    frames[`item${s}`] = frames[`larm${s}`];
    // a shield is strapped to the forearm but faces the front: it goes where the forearm's middle goes, turned only as
    // the body leans
    if (rig.parts[`item${s}`]?.shield) {
      const mid = (p) => [(p[0] + J.hand[s][0]) / 2, (p[1] + J.hand[s][1]) / 2];
      const restMid = rest(mid(J.elbow[s]));
      const posedMid = add(el, app(Rl, sub3(restMid, rest(J.elbow[s]))));
      frames[`item${s}`] = { at: add(sub3(posedMid, app(lean, restMid)), app(lean, rest(J.elbow[s]))), R: lean };
    }
    const Rt = mul(hips, pitchM(l.hip)), Rs = mul(hips, pitchM(l.hip - l.knee));
    const hp = add(root, app(hips, rest(J.hip[s])));
    const kn = add(hp, app(Rt, sub3(rest(J.knee[s]), rest(J.hip[s]))));
    const an = add(kn, app(Rs, sub3(rest(J.ankle[s]), rest(J.knee[s]))));
    frames[`thigh${s}`] = { at: hp, R: Rt };
    frames[`shin${s}`] = { at: kn, R: Rs };
    frames[`foot${s}`] = { at: an, R: Rs };
  }
  const placed = [];
  for (const [name, part] of Object.entries(rig.parts)) {
    const f = frames[name];
    if (!f) continue;
    const { u, n, h } = part.bone;
    let sV = app(f.R, [n[0], n[1], 0]), dV = app(f.R, [0, 0, 1]);
    const t = name.startsWith('item') && !part.shield ? (pose.turn?.[name.slice(4)] ?? 0) * RAD : 0;
    if (t) [sV, dV] = [add(sV.map((v) => v * Math.cos(t)), dV.map((v) => v * Math.sin(t))), add(sV.map((v) => -v * Math.sin(t)), dV.map((v) => v * Math.cos(t)))];
    placed.push({ name, at: f.at, u: app(f.R, [u[0], u[1], 0]), s: sV, h: app(f.R, [h[0], h[1], 0]), d: dV, phi, rot: pose.rot || 0 });
  }
  return placed;
}

/**
 * ONE FRAME: the rig posed (posePuppet) and seen from `record` (0-4), drawn into a picture whose bottom row is the
 * floor the figure stands on and whose middle column is its centre line - so a billboard stood on its base at the feet
 * stands the figure where the body is. `{ width, height, rgba }`, top row first. Pure.
 *
 * Every pixel is traced back onto each part that may show there: a part of the body onto its ellipse round its bone
 * (the side of it that faces the eye), a card onto its plane; the front's picture where that bit of the surface faces
 * forward, the back's where it faces back. The nearest surface wins. Where nothing at all was drawn, the joints'
 * underlays (and what another part hid of each part in the front) fill the wedges a bend opened; and the made surfaces
 * get the dark edge the doll's own art draws round itself.
 *
 * The doll's front is drawn lit. Its back (backOfDoll) is its stuff's colour unlit, lit here as its surface faces the
 * eye (DOLL_LIGHT: from over the viewer's left shoulder, as the doll's own), metal with a sheen. Where the front's
 * picture would be stretched across a flank turned toward the eye - wider on screen than in the doll by DOLL_STRETCH -
 * the flank is the back's stuff, lit, instead of the doll's edge smeared across it. From the front nothing is
 * stretched: the stand is the doll, pixel for pixel.
 */
export function renderDollFrame(rig, table, frame, record, { air = 0 } = {}) {
  if (!rig) return null;
  const pose = posePuppet(table, frame, { weaponSide: rig.weaponSide, offhand: rig.offhandItem, air, frames: framesOf(table) });
  const placed = placeParts(rig, pose, record);
  const phi = VIEW_DEGREES[clamp(record | 0, 0, 4)] * RAD;
  const SX = [Math.cos(phi), 0, -Math.sin(phi)], CAM = [Math.sin(phi), 0, Math.cos(phi)];
  const [px, py] = rig.joints.pelvis;
  const proj = (P) => [px + dot(P, SX), py + P[1]];
  // the fall: the whole figure turned on the ground about its feet
  const rot = (pose.rot || 0) * RAD, rc = Math.cos(rot), rs = Math.sin(rot), gx = rig.cx, gy = rig.yBot;
  const turn = (x, y) => [rc * (x - gx) - rs * (y - gy) + gx, rs * (x - gx) + rc * (y - gy) + gy];
  const drawers = placed.map((p) => (rig.parts[p.name].card ? cardDrawer : shapeDrawer)(rig.parts[p.name], p, { SX, CAM, proj })).filter(Boolean);
  // the canvas: every part's reach, turned, and the floor under the centre line
  let minX = rig.cx - 1, maxX = rig.cx + 1, minY = rig.yBot, maxY = rig.yBot + 1;
  for (const d of drawers) for (const [x, y] of d.corners) {
    const [X, Y] = turn(x, y);
    if (X < minX) minX = X; if (X > maxX) maxX = X; if (Y < minY) minY = Y; if (Y > maxY) maxY = Y;
  }
  const ox = Math.floor(minX) - 1, oy = Math.floor(minY) - 1;
  const cw = Math.ceil(maxX) - ox + 2, ch = Math.ceil(maxY) - oy + 2;
  const cv = {
    ox, oy, cw, ch, rot: !!rot, rc, rs, gx, gy, turn,
    rgba: new Uint8Array(cw * ch * 4), z: new Float32Array(cw * ch).fill(-Infinity), made: new Uint8Array(cw * ch),
    under: new Uint8Array(cw * ch * 4), uz: new Float32Array(cw * ch).fill(-Infinity), umade: new Uint8Array(cw * ch),
  };
  drawers.sort((a, b) => b.zMax - a.zMax);   // the nearest first, so what they cover is passed by unsolved
  for (const d of drawers) d.draw(cv);
  // the underlays, where nothing at all was drawn
  for (let i = 0; i < cw * ch; i++) {
    if (cv.rgba[i * 4 + 3] || !cv.under[i * 4 + 3]) continue;
    cv.rgba[i * 4] = cv.under[i * 4]; cv.rgba[i * 4 + 1] = cv.under[i * 4 + 1]; cv.rgba[i * 4 + 2] = cv.under[i * 4 + 2]; cv.rgba[i * 4 + 3] = 255;
    cv.made[i] = cv.umade[i];
  }
  // the edge round what was made here (the doll's own art draws its own)
  const edge = [];
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const i = y * cw + x;
    if (!cv.made[i]) continue;
    if ((x && !cv.rgba[(i - 1) * 4 + 3]) || (x < cw - 1 && !cv.rgba[(i + 1) * 4 + 3]) || (y && !cv.rgba[(i - cw) * 4 + 3]) || (y < ch - 1 && !cv.rgba[(i + cw) * 4 + 3])) edge.push(i);
  }
  for (const i of edge) for (let j = 0; j < 3; j++) cv.rgba[i * 4 + j] = Math.round(cv.rgba[i * 4 + j] * 0.72);
  // the picture: about the centre line, down to the floor, up to the highest pixel drawn
  let hw = 1, top = rig.yBot;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    if (!cv.rgba[(y * cw + x) * 4 + 3]) continue;
    const dx = x + ox, dy = y + oy;
    if (dy > rig.yBot) continue;
    hw = Math.max(hw, rig.cx - dx, dx - rig.cx + 1);
    top = Math.min(top, dy);
  }
  const width = hw * 2, height = rig.yBot + 1 - top;
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const sy = top + y - oy;
    if (sy < 0 || sy >= ch) continue;
    const sx0 = rig.cx - hw - ox, a = Math.max(0, -sx0), b = Math.min(width, cw - sx0);
    if (b > a) rgba.set(cv.rgba.subarray((sy * cw + sx0 + a) * 4, (sy * cw + sx0 + b) * 4), (y * width + a) * 4);
  }
  return { width, height, rgba };
}

/** The light on a made surface: from over the viewer's left shoulder, a little above (screen x right, y down, z toward
 *  the eye), ambient and direct, and a metal's sheen; the stretch past which the doll's own picture gives way to its
 *  stuff. */
export const DOLL_LIGHT = Object.freeze({ dir: Object.freeze([-0.5, -0.4, 0.77]), ambient: 0.55, direct: 0.55, sheen: 120 });
export const DOLL_STRETCH = Object.freeze({ from: 1.6, to: 2.6 });
const LN = Math.hypot(...DOLL_LIGHT.dir), LX = DOLL_LIGHT.dir[0] / LN, LY = DOLL_LIGHT.dir[1] / LN, LZ = DOLL_LIGHT.dir[2] / LN;

/** Write one pixel, (r, g, b) at `depth`: onto the canvas if it is the nearest yet, else (an underlay's) onto the layer
 *  beneath that shows only where the canvas is empty. */
function put(cv, i, r, g, b, depth, under, made) {
  const z = under ? cv.uz : cv.z, px = under ? cv.under : cv.rgba;
  if (depth <= z[i]) return;
  z[i] = depth;
  px[i * 4] = r; px[i * 4 + 1] = g; px[i * 4 + 2] = b; px[i * 4 + 3] = 255;
  (under ? cv.umade : cv.made)[i] = made ? 1 : 0;
}
/** The canvas pixels a part may cover, from its corners (turned for a fall): [x0, y0, x1, y1]. */
function spanOf(cv, corners) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of corners) { const [X, Y] = cv.turn(x, y); if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; }
  return [Math.max(0, Math.floor(x0 - cv.ox) - 1), Math.max(0, Math.floor(y0 - cv.oy) - 1), Math.min(cv.cw - 1, Math.ceil(x1 - cv.ox) + 1), Math.min(cv.ch - 1, Math.ceil(y1 - cv.oy) + 1)];
}

/**
 * A part of the body: an elliptical cylinder round its bone. Its cross-section at each row (`prof`: its middle and
 * half-width, its depth the shape's) is an ellipse across `h` and forward; a point of its surface is
 *   at + lam u + (c + a sin t) h + (zo + b cos t) d,
 * and each pixel solves for lam (along the bone) and t (round it, on the side that faces the eye) - a few steps, each
 * reading the cross-section at the row it lands on. The angle says where on the picture (c + a sin t across the row)
 * and which picture (the front where cos t >= 0).
 */
function shapeDrawer(part, p, { SX, CAM, proj }) {
  const { prof, bone } = part;
  if (!prof || !prof.a.length) return null;
  const shape = shapeOf(part.name), zShift = part.zShift ?? 0, zAt = part.zShiftAt ?? null, bias = biasOf(part.name);
  const U2 = [dot(p.u, SX), p.u[1]], Hs = [dot(p.h, SX), p.h[1]], Ds = [dot(p.d, SX), p.d[1]];
  const ul = Math.hypot(U2[0], U2[1]);
  const e0 = ul > 1e-6 ? U2[0] / ul : 0, e1 = ul > 1e-6 ? U2[1] / ul : 1;
  const Lu = Math.max(ul, 1 / 3);   // a limb pointed at the eye keeps a third of its length: short, never gone
  const q0 = -e1, q1 = e0;
  const hq = Hs[0] * q0 + Hs[1] * q1, dq = Ds[0] * q0 + Ds[1] * q1;
  const he = Hs[0] * e0 + Hs[1] * e1, de = Ds[0] * e0 + Ds[1] * e1;
  const camH = dot(p.h, CAM), camD = dot(p.d, CAM), camU = dot(p.u, CAM), camAt = dot(p.at, CAM);
  const [J0, J1] = proj(p.at);
  const n = prof.a.length, depth = shape.depth, kMin = prof.kMin;
  const [j0, j1] = bone.j, [u0, u1] = bone.u, [h0, h1] = bone.h, rows = bone.rows;
  const lamOf0 = (k) => (rows ? (k + kMin - j1) / u1 : k + kMin);
  // each row's ellipse: A sin t + B cos t = R sin(t + g) across the screen, and where its middle stands
  const R = new Float32Array(n), CG = new Float32Array(n), SG = new Float32Array(n), OFF = new Float32Array(n), ZO = new Float32Array(n), BB = new Float32Array(n);
  const BX0 = new Float32Array(n), BX1 = new Float32Array(n), BY0 = new Float32Array(n), BY1 = new Float32Array(n);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let k = 0; k < n; k++) {
    const a = prof.a[k];
    if (!a) continue;
    const b = part.deepAt ? part.deepAt[k] : a * depth, zo = shape.forward * a + (zAt ? zAt[k] : zShift), A = a * hq, B = b * dq;
    R[k] = Math.hypot(A, B); ZO[k] = zo; BB[k] = b;
    CG[k] = R[k] ? A / R[k] : 1; SG[k] = R[k] ? B / R[k] : 0;
    OFF[k] = prof.c[k] * hq + zo * dq;
    const lam = rows ? (k + kMin + 0.5 - j1) / u1 : k + kMin + 0.5;
    const mx = J0 + e0 * Lu * lam + prof.c[k] * Hs[0] + zo * Ds[0], my = J1 + e1 * Lu * lam + prof.c[k] * Hs[1] + zo * Ds[1];
    const rx = Math.abs(a * Hs[0]) + Math.abs(b * Ds[0]) + Lu + 1, ry = Math.abs(a * Hs[1]) + Math.abs(b * Ds[1]) + Lu + 1;
    BX0[k] = mx - rx; BX1[k] = mx + rx; BY0[k] = my - ry; BY1[k] = my + ry;
    if (mx - rx < x0) x0 = mx - rx; if (mx + rx > x1) x1 = mx + rx; if (my - ry < y0) y0 = my - ry; if (my + ry > y1) y1 = my + ry;
  }
  if (x1 < x0) return null;
  const corners = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]];
  // the nearest this part can be anywhere: a pixel something nearer already holds is passed by unsolved
  let wide = 0, deep = 0;
  for (let k = 0; k < n; k++) if (prof.a[k]) { wide = Math.max(wide, Math.abs(prof.c[k]) + prof.a[k]); deep = Math.max(deep, Math.abs(ZO[k]) + BB[k]); }
  const zMax = camAt + Math.max(lamOf0(0) * camU, lamOf0(n) * camU) + wide * Math.abs(camH) + deep * Math.abs(camD) + bias + 1;
  const m = [0, 0, 0];
  const lit = (o, nx, ny, nz, shine, back) => {
    const d = nx * LX + ny * LY + nz * LZ, k = DOLL_LIGHT.ambient + DOLL_LIGHT.direct * (d > 0 ? d : 0);
    const sh = shine ? DOLL_LIGHT.sheen * Math.exp(-(((nx + 0.3) / 0.2) ** 2)) * (nz > 0 ? nz : 0) : 0;
    m[0] = clamp(Math.round(back[o] * k + sh), 0, 255); m[1] = clamp(Math.round(back[o + 1] * k + sh), 0, 255); m[2] = clamp(Math.round(back[o + 2] * k + sh), 0, 255);
  };
  return {
    corners,
    zMax,
    draw(cv) {
      const [fx0, fy0, fx1, fy1] = spanOf(cv, corners);
      const main = part, ext = part.ext;
      for (let fy = fy0; fy <= fy1; fy++) {
        // the row's span: what of it the cross-sections' boxes reach (all of it, turned in a fall)
        let sx0 = fx0, sx1 = fx1;
        if (!cv.rot) {
          const Y = fy + cv.oy + 0.5;
          let lo = Infinity, hi = -Infinity;
          for (let k = 0; k < n; k++) if (R[k] && Y >= BY0[k] && Y <= BY1[k]) { if (BX0[k] < lo) lo = BX0[k]; if (BX1[k] > hi) hi = BX1[k]; }
          if (hi < lo) continue;
          sx0 = Math.max(fx0, Math.floor(lo - cv.ox)); sx1 = Math.min(fx1, Math.ceil(hi - cv.ox));
        }
        for (let fx = sx0; fx <= sx1; fx++) {
        if (cv.z[fy * cv.cw + fx] >= zMax && (!ext || cv.uz[fy * cv.cw + fx] >= zMax)) continue;
        let X0 = fx + cv.ox + 0.5, Y0 = fy + cv.oy + 0.5;
        if (cv.rot) { const dx = X0 - cv.gx, dy = Y0 - cv.gy; X0 = cv.rc * dx + cv.rs * dy + cv.gx; Y0 = -cv.rs * dx + cv.rc * dy + cv.gy; }
        const vx = X0 - J0, vy = Y0 - J1, ve = vx * e0 + vy * e1, vq = vx * q0 + vy * q1;
        let lam = ve / Lu, k = -1, st = 0, ct = 1, ok = false;
        for (let it = 0; it < 4; it++) {
          k = (rows ? Math.floor(j1 + lam * u1) : Math.floor(lam)) - kMin;
          if (k < 0 || k >= n || !R[k]) { ok = false; break; }
          let r = (vq - OFF[k]) / R[k];
          ok = r >= -1 && r <= 1;
          if (!ok && it) break;
          r = r < -1 ? -1 : r > 1 ? 1 : r;
          const ca = Math.sqrt(1 - r * r), cg = CG[k], sg = SG[k], a = prof.a[k], b = BB[k];
          // t = asin(r) - g, or pi - asin(r) - g: the one whose surface faces the eye
          const s1 = r * cg - ca * sg, c1 = ca * cg + r * sg, s2 = r * cg + ca * sg, c2 = r * sg - ca * cg;
          if ((s1 / a) * camH + (c1 / b) * camD >= (s2 / a) * camH + (c2 / b) * camD) { st = s1; ct = c1; } else { st = s2; ct = c2; }
          // the angle reads only the row's cross-section: landing in the same row, it is the answer
          lam = (ve - (prof.c[k] + a * st) * he - (ZO[k] + b * ct) * de) / Lu;
          if ((rows ? Math.floor(j1 + lam * u1) : Math.floor(lam)) - kMin === k) break;
        }
        if (!ok || (rows ? Math.floor(j1 + lam * u1) : Math.floor(lam)) - kMin !== k) continue;
        const a = prof.a[k], b = BB[k], across = prof.c[k] + a * st;
        const tx = Math.floor(j0 + lam * u0 + across * h0), ty = Math.floor(j1 + lam * u1 + across * h1);
        const dz = camAt + lam * camU + across * camH + (ZO[k] + b * ct) * camD + bias;
        const i = fy * cv.cw + fx;
        // the part's own pixel, else its underlay's (shown only where nothing else is)
        let img = main, under = false;
        let ix = tx - img.x0, iy = ty - img.y0;
        let o = ix >= 0 && iy >= 0 && ix < img.w && iy < img.h ? (iy * img.w + ix) : -1;
        if (o < 0 || (!img.rgba[o * 4 + 3] && !img.back[o * 4 + 3])) {
          if (!ext) continue;
          img = ext; under = true;
          ix = tx - img.x0; iy = ty - img.y0;
          o = ix >= 0 && iy >= 0 && ix < img.w && iy < img.h ? (iy * img.w + ix) : -1;
          if (o < 0 || (!img.rgba[o * 4 + 3] && !img.back[o * 4 + 3])) continue;
        }
        if (dz <= (under ? cv.uz : cv.z)[i]) continue;   // something nearer is already there
        // the doll's own picture where this bit of the surface faces forward and is not stretched across a flank
        const A = a * hq, B = b * dq;
        const stretch = Math.abs(A * ct - B * st) / (a * Math.abs(ct) + 1e-6);
        const art = ct >= 0 && img.rgba[o * 4 + 3] ? 1 - smooth((stretch - DOLL_STRETCH.from) / (DOLL_STRETCH.to - DOLL_STRETCH.from)) : 0;
        const o4 = o * 4;
        if (art >= 0.999) { put(cv, i, img.rgba[o4], img.rgba[o4 + 1], img.rgba[o4 + 2], dz, under, false); continue; }
        if (!img.back[o4 + 3]) {   // nothing behind: the front where it faces forward, else see-through
          if (art > 0) put(cv, i, img.rgba[o4], img.rgba[o4 + 1], img.rgba[o4 + 2], dz, under, false);
          continue;
        }
        let nx = (st / a) * Hs[0] + (ct / b) * Ds[0], ny = (st / a) * Hs[1] + (ct / b) * Ds[1], nz = (st / a) * camH + (ct / b) * camD;
        const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        nx /= nl; ny /= nl; nz /= nl;
        lit(o4, nx, ny, nz, img.gloss[o], img.back);
        if (art > 0) put(cv, i, Math.round(img.rgba[o4] * art + m[0] * (1 - art)), Math.round(img.rgba[o4 + 1] * art + m[1] * (1 - art)), Math.round(img.rgba[o4 + 2] * art + m[2] * (1 - art)), dz, under, true);
        else put(cv, i, m[0], m[1], m[2], dz, under, true);
        }
      }
    },
  };
}

/**
 * A card: an item in a hand - flat, in the plane along its forearm and across it, standing at the forearm's front
 * (`zShift`); a shield faces the body's front wherever its arm goes (placeParts). Seen edge-on it keeps a sliver
 * (two pixels), so a blade is never gone; seen from behind it shows its back (a shield's inside; a blade's other side
 * is itself).
 */
function cardDrawer(part, p, { SX, CAM, proj }) {
  const { bone } = part;
  const zShift = part.zShift ?? 0, bias = biasOf(part.name);
  const ul0 = Math.hypot(dot(p.u, SX), p.u[1]);
  const e = ul0 > 1e-6 ? [dot(p.u, SX) / ul0, p.u[1] / ul0] : [0, 1];
  const U = [e[0] * Math.max(ul0, 1 / 3), e[1] * Math.max(ul0, 1 / 3)];
  const perp = [-e[1], e[0]];
  const S0 = [dot(p.s, SX), p.s[1]];
  const along = S0[0] * e[0] + S0[1] * e[1];
  let side = S0[0] * perp[0] + S0[1] * perp[1];
  const thin = Math.min(1, 2 / Math.max(1, part.w));
  if (Math.abs(side) < thin) side = (side < 0 ? -1 : 1) * thin;
  const S = [e[0] * along + perp[0] * side, e[1] * along + perp[1] * side];
  const det = U[0] * S[1] - U[1] * S[0];
  if (Math.abs(det) < 1e-9) return null;
  const [J0, J1] = proj(p.at);
  const [j0, j1] = bone.j, [u0, u1] = bone.u, [n0, n1] = bone.n;
  const toScreen = (x, y) => { const dx = x - j0, dy = y - j1, l = dx * u0 + dy * u1, a = dx * n0 + dy * n1; return [J0 + l * U[0] + a * S[0], J1 + l * U[1] + a * S[1]]; };
  const corners = [toScreen(part.x0, part.y0), toScreen(part.x0 + part.w, part.y0), toScreen(part.x0, part.y0 + part.h), toScreen(part.x0 + part.w, part.y0 + part.h)];
  const front = dot(p.d, CAM) >= 0;
  const pic = front ? part.rgba : part.back;
  const camAt = dot(p.at, CAM), camU = dot(p.u, CAM), camS = dot(p.s, CAM), camD = dot(p.d, CAM);
  const reach = Math.hypot(part.w, part.h) + Math.hypot(part.x0 - j0, part.y0 - j1);
  const zMax = camAt + reach * (Math.abs(camU) + Math.abs(camS)) + Math.abs(zShift * camD) + bias + 1;
  return {
    corners,
    zMax,
    draw(cv) {
      const [fx0, fy0, fx1, fy1] = spanOf(cv, corners);
      for (let fy = fy0; fy <= fy1; fy++) for (let fx = fx0; fx <= fx1; fx++) {
        let X0 = fx + cv.ox + 0.5, Y0 = fy + cv.oy + 0.5;
        if (cv.rot) { const dx = X0 - cv.gx, dy = Y0 - cv.gy; X0 = cv.rc * dx + cv.rs * dy + cv.gx; Y0 = -cv.rs * dx + cv.rc * dy + cv.gy; }
        const vx = X0 - J0, vy = Y0 - J1;
        const lam = (vx * S[1] - vy * S[0]) / det, across = (U[0] * vy - U[1] * vx) / det;
        const ix = Math.floor(j0 + lam * u0 + across * n0) - part.x0, iy = Math.floor(j1 + lam * u1 + across * n1) - part.y0;
        if (ix < 0 || iy < 0 || ix >= part.w || iy >= part.h) continue;
        const o = (iy * part.w + ix) * 4;
        if (!pic[o + 3]) continue;
        put(cv, fy * cv.cw + fx, pic[o], pic[o + 1], pic[o + 2], camAt + lam * camU + across * camS + zShift * camD + bias, false, !front && part.shield);
      }
    },
  };
}

/** The clip lengths the doll is drawn at - the body's own (eotbBillboard.js TABLE_FRAMES), so a frame the body asks for
 *  is a frame the doll has. Kept here as numbers so this module stays the body's leaf: test/dollskin1.test.js pins
 *  them equal to TABLE_FRAMES. */
export const DOLL_TABLE_FRAMES = Object.freeze({
  Idle: 1, Move: 4, Death: 2, IdleMelee: 1, MoveMelee: 2, AttackMelee: 6,
  IdleRanged: 1, MoveRanged: 2, AttackRanged: 4, IdleSpell: 2, MoveSpell: 2, AttackSpell: 4,
});
const framesOf = (table) => DOLL_TABLE_FRAMES[table] ?? 1;
