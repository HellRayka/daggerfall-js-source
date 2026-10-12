// DOLL-SKIN (2026-10-11, the owner: "allowing the user to use their paperdoll instead of the eye of the Beholder skin
// system"): THE PAPERDOLL AS A SKIN - Graphics.OnFoot's last set, past the mod's sixteen and Daggerfall's classes. The
// body and the peers' walkers ask `spriteFor` for a frame as they ask it for any set's; for this one it answers a
// frame of the wearer's own doll, posed and turned by the puppet (characters/dollPuppet.js), and the frame is drawn
// here when the art store asks to decode it.
//
// THE DOLLS. One for the player (their own entity, composed through the compositor's own deps - ui/paperDoll.js
// paperDollDeps - as the inventory composes it), and one for each other player wearing it (their look's recipe, composed
// on this machine from this player's ARENA2 - the look travels, never a picture: Online-Arc's law). Each doll is a SLOT
// with its own texture archive (DOLL_ARCHIVE + slot) and a GENERATION that moves when its gear does; a frame's key and
// record carry both, so a new outfit is new textures, and the old generation's are let go a moment after the new one
// is asked for (`onDollRetired` - the art stores evict them: EVERY ALLOCATION HAS AN OWNER).
//
// THE FRAMES. Drawn on demand, a few a task (DOLL_FRAMES_A_TASK), so a whole set's preload (the body fetches every
// table at once, as the mod does) never stalls a frame. Each is turned to the world's rows (bottom first) for the
// billboard, as every sprite on this path is (eotbSprite.js worldOrderColors). Nothing is written anywhere but the
// renderer: the frames are the player's game data (Port-Doctrine "A RENDER OF GAME DATA IS GAME DATA").

import { buildDollRig, renderDollFrame } from '../characters/dollPuppet.js';
import { stateFor } from './eotbBillboard.js';
import { toColor32 } from '../formats/color32Order.js';
import { FOOT_SKIN_COUNT } from './classSkins.js';
import { equipTableOf } from '../systems/equip.js';
import { LOOK_ITEM_FIELDS } from '../net/wire.js';

/** Graphics.OnFoot's index for the paperdoll - the set after every on-foot skin the build carries. */
export const PAPERDOLL_SKIN = FOOT_SKIN_COUNT;
/** The dolls' texture archives: the player's own, then each other wearer's slot after it. */
export const DOLL_ARCHIVE = 905000;
/** How many other players' dolls are kept at once - the least recently drawn goes first. */
export const DOLL_PEER_SLOTS = 12;
/** A figure this many doll pixels tall stands as tall as Eye Of The Beholder's own (its idle sets are ~100 px at its
 *  0.019 m a pixel - eotbSprite.js SIZE_ON_FOOT): the doll's frames are drawn at the doll's own pixels and sized by
 *  this, so a doll of any race stands at a man's height. */
export const DOLL_FIGURE_PX = 100;
/** Frames drawn a task, at most. */
export const DOLL_FRAMES_A_TASK = 6;
/** How long an outgrown generation's textures are kept after its successor is first asked for (ms) - long enough for
 *  the new frames to come up, so the figure never goes blank between two outfits. */
export const DOLL_RETIRE_MS = 3000;
/** How often the player's gear is looked at for a change (ms). */
export const DOLL_RECIPE_MS = 500;
/** A doll that could not be composed (no ARENA2 art yet, a record missing) is asked again after this (ms). */
export const DOLL_RETRY_MS = 5000;

const KEY_PREFIX = 'doll:';
export const isDollArchive = (a) => Number.isInteger(a) && a >= DOLL_ARCHIVE && a <= DOLL_ARCHIVE + DOLL_PEER_SLOTS;
export const isDollKey = (k) => typeof k === 'string' && k.startsWith(KEY_PREFIX);

// ── the slots ────────────────────────────────────────────────────────────────────────────────────────────────────
/** archive -> { archive, gen, rig, scale, recipe, composing, used } */
const slots = new Map();
const retired = new Set();
let clock = () => Date.now();
let later = (fn, ms) => setTimeout(fn, ms);
let composer = null;   // (entity) -> Promise<labelled composite | null>; the compositor's by default (defaultComposer)
let peerEntity = null; // (look) -> entity; the peers' stand-in (net/remotePlayers.js peerStubEntity), handed in

/** The compositor, asked lazily (it is the UI's module, and this one is on every sprite's path): the doll composed with
 *  its labels and no backdrop, through the deps the hosts preloaded the player's art with. Null without them. */
async function defaultComposer(entity) {
  const pd = await import('../ui/paperDoll.js');
  const deps = pd.paperDollDeps();
  if (!deps) return null;
  return pd.composePaperDollPixels(deps, entity, { background: false, labels: true });
}

