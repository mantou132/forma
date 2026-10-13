import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  CurvePath,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineCurve3,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  OctahedronGeometry,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  Raycaster,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';

import { type Board, type Drone, type Mover, xyOf } from '../model/board';
import { type Collision, dronePosition, type Route, stepAt, timeline } from '../model/plan';

/** Height of one tick when time is fully raised */
const TICK = 0.62;
const FLAT_FOV = 10;
const ORBIT_FOV = 34;

export const MOVER_COLORS = ['#f4c95d', '#ef6f6c', '#62a8ff', '#b39bff', '#7fe0b0', '#f29fd0'];
const DRONE_COLOR = '#8a8fb0';

type Shot = { dir: Vector3; up: Vector3; fov: number; lift: number };

export type TimePick = { kind: 'cell'; cell: number } | { kind: 'line'; mover: number; step: number };

type SceneState = {
  board: Board;
  movers: Mover[];
  drones: Drone[];
  ticks: number;
};

const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/** Small text label drawn into a sprite, used for the time axis */
const label = (text: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.font = '500 34px "Geist Mono Variable", ui-monospace, monospace';
  ctx.fillStyle = '#9094ae';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const sprite = new Sprite(new SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(1.6, 0.4, 1);
  return sprite;
};

/**
 * Spacetime stage: the floor plan, and above it every dot's worldline. `lift` is how far time is raised —
 * 0 is the flat map seen from above, 1 is the full spacetime box seen from the side.
 */
export class TimeScene {
  readonly canvas: HTMLCanvasElement;
  #renderer: WebGLRenderer;
  #scene = new Scene();
  #camera = new PerspectiveCamera(ORBIT_FOV, 1, 0.1, 500);
  #state?: SceneState;
  /** Worldlines are built in tick units; this group is scaled by `lift * TICK` */
  #lines = new Group();
  #floor = new Group();
  #walls = new Group();
  #markers = new Group();
  #dots: Mesh[] = [];
  #ceiling?: LineSegments;
  #plane?: Mesh;
  #axis = new Group();
  #wallMaterial?: MeshBasicMaterial;
  #wallEdges?: LineBasicMaterial;
  #orbit = { azimuth: 0.62, elevation: 0.42 };
  #shot: Shot = { dir: new Vector3(0, 1, 0), up: new Vector3(0, 0, -1), fov: FLAT_FOV, lift: 0 };
  #transition?: { from: Shot; to: Shot; start: number; duration: number };
  #frame = 0;
  #routes: Route[] = [];
  #collisions: Collision[] = [];
  /** Playback position in ticks, or undefined when not playing */
  playhead?: number;
  lifted = false;
  selected = 0;

  constructor() {
    this.#renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.#renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.canvas = this.#renderer.domElement;
    this.#scene.add(new AmbientLight(0xffffff, 0.55));
    const sun = new DirectionalLight(0xffffff, 1.8);
    sun.position.set(0.4, 1, 0.6);
    this.#scene.add(sun);
    this.#scene.add(this.#floor, this.#walls, this.#lines, this.#markers, this.#axis);
  }

  get #height() {
    return this.#state ? this.#state.ticks * TICK : 0;
  }

  #world(cell: number, t = 0): Vector3 {
    const { board } = this.#state!;
    const [x, y] = xyOf(board, cell);
    return new Vector3(x - (board.width - 1) / 2, t * TICK * this.#shot.lift, y - (board.height - 1) / 2);
  }

  build(state: SceneState) {
    this.#state = state;
    const { board, movers, ticks } = state;
    this.#floor.clear();
    this.#walls.clear();
    this.#axis.clear();
    const tile = new BoxGeometry(0.94, 0.08, 0.94);
    const tileMaterial = new MeshLambertMaterial({ color: 0x2a2f5c });
    const wall = new BoxGeometry(1, 1, 1);
    this.#wallMaterial = new MeshBasicMaterial({ color: 0x0b0c18, transparent: true, depthWrite: false });
    this.#wallEdges = new LineBasicMaterial({ color: 0x5a60a0, transparent: true });
    const [wallMaterial, wallEdges] = [this.#wallMaterial, this.#wallEdges];
    board.floor.forEach((on, cell) => {
      const [x, y] = xyOf(board, cell);
      const position = new Vector3(x - (board.width - 1) / 2, 0, y - (board.height - 1) / 2);
      if (on) {
        const mesh = new Mesh(tile, tileMaterial);
        mesh.position.copy(position).setY(-0.04);
        this.#floor.add(mesh);
        return;
      }
      if (!board.wall[cell]) return;
      const mesh = new Mesh(wall, wallMaterial);
      mesh.add(new LineSegments(new EdgesGeometry(wall), wallEdges));
      mesh.position.copy(position);
      mesh.userData.wall = true;
      this.#walls.add(mesh);
    });
    // Goal rings sit on the floor in each dot's colour
    movers.forEach(({ to }, i) => {
      const ring = new Mesh(new TorusGeometry(0.3, 0.05, 10, 40), new MeshBasicMaterial({ color: MOVER_COLORS[i] }));
      ring.rotation.x = Math.PI / 2;
      ring.position.copy(this.#world(to)).setY(0.02);
      this.#floor.add(ring);
    });
    this.#dots = movers.map((_, i) => {
      const dot = new Mesh(new SphereGeometry(0.22, 24, 16), new MeshBasicMaterial({ color: MOVER_COLORS[i] }));
      this.#scene.add(dot);
      return dot;
    });
    for (const drone of state.drones) {
      const mesh = new Mesh(new OctahedronGeometry(0.26), new MeshLambertMaterial({ color: DRONE_COLOR }));
      mesh.userData.drone = drone;
      this.#dots.push(mesh);
      this.#scene.add(mesh);
    }
    const [w, d] = [board.width / 2, board.height / 2];
    const box = new BoxGeometry(board.width, 1, board.height);
    box.translate(0, 0.5, 0);
    this.#ceiling = new LineSegments(
      new EdgesGeometry(box),
      new LineBasicMaterial({ color: 0x62e0c9, transparent: true, opacity: 0.35 }),
    );
    this.#scene.add(this.#ceiling);
    const lid = new Mesh(
      new PlaneGeometry(board.width, board.height),
      new MeshBasicMaterial({ color: 0x62e0c9, transparent: true, opacity: 0.06, side: DoubleSide, depthWrite: false }),
    );
    lid.rotation.x = -Math.PI / 2;
    lid.position.y = 1;
    this.#ceiling.add(lid);
    this.#plane = new Mesh(
      new PlaneGeometry(board.width + 0.4, board.height + 0.4),
      new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, side: DoubleSide, depthWrite: false }),
    );
    this.#plane.rotation.x = -Math.PI / 2;
    this.#scene.add(this.#plane);
    const time = label('TIME ↑');
    time.position.set(-w - 0.6, 0, -d - 0.6);
    time.userData.top = true;
    this.#axis.add(time);
    this.#axis.userData.ticks = ticks;
    this.setRoutes([], []);
    this.setLifted(this.lifted, false);
  }

  setRoutes(routes: Route[], collisions: Collision[]) {
    this.#routes = routes;
    this.#collisions = collisions;
    const state = this.#state!;
    this.#lines.clear();
    this.#markers.clear();
    const add = (cells: number[], color: string, radius: number, userData: object, opacity = 1) => {
      const path = new CurvePath<Vector3>();
      const points = cells.map((cell, t) => {
        const [x, y] = xyOf(state.board, cell);
        return new Vector3(x - (state.board.width - 1) / 2, t, y - (state.board.height - 1) / 2);
      });
      for (let i = 1; i < points.length; i++) path.add(new LineCurve3(points[i - 1], points[i]));
      if (!path.curves.length) return;
      const tube = new Mesh(
        new TubeGeometry(path, points.length * 6, radius, 10, false),
        new MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.35, transparent: opacity < 1, opacity }),
      );
      tube.userData = userData;
      this.#lines.add(tube);
    };
    routes.forEach((route, i) => {
      add(timeline(route, state.ticks), MOVER_COLORS[i], i === this.selected ? 0.11 : 0.085, { mover: i });
    });
    state.drones.forEach((drone) => {
      add(
        Array.from({ length: state.ticks + 1 }, (_, t) => dronePosition(drone, t)),
        DRONE_COLOR,
        0.05,
        { drone: true },
        0.7,
      );
    });
    // Waits seen from above: a little stack of pips beside the cell
    routes.forEach((route, i) => {
      route.waits.slice(0, -1).forEach((waits, step) => {
        for (let w = 0; w < waits; w++) {
          const pip = new Mesh(new SphereGeometry(0.07, 10, 8), new MeshBasicMaterial({ color: MOVER_COLORS[i] }));
          pip.userData.pip = { cell: route.cells[step], offset: w };
          this.#markers.add(pip);
        }
      });
    });
    for (const collision of collisions) {
      const knot = new Mesh(
        new SphereGeometry(0.3, 20, 14),
        new MeshBasicMaterial({ color: 0xff5a5a, transparent: true, opacity: 0.85 }),
      );
      knot.userData.collision = collision;
      this.#markers.add(knot);
    }
    this.invalidate();
  }

  setLifted(lifted: boolean, animate = true) {
    this.lifted = lifted;
    const to = this.#target();
    if (animate) {
      this.#transition = { from: this.#shot, to, start: performance.now(), duration: lifted ? 1600 : 900 };
    } else {
      this.#shot = to;
    }
    this.invalidate();
  }

  #target(): Shot {
    // Seen flat the map keeps its rows top to bottom, as in the level data
    if (!this.lifted) return { dir: new Vector3(0, 1, 0), up: new Vector3(0, 0, -1), fov: FLAT_FOV, lift: 0 };
    const { azimuth, elevation } = this.#orbit;
    return {
      dir: new Vector3(
        Math.sin(azimuth) * Math.cos(elevation),
        Math.sin(elevation),
        Math.cos(azimuth) * Math.cos(elevation),
      ),
      up: new Vector3(0, 1, 0),
      fov: ORBIT_FOV,
      lift: 1,
    };
  }

  orbitBy(dx: number, dy: number) {
    if (!this.lifted || this.#transition) return;
    this.#orbit.azimuth -= dx * 0.008;
    this.#orbit.elevation = Math.min(1.2, Math.max(0.12, this.#orbit.elevation + dy * 0.006));
    this.#shot = this.#target();
    this.invalidate();
  }

  resize(width: number, height: number) {
    this.#renderer.setSize(width, height, false);
    this.#camera.aspect = width / height;
    this.invalidate();
  }

  pick(clientX: number, clientY: number): TimePick | undefined {
    const state = this.#state;
    if (!state) return;
    const rect = this.canvas.getBoundingClientRect();
    const ray = new Raycaster();
    ray.setFromCamera(
      new Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1),
      this.#camera,
    );
    if (this.#shot.lift > 0.5) {
      // Fingers are wide: take the worldline point nearest the touch on screen, within reach
      let best: { mover: number; t: number; d: number } | undefined;
      this.#routes.forEach((route, mover) => {
        const cells = timeline(route, state.ticks);
        for (let half = 0; half < cells.length * 2 - 1; half++) {
          const t = half / 2;
          const p = this.#world(cells[Math.floor(t)], t).lerp(this.#world(cells[Math.ceil(t)], t), t % 1);
          p.y = t * TICK * this.#shot.lift;
          p.project(this.#camera);
          const d = Math.hypot(
            ((p.x + 1) / 2) * rect.width - (clientX - rect.left),
            ((1 - p.y) / 2) * rect.height - (clientY - rect.top),
          );
          if (d < 24 && (!best || d < best.d)) best = { mover, t: Math.floor(t), d };
        }
      });
      if (best) return { kind: 'line', mover: best.mover, step: stepAt(this.#routes[best.mover], best.t) };
    }
    const point = ray.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), 0), new Vector3());
    if (!point) return;
    const x = Math.round(point.x + (state.board.width - 1) / 2);
    const y = Math.round(point.z + (state.board.height - 1) / 2);
    if (x < 0 || y < 0 || x >= state.board.width || y >= state.board.height) return;
    const cell = x + state.board.width * y;
    return state.board.floor[cell] ? { kind: 'cell', cell } : undefined;
  }

  invalidate() {
    if (!this.#frame) this.#frame = requestAnimationFrame(this.#render);
  }

  #layout() {
    const state = this.#state!;
    const lift = this.#shot.lift;
    const height = this.#height;
    this.#lines.scale.set(1, Math.max(0.001, lift * TICK), 1);
    this.#walls.children.forEach((wall) => {
      wall.scale.y = 0.35 + lift * height;
      wall.position.y = wall.scale.y / 2;
    });
    // Solid from above; faint glass once time is raised, so worldlines behind stay visible
    if (this.#wallMaterial && this.#wallEdges) {
      this.#wallMaterial.opacity = 0.95 - 0.82 * lift;
      this.#wallEdges.opacity = 0.15 + 0.15 * lift;
    }
    if (this.#ceiling) {
      this.#ceiling.scale.y = Math.max(0.001, height * lift);
      this.#ceiling.visible = lift > 0.02;
    }
    if (this.#plane) {
      this.#plane.visible = this.playhead !== undefined && lift > 0.05;
      this.#plane.position.y = (this.playhead ?? 0) * TICK * lift;
    }
    // Dots ride the playhead; when idle they rest at tick 0 on the floor
    const t = this.playhead ?? 0;
    const routes = this.#routes;
    this.#dots.forEach((dot, i) => {
      const drone = dot.userData.drone as Drone | undefined;
      const position = (tick: number) =>
        drone
          ? dronePosition(drone, tick)
          : timeline(routes[i] || { cells: [state.movers[i].from], waits: [0] }, tick)[tick];
      const [a, b] = [position(Math.floor(t)), position(Math.min(state.ticks, Math.floor(t) + 1))];
      const p = this.#world(a, t).lerp(this.#world(b, t), t - Math.floor(t));
      dot.position.set(p.x, t * TICK * lift + 0.22, p.z);
    });
    for (const marker of this.#markers.children) {
      const { pip, collision } = marker.userData as { pip?: { cell: number; offset: number }; collision?: Collision };
      if (pip) {
        const p = this.#world(pip.cell);
        marker.position.set(p.x + 0.34, 0.08 + pip.offset * 0.16, p.z - 0.34);
        marker.visible = lift < 0.5;
      } else if (collision) {
        const p = this.#world(collision.cell, collision.t);
        marker.position.set(p.x, collision.t * TICK * lift + 0.1, p.z);
        // Seen flat, a collision only shows the moment playback reaches it
        marker.visible = lift > 0.5 || (this.playhead !== undefined && this.playhead >= collision.t);
      }
    }
    for (const sprite of this.#axis.children) {
      sprite.visible = lift > 0.6;
      sprite.position.y = sprite.userData.top ? height * lift : 0.1;
    }
  }

  #render = (now: number) => {
    this.#frame = 0;
    if (!this.#state) return;
    let busy = false;
    if (this.#transition) {
      const { from, to, start, duration } = this.#transition;
      const t = Math.min(1, (now - start) / duration);
      const e = easeInOut(t);
      // Time rises a beat after the camera starts to tip, so the flat routes visibly grow into worldlines
      const rise = this.lifted ? easeInOut(Math.max(0, (t - 0.3) / 0.7)) : easeInOut(Math.min(1, t / 0.7));
      this.#shot = {
        dir: from.dir.clone().lerp(to.dir, e).normalize(),
        up: from.up.clone().lerp(to.up, e).normalize(),
        fov: Math.exp(Math.log(from.fov) + (Math.log(to.fov) - Math.log(from.fov)) * e),
        lift: from.lift + (to.lift - from.lift) * rise,
      };
      if (t >= 1) this.#transition = undefined;
      busy = true;
    }
    this.#layout();
    const { board } = this.#state;
    const height = this.#height * this.#shot.lift;
    const radius = Math.hypot(board.width, board.height, height) * 0.5 + 0.4;
    const fit = Math.max(1, 1 / this.#camera.aspect);
    const distance = (radius * fit) / Math.tan(((this.#shot.fov / 2) * Math.PI) / 180);
    const target = new Vector3(0, height / 2, 0);
    this.#camera.fov = this.#shot.fov;
    this.#camera.near = distance / 20;
    this.#camera.far = distance * 4;
    this.#camera.position.copy(this.#shot.dir).normalize().multiplyScalar(distance).add(target);
    this.#camera.up.copy(this.#shot.up);
    this.#camera.lookAt(target);
    this.#camera.updateProjectionMatrix();
    this.#renderer.render(this.#scene, this.#camera);
    if (busy) this.invalidate();
  };

  dispose() {
    cancelAnimationFrame(this.#frame);
    this.#renderer.dispose();
  }
}
