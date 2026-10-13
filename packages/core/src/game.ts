import type { TemplateResult } from '@mantou/gem';

import type { GameId } from './cards';

export type LevelInfo = {
  id: string;
  /** Theorem card unlocked the first time this level is solved */
  card?: string;
};

export type Chapter = {
  /** Roman numeral shown in labels, e.g. `II` */
  numeral: string;
  name: string;
  /** One line under the chapter name */
  subtitle: string;
  levels: LevelInfo[];
};

export type LevelRef = {
  chapter: number;
  level: number;
};

export type FormaGame = {
  id: GameId;
  /** English title, e.g. `Lattice` */
  name: string;
  /** The second character of the Chinese title, e.g. `铺` in 形·铺 */
  zh: string;
  /** `2D → 3D` style dimension jump */
  jump: string;
  tagline: string;
  accent: { base: string; soft: string; deep: string };
  chapters: Chapter[];
  /** Title-screen art */
  hero: () => TemplateResult;
  /** Small glyph for a chapter row */
  chapterGlyph: (chapter: number) => TemplateResult;
  /** Card figure for this game's own theorem cards */
  cardFigure: (cardId: string) => TemplateResult;
  /** Level page content */
  level: (ref: LevelRef) => TemplateResult;
};

let current: FormaGame | undefined;

export const defineGame = (game: FormaGame) => {
  current = game;
  const root = document.documentElement.style;
  root.setProperty('--game-accent', game.accent.base);
  root.setProperty('--game-accent-soft', game.accent.soft);
  root.setProperty('--game-accent-deep', game.accent.deep);
  return game;
};

export const getGame = () => {
  if (!current) throw new Error('defineGame() must run before the app starts');
  return current;
};

export const levelLabel = ({ chapter, level }: LevelRef) => {
  const { numeral, name } = getGame().chapters[chapter];
  return { chapter: `${numeral} · ${name}`, number: String(level + 1).padStart(2, '0') };
};

export const levelKey = ({ chapter, level }: LevelRef) => getGame().chapters[chapter].levels[level].id;

export const nextLevel = ({ chapter, level }: LevelRef): LevelRef | undefined => {
  const { chapters } = getGame();
  if (level + 1 < chapters[chapter].levels.length) return { chapter, level: level + 1 };
  if (chapter + 1 < chapters.length) return { chapter: chapter + 1, level: 0 };
};
