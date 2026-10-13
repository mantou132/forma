/**
 * A floor plan in which dots move one cell per tick. Cells are `x + width * y`;
 * `#` is a wall, `.` floor and a space is outside the board.
 */
export type Board = {
  width: number;
  height: number;
  floor: boolean[];
  /** Drawn walls; spaces are simply not part of the board */
  wall: boolean[];
};

export type Mover = { from: number; to: number };

/** A patrol walks a fixed loop forever: its position at tick t is `loop[t % loop.length]` */
export type Drone = { loop: number[] };

export const parseBoard = (rows: string[]): Board => {
  const width = Math.max(...rows.map((row) => row.length));
  const cells = rows.flatMap((row) => Array.from({ length: width }, (_, x) => row[x]));
  return { width, height: rows.length, floor: cells.map((c) => c === '.'), wall: cells.map((c) => c === '#') };
};

export const cellOf = ({ width }: Board, x: number, y: number) => x + width * y;

export const xyOf = ({ width }: Board, cell: number): [number, number] => [cell % width, Math.floor(cell / width)];

export const isFloor = (board: Board, x: number, y: number) =>
  x >= 0 && y >= 0 && x < board.width && y < board.height && board.floor[cellOf(board, x, y)];

const STEPS: Record<string, [number, number]> = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0], W: [0, 0] };

export const neighbours = (board: Board, cell: number) => {
  const [x, y] = xyOf(board, cell);
  return ['U', 'D', 'L', 'R']
    .map((d) => [x + STEPS[d][0], y + STEPS[d][1]] as const)
    .filter(([nx, ny]) => isFloor(board, nx, ny))
    .map(([nx, ny]) => cellOf(board, nx, ny));
};

export const adjacent = (board: Board, a: number, b: number) => neighbours(board, a).includes(b);

/** Loop written as moves from a start cell, e.g. `RRLL`; `W` waits a tick */
export const parseDrone = (board: Board, [x, y]: [number, number], moves: string): Drone => {
  const loop: number[] = [];
  let [cx, cy] = [x, y];
  for (const move of moves) {
    loop.push(cellOf(board, cx, cy));
    cx += STEPS[move][0];
    cy += STEPS[move][1];
  }
  return { loop };
};

/** Shortest walk ignoring everyone else; used to show how much time is left and to prune searches */
export const distances = (board: Board, to: number) => {
  const dist = new Map([[to, 0]]);
  const queue = [to];
  while (queue.length) {
    const cell = queue.shift()!;
    for (const next of neighbours(board, cell)) {
      if (dist.has(next)) continue;
      dist.set(next, dist.get(cell)! + 1);
      queue.push(next);
    }
  }
  return dist;
};
