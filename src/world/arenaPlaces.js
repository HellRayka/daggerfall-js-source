// @ts-check
// ═══════════════════════════════════════════════════════════════════
// TESA1 (2026-10-12, bible/03-World/Arena-Provinces.md) - ARENA'S PLACES ON DAGGERFALL'S TAMRIEL.
//
// The owner: "I think I want to begin implementing Elder Scrolls arena into our world of tamriel" - Arena's map, our
// engine, read from the player's own ARENA folder. The Elder Scrolls: Arena laid out the whole continent: nine
// provinces, each with eight city-states, eight towns, sixteen villages, two staff dungeons and fourteen dungeons of
// its own (CITYDATA.65, formats/arenaCityData.js). This module stands them on the continent TAMRIEL1-4 drew.
//
// THE ONE GRID. Arena's world map is 320 x 200, and so is Daggerfall's picture of Tamriel (TMAP00I0 / TAMRIEL2): the
// race screen's map was drawn on Arena's. Measured on the freeware releases of both, Arena's nine province masks
// (TAMRIEL.MNU) lie on the picker's provinces at 82-97% overlap with no shift and no scale, and no shift or scale
// improves any of them by more than a pixel's worth - so an Arena world point IS a picture point, and the picture
// point is a Bay point by the frame's own fit (world/tamrielFrame.js pictureToBay).
//
// THE PROVINCE'S OWN FRAME. A place is stored on its province's own 320 x 200 map and projected onto the world by the
// province's rectangle (ArenaLocationUtils::getGlobalPoint). That projection is coarse - Skyrim's north-coast cities
// land in the Sea of Ghosts, Elsweyr's northern towns in Valenwood - because the province maps were not drawn to the
// rectangles' edges. So each province's places are FIT, as a cloud, onto its own land: one scale about the rectangle's
// centre and one offset (the Bay's own fit's shape, TAMRIEL4: no scale a side), searched over FIT_SCALES and
// FIT_SHIFTS. The most places on their land does not choose it alone - a cloud shrunk far enough stands them all on
// something - so of the fits within FIT_SPARE of the most, the one that moves them least wins: Arena's own rectangle,
// trusted until the land disagrees. What the cloud still leaves off its land is moved onto the nearest of it within
// SNAP_REACH; past that, the place is left off and counted. On the freeware data: 392 of 401 stood by the fit, 9
// snapped (3.3 picture pixels at most), none lost - ~90 ms once a trace. Summurset alone fits at the edge of the
// search (0.6): Arena spreads its places far wider than the picture draws its isles.
//
// ON THE TRACE ONLY. The one grid is the picture's: TAMRIEL1's authored shape was drawn from the lore map, not on
// Arena's grid, and with it the places stand nowhere (the authored cities stand, as before) - `?tamrieltrace=off`, or
// the few hundred milliseconds before the trace lands. PURE over the city data and the installed trace
// (world/tamrielLand.js); the bytes are read by the host (scenes/world.js) and the Arena card (ui/enhancedMenu.js).
// ═══════════════════════════════════════════════════════════════════
import { tamrielTrace, tamrielLandVersion, PROVINCE_OF_ID } from './tamrielLand.js';
import { PICTURE_W, PICTURE_H } from './tamrielFrame.js';

/** The cloud's scales about its province rectangle's centre. */
export const FIT_SCALES = Object.freeze(Array.from({ length: 11 }, (_, i) => (600 + i * 50) / 1000));   // 0.60 .. 1.10
/** The cloud's shifts, picture pixels, each axis. */
export const FIT_SHIFTS = Object.freeze(Array.from({ length: 25 }, (_, i) => -12 + i));   // -12 .. 12, a picture pixel apart
/** THE COUNT'S BIAS, HELD: a cloud shrunk far enough stands every place on some land, so the most places on their land
 *  is not the fit - of the fits standing at least that many less FIT_SPARE, the one that moves them least is. */
export const FIT_SPARE = 1;
/** How far, picture pixels, a place left off its land is moved onto it - past this it is left off. */
export const SNAP_REACH = 8;
/** A snapped place stands this far inside the pixel it was moved onto, so a fraction never reads the neighbour. */
export const SNAP_INSET = 0.1;

/** Arena's province order is the picker's race order (CreateCharRaceSelect's ids 1-8; the Imperial Province ninth):
 *  Arena's province p is the land module's PROVINCE_OF_ID[p + 1]. */
export const arenaProvinceKey = (p) => PROVINCE_OF_ID[p + 1] ?? null;

/** A location's world point in fractions - getGlobalPoint's ratio (formats/arenaCityData.js arenaGlobalPoint) without
 *  its truncation: a world-map pixel is 15 km, and the province map's own resolution is four times finer. */
export function arenaWorldPoint(loc, rect) {
  return { x: rect.x + (loc.x * rect.w) / 320, y: rect.y + (loc.y * rect.h) / 200 };
}

/** The land of one province on a trace, as a predicate over picture points - provinceKeyAt's own reading (the pixel
 *  under the point, nothing off the grid), over one mask made once a province so the fit's half a million asks are
 *  array reads.
 *  @param {import('./tamrielLand.js').TamrielTrace} trace @param {string} key */
export function provinceLand(trace, key) {
  const { w, h, land, province } = trace;
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) if (land[i] && PROVINCE_OF_ID[province[i]] === key) mask[i] = 1;
  return (x, y) => {
    const px = Math.floor(x), py = Math.floor(y);
    return px >= 0 && py >= 0 && px < w && py < h && mask[py * w + px] === 1;
  };
}

