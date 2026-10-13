import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LEVELS } from '../src/model/levels.ts';
import { carve, count, fullBlock, hull, lineOf, pixelOf, shadow, solved, VIEWS, voxelAt } from '../src/model/voxels.ts';

/** Fewest cubes inside the hull whose shadows cover every target pixel (depth-first with a pixel-count bound) */
const minCubes = (level: (typeof LEVELS)[number][number]) => {
  const { n, targets } = level;
  const block = hull(n, targets);
  const cubes = [...block.keys()].filter((i) => block[i]);
  const pixels = (i: number) =>
    VIEWS.map((view, v) => {
      const [col, row] = pixelOf(n, view, voxelAt(n, i));
      return v * n * n + col + n * row;
    });
  const need = new Set(
    VIEWS.flatMap((view, v) => [...targets[view].keys()].filter((p) => targets[view][p]).map((p) => v * n * n + p)),
  );
  let best = cubes.length;
  const covered = new Map<number, number>();
  const search = (used: number) => {
    const open = [...need].filter((p) => !covered.get(p));
    if (!open.length) {
      best = Math.min(best, used);
      return;
    }
    if (used + Math.ceil(open.length / 3) >= best) return;
    const pixel = open[0];
    for (const cube of cubes.filter((c) => pixels(c).includes(pixel))) {
      for (const p of pixels(cube)) covered.set(p, (covered.get(p) || 0) + 1);
      search(used + 1);
      for (const p of pixels(cube)) covered.set(p, covered.get(p)! - 1);
    }
  };
  search(0);
  return best;
};

test('every level is solvable by carving straight through', () => {
  for (const level of LEVELS.flat()) {
    const { n, targets } = level;
    let voxels = fullBlock(n);
    for (const view of VIEWS) {
      for (let p = 0; p < n * n; p++) if (!targets[view][p]) voxels = carve(n, voxels, view, p % n, Math.floor(p / n));
    }
    assert.deepEqual(voxels, hull(n, targets));
    for (const view of VIEWS) assert.deepEqual(shadow(n, voxels, view), targets[view]);
    if (level.cubes === undefined) assert.ok(solved(n, voxels, targets));
  }
});

test('line of sight covers exactly one pixel', () => {
  const n = 4;
  for (const view of VIEWS) {
    const line = lineOf(n, view, 1, 2);
    assert.ok(line.every((i) => pixelOf(n, view, voxelAt(n, i)).join() === '1,2'));
  }
});

test('sparse levels ask for exactly the fewest cubes', () => {
  for (const level of LEVELS.flat()) {
    if (level.cubes === undefined) continue;
    assert.equal(minCubes(level), level.cubes, `n=${level.n}`);
    assert.ok(count(hull(level.n, level.targets)) > level.cubes);
  }
});
