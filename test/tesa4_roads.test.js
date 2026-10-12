// TESA4 (2026-10-12, the owner: "Continue"; bible/03-World/Arena-Provinces.md TESA4) - ROADS BETWEEN ARENA'S PLACES,
// pinned. The port's own road law (world/roadNetwork.js) runs on a window laid over Arena's places past the Bay, its steps
// drawn back onto the Bay pixels (world/arenaRoads.js); the grade is the clone's (world/arenaLocations.js arenaRoadTowns);
// the terrain worker builds the layer (terrainGenWorker.js answerArenaRoads), the client asks the roads' cache and
// installs this thread's copy (terrainGenClient.js setArenaRoads), the painter and the verge read it off the Bay
// (terrainGen.js, roadVerge.js roadRoom), and the world host paints a built pixel again when a layer lands.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  ARENA_ROAD_MARGIN, ARENA_ROADS_VERSION, arenaRoadWindow, windowCell, cellCentre, buildArenaNetwork, rasterArenaRoads,
  beyondKey, arenaRoadsKey, setArenaRoads, arenaRoadsLayer, arenaRoadsVersion, layerByte, arenaRoadByte, arenaRoadCorners,
  arenaPathsAt, layerTouches, packArenaRoads, unpackArenaRoads,
} from '../src/world/arenaRoads.js';
import { arenaRoadTowns } from '../src/world/arenaLocations.js';
import { MAP_W, MAP_H, DIR, ROAD_TYPES, TRACK_TYPES, ROAD_DIALS } from '../src/world/roadNetwork.js';
import { GENERATOR_VERSION } from '../src/world/roadsCache.js';
import { LOCATION_TYPES } from '../src/formats/mapsFile.js';
import { MAP_WIDTH, MAP_HEIGHT } from '../src/formats/woodsFile.js';
import { generatePixelTerrain } from '../src/world/terrainGen.js';
import { roadRoom } from '../src/world/roadVerge.js';
import { TerrainGenClient } from '../src/world/terrainGenClient.js';
import { setTamrielFit, inBay } from '../src/world/tamrielFrame.js';
import { setTamrielTrace } from '../src/world/tamrielLand.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
afterEach(() => { setArenaRoads(null); setTamrielFit(null); setTamrielTrace(null); });

const { TownCity, TownHamlet, TownVillage } = LOCATION_TYPES;
const keyXY = (k) => [(k % 65536) - 32768, Math.floor(k / 65536) - 32768];
const OPP = { [DIR.N]: DIR.S, [DIR.NE]: DIR.SW, [DIR.E]: DIR.W, [DIR.SE]: DIR.NW, [DIR.S]: DIR.N, [DIR.SW]: DIR.NE, [DIR.W]: DIR.E, [DIR.NW]: DIR.SE };
const STEP = { [DIR.N]: [0, -1], [DIR.NE]: [1, -1], [DIR.E]: [1, 0], [DIR.SE]: [1, 1], [DIR.S]: [0, 1], [DIR.SW]: [-1, 1], [DIR.W]: [-1, 0], [DIR.NW]: [-1, -1] };
/** Every bit's step lands on a pixel carrying the opposite bit. */
function symmetric(map) {
  for (const [k, v] of map) {
    const [x, y] = keyXY(k);
    for (const bit of Object.keys(STEP).map(Number)) if (v & bit) {
      const [dx, dy] = STEP[bit];
      const n = map.get(beyondKey(x + dx, y + dy));
      if (!(n & OPP[bit]) && !inBay(x + dx, y + dy)) return `(${x}, ${y}) bit ${bit} unanswered`;
    }
  }
  return null;
}
/** Does the layer walk from one pixel to another along its bits? */
function walks(map, [ax, ay], [bx, by]) {
  const seen = new Set([beyondKey(ax, ay)]), stack = [[ax, ay]];
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x === bx && y === by) return true;
    const v = map.get(beyondKey(x, y)) ?? 0;
    for (const bit of Object.keys(STEP).map(Number)) if (v & bit) {
      const [dx, dy] = STEP[bit], k = beyondKey(x + dx, y + dy);
      if (!seen.has(k)) { seen.add(k); stack.push([x + dx, y + dy]); }
    }
  }
  return false;
}
const flat = (h) => ({ heightAt: () => h, isWater: () => false });

