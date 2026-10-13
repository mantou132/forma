import { centroid } from './geometry.ts';
import { applyFlip, type Box, emptyHeights, flips, type Heights, surface } from './partition.ts';
import { pick, rng } from './random.ts';
import { parseArt, parseTri, type Tri, triAt, triKey, triNeighbours } from './region.ts';

/** Turn the flat tiling into the target stack */
export type MatchLevel = {
  kind: 'match';
  box: Box;
  start: Heights;
  target: Heights;
};

/** Reshape the stack until the point can walk to the exit */
export type PathLevel = {
  kind: 'path';
  box: Box;
  start: Heights;
  from: [number, number];
  /** Exit cell and the height it must stand at */
  to: [number, number, number];
  /** Fewest flips, verified by `test/levels.test.ts` */
  par: number;
};

/** Tile the region with rhombi, or prove it can't be done */
export type RegionLevel = {
  kind: 'region';
  region: Set<string>;
};

export type LatticeLevel = MatchLevel | PathLevel | RegionLevel;

/** Random stack with `cubes` cubes, grown one legal cube at a time */
export const randomStack = (box: Box, seed: number, cubes: number): Heights => {
  const random = rng(seed);
  let h = emptyHeights(box);
  for (let n = 0; n < cubes; n++) {
    const adds = flips(box, h).filter(({ add }) => add);
    if (!adds.length) break;
    h = applyFlip(h, pick(random, adds));
  }
  return h;
};

const match = (box: Box, start: Heights, target: Heights): MatchLevel => ({ kind: 'match', box, start, target });

const generatedMatch = (box: Box, seed: number, startCubes: number, targetCubes: number) =>
  match(box, randomStack(box, seed, startCubes), randomStack(box, seed * 7 + 1, targetCubes));

/** Triangles of a rhombus face, found by sampling inside each half */
export const faceTris = (points: [number, number][]): Tri[] => {
  const [cx, cy] = centroid(points);
  const keys = new Map<string, Tri>();
  for (const [x, y] of points) {
    const tri = triAt([cx + (x - cx) * 0.5, cy + (y - cy) * 0.5]);
    keys.set(triKey(tri), tri);
  }
  return [...keys.values()];
};

type GeneratedRegion = {
  box: Box;
  seed: number;
  /** Whole rhombi removed: the region stays tileable */
  holes: number;
  /** Single ▷ triangles removed from the edge: the counts no longer match, so no tiling exists */
  chips: number;
};

/** Regions grown from a hidden tiling, so tileable ones are tileable by construction */
const region = ({ box, seed, holes, chips }: GeneratedRegion): RegionLevel => {
  const random = rng(seed);
  const stack = randomStack(box, seed, Math.floor((box.a * box.b * box.c) / 2));
  const faces = surface(box, stack).map((face) => faceTris(face.points).map(triKey));
  const keys = new Set(faces.flat());
  for (let n = 0; n < holes; n++) {
    // Only rhombi surrounded on all sides, so holes stay holes and the outline stays clean
    const inner = faces.filter((pair) =>
      pair.every((key) => triNeighbours(parseTri(key)).every(([t]) => keys.has(triKey(t)))),
    );
    const hole = pick(random, inner);
    faces.splice(faces.indexOf(hole), 1);
    for (const key of hole) keys.delete(key);
  }
  for (let n = 0; n < chips; n++) {
    const edge = [...keys].filter((key) => {
      const [u, v, d] = key.split(',').map(Number);
      return d === 0 && !keys.has(`${u - 1},${v},1`);
    });
    keys.delete(pick(random, edge));
  }
  return { kind: 'region', region: keys };
};

/** 形 drawn with one vertical rhombus per pixel: every pixel is an even run of one column, so the character always tiles */
const FORM = [
  '######...#.',
  '.#..#...#..',
  '.#..#..#...',
  '######....#',
  '.#..#....#.',
  '.#..#...#..',
  '#...#.....#',
  '#...#....#.',
  '....#..##..',
];

export const formRegion = () => parseArt(FORM.flatMap((row) => [row, row]));

