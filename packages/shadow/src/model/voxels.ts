/**
 * An N × N × N block of cubes and its three shadows. Each view is what a camera on that axis sees:
 * front looks down -z (x right, y up), side looks down -x (-z right, y up), top looks down -y (x right, -z up).
 * Shadow pixels are `col + N * row`, row 0 at the top of the view.
 */
export type View = 'front' | 'side' | 'top';

export const VIEWS: View[] = ['front', 'side', 'top'];

export type Voxels = Uint8Array;
export type Bitmap = Uint8Array;

export const voxelIndex = (n: number, x: number, y: number, z: number) => x + n * (y + n * z);

export const voxelAt = (n: number, index: number): [number, number, number] => [
  index % n,
  Math.floor(index / n) % n,
  Math.floor(index / (n * n)),
];

/** Pixel a cube falls on in a view */
export const pixelOf = (n: number, view: View, [x, y, z]: [number, number, number]): [number, number] => {
  switch (view) {
    case 'front':
      return [x, n - 1 - y];
    case 'side':
      return [n - 1 - z, n - 1 - y];
    case 'top':
      return [x, z];
  }
};

/** Every cube on the line of sight through a pixel */
export const lineOf = (n: number, view: View, col: number, row: number) =>
  Array.from({ length: n }, (_, d) => {
    if (view === 'front') return voxelIndex(n, col, n - 1 - row, d);
    if (view === 'side') return voxelIndex(n, d, n - 1 - row, n - 1 - col);
    return voxelIndex(n, col, d, row);
  });

export const fullBlock = (n: number): Voxels => new Uint8Array(n ** 3).fill(1);

export const count = (voxels: Voxels) => voxels.reduce((sum, v) => sum + v, 0);

export const shadow = (n: number, voxels: Voxels, view: View): Bitmap => {
  const bitmap = new Uint8Array(n * n);
  voxels.forEach((v, i) => {
    if (!v) return;
    const [col, row] = pixelOf(n, view, voxelAt(n, i));
    bitmap[col + n * row] = 1;
  });
  return bitmap;
};

export const sameBitmap = (a: Bitmap, b: Bitmap) => a.every((v, i) => v === b[i]);

/** Looking straight down a view, one carve empties the whole line */
export const carve = (n: number, voxels: Voxels, view: View, col: number, row: number) => {
  const next = voxels.slice();
  for (const i of lineOf(n, view, col, row)) next[i] = 0;
  return next;
};

export const pluck = (voxels: Voxels, index: number) => {
  const next = voxels.slice();
  next[index] = 0;
  return next;
};

/** Largest object casting (at most) the given shadows: the intersection of their extrusions */
export const hull = (n: number, targets: Record<View, Bitmap>): Voxels => {
  const voxels = new Uint8Array(n ** 3);
  for (let i = 0; i < voxels.length; i++) {
    const cube = voxelAt(n, i);
    voxels[i] = VIEWS.every((view) => {
      const [col, row] = pixelOf(n, view, cube);
      return targets[view][col + n * row];
    })
      ? 1
      : 0;
  }
  return voxels;
};

/** Text rows to a bitmap, `#` filled; missing rows or columns stay empty */
export const parseBitmap = (n: number, rows: string[]): Bitmap => {
  const bitmap = new Uint8Array(n * n);
  rows.forEach((line, row) => {
    [...line].forEach((char, col) => {
      if (char === '#' && col < n && row < n) bitmap[col + n * row] = 1;
    });
  });
  return bitmap;
};

export const solved = (n: number, voxels: Voxels, targets: Record<View, Bitmap>, maxCubes?: number) =>
  VIEWS.every((view) => sameBitmap(shadow(n, voxels, view), targets[view])) &&
  (maxCubes === undefined || count(voxels) <= maxCubes);