test('TESA4 the grade, the clone\'s: a city-state and a town are road nodes, a village a track node, a dungeon none, each at its own pixel; none stood is none (mutant: a grade, the type read)', () => {
  const pixels = { stood: [
    { kind: 'city-state', bx: 10, by: -5 }, { kind: 'town', bx: 20, by: -6 }, { kind: 'village', bx: 30, by: -7 },
    { kind: 'staff-dungeon', bx: 40, by: -8 }, { kind: 'map-dungeon', bx: 50, by: -9 }, { kind: 'dungeon', bx: 60, by: -10 },
  ] };
  assert.deepEqual(arenaRoadTowns(pixels), [{ x: 10, y: -5, type: TownCity }, { x: 20, y: -6, type: TownHamlet }, { x: 30, y: -7, type: TownVillage }]);
  assert.ok(ROAD_TYPES.has(TownCity) && ROAD_TYPES.has(TownHamlet) && TRACK_TYPES.has(TownVillage), 'the network\'s own grades');
  assert.equal(arenaRoadTowns(null), null);
  assert.equal(arenaRoadTowns({ stood: [{ kind: 'staff-dungeon', bx: 1, by: -1 }] }), null, 'a dungeon has no road: none to build');
});

test('TESA4 the window: the towns\' extent and ARENA_ROAD_MARGIN round it, at the least integer scale that fits the builder\'s 1000 x 500 - every town in a cell of it; a cell\'s centre and a pixel\'s cell (mutant: the margin, the extent\'s last pixel, the scale)', () => {
  assert.equal(ARENA_ROAD_MARGIN, 40);
  assert.deepEqual(arenaRoadWindow([{ x: 0, y: -1000 }, { x: 2900, y: -100 }]), { x0: -40, y0: -1040, s: 3 });
  assert.deepEqual(arenaRoadWindow([{ x: 5, y: -5 }]), { x0: -35, y0: -45, s: 1 });
  // the last pixel counts: 0..2000 is 2001 pixels wide, three to a cell - at two the town at 2000 falls off the grid
  const w = arenaRoadWindow([{ x: 0, y: 0 }, { x: 2000, y: 0 }], 0);
  assert.deepEqual(w, { x0: 0, y0: 0, s: 3 });
  for (const t of [[0, 0], [2000, 0]]) { const [u, v] = windowCell(w, ...t); assert.ok(u >= 0 && u < MAP_W && v >= 0 && v < MAP_H, `${t} in the grid`); }
  assert.deepEqual(arenaRoadWindow([{ x: 0, y: 0 }, { x: 0, y: 1500 }], 0), { x0: 0, y0: 0, s: 4 }, 'the taller way decides');
  assert.equal(arenaRoadWindow(null), null);
  assert.equal(arenaRoadWindow([]), null);
  const win = { x0: -100, y0: -100, s: 5 };
  assert.deepEqual(windowCell(win, -86, -90), [2, 2]);
  assert.deepEqual(windowCell(win, -101, -100), [-1, 0]);
  assert.deepEqual(cellCentre(win, 2, 2), [-88, -88]);
  assert.deepEqual(cellCentre({ x0: 0, y0: 0, s: 1 }, 7, 3), [7, 3]);
});

test('TESA4 the drawing: each cell\'s step drawn once (east, south-east, south and south-west), centre to centre, both ends of every pixel step carrying it; a town joined to its cell\'s centre in the grade its cell carries; no pixel of the Bay (mutant: the forward four, an end\'s bit, the spur, the Bay)', () => {
  const win = { x0: -100, y0: -100, s: 5 };
  const roads = new Uint8Array(MAP_W * MAP_H), tracks = new Uint8Array(MAP_W * MAP_H);
  roads[2 * MAP_W + 2] = DIR.E;
  roads[2 * MAP_W + 3] = DIR.W | DIR.SE;
  roads[3 * MAP_W + 4] = DIR.NW;
  const layer = rasterArenaRoads({ roads, tracks }, win, [{ x: -86, y: -90 }]);
  const want = new Map([
    [beyondKey(-88, -88), DIR.E | DIR.NE], [beyondKey(-87, -88), DIR.E | DIR.W], [beyondKey(-86, -88), DIR.E | DIR.W],
    [beyondKey(-85, -88), DIR.E | DIR.W], [beyondKey(-84, -88), DIR.E | DIR.W], [beyondKey(-83, -88), DIR.W | DIR.SE],
    [beyondKey(-82, -87), DIR.NW | DIR.SE], [beyondKey(-81, -86), DIR.NW | DIR.SE], [beyondKey(-80, -85), DIR.NW | DIR.SE],
    [beyondKey(-79, -84), DIR.NW | DIR.SE], [beyondKey(-78, -83), DIR.NW],
    [beyondKey(-87, -89), DIR.SW | DIR.NE], [beyondKey(-86, -90), DIR.SW],   // the town's own pixel, to its cell's centre
  ]);
  assert.deepEqual(new Map([...layer.roads].sort((a, b) => a[0] - b[0])), new Map([...want].sort((a, b) => a[0] - b[0])));
  assert.equal(layer.tracks.size, 0, 'no track in its cell: no track spur');
  assert.equal(symmetric(layer.roads), null);
  // a run into the Bay keeps its pixels off it, the last one past it pointing in
  const r2 = new Uint8Array(MAP_W * MAP_H); r2[1 * MAP_W + 1] = DIR.SE; r2[2 * MAP_W + 2] = DIR.NW;
  const edge = rasterArenaRoads({ roads: r2, tracks: new Uint8Array(MAP_W * MAP_H) }, { x0: -10, y0: -10, s: 5 }, []);
  assert.deepEqual([...edge.roads.keys()].map(keyXY).sort((a, b) => a[0] - b[0]), [[-3, -3], [-2, -2], [-1, -1]]);
  assert.equal(edge.roads.get(beyondKey(-1, -1)), DIR.NW | DIR.SE);
});

