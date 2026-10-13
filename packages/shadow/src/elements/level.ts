import type { LevelRef } from '@forma/core/game';
import { haptic } from '@forma/core/haptics';
import { counter, levelHeader } from '@forma/core/level';
import { discoverShift, solveLevel } from '@forma/core/overlay';
import { progressStore } from '@forma/core/progress';
import { sound } from '@forma/core/sound';
import { watchTilt } from '@forma/core/tilt';
import { icons, pillButton, roundButton } from '@forma/core/ui';

import { LEVELS } from '../model/levels';
import { carve, count, fullBlock, lineOf, pluck, solved, VIEWS, type View, type Voxels } from '../model/voxels';
import { ShadowScene } from './scene';

const style = css`
  .stage {
    touch-action: none;
  }
  .stage canvas {
    width: 100%;
    height: 100%;
    display: block;
  }
  @keyframes breathe {
    50% {
      box-shadow: 0 0 0 10px color-mix(in srgb, var(--game-accent) 0%, transparent);
    }
    0%,
    100% {
      box-shadow: 0 0 0 0 color-mix(in srgb, var(--game-accent) 55%, transparent);
    }
  }
  .breathe button {
    animation: breathe 1.8s ease-out infinite;
  }
`;

/** Chapter I is 3D only; looking straight down an axis opens in Chapter II */
const FLATTEN_FROM_CHAPTER = 1;

const VIEW_LABEL: Record<View, string> = { front: 'Front', side: 'Side', top: 'Top' };

type State = {
  voxels: Voxels;
  history: Voxels[];
  moves: number;
  /** Flat view the camera is looking down, or 3D orbit */
  view?: View;
  lastView: View;
  solved: boolean;
};

@customElement('shadow-level')
@adoptedStyle(style)
@connectStore(progressStore)
export class ShadowLevelElement extends GemElement {
  @property ref?: LevelRef;

  #root = createRef<HTMLDivElement>();
  #stage = createRef<HTMLDivElement>();
  #scene = new ShadowScene();
  #state = createState<State>({ voxels: new Uint8Array(), history: [], moves: 0, lastView: 'front', solved: false });
  #drag?: { x: number; y: number; moved: boolean };