/** What a doll is drawn from - its identity and its worn items, as the look's recipe names them (wire.js). */
export function dollRecipe(entity) {
  if (!entity) return null;
  const table = equipTableOf(entity);
  const items = [];
  for (let slot = 0; slot < table.length; slot++) {
    const it = table[slot];
    if (!it) continue;
    items.push([slot, ...LOOK_ITEM_FIELDS.map((k) => it[k] ?? null)]);
  }
  return JSON.stringify([entity.race ?? 'Breton', entity.gender ?? 'male', entity.faceIndex ?? 0, items]);
}

/** Compose a slot's doll for `entity` under `recipe`; the slot takes a new generation when it lands. */
function compose(slot, entity, recipe) {
  slot.composing = recipe;
  const run = (composer ?? defaultComposer)(entity);
  Promise.resolve(run).then((doll) => {
    if (slot.composing !== recipe) return;   // a newer outfit overtook this one: its own compose lands instead
    slot.composing = null;
    const rig = doll ? buildDollRig(doll) : null;
    slot.recipe = recipe;
    if (!rig) { slot.failedAt = clock(); return; }   // the last doll that stood stands on
    const was = slot.gen;
    slot.gen = was + 1;
    slot.rig = rig;
    slot.scale = rig.figureHeight / DOLL_FIGURE_PX;
    slot.failedAt = 0;
    if (was > 0) retire(slot.archive, was);
  }, () => { if (slot.composing === recipe) { slot.composing = null; slot.recipe = recipe; slot.failedAt = clock(); } });
}

