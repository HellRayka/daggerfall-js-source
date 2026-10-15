// FIELD BUGS 2026-10-14 (INLAND-PORTS; AUDIT 17i's ONE CONSTRUCTION SEAM): THE MAP THE STREAMING HOST READS, for a pin
// over the player's own ARENA2. scenes/world.js bootWorld loads MAPS.BSA, CLIMATE.PAK, POLITIC.PAK and WOODS.WLD, builds
// ContentReader's dictionary and runs StreamingWorld.ReadyCheck's two repairs over the readers
// (world/terrainHelper.js readyCheckRepairs) before anything reads a pixel; a pin that reads the raw files reads another
// map (the open sea 179,926 pixels raw, 179,779 repaired). So this builds it the host's way, through the same function,
// with the host's one water law over it (`seaPixel`, world.js's: ui/overworldModel.js isWaterPixel).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MapsFile } from '../src/formats/mapsFile.js';
import { WoodsFile } from '../src/formats/woodsFile.js';
import { buildMapDict } from '../src/systems/mapDirectory.js';
import { readyCheckRepairs } from '../src/world/terrainHelper.js';
import { isWaterPixel } from '../src/ui/overworldModel.js';

/** The repaired map: `{ maps, woods, dict, repairs, seaPixel }` (`seaPixel` off the map: none, the Bay's map alone).
 *  @param {string} arena2 */
export function streamingMap(arena2) {
  const maps = new MapsFile();
  if (!maps.load(new Uint8Array(readFileSync(join(arena2, 'MAPS.BSA'))), new Uint8Array(readFileSync(join(arena2, 'CLIMATE.PAK'))), new Uint8Array(readFileSync(join(arena2, 'POLITIC.PAK'))))) throw new Error('MAPS.BSA failed to load');
  maps.autoDiscard = false;
  const woods = new WoodsFile();
  if (!woods.load(new Uint8Array(readFileSync(join(arena2, 'WOODS.WLD'))))) throw new Error('WOODS.WLD failed to load');
  const dict = buildMapDict(maps);
  const repairs = readyCheckRepairs(maps, dict, woods);
  const seaPixel = (x, y) => x >= 0 && y >= 0 && x < 1000 && y < 500 && isWaterPixel(maps.getClimateIndex(x, y), woods.getHeightMapValue(x, y));
  return { maps, woods, dict, repairs, seaPixel };
}
