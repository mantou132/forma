import type { FormaGame } from '@forma/core/game';

import { LEVELS } from './model/levels';

const levelIds = (chapter: string, cards: Record<number, string> = {}) =>
  LEVELS[['now', 'then', 'narrow', 'patrol', 'form'].indexOf(chapter)].map((_, i) => ({
    id: `${chapter}-${i + 1}`,
    card: cards[i],
  }));

const glyph = (body: ReturnType<typeof svg>, size = 'h-10 w-10') => html`
  <svg viewBox="0 0 40 40" class=${size} fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>
`;

/** A route on the map: one dot, its path, its ring */
const route = svg`
  <path d="M8 30 H20 V12 H32" stroke="#f4c95d" stroke-width="2.4"></path>
  <circle cx="8" cy="30" r="4" fill="#f4c95d"></circle>
  <circle cx="32" cy="12" r="4" stroke="#f4c95d" stroke-width="2"></circle>
`;

/** Two worldlines winding up through time */
const braid = svg`
  <path d="M12 36 C12 26 28 24 28 14 C28 9 20 6 20 4" stroke="#f4c95d" stroke-width="2.4"></path>
  <path d="M28 36 C28 26 12 24 12 14 C12 9 20 6 20 4" stroke="#ef6f6c" stroke-width="2.4" opacity=".9"></path>
  <path d="M6 37 H34" stroke="var(--game-accent)" stroke-width="1.5" opacity=".6"></path>
`;

const lane = svg`
  <rect x="4" y="18" width="32" height="8" rx="2" fill="#1b1e3a" stroke="var(--game-accent)" stroke-width="1.2"></rect>
  <rect x="16" y="9" width="8" height="9" rx="2" fill="#1b1e3a" stroke="var(--game-accent)" stroke-width="1.2"></rect>
  <circle cx="9" cy="22" r="3" fill="#f4c95d"></circle>
  <circle cx="31" cy="22" r="3" fill="#ef6f6c"></circle>
`;

const patrol = svg`
  <path d="M8 36 L20 28 L8 20 L20 12 L8 4" stroke="#8a8fb0" stroke-width="2"></path>
  <path d="M30 36 V22 H30 V4" stroke="#62a8ff" stroke-width="2.4"></path>
  <polygon points="20,24 24,28 20,32 16,28" fill="#8a8fb0"></polygon>
`;

const GLYPHS = [glyph(route), glyph(braid), glyph(lane), glyph(patrol)];

export const time: FormaGame = {
  id: 'time',
  name: 'Time',
  zh: '时',
  jump: '2D+t → 3D',
  tagline: 'Every path is a line in time.',
  accent: { base: '#62e0c9', soft: '#a7f0e2', deep: '#1f6f66' },
  chapters: [
    { numeral: 'I', name: 'Now', subtitle: 'Draw each dot home. Run it and watch.', levels: levelIds('now') },
    {
      numeral: 'II',
      name: 'Then',
      subtitle: 'Raise time. Every route becomes a line.',
      levels: levelIds('then', { 1: 'time-crossing', 5: 'time-braid' }),
    },
    {
      numeral: 'III',
      name: 'Narrow',
      subtitle: 'One lane. Somebody has to go first.',
      levels: levelIds('narrow', { 0: 'time-order' }),
    },
    {
      numeral: 'IV',
      name: 'Patrol',
      subtitle: 'Moving walls stand still in spacetime.',
      levels: levelIds('patrol', { 0: 'time-patrol' }),
    },
    {
      numeral: 'V',
      name: 'Form',
      subtitle: 'A map, a clock, and one character.',
      levels: levelIds('form', { 3: 'time-form' }),
    },
  ],
  hero: () => html`<time-hero class="block h-[280px] w-[300px]"></time-hero>`,
  chapterGlyph: (chapter) => GLYPHS[chapter] ?? html`<span class="font-mark text-3xl text-accent">形</span>`,
  cardFigure: (id) => {
    switch (id) {
      case 'time-worldline':
        return glyph(
          svg`${route}<path d="M8 30 V6" stroke="var(--game-accent)" stroke-width="1.5" stroke-dasharray="2 3"></path>`,
          'h-full max-h-36 w-auto',
        );
      case 'time-crossing':
      case 'time-braid':
        return glyph(braid, 'h-full max-h-36 w-auto');
      case 'time-order':
        return glyph(lane, 'h-full max-h-36 w-auto');
      case 'time-patrol':
        return glyph(patrol, 'h-full max-h-36 w-auto');
      default:
        return html`<span class="font-mark text-6xl text-text">形</span>`;
    }
  },
  level: (ref) => html`<time-level class="block h-full" .ref=${ref}></time-level>`,
};
