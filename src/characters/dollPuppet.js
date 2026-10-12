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
// THE RIG (buildDollRig). The joints are read off the composite's body and head layers (DOLL_LAYER, the compositor's
// labels) - the neck under the head, the shoulders just below it, the crotch where the gap between the legs closes,
// the hands where an arm last stands apart from the body, the elbows and knees half way - with a proportion for each
// where the silhouette does not say (a robe hides the legs' gap, an arm drawn against the body hides its edge). The
// pixels are then cut by those joints into a head, a torso, two upper arms, two forearms, two thighs, two shins, the
// cloak's lining, and the two hands' items riding their forearms.
//
// THE VIEWS (renderDollFrame). Five records, as the wheel draws them (eotbBillboard.js RECORD_OFFSETS): 0 the front, 4
// the back, 1-3 between - and unmirrored, the eye at the figure's LEFT (the wheel's orientations 5-7: orientationFor's
// SignedAngle, camera to the left of the facing), so the figure faces the screen's left and its left side is the near
// one; the wheel mirrors them for the other half. Each part turns with the view: its joints are placed in the figure's
// own frame (x its left, y down, z its forward) and projected, its width narrows by its depth (PART_DEPTH) as the view
// turns side-on, and from behind it is drawn the other way round. The back of the head is the hair's own colour over
// the face (helms keep their pixels). The parts are drawn far to near.
//
// THE CLIPS (posePuppet). Every table the body plays, at its own frame count (TABLE_FRAMES): a stand, a four-step walk,
// the weapon ready and its six-frame stroke, the bow drawn and loosed, the spell readied and cast, the fall - and the
// jump, the port's own (`air` 1 rising, 2 falling), laid over whichever table the body stands in.

import { EQUIP_SLOTS } from './paperdoll.js';

/** What drew each pixel of a labelled composite (ui/paperDoll.js composePaperDollPixels `labels`): the body and every
 *  layer that moves with it, the head (hair and face), a helm, the cloak's lining (behind the body), the right hand's
 *  and the left hand's items, a cloak's own layer. 0 is nothing drawn. */
export const DOLL_LAYER = Object.freeze({ none: 0, body: 1, head: 2, lining: 3, right: 4, left: 5, cloak: 6, helm: 7 });

/** The layer an item worn in `slot` draws as. */
export function dollLayerOfSlot(slot) {
  if (slot === EQUIP_SLOTS.RightHand) return DOLL_LAYER.right;
  if (slot === EQUIP_SLOTS.LeftHand) return DOLL_LAYER.left;
  if (slot === EQUIP_SLOTS.Head) return DOLL_LAYER.helm;
  if (slot === EQUIP_SLOTS.Cloak1 || slot === EQUIP_SLOTS.Cloak2) return DOLL_LAYER.cloak;
  return DOLL_LAYER.body;
}

/** The figure's proportions where its silhouette does not say, as fractions of its height from the top of the head:
 *  the neck, the crotch (and the bounds a found one is held to), the torso's half-width bounds. */
export const DOLL_PROPORTION = Object.freeze({
  neck: 0.14, neckMin: 0.08, neckMax: 0.22,
  crotch: 0.53, crotchMin: 0.42, crotchMax: 0.66,
  shoulderDrop: 0.03, torsoHalfMin: 0.06, torsoHalfMax: 0.11, hipHalf: 0.045, handPastCrotch: 0.02,
});

/** How deep each part is for its width - its width side-on, as a fraction of its width from the front. */
export const PART_DEPTH = Object.freeze({ torso: 0.5, head: 0.68, limb: 0.85, cape: 0.3, item: 0.9 });

/** The view each drawn record stands for: the eye's angle round the figure from its front, toward its left. */
export const VIEW_DEGREES = Object.freeze([0, 45, 90, 135, 180]);

