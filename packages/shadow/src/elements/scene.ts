import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  DirectionalLight,
  EdgesGeometry,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';

import { type Bitmap, pixelOf, shadow, VIEWS, type View, type Voxels, voxelAt } from '../model/voxels';

/** Camera framing: a direction from the centre plus a field of view; distance follows so the block keeps its size */
type Shot = { dir: Vector3; up: Vector3; fov: number };

const AXIS: Record<View, { dir: Vector3; up: Vector3 }> = {
  front: { dir: new Vector3(0, 0, 1), up: new Vector3(0, 1, 0) },
  side: { dir: new Vector3(1, 0, 0), up: new Vector3(0, 1, 0) },
  top: { dir: new Vector3(0, 1, 0), up: new Vector3(0, 0, -1) },
};

/** Nearly orthographic: a tiny field of view from far away flattens depth (a dolly zoom) */
const FLAT_FOV = 1.5;
const ORBIT_FOV = 32;

const COLORS = {
  cube: 0xf6ead8,
  edge: 0x3a2a14,
  wall: '#12142a',
  grid: 'rgba(236,237,245,0.07)',
  target: 'rgba(245,182,91,0.30)',
  cast: 'rgba(8,8,16,0.9)',
  castOk: '#c27a22',
  wrong: '#ef6f6c',
};

const TEXTURE = 512;

const drawWall = (ctx: CanvasRenderingContext2D, n: number, cast: Bitmap, target: Bitmap) => {
  const s = TEXTURE / n;
  ctx.clearRect(0, 0, TEXTURE, TEXTURE);
  ctx.fillStyle = COLORS.wall;
  ctx.globalAlpha = 0.92;
  ctx.fillRect(0, 0, TEXTURE, TEXTURE);
  ctx.globalAlpha = 1;
  for (let p = 0; p < n * n; p++) {
    const [x, y] = [(p % n) * s, Math.floor(p / n) * s];
    if (target[p]) {
      ctx.fillStyle = COLORS.target;
      ctx.fillRect(x, y, s, s);
    }
    if (cast[p]) {
      ctx.fillStyle = target[p] ? COLORS.castOk : COLORS.wrong;
      ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
    } else if (target[p]) {
      ctx.strokeStyle = COLORS.wrong;
      ctx.lineWidth = 6;
      ctx.strokeRect(x + 8, y + 8, s - 16, s - 16);
    }
  }
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 2;
  for (let i = 1; i < n; i++) {
    ctx.beginPath();
    ctx.moveTo(i * s, 0);
    ctx.lineTo(i * s, TEXTURE);
    ctx.moveTo(0, i * s);
    ctx.lineTo(TEXTURE, i * s);
    ctx.stroke();
  }
};

/** Outline of the target drawn in front of the block in a flat view, so the player sees what to carve */
const drawGuide = (ctx: CanvasRenderingContext2D, n: number, cast: Bitmap, target: Bitmap) => {
  const s = TEXTURE / n;
  ctx.clearRect(0, 0, TEXTURE, TEXTURE);
  for (let p = 0; p < n * n; p++) {
    const [x, y] = [(p % n) * s, Math.floor(p / n) * s];
    if (cast[p] && !target[p]) {
      ctx.fillStyle = 'rgba(239,111,108,0.55)';
      ctx.fillRect(x, y, s, s);
    }
  }
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (let p = 0; p < n * n; p++) {
    if (!target[p]) continue;
    const [c, r] = [p % n, Math.floor(p / n)];
    const filled = (dc: number, dr: number) => {
      const [cc, rr] = [c + dc, r + dr];
      return cc >= 0 && rr >= 0 && cc < n && rr < n && target[cc + n * rr];
    };
    const edge = (x1: number, y1: number, x2: number, y2: number) => {
      ctx.moveTo(x1 * s, y1 * s);
      ctx.lineTo(x2 * s, y2 * s);
    };
    if (!filled(0, -1)) edge(c, r, c + 1, r);
    if (!filled(0, 1)) edge(c, r + 1, c + 1, r + 1);
    if (!filled(-1, 0)) edge(c, r, c, r + 1);
    if (!filled(1, 0)) edge(c + 1, r, c + 1, r + 1);
  }
  ctx.stroke();
};

type Panel = { mesh: Mesh; ctx: CanvasRenderingContext2D; texture: CanvasTexture };

