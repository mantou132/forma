import { centroid, type FaceKind, type Point, SQ } from './geometry.ts';

/**
 * The triangular lattice under every tiling. Columns `u` are SQ wide; each column alternates
 * ▷ (`d = 0`, vertical edge on the left) and ◁ (`d = 1`, vertical edge on the right).
 * A rhombus is two neighbouring triangles, so it always covers exactly one ▷ and one ◁.
 */
export type Tri = { u: number; v: number; d: 0 | 1 };

export const triKey = ({ u, v, d }: Tri) => `${u},${v},${d}`;

export const parseTri = (key: string): Tri => {
  const [u, v, d] = key.split(',').map(Number);
  return { u, v, d: d as 0 | 1 };
};

export const triPoints = ({ u, v, d }: Tri): Point[] => {
  const x0 = SQ * u;
  const x1 = SQ * (u + 1);
  const y = 10 * u + 20 * v;
  return d === 0
    ? [
        [x0, y],
        [x1, y + 10],
        [x0, y + 20],
      ]
    : [
        [x1, y + 10],
        [x1, y + 30],
        [x0, y + 20],
      ];
};

/** Neighbours with the rhombus kind their union makes */
export const triNeighbours = ({ u, v, d }: Tri): [Tri, FaceKind][] =>
  d === 0
    ? [
        [{ u, v, d: 1 }, 'l'],
        [{ u, v: v - 1, d: 1 }, 'r'],
        [{ u: u - 1, v, d: 1 }, 't'],
      ]
    : [
        [{ u, v, d: 0 }, 'l'],
        [{ u, v: v + 1, d: 0 }, 'r'],
        [{ u: u + 1, v, d: 0 }, 't'],
      ];

export const rhombusKind = (a: Tri, b: Tri) => triNeighbours(a).find(([n]) => triKey(n) === triKey(b))?.[1];

/** Triangle containing a screen point */
export const triAt = ([x, y]: Point): Tri => {
  const u = Math.floor(x / SQ);
  const f = x / SQ - u;
  const s = Math.floor((y - 10 * u - 10 * f) / 20);
  const t = Math.floor((y - 10 * u + 10 * f) / 20);
  return s === t ? { u, v: s, d: 0 } : { u, v: s, d: 1 };
};

export const rhombusPoints = (a: Tri, b: Tri): Point[] => {
  const all = [...triPoints(a), ...triPoints(b)];
  const unique = all.filter(([x, y], i) => all.findIndex(([px, py]) => Math.hypot(px - x, py - y) < 0.01) === i);
  const [cx, cy] = centroid(unique);
  return unique.sort(([ax, ay], [bx, by]) => Math.atan2(ay - cy, ax - cx) - Math.atan2(by - cy, bx - cx));
};

/**
 * Regions are drawn as text: one character per triangle, `#` inside.
 * Row r and column u hold the triangle whose centre sits at y = 10r + 10, so the art is not sheared.
 */
export const parseArt = (art: string[]): Set<string> => {
  const region = new Set<string>();
  art.forEach((line, r) => {
    [...line].forEach((char, u) => {
      if (char !== '#') return;
      const w = r - u;
      const d = ((w % 2) + 2) % 2 === 0 ? 0 : 1;
      region.add(triKey({ u, v: (w - d) / 2, d: d as 0 | 1 }));
    });
  });
  return region;
};

export const countTypes = (keys: Iterable<string>) => {
  let right = 0;
  let left = 0;
  for (const key of keys) parseTri(key).d === 0 ? right++ : left++;
  return { right, left };
};

/** Maximum matching of ▷ to ◁ neighbours (Kuhn); a tiling exists iff every triangle is matched */
export const isTileable = (region: Set<string>) => {
  const { right, left } = countTypes(region);
  if (right !== left) return false;
  const match = new Map<string, string>();
  const tryAugment = (key: string, visited: Set<string>): boolean => {
    for (const [n] of triNeighbours(parseTri(key))) {
      const nk = triKey(n);
      if (!region.has(nk) || visited.has(nk)) continue;
      visited.add(nk);
      const owner = match.get(nk);
      if (owner === undefined || tryAugment(owner, visited)) {
        match.set(nk, key);
        return true;
      }
    }
    return false;
  };
  for (const key of region) {
    if (parseTri(key).d === 0 && !tryAugment(key, new Set())) return false;
  }
  return true;
};
