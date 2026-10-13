// @ts-check
// TESA10c (bible/03-World/Arena-Provinces.md TESA10c) - FALINESTI'S LANDMARK: the Great Graht-Oak, the city's own tree
// (world/capitalPlans.js FALINESTI) - its trunk of bark from its roots to its limbs, the buttress roots spreading over
// the grounds at its foot, the great limbs reaching out over the city, the crown of leaves above every street, and the
// timber platforms round its trunk - in metres, drawn as the map reads (+z south), its origin the tree's axis on its
// ground. Shapes of the port's own in the spirit of the walking city. No game data.
import { MeshBuilder } from './detStandIns.js';
import { CAPITAL_ART, art, ledge, blob, limb, rockColumn, jitter } from './capitalShapes.js';
import { FALINESTI } from './capitalPlans.js';

const BARK = art(CAPITAL_ART.bark), LEAVES = art(CAPITAL_ART.leaves), TIMBER = art(CAPITAL_ART.timber);

/** The trunk's radius at height y: between its levels, straight. */
export function trunkRadius(y, F = FALINESTI) {
  const L = F.trunk;
  if (y <= L[0][0]) return L[0][1];
  for (let i = 0; i + 1 < L.length; i++) if (y <= L[i + 1][0]) return L[i][1] + ((L[i + 1][1] - L[i][1]) * (y - L[i][0])) / (L[i + 1][0] - L[i][0]);
  return L[L.length - 1][1];
}

/**
 * THE GREAT GRAHT-OAK: its trunk through its levels; its buttress roots, each bending down from the trunk's foot to the
 * ground; its limbs out and up from the trunk's top half, each ending in a cluster of leaves; the crown's clusters over
 * the city, the greatest over the trunk; the platforms round the trunk, each a ring of planks with its rail.
 */
export function buildGrahtOak(F = FALINESTI) {
  const mb = new MeshBuilder();
  rockColumn(mb, BARK, LEAVES, 0, 0, 16, F.trunk.map(([y, r]) => [y, r]), { rough: 2.5, seed: 0xfa1 });
  for (let i = 0; i < F.roots; i++) {
    const a = (i / F.roots) * Math.PI * 2 + (jitter(0xfa2, i) - 0.5) * 0.3, c = Math.cos(a), s = Math.sin(a);
    const top = [c * trunkRadius(6) * 0.7, 9, s * trunkRadius(6) * 0.7], bend = [c * (F.rootOut * 0.6), 2.5, s * (F.rootOut * 0.6)], end = [c * F.rootOut, -1.5, s * F.rootOut];
    limb(mb, BARK, top, bend, 7, 4.5, { n: 8 });
    limb(mb, BARK, bend, end, 4.5, 1.2, { n: 7 });
  }
  const tips = [];
  for (let i = 0; i < F.limbs; i++) {
    const a = (i / F.limbs) * Math.PI * 2 + 0.35, c = Math.cos(a), s = Math.sin(a), k = jitter(0xfa3, i);
    const y0 = F.limbFrom[0] + (F.limbFrom[1] - F.limbFrom[0]) * k, out = F.limbOut[0] + (F.limbOut[1] - F.limbOut[0]) * jitter(0xfa4, i);
    const y1 = F.limbTop[0] + (F.limbTop[1] - F.limbTop[0]) * jitter(0xfa5, i), r0 = trunkRadius(y0) * 0.45;
    const from = [c * trunkRadius(y0) * 0.6, y0, s * trunkRadius(y0) * 0.6], mid = [c * out * 0.55, (y0 + y1) / 2 + 6, s * out * 0.55], tip = [c * out, y1, s * out];
    limb(mb, BARK, from, mid, r0, r0 * 0.6, { n: 8 });
    limb(mb, BARK, mid, tip, r0 * 0.6, r0 * 0.25, { n: 7 });
    tips.push(tip);
  }
  // the crown: a cluster at every limb's end, more between them round the crown's circle, the greatest over the trunk
  tips.forEach(([x, y, z], i) => blob(mb, LEAVES, x, y + 6, z, 46, 22, 46, { seed: 0xfb0 + i }));
  const ring = F.crown.blobs - tips.length - 1;
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * Math.PI * 2, r = F.crown.r * (0.45 + 0.5 * jitter(0xfb1, i)), y = F.crown.y + (jitter(0xfb2, i) - 0.5) * 24;
    blob(mb, LEAVES, Math.cos(a) * r, y, Math.sin(a) * r, 40, 20, 40, { seed: 0xfc0 + i });
  }
  blob(mb, LEAVES, 0, F.crown.y + 16, 0, 70, 30, 70, { seed: 0xfd0, n: 12 });
  for (const y of F.platforms) {
    const r = trunkRadius(y) + 1.5;
    ledge(mb, TIMBER, 18, r + F.platformW, r - 2, y - 0.7, y);
    ledge(mb, TIMBER, 18, r + F.platformW, r + F.platformW - 0.3, y, y + 1.1);
  }
  return mb.build();
}
