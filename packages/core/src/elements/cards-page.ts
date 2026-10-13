import { CARDS, cardNumber, SERIES, type TheoremCard } from '../cards';
import { getGame } from '../game';
import { progressStore } from '../progress';
import { backButton } from '../ui';

const gameOf = (card: TheoremCard) => SERIES.find(({ id }) => id === card.game)!;

/** Theorem card collection; cards from other Forma games appear greyed out */
@customElement('forma-cards-page')
@connectStore(progressStore)
export class FormaCardsPageElement extends GemElement {
  @property highlight?: string;

  #state = createState({ selected: '' });

  get #selected() {
    const owned = (id: string) => progressStore.cards.includes(id);
    const id = [this.#state.selected, this.highlight, progressStore.cards.at(-1)].find((id) => id && owned(id));
    return CARDS.find((card) => card.id === id);
  }

  #figure = (card: TheoremCard, size: 'large' | 'small') => {
    const game = getGame();
    if (card.game === game.id) return game.cardFigure(card.id);
    return html`<span class="font-mark ${size === 'large' ? 'text-7xl' : 'text-2xl'} text-soft">${gameOf(card).zh}</span>`;
  };

  #featured = (card?: TheoremCard) => {
    if (!card) {
      return html`
        <div class="flex h-full flex-col items-center justify-center gap-3 text-center">
          <span class="font-mark text-6xl text-dim">形</span>
          <span class="max-w-60 text-sm text-muted">Every “aha” leaves a card behind. Solve levels to collect them.</span>
        </div>
      `;
    }
    const game = gameOf(card);
    return html`
      <div class="flex h-full flex-col gap-5">
        <div class="flex justify-between">
          <span class="label">No. ${String(cardNumber(card)).padStart(2, '0')}</span>
          <span class="label text-accent">${game.name}</span>
        </div>
        <div class="flex flex-1 items-center justify-center">${this.#figure(card, 'large')}</div>
        <div class="flex flex-col gap-2">
          <span class="text-[26px] font-medium tracking-tight">${card.title}</span>
          <span class="text-[15px] leading-relaxed text-soft">${card.text}</span>
        </div>
      </div>
    `;
  };

  @template()
  #render = () => {
    const selected = this.#selected;
    const count = progressStore.cards.length;
    const shipped = new Set(CARDS.map(({ game }) => game));
    return html`
      <div class="flex h-full flex-col overflow-y-auto bg-ink px-5 pt-safe pb-safe">
        <div class="flex items-center justify-between">
          ${backButton()}
          <span class="label">Theorem cards · <span class="text-text">${count}</span> / ${CARDS.length}</span>
        </div>
        <div
          class="mt-6 h-[380px] shrink-0 rounded-[28px] bg-[linear-gradient(160deg,#1f2350,#101226_70%)] p-6 shadow-[inset_0_0_0_1px_var(--color-line),0_30px_60px_-30px_var(--game-accent-deep)]"
        >
          ${this.#featured(selected)}
        </div>
        <div class="mt-6 grid grid-cols-4 gap-2.5">
          ${CARDS.map((card) => {
            const owned = progressStore.cards.includes(card.id);
            const active = card === selected;
            return html`
              <button
                class="flex h-[76px] flex-col items-center justify-center gap-1.5 rounded-[14px] transition ${active ? 'bg-card-strong shadow-[inset_0_0_0_1.5px_var(--game-accent)]' : owned ? 'cursor-pointer bg-card' : 'shadow-[inset_0_0_0_1px_var(--color-line)]'}"
                ?disabled=${!owned}
                aria-label=${owned ? card.title : 'Locked card'}
                @click=${() => this.#state({ selected: card.id })}
              >
                <span class="flex h-8 items-center justify-center [&_svg]:h-8 [&_svg]:w-auto ${owned ? '' : 'opacity-25 grayscale'}">
                  ${this.#figure(card, 'small')}
                </span>
                <span class="font-mono text-[10px] ${owned ? 'text-soft' : 'text-dim'}">
                  ${gameOf(card).zh} ${String(cardNumber(card)).padStart(2, '0')}
                </span>
              </button>
            `;
          })}
          ${SERIES.filter(({ id }) => !shipped.has(id)).map(
            ({ name, zh }) => html`
              <div class="flex h-[76px] flex-col items-center justify-center gap-1 rounded-[14px] border border-dashed border-line">
                <span class="font-mark text-xl text-dim">${zh}</span>
                <span class="font-mono text-[9px] tracking-[0.14em] text-dim uppercase">${name}</span>
              </div>
            `,
          )}
        </div>
        <span class="label mx-auto mt-6 text-center normal-case tracking-normal">Cards from other Forma games light up here.</span>
      </div>
    `;
  };
}