export const LEVELS: LatticeLevel[][] = [
  // I · Flat
  [
    match({ a: 1, b: 1, c: 1 }, [[0]], [[1]]),
    match(
      { a: 2, b: 2, c: 1 },
      [
        [0, 0],
        [0, 0],
      ],
      [
        [1, 1],
        [1, 0],
      ],
    ),
    match(
      { a: 2, b: 2, c: 2 },
      [
        [1, 0],
        [0, 0],
      ],
      [
        [2, 1],
        [1, 0],
      ],
    ),
    match(
      { a: 2, b: 2, c: 2 },
      [
        [2, 2],
        [2, 0],
      ],
      [
        [2, 1],
        [0, 0],
      ],
    ),
    match(
      { a: 3, b: 2, c: 2 },
      [
        [2, 1],
        [1, 0],
        [0, 0],
      ],
      [
        [2, 2],
        [1, 1],
        [1, 0],
      ],
    ),
    match(
      { a: 3, b: 3, c: 2 },
      [
        [1, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      [
        [2, 2, 1],
        [2, 1, 0],
        [1, 0, 0],
      ],
    ),
    match(
      { a: 3, b: 3, c: 3 },
      [
        [3, 2, 1],
        [2, 1, 0],
        [1, 0, 0],
      ],
      [
        [2, 2, 2],
        [1, 1, 1],
        [0, 0, 0],
      ],
    ),
    match(
      { a: 3, b: 3, c: 3 },
      [
        [3, 3, 2],
        [3, 2, 1],
        [2, 1, 0],
      ],
      [
        [2, 1, 1],
        [1, 1, 0],
        [1, 0, 0],
      ],
    ),
  ],
  // II · Rise
  [
    match(
      { a: 3, b: 3, c: 3 },
      [
        [1, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      [
        [3, 2, 1],
        [2, 1, 0],
        [1, 0, 0],
      ],
    ),
    match(
      { a: 4, b: 4, c: 4 },
      [
        [2, 2, 1, 0],
        [2, 1, 0, 0],
        [1, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [4, 3, 3, 1],
        [3, 2, 1, 1],
        [2, 2, 1, 0],
        [1, 0, 0, 0],
      ],
    ),
    match(
      { a: 2, b: 3, c: 4 },
      [
        [4, 2, 1],
        [1, 0, 0],
      ],
      [
        [3, 3, 3],
        [2, 2, 1],
      ],
    ),
    match(
      { a: 4, b: 4, c: 2 },
      [
        [2, 2, 2, 2],
        [2, 2, 2, 2],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [2, 2, 0, 0],
        [2, 2, 0, 0],
        [2, 2, 0, 0],
        [2, 2, 0, 0],
      ],
    ),
    generatedMatch({ a: 4, b: 3, c: 3 }, 11, 14, 20),
    generatedMatch({ a: 4, b: 4, c: 4 }, 23, 30, 22),
  ],
  // III · Steps
  [
    {
      kind: 'path',
      box: { a: 3, b: 3, c: 2 },
      start: [
        [2, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      from: [2, 2],
      to: [0, 0, 2],
      par: 1,
    },
    {
      kind: 'path',
      box: { a: 3, b: 3, c: 3 },
      start: [
        [3, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      from: [2, 2],
      to: [0, 0, 3],
      par: 3,
    },
    {
      kind: 'path',
      box: { a: 4, b: 4, c: 3 },
      start: [
        [3, 3, 0, 0],
        [3, 3, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      from: [3, 3],
      to: [0, 0, 3],
      par: 3,
    },
    {
      kind: 'path',
      box: { a: 4, b: 4, c: 4 },
      start: [
        [4, 4, 4, 4],
        [4, 4, 4, 0],
        [4, 4, 0, 0],
        [4, 0, 0, 0],
      ],
      from: [0, 0],
      to: [3, 3, 0],
      par: 5,
    },
    {
      kind: 'path',
      box: { a: 4, b: 4, c: 4 },
      start: [
        [4, 4, 2, 2],
        [4, 1, 0, 0],
        [2, 0, 0, 0],
        [2, 0, 0, 0],
      ],
      from: [0, 3],
      to: [3, 0, 2],
      par: 2,
    },
    {
      kind: 'path',
      box: { a: 4, b: 4, c: 4 },
      start: [
        [4, 1, 0, 0],
        [1, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      from: [3, 3],
      to: [0, 0, 4],
      par: 5,
    },
  ],
  // IV · Proof
  [
    region({ box: { a: 2, b: 2, c: 2 }, seed: 3, holes: 0, chips: 0 }),
    region({ box: { a: 2, b: 2, c: 2 }, seed: 5, holes: 0, chips: 1 }),
    region({ box: { a: 3, b: 2, c: 2 }, seed: 8, holes: 1, chips: 0 }),
    region({ box: { a: 3, b: 3, c: 2 }, seed: 13, holes: 1, chips: 1 }),
    region({ box: { a: 3, b: 3, c: 3 }, seed: 21, holes: 2, chips: 0 }),
    region({ box: { a: 3, b: 3, c: 3 }, seed: 34, holes: 1, chips: 1 }),
    region({ box: { a: 4, b: 3, c: 3 }, seed: 55, holes: 3, chips: 0 }),
    region({ box: { a: 4, b: 4, c: 3 }, seed: 89, holes: 2, chips: 1 }),
  ],
  // V · Paint
  [
    generatedMatch({ a: 4, b: 4, c: 4 }, 101, 8, 28),
    generatedMatch({ a: 5, b: 4, c: 4 }, 202, 30, 12),
    generatedMatch({ a: 5, b: 5, c: 4 }, 303, 20, 44),
    generatedMatch({ a: 5, b: 5, c: 5 }, 404, 60, 34),
    { kind: 'region', region: formRegion() },
  ],
];
