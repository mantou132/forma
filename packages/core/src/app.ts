import { initApp } from '@mantou/tap-ui/helper/webapp';
import { extendTheme } from '@mantou/tap-ui/lib/theme';

import { defineGame, type FormaGame } from './game';
import { loadProgress } from './progress';
import { type Instrument, setInstrument } from './sound';

import './styles/tailwind.css';
import './elements/overlay';
import './elements/title-page';

extendTheme({
  colorScheme: 'dark',
  backgroundColor: 'var(--color-ink)',
  lightBackgroundColor: 'var(--color-card)',
  textColor: 'var(--color-text)',
  highlightColor: 'var(--color-text)',
  describeColor: 'var(--color-muted)',
  primaryColor: 'var(--color-accent)',
  font: 'var(--font-sans)',
  codeFont: 'var(--font-mono)',
});

type StartOptions = {
  instrument: Instrument;
};

export const startGame = (game: FormaGame, { instrument }: StartOptions) => {
  defineGame(game);
  loadProgress();
  setInstrument(instrument);
  document.title = `Forma 形 · ${game.name}`;
  initApp({ template: html`<forma-title-page class="block h-full"></forma-title-page>` });
  const overlay = document.createElement('forma-overlay');
  document.body.append(overlay);
};
