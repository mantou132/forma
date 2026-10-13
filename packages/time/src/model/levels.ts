import { type Board, cellOf, type Drone, type Mover, parseBoard, parseDrone } from './board.ts';

export type TimeLevel = {
  board: Board;
  movers: Mover[];
  drones: Drone[];
  /** Every dot must be home by this tick: the ceiling of the spacetime box */
  ticks: number;
  /** Fewest total waits, verified by `test/levels.test.ts` */
  par: number;
};

type LevelSpec = {
  map: string[];
  /** `[fromX, fromY, toX, toY]` */
  movers: [number, number, number, number][];
  /** Start cell and a loop of moves (`U D L R W`) */
  drones?: [[number, number], string][];
  ticks: number;
  par: number;
};

const level = ({ map, movers, drones = [], ticks, par }: LevelSpec): TimeLevel => {
  const board = parseBoard(map);
  return {
    board,
    movers: movers.map(([fx, fy, tx, ty]) => ({ from: cellOf(board, fx, fy), to: cellOf(board, tx, ty) })),
    drones: drones.map(([at, loop]) => parseDrone(board, at, loop)),
    ticks,
    par,
  };
};

const PLUS = ['##.##', '##.##', '.....', '##.##', '##.##'];
const LADDER = ['.......', '.#.#.#.', '.......'];

/** 形: 开 on the left is one connected street plan; each stroke of 彡 is its own lane */
const FORM = [
  '.....   .. ',
  ' . .   ..  ',
  ' . .   . ..',
  '.....   .. ',
  ' . .   .. .',
  ' . .   . ..',
  '.. .    .. ',
  '.  .   ..  ',
  '.  .  ..   ',
];

