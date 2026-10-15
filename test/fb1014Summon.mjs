// FIELD BUGS 2026-10-14 SUMMON-OFFER and SUMMON-REPAIR: THE SUMMONING SUITES' ONE WORLD - a region with a palace or the
// same region without one (Dak'fron's lack), in test/fb1004dTowns.mjs's shapes, and the real quest bridge over it and the
// vendored corpus: the producer both suites make Hermaeus Mora's W0C00Y00 through (decorFakes.mjs's lesson - one home,
// or copies grow apart). Importing it loads the vendored quest tables.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTables, rmbBlock, rdbBlock, town, dungeon, worldOf, mark, SPAWN, ITEM } from './fb1004dTowns.mjs';
import { createQuestBridge } from '../src/scenes/questBridge.js';
import { FACTION_TYPES } from '../src/formats/factionFile.js';
import { DAEDRA } from '../src/systems/daedraData.js';

loadTables();
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const QUESTS = join(ROOT, 'vendor/dfu-quests/Quests');
const TABLES = join(ROOT, 'vendor/dfu-quests/Tables');
export const MAGES_GUILD = 40;
export const HERMAEUS = DAEDRA.find((d) => d.name === 'Hermaeus Mora');

/** One region: the player in the Mages Guild's town; a town with a library, one of houses, one whose block stands a
 *  palace - or, `palace: false`, a house where the palace stood (Dak'fron's lack) - and a dungeon. Each building's
 *  interior carries a quest spawn and item marker; the directory lists what the blocks hold, as MAPS.BSA's does. */
export function region({ palace }) {
  const both = [mark(SPAWN, 10, 0, 10), mark(ITEM, 20, 0, 20)];
  const blocks = new Map([
    ['GUILD.RMB', rmbBlock('GUILD.RMB', [{ type: 12, markers: both }, { type: 17, markers: both }])],
    ['LIB.RMB', rmbBlock('LIB.RMB', [{ type: 10, markers: both }, { type: 17, markers: both }, { type: 18, markers: both }])],
    ['HOUSES.RMB', rmbBlock('HOUSES.RMB', [{ type: 17, markers: both }, { type: 18, markers: both }, { type: 19, markers: both }])],
    ['CROWN.RMB', rmbBlock('CROWN.RMB', [{ type: palace ? 16 : 17, markers: both }])],
    ['DUNG.RDB', rdbBlock()],
  ]);
  const locations = [
    town({ name: 'Guildtown', locationIndex: 0, mapId: 1000, grid: ['GUILD.RMB'] }),
    town({ name: 'Libton', locationIndex: 1, mapId: 1001, grid: ['LIB.RMB'] }),
    town({ name: 'Houseby', locationIndex: 2, mapId: 1002, grid: ['HOUSES.RMB'] }),
    town({ name: 'Crownhold', locationIndex: 3, mapId: 1003, grid: ['CROWN.RMB'] }),
    dungeon({ name: 'Deepkeep', locationIndex: 4, mapId: 1004, dungeonType: 0 }),
  ];
  for (const l of locations) {
    l.exterior.buildings = l.exterior.exteriorData.blockNames.flatMap((n) => blocks.get(n).rmbBlock.fldHeader.buildingDataList.map((b) => ({ ...b })));
  }
  const world = worldOf({ locations, blocks, current: locations[0] });
  const any = world.getFactionData;
  // Hermaeus Mora is FACTION.TXT's Daedra (type 0) - SetupIndividualNPC refuses a named NPC of any other type
  world.getFactionData = (id) => (id === HERMAEUS.factionId ? { id, type: FACTION_TYPES.Daedra, name: HERMAEUS.name, race: -1 } : any(id));
  return world;
}

/** The real bridge over `world` and the vendored corpus - the one the street hosts build. */
export const bridgeOver = (world, { clock = { now: 0 } } = {}) => createQuestBridge({
  data: {
    readListTable: (n) => (existsSync(join(TABLES, `${n}.txt`)) ? readFileSync(join(TABLES, `${n}.txt`), 'utf8') : ''),
    getQuestSourceLines: (n) => {
      const f = join(QUESTS, `${n}.txt`);
      return existsSync(f) ? readFileSync(f, 'utf8').replace(/^﻿/, '').split(/\r?\n/) : null;
    },
  },
  // the clock a quest's time and a finished entry's header read (world.js's own seams, noteMinutes L10N5's)
  world, classicSeconds: () => clock.now, noteMinutes: () => Math.floor(clock.now / 60), playerEntity: { level: 1, name: 'Tester' },
});
/** `fn` with the quest log's warnings caught, and them. */
export function heard(fn) {
  const said = [];
  const w = console.warn, i = console.info;
  console.warn = (...a) => said.push(a.join(' ')); console.info = () => {};
  try { return { value: fn(), said }; } finally { console.warn = w; console.info = i; }
}