/** A slot's generation outgrown: told to every art store (they let its textures go) a moment from now. */
const listeners = new Set();
function retire(archive, gen) {
  const k = `${archive}:${gen}`;
  if (retired.has(k)) return;
  retired.add(k);
  later(() => { for (const fn of [...listeners]) { try { fn(archive, gen); } catch (e) { console.warn('[doll-skin] a retire listener threw:', e?.message ?? e); } } }, DOLL_RETIRE_MS);
}
/** Hear a generation retired: `fn(archive, gen)`. Returns the unsubscribe. */
export function onDollRetired(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
/** A retired generation's textures, as an art store keys them: `archive:rec`, whose record ends `g<gen>`. */
export const isRetiredTex = (texKey, archive, gen) => texKey.startsWith(`${archive}:`) && texKey.endsWith(`g${gen}`);
/** A retired generation's frame keys, as an art store keys its decodes. */
export const isRetiredKey = (key, archive, gen) => key.startsWith(`${KEY_PREFIX}${archive}:${gen}:`);

const handle = (s) => (s?.rig ? { archive: s.archive, gen: s.gen } : null);

/** THE PLAYER'S DOLL: `{ archive, gen }` once one is composed, else null - recomposed when their gear changes (looked
 *  at every DOLL_RECIPE_MS). The last doll stands until the next lands. */
export function localDoll(entity) {
  let s = slots.get(DOLL_ARCHIVE);
  if (!s) { s = { archive: DOLL_ARCHIVE, gen: 0, rig: null, scale: 1, recipe: null, composing: null, used: 0, checked: -Infinity, failedAt: 0 }; slots.set(DOLL_ARCHIVE, s); }
  const now = clock();
  if (entity && now - s.checked >= DOLL_RECIPE_MS) {
    s.checked = now;
    const recipe = dollRecipe(entity);
    // settled: this outfit is the one drawn, or it failed a moment ago (no art yet) and is not asked again until later
    const settled = recipe === s.recipe && (s.rig ? !s.failedAt : now - s.failedAt <= DOLL_RETRY_MS);
    if (!settled && recipe !== s.composing) compose(s, entity, recipe);
  }
  return handle(s);
}

/** ANOTHER PLAYER'S DOLL, off their look: `{ archive, gen }` once composed, else null (and the compose asked for). The
 *  stand-in entity is the peers' own (`setDollPeerEntity`). */
export function peerDoll(look) {
  if (!look || !peerEntity) return null;
  const recipe = JSON.stringify([look.race ?? 'Breton', look.gender ?? 'male', look.faceIndex ?? 0, (look.items ?? []).map((it) => [it?.equipSlot ?? null, ...LOOK_ITEM_FIELDS.map((k) => it?.[k] ?? null)])]);
  let s = null;
  for (const x of slots.values()) if (x.archive !== DOLL_ARCHIVE && (x.recipe === recipe || x.composing === recipe)) { s = x; break; }
  if (!s) {
    let archive = null;
    for (let i = 1; i <= DOLL_PEER_SLOTS; i++) if (!slots.has(DOLL_ARCHIVE + i)) { archive = DOLL_ARCHIVE + i; break; }
    if (archive === null) {
      // the least recently drawn other player's doll goes
      const old = [...slots.values()].filter((x) => x.archive !== DOLL_ARCHIVE).sort((a, b) => a.used - b.used)[0];
      archive = old.archive;
      slots.delete(archive);
      if (old.gen > 0) retire(archive, old.gen);
      s = { archive, gen: old.gen, rig: null, scale: 1, recipe: null, composing: null, used: 0, failedAt: 0 };
    } else s = { archive, gen: 0, rig: null, scale: 1, recipe: null, composing: null, used: 0, failedAt: 0 };
    slots.set(archive, s);
    compose(s, peerEntity(look), recipe);
  } else if (s.failedAt && !s.rig && clock() - s.failedAt > DOLL_RETRY_MS && !s.composing) compose(s, peerEntity(look), recipe);
  s.used = clock();
  return handle(s);
}

/** The peers' stand-in entity off a look (net/remotePlayers.js peerStubEntity) - handed in by the walkers' layer, so
 *  this module never reaches into the network's. */
export function setDollPeerEntity(fn) { peerEntity = typeof fn === 'function' ? fn : null; }

/** A doll's metres-a-pixel scale (eotbSprite.js spriteOffset's `scale`): its figure stands DOLL_FIGURE_PX tall. */
export const dollScale = (archive) => slots.get(archive)?.scale ?? 1;

// ── the sprite ───────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A doll's sprite for one table, orientation and frame - the shape eotbSprite.js `spriteFor` answers: the wheel's
 * record and mirror (the doll is drawn at the wheel's five records and mirrored for the other three, as every set is),
 * a frame key the decode door knows, and a record that carries the generation (and the jump, `air` 1 or 2).
 */
export function dollSprite(table, orientation, frame, doll, { flip = false, air = 0 } = {}) {
  const st = stateFor(table, orientation);
  if (!st || !doll) return null;
  const view = st.record - stateFor(table, 0).record;
  const mirror = st.mirror !== !!flip;
  const a = air === 1 || air === 2 ? air : 0;
  return {
    archive: doll.archive,
    record: view,
    frame,
    mirror,
    key: `${KEY_PREFIX}${doll.archive}:${doll.gen}:${table}:${view}:${frame}:${a}`,
    rec: `${table}.${view}-${frame}${mirror ? 'm' : ''}${a ? `j${a}` : ''}g${doll.gen}`,
  };
}

// ── the frames ───────────────────────────────────────────────────────────────────────────────────────────────────
const queue = [];
let pumping = false;
function pump() {
  pumping = false;
  for (let n = 0; n < DOLL_FRAMES_A_TASK && queue.length; n++) {
    const job = queue.shift();
    try { job.resolve(drawFrame(job.key)); } catch (e) { job.reject(e); }
  }
  if (queue.length && !pumping) { pumping = true; later(pump, 0); }
}
/** One frame drawn now, in the world's rows - or a throw for a key whose doll or generation is gone. */
export function drawFrame(key) {
  const [archive, gen, table, view, frame, air] = key.slice(KEY_PREFIX.length).split(':');
  const s = slots.get(Number(archive));
  if (!s?.rig || s.gen !== Number(gen)) throw new Error(`${key}: no such doll`);
  const img = renderDollFrame(s.rig, table, Number(frame), Number(view), { air: Number(air) });
  if (!img) throw new Error(`${key}: nothing to draw`);
  const { width, height, colors } = toColor32({ width: img.width, height: img.height, data: img.rgba });
  return { width, height, colors: new Uint32Array(colors.buffer, colors.byteOffset, colors.byteLength / 4) };
}
/** THE DECODE DOOR for a doll's frame key (eotbBody.js decodeSprite, peerRiders.js decodeUrl): its pixels, drawn a few a
 *  task. */
export function dollFramePixels(key) {
  return new Promise((resolve, reject) => {
    queue.push({ key, resolve, reject });
    if (!pumping) { pumping = true; later(pump, 0); }
  });
}

/** THE SKIN CARD'S PICTURE: the player's doll standing front-on, `{ width, height, rgba }` (top row first), or null
 *  before one is composed. */
export function dollPreview() {
  const s = slots.get(DOLL_ARCHIVE);
  return s?.rig ? renderDollFrame(s.rig, 'Idle', 0, 0) : null;
}

/** Test seams: the composer, the clock and the timer; and every slot forgotten. */
export function _setDollSkinSeamsForTests({ compose = null, now = null, after = null } = {}) {
  composer = compose; if (now) clock = now; if (after) later = after;
}
export function _resetDollSkinForTests() {
  slots.clear(); retired.clear(); queue.length = 0; pumping = false; listeners.clear();
  composer = null; peerEntity = null; clock = () => Date.now(); later = (fn, ms) => setTimeout(fn, ms);
}
export const _dollSlotsForTests = () => [...slots.values()].map((s) => ({ archive: s.archive, gen: s.gen, rig: !!s.rig, recipe: s.recipe, composing: s.composing }));
