import { startGame } from '@forma/core/app';

import { shadow } from './game';

/** Warm triangle tones in a minor pentatonic, lower than Lattice's glass */
startGame(shadow, { instrument: { wave: 'triangle', scale: [0, 3, 5, 7, 10] } });
