import { getGame } from './game';

/** Cards are keyed series-wide so a shared container can merge them later */
const CARDS_KEY = 'forma:cards';
const SETTINGS_KEY = 'forma:settings';
const progressKey = () => `forma:${getGame().id}:progress`;

type Progress = {
  /** Level id → fewest moves used */
  solved: Record<string, number>;
};

const read = <T>(key: string, fallback: T): T => {
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(key) || '{}') };
  } catch {
    return fallback;
  }
};

const initial = {
  solved: {} as Progress['solved'],
  cards: [] as string[],
  sound: true,
  /** Whether the player has discovered the dimension shift in this game */
  lifted: false,
};

export const progressStore = createStore(initial);

export const loadProgress = () => {
  const progress = read<Progress & { lifted?: boolean }>(progressKey(), { solved: {} });
  const { cards } = read(CARDS_KEY, { cards: [] as string[] });
  const { sound } = read(SETTINGS_KEY, { sound: true });
  progressStore({ ...progress, lifted: !!progress.lifted, cards, sound });
};

const save = () => {
  const { solved, lifted, cards, sound } = progressStore;
  localStorage.setItem(progressKey(), JSON.stringify({ solved, lifted }));
  localStorage.setItem(CARDS_KEY, JSON.stringify({ cards }));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ sound }));
};

export const updateProgress = (value: Partial<typeof initial>) => {
  progressStore(value);
  save();
};

/** Records a solve; returns the card id when it is newly collected */
export const recordSolve = (levelId: string, moves: number, card?: string) => {
  const best = progressStore.solved[levelId];
  const solved = { ...progressStore.solved, [levelId]: best === undefined ? moves : Math.min(best, moves) };
  const newCard = card && !progressStore.cards.includes(card) ? card : undefined;
  updateProgress({ solved, cards: newCard ? [...progressStore.cards, newCard] : progressStore.cards });
  return newCard;
};

export const collectCard = (card: string) => {
  if (progressStore.cards.includes(card)) return false;
  updateProgress({ cards: [...progressStore.cards, card] });
  return true;
};

export const isSolved = (levelId: string) => levelId in progressStore.solved;

/** A level opens once the one before it is solved; chapters open in order */
export const isUnlocked = (chapter: number, level: number) => {
  const { chapters } = getGame();
  if (level > 0) return isSolved(chapters[chapter].levels[level - 1].id);
  if (chapter === 0) return true;
  return chapters[chapter - 1].levels.every(({ id }) => isSolved(id));
};

export const chapterSolvedCount = (chapter: number) =>
  getGame().chapters[chapter].levels.filter(({ id }) => isSolved(id)).length;