test('TESA4 the network: two towns past the Bay joined by the Bay\'s own law at the window\'s scale; a town\'s pixel walks to the other\'s; the Bay\'s own cells are water to it - two towns either side of the Bay, the window no wider than they are, stay apart (mutant: the Bay as water, the ground read at the centre)', () => {
  const towns = [{ x: 100, y: -300, type: TownCity }, { x: 2500, y: -300, type: TownCity }];
  const window = arenaRoadWindow(towns);
  assert.equal(window.s, 3);
  const net = buildArenaNetwork({ towns, window, ...flat(30) });
  assert.equal(net.stats.unrouted, 0);
  const layer = rasterArenaRoads(net, window, towns);
  assert.ok(walks(layer.roads, [100, -300], [2500, -300]), 'the road runs town to town');
  assert.equal(symmetric(layer.roads), null);
  // either side of the Bay
  const apart = [{ x: -300, y: 250, type: TownCity }, { x: 1300, y: 250, type: TownCity }];
  const w2 = arenaRoadWindow(apart);
  const n2 = buildArenaNetwork({ towns: apart, window: w2, ...flat(30) });
  assert.equal(n2.stats.unrouted, 1, 'the Bay is in the way');
  assert.equal(rasterArenaRoads(n2, w2, apart).roads.size, 0);
  // the ground at each cell's centre: a wall of water down the window's middle, one cell wide, splits it
  const wall = (x) => Math.floor((x - window.x0) / window.s) === 400;
  const n3 = buildArenaNetwork({ towns, window, heightAt: (x) => (wall(x) ? 0 : 30), isWater: (_x, _y, h) => h <= 5 });
  assert.equal(n3.stats.unrouted, 1, 'the water the centre stands on');
  // two towns in one cell: the first is its node
  const twin = [{ x: 100, y: -300, type: TownCity }, { x: 101, y: -300, type: TownVillage }, { x: 2500, y: -300, type: TownCity }];
  const n4 = buildArenaNetwork({ towns: twin, window: arenaRoadWindow(twin), ...flat(30) });
  assert.equal(n4.stats.roadNodes, 2);
  assert.equal(n4.stats.trackNodes, 0, 'the village shares the city\'s cell');
});

test('TESA4 the layer installed: a pixel\'s byte by its key, its corners as the mod\'s (the east neighbour\'s SW|NW, the west\'s NE|SE), roads and tracks together, a touch on the pixel or the two beside it, the version on every install; packed and back whole (mutant: a corner, the touch\'s reach, the version)', () => {
  assert.notEqual(beyondKey(-1, 0), beyondKey(0, -1));
  assert.deepEqual(keyXY(beyondKey(-32768, 32767)), [-32768, 32767]);
  const layer = { roads: new Map([[beyondKey(5, -3), DIR.E | DIR.W], [beyondKey(6, -3), DIR.SW | DIR.NW | DIR.SE]]), tracks: new Map([[beyondKey(4, -3), DIR.NE | DIR.SE | DIR.N]]) };
  const v = arenaRoadsVersion();
  setArenaRoads(layer);
  assert.equal(arenaRoadsVersion(), v + 1);
  assert.equal(arenaRoadsLayer(), layer);
  assert.equal(arenaRoadByte('roads', 5, -3), DIR.E | DIR.W);
  assert.equal(arenaRoadByte('roads', 5, -2), 0);
  assert.equal(arenaRoadCorners('roads', 5, -3), DIR.SW | DIR.NW, 'the east neighbour\'s SW|NW, never its SE');
  assert.equal(arenaRoadCorners('tracks', 5, -3), DIR.NE | DIR.SE, 'the west neighbour\'s NE|SE, never its N');
  assert.equal(arenaPathsAt(4, -3), DIR.NE | DIR.SE | DIR.N);
  assert.equal(arenaPathsAt(5, -3), DIR.E | DIR.W);
  assert.equal(layerByte(layer, 'tracks', 4, -3), DIR.NE | DIR.SE | DIR.N);
  assert.equal(layerByte(null, 'roads', 5, -3), 0);
  assert.ok(layerTouches(layer, 3, -3) && layerTouches(layer, 7, -3) && layerTouches(layer, 5, -3));
  assert.ok(!layerTouches(layer, 2, -3) && !layerTouches(layer, 8, -3) && !layerTouches(layer, 5, -2) && !layerTouches(layer, 5, -4), 'its row alone - the corners read east and west');
  assert.ok(!layerTouches(null, 5, -3));
  setArenaRoads(null);
  assert.equal(arenaRoadByte('roads', 5, -3), 0);
  assert.equal(arenaRoadsVersion(), v + 2);
  const packed = packArenaRoads(layer);
  assert.ok(packed.keys instanceof Float64Array && packed.keys.length === 3);
  assert.deepEqual(unpackArenaRoads(packed), layer);
});

