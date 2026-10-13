import { Stack } from '@mantou/tap-ui/elements/stack';

import { cardNumber, getCard } from '../cards';
import { type LevelRef, nextLevel } from '../game';
import { openCards, openLevel } from '../nav';
import { closeOverlay, overlayStore } from '../overlay';
import { isUnlocked } from '../progress';
import { icons, pillButton } from '../ui';

const style = css`
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(24px);
    }
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
  @keyframes ring {
    from {
      transform: scale(0.6);
      opacity: 0.8;
    }
    to {
      transform: scale(1.6);
      opacity: 0;
    }
  }
  .panel {
    animation: rise 0.55s var(--ease-spring) both;
  }
  .fade {
    animation: fade 0.8s ease both;
  }
  .late {
    animation: rise 0.8s var(--ease-spring) 0.9s both;
  }
  .ring {
    animation: ring 2.4s ease-out infinite;
  }
`;

const cardBlock = (id: string) => {
  const card = getCard(id)!;
  return html`
    <button
      class="flex w-full cursor-pointer flex-col gap-2 rounded-[20px] bg-card-strong p-5 text-left shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--game-accent)_35%,transparent)]"
      @click=${() => {
        closeOverlay();
        openCards(id);
      }}
    >
      <span class="label text-accent">Theorem card ${String(cardNumber(card)).padStart(2, '0')} unlocked</span>
      <span class="text-lg font-medium">${card.title}</span>
      <span class="text-sm leading-relaxed text-soft">${card.text}</span>
    </button>
  `;
};

/** Solved panel and insight moment, rendered above the Stack */
@customElement('forma-overlay')
@adoptedStyle(style)
@connectStore(overlayStore)
export class FormaOverlayElement extends GemElement {
  #next = (ref: LevelRef) => {
    closeOverlay();
    const next = nextLevel(ref);
    if (next && isUnlocked(next.chapter, next.level)) {
      openLevel(next, { replace: true });
    } else {
      Stack.pop();
    }
  };

  #replay = (ref: LevelRef) => {
    closeOverlay();
    openLevel(ref, { replace: true });
  };

  @template()
  #render = () => {
    const { solved, insight } = overlayStore;
    if (insight) {
      return html`
        <div class="fade fixed inset-0 z-50 flex flex-col justify-between bg-[linear-gradient(#0b0c14f2,#0b0c1499_30%,transparent_45%,transparent_60%,#0b0c14f2_78%)] px-6 pt-safe pb-safe">
          <div class="mt-10 flex flex-col items-center gap-3 text-center">
            <span class="label text-accent">Insight</span>
            <span class="text-[34px] font-medium leading-tight tracking-tight">${insight.headline}</span>
          </div>
          <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span class="ring size-56 rounded-full border border-accent"></span>
          </div>
          <div class="late flex flex-col gap-4">
            ${cardBlock(insight.card)}
            <div class="flex justify-center">${pillButton({ label: 'Continue', onClick: closeOverlay })}</div>
          </div>
        </div>
      `;
    }
    if (solved) {
      const { ref, moves, par, best, card } = solved;
      const clean = par !== undefined && moves <= par;
      return html`
        <div class="fade fixed inset-0 z-50 flex flex-col justify-end bg-[linear-gradient(transparent_25%,#0b0c14f2_58%)]">
          <div class="panel flex flex-col gap-5 px-5 pb-safe">
            <div class="flex items-end justify-between">
              <div class="flex flex-col gap-1">
                <span class="label text-accent">${clean ? 'Solved · Perfect' : 'Solved'}</span>
                <span class="text-[34px] font-medium leading-none tracking-tight">${moves} ${moves === 1 ? 'move' : 'moves'}</span>
              </div>
              <div class="flex flex-col items-end gap-1 font-mono text-xs text-muted">
                ${par === undefined ? null : html`<span>Fewest ${par}</span>`}
                <span>Best ${best}</span>
              </div>
            </div>
            ${card ? cardBlock(card) : null}
            <div class="flex items-center justify-between gap-3">
              <button class="flex h-13 cursor-pointer items-center gap-2 rounded-full px-5 text-soft hover:bg-glass" @click=${() => this.#replay(ref)}>
                ${icons.reset} Replay
              </button>
              ${pillButton({ label: 'Next', icon: icons.next, onClick: () => this.#next(ref) })}
            </div>
          </div>
        </div>
      `;
    }
    // Not `null`: Gem hides null renders with a scoped style that Chrome keeps applying after it is removed
    return html``;
  };
}
