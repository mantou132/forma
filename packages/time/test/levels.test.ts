import assert from 'node:assert/strict';
import { test } from 'node:test';

import { adjacent, distances } from '../src/model/board.ts';
import { LEVELS } from '../src/model/levels.ts';
import { evaluate, totalWaits } from '../src/model/plan.ts';
import { fewestWaits } from './solver.ts';

const all = LEVELS.flatMap((chapter, c) => chapter.map((level, l) => ({ level, name: `${c + 1}-${l + 1}` })));

test('patrol loops stay on the floor and close', () => {
  for (const { level, name } of all) {
    for (const { loop } of level.drones) {
      assert.ok(
        loop.every((cell) => level.board.floor[cell]),
        name,
      );
      loop.forEach((cell, i) => {
        const next = loop[(i + 1) % loop.length];
        assert.ok(cell === next || adjacent(level.board, cell, next), `${name} drone step ${i}`);
      });
    }
  }
});

test('every level is solvable in time with exactly par waits, and the solution plays back clean', () => {
  for (const { level, name } of all) {
    const { board, movers, drones, ticks, par } = level;
    const result = fewestWaits(board, movers, drones, ticks);
    assert.ok(result, `${name} unsolvable`);
    assert.equal(result.waits, par, `${name} par`);
    const playback = evaluate(movers, result.routes, drones, ticks);
    assert.ok(playback.solved, `${name} playback`);
    assert.equal(totalWaits(result.routes), par, `${name} drawn waits`);
  }
});

test('the ceiling is tight from chapter II on: one tick less and the level breaks or costs more', () => {
  for (const { level, name } of all.filter(({ name }) => !name.startsWith('1-'))) {
    const { board, movers, drones, ticks, par } = level;
    const shorter = fewestWaits(board, movers, drones, ticks - 1);
    assert.ok(!shorter || shorter.waits > par, name);
  }
});

test('every dot can reach home on its own', () => {
  for (const { level, name } of all) {
    for (const { from, to } of level.movers) assert.ok(distances(level.board, to).has(from), name);
  }
});