test('TESA4 the cache\'s key: the generator\'s version and dials, the layer\'s version, the towns, the window, the heightmap\'s length, the fit and the trace\'s land - the installed fit and trace unless given (mutant: a term dropped)', () => {
  const towns = [{ x: 100, y: -300, type: TownCity }, { x: 300, y: -300, type: TownVillage }];
  const window = { x0: 60, y0: -340, s: 1 };
  const trace = { land: Uint8Array.of(0, 1, 1), province: Uint8Array.of(0, 3, 4) };
  const fit = { ox: 589, oy: 883.5, ppu: 15.5 };
  const base = { towns, window, woodsLength: 1000, fit, trace };
  const k = arenaRoadsKey(base);
  assert.ok(k.startsWith(`arena-roads:v${ARENA_ROADS_VERSION}:g${GENERATOR_VERSION}:2:`));
  assert.ok(k.endsWith(JSON.stringify(ROAD_DIALS)));
  for (const [what, o] of [
    ['a town moved', { towns: [{ ...towns[0], x: 101 }, towns[1]] }], ['a grade', { towns: [towns[0], { ...towns[1], type: TownHamlet }] }],
    ['a town more', { towns: [...towns, { x: 5, y: -5, type: TownCity }] }], ['the window', { window: { ...window, s: 2 } }],
    ['the heightmap', { woodsLength: 1001 }], ['the fit', { fit: { ...fit, ppu: 15.75 } }], ['no fit', { fit: null }],
    ['the trace\'s land', { trace: { land: Uint8Array.of(1, 1, 1), province: trace.province } }],
    ['its provinces', { trace: { land: trace.land, province: Uint8Array.of(0, 3, 5) } }], ['no trace', { trace: null }],
  ]) assert.notEqual(arenaRoadsKey({ ...base, ...o }), k, what);
  setTamrielFit(fit);
  setTamrielTrace({ w: 3, h: 1, land: trace.land, province: trace.province });
  assert.equal(arenaRoadsKey({ towns, window, woodsLength: 1000 }), k, 'the installed ones');
});

/** A WoodsFile's reads over a flat buffer (test/roadbeyond.test.js FlatWoods): land everywhere. */
class FlatWoods {
  constructor(v) { this.heightMapBuffer = new Uint8Array(MAP_WIDTH * MAP_HEIGHT).fill(v); this._bytes = new Uint8Array(77); }
  getHeightMapValue(x, y) {
    if (x < 0) x = 0; if (x >= MAP_WIDTH - 1) x = MAP_WIDTH - 1; if (y < 0) y = 0; if (y >= MAP_HEIGHT - 1) y = MAP_HEIGHT - 1;
    return this.heightMapBuffer[y * MAP_WIDTH + x];
  }
  getHeightMapValuesRange1Dim(x0, y0, dim) {
    const d = new Uint8Array(dim * dim);
    for (let y = 0; y < dim; y++) for (let x = 0; x < dim; x++) d[x + y * dim] = this.getHeightMapValue(x0 + x, y0 + y);
    return d;
  }
  getLargeMapData() { const d = []; for (let i = 0; i < 5; i++) d.push(new Uint8Array(5).fill(3)); return d; }
  getLargeHeightMapValuesRange(x0, y0, dim) {
    const side = dim * 3, dst = new Uint8Array(side * side);
    for (let y = 0; y < dim; y++) for (let x = 0; x < dim; x++) {
      const src = this.getLargeMapData(x0 + x, y0 - y);
      for (let iy = 1; iy < 4; iy++) for (let ix = 1; ix < 4; ix++) dst[(y * 3 + iy - 1) * side + (x * 3 + ix - 1)] = src[ix][4 - iy];
    }
    return dst;
  }
}
const bayNet = () => ({ roads: new Uint8Array(MAP_W * MAP_H), tracks: new Uint8Array(MAP_W * MAP_H), water: false, smooth: false });
const kernel = (woods, px, py, roads = bayNet()) => generatePixelTerrain({ woods, px, py, stride: 1, tilemap: new Uint8Array(128 * 128), locationRect: null, hasLocation: false, climateType: 302, roads });
const painted = (o) => o.paths.reduce((n, b) => n + (b ? 1 : 0), 0);

