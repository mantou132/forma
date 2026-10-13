import type { LevelRef } from '@forma/core/game';
import { haptic } from '@forma/core/haptics';
import { counter, levelHeader } from '@forma/core/level';
import { discoverShift, solveLevel } from '@forma/core/overlay';
import { progressStore } from '@forma/core/progress';
import { sound } from '@forma/core/sound';
import { watchTilt } from '@forma/core/tilt';
import { icons, pillButton, roundButton } from '@forma/core/ui';

import { xyOf } from '../model/board';
import { LEVELS } from '../model/levels';
import { addWait, drawTo, emptyRoute, evaluate, type Route, totalWaits } from '../model/plan';
import { MOVER_COLORS, TimeScene } from './scene';

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
  .breathe {
    animation: breathe 1.8s ease-out infinite;
    border-radius: 999px;
  }
`;

/** Chapter I is the flat map only; time rises from Chapter II */
const LIFT_FROM_CHAPTER = 1;
/** Milliseconds per tick when running */
const BEAT = 380;

const icon = (d: ReturnType<typeof svg>) => html`
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>
`;
const runIcon = icon(svg`<path d="M7 5l12 7-12 7V5z"></path>`);
const riseIcon = icon(svg`<path d="M4 20h16"></path><path d="M8 20V9M12 20V4M16 20v-7"></path>`);

/** Lifted stays lifted between levels once the player has chosen it */
let sessionLifted = false;

type State = {
  routes: Route[];
  history: Route[][];
  selected: number;
  lifted: boolean;
  /** Tick reached by the current run; cleared by any edit */
  playhead?: number;
  running: boolean;
  message: string;
  solved: boolean;
};

@customElement('time-level')
@adoptedStyle(style)
@connectStore(progressStore)
export class TimeLevelElement extends GemElement {
  @property ref?: LevelRef;

  #stage = createRef<HTMLDivElement>();
  #scene = new TimeScene();
  #state = createState<State>({
    routes: [],
    history: [],
    selected: 0,
    lifted: false,
    running: false,
    message: '',
    solved: false,
  });
  #gesture?: { x: number; y: number; moved: boolean; mover?: number; restart: boolean };
  #timer = 0;

  get #level() {
    return LEVELS[this.ref!.chapter][this.ref!.level];
  }

  get #canLift() {
    return this.ref!.chapter >= LIFT_FROM_CHAPTER;
  }

  get #evaluation() {
    const { movers, drones, ticks } = this.#level;
    return evaluate(movers, this.#state.routes, drones, ticks);
  }

  @willMount()
  #init = () => {
    this.#state({
      routes: this.#level.movers.map(emptyRoute),
      lifted: this.#canLift && sessionLifted,
    });
  };

  @mounted()
  #mountScene = () => {
    const stage = this.#stage.value!;
    stage.append(this.#scene.canvas);
    const { board, movers, drones, ticks } = this.#level;
    this.#scene.lifted = this.#state.lifted;
    this.#scene.build({ board, movers, drones, ticks });
    this.#sync();
    const observer = new ResizeObserver(([entry]) =>
      this.#scene.resize(entry.contentRect.width, entry.contentRect.height),
    );
    observer.observe(stage);
    const stopTilt = watchTilt({ onTilt: this.#toggleLift });
    return () => {
      clearTimeout(this.#timer);
      observer.disconnect();
      stopTilt();
      this.#scene.dispose();
    };
  };

  #sync = () => {
    this.#scene.selected = this.#state.selected;
    this.#scene.setRoutes(this.#state.routes, this.#evaluation.collisions);
  };

  #edit = (routes: Route[], selected = this.#state.selected) => {
    clearTimeout(this.#timer);
    this.#scene.playhead = undefined;
    this.#state({
      routes,
      selected,
      history: [...this.#state.history, this.#state.routes],
      playhead: undefined,
      running: false,
      message: '',
    });
    this.#sync();
  };

  #toggleLift = () => {
    if (!this.#canLift || this.#state.solved) return;
    const lifted = !this.#state.lifted;
    sessionLifted = lifted;
    this.#state({ lifted });
    this.#scene.setLifted(lifted);
    if (!lifted || !discoverShift({ headline: 'Time was the missing direction.', card: 'time-worldline' })) {
      sound.move(lifted ? 6 : 0);
      haptic.move();
    }
  };

  /** Extend the route towards a cell, filling in cells the finger skipped over */
  #drawToward = (mover: number, cell: number, base = this.#state.routes[mover]) => {
    const { board } = this.#level;
    let route = base;
    const [tx, ty] = xyOf(board, cell);
    for (let guard = 0; guard < board.width + board.height && route.cells.at(-1) !== cell; guard++) {
      const [x, y] = xyOf(board, route.cells.at(-1)!);
      const [dx, dy] = [Math.sign(tx - x), Math.sign(ty - y)];
      const step = Math.abs(tx - x) >= Math.abs(ty - y) ? x + dx + board.width * y : x + board.width * (y + dy);
      const next = drawTo(board, route, route.cells.length > 1 && route.cells.at(-2) === cell ? cell : step);
      if (!next) break;
      route = next;
    }
    if (route === base) return;
    const routes = this.#state.routes.map((r, i) => (i === mover ? route : r));
    sound.move(route.cells.length);
    haptic.select();
    this.#edit(routes, mover);
  };

  #onDown = (evt: PointerEvent) => {
    if (this.#state.solved || this.#state.running) return;
    this.#stage.value!.setPointerCapture(evt.pointerId);
    const hit = this.#scene.pick(evt.clientX, evt.clientY);
    const { movers } = this.#level;
    let mover: number | undefined;
    let restart = false;
    if (hit?.kind === 'cell') {
      // Grab a dot to (re)draw its route, or the loose end of a route to keep drawing
      mover = movers.findIndex(({ from }) => from === hit.cell);
      restart = mover >= 0;
      if (mover < 0) mover = this.#state.routes.findIndex((r) => r.cells.length > 1 && r.cells.at(-1) === hit.cell);
      if (mover < 0) mover = undefined;
    }
    this.#gesture = { x: evt.clientX, y: evt.clientY, moved: false, mover, restart };
  };

  #onMove = (evt: PointerEvent) => {
    const gesture = this.#gesture;
    if (!gesture) return;
    const [dx, dy] = [evt.clientX - gesture.x, evt.clientY - gesture.y];
    if (!gesture.moved && Math.hypot(dx, dy) < 8) return;
    if (gesture.mover === undefined) {
      gesture.moved = true;
      this.#scene.orbitBy(dx, dy);
      Object.assign(gesture, { x: evt.clientX, y: evt.clientY });
      return;
    }
    const hit = this.#scene.pick(evt.clientX, evt.clientY);
    if (hit?.kind !== 'cell') return;
    // Dragging out of a dot starts its route over
    const restart = !gesture.moved && gesture.restart && hit.cell !== this.#level.movers[gesture.mover].from;
    // Still on the dot itself: nothing drawn yet
    if (gesture.restart && !gesture.moved && !restart) return;
    gesture.moved = true;
    this.#drawToward(gesture.mover, hit.cell, restart ? emptyRoute(this.#level.movers[gesture.mover]) : undefined);
  };

  #onUp = (evt: PointerEvent) => {
    const gesture = this.#gesture;
    this.#gesture = undefined;
    if (!gesture || gesture.moved || this.#state.solved || this.#state.running) return;
    const hit = this.#scene.pick(evt.clientX, evt.clientY);
    if (!hit) return;
    const { routes, selected } = this.#state;
    let target: { mover: number; step: number } | undefined;
    if (hit.kind === 'line') {
      target = hit;
    } else {
      // A tap on a route makes that dot wait there one more tick; crossings go to the selected dot first
      const candidates = routes
        .map((route, mover) => ({ mover, step: route.cells.indexOf(hit.cell), route }))
        .filter(({ step, route }) => step >= 0 && step < route.cells.length - 1);
      target = candidates.find((c) => c.mover === selected) || candidates[0];
    }
    if (!target) return;
    if (target.step >= routes[target.mover].cells.length - 1) return;
    this.#edit(
      routes.map((r, i) => (i === target.mover ? addWait(r, target.step) : r)),
      target.mover,
    );
    sound.move(12);
    haptic.move();
  };

  #undo = () => {
    const { history, solved, running } = this.#state;
    if (!history.length || solved || running) return;
    this.#scene.playhead = undefined;
    this.#state({ routes: history.at(-1)!, history: history.slice(0, -1), playhead: undefined, message: '' });
    this.#sync();
    sound.undo();
    haptic.select();
  };

  #reset = () => {
    if (this.#state.solved || this.#state.running) return;
    this.#edit(this.#level.movers.map(emptyRoute));
    sound.undo();
  };

  /** Play time forward; the first collision stops the clock */
  #run = () => {
    const { solved, running } = this.#state;
    if (solved || running) return;
    const { ticks } = this.#level;
    const { arrivals, collisions } = this.#evaluation;
    const missing = arrivals.findIndex(
      (a, i) => a === undefined && this.#state.routes[i].cells.at(-1) !== this.#level.movers[i].to,
    );
    if (missing >= 0) {
      sound.deny();
      haptic.error();
      return this.#state({ message: 'Draw every dot home first.', selected: missing });
    }
    const crash = collisions[0]?.t;
    const late = arrivals.some((a) => a === undefined);
    const end = crash ?? Math.min(ticks, Math.max(...arrivals.map((a) => a ?? ticks)));
    this.#state({ running: true, message: '' });
    const start = performance.now();
    const tick = () => {
      const t = Math.min(end, (performance.now() - start) / BEAT);
      if (Math.floor(t) !== Math.floor(this.#scene.playhead ?? -1)) sound.move(Math.floor(t));
      this.#scene.playhead = t;
      this.#scene.invalidate();
      this.#state({ playhead: t });
      if (t < end) {
        this.#timer = window.setTimeout(tick, 16);
        return;
      }
      this.#state({ running: false });
      if (crash !== undefined) {
        sound.deny();
        haptic.error();
        return this.#state({ message: `Collision at tick ${crash}.` });
      }
      if (late) {
        sound.deny();
        haptic.error();
        return this.#state({ message: `Out of time: everyone must be home by tick ${ticks}.` });
      }
      this.#state({ solved: true });
      solveLevel(this.ref!, { moves: totalWaits(this.#state.routes), par: this.#level.par, unit: ['wait', 'waits'] });
    };
    tick();
  };

  #hint = () => {
    const { lifted, message } = this.#state;
    if (message) return message;
    const { arrivals } = this.#evaluation;
    if (arrivals.some((a) => a === undefined)) return 'Drag from each dot to its ring. Tap a route to wait.';
    if (lifted) return 'Tap a worldline to hold that dot one tick longer.';
    return 'Run it and watch.';
  };

  @template()
  #render = () => {
    if (!this.ref) return html``;
    const { routes, selected, lifted, running, playhead } = this.#state;
    const { ticks, par, movers } = this.#level;
    const { arrivals, collisions } = this.#evaluation;
    const finish = arrivals.every((a) => a !== undefined) ? Math.max(...(arrivals as number[])) : undefined;
    const hintLift =
      this.#canLift && !progressStore.lifted && (collisions.length > 0 || this.#state.history.length > 6);
    return html`
      <div class="flex h-full flex-col bg-ink px-5 pt-safe pb-safe">
        ${levelHeader(
          this.ref,
          html`<div class="flex flex-col items-end gap-1 rounded-2xl bg-card px-3 py-2 shadow-[inset_0_0_0_1px_var(--color-line)]">
            <span class="font-mono text-[10px] tracking-[0.14em] text-muted">HOME BY</span>
            <span class="font-mono text-lg leading-none text-accent">${playhead === undefined ? '' : `${Math.floor(playhead)} / `}${ticks}</span>
          </div>`,
        )}
        <div class="mt-4 flex justify-center gap-6">
          ${counter({ label: 'Waits', value: totalWaits(routes), limit: par })}
          ${counter({ label: 'Done', value: finish ?? 0, limit: ticks })}
        </div>
        <p class="mt-3 min-h-5 text-center text-sm ${this.#state.message ? 'text-[#ef6f6c]' : 'text-muted'}">${this.#hint()}</p>
        <div
          ${this.#stage}
          class="stage -mx-5 min-h-0 flex-1"
          @pointerdown=${this.#onDown}
          @pointermove=${this.#onMove}
          @pointerup=${this.#onUp}
          @pointercancel=${() => (this.#gesture = undefined)}
        ></div>
        <div class="mb-4 flex justify-center gap-2">
          ${movers.map(
            (_, i) => html`
              <button
                class="flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 font-mono text-xs transition ${i === selected ? 'bg-glass-strong text-text' : 'bg-glass text-muted'}"
                aria-label="Dot ${i + 1}"
                @click=${() => {
                  this.#state({ selected: i });
                  this.#sync();
                }}
              >
                <span class="size-2.5 rounded-full" style="background:${MOVER_COLORS[i]}"></span>
                ${arrivals[i] ?? '–'}
              </button>
            `,
          )}
        </div>
        <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div class="flex gap-2">
            ${roundButton({ icon: icons.undo, label: 'Undo', onClick: this.#undo, disabled: running })}
            ${roundButton({ icon: icons.reset, label: 'Reset', onClick: this.#reset, disabled: running })}
          </div>
          ${pillButton({ label: running ? 'Running' : 'Run', icon: runIcon, onClick: this.#run })}
          <div class="flex justify-end">
            ${
              this.#canLift
                ? html`<span class=${hintLift ? 'breathe' : ''}>
                    ${roundButton({ icon: lifted ? icons.flat : riseIcon, label: lifted ? 'Flatten time' : 'Raise time', onClick: this.#toggleLift })}
                  </span>`
                : null
            }
          </div>
        </div>
      </div>
    `;
  };
}
