import type { LevelRef } from '@forma/core/game';
import { haptic } from '@forma/core/haptics';
import { counter, levelHeader } from '@forma/core/level';
import { discoverShift, solveLevel } from '@forma/core/overlay';
import { progressStore } from '@forma/core/progress';
import { sound } from '@forma/core/sound';
import { watchTilt } from '@forma/core/tilt';
import { icons, pillButton, roundButton } from '@forma/core/ui';

import { type LatticeLevel, LEVELS } from '../model/levels';
import { applyFlip, distance, equal, type Flip, type Heights, walkPath } from '../model/partition';
import { countTypes, isTileable } from '../model/region';
import type { Rhombus } from './region';

const style = css`
  @keyframes shake {
    20%,
    60% {
      transform: translateX(-6px);
    }
    40%,
    80% {
      transform: translateX(6px);
    }
  }
  .shake {
    animation: shake 0.4s ease;
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

/** Chapter I is flat only; the dimension shift opens in Chapter II */
const LIFT_FROM_CHAPTER = 1;

/** Lit stays lit between levels once the player has chosen it */
let sessionLit = false;

type State = {
  heights: Heights;
  history: Heights[];
  tiles: Rhombus[];
  moves: number;
  lit: boolean;
  /** Path the point is walking, consumed one step at a time */
  walk: [number, number][];
  point?: [number, number];
  solved: boolean;
  message: string;
  shake: boolean;
};

@customElement('lattice-level')
@adoptedStyle(style)
@connectStore(progressStore)
export class LatticeLevelElement extends GemElement {
  @property ref?: LevelRef;

  #root = createRef<HTMLDivElement>();

  get #level(): LatticeLevel {
    return LEVELS[this.ref!.chapter][this.ref!.level];
  }

  get #canLift() {
    return this.ref!.chapter >= LIFT_FROM_CHAPTER;
  }

  #initial = (): State => {
    const level = this.#level;
    return {
      heights: level.kind === 'region' ? [] : level.start,
      history: [],
      tiles: [],
      moves: 0,
      lit: this.#canLift && sessionLit,
      walk: [],
      point: level.kind === 'path' ? level.from : undefined,
      solved: false,
      message: '',
      shake: false,
    };
  };

  #state = createState<State>({
    heights: [],
    history: [],
    tiles: [],
    moves: 0,
    lit: false,
    walk: [],
    solved: false,
    message: '',
    shake: false,
  });

  @willMount()
  #init = () => this.#state(this.#initial());

  #toggleLift = () => {
    if (!this.#canLift) return;
    const lit = !this.#state.lit;
    sessionLit = lit;
    this.#state({ lit });
    if (lit && !discoverShift({ headline: 'It was always cubes.', card: 'lattice-flip' })) {
      sound.move(lit ? 4 : 0);
      haptic.move();
    }
  };

  @mounted()
  #watch = () => watchTilt({ onTilt: this.#toggleLift, parallax: this.#root.value });

  #solve = () => {
    const level = this.#level;
    this.#state({ solved: true });
    const par =
      level.kind === 'match' ? distance(level.start, level.target) : level.kind === 'path' ? level.par : undefined;
    setTimeout(() => solveLevel(this.ref!, { moves: this.#state.moves, par }), 450);
  };

  #onFlip = ({ detail }: CustomEvent<Flip>) => {
    const { heights, history, moves, solved } = this.#state;
    if (solved || this.#state.walk.length) return;
    const next = applyFlip(heights, detail);
    this.#state({ heights: next, history: [...history, heights], moves: moves + 1, message: '' });
    sound.move(moves);
    haptic.move();
    this.#check(next);
  };

  #check = (heights: Heights) => {
    const level = this.#level;
    if (level.kind === 'match' && equal(heights, level.target)) this.#solve();
    if (level.kind === 'path') {
      const [i, j, z] = level.to;
      const path = heights[i][j] === z ? walkPath(level.box, heights, this.#state.point!, [i, j]) : undefined;
      if (path) this.#walk(path.slice(1));
    }
  };

  /** The point hops one column per beat, then the level is solved */
  #walk = (path: [number, number][]) => {
    this.#state({ walk: path });
    const step = () => {
      const [next, ...rest] = this.#state.walk;
      if (!next) return this.#solve();
      this.#state({ point: next, walk: rest });
      sound.move(rest.length + 3);
      setTimeout(step, 240);
    };
    setTimeout(step, 200);
  };

  /** Undoing a flip is itself a flip, so it counts as a move; lifting a tile does not */
  #undo = () => {
    const { history, tiles, moves, solved, walk } = this.#state;
    if (solved || walk.length) return;
    if (this.#level.kind === 'region') {
      if (!tiles.length) return;
      this.#state({ tiles: tiles.slice(0, -1) });
    } else {
      if (!history.length) return;
      this.#state({ heights: history.at(-1)!, history: history.slice(0, -1), moves: moves + 1 });
    }
    sound.undo();
    haptic.select();
  };

  #reset = () => {
    this.#state({ ...this.#initial(), lit: this.#state.lit });
    sound.undo();
  };

  #onPlace = ({ detail }: CustomEvent<Rhombus>) => {
    const { tiles, moves, solved } = this.#state;
    if (solved) return;
    const next = [...tiles, detail];
    this.#state({ tiles: next, moves: moves + 1, message: '' });
    sound.move(next.length);
    haptic.move();
    const level = this.#level;
    if (level.kind === 'region' && next.length * 2 === level.region.size) this.#solve();
  };

  #onLift = ({ detail }: CustomEvent<number>) => {
    const { tiles } = this.#state;
    this.#state({ tiles: tiles.filter((_, i) => i !== detail) });
    sound.undo();
    haptic.select();
  };

  #declareImpossible = () => {
    const level = this.#level;
    if (level.kind !== 'region' || this.#state.solved) return;
    if (!isTileable(level.region)) return this.#solve();
    sound.deny();
    haptic.error();
    this.#state({ message: 'It can be done.', shake: true });
    setTimeout(() => this.#state({ shake: false }), 450);
  };

  #aside = () => {
    const level = this.#level;
    if (level.kind !== 'match') return undefined;
    return html`
      <div class="flex flex-col items-center gap-1.5 rounded-2xl bg-card px-3 py-2.5 shadow-[inset_0_0_0_1px_var(--color-line)]">
        <lattice-board class="h-[66px] w-[58px]" .box=${level.box} .heights=${level.target} ?lit=${this.#state.lit}></lattice-board>
        <span class="font-mono text-[10px] tracking-[0.14em] text-muted">TARGET</span>
      </div>
    `;
  };

  #status = () => {
    const level = this.#level;
    const { moves, lit, tiles } = this.#state;
    if (level.kind === 'region') {
      const free = [...level.region].filter((key) => !tiles.some((tile) => tile.includes(key)));
      const { right, left } = countTypes(free);
      return lit
        ? html`<div class="flex justify-center gap-5 font-mono text-xs tracking-[0.12em] text-muted">
            <span>▷ <span class="text-text">${right}</span></span>
            <span>COUNT</span>
            <span>◁ <span class="text-text">${left}</span></span>
          </div>`
        : counter({ label: 'Tiles', value: tiles.length, limit: level.region.size / 2 });
    }
    const par = level.kind === 'match' ? distance(level.start, level.target) : level.par;
    return counter({ label: 'Flips', value: moves, limit: par });
  };

  #headline = () => {
    const level = this.#level;
    if (level.kind === 'region') return 'Tile the whole region — or prove you can’t.';
    if (level.kind === 'path') return 'Walk the point to the ring.';
    return this.ref!.chapter === 0 ? 'Turn small hexagons to match the target.' : '';
  };

  @template()
  #render = () => {
    if (!this.ref) return null;
    const level = this.#level;
    const { heights, lit, tiles, point, solved, message, shake } = this.#state;
    const hintLift = this.#canLift && !progressStore.lifted && this.#state.moves >= 2;
    const exit =
      level.kind === 'path'
        ? { i: level.to[0], j: level.to[1], z: level.to[2], ok: heights[level.to[0]][level.to[1]] === level.to[2] }
        : undefined;
    return html`
      <div ${this.#root} class="flex h-full flex-col bg-ink px-5 pt-safe pb-safe">
        ${levelHeader(this.ref, this.#aside())}
        <div class="mt-4">${this.#status()}</div>
        <p class="mt-3 min-h-5 text-center text-sm text-muted">${message || this.#headline()}</p>
        <div class="flex min-h-0 flex-1 items-center justify-center ${shake ? 'shake' : ''}">
          ${
            level.kind === 'region'
              ? html`<lattice-region
                  class="aspect-square max-h-full w-full max-w-[400px]"
                  .region=${level.region}
                  .tiles=${tiles}
                  ?lit=${lit}
                  @place=${this.#onPlace}
                  @lift=${this.#onLift}
                ></lattice-region>`
              : html`<lattice-board
                  class="aspect-[0.88] max-h-full w-full max-w-[400px]"
                  .box=${level.box}
                  .heights=${heights}
                  .point=${point}
                  .exit=${exit}
                  ?lit=${lit}
                  ?interactive=${!solved}
                  @flip=${this.#onFlip}
                ></lattice-board>`
          }
        </div>
        <div class="flex items-center justify-between gap-3">
          ${roundButton({ icon: icons.undo, label: 'Undo', onClick: this.#undo })}
          ${
            level.kind === 'region'
              ? pillButton({ label: 'This is impossible', onClick: this.#declareImpossible })
              : this.#canLift
                ? html`<span class=${hintLift ? 'breathe' : ''}>
                    ${pillButton({ label: lit ? 'Flatten' : 'Tilt', icon: lit ? icons.flat : icons.tilt, onClick: this.#toggleLift })}
                  </span>`
                : html`<span></span>`
          }
          ${
            level.kind === 'region' && this.#canLift
              ? roundButton({
                  icon: lit ? icons.flat : icons.tilt,
                  label: lit ? 'Flatten' : 'Tilt',
                  onClick: this.#toggleLift,
                })
              : roundButton({ icon: icons.reset, label: 'Reset', onClick: this.#reset })
          }
        </div>
      </div>
    `;
  };
}