const BODYISH = new Set([DOLL_LAYER.body, DOLL_LAYER.head, DOLL_LAYER.helm, DOLL_LAYER.cloak]);
const SIDES = Object.freeze([-1, 1]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * THE RIG, off one labelled composite: `{ width, height, rgba, labels }` (top row first, as the compositor answers).
 * Null when there is no figure in it. Pure.
 */
export function buildDollRig(doll) {
  const { width: W, height: H, rgba } = doll ?? {};
  if (!W || !H || !rgba) return null;
  const labels = doll.labels ?? null;
  const lab = (i) => (rgba[i * 4 + 3] ? (labels ? labels[i] : DOLL_LAYER.body) : DOLL_LAYER.none);
  const fig = (x, y) => x >= 0 && x < W && y >= 0 && y < H && BODYISH.has(lab(y * W + x));
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
    if (l !== DOLL_LAYER.head && l !== DOLL_LAYER.helm) continue;
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
  if (gapAtCentre(yBot) || gapAtCentre(yBot - 1)) {
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

  // each arm: where it stands apart from the body, row by row, and the lowest row it does
  const handLimit = Math.round(crotchY + Hf * 0.15);
  const arm = {};
  for (const s of SIDES) {
    const bound = new Map();
    let handY = -1;
    for (let y = shoulderY; y <= Math.min(handLimit, yBot); y++) {
      const runs = runsAt(y);
      // the body's run on this side: the one through the centre, or below the crotch the leg nearest it
      const core = runs.find(([a, b]) => a <= cx && b >= cx)
        ?? (s < 0 ? runs.filter(([, b]) => b < cx).pop() : runs.find(([a]) => a > cx));
      const apart = !!core && runs.some(([a, b]) => (s < 0 ? b < core[0] : a > core[1]));
      if (apart) { bound.set(y, s < 0 ? core[0] - 1 : core[1] + 1); handY = y; }
      else {
        // drawn against the body: the arm is what lies past the torso's own half-width (a little wider at the shoulder)
        const t = (y - shoulderY) / Math.max(1, crotchY - shoulderY);
        bound.set(y, cx + s * Math.round(torsoHalf * (1 + 0.25 * Math.max(0, 1 - t * 5))));
      }
    }
    if (handY < 0) handY = Math.round(crotchY + Hf * P.handPastCrotch);
    arm[s] = { bound, handY, elbowY: Math.round(shoulderY + (handY - shoulderY) * 0.47) };
  }
  const kneeY = Math.round(crotchY + (yBot - crotchY) * 0.5);

  // every pixel to its part
  const partOf = new Int8Array(W * H).fill(-1);
  const NAMES = ['head', 'torso', 'cape', 'uarm-1', 'larm-1', 'uarm1', 'larm1', 'thigh-1', 'shin-1', 'thigh1', 'shin1', 'item-1', 'item1'];
  const ID = Object.fromEntries(NAMES.map((n, i) => [n, i]));
  let itemSide = { [DOLL_LAYER.right]: 0, [DOLL_LAYER.left]: 0 };
  const itemSum = { [DOLL_LAYER.right]: [0, 0], [DOLL_LAYER.left]: [0, 0] };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const l = lab(y * W + x);
    if (l === DOLL_LAYER.right || l === DOLL_LAYER.left) { itemSum[l][0] += x; itemSum[l][1]++; }
  }
  for (const l of [DOLL_LAYER.right, DOLL_LAYER.left]) itemSide[l] = itemSum[l][1] ? (itemSum[l][0] / itemSum[l][1] < cx ? -1 : 1) : (l === DOLL_LAYER.right ? -1 : 1);
  if (itemSum[DOLL_LAYER.right][1] && itemSum[DOLL_LAYER.left][1] && itemSide[DOLL_LAYER.right] === itemSide[DOLL_LAYER.left]) itemSide[DOLL_LAYER.left] = -itemSide[DOLL_LAYER.right];
  const sideOf = (x) => (x < cx ? -1 : 1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, l = lab(i);
    if (l === DOLL_LAYER.none) continue;
    if (l === DOLL_LAYER.right || l === DOLL_LAYER.left) { partOf[i] = ID[`item${itemSide[l]}`]; continue; }
    if (l === DOLL_LAYER.lining) { partOf[i] = ID.cape; continue; }
    if (l === DOLL_LAYER.head || l === DOLL_LAYER.helm || y < neckY) { partOf[i] = ID.head; continue; }
    const s = sideOf(x), a = arm[s];
    if (y >= shoulderY && y <= a.handY && s * (x - a.bound.get(y)) >= 0) { partOf[i] = ID[`${y < a.elbowY ? 'uarm' : 'larm'}${s}`]; continue; }
    if (y > crotchY) { partOf[i] = ID[`${y < kneeY ? 'thigh' : 'shin'}${s}`]; continue; }
    partOf[i] = ID.torso;
  }

  // the joints, in the doll's own pixels
  const centroid = (name, y0, y1) => {
    let s = 0, n = 0;
    const id = ID[name];
    for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = 0; x < W; x++) if (partOf[y * W + x] === id) { s += x; n++; }
    return n ? s / n : null;
  };
  const joints = { pelvis: [cx, crotchY], neck: [cx, neckY], top: [cx, hn ? hy0 : yTop], foot: {}, hand: {}, elbow: {}, shoulder: {}, hip: {}, knee: {} };
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
    joints.foot[s] = [centroid(`shin${s}`, yBot - 3, yBot) ?? joints.knee[s][0], yBot];
  }

  // the parts, cut out
  const parts = {};
  for (const name of NAMES) {
    const id = ID[name];
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (partOf[y * W + x] === id) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) continue;
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const px = new Uint8Array(w * h * 4), lb = new Uint8Array(w * h);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * W + x;
      if (partOf[i] !== id) continue;
      const o = (y - y0) * w + (x - x0);
      px.set(rgba.subarray(i * 4, i * 4 + 4), o * 4);
      lb[o] = lab(i);
    }
    parts[name] = { name, x0, y0, w, h, rgba: px, labels: lb };
  }
  // the cloak's lining whole (the compositor's `lining`, the layer before the body covered it): what the body hides of it
  // from the front is the cloak's back from behind. Without it, the rim the composite shows.
  const lining = doll.lining && background0(doll.lining, W, H) ? cutLayer(doll.lining, W, H) : null;
  if (lining) parts.cape = { name: 'cape', ...lining };
  if (parts.head) parts.head.back = backOfHead(parts.head);
  const weaponSide = itemSum[DOLL_LAYER.right][1] ? itemSide[DOLL_LAYER.right] : -1;
  return { width: W, height: H, cx, yTop, yBot, figureHeight: Hf, neckY, shoulderY, crotchY, kneeY, torsoHalf, joints, parts, weaponSide, offhandItem: !!itemSum[DOLL_LAYER.left][1] };
}