test('TESA4 the painter: past the Bay - east, west, north and south of it - a pixel paints its Arena road, its track and the corner its neighbour\'s diagonal brushes, and says so; a Bay pixel never reads the layer; without one, nothing (mutant: the Bay test, a byte, a corner, the flag)', () => {
  const w = new FlatWoods(20);
  const mk = (kind, entries) => ({ roads: new Map(), tracks: new Map(), [kind]: new Map(entries.map(([x, y, v]) => [beyondKey(x, y), v])) });
  for (const [x, y] of [[1200, 10], [-30, 300], [500, -30], [500, 530]]) {
    setArenaRoads(mk('roads', [[x, y, DIR.N | DIR.S]]));
    const o = kernel(w, x, y);
    assert.ok(painted(o) > 0, `(${x}, ${y}) paints its road`);
    assert.equal(o.arenaRoads, true);
    setArenaRoads(mk('tracks', [[x, y, DIR.E | DIR.W]]));
    assert.ok(painted(kernel(w, x, y)) > 0, `(${x}, ${y}) paints its track`);
    setArenaRoads(mk('roads', [[x + 1, y, DIR.SW]]));
    const c = kernel(w, x, y);
    assert.ok(painted(c) > 0 && c.arenaRoads, `(${x}, ${y}) paints the corner its east neighbour's diagonal brushes`);
    setArenaRoads(mk('roads', [[x - 1, y, DIR.SE]]));
    assert.ok(painted(kernel(w, x, y)) > 0, `(${x}, ${y}) and its west neighbour's`);
    setArenaRoads(null);
    const none = kernel(w, x, y);
    assert.equal(painted(none), 0);
    assert.equal(none.arenaRoads, false);
  }
  // the Bay's own pixel: a byte under its key is never read - its network is its own
  setArenaRoads(mk('roads', [[200, 100, DIR.N | DIR.S], [201, 100, DIR.SW], [199, 100, DIR.SE]]));
  const bay = kernel(w, 200, 100);
  assert.equal(painted(bay), 0);
  assert.equal(bay.arenaRoads, false);
  const own = bayNet(); own.roads[100 * MAP_W + 200] = DIR.N | DIR.S;
  assert.ok(painted(kernel(w, 200, 100, own)) > 0, 'its own network paints');
});

test('TESA4 the verge: a pixel off the Bay asks Arena\'s layer for the band beside it - on its line no room, beside it some, without a layer all of it; a Bay pixel asks the Bay\'s network alone (mutant: the map test, the layer unasked)', () => {
  const PIXEL_M = 819.2, half = PIXEL_M / 2;
  const net = bayNet();
  setArenaRoads({ roads: new Map([[beyondKey(500, -30), DIR.E | DIR.W]]), tracks: new Map() });
  assert.equal(roadRoom(net, 500, -30, half, half, 30), 0, 'on the road');
  const beside = roadRoom(net, 500, -30, half, half + 20, 30);
  assert.ok(beside > 0 && beside < 30, `beside it: ${beside}`);
  assert.ok(roadRoom(net, 501, -30, 5, half, 30) < 30, 'from the next pixel east, the band its arm reaches');
  setArenaRoads(null);
  assert.equal(roadRoom(net, 500, -30, half, half, 30), 30, 'no layer, no band');
  // the Bay: its network's byte answers, a layer byte under its key does not
  setArenaRoads({ roads: new Map([[beyondKey(200, 100), DIR.E | DIR.W]]), tracks: new Map() });
  assert.equal(roadRoom(net, 200, 100, half, half, 30), 30);
  net.roads[100 * MAP_W + 200] = DIR.E | DIR.W;
  assert.equal(roadRoom(net, 200, 100, half, half, 30), 0);
});

function memStore(seed = new Map()) {
  const mem = seed, sets = [];
  return { mem, sets, get: async (k) => mem.get(k) ?? null, set: async (k, v) => { sets.push(k); mem.set(k, v); return true; } };
}
const TOWNS = [{ x: 100, y: -300, type: TownCity }, { x: 400, y: -300, type: TownCity }];

