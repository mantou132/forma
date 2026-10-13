/**
 * Tilting the phone is the series-wide "change dimension" gesture.
 * Every screen that offers it also has a button, for desktops and for players who decline motion access.
 */

type OrientationEventStatic = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

const TRIGGER = 24;
const REARM = 10;

let permission: Promise<boolean> | undefined;

/** iOS asks for motion access; it must be called from a user gesture, so the title screen does it */
export const requestTiltPermission = () => {
  const Orientation = globalThis.DeviceOrientationEvent as OrientationEventStatic | undefined;
  permission ??= Orientation?.requestPermission
    ? Orientation.requestPermission()
        .then((state) => state === 'granted')
        .catch(() => false)
    : Promise.resolve(!!Orientation);
  return permission;
};

type WatchTiltOptions = {
  /** Fired once per deliberate tilt (~24°), re-armed after the phone returns near its starting angle */
  onTilt: () => void;
  /** Receives `--tilt-x` / `--tilt-y` in [-1, 1] for parallax */
  parallax?: HTMLElement;
};

export const watchTilt = ({ onTilt, parallax }: WatchTiltOptions) => {
  let base: { beta: number; gamma: number } | undefined;
  let armed = true;
  const handle = ({ beta, gamma }: DeviceOrientationEvent) => {
    if (beta === null || gamma === null) return;
    base ??= { beta, gamma };
    const dBeta = beta - base.beta;
    const dGamma = gamma - base.gamma;
    const delta = Math.max(Math.abs(dBeta), Math.abs(dGamma));
    if (armed && delta > TRIGGER) {
      armed = false;
      onTilt();
    } else if (!armed && delta < REARM) {
      armed = true;
    }
    if (parallax) {
      const clamp = (v: number) => Math.max(-1, Math.min(1, v / 30));
      parallax.style.setProperty('--tilt-x', clamp(dGamma).toFixed(3));
      parallax.style.setProperty('--tilt-y', clamp(dBeta).toFixed(3));
    }
  };
  addEventListener('deviceorientation', handle);
  return () => removeEventListener('deviceorientation', handle);
};
