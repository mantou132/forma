import { getGame, type LevelRef } from './game';
import { haptic } from './haptics';
import { collectCard, progressStore, recordSolve, updateProgress } from './progress';
import { sound } from './sound';

type Solved = {
  ref: LevelRef;
  moves: number;
  par?: number;
  best: number;
  /** Newly collected card */
  card?: string;
};

type Insight = {
  headline: string;
  card: string;
};

export const overlayStore = createStore({
  solved: undefined as Solved | undefined,
  insight: undefined as Insight | undefined,
});

export const closeOverlay = () => overlayStore({ solved: undefined, insight: undefined });

type SolveOptions = {
  moves: number;
  /** Fewest moves possible; shown so players know when they found the clean solution */
  par?: number;
};

export const solveLevel = (ref: LevelRef, { moves, par }: SolveOptions) => {
  const info = getGame().chapters[ref.chapter].levels[ref.level];
  const card = recordSolve(info.id, moves, info.card);
  sound.solve();
  haptic.success();
  overlayStore({ solved: { ref, moves, par, best: progressStore.solved[info.id], card } });
};

/**
 * The first time the player shifts dimension in a game: the series-wide insight moment.
 * Later shifts are ordinary moves.
 */
export const discoverShift = ({ headline, card }: Insight) => {
  if (progressStore.lifted) return false;
  updateProgress({ lifted: true });
  collectCard(card);
  sound.insight();
  haptic.heavy();
  overlayStore({ insight: { headline, card } });
  return true;
};
