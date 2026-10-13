import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cellOf, parseBoard, parseDrone } from '../src/model/board.ts';
import { addWait, arrival, drawTo, emptyRoute, evaluate, stepAt, timeline } from '../src/model/plan.ts';

const board = parseBoard(['....', '.#..']);
const at = (x: number, y: number) => cellOf(board, x, y);

test('a route walks one cell per tick, waits in place, then stays home', () => {
  const route = addWait({ cells: [at(0, 0), at(1, 0), at(2, 0)], waits: [0, 0, 0] }, 1);
  assert.deepEqual(timeline(route, 5), [at(0, 0), at(1, 0), at(1, 0), at(2, 0), at(2, 0), at(2, 0)]);
  assert.equal(arrival(route), 3);
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((t) => stepAt(route, t)),
    [0, 1, 1, 2, 2],
  );
});

test('drawing extends to neighbours, steps back over the previous cell, and never crosses itself', () => {
  const start = emptyRoute({ from: at(0, 0), to: at(3, 0) });
  const one = drawTo(board, start, at(1, 0))!;
  const two = drawTo(board, one, at(2, 0))!;
  assert.deepEqual(drawTo(board, two, at(1, 0)), one);
  assert.equal(drawTo(board, two, at(0, 0)), undefined);
  assert.equal(drawTo(board, one, at(1, 1)), undefined);
  assert.equal(drawTo(board, one, at(3, 0)), undefined);
});

test('two dots passing through each other collide, a rotation does not', () => {
  const movers = [
    { from: at(0, 0), to: at(1, 0) },
    { from: at(1, 0), to: at(0, 0) },
  ];
  const swap = evaluate(
    movers,
    [
      { cells: [at(0, 0), at(1, 0)], waits: [0, 0] },
      { cells: [at(1, 0), at(0, 0)], waits: [0, 0] },
    ],
    [],
    2,
  );
  assert.deepEqual(
    swap.collisions.map((c) => c.kind),
    ['swap'],
  );
  const square = parseBoard(['..', '..']);
  const c = (x: number, y: number) => cellOf(square, x, y);
  const ring = [c(0, 0), c(1, 0), c(1, 1), c(0, 1)];
  const rotation = evaluate(
    ring.map((from, i) => ({ from, to: ring[(i + 1) % 4] })),
    ring.map((from, i) => ({ cells: [from, ring[(i + 1) % 4]], waits: [0, 0] })),
    [],
    1,
  );
  assert.ok(rotation.solved);
});

test('patrols collide like dots and keep looping', () => {
  const drone = parseDrone(board, [2, 1], 'UD');
  assert.deepEqual(drone.loop, [at(2, 1), at(2, 0)]);
  const result = evaluate(
    [{ from: at(1, 0), to: at(3, 0) }],
    [{ cells: [at(1, 0), at(2, 0), at(3, 0)], waits: [0, 0, 0] }],
    [drone],
    3,
  );
  assert.deepEqual(
    result.collisions.map(({ t, kind }) => [t, kind]),
    [[1, 'cell']],
  );
});
