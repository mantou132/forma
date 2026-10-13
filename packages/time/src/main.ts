import { startGame } from '@forma/core/app';

import { time } from './game';

/** Music-box ticks: a bright major pentatonic, one note per tick of time */
startGame(time, { instrument: { wave: 'triangle', scale: [0, 2, 4, 7, 9] } });
