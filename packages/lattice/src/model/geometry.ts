/** Isometric projection shared by every Lattice view: x runs down-right, y down-left, z up; unit edge is 20 */
export const SQ = 17.3205;

export type Point = [number, number];

export const project = (x: number, y: number, z: number): Point => [SQ * (x - y), 10 * (x + y) - 20 * z];

/** Rhombus kinds are the three cube faces: top, right (+x) and left (+y) */
export type FaceKind = 't' | 'r' | 'l';

export const centroid = (points: Point[]): Point => [
  points.reduce((s, [x]) => s + x, 0) / points.length,
  points.reduce((s, [, y]) => s + y, 0) / points.length,
];

export const pointsAttr = (points: Point[]) => points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

export const bounds = (points: Point[], pad = 0) => {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  return { x: minX, y: minY, width: Math.max(...xs) + pad - minX, height: Math.max(...ys) + pad - minY };
};
