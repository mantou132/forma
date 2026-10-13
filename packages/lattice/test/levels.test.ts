import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LEVELS, type PathLevel } from '../src/model/levels.ts';
import { applyFlip, distance, flips, type Heights, isPartition, walkPath } from '../src/model/partition.ts';
import { countTypes, isTileable } from '../src/model/region.ts';

/** Breadth-first search over stacks for the fewest flips that open a walk to the exit */
const solvePath = ({ box, start, from, to }: PathLevel) => {
  const done = (h: Heights) => h[to[0]][to[1]] === to[2] && !!walkPath(box, h, from, [to[0], to[1]]);
  const seen = new Set([JSON.stringify(start)]);
  let frontier = [start];
  for (let depth = 0; frontier.length; depth++) {
    if (frontier.some(done)) return depth;
    const next: Heights[] = [];
    for (const h of frontier) {
      for (const flip of flips(box, h)) {
        // The point rides its own column, so flipping it is allowed; it only has to end on a walkable path
        const key = JSON.stringify(applyFlip(h, flip));
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(JSON.parse(key));
      }
    }
    frontier = next;
  }
};

test('match levels are valid and not already solved', () => {
  for (const chapter of LEVELS) {
    for (const level of chapter) {
      if (level.kind !== 'match') continue;
      assert.ok(isPartition(level.box, level.start));
      assert.ok(isPartition(level.box, level.target));
      assert.ok(distance(level.start, level.target) > 0);
    }
  }
});

test('path levels are solvable in exactly par flips', () => {
  for (const level of LEVELS.flat()) {
    if (level.kind !== 'path') continue;
    assert.ok(isPartition(level.box, level.start));
    assert.equal(solvePath(level), level.par, JSON.stringify(level.start));
  }
});

test('regions are impossible exactly when the triangle counts differ', () => {
  const summary = LEVELS.flat()
    .filter((level) => level.kind === 'region')
    .map(({ region }) => {
      const { right, left } = countTypes(region);
      const tileable = isTileable(region);
      assert.equal(tileable, right === left);
      return `${right}/${left}${tileable ? '' : ' impossible'}`;
    });
  console.log(summary.join(', '));
});

test('match levels report their par', () => {
  console.log(
    LEVELS.map((chapter) =>
      chapter.map((level) => (level.kind === 'match' ? distance(level.start, level.target) : level.kind)).join(' '),
    ).join(' | '),
  );
});
