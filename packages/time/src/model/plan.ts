import { adjacent, type Board, type Drone, type Mover } from './board.ts';

/**
 * What the player draws: the cells a dot walks through (starting at its own cell) and how many ticks it waits
 * on each of them before moving on. A dot that reaches the end of its route stays there.
 */
export type Route = { cells: number[]; waits: number[] };

export const emptyRoute = (mover: Mover): Route => ({ cells: [mover.from], waits: [0] });

/** Position of a dot at every tick from 0 to `ticks` */
export const timeline = ({ cells, waits }: Route, ticks: number) => {
  const positions: number[] = [];
  cells.forEach((cell, i) => {
    for (let w = 0; w <= waits[i]; w++) positions.push(cell);
  });
  // The last cell's own entry plus its waits are already in; stay there for the rest of time
  while (positions.length <= ticks) positions.push(cells.at(-1)!);
  return positions.slice(0, ticks + 1);
};

/** Tick at which the route ends, i.e. when the dot arrives if the route ends on its goal */
export const arrival = ({ cells, waits }: Route) => cells.length - 1 + waits.slice(0, -1).reduce((s, w) => s + w, 0);

export const dronePosition = ({ loop }: Drone, t: number) => loop[t % loop.length];

export type Collision = {
  t: number;
  /** Cell where they meet; for a swap, the cell the first one moves into */
  cell: number;
  /** Indices into movers; drones follow after the movers */
  who: number[];
  /** `swap` means two dots pass through each other between t - 1 and t */
  kind: 'cell' | 'swap';
};

export type Evaluation = {
  collisions: Collision[];
  /** Arrival tick per mover, or undefined when its route doesn't reach its goal */
  arrivals: (number | undefined)[];
  /** Every dot home in time with no collision */
  solved: boolean;
};

export const evaluate = (movers: Mover[], routes: Route[], drones: Drone[], ticks: number): Evaluation => {
  const paths = [
    ...routes.map((route) => timeline(route, ticks)),
    ...drones.map((drone) => Array.from({ length: ticks + 1 }, (_, t) => dronePosition(drone, t))),
  ];
  const collisions: Collision[] = [];
  for (let t = 0; t <= ticks; t++) {
    const seen = new Map<number, number[]>();
    paths.forEach((path, i) => {
      seen.set(path[t], [...(seen.get(path[t]) || []), i]);
    });
    for (const [cell, who] of seen) {
      if (who.length > 1 && who.some((i) => i < routes.length)) collisions.push({ t, cell, who, kind: 'cell' });
    }
    if (!t) continue;
    for (let i = 0; i < paths.length; i++) {
      for (let j = i + 1; j < paths.length; j++) {
        if (i >= routes.length && j >= routes.length) continue;
        const [a0, a1, b0, b1] = [paths[i][t - 1], paths[i][t], paths[j][t - 1], paths[j][t]];
        if (a0 !== a1 && a0 === b1 && a1 === b0) collisions.push({ t, cell: a1, who: [i, j], kind: 'swap' });
      }
    }
  }
  const arrivals = routes.map((route, i) =>
    route.cells.at(-1) === movers[i].to && arrival(route) <= ticks ? arrival(route) : undefined,
  );
  return { collisions, arrivals, solved: !collisions.length && arrivals.every((a) => a !== undefined) };
};

export const totalWaits = (routes: Route[]) =>
  routes.reduce((sum, { waits }) => sum + waits.slice(0, -1).reduce((s, w) => s + w, 0), 0);

/** Extend a route by one cell, or step back if the cell is the previous one; anything else is ignored */
export const drawTo = (board: Board, route: Route, cell: number): Route | undefined => {
  const { cells, waits } = route;
  if (cells.length > 1 && cells.at(-2) === cell) return { cells: cells.slice(0, -1), waits: waits.slice(0, -1) };
  if (cells.includes(cell) || !adjacent(board, cells.at(-1)!, cell)) return undefined;
  return { cells: [...cells, cell], waits: [...waits, 0] };
};

export const addWait = (route: Route, step: number): Route => ({
  cells: route.cells,
  waits: route.waits.map((w, i) => (i === step ? w + 1 : w)),
});

/** Step of a route the dot occupies at tick t */
export const stepAt = ({ waits }: Route, t: number) => {
  let tick = 0;
  for (let i = 0; i < waits.length; i++) {
    tick += waits[i] + 1;
    if (t < tick) return i;
  }
  return waits.length - 1;
};
