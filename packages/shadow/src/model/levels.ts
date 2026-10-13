import { type Bitmap, hull, parseBitmap, sameBitmap, shadow, VIEWS, type View } from './voxels.ts';

export type ShadowLevel = {
  n: number;
  targets: Record<View, Bitmap>;
  /** Most cubes allowed; set from the solver in `test/levels.test.ts` */
  cubes?: number;
};

type LevelSpec = {
  n: number;
  /** Omitted views take whatever shadow the other two carve out */
  front?: string[];
  side?: string[];
  top?: string[];
  cubes?: number;
};

const level = ({ n, cubes, ...spec }: LevelSpec): ShadowLevel => {
  const given = Object.fromEntries(
    VIEWS.map((view) => [view, spec[view] ? parseBitmap(n, spec[view]) : new Uint8Array(n * n).fill(1)]),
  ) as Record<View, Bitmap>;
  const block = hull(n, given);
  const targets = Object.fromEntries(VIEWS.map((view) => [view, shadow(n, block, view)])) as ShadowLevel['targets'];
  for (const view of VIEWS) {
    if (spec[view] && !sameBitmap(targets[view], given[view]))
      throw new Error(`${view} shadow can't be cast together with the others: ${JSON.stringify(spec)}`);
  }
  return { n, cubes, targets };
};

const disk = (n: number) =>
  Array.from({ length: n }, (_, row) =>
    Array.from({ length: n }, (_, col) => {
      const c = (n - 1) / 2;
      return Math.hypot(col - c, row - c) <= n / 2 - 0.15 ? '#' : '.';
    }).join(''),
  );

const triangle = (n: number) =>
  Array.from({ length: n }, (_, row) =>
    Array.from({ length: n }, (_, col) => (Math.abs(col - (n - 1) / 2) <= (row + 1) / 2 ? '#' : '.')).join(''),
  );

const LETTERS: Record<string, string[]> = {
  F: ['#####', '#....', '####.', '#....', '#....'],
  O: ['.###.', '#...#', '#...#', '#...#', '.###.'],
  R: ['####.', '#...#', '####.', '#..#.', '#...#'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  A: ['.###.', '#...#', '#####', '#...#', '#...#'],
};

const FORM = [
  '#####..#.',
  '.#.#..#..',
  '.#.#.#...',
  '#####...#',
  '.#.#...#.',
  '.#.#..#..',
  '#..#....#',
  '#..#...#.',
  '...#.##..',
];

export const LEVELS: ShadowLevel[][] = [
  // I · Solid: only single cubes, seen in 3D
  [
    level({ n: 3, front: ['###', '#.#', '###'] }),
    level({ n: 3, front: ['#..', '##.', '###'] }),
    level({ n: 3, side: ['.#.', '###', '.#.'] }),
    level({ n: 3, front: ['###', '.#.', '.#.'], side: ['###', '.#.', '.#.'] }),
    level({ n: 3, front: ['#.#', '###', '#.#'], top: ['###', '#.#', '###'] }),
  ],
  // II · Cast: look straight down an axis and carve through
  [
    level({ n: 4, front: ['####', '#..#', '#..#', '####'] }),
    level({ n: 4, front: ['#...', '#...', '#...', '####'], side: ['...#', '...#', '...#', '####'] }),
    level({
      n: 5,
      front: ['#####', '#...#', '#.#.#', '#...#', '#####'],
      top: ['#####', '#####', '#...#', '#####', '#####'],
    }),
    level({
      n: 5,
      front: ['..#..', '.###.', '#####', '.###.', '..#..'],
      side: ['..#..', '.###.', '#####', '.###.', '..#..'],
    }),
    level({
      n: 5,
      front: ['#.#.#', '#####', '#.#.#', '#####', '#.#.#'],
      side: ['#####', '#...#', '#####', '#...#', '#####'],
    }),
    level({
      n: 5,
      front: ['#####', '..#..', '..#..', '..#..', '..#..'],
      side: ['#####', '#...#', '#...#', '#...#', '#####'],
    }),
  ],
  // III · Plug: circle, square and triangle at once
  [
    level({ n: 5, side: triangle(5), top: disk(5) }),
    level({ n: 7, side: triangle(7), top: disk(7) }),
    level({ n: 7, front: disk(7), side: triangle(7) }),
    level({ n: 7, front: triangle(7), top: disk(7) }),
    level({ n: 7, front: disk(7), side: disk(7), top: disk(7) }),
  ],
  // IV · Sparse: the same shadows with as few cubes as possible
  [
    level({ n: 3, cubes: 9 }),
    level({ n: 3, front: ['###', '#.#', '###'], side: ['###', '#.#', '###'], cubes: 9 }),
    level({ n: 4, cubes: 16 }),
    level({ n: 4, front: ['#..#', '.##.', '.##.', '#..#'], cubes: 16 }),
    level({
      n: 4,
      front: ['####', '#..#', '#..#', '####'],
      side: ['####', '#..#', '#..#', '####'],
      top: ['####', '#..#', '#..#', '####'],
      cubes: 12,
    }),
  ],
  // V · 形
  [
    level({ n: 5, front: LETTERS.F, side: LETTERS.O }),
    level({ n: 5, front: LETTERS.R, side: LETTERS.M }),
    level({ n: 5, front: LETTERS.A, top: disk(5) }),
    level({ n: 9, front: FORM, top: disk(9) }),
  ],
];
