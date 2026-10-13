import { getGame } from '../game';
import { openLevel } from '../nav';
import { isSolved, isUnlocked, progressStore } from '../progress';
import { backButton, icons } from '../ui';

@customElement('forma-levels-page')
@connectStore(progressStore)
export class FormaLevelsPageElement extends GemElement {
  @property chapter = 0;

  @template()
  #render = () => {
    const chapter = getGame().chapters[this.chapter];
    return html`
      <div class="flex h-full flex-col overflow-y-auto bg-ink px-5 pt-safe pb-safe">
        <div class="flex items-center gap-3">${backButton()}</div>
        <div class="mt-8 flex items-end justify-between">
          <div class="flex flex-col gap-1">
            <span class="label text-accent">${chapter.numeral}</span>
            <span class="text-[28px] font-medium tracking-tight">${chapter.name}</span>
            <span class="text-sm text-muted">${chapter.subtitle}</span>
          </div>
          <span class="flex size-16 items-center justify-center">${getGame().chapterGlyph(this.chapter)}</span>
        </div>
        <div class="mt-8 grid grid-cols-4 gap-3">
          ${chapter.levels.map(({ id, card }, level) => {
            const open = isUnlocked(this.chapter, level);
            const solved = isSolved(id);
            const moves = progressStore.solved[id];
            return html`
              <button
                class="relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl transition active:scale-95 disabled:cursor-default ${solved ? 'bg-card-strong' : open ? 'bg-card shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--game-accent)_45%,transparent)]' : 'shadow-[inset_0_0_0_1px_var(--color-line)]'}"
                ?disabled=${!open}
                aria-label="Level ${level + 1}"
                @click=${() => openLevel({ chapter: this.chapter, level })}
              >
                <span class="text-xl font-medium ${open ? 'text-text' : 'text-dim'}">${String(level + 1).padStart(2, '0')}</span>
                ${
                  solved
                    ? html`<span class="font-mono text-[10px] text-accent">${moves} moves</span>`
                    : open
                      ? null
                      : html`<span class="text-dim [&_svg]:size-3.5">${icons.lock}</span>`
                }
                <span v-if=${!!card} class="absolute top-2 right-2 size-1.5 rounded-full ${solved ? 'bg-accent' : 'bg-dim'}"></span>
              </button>
            `;
          })}
        </div>
      </div>
    `;
  };
}
