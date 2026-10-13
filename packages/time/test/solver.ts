import { type Board, type Drone, distances, type Mover, neighbours } from '../src/model/board.ts';
import { dronePosition, type Route } from '../src/model/plan.ts';

/**
 * Fewest total waits for all dots to reach home by `ticks`, with routes that never revisit a cell
 * (exactly what the player can draw). Breadth-first over ticks, keeping the cheapest cost per joint state.
 */
const fewestWaitsJoint = (board: Board, movers: Mover[], drones: Drone[], ticks: number) => {
  const dist = movers.map(({ to }) => distances(board, to));
  type State = { pos: number[]; visited: bigint[]; cost: number; prev?: State };
  const key = ({ pos, visited }: State) => `${pos.join()}|${visited.join()}`;
  let layer = new Map<string, State>();
  const start: State = { pos: movers.map((m) => m.from), visited: movers.map((m) => 1n << BigInt(m.from)), cost: 0 };
  layer.set(key(start), start);
  for (let t = 0; t < ticks; t++) {
    const blocked = new Set(drones.map((d) => dronePosition(d, t + 1)));
    const dronesNow = drones.map((d) => [dronePosition(d, t), dronePosition(d, t + 1)]);
    const next = new Map<string, State>();
    for (const state of layer.values()) {
      const options = state.pos.map((p, i) => {
        if (p === movers[i].to) return [p];
        const moves = neighbours(board, p).filter(
          (n) => !(state.visited[i] & (1n << BigInt(n))) && (dist[i].get(n) ?? Infinity) <= ticks - t - 1,
        );
        return (dist[i].get(p) ?? Infinity) <= ticks - t - 1 ? [p, ...moves] : moves;
      });
      const combine = (i: number, chosen: number[]) => {
        if (i === options.length) {
          if (new Set(chosen).size < chosen.length || chosen.some((c) => blocked.has(c))) return;
          for (let a = 0; a < chosen.length; a++) {
            for (let b = a + 1; b < chosen.length; b++) {
              if (chosen[a] === state.pos[b] && chosen[b] === state.pos[a] && chosen[a] !== state.pos[a]) return;
            }
            for (const [d0, d1] of dronesNow) if (chosen[a] === d0 && d1 === state.pos[a] && d0 !== d1) return;
          }
          const waits = chosen.filter((c, k) => c === state.pos[k] && c !== movers[k].to).length;
          const n: State = {
            pos: chosen,
            visited: state.visited.map((v, k) => v | (1n << BigInt(chosen[k]))),
            cost: state.cost + waits,
            prev: state,
          };
          const k = key(n);
          if ((next.get(k)?.cost ?? Infinity) > n.cost) next.set(k, n);
          return;
        }
        for (const c of options[i]) combine(i + 1, [...chosen, c]);
      };
      combine(0, []);
    }
    layer = next;
  }
  const done = [...layer.values()].filter((s) => s.pos.every((p, i) => p === movers[i].to));
  if (!done.length) return undefined;
  const best = done.reduce((a, b) => (b.cost < a.cost ? b : a));
  const history: number[][] = [];
  for (let s: State | undefined = best; s; s = s.prev) history.unshift(s.pos);
  return { waits: best.cost, routes: movers.map((_, i) => toRoute(history.map((pos) => pos[i]))) };
};

/** Positions per tick back to the route the player would draw */
const toRoute = (positions: number[]): Route => {
  const route: Route = { cells: [positions[0]], waits: [0] };
  for (const p of positions.slice(1)) {
    if (p === route.cells.at(-1)) route.waits[route.waits.length - 1]++;
    else {
      route.cells.push(p);
      route.waits.push(0);
    }
  }
  route.waits[route.waits.length - 1] = 0;
  return route;
};

/** Dots on separate pieces of the floor never meet, so each piece is solved on its own and the waits add up */
export const fewestWaits = (board: Board, movers: Mover[], drones: Drone[], ticks: number) => {
  const piece = new Map<number, number>();
  board.floor.forEach((on, cell) => {
    if (!on || piece.has(cell)) return;
    for (const c of distances(board, cell).keys()) piece.set(c, cell);
  });
  const groups = new Map<number, Mover[]>();
  for (const mover of movers)
    groups.set(piece.get(mover.from)!, [...(groups.get(piece.get(mover.from)!) || []), mover]);
  let waits = 0;
  const routes = new Map<Mover, Route>();
  for (const [root, group] of groups) {
    const local = drones.filter(({ loop }) => piece.get(loop[0]) === root);
    const result = fewestWaitsJoint(board, group, local, ticks);
    if (!result) return undefined;
    waits += result.waits;
    group.forEach((mover, i) => {
      routes.set(mover, result.routes[i]);
    });
  }
  return { waits, routes: movers.map((mover) => routes.get(mover)!) };
};
