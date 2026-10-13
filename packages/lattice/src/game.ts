import type { FormaGame } from '@forma/core/game';

import { LEVELS } from './model/levels';
import type { Heights } from './model/partition';

const levelIds = (chapter: string, cards: Record<number, string> = {}) =>
  LEVELS[['flat', 'rise', 'steps', 'proof', 'paint'].indexOf(chapter)].map((_, i) => ({
    id: `${chapter}-${i + 1}`,
    card: cards[i],
  }));

const stack = (heights: Heights, size: string, point = false) => html`
  <lattice-board
    class=${size}
    lit
    .box=${{ a: heights.length, b: heights[0].length, c: Math.max(heights.length, heights[0].length, ...heights.flat()) }}
    .heights=${heights}
    .point=${point ? [0, 0] : undefined}
  ></lattice-board>
`;

const triangles = html`
  <svg viewBox="-2 -2 40 36" class="h-10 w-10" aria-hidden="true">
    <polygon points="0,0 17.3,10 0,20" fill="var(--game-accent)" opacity=".7"></polygon>
    <polygon points="20.3,12 20.3,32 3,22" fill="#ef6f6c" opacity=".6"></polygon>
  </svg>
`;

export const lattice: FormaGame = {
  id: 'lattice',
  name: 'Lattice',
  zh: '铺',
  jump: '2D → 3D',
  tagline: 'Flat tiles. Hidden cubes.',
  accent: { base: '#7b86ff', soft: '#aeb5ff', deep: '#363cb8' },
  chapters: [
    { numeral: 'I', name: 'Flat', subtitle: 'Turn small hexagons. Match the pattern.', levels: levelIds('flat') },
    {
      numeral: 'II',
      name: 'Rise',
      subtitle: 'Tilt your phone. It was always cubes.',
      levels: levelIds('rise', { 2: 'lattice-count', 3: 'lattice-distance' }),
    },
    {
      numeral: 'III',
      name: 'Steps',
      subtitle: 'Impossible stairs are just stairs.',
      levels: levelIds('steps', { 0: 'lattice-gravity', 5: 'lattice-stairs' }),
    },
    {
      numeral: 'IV',
      name: 'Proof',
      subtitle: 'Some regions can’t be tiled. Prove it.',
      levels: levelIds('proof', { 1: 'lattice-parity' }),
    },
    {
      numeral: 'V',
      name: 'Paint',
      subtitle: 'Light, shade, and one last character.',
      levels: levelIds('paint', { 4: 'lattice-form' }),
    },
  ],
  hero: () =>
    stack(
      [
        [3, 2, 1],
        [2, 1, 0],
        [1, 0, 0],
      ],
      'block h-[230px] w-[210px]',
      true,
    ),
  chapterGlyph: (chapter) => {
    switch (chapter) {
      case 0:
        return html`<lattice-board class="h-11 w-10" .box=${{ a: 1, b: 1, c: 1 }} .heights=${[[0]]}></lattice-board>`;
      case 1:
        return stack([[1]], 'h-11 w-10');
      case 2:
        return stack(
          [
            [2, 1],
            [1, 0],
          ],
          'h-11 w-10',
          true,
        );
      case 3:
        return triangles;
      default:
        return html`<span class="font-mark text-3xl text-accent">形</span>`;
    }
  },
  cardFigure: (id) => {
    switch (id) {
      case 'lattice-flip':
        return stack([[1]], 'block h-full max-h-40 aspect-[0.88]');
      case 'lattice-count':
        return stack(
          [
            [2, 1],
            [1, 0],
          ],
          'block h-full max-h-40 aspect-[0.88]',
        );
      case 'lattice-distance':
        return stack(
          [
            [3, 3, 1],
            [3, 1, 0],
            [1, 0, 0],
          ],
          'block h-full max-h-40 aspect-[0.88]',
        );
      case 'lattice-gravity':
        return stack(
          [
            [3, 1, 1],
            [1, 0, 0],
            [1, 0, 0],
          ],
          'block h-full max-h-40 aspect-[0.88]',
        );
      case 'lattice-stairs':
        return stack(
          [
            [3, 2, 1],
            [2, 1, 0],
            [1, 0, 0],
          ],
          'block h-full max-h-40 aspect-[0.88]',
          true,
        );
      case 'lattice-parity':
        return triangles;
      default:
        return html`<span class="font-mark text-6xl text-text">形</span>`;
    }
  },
  level: (ref) => html`<lattice-level class="block h-full" .ref=${ref}></lattice-level>`,
};
