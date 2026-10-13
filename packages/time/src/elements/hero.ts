import { cellOf, parseBoard } from '../model/board';
import type { Route } from '../model/plan';
import { TimeScene } from './scene';

const RING = ['.....', '.###.', '.....'];

/** Three dots chasing each other round a ring: in spacetime, a slowly turning triple helix */
@customElement('time-hero')
export class TimeHeroElement extends GemElement {
  #scene = new TimeScene();

  @mounted()
  #mount = () => {
    const board = parseBoard(RING);
    const order = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
      [4, 1],
      [4, 2],
      [3, 2],
      [2, 2],
      [1, 2],
      [0, 2],
      [0, 1],
    ].map(([x, y]) => cellOf(board, x, y));
    const ticks = order.length - 1;
    const routes: Route[] = [0, 4, 8].map((start) => {
      const cells = Array.from({ length: order.length }, (_, i) => order[(start + i) % order.length]);
      return { cells, waits: cells.map(() => 0) };
    });
    const movers = routes.map(({ cells }) => ({ from: cells[0], to: cells.at(-1)! }));
    this.#scene.lifted = true;
    this.#scene.build({ board, movers, drones: [], ticks });
    this.#scene.setRoutes(routes, []);
    this.append(this.#scene.canvas);
    this.#scene.canvas.style.cssText = 'width:100%;height:100%;display:block';
    const observer = new ResizeObserver(([entry]) =>
      this.#scene.resize(entry.contentRect.width, entry.contentRect.height),
    );
    observer.observe(this);
    const start = performance.now();
    const timer = setInterval(() => {
      const elapsed = (performance.now() - start) / 1000;
      this.#scene.playhead = Math.min(ticks, (elapsed * 1.6) % (ticks + 1.5));
      this.#scene.orbitBy(-0.9, 0);
      this.#scene.invalidate();
    }, 33);
    return () => {
      clearInterval(timer);
      observer.disconnect();
      this.#scene.dispose();
    };
  };
}