const panel = (size: number, opaque: boolean): Panel => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TEXTURE;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new MeshBasicMaterial({ map: texture, transparent: true, depthTest: opaque, depthWrite: opaque });
  const mesh = new Mesh(new PlaneGeometry(size, size), material);
  if (!opaque) mesh.renderOrder = 10;
  return { mesh, ctx: canvas.getContext('2d')!, texture };
};

export type Pick = { kind: 'cube'; index: number } | { kind: 'line'; view: View; col: number; row: number };

/** Three.js stage: the block, its three shadow walls and a camera that can flatten into any wall */
export class ShadowScene {
  readonly canvas: HTMLCanvasElement;
  #renderer: WebGLRenderer;
  #scene = new Scene();
  #camera = new PerspectiveCamera(ORBIT_FOV, 1, 0.1, 4000);
  #cubes = new Group();
  #walls = {} as Record<View, Panel>;
  #guides = {} as Record<View, Panel>;
  #n = 0;
  #voxels?: Voxels;
  #targets?: Record<View, Bitmap>;
  #orbit = { azimuth: 0.72, elevation: 0.5 };
  #shot: Shot = this.#orbitShot();
  #transition?: { from: Shot; to: Shot; start: number; duration: number };
  #shrinking = new Map<Mesh, number>();
  #frame = 0;
  view: View | undefined;

  constructor() {
    this.#renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.#renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.canvas = this.#renderer.domElement;
    // Top, front and side faces get clearly different shades, like the lit faces in Lattice
    this.#scene.add(new HemisphereLight(0xfff4e0, 0x1a1c3a, 0.55));
    this.#scene.add(new AmbientLight(0xffffff, 0.2));
    const sun = new DirectionalLight(0xffffff, 2.6);
    sun.position.set(0.35, 1, 0.6);
    this.#scene.add(sun);
    this.#scene.add(this.#cubes);
  }