/**
 * THE CLOUD'S FIT for one province: { s, dx, dy, on, n } - the scale about (cx, cy) and the shift that, of every fit
 * standing at least the most of `pts` on the province's land (`own`, provinceLand's predicate) less FIT_SPARE, move
 * them least (the identity, on a tie with it).
 * @param {{x:number,y:number}[]} pts @param {(x:number,y:number)=>boolean} own @param {number} cx @param {number} cy
 */
export function fitProvinceCloud(pts, own, cx, cy, { scales = FIT_SCALES, shifts = FIT_SHIFTS, spare = FIT_SPARE } = {}) {
  const n = shifts.length;
  const ons = new Uint16Array(scales.length * n * n);   // every fit's count, in the order the second pass walks
  let most = 0, k = 0;
  for (const s of scales) {
    for (const dx of shifts) {
      for (const dy of shifts) {
        let on = 0;
        for (const p of pts) if (own(cx + (p.x - cx) * s + dx, cy + (p.y - cy) * s + dy)) on++;
        if (on > most) most = on;
        ons[k++] = on;
      }
    }
  }
  let best = { s: 1, dx: 0, dy: 0, on: 0, move: Infinity };
  k = 0;
  for (const s of scales) {
    for (const dx of shifts) {
      for (const dy of shifts) {
        const on = ons[k++];
        if (on < most - spare) continue;
        let move = 0;
        for (const p of pts) move += Math.hypot((p.x - cx) * (s - 1) + dx, (p.y - cy) * (s - 1) + dy);
        move /= Math.max(1, pts.length);
        if (move < best.move - 1e-9) best = { s, dx, dy, on, move };
      }
    }
  }
  return { s: best.s, dx: best.dx, dy: best.dy, on: best.on, n: pts.length };
}

/** A point left off its province's land (`own`), onto the nearest of it within SNAP_REACH - the point clamped into the
 *  nearest pixel of the province, SNAP_INSET inside its edges - or null. */
export function snapToProvince(x, y, own, reach = SNAP_REACH) {
  if (own(x, y)) return { x, y, d: 0 };
  let best = null, bd = reach + 1e-9;
  const x0 = Math.max(0, Math.floor(x - reach)), x1 = Math.min(PICTURE_W - 1, Math.floor(x + reach));
  const y0 = Math.max(0, Math.floor(y - reach)), y1 = Math.min(PICTURE_H - 1, Math.floor(y + reach));
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const qx = Math.min(Math.max(x, px + SNAP_INSET), px + 1 - SNAP_INSET);
      const qy = Math.min(Math.max(y, py + SNAP_INSET), py + 1 - SNAP_INSET);
      const d = Math.hypot(qx - x, qy - y);
      if (d >= bd || !own(qx, qy)) continue;
      bd = d; best = { x: qx, y: qy, d };
    }
  }
  return best;
}

/**
 * THE MODEL: every placed location of the city data on a trace's picture grid. A slot whose point is (0, 0) is empty
 * (the Imperial Province's, CityDataFile.h) and is not a place. Answers { provinces, places, lost } - a place
 * { province, provinceIndex, id, kind, name, px, py, snapped } (`snapped` the picture pixels it was moved after the
 * fit), `lost` the places no land took.
 * @param {ReturnType<typeof import('../formats/arenaCityData.js').parseArenaCityData>} cityData
 * @param {import('./tamrielLand.js').TamrielTrace | null} trace
 */
export function placeArenaLocations(cityData, trace) {
  const provinces = [], places = [], lost = [];
  if (!cityData || !trace) return { provinces, places, lost };
  for (const prov of cityData.provinces) {
    const key = arenaProvinceKey(prov.index);
    if (!key) continue;
    const locs = prov.locations.filter((l) => l.x || l.y);
    const pts = locs.map((l) => arenaWorldPoint(l, prov.rect));
    const cx = prov.rect.x + prov.rect.w / 2, cy = prov.rect.y + prov.rect.h / 2;
    const own = provinceLand(trace, key);
    const fit = fitProvinceCloud(pts, own, cx, cy);
    provinces.push({ index: prov.index, key, name: prov.name, fit });
    locs.forEach((l, i) => {
      const x = cx + (pts[i].x - cx) * fit.s + fit.dx, y = cy + (pts[i].y - cy) * fit.s + fit.dy;
      const at = snapToProvince(x, y, own);
      const place = { province: key, provinceIndex: prov.index, id: l.id, kind: l.kind, name: l.name };
      if (!at) { lost.push({ ...place, px: x, py: y }); return; }
      places.push({ ...place, px: at.x, py: at.y, snapped: at.d });
    });
  }
  return { provinces, places, lost };
}

// ── THE INSTALLED SET ───────────────────────────────────────────

let _cityData = null;
let _version = 0;
let _model = null;   // { land, model }

/** Install the parsed city data (or null: none - TAMRIEL1's authored cities again). */
export function setArenaCityData(cityData) {
  _cityData = cityData && Array.isArray(cityData.provinces) ? cityData : null;
  _model = null;
  _version++;
}
export const arenaCityData = () => _cityData;
/** Moves on every install - the ink and the held map's static key read it beside the land's. */
export const arenaPlacesVersion = () => _version;

/** The installed set's model on the trace as it stands now (rebuilt when the land module's version moves - the trace
 *  lands after the boot), or null: nothing installed, or no trace to stand it on. */
export function arenaPlaces() {
  const trace = tamrielTrace();
  if (!_cityData || !trace) return null;
  const land = tamrielLandVersion();
  if (!_model || _model.land !== land) _model = { land, model: placeArenaLocations(_cityData, trace) };
  return _model.model;
}
