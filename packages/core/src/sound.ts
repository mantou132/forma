import { progressStore } from './progress';

/**
 * Synthesized sound so the games ship without audio assets.
 * Each game picks its own instrument (wave + scale); the insight chord is the series signature and never changes.
 */
export type Instrument = {
  wave: OscillatorType;
  /** Semitones from A3 */
  scale: number[];
};

let ctx: AudioContext | undefined;
let master: GainNode | undefined;
let instrument: Instrument = { wave: 'sine', scale: [0, 2, 4, 7, 9] };

const audio = () => {
  if (!progressStore.sound) return;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.5;
    const compressor = ctx.createDynamicsCompressor();
    master.connect(compressor).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return { ctx, out: master! };
};

const freq = (semitones: number) => 220 * 2 ** (semitones / 12);

type Note = {
  semitones: number;
  at?: number;
  duration?: number;
  gain?: number;
  wave?: OscillatorType;
};

const play = ({ semitones, at = 0, duration = 0.5, gain = 0.2, wave = instrument.wave }: Note) => {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime + at;
  const osc = a.ctx.createOscillator();
  const env = a.ctx.createGain();
  osc.type = wave;
  osc.frequency.value = freq(semitones);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(env).connect(a.out);
  osc.start(t);
  osc.stop(t + duration + 0.05);
};

const scaleNote = (step: number) => {
  const { scale } = instrument;
  const octave = Math.floor(step / scale.length);
  return scale[((step % scale.length) + scale.length) % scale.length] + octave * 12;
};

export const setInstrument = (value: Instrument) => {
  instrument = value;
};

export const sound = {
  /** A move; `step` walks the game's scale so consecutive moves form a melody */
  move(step: number) {
    play({ semitones: 12 + scaleNote(step), duration: 0.35, gain: 0.14 });
  },
  undo() {
    play({ semitones: 7, duration: 0.18, gain: 0.08, wave: 'triangle' });
  },
  deny() {
    play({ semitones: -5, duration: 0.2, gain: 0.12, wave: 'triangle' });
    play({ semitones: -6, at: 0.08, duration: 0.25, gain: 0.1, wave: 'triangle' });
  },
  solve() {
    [0, 2, 4, 7].forEach((step, i) => {
      play({ semitones: 12 + scaleNote(step + 5), at: i * 0.09, duration: 0.9, gain: 0.12 });
    });
  },
  /** Series signature: the moment a dimension shift makes the answer obvious */
  insight() {
    const chord = [0, 7, 12, 16, 19, 24];
    chord.forEach((semitones, i) => {
      play({ semitones: semitones + 3, at: i * 0.06, duration: 2.6, gain: 0.07, wave: 'sine' });
      play({ semitones: semitones + 15, at: 0.4 + i * 0.05, duration: 1.8, gain: 0.025, wave: 'triangle' });
    });
  },
};
