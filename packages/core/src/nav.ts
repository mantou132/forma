import { Stack } from '@mantou/tap-ui/elements/stack';

import type { LevelRef } from './game';

export const openChapters = () => {
  Stack.push({ content: html`<forma-chapters-page class="block h-full"></forma-chapters-page>`, gesture: true });
};

export const openLevels = (chapter: number) => {
  Stack.push({
    content: html`<forma-levels-page class="block h-full" .chapter=${chapter}></forma-levels-page>`,
    gesture: true,
  });
};

export const openLevel = (ref: LevelRef, { replace = false } = {}) => {
  const options = {
    content: html`<forma-level-page class="block h-full" .ref=${ref}></forma-level-page>`,
    gesture: true,
  };
  replace ? Stack.replace(options) : Stack.push(options);
};

export const openCards = (highlight?: string) => {
  Stack.push({
    content: html`<forma-cards-page class="block h-full" .highlight=${highlight}></forma-cards-page>`,
    gesture: true,
  });
};
