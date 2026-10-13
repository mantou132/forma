import assert from 'node:assert/strict';
import { test } from 'node:test';

import { centroid } from '../src/model/geometry.ts';
import {
  applyFlip,
  type Box,
  distance,
  emptyHeights,
  flips,
  isPartition,
  surface,
  walkPath,
} from '../src/model/partition.ts';
import { countTypes, isTileable, parseArt, rhombusKind, triAt, triKey, triNeighbours } from '../src/model/region.ts';

const box: Box = { a: 3, b: 2, c: 4 };
const stack = [
  [3, 1],
  [2, 1],
  [1, 0],
];

/** Triangles covered by a face, found by sampling inside each half of the rhombus */
const faceTris = (points: [number, number][]) => {
  const [cx, cy] = centroid(points);
  return points
    .map(([x, y]) => triKey(triAt([cx + (x - cx) * 0.5, cy + (y - cy) * 0.5])))
    .filter((k, i, all) => all.indexOf(k) === i);
};

test('surface has ab + bc + ca rhombi that tile without overlap', () => {
  const faces = surface(box, stack);
  const count = (kind: string) => faces.filter((f) => f.kind === kind).length;
  assert.equal(count('t'), box.a * box.b);
  assert.equal(count('r'), box.b * box.c);
  assert.equal(count('l'), box.a * box.c);
  const tris = faces.flatMap((f) => faceTris(f.points));
  assert.equal(tris.length, faces.length * 2);
  assert.equal(new Set(tris).size, tris.length);
  for (const face of faces) {
    const [a, b] = faceTris(face.points).map((k) => k.split(',').map(Number));
    const kind = rhombusKind({ u: a[0], v: a[1], d: a[2] as 0 | 1 }, { u: b[0], v: b[1], d: b[2] as 0 | 1 });
    assert.equal(kind, face.kind);
  }
});

test('every flip keeps a valid stack and is undone by the opposite flip', () => {
  for (const flip of flips(box, stack)) {
    const next = applyFlip(stack, flip);
    assert.ok(isPartition(box, next));
    assert.equal(distance(stack, next), 1);
    assert.deepEqual(applyFlip(next, { ...flip, add: !flip.add }), stack);
  }
  assert.deepEqual(
    flips(box, emptyHeights(box)).map(({ i, j, add }) => [i, j, add]),
    [[0, 0, true]],
  );
});

test('flip centres are the centres of the three rhombi they turn', () => {
  const before = surface(box, stack).map((f) => centroid(f.points));
  for (const flip of flips(box, stack)) {
    const near = before.filter(([x, y]) => Math.hypot(x - flip.center[0], y - flip.center[1]) < 12);
    assert.equal(near.length, 3);
  }
});

test('neighbours are symmetric', () => {
  const tri = { u: 2, v: -1, d: 0 as const };
  for (const [n] of triNeighbours(tri)) {
    assert.ok(triNeighbours(n).some(([m]) => triKey(m) === triKey(tri)));
  }
});

test('tileability follows counting and matching', () => {
  const column = parseArt(['#', '#', '#', '#']);
  assert.deepEqual(countTypes(column), { right: 2, left: 2 });
  assert.ok(isTileable(column));
  assert.ok(!isTileable(parseArt(['#', '#', '#'])));
});

test('the point walks only over steps of one cube', () => {
  assert.deepEqual(walkPath(box, stack, [2, 1], [0, 1]), [
    [2, 1],
    [1, 1],
    [0, 1],
  ]);
  const cliff = [
    [3, 1],
    [1, 1],
    [1, 0],
  ];
  assert.equal(walkPath(box, cliff, [2, 1], [0, 0]), undefined);
});
