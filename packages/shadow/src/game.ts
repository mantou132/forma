import type { FormaGame } from '@forma/core/game';

import { LEVELS } from './model/levels';

const levelIds = (chapter: string, cards: Record<number, string> = {}) =>
  LEVELS[['solid', 'cast', 'plug', 'sparse', 'form'].indexOf(chapter)].map((_, i) => ({
    id: `${chapter}-${i + 1}`,
    card: cards[i],
  }));

const glyph = (body: ReturnType<typeof svg>) => html`
  <svg viewBox="0 0 40 40" class="h-10 w-10" fill="none" stroke-linejoin="round" aria-hidden="true">${body}</svg>
`;

const cube = svg`
  <polygon points="20,6 33,13 20,20 7,13" fill="#f6ead8"></polygon>
  <polygon points="7,13 20,20 20,34 7,27" fill="#c9b79c"></polygon>
  <polygon points="33,13 20,20 20,34 33,27" fill="#e3d2b8"></polygon>
`;

const trio = svg`
  <circle cx="9" cy="20" r="6" fill="var(--game-accent)"></circle>
  <rect x="16" y="14" width="11" height="12" fill="var(--game-accent)" opacity=".75"></rect>
  <polygon points="34,14 39,26 29,26" fill="var(--game-accent)" opacity=".5"></polygon>
`;

const GLYPHS = [
  glyph(cube),
  glyph(svg`<rect x="6" y="8" width="20" height="20" fill="var(--game-accent-deep)"></rect>
    <rect x="13" y="14" width="20" height="20" fill="#f6ead8"></rect>`),
  glyph(trio),
  glyph(svg`${cube}<circle cx="20" cy="20" r="2.4" fill="#0b0c14"></circle>`),
  html`<span class="font-mark text-3xl text-accent">形</span>`,
];

export const shadow: FormaGame = {
  id: 'shadow',
  name: 'Shadow',
  zh: '影',
  jump: '3D → 2D',
  tagline: 'One object. Three shadows.',
  accent: { base: '#f5b65b', soft: '#ffd79a', deep: '#8a4f12' },
  chapters: [
    { numeral: 'I', name: 'Solid', subtitle: 'Tap cubes away until the shadows match.', levels: levelIds('solid') },
    {
      numeral: 'II',
      name: 'Cast',
      subtitle: 'Look straight down an axis. Depth disappears.',
      levels: levelIds('cast', { 5: 'shadow-hull' }),
    },
    {
      numeral: 'III',
      name: 'Plug',
      subtitle: 'A circle, a square and a triangle — at once.',
      levels: levelIds('plug', { 0: 'shadow-plug' }),
    },
    {
      numeral: 'IV',
      name: 'Sparse',
      subtitle: 'The same shadows from as few cubes as possible.',
      levels: levelIds('sparse', { 0: 'shadow-sparse' }),
    },
    {
      numeral: 'V',
      name: 'Form',
      subtitle: 'F, O, R, M, A — and one character.',
      levels: levelIds('form', { 3: 'shadow-form' }),
    },
  ],
  hero: () => html`<shadow-model class="h-[260px] w-[300px]" .level=${LEVELS[2][1]}></shadow-model>`,
  chapterGlyph: (chapter) => GLYPHS[chapter],
  cardFigure: (id) => {
    switch (id) {
      case 'shadow-through':
        return GLYPHS[1];
      case 'shadow-hull':
        return glyph(cube);
      case 'shadow-plug':
        return GLYPHS[2];
      case 'shadow-sparse':
        return GLYPHS[3];
      default:
        return html`<span class="font-mark text-6xl text-text">形</span>`;
    }
  },
  level: (ref) => html`<shadow-level class="block h-full" .ref=${ref}></shadow-level>`,
};
