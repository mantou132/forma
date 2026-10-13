import type { Emitter } from '@mantou/gem/lib/decorators';

import { bounds, centroid, type Point, pointsAttr, project } from '../model/geometry';
import { type Box, type Flip, flips, type Heights, outline, surface, topCenter } from '../model/partition';
import { boardStyle, svgPoint } from './board-style';

const style = css`
  :scope {
    display: block;
  }
  .marker {
    fill: transparent;
    stroke: var(--edge);
    stroke-width: 0;
  }
  .hint {
    fill: #fff;
    opacity: 0;
    transition: opacity 0.4s;
  }
  :scope[interactive] .hint {
    opacity: 0.22;
  }
  .exit {
    fill: none;
    stroke: #fff;
    stroke-width: 1.4;
    stroke-dasharray: 3 3;
    animation: pulse 1.8s ease-in-out infinite;
  }
  .exit.ok {
    stroke-dasharray: none;
    stroke: var(--game-accent);
  }
  .point {
    fill: #fff;
    transition: transform 0.22s var(--ease-spring);
  }
  @keyframes pulse {
    0%,
    100% {
      stroke-opacity: 0.95;
    }
    50% {
      stroke-opacity: 0.25;
    }
  }
`;

type Exit = { i: number; j: number; z: number; ok: boolean };

/** Isometric stack of cubes; seen flat it is a rhombus tiling, seen lit it is cubes in a corner */
@customElement('lattice-board')
@adoptedStyle(boardStyle)
@adoptedStyle(style)
export class LatticeBoardElement extends GemElement {
  @property box?: Box;
  @property heights?: Heights;
  @boolattribute lit: boolean;
  @boolattribute interactive: boolean;
  /** Column the point stands on */
  @property point?: [number, number];
  @property exit?: Exit;

  @emitter flip: Emitter<Flip>;

  #svg = createRef<SVGSVGElement>();
  #ghosts = createRef<SVGGElement>();
  #previous?: { heights: Heights; faces: ReturnType<typeof surface> };

  @memo((i) => [i.box, i.heights])
  get #faces() {
    return this.box && this.heights ? surface(this.box, this.heights) : [];
  }

  @memo((i) => [i.box])
  get #view() {
    if (!this.box) return { x: 0, y: 0, width: 0, height: 0 };
    return bounds(outline(this.box), 8);
  }

  #flips = () => (this.box && this.heights && this.interactive ? flips(this.box, this.heights) : []);

  #onClick = (evt: PointerEvent) => {
    const root = this.#svg.value;
    if (!root) return;
    const [x, y] = svgPoint(root, evt);
    const nearest = this.#flips()
      .map((flip) => ({ flip, d: Math.hypot(flip.center[0] - x, flip.center[1] - y) }))
      .sort((a, b) => a.d - b.d)[0];
    if (nearest && nearest.d < 16) this.flip(nearest.flip);
  };

  /** The three rhombi that just turned spin away as ghosts, so a flip reads as a rotation in 2D */
  @effect((i) => [i.heights])
  #animateFlip = () => {
    const previous = this.#previous;
    this.#previous = this.heights && { heights: this.heights, faces: this.#faces };
    const ghosts = this.#ghosts.value;
    if (!previous || !ghosts || !this.box || previous.heights.length !== this.heights?.length) return;
    const key = (points: Point[]) =>
      centroid(points)
        .map((n) => n.toFixed(1))
        .join();
    const now = new Set(this.#faces.map(({ points }) => key(points)));
    const gone = previous.faces.filter(({ points }) => !now.has(key(points)));
    if (gone.length !== 3) return;
    const [cx, cy] = centroid(gone.flatMap(({ points }) => points));
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('ghost');
    group.style.transformOrigin = `${cx}px ${cy}px`;
    for (const { kind, points } of gone) {
      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('points', pointsAttr(points));
      polygon.classList.add('face', kind);
      group.append(polygon);
    }
    ghosts.append(group);
    group.addEventListener('animationend', () => group.remove());
  };

  @template()
  #render = () => {
    const view = this.#view;
    const box = this.box;
    if (!box) return null;
    const pointAt =
      this.point && this.heights ? topCenter(...this.point, this.heights[this.point[0]][this.point[1]]) : undefined;
    return html`
      <svg
        ${this.#svg}
        class="board ${this.lit ? 'f-lit' : 'f-flat'}"
        viewBox="${view.x} ${view.y} ${view.width} ${view.height}"
        role="img"
        aria-label=${this.lit ? 'Cubes stacked in a corner' : 'Hexagon tiled with rhombi'}
        @click=${this.#onClick}
      >
        ${this.#faces.map(
          ({ kind, points }) => svg`
            <polygon
              class="face ${kind}"
              style="--d:${((centroid(points)[1] - view.y) / view.height).toFixed(2)}"
              points=${pointsAttr(points)}
            ></polygon>
          `,
        )}
        <g ${this.#ghosts}></g>
        ${this.#flips().map(({ center: [x, y] }) => svg`<circle class="hint" cx=${x} cy=${y} r="1.6"></circle>`)}
        ${
          this.exit
            ? svg`<polygon
                class="exit ${this.exit.ok ? 'ok' : ''}"
                points=${pointsAttr(
                  (
                    [
                      [0.2, 0.2],
                      [0.8, 0.2],
                      [0.8, 0.8],
                      [0.2, 0.8],
                    ] as const
                  ).map(([di, dj]) => project(this.exit!.i + di, this.exit!.j + dj, this.exit!.z)),
                )}
              ></polygon>`
            : null
        }
        ${pointAt ? svg`<circle class="point glow-point" r="3.2" style="transform: translate(${pointAt[0]}px, ${pointAt[1]}px)"></circle>` : null}
      </svg>
    `;
  };
}