test('TESA4 the client, no worker: an ask builds here through the cache - a miss builds and keeps it, a hit draws the network it held - installs this thread\'s layer and says it landed under its epoch; a later ask supersedes one still at the cache (mutant: the hit unread, the store, the epoch, the supersession)', async () => {
  const c = new TerrainGenClient({ woods: new FlatWoods(30) });
  const landed = [];
  const store = memStore();
  await c.setArenaRoads(TOWNS, (e, layer) => landed.push([e, layer]), { store });
  assert.deepEqual([c.arenaRoadsEpoch, c.arenaRoadsLanded], [1, 1]);
  assert.equal(landed.length, 1);
  assert.equal(landed[0][1], arenaRoadsLayer(), 'this thread holds what it said landed');
  assert.ok(walks(landed[0][1].roads, [100, -300], [400, -300]));
  assert.equal(store.sets.length, 1, 'a miss is kept');
  const [key] = store.sets;
  assert.equal(key, arenaRoadsKey({ towns: TOWNS, window: arenaRoadWindow(TOWNS), woodsLength: 77 }));
  // a hit: the network the cache held, whatever it is - here an empty one
  const held = memStore(new Map([[key, { roads: new Uint8Array(MAP_W * MAP_H), tracks: new Uint8Array(MAP_W * MAP_H) }]]));
  await c.setArenaRoads(TOWNS, (e, layer) => landed.push([e, layer]), { store: held });
  assert.equal(landed[1][0], 2);
  assert.equal(landed[1][1].roads.size, 0, 'the cache\'s network, not a build');
  assert.equal(held.sets.length, 0, 'a hit is not stored again');
  // superseded: the first ask is still at a slow cache when the second lands
  const slow = { get: (k) => new Promise((r) => setTimeout(() => r(null), 30)), set: async () => true };
  const p1 = c.setArenaRoads(TOWNS, (e) => landed.push([e, 'first']), { store: slow });
  const p2 = c.setArenaRoads(null, (e, layer) => landed.push([e, layer]), { store });
  await Promise.all([p1, p2]);
  assert.deepEqual(landed.slice(2), [[4, null]], 'the newer ask alone lands');
  assert.equal(arenaRoadsLayer(), null);
  assert.deepEqual([c.arenaRoadsEpoch, c.arenaRoadsLanded], [4, 4]);
});

function fakeWorkerClient() {
  const posted = [];
  const fake = { postMessage: (m) => posted.push(m), terminate() {}, onmessage: null, onerror: null };
  const c = new TerrainGenClient({ woods: new FlatWoods(30), woodsBytes: new Uint8Array(4), workerFactory: () => fake });
  return { c, fake, posted };
}

test('TESA4 the client, a worker: the ask posts once the cache answers - the towns, the window and the network a hit held (a copy) - and jobs from then on carry its epoch; the worker\'s layer lands under the ask in hand alone, a network it built kept; a worker that dies first is answered here (mutant: the post, the epoch, the stale answer, the keep, the fallback)', async () => {
  const { c, fake, posted } = fakeWorkerClient();
  const landed = [];
  const store = memStore();
  await c.setArenaRoads(TOWNS, (e, layer) => landed.push([e, layer]), { store });
  const ask = posted.at(-1);
  assert.equal(ask.t, 'arena-roads');
  assert.deepEqual([ask.epoch, ask.towns, ask.window, ask.net], [1, TOWNS, arenaRoadWindow(TOWNS), null]);
  assert.deepEqual([c.arenaRoadsEpoch, c.arenaRoadsLanded], [1, 0], 'posted, not landed');
  // the worker's answer, as answerArenaRoads makes it
  const win = arenaRoadWindow(TOWNS);
  const net = buildArenaNetwork({ towns: TOWNS, window: win, ...flat(30) });
  const layer = rasterArenaRoads(net, win, TOWNS);
  fake.onmessage({ data: { t: 'arena-roads', epoch: 0, layer: packArenaRoads(layer), net: null } });
  assert.equal(landed.length, 0, 'an older ask\'s answer');
  fake.onmessage({ data: { t: 'arena-roads', epoch: 1, layer: packArenaRoads(layer), net: { roads: net.roads, tracks: net.tracks } } });
  assert.equal(c.arenaRoadsLanded, 1);
  assert.equal(landed[0][0], 1);
  assert.deepEqual(arenaRoadsLayer(), layer, 'this thread\'s copy');
  await Promise.resolve();
  assert.equal(store.sets.length, 1, 'the network it built is kept');
  // a hit goes over as a copy, and the answer's (absent) network is not kept again
  await c.setArenaRoads(TOWNS, null, { store });
  const hit = posted.at(-1);
  assert.equal(hit.epoch, 2);
  assert.deepEqual(hit.net.roads, net.roads);
  assert.notEqual(hit.net.roads.buffer, store.mem.get(store.sets[0]).roads.buffer, 'a copy crosses');
  // a worker that dies before it answers: built here
  const d = fakeWorkerClient();
  await d.c.setArenaRoads(TOWNS, (e, l) => landed.push([e, l]), { store: null });
  assert.equal(d.c.arenaRoadsLanded, 0);
  d.fake.onerror({ message: 'gone' });
  assert.equal(d.c.arenaRoadsLanded, 1);
  assert.ok(walks(arenaRoadsLayer().roads, [100, -300], [400, -300]));
});

/** The synthetic WOODS.WLD (test/modsettings.test.js): heights (x + y) & 255. */
function syntheticWoods(W, H) {
  const offsetsStart = 32 + 28 * 4, cellsStart = offsetsStart + W * H * 4, heightMapOffset = cellsStart + 2 * (22 + 25);
  const bytes = new Uint8Array(heightMapOffset + W * H);
  const v = new DataView(bytes.buffer);
  v.setUint32(0, W * H * 4, true); v.setUint32(4, W, true); v.setUint32(8, H, true); v.setUint32(16, cellsStart, true); v.setUint32(28, heightMapOffset, true);
  for (let i = 0; i < W * H; i++) v.setUint32(offsetsStart + i * 4, cellsStart, true);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) bytes[heightMapOffset + y * W + x] = (x + y) & 0xff;
  return bytes;
}

