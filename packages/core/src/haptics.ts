import { impactFeedback, notificationFeedback, selectionFeedback } from '@tauri-apps/plugin-haptics';

/** The haptics plugin is only registered in the mobile apps */
const native = '__TAURI_INTERNALS__' in window && /iPhone|iPad|Android/i.test(navigator.userAgent);

const vibrate = (pattern: number | number[]) => navigator.vibrate?.(pattern);

export const haptic = {
  select() {
    native ? selectionFeedback() : vibrate(4);
  },
  move() {
    native ? impactFeedback('light') : vibrate(8);
  },
  heavy() {
    native ? impactFeedback('heavy') : vibrate(18);
  },
  success() {
    native ? notificationFeedback('success') : vibrate([10, 60, 16]);
  },
  error() {
    native ? notificationFeedback('error') : vibrate([24, 40, 24]);
  },
};
