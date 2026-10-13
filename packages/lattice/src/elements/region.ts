import type { Emitter } from '@mantou/gem/lib/decorators';

import { bounds, pointsAttr } from '../model/geometry';
import { parseTri, rhombusKind, rhombusPoints, type Tri, triAt, triKey, triPoints } from '../model/region';
import { boardStyle, svgPoint } from './board-style';

const style = css`
  :scope {
    display: block;
    touch-action: none;
  }
  .tri {
    fill: rgb(236 237 245 / 0.04);
    stroke: rgb(236 237 245 / 0.14);
    stroke-width: 0.5;
    transition: fill 0.6s ease calc(var(--d, 0) * 450ms);
  }
  .f-lit .tri.right {
    fill: color-mix(in srgb, var(--game-accent) 34%, transparent);
  }
  .f-lit .tri.left {
    fill: color-mix(in srgb, #ef6f6c 26%, transparent);
  }
  .tri.selected {
    fill: rgb(236 237 245 / 0.35);
  }
  .placed {
    animation: place 0.25s var(--ease-spring);
    transform-box: fill-box;
    transform-origin: center;
  }
  @keyframes place {
    from {
      transform: scale(0.8);
      opacity: 0.4;
    }
  }
`;

export type Rhombus = [string, string];

/** Free-form region on the triangle lattice: drag across two triangles to lay a rhombus, tap a rhombus to lift it */
@customElement('lattice-region')
@adoptedStyle(boardStyle)
@adoptedStyle(style)
export class LatticeRegionElement extends GemElement {
  @property region?: Set<string>;
  @property tiles?: Rhombus[];
  @boolattribute lit: boolean;

  @emitter place: Emitter<Rhombus>;
  @emitter lift: Emitter<number>;

  #svg = createRef<SVGSVGElement>();
  #state = createState({ selected: '' });
  #drag?: { start: string; moved: boolean };

  @memo((i) => [i.region])
  get #view() {
    const points = [...(this.region || [])].flatMap((key) => triPoints(parseTri(key)));
    return points.length ? bounds(points, 6) : { x: 0, y: 0, width: 0, height: 0 };
  }

  get #covered() {
    return new Map((this.tiles || []).flatMap(([a, b], index) => [[a, index] as const, [b, index] as const]));
  }

  #keyAt = (evt: PointerEvent) => {
    const key = triKey(triAt(svgPoint(this.#svg.value!, evt)));
    return this.region?.has(key) ? key : undefined;
  };

  #tryPlace = (a: string, b: string) => {
    const covered = this.#covered;
    if (a === b || covered.has(a) || covered.has(b) || !rhombusKind(parseTri(a), parseTri(b))) return false;
    this.place([a, b]);
    this.#state({ selected: '' });
    return true;
  };

  #onDown = (evt: PointerEvent) => {
    const key = this.#keyAt(evt);
    if (!key) return;
    (evt.target as Element).releasePointerCapture?.(evt.pointerId);
    this.#drag = { start: key, moved: false };
  };

  #onMove = (evt: PointerEvent) => {
    const drag = this.#drag;
    if (!drag || drag.moved) return;
    const key = this.#keyAt(evt);
    if (key && key !== drag.start && this.#tryPlace(drag.start, key)) drag.moved = true;
  };

  #onUp = (evt: PointerEvent) => {
    const drag = this.#drag;
    this.#drag = undefined;
    if (!drag || drag.moved) return;
    const key = this.#keyAt(evt);
    if (key !== drag.start) return;
    const tile = this.#covered.get(key);
    if (tile !== undefined) {
      this.lift(tile);
    } else if (!(this.#state.selected && this.#tryPlace(this.#state.selected, key))) {
      this.#state({ selected: this.#state.selected === key ? '' : key });
    }
  };

  @template()
  #render = () => {
    const view = this.#view;
    const covered = this.#covered;
    const depth = (tri: Tri) => ((triPoints(tri)[0][1] - view.y) / view.height).toFixed(2);
    return html`
      <svg
        ${this.#svg}
        class="board ${this.lit ? 'f-lit' : 'f-flat'}"
        viewBox="${view.x} ${view.y} ${view.width} ${view.height}"
        role="img"
        aria-label="Region to tile with rhombi"
        @pointerdown=${this.#onDown}
        @pointermove=${this.#onMove}
        @pointerup=${this.#onUp}
      >
        ${[...(this.region || [])].map((key) => {
          if (covered.has(key)) return null;
          const tri = parseTri(key);
          return svg`
            <polygon
              class="tri ${tri.d === 0 ? 'right' : 'left'} ${this.#state.selected === key ? 'selected' : ''}"
              style="--d:${depth(tri)}"
              points=${pointsAttr(triPoints(tri))}
            ></polygon>
          `;
        })}
        ${(this.tiles || []).map(([a, b]) => {
          const [ta, tb] = [parseTri(a), parseTri(b)];
          return svg`
            <polygon
              class="face placed ${rhombusKind(ta, tb)}"
              style="--d:${depth(ta)}"
              points=${pointsAttr(rhombusPoints(ta, tb))}
            ></polygon>
          `;
        })}
      </svg>
    `;
  };
}