  #orbitShot(): Shot {
    const { azimuth, elevation } = this.#orbit;
    const dir = new Vector3(
      Math.sin(azimuth) * Math.cos(elevation),
      Math.sin(elevation),
      Math.cos(azimuth) * Math.cos(elevation),
    );
    return { dir, up: new Vector3(0, 1, 0), fov: ORBIT_FOV };
  }

  #shotFor(view: View | undefined): Shot {
    if (!view) return this.#orbitShot();
    return { dir: AXIS[view].dir.clone(), up: AXIS[view].up.clone(), fov: FLAT_FOV };
  }

  #apply({ dir, up, fov }: Shot) {
    const radius = this.#n * 1.12;
    const fit = Math.max(1, 1 / this.#camera.aspect);
    const distance = (radius * fit) / Math.tan(((fov / 2) * Math.PI) / 180);
    this.#camera.fov = fov;
    this.#camera.near = distance / 10;
    this.#camera.far = distance * 10;
    this.#camera.position.copy(dir).normalize().multiplyScalar(distance);
    this.#camera.up.copy(up);
    this.#camera.lookAt(0, 0, 0);
    this.#camera.updateProjectionMatrix();
  }

  build(n: number, voxels: Voxels, targets: Record<View, Bitmap>) {
    this.#n = n;
    this.#cubes.clear();
    for (const p of [...Object.values(this.#walls), ...Object.values(this.#guides)]) this.#scene.remove(p.mesh);
    const geometry = new BoxGeometry(0.96, 0.96, 0.96);
    const edges = new EdgesGeometry(geometry);
    const material = new MeshLambertMaterial({ color: COLORS.cube });
    const line = new LineBasicMaterial({ color: COLORS.edge, transparent: true, opacity: 0.35 });
    const c = (n - 1) / 2;
    for (let i = 0; i < n ** 3; i++) {
      const [x, y, z] = voxelAt(n, i);
      const cube = new Mesh(geometry, material);
      cube.add(new LineSegments(edges, line));
      cube.position.set(x - c, y - c, z - c);
      cube.userData.index = i;
      this.#cubes.add(cube);
    }
    const back = n / 2 + 0.7;
    for (const view of VIEWS) {
      const wall = panel(n, true);
      const guide = panel(n, false);
      if (view === 'front') {
        wall.mesh.position.set(0, 0, -back);
        guide.mesh.position.set(0, 0, back);
      } else if (view === 'side') {
        wall.mesh.rotation.y = guide.mesh.rotation.y = Math.PI / 2;
        wall.mesh.position.set(-back, 0, 0);
        guide.mesh.position.set(back, 0, 0);
      } else {
        wall.mesh.rotation.x = guide.mesh.rotation.x = -Math.PI / 2;
        wall.mesh.position.set(0, -back, 0);
        guide.mesh.position.set(0, back, 0);
      }
      this.#walls[view] = wall;
      this.#guides[view] = guide;
      this.#scene.add(wall.mesh, guide.mesh);
    }
    this.#targets = targets;
    this.#voxels = undefined;
    this.update(voxels);
    this.setView(this.view, false);
  }

  update(voxels: Voxels) {
    const previous = this.#voxels;
    this.#voxels = voxels;
    for (const cube of this.#cubes.children as Mesh[]) {
      const on = !!voxels[cube.userData.index];
      if (previous && previous[cube.userData.index] && !on) {
        this.#shrinking.set(cube, performance.now());
      } else {
        cube.visible = on;
        cube.scale.setScalar(1);
        this.#shrinking.delete(cube);
      }
    }
    for (const view of VIEWS) {
      const cast = shadow(this.#n, voxels, view);
      drawWall(this.#walls[view].ctx, this.#n, cast, this.#targets![view]);
      drawGuide(this.#guides[view].ctx, this.#n, cast, this.#targets![view]);
      this.#walls[view].texture.needsUpdate = true;
      this.#guides[view].texture.needsUpdate = true;
    }
    this.invalidate();
  }

  /** `undefined` is the free 3D orbit; a view flattens the camera into that wall */
  setView(view: View | undefined, animate = true) {
    this.view = view;
    for (const v of VIEWS) this.#guides[v].mesh.visible = v === view;
    const to = this.#shotFor(view);
    if (!animate) {
      this.#shot = to;
      this.#transition = undefined;
    } else {
      this.#transition = { from: this.#shot, to, start: performance.now(), duration: 950 };
    }
    this.invalidate();
  }

  orbitBy(dx: number, dy: number) {
    if (this.view || this.#transition) return;
    // Stay inside the octant that faces all three walls
    this.#orbit.azimuth = Math.min(1.35, Math.max(0.22, this.#orbit.azimuth - dx * 0.008));
    this.#orbit.elevation = Math.min(1.15, Math.max(0.18, this.#orbit.elevation + dy * 0.008));
    this.#shot = this.#orbitShot();
    this.invalidate();
  }

  resize(width: number, height: number) {
    this.#renderer.setSize(width, height, false);
    this.#camera.aspect = width / height;
    this.invalidate();
  }

  pick(clientX: number, clientY: number): Pick | undefined {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = new Raycaster();
    ray.setFromCamera(ndc, this.#camera);
    const n = this.#n;
    if (this.view) {
      const hit = ray.ray.intersectPlane(new Plane(AXIS[this.view].dir.clone(), 0), new Vector3());
      if (!hit) return;
      const cell = [hit.x, hit.y, hit.z].map((v) => Math.floor(v + n / 2)) as [number, number, number];
      const [col, row] = pixelOf(n, this.view, cell);
      if (col < 0 || row < 0 || col >= n || row >= n) return;
      return { kind: 'line', view: this.view, col, row };
    }
    const hit = ray.intersectObjects(
      this.#cubes.children.filter((c) => c.visible && !this.#shrinking.has(c as Mesh)),
      false,
    )[0];
    return hit ? { kind: 'cube', index: hit.object.userData.index } : undefined;
  }

  invalidate() {
    if (!this.#frame) this.#frame = requestAnimationFrame(this.#render);
  }

  #render = (now: number) => {
    this.#frame = 0;
    let busy = false;
    if (this.#transition) {
      const { from, to, start, duration } = this.#transition;
      const t = Math.min(1, (now - start) / duration);
      const e = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      this.#shot = {
        dir: from.dir.clone().lerp(to.dir, e).normalize(),
        up: from.up.clone().lerp(to.up, e).normalize(),
        // Field of view eases in log space so the flattening reads as one continuous dolly
        fov: Math.exp(Math.log(from.fov) + (Math.log(to.fov) - Math.log(from.fov)) * e),
      };
      if (t >= 1) this.#transition = undefined;
      busy = true;
    }
    for (const [cube, start] of this.#shrinking) {
      const t = Math.min(1, (now - start) / 220);
      cube.scale.setScalar(1 - t);
      if (t >= 1) {
        cube.visible = false;
        cube.scale.setScalar(1);
        this.#shrinking.delete(cube);
      }
      busy = true;
    }
    this.#apply(this.#shot);
    this.#renderer.render(this.#scene, this.#camera);
    if (busy) this.invalidate();
  };

  dispose() {
    cancelAnimationFrame(this.#frame);
    this.#renderer.dispose();
  }
}
