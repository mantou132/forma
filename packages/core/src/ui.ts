import type { TemplateResult } from '@mantou/gem';
import { Stack } from '@mantou/tap-ui/elements/stack';

const stroke = (d: TemplateResult) => html`
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>
`;

export const icons = {
  back: stroke(svg`<path d="M15 5l-7 7 7 7"></path>`),
  undo: stroke(svg`<path d="M9 14L4 9l5-5"></path><path d="M4 9h10.5a5.5 5.5 0 010 11H11"></path>`),
  reset: stroke(svg`<path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path>`),
  cards: stroke(
    svg`<rect x="4" y="3" width="13" height="17" rx="2.5"></rect><path d="M8 21h10.5a2 2 0 002-2V7"></path>`,
  ),
  sound: stroke(
    svg`<path d="M11 5L6 9H3v6h3l5 4V5z"></path><path d="M15.5 8.5a5 5 0 010 7"></path><path d="M18.5 5.5a9 9 0 010 13"></path>`,
  ),
  mute: stroke(svg`<path d="M11 5L6 9H3v6h3l5 4V5z"></path><path d="M22 9l-6 6M16 9l6 6"></path>`),
  lock: stroke(svg`<rect x="5" y="11" width="14" height="9" rx="2"></rect><path d="M8 11V8a4 4 0 018 0v3"></path>`),
  check: stroke(svg`<path d="M5 12.5l4.5 4.5L19 7.5"></path>`),
  tilt: stroke(
    svg`<rect x="7" y="3" width="10" height="18" rx="2.5" transform="rotate(-18 12 12)"></rect><path d="M3 8a10 10 0 012-3.5M21 16a10 10 0 01-2 3.5"></path>`,
  ),
  flat: stroke(svg`<path d="M3 15l9 5 9-5"></path><path d="M3 9l9 5 9-5-9-5-9 5z"></path>`),
  next: stroke(svg`<path d="M9 5l7 7-7 7"></path>`),
};

type RoundButtonOptions = {
  icon: TemplateResult;
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

export const roundButton = ({ icon, label, onClick, disabled }: RoundButtonOptions) => html`
  <button
    class="flex size-13 cursor-pointer items-center justify-center rounded-full bg-glass text-soft transition active:scale-95 disabled:opacity-30 enabled:hover:bg-glass-strong enabled:hover:text-white"
    aria-label=${label}
    ?disabled=${disabled}
    @click=${onClick}
  >
    ${icon}
  </button>
`;

type PillButtonOptions = {
  label: string;
  icon?: TemplateResult;
  onClick: () => void;
  active?: boolean;
};

/** The light pill used for the dimension shift and other primary actions */
export const pillButton = ({ label, icon, onClick, active }: PillButtonOptions) => html`
  <button
    class="flex h-13 cursor-pointer items-center gap-2.5 rounded-full px-6 text-base font-semibold transition active:scale-[0.97] ${active ? 'bg-accent text-ink' : 'bg-text text-ink hover:bg-white'}"
    @click=${onClick}
  >
    ${icon}${label}
  </button>
`;

export const backButton = (label = 'Back') => html`
  <button
    class="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-glass text-soft transition hover:bg-glass-strong hover:text-white active:scale-95"
    aria-label=${label}
    @click=${() => Stack.pop()}
  >
    ${icons.back}
  </button>
`;