export const LEVELS: TimeLevel[][] = [
  // I · Now: only the map; play it and watch
  [
    level({ map: ['.....'], movers: [[0, 0, 4, 0]], ticks: 5, par: 0 }),
    level({
      map: ['.....', '.#.#.', '.....'],
      movers: [
        [0, 0, 4, 2],
        [0, 2, 4, 0],
      ],
      ticks: 7,
      par: 0,
    }),
    level({
      map: ['#.#', '...', '#.#'],
      movers: [
        [0, 1, 2, 1],
        [1, 0, 1, 2],
      ],
      ticks: 4,
      par: 1,
    }),
    level({
      map: PLUS,
      movers: [
        [0, 2, 4, 2],
        [2, 0, 2, 4],
      ],
      ticks: 6,
      par: 1,
    }),
    level({
      map: ['...', '...', '...'],
      movers: [
        [0, 0, 2, 2],
        [2, 0, 0, 2],
        [1, 2, 1, 0],
      ],
      ticks: 5,
      par: 0,
    }),
    level({
      map: ['###.###', '.......'],
      movers: [
        [0, 1, 6, 1],
        [3, 0, 0, 1],
      ],
      ticks: 8,
      par: 3,
    }),
  ],
  // II · Then: time rises as the third direction
  [
    level({
      map: PLUS,
      movers: [
        [0, 2, 4, 2],
        [2, 0, 2, 4],
        [4, 2, 2, 0],
      ],
      ticks: 6,
      par: 3,
    }),
    level({
      map: ['#.#.#', '.....', '#.#.#'],
      movers: [
        [0, 1, 4, 1],
        [1, 0, 1, 2],
        [3, 2, 3, 0],
      ],
      ticks: 4,
      par: 1,
    }),
    level({
      map: ['#.#.#', '.....', '#.#.#', '.....', '#.#.#'],
      movers: [
        [0, 1, 4, 1],
        [0, 3, 4, 3],
        [1, 0, 1, 4],
        [3, 4, 3, 0],
      ],
      ticks: 5,
      par: 1,
    }),
    level({
      map: ['.....', '.###.', '.....'],
      movers: [
        [0, 1, 4, 1],
        [4, 1, 0, 1],
      ],
      ticks: 6,
      par: 0,
    }),
    level({
      map: ['..#..', '.....', '..#..'],
      movers: [
        [0, 0, 4, 2],
        [4, 0, 0, 2],
        [0, 2, 4, 0],
      ],
      ticks: 10,
      par: 3,
    }),
    level({
      map: ['.....', '.###.', '.###.', '.....'],
      movers: [
        [0, 0, 4, 3],
        [4, 3, 0, 0],
        [4, 0, 0, 3],
        [0, 3, 4, 0],
      ],
      ticks: 7,
      par: 0,
    }),
  ],
  // III · Narrow: one lane, so someone has to step aside first
  [
    level({
      map: ['##..##', '......'],
      movers: [
        [0, 1, 5, 1],
        [5, 1, 0, 1],
      ],
      ticks: 7,
      par: 0,
    }),
    level({
      map: ['#...#', '.....', '.....'],
      movers: [
        [0, 1, 4, 1],
        [4, 1, 0, 1],
        [0, 2, 4, 2],
      ],
      ticks: 6,
      par: 0,
    }),
    level({
      map: ['...', '.#.', '...'],
      movers: [
        [0, 0, 2, 2],
        [2, 2, 0, 0],
        [2, 0, 0, 2],
      ],
      ticks: 4,
      par: 0,
    }),
    level({
      map: ['##..##', '......', '##..##'],
      movers: [
        [0, 1, 5, 1],
        [5, 1, 0, 1],
        [2, 0, 3, 2],
      ],
      ticks: 7,
      par: 0,
    }),
    level({
      map: ['......', '.####.', '......'],
      movers: [
        [0, 0, 5, 2],
        [5, 2, 0, 0],
        [0, 2, 5, 0],
      ],
      ticks: 7,
      par: 0,
    }),
    level({
      map: ['#..#..#', '.......'],
      movers: [
        [0, 1, 6, 1],
        [6, 1, 0, 1],
        [3, 1, 1, 0],
      ],
      ticks: 9,
      par: 1,
    }),
  ],
  // IV · Patrol: moving walls are still walls in spacetime
  [
    level({ map: ['#.#', '...', '#.#'], movers: [[0, 1, 2, 1]], drones: [[[1, 0], 'DDUU']], ticks: 3, par: 1 }),
    level({
      map: ['#.#.#', '.....', '#.#.#'],
      movers: [[0, 1, 4, 1]],
      drones: [
        [[1, 0], 'DDUU'],
        [[3, 2], 'UUDD'],
      ],
      ticks: 5,
      par: 1,
    }),
    level({
      map: LADDER,
      movers: [
        [0, 0, 6, 0],
        [6, 0, 0, 0],
      ],
      drones: [
        [[2, 0], 'DDUU'],
        [[4, 2], 'UUDD'],
      ],
      ticks: 10,
      par: 1,
    }),
    level({
      map: ['#...#', '.....', '#...#'],
      movers: [[0, 1, 4, 1]],
      drones: [
        [[1, 0], 'DDUU'],
        [[2, 2], 'UUDD'],
        [[3, 0], 'DDUU'],
      ],
      ticks: 7,
      par: 1,
    }),
    level({
      map: LADDER,
      movers: [
        [0, 1, 6, 1],
        [6, 1, 0, 1],
      ],
      drones: [
        [[2, 0], 'DDUU'],
        [[4, 2], 'UUDD'],
      ],
      ticks: 8,
      par: 0,
    }),
    level({
      map: ['#.#.#.#', '.......', '#.#.#.#'],
      movers: [[0, 1, 6, 1]],
      drones: [
        [[1, 0], 'DDUU'],
        [[3, 1], 'DUUD'],
        [[5, 2], 'UUDD'],
      ],
      ticks: 9,
      par: 3,
    }),
  ],
  // V · 形
  [
    level({
      map: ['.......', '.#.#.#.', '.......'],
      movers: [
        [0, 0, 6, 2],
        [6, 0, 0, 2],
        [0, 2, 6, 0],
        [6, 2, 0, 0],
      ],
      ticks: 8,
      par: 0,
    }),
    level({
      map: ['#.#.#', '.....', '#.#.#', '.....', '#.#.#'],
      movers: [
        [0, 1, 4, 3],
        [4, 3, 0, 1],
        [1, 0, 3, 4],
        [3, 4, 1, 0],
      ],
      ticks: 7,
      par: 2,
    }),
    level({
      map: LADDER,
      movers: [
        [0, 0, 6, 2],
        [6, 0, 0, 2],
        [0, 2, 6, 0],
      ],
      drones: [
        [[2, 0], 'DDUU'],
        [[4, 2], 'UUDD'],
      ],
      ticks: 9,
      par: 2,
    }),
    level({
      map: FORM,
      movers: [
        [0, 8, 4, 0],
        [4, 0, 0, 8],
        [3, 8, 0, 3],
        [9, 0, 7, 2],
        [10, 2, 7, 5],
        [10, 4, 6, 8],
      ],
      ticks: 13,
      par: 2,
    }),
  ],
];