  get #level() {
    return LEVELS[this.ref!.chapter][this.ref!.level];
  }

  get #canFlatten() {
    return this.ref!.chapter >= FLATTEN_FROM_CHAPTER;
  }

  @willMount()
  #init = () => {
    this.#state({ voxels: fullBlock(this.#level.n) });
  };

  @mounted()
  #mountScene = () => {
    const stage = this.#stage.value!;
    stage.append(this.#scene.canvas);
    const { n, targets } = this.#level;
    this.#scene.build(n, this.#state.voxels, targets);
    const observer = new ResizeObserver(([entry]) => {
      this.#scene.resize(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(stage);
    const stopTilt = watchTilt({ onTilt: this.#toggleFlat });
    return () => {
      observer.disconnect();
      stopTilt();
      this.#scene.dispose();
    };
  };

  #setView = (view: View | undefined) => {
    this.#state({ view, lastView: view || this.#state.lastView });
    this.#scene.setView(view);
  };

  #toggleFlat = () => {
    if (!this.#canFlatten || this.#state.solved) return;
    const view = this.#state.view ? undefined : this.#state.lastView;
    this.#setView(view);
    if (!view || !discoverShift({ headline: 'Look straight. Depth disappears.', card: 'shadow-through' })) {
      sound.move(view ? 4 : 0);
      haptic.move();
    }
  };

  #apply = (voxels: Voxels) => {
    const { history, moves } = this.#state;
    this.#state({ voxels, history: [...history, this.#state.voxels], moves: moves + 1 });
    this.#scene.update(voxels);
    sound.move(moves);
    haptic.move();
    const { n, targets, cubes } = this.#level;
    if (solved(n, voxels, targets, cubes)) {
      this.#state({ solved: true });
      if (this.#state.view) this.#setView(undefined);
      setTimeout(() => solveLevel(this.ref!, { moves: this.#state.moves }), 1100);
    }
  };

  #onDown = (evt: PointerEvent) => {
    this.#drag = { x: evt.clientX, y: evt.clientY, moved: false };
    this.#stage.value!.setPointerCapture(evt.pointerId);
  };

  #onMove = (evt: PointerEvent) => {
    const drag = this.#drag;
    if (!drag) return;
    const [dx, dy] = [evt.clientX - drag.x, evt.clientY - drag.y];
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    drag.moved = true;
    this.#scene.orbitBy(dx, dy);
    Object.assign(drag, { x: evt.clientX, y: evt.clientY });
  };

  #onUp = (evt: PointerEvent) => {
    const drag = this.#drag;
    this.#drag = undefined;
    if (!drag || drag.moved || this.#state.solved) return;
    const hit = this.#scene.pick(evt.clientX, evt.clientY);
    if (!hit) return;
    const { n } = this.#level;
    const { voxels } = this.#state;
    if (hit.kind === 'cube') return this.#apply(pluck(voxels, hit.index));
    if (!lineOf(n, hit.view, hit.col, hit.row).some((i) => voxels[i])) {
      sound.deny();
      return haptic.error();
    }
    this.#apply(carve(n, voxels, hit.view, hit.col, hit.row));
  };

  #undo = () => {
    const { history, moves, solved } = this.#state;
    if (!history.length || solved) return;
    const voxels = history.at(-1)!;
    this.#state({ voxels, history: history.slice(0, -1), moves: moves + 1 });
    this.#scene.update(voxels);
    sound.undo();
    haptic.select();
  };

  #reset = () => {
    if (this.#state.solved) return;
    const voxels = fullBlock(this.#level.n);
    this.#state({ voxels, history: [], moves: 0 });
    this.#scene.update(voxels);
    sound.undo();
  };

  /** Three tiny target shadows; the one being looked at is lit */
  #targets = () => {
    const { n, targets } = this.#level;
    return html`
      <div class="flex gap-1.5 rounded-2xl bg-card px-2.5 py-2 shadow-[inset_0_0_0_1px_var(--color-line)]">
        ${VIEWS.map(
          (view) => html`
            <div class="flex flex-col items-center gap-1">
              <svg viewBox="0 0 ${n} ${n}" class="size-7 ${this.#state.view === view ? '' : 'opacity-60'}" aria-label="${VIEW_LABEL[view]} target">
                <rect width=${n} height=${n} fill="#ffffff0d"></rect>
                ${[...targets[view]].map((on, p) => (on ? svg`<rect x=${p % n} y=${Math.floor(p / n)} width="1" height="1" fill="var(--game-accent)"></rect>` : null))}
              </svg>
              <span class="font-mono text-[8px] tracking-[0.14em] ${this.#state.view === view ? 'text-accent' : 'text-muted'}">${VIEW_LABEL[view].toUpperCase()}</span>
            </div>
          `,
        )}
      </div>
    `;
  };

  #hint = () => {
    const { cubes } = this.#level;
    if (this.#state.view) return 'Tap the block to carve straight through.';
    if (cubes !== undefined) return `Cast all three shadows with ${cubes} cubes.`;
    return this.ref!.chapter === 0
      ? 'Tap cubes away until every shadow matches.'
      : 'Make every shadow match its outline.';
  };

  @template()
  #render = () => {
    if (!this.ref) return html``;
    const { voxels, moves, view, lastView } = this.#state;
    const { cubes } = this.#level;
    const hintFlat = this.#canFlatten && !progressStore.lifted && moves >= 3;
    return html`
      <div ${this.#root} class="flex h-full flex-col bg-ink px-5 pt-safe pb-safe">
        ${levelHeader(this.ref, this.#targets())}
        <div class="mt-4">
          ${cubes === undefined ? counter({ label: 'Moves', value: moves }) : counter({ label: 'Cubes', value: count(voxels), limit: cubes })}
        </div>
        <p class="mt-3 min-h-5 text-center text-sm text-muted">${this.#hint()}</p>
        <div
          ${this.#stage}
          class="stage -mx-5 min-h-0 flex-1"
          @pointerdown=${this.#onDown}
          @pointermove=${this.#onMove}
          @pointerup=${this.#onUp}
          @pointercancel=${() => (this.#drag = undefined)}
        ></div>
        <div v-if=${!!view} class="mb-4 flex justify-center gap-2">
          ${VIEWS.map(
            (v) => html`
              <button
                class="h-9 cursor-pointer rounded-full px-4 font-mono text-xs tracking-[0.12em] uppercase transition ${v === view ? 'bg-accent text-ink' : 'bg-glass text-soft hover:bg-glass-strong'}"
                @click=${() => this.#setView(v)}
              >
                ${VIEW_LABEL[v]}
              </button>
            `,
          )}
        </div>
        <div class="flex items-center justify-between gap-3">
          ${roundButton({ icon: icons.undo, label: 'Undo', onClick: this.#undo })}
          ${
            this.#canFlatten
              ? html`<span class=${hintFlat ? 'breathe' : ''}>
                  ${pillButton({
                    label: view ? 'Step back' : 'Look straight',
                    icon: view ? icons.flat : icons.tilt,
                    onClick: this.#toggleFlat,
                  })}
                </span>`
              : html`<span></span>`
          }
          ${roundButton({ icon: icons.reset, label: 'Reset', onClick: this.#reset })}
        </div>
      </div>
    `;
  };
}