test('TESA4 the worker: an ask builds on its own ground and installs the layer its jobs paint, posting it back with the network; a held network is drawn, not built; no towns clear it; a failure answers its own message, never the jobs\' (mutant: the install, the build, the error arm)', async () => {
  const posted = [];
  const prevPost = globalThis.postMessage, prevOn = globalThis.onmessage;
  globalThis.postMessage = (msg) => posted.push(msg);
  try {
    await import('../src/world/terrainGenWorker.js');
    globalThis.onmessage({ data: { t: 'init', woodsBytes: syntheticWoods(MAP_WIDTH, MAP_HEIGHT) } });
    const towns = [{ x: 20, y: -300, type: TownCity }, { x: 200, y: -300, type: TownCity }];
    const window = arenaRoadWindow(towns);
    globalThis.onmessage({ data: { t: 'arena-roads', epoch: 7, towns, window, net: null } });
    const a = posted.at(-1);
    assert.equal(a.t, 'arena-roads', a.error ?? '');
    assert.equal(a.epoch, 7);
    assert.ok(a.net?.roads instanceof Uint8Array, 'the network it built goes back');
    const layer = unpackArenaRoads(a.layer);
    assert.ok(walks(layer.roads, [20, -300], [200, -300]));
    const job = (px, py) => { globalThis.onmessage({ data: { t: 'job', px, py, stride: 1, tilemap: new Uint8Array(128 * 128), locationRect: null, hasLocation: false, climateType: 302 } }); return posted.at(-1); };
    globalThis.onmessage({ data: { t: 'roads', net: bayNet() } });
    const on = job(100, -300);
    assert.equal(on.t, 'done', on.message ?? '');
    assert.equal(on.arenaRoads, true, 'its jobs paint its layer');
    globalThis.onmessage({ data: { t: 'arena-roads', epoch: 8, towns: null, window: null, net: null } });
    assert.deepEqual([posted.at(-1).epoch, posted.at(-1).layer, posted.at(-1).net], [8, null, null]);
    assert.equal(job(100, -300).arenaRoads, false, 'cleared');
    globalThis.onmessage({ data: { t: 'arena-roads', epoch: 9, towns, window, net: { roads: a.net.roads, tracks: a.net.tracks } } });
    assert.equal(posted.at(-1).net, null, 'a held network is not built again');
    assert.deepEqual(unpackArenaRoads(posted.at(-1).layer), layer);
    globalThis.onmessage({ data: { t: 'arena-roads', epoch: 10, towns, window, net: { roads: null, tracks: null } } });
    const bad = posted.at(-1);
    assert.equal(bad.t, 'arena-roads', 'its own message, never the FIFO\'s error');
    assert.equal(bad.epoch, 10);
    assert.ok(bad.error);
    assert.equal(job(100, -300).arenaRoads, false, 'and none installed');
  } finally {
    globalThis.postMessage = prevPost;
    globalThis.onmessage = prevOn;
  }
});