/** Does a layer hold anything at all. */
function background0(rgba, W, H) {
  for (let i = 0; i < W * H; i++) if (rgba[i * 4 + 3]) return true;
  return false;
}
/** A whole layer's pixels, cut to their box: { x0, y0, w, h, rgba, labels }. */
function cutLayer(rgba, W, H) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (rgba[(y * W + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const px = new Uint8Array(w * h * 4);
  for (let y = y0; y <= y1; y++) px.set(rgba.subarray((y * W + x0) * 4, (y * W + x1 + 1) * 4), (y - y0) * w * 4);
  return { x0, y0, w, h, rgba: px, labels: new Uint8Array(w * h).fill(DOLL_LAYER.lining) };
}

/** The back of a head: its hair's colour over every pixel of the head's own layer (the face and the hair), shaded by
 *  the pixel it replaces; a helm's pixels stand as they are. The hair is the median of the head's top quarter. */
export function backOfHead(part) {
  const { w, h, rgba, labels } = part;
  const lum = (o) => rgba[o] * 0.299 + rgba[o + 1] * 0.587 + rgba[o + 2] * 0.114;
  const top = [];
  for (let y = 0; y < Math.max(1, Math.round(h * 0.25)); y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (labels[i] === DOLL_LAYER.head && rgba[i * 4 + 3]) top.push(i * 4);
  }
  if (!top.length) return rgba;
  top.sort((a, b) => lum(a) - lum(b));
  const m = top[top.length >> 1];
  const hair = [rgba[m], rgba[m + 1], rgba[m + 2]];
  const out = rgba.slice();
  for (let i = 0; i < w * h; i++) {
    if (labels[i] !== DOLL_LAYER.head || !rgba[i * 4 + 3]) continue;
    const k = 0.75 + 0.5 * (lum(i * 4) / 255);
    out[i * 4] = clamp(Math.round(hair[0] * k), 0, 255);
    out[i * 4 + 1] = clamp(Math.round(hair[1] * k), 0, 255);
    out[i * 4 + 2] = clamp(Math.round(hair[2] * k), 0, 255);
  }
  return out;
}

// ── the clips ────────────────────────────────────────────────────────────────────────────────────────────────────

const arm = (sh = 0, el = 0, ab = 0) => ({ sh, el, ab });
const leg = (hip = 0, knee = 0) => ({ hip, knee });
/** The walk's four steps, as the near (`a`) leg and arm and the far (`b`): contact, passing, contact, passing. */
const WALK = Object.freeze([
  { la: leg(24, 4), lb: leg(-18, 14), aa: -16, ab: 16, dy: 0 },
  { la: leg(4, 0), lb: leg(6, 42), aa: 0, ab: 0, dy: -2 },
  { la: leg(-18, 14), lb: leg(24, 4), aa: 16, ab: -16, dy: 0 },
  { la: leg(6, 42), lb: leg(4, 0), aa: 0, ab: 0, dy: -2 },
]);
const walkStep = (f, n) => WALK[Math.round((f / Math.max(1, n)) * 4) % 4];

/** The weapon's six-frame stroke: the ready, the raise, the top, the cut, the follow-through, the return. */
export const STROKE = Object.freeze([[35, 55, 5], [110, 70, -8], [165, 30, -12], [95, 0, 15], [35, -5, 20], [25, 35, 8]]);
/** The bow: drawn, at full draw, held, loosed - the draw arm's shoulder and elbow (the bow arm stands out straight). */
export const BOW = Object.freeze([[85, 40], [85, 110], [85, 110], [90, 20]]);
/** The cast: gathered, thrust, held, returned - both arms (shoulder, elbow), and the lean. */
export const CAST = Object.freeze([[60, 80, 0], [95, 10, 10], [100, 0, 12], [40, 30, 4]]);

/**
 * THE POSE for one table's frame: { lean, head, dy, rot (the fall's turn on the ground, degrees), arm: { -1, 1 },
 * leg: { -1, 1 } }, arms as { sh (forward), el (bent forward), ab (out to the side) } and legs as { hip (forward),
 * knee (bent back) }, in degrees. `weaponSide` the side the weapon is held on; `air` 1 rising, 2 falling (the port's
 * own jump, laid over the table's arms). Pure.
 */
export function posePuppet(table, frame, { weaponSide = -1, offhand = false, air = 0, frames = 1 } = {}) {
  const w = weaponSide, o = -weaponSide;
  const pose = { lean: 0, head: 0, dy: 0, rot: 0, arm: { [-1]: arm(), [1]: arm() }, leg: { [-1]: leg(), [1]: leg() } };
  const walk = (n) => {
    const st = walkStep(frame, n);
    pose.leg[w] = { ...st.la }; pose.leg[o] = { ...st.lb };
    pose.arm[w].sh = st.aa; pose.arm[o].sh = st.ab;
    pose.dy = st.dy;
  };
  const ready = () => { pose.arm[w] = arm(35, 55, 8); pose.arm[o] = offhand ? arm(40, 50, 6) : arm(15, 20, 6); pose.lean = 5; };
  const bowHold = () => { pose.arm[w] = arm(85, 0, 0); pose.arm[o] = arm(85, 40, 0); };
  const spellHands = (f) => { const k = f % 2; pose.arm[w] = arm(30 + 5 * k, 60 + 10 * k, 10); pose.arm[o] = arm(30 + 5 * k, 60 + 10 * k, 10); };
  switch (table) {
    case 'Move': walk(frames); break;
    case 'IdleMelee': ready(); break;
    case 'MoveMelee': walk(frames); ready(); break;
    case 'AttackMelee': {
      const [sh, el, lean] = STROKE[clamp(frame, 0, STROKE.length - 1)];
      pose.arm[w] = arm(sh, el, 6); pose.arm[o] = offhand ? arm(45, 45, 6) : arm(20 - lean, 25, 8); pose.lean = lean;
      if (frame >= 3) { pose.leg[w] = leg(20, 10); pose.leg[o] = leg(-14, 12); }
      break;
    }
    case 'IdleRanged': bowHold(); pose.arm[w].sh = 30; pose.arm[o].sh = 30; break;
    case 'MoveRanged': walk(frames); bowHold(); pose.arm[w].sh = 30; pose.arm[o].sh = 30; break;
    case 'AttackRanged': {
      const [sh, el] = BOW[clamp(frame, 0, BOW.length - 1)];
      pose.arm[w] = arm(85, 0, 0); pose.arm[o] = arm(sh, el, frame === 3 ? 20 : 0);
      break;
    }
    case 'IdleSpell': spellHands(frame); break;
    case 'MoveSpell': walk(frames); spellHands(frame); break;
    case 'AttackSpell': {
      const [sh, el, lean] = CAST[clamp(frame, 0, CAST.length - 1)];
      pose.arm[w] = arm(sh, el, 8); pose.arm[o] = arm(sh, el, 8); pose.lean = lean;
      break;
    }
    case 'Death':
      if (frame <= 0) { pose.leg[w] = leg(40, 60); pose.leg[o] = leg(35, 70); pose.lean = 25; pose.rot = 12; }
      else { pose.leg[w] = leg(5, 10); pose.leg[o] = leg(0, 15); pose.rot = 90; pose.arm[w] = arm(10, 10, 20); pose.arm[o] = arm(10, 10, 20); }
      break;
    default: break;   // Idle, and anything the doll has no clip for: the stand
  }
  if (air && table !== 'Death') {
    const plain = table === 'Idle' || table === 'Move';
    if (air === 1) {
      pose.leg[w] = leg(40, 75); pose.leg[o] = leg(25, 60);
      if (plain) { pose.arm[w] = arm(20, 20, 35); pose.arm[o] = arm(20, 20, 35); }
    } else {
      pose.leg[w] = leg(18, 12); pose.leg[o] = leg(-6, 24);
      if (plain) { pose.arm[w] = arm(10, 10, 50); pose.arm[o] = arm(10, 10, 50); }
    }
    pose.dy = 0;
  }
  return pose;
}

// ── the view ─────────────────────────────────────────────────────────────────────────────────────────────────────

const RAD = Math.PI / 180;
/** Turn (x, y, z) about the figure's left-right axis by `deg` - a hanging limb's forward swing (its foot comes forward). */
const pitch = ([x, y, z], deg) => { const c = Math.cos(deg * RAD), s = Math.sin(deg * RAD); return [x, y * c - z * s, y * s + z * c]; };
/** Turn (x, y, z) about the figure's forward axis by `deg`. */
const roll = ([x, y, z], deg) => { const c = Math.cos(deg * RAD), s = Math.sin(deg * RAD); return [x * c - y * s, x * s + y * c, z]; };
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/**
 * Every part's place for one pose seen from one record: { name, affine (doll pixel -> frame pixel, [a, b, c, d, e, f]
 * as x' = a x + c y + e, y' = b x + d y + f), depth, back } - in the order they are drawn, far to near. The frame's own
 * coordinates: x the doll's, y the doll's, the figure's feet on the doll's floor (the rig's yBot). Pure.
 */
export function placeParts(rig, pose, record) {
  const phi = VIEW_DEGREES[clamp(record | 0, 0, 4)] * RAD;
  const cphi = Math.cos(phi), sphi = Math.sin(phi);
  const back = cphi < -1e-6;
  const [cx, cy] = rig.joints.pelvis;
  const rest = (p) => [p[0] - cx, p[1] - cy, 0];   // a doll point in the figure's frame, the pelvis its origin
  const root = [0, pose.dy || 0, 0];
  const project = (v) => [cx + v[0] * cphi - v[2] * sphi, cy + v[1], v[0] * sphi + v[2] * cphi];
  const torsoTurn = (v) => pitch(v, -(pose.lean || 0));
  const J = rig.joints;
  const placed = {};
  const pts = {};
  pts.pelvis = add(root, [0, 0, 0]);
  pts.neck = add(root, torsoTurn(rest(J.neck)));
  pts.top = add(root, torsoTurn(rest(J.top)));
  for (const s of SIDES) {
    const a = pose.arm[s] ?? arm(), l = pose.leg[s] ?? leg();
    const sh = add(root, torsoTurn(rest(J.shoulder[s])));
    const lean = -(pose.lean || 0);
    const upper = (v) => pitch(roll(pitch(v, a.sh), -s * a.ab), lean);
    const lower = (v) => pitch(roll(pitch(v, a.sh + a.el), -s * a.ab), lean);
    const el = add(sh, upper(sub3(rest(J.elbow[s]), rest(J.shoulder[s]))));
    const hd = add(el, lower(sub3(rest(J.hand[s]), rest(J.elbow[s]))));
    const hp = add(root, rest(J.hip[s]));
    const kn = add(hp, pitch(sub3(rest(J.knee[s]), rest(J.hip[s])), l.hip));
    const ft = add(kn, pitch(sub3(rest(J.foot[s]), rest(J.knee[s])), l.hip - l.knee));
    Object.assign(pts, { [`sh${s}`]: sh, [`el${s}`]: el, [`hd${s}`]: hd, [`hp${s}`]: hp, [`kn${s}`]: kn, [`ft${s}`]: ft });
  }
  // a segment's affine: the rest segment J->K onto its projection, its width narrowed by its depth and turned round
  // from behind; a segment seen end-on keeps a third of its length (a limb pointed at the eye is short, never gone)
  const segment = (from, to, at, toAt, depthK) => {
    const u = [to[0] - from[0], to[1] - from[1]];
    const pa = project(at), pb = project(toAt);
    let v = [pb[0] - pa[0], pb[1] - pa[1]];
    const lu = Math.hypot(u[0], u[1]) || 1, lv = Math.hypot(v[0], v[1]);
    if (lv < lu / 3) { const d = lv > 1e-6 ? [v[0] / lv, v[1] / lv] : [u[0] / lu, u[1] / lu]; v = [d[0] * lu / 3, d[1] * lu / 3]; }
    const wk = (back ? -1 : 1) * (depthK + (1 - depthK) * Math.abs(cphi));
    const lvv = Math.hypot(v[0], v[1]) || 1;
    // the target's perpendicular at the rest width: u's perpendicular, |u| long, onto v's, |u| long, times wk
    const up = [-u[1], u[0]], vp = [(-v[1] / lvv) * lu * wk, (v[0] / lvv) * lu * wk];
    // M [u up] = [v vp]  ->  M = [v vp] [u up]^-1
    const det = u[0] * up[1] - up[0] * u[1] || 1;
    const inv = [up[1] / det, -u[1] / det, -up[0] / det, u[0] / det];   // [[i0 i2] [i1 i3]]
    const a = v[0] * inv[0] + vp[0] * inv[1], c = v[0] * inv[2] + vp[0] * inv[3];
    const b = v[1] * inv[0] + vp[1] * inv[1], d = v[1] * inv[2] + vp[1] * inv[3];
    const e = pa[0] - (a * from[0] + c * from[1]), f = pa[1] - (b * from[0] + d * from[1]);
    return { affine: [a, b, c, d, e, f], depth: (pa[2] + pb[2]) / 2 };
  };
  const put = (name, seg, bias = 0, extra = {}) => { if (rig.parts[name]) placed[name] = { name, ...seg, depth: seg.depth + bias, back, ...extra }; };
  const torso = segment(J.pelvis, J.neck, pts.pelvis, pts.neck, PART_DEPTH.torso);
  put('torso', torso);
  put('cape', segment(J.pelvis, J.neck, pts.pelvis, pts.neck, PART_DEPTH.cape), back ? 8 : -8);
  put('head', segment(J.neck, J.top, pts.neck, pts.top, PART_DEPTH.head), 1);
  for (const s of SIDES) {
    const upper = segment(J.shoulder[s], J.elbow[s], pts[`sh${s}`], pts[`el${s}`], PART_DEPTH.limb);
    const lower = segment(J.elbow[s], J.hand[s], pts[`el${s}`], pts[`hd${s}`], PART_DEPTH.limb);
    put(`uarm${s}`, upper, 0.2);
    put(`larm${s}`, lower, 0.3);
    put(`item${s}`, lower, 0.4, { attached: true });
    put(`thigh${s}`, segment(J.hip[s], J.knee[s], pts[`hp${s}`], pts[`kn${s}`], PART_DEPTH.limb), -0.1);
    put(`shin${s}`, segment(J.knee[s], J.foot[s], pts[`kn${s}`], pts[`ft${s}`], PART_DEPTH.limb), -0.05);
  }
  // the fall: the whole figure turned on the ground about its feet, toward the side it falls to
  if (pose.rot) {
    const r = pose.rot * RAD, c = Math.cos(r), s = Math.sin(r);
    const gx = cx, gy = rig.yBot;
    for (const p of Object.values(placed)) {
      const [a, b, cc, d, e, f] = p.affine;
      // R (x - g) + g after the part's own
      p.affine = [c * a - s * b, s * a + c * b, c * cc - s * d, s * cc + c * d, c * (e - gx) - s * (f - gy) + gx, s * (e - gx) + c * (f - gy) + gy];
    }
  }
  return Object.values(placed).sort((p, q) => p.depth - q.depth);
}
function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }

/**
 * ONE FRAME: the rig posed (posePuppet) and seen from `record` (0-4), drawn into a picture whose bottom row is the
 * floor the figure stands on and whose middle column is its centre line - so a billboard stood on its base at the feet
 * stands the figure where the body is. `{ width, height, rgba }`, top row first. Pure.
 */
export function renderDollFrame(rig, table, frame, record, { air = 0 } = {}) {
  if (!rig) return null;
  const pose = posePuppet(table, frame, { weaponSide: rig.weaponSide, offhand: rig.offhandItem, air, frames: framesOf(table) });
  const list = placeParts(rig, pose, record);
  // the picture's extent: every part's corners, about the centre line, down to the floor
  let half = 1, top = rig.yBot;
  for (const p of list) {
    const part = rig.parts[p.name];
    const [a, b, c, d, e, f] = p.affine;
    for (const [x, y] of [[part.x0, part.y0], [part.x0 + part.w, part.y0], [part.x0, part.y0 + part.h], [part.x0 + part.w, part.y0 + part.h]]) {
      const X = a * x + c * y + e, Y = b * x + d * y + f;
      half = Math.max(half, Math.abs(X - rig.cx) + 1);
      top = Math.min(top, Y);
    }
  }
  const hw = Math.ceil(half);
  const width = hw * 2, height = Math.max(1, Math.ceil(rig.yBot + 1 - Math.floor(top)));
  const ox = rig.cx - hw, oy = rig.yBot + 1 - height;   // the frame's top-left, in doll pixels
  const out = new Uint8Array(width * height * 4);
  for (const p of list) {
    const part = rig.parts[p.name];
    const src = p.back && p.name === 'head' && part.back ? part.back : part.rgba;
    const [a, b, c, d, e, f] = p.affine;
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-9) continue;
    const ia = d / det, ib = -b / det, ic = -c / det, id = a / det;
    // the part's box in the frame
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of [[part.x0, part.y0], [part.x0 + part.w, part.y0], [part.x0, part.y0 + part.h], [part.x0 + part.w, part.y0 + part.h]]) {
      const X = a * x + c * y + e, Y = b * x + d * y + f;
      x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
    }
    const fx0 = Math.max(0, Math.floor(x0 - ox)), fx1 = Math.min(width - 1, Math.ceil(x1 - ox));
    const fy0 = Math.max(0, Math.floor(y0 - oy)), fy1 = Math.min(height - 1, Math.ceil(y1 - oy));
    for (let fy = fy0; fy <= fy1; fy++) {
      for (let fx = fx0; fx <= fx1; fx++) {
        // the pixel's centre back into the doll: the inverse of the part's affine
        const X = fx + ox + 0.5 - e, Y = fy + oy + 0.5 - f;
        const sx = Math.floor(ia * X + ic * Y) - part.x0, sy = Math.floor(ib * X + id * Y) - part.y0;
        if (sx < 0 || sy < 0 || sx >= part.w || sy >= part.h) continue;
        const si = (sy * part.w + sx) * 4;
        const al = src[si + 3];
        if (!al) continue;
        const o = (fy * width + fx) * 4;
        if (al === 255) { out[o] = src[si]; out[o + 1] = src[si + 1]; out[o + 2] = src[si + 2]; out[o + 3] = 255; continue; }
        const k = al / 255;
        out[o] = src[si] * k + out[o] * (1 - k); out[o + 1] = src[si + 1] * k + out[o + 1] * (1 - k);
        out[o + 2] = src[si + 2] * k + out[o + 2] * (1 - k); out[o + 3] = Math.max(out[o + 3], al);
      }
    }
  }
  return { width, height, rgba: out };
}

/** The clip lengths the doll is drawn at - the body's own (eotbBillboard.js TABLE_FRAMES), so a frame the body asks for
 *  is a frame the doll has. Kept here as numbers so this module stays the body's leaf: test/dollskin1.test.js pins
 *  them equal to TABLE_FRAMES. */
export const DOLL_TABLE_FRAMES = Object.freeze({
  Idle: 1, Move: 4, Death: 2, IdleMelee: 1, MoveMelee: 2, AttackMelee: 6,
  IdleRanged: 1, MoveRanged: 2, AttackRanged: 4, IdleSpell: 2, MoveSpell: 2, AttackSpell: 4,
});
const framesOf = (table) => DOLL_TABLE_FRAMES[table] ?? 1;
