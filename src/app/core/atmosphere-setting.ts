import { signal } from '@angular/core';

const KEY = 'hey-atmosphere';

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

/** Whether chat backgrounds take on the room's feelings (on by default, per device). */
export const atmosphereEnabled = signal(read());

export function setAtmosphereEnabled(on: boolean): void {
  atmosphereEnabled.set(on);
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
}
