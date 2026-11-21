import { getMood } from './moods';

const KEY = 'hey-haptics';

export function hapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator && matchMedia('(pointer: coarse)').matches;
}

export function hapticsEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setHapticsEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
}

/** Short per-emotion vibration on touch devices. No-op elsewhere. */
export function vibrate(mood: string): void {
  if (!hapticsSupported() || !hapticsEnabled()) return;
  try {
    navigator.vibrate(getMood(mood).haptic);
  } catch {
    /* ignore */
  }
}