test('TESA4 the host: the towns go to the kernels when the places that stand move; each pixel keeps the epoch its job was posted under and whether Arena\'s roads reached it; a landing marks every built pixel off the Bay posted earlier that its paint or the new layer reaches, a pixel in flight as it publishes, and the sweep builds them again (mutant: a hand-over, the epoch\'s capture, the stale law, the sweep)', () => {
  const w = read('src/scenes/world.js');
  const hand = w.slice(w.indexOf('  function handArenaRoads() {'), w.indexOf('  function arenaRoadsLanded('));
  assert.match(hand, /if \(now === _arenaRoadsFor\) return;\n\s+_arenaRoadsFor = now;\n\s+terrainGen\.setArenaRoads\(arenaRoadTowns\(now\), arenaRoadsLanded\);/);
  assert.match(w, /if \(_arenaTemplates\) handArenaRoads\(\);[^\n]*\n\s+if \(_arenaTemplates && !building\) sweepArenaPixels\(\);/, 'on the frame, building or not: the build is the worker\'s');
  assert.match(w, /const arenaRoadsAt = terrainGen\.arenaRoadsEpoch;[^\n]*\n\s+const \{ [^}]*, arenaRoads \} = await terrainGen\.generate\(\{/, 'the epoch read as the job is posted');
  assert.match(w, /arenaSlot: dfLocation\?\.arena \?\? null,\n\s+arenaRoadsEpoch: arenaRoadsAt, arenaRoadsPainted: !!arenaRoads,/);
  assert.match(w, /const arenaRoadsStale = \(p, epoch, layer\) => !onTheBay\(p\.px, p\.py\) && p\.arenaRoadsEpoch < epoch && \(p\.arenaRoadsPainted \|\| layerTouches\(layer, p\.px, p\.py\)\);/);
  assert.match(w, /function arenaRoadsLanded\(epoch, layer\) \{\n\s+for \(const \[k, p\] of built\) if \(arenaRoadsStale\(p, epoch, layer\)\) _arenaRoadsStale\.add\(k\);/);
  assert.match(w, /if \(built\.has\(key\) && arenaRoadsStale\(built\.get\(key\), terrainGen\.arenaRoadsLanded, arenaRoadsLayer\(\)\)\) _arenaRoadsStale\.add\(key\);/, 'a pixel in flight, as it publishes');
  const fn = w.slice(w.indexOf('  function sweepArenaRoads() {'), w.indexOf('  // LocationLoader.cs:146-151'));
  assert.match(fn, /if \(p\) \{ again\.push\(\{ px: p\.px, py: p\.py \}\); _arenaRoadsStale\.delete\(k\); \}\n\s+else if \(!inFlight\.has\(k\)\) _arenaRoadsStale\.delete\(k\);/);
  assert.match(fn, /for \(const k of again\) destroyPixel\(k\.px, k\.py, \{ collectLoose: false \}\);\n\s+queue\.push\(\.\.\.again\.sort\(nearestFirstFrom\(state\.current\)\)\);/);
  assert.match(w, /if \(_arenaRoadsStale\.size && !building\) sweepArenaRoads\(\);/);
  assert.match(w, /setArenaStanding\(arenaStands\);\n\s+setArenaRoads\(null\);/, 'a mount starts with none on this thread');
  // the kernel and the verge read it off the Bay
  assert.match(read('src/world/terrainGen.js'), /const arena = !inBay\(px, py\);/);
  assert.match(read('src/world/roadVerge.js'), /const bits = mx >= 0 && my >= 0 && mx < MAP_W && my < MAP_H \? pathsDataPoint\(net, mx, my\) : arenaPathsAt\(mx, my\);/);
});

const ARENA2 = process.env.ARENA2_PATH, ARENA = process.env.ARENA_PATH;
const HAVE = !!ARENA2 && !!ARENA && ['TMAP00I0.IMG', 'TAMRIEL2.IMG', 'ART_PAL.COL', 'WOODS.WLD'].every((f) => existsSync(join(ARENA2, f))) && existsSync(join(ARENA, 'CITYDATA.65'));
test('TESA4 with ARENA2 and ARENA: the freeware\'s 233 towns and villages, a window five pixels a cell, 150 roads and 56 tracks routed (four island pairs not), 19563 road pixels and 5813 track pixels - none on the Bay', { skip: HAVE ? false : 'ARENA2_PATH and ARENA_PATH not set' }, async () => {
  const { DFPalette } = await import('../src/formats/dfPalette.js');
  const { preloadTamrielTrace } = await import('../src/ui/tamrielTrace.js');
  const { parseArenaCityData } = await import('../src/formats/arenaCityData.js');
  const { setArenaCityData, arenaPixels } = await import('../src/world/arenaPlaces.js');
  const { WoodsFile } = await import('../src/formats/woodsFile.js');
  const { groundWoods } = await import('../src/world/tamrielGround.js');
  const { WATER_BYTE } = await import('../src/world/roadsProducer.js');
  const fetchBytes = async (n) => new Uint8Array(readFileSync(join(ARENA2, n)));
  const pal = new DFPalette(); pal.load(await fetchBytes('ART_PAL.COL'), 'ART_PAL.COL');
  setTamrielTrace(await preloadTamrielTrace({ fetchBytes, palette: pal }));
  setTamrielFit({ ox: 38 * 15.5, oy: 57 * 15.5, ppu: 15.5 });
  setArenaCityData(parseArenaCityData(new Uint8Array(readFileSync(join(ARENA, 'CITYDATA.65')))));
  try {
    const woods = new WoodsFile(); woods.load(await fetchBytes('WOODS.WLD'));
    const g = groundWoods(woods);
    const towns = arenaRoadTowns(arenaPixels());
    const window = arenaRoadWindow(towns);
    assert.equal(towns.length, 233);
    assert.deepEqual(window, { x0: 41, y0: -400, s: 5 });
    const net = buildArenaNetwork({ towns, window, heightAt: (x, y) => g.getHeightMapValue(x, y), isWater: (_x, _y, h) => h <= WATER_BYTE });
    assert.deepEqual([net.stats.roadEdges, net.stats.trackEdges, net.stats.unrouted], [150, 56, 4]);
    const layer = rasterArenaRoads(net, window, towns);
    assert.deepEqual([layer.roads.size, layer.tracks.size], [19563, 5813]);
    assert.ok([...layer.roads.keys(), ...layer.tracks.keys()].every((k) => !inBay(...keyXY(k))));
  } finally { setArenaCityData(null); }
});
