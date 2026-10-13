import { getGame } from '../game';
import { openCards, openLevels } from '../nav';
import { chapterSolvedCount, isUnlocked, progressStore } from '../progress';
import { backButton, icons } from '../ui';

@customElement('forma-chapters-page')
@connectStore(progressStore)
export class FormaChaptersPageElement extends GemElement {
  @template()
  #render = () => {
    const game = getGame();
    const total = game.chapters.reduce((n, { levels }) => n + levels.length, 0);
    const solved = Object.keys(progressStore.solved).length;
    const current = game.chapters.findIndex(
      (_, i) => isUnlocked(i, 0) && chapterSolvedCount(i) < game.chapters[i].levels.length,
    );
    const cards = progressStore.cards.filter((id) => id.startsWith(`${game.id}-`)).length;
    return html`
      <div class="flex h-full flex-col overflow-y-auto bg-ink px-5 pt-safe pb-safe">
        <div class="flex items-center justify-between">
          ${backButton()}
          <span class="label">Levels <span class="text-text">${solved}</span> / ${total}</span>
        </div>
        <div class="mt-8 flex flex-col gap-1">
          <span class="label text-accent">Forma · ${game.name}</span>
          <span class="text-[28px] font-medium tracking-tight">${game.tagline}</span>
        </div>
        <forma-dimension-map class="mt-5 block"></forma-dimension-map>
        <div class="mt-5 flex flex-col gap-2">
          ${game.chapters.map((chapter, i) => {
            const open = isUnlocked(i, 0);
            const done = chapterSolvedCount(i);
            const now = i === current;
            return html`
              <button
                class="flex w-full items-center gap-4 rounded-[20px] px-[18px] py-4 text-left transition active:scale-[0.99] ${now ? 'bg-card-strong shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--game-accent)_40%,transparent)]' : open ? 'bg-card' : 'bg-transparent shadow-[inset_0_0_0_1px_var(--color-line)]'} ${open ? 'cursor-pointer' : 'cursor-default'}"
                ?disabled=${!open}
                @click=${() => openLevels(i)}
              >
                <span class="flex size-12 shrink-0 items-center justify-center ${open ? '' : 'opacity-35 grayscale'}">${game.chapterGlyph(i)}</span>
                <span class="flex flex-1 flex-col gap-1">
                  <span class="label ${now ? 'text-accent' : ''}">${chapter.numeral}${now ? ' · Now' : ''}</span>
                  <span class="text-lg font-medium ${open ? 'text-text' : 'text-dim'}">${chapter.name}</span>
                  <span class="text-[13px] ${open ? 'text-muted' : 'text-dim'}">${chapter.subtitle}</span>
                </span>
                ${
                  open
                    ? html`<span class="font-mono text-xs ${done === chapter.levels.length ? 'text-accent' : 'text-muted'}">${done}/${chapter.levels.length}</span>`
                    : html`<span class="text-dim">${icons.lock}</span>`
                }
              </button>
            `;
          })}
        </div>
        <button class="label mx-auto mt-6 flex cursor-pointer items-center gap-2 hover:text-text" @click=${() => openCards()}>
          ${icons.cards} ${cards} theorem ${cards === 1 ? 'card' : 'cards'} collected
        </button>
      </div>
    `;
  };
}
