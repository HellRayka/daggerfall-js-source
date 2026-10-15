// @ts-check
// FIELD BUGS 2026-10-14 (INLAND-PORTS; bible/01-Overview/Field-Bugs-2026-10-14-inland-ports.md) - THE OPEN SEA, AND THE
// TOWNS ON IT, FOR THE STREAMING HOST. A module the host wires (HOST-SPLIT's law, bible/01-Overview/Host-Split.md: new
// behaviour never grows bootWorld itself - it constructs this once, above the stream, beside its `seaPixel`, and calls it).
//
// THE OPEN SEA (`openSea(x, y)`): a pixel of the Bay's map whose water - the host's `seaPixel`, the one water law over
// the repaired map (world/terrainHelper.js readyCheckRepairs) - reaches the map's border (world/portSites.js openSeaOf,
// flooded the first time it is asked, and kept: every lake and pond the map draws inland left out); past the Veil, the
// Eltheric Ocean's water round its isles (the ether's own ground - each isle a hill of land in open water,
// world/ethericSea.js isleByte); past the map's edge, only where the land beyond the Bay stands (AUDIT CAPTAIN'S SEA
// B10: else nothing streams there) - the continent's sea, its land a province's and no lake in it
// (world/tamrielGround.js authoredHeightByte). Anywhere else, none. The one set the port towns, the harbour board's ports
// and the harbour office's sites, cargoes and charts ask.
//
// THE PORT TOWNS (`portOnSea(dfLocation)`, systems/portPlaces.js isPortTown's `isPort`): a port by its own data (Travel
// Options' hand-written harbours, systems/travelPorts.js hasPort, or Daggerfall's PortTownAndUnknown byte) that the open
// sea bears on (world/portSites.js portTownOnSea: the open sea within SEA_RING, the ring the bearing is read off). The
// data alone stood a shipyard and a lighthouse at the middle of 36 region capitals - beside a pond in Ilessan Hills'
// blocks. Never a seat's members' harbour (hasPortFor's word is one guild's - every client stands the same shipyard).
//
// Pure but for its one memo: no renderer, no clock. Not a DFU member. Ledger A (SHIPYARDS).
import { openSeaOf, portTownOnSea } from '../world/portSites.js';

/**
 * @param {{ seaPixel: (x: number, y: number) => boolean, width: number, height: number,
 *   hasPort: (mapId: number) => boolean, etherSea?: boolean, inEther?: (x: number, y: number) => boolean,
 *   tamrielLand?: boolean }} host
 */
export function createPortSea(host) {
  const { seaPixel, width, height, hasPort, etherSea = false, inEther = () => false, tamrielLand = false } = host;
  /** @type {Uint8Array|null} */
  let mask = null;
  const openSea = (x, y) => {
    if (etherSea && inEther(x, y)) return seaPixel(x, y);
    if (!(x >= 0 && y >= 0 && x < width && y < height)) return tamrielLand && seaPixel(x, y);
    mask ??= openSeaOf(seaPixel, width, height);
    return mask[y * width + x] === 1;
  };
  const portOnSea = (dfLocation) => portTownOnSea(dfLocation, hasPort, openSea);
  return { openSea, portOnSea };
}
