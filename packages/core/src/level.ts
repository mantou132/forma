import type { TemplateResult } from '@mantou/gem';

import { type LevelRef, levelLabel } from './game';
import { backButton } from './ui';

/** Top bar shared by every level: back, chapter label and level number, plus a game-specific aside (target, counter) */
export const levelHeader = (ref: LevelRef, aside?: TemplateResult) => {
  const label = levelLabel(ref);
  return html`
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-3">
        ${backButton('Back to levels')}
        <div class="flex flex-col gap-1">
          <span class="label">${label.chapter}</span>
          <span class="text-[22px] font-medium leading-none">${label.number}</span>
        </div>
      </div>
      ${aside}
    </div>
  `;
};

type CounterOptions = {
  label: string;
  value: number;
  /** Shown as `value / limit` */
  limit?: number;
};

export const counter = ({ label, value, limit }: CounterOptions) => html`
  <div class="flex justify-center gap-2 font-mono text-xs tracking-[0.12em] text-muted uppercase">
    <span>${label}</span>
    <span class="${limit !== undefined && value > limit ? 'text-[#EF6F6C]' : 'text-text'}">${value}</span>
    ${limit === undefined ? null : html`<span>/ ${limit}</span>`}
  </div>
`;
