import { startGame } from '@forma/core/app';

import { lattice } from './game';

/** Pentatonic glass: soft sine tones for laying tiles */
startGame(lattice, { instrument: { wave: 'sine', scale: [0, 2, 4, 7, 9] } });
