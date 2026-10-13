import { type FaceKind, type Point, project } from './geometry.ts';

/**
 * A rhombus tiling of a hexagon with sides a, b, c is a stack of cubes in an a × b × c corner (a plane partition).
 * `Heights[i][j]` is the column height; heights never increase away from the corner.
 */
export type Box = { a: number; b: number; c: number };
export type Heights = number[][];

export type Face = {
  kind: FaceKind;
  points: Point[];
};

/** Height with the two back walls (height c) and the open front (height 0) around the box */
const heightAt = (box: Box, h: Heights, i: number, j: number) => {
  if (i < 0 || j < 0) return box.c;
  if (i >= box.a || j >= box.b) return 0;
  return h[i][j];
};

const quad = (corners: [number, number, number][]) => corners.map(([x, y, z]) => project(x, y, z));

/** Every visible face of the stepped surface: exactly ab top, bc right and ca left rhombi */
export const surface = (box: Box, h: Heights): Face[] => {
  const faces: Face[] = [];
  for (let i = 0; i < box.a; i++) {
    for (let j = 0; j < box.b; j++) {
      const z = h[i][j];
      faces.push({
        kind: 't',
        points: quad([
          [i, j, z],
          [i + 1, j, z],
          [i + 1, j + 1, z],
          [i, j + 1, z],
        ]),
      });
    }
  }
  for (let i = -1; i < box.a; i++) {
    for (let j = 0; j < box.b; j++) {
      for (let k = heightAt(box, h, i + 1, j); k < heightAt(box, h, i, j); k++) {
        faces.push({
          kind: 'r',
          points: quad([
            [i + 1, j, k],
            [i + 1, j + 1, k],
            [i + 1, j + 1, k + 1],
            [i + 1, j, k + 1],
          ]),
        });
      }
    }
  }
  for (let j = -1; j < box.b; j++) {
    for (let i = 0; i < box.a; i++) {
      for (let k = heightAt(box, h, i, j + 1); k < heightAt(box, h, i, j); k++) {
        faces.push({
          kind: 'l',
          points: quad([
            [i, j + 1, k],
            [i + 1, j + 1, k],
            [i + 1, j + 1, k + 1],
            [i, j + 1, k + 1],
          ]),
        });
      }
    }
  }
  return faces;
};

/** Outline of the hexagon, clockwise from the top corner */
export const outline = ({ a, b, c }: Box): Point[] => [
  project(0, 0, c),
  project(a, 0, c),
  project(a, 0, 0),
  project(a, b, 0),
  project(0, b, 0),
  project(0, b, c),
];

/** A flip turns one small hexagon of three rhombi; in 3D it adds or removes one cube */
export type Flip = {
  i: number;
  j: number;
  add: boolean;
  /** Centre of the small hexagon on screen */
  center: Point;
};

export const canAdd = (box: Box, h: Heights, i: number, j: number) => {
  const z = h[i][j];
  return z < box.c && heightAt(box, h, i - 1, j) > z && heightAt(box, h, i, j - 1) > z;
};

export const canRemove = (box: Box, h: Heights, i: number, j: number) => {
  const z = h[i][j];
  return z > 0 && heightAt(box, h, i + 1, j) < z && heightAt(box, h, i, j + 1) < z;
};

export const flips = (box: Box, h: Heights): Flip[] => {
  const result: Flip[] = [];
  for (let i = 0; i < box.a; i++) {
    for (let j = 0; j < box.b; j++) {
      const z = h[i][j];
      if (canAdd(box, h, i, j)) result.push({ i, j, add: true, center: project(i, j, z) });
      if (canRemove(box, h, i, j)) result.push({ i, j, add: false, center: project(i + 1, j + 1, z) });
    }
  }
  return result;
};

export const applyFlip = (h: Heights, { i, j, add }: Pick<Flip, 'i' | 'j' | 'add'>): Heights =>
  h.map((row, r) => (r === i ? row.map((z, c) => (c === j ? z + (add ? 1 : -1) : z)) : row));

/** Fewest flips between two stacks: every cube that differs costs exactly one flip */
export const distance = (from: Heights, to: Heights) =>
  from.reduce((sum, row, i) => sum + row.reduce((s, z, j) => s + Math.abs(z - to[i][j]), 0), 0);

export const equal = (x: Heights, y: Heights) => distance(x, y) === 0;

export const isPartition = (box: Box, h: Heights) =>
  h.length === box.a &&
  h.every(
    (row, i) =>
      row.length === box.b &&
      row.every((z, j) => z >= 0 && z <= box.c && z <= heightAt(box, h, i - 1, j) && z <= heightAt(box, h, i, j - 1)),
  );

export const emptyHeights = ({ a, b }: Box): Heights => Array.from({ length: a }, () => Array(b).fill(0));

/** Cells the point can step between: orthogonal neighbours at most one cube apart */
export const walkPath = (box: Box, h: Heights, from: [number, number], to: [number, number]) => {
  const key = (i: number, j: number) => i * box.b + j;
  const prev = new Map<number, number>([[key(...from), -1]]);
  const queue: [number, number][] = [from];
  while (queue.length) {
    const [i, j] = queue.shift()!;
    if (i === to[0] && j === to[1]) {
      const path: [number, number][] = [];
      for (let k = key(i, j); k !== -1; k = prev.get(k)!) path.unshift([Math.floor(k / box.b), k % box.b]);
      return path;
    }
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const [ni, nj] = [i + di, j + dj];
      if (ni < 0 || nj < 0 || ni >= box.a || nj >= box.b || prev.has(key(ni, nj))) continue;
      if (Math.abs(h[ni][nj] - h[i][j]) > 1) continue;
      prev.set(key(ni, nj), key(i, j));
      queue.push([ni, nj]);
    }
  }
};

/** Screen position of the point standing on top of column (i, j) */
export const topCenter = (i: number, j: number, z: number) => project(i + 0.5, j + 0.5, z);
