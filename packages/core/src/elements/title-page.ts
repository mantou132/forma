import { SERIES } from '../cards';
import { getGame } from '../game';
import { openCards, openChapters } from '../nav';
import { progressStore, updateProgress } from '../progress';
import { requestTiltPermission } from '../tilt';
import { icons, roundButton } from '../ui';

const style = css`
  @keyframes float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-8px);
    }
  }
  @keyframes blink {
    0%,
    100% {
      opacity: 0.35;
    }
    50% {
      opacity: 1;
    }
  }
  .hero {
    animation: float 6s ease-in-out infinite;
  }
  .hint {
    animation: blink 2.6s ease-in-out infinite;
  }
  .glow {
    background: radial-gradient(60% 45% at 50% 42%, color-mix(in srgb, var(--game-accent-deep) 55%, transparent), transparent);
  }
`;

@customElement('forma-title-page')
@adoptedStyle(style)
@connectStore(progressStore)
export class FormaTitlePageElement extends GemElement {
  #begin = () => {
    requestTiltPermission();
    openChapters();
  };

  @template()
  #render = () => {
    const game = getGame();
    return html`
      <div class="glow relative flex h-full flex-col items-center bg-ink pt-safe pb-safe">
        <div class="label mt-6">Series ${String(SERIES.findIndex(({ id }) => id === game.id) + 1).padStart(2, '0')} · ${game.jump}</div>
        <button class="flex flex-1 cursor-pointer flex-col items-center justify-center gap-10" @click=${this.#begin}>
          <div class="hero">${game.hero()}</div>
          <forma-mark name=${game.name}></forma-mark>
          <span class="hint label mt-2">Tap to begin</span>
        </button>
        <div class="flex gap-4">
          ${roundButton({ icon: icons.cards, label: 'Theorem cards', onClick: () => openCards() })}
          ${roundButton({
            icon: progressStore.sound ? icons.sound : icons.mute,
            label: progressStore.sound ? 'Mute' : 'Unmute',
            onClick: () => updateProgress({ sound: !progressStore.sound }),
          })}
        </div>
      </div>
    `;
  };
}
