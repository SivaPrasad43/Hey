import { Injectable, signal } from '@angular/core';

const KEY = 'hey-theme';
export type ThemeMode = 'light' | 'dark' | 'system';
/** Theme for people who haven't chosen one. Keep in sync with the pre-paint script in index.html. */
export const DEFAULT_THEME: ThemeMode = 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private media = matchMedia('(prefers-color-scheme: dark)');
  readonly mode = signal<ThemeMode>(readMode());
  readonly dark = signal(document.documentElement.classList.contains('dark'));

  constructor() {
    this.media.addEventListener('change', () => {
      if (this.mode() === 'system') this.apply();
    });
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      /* storage unavailable */
    }
    this.apply();
  }

  toggle(): void {
    this.setMode(this.dark() ? 'light' : 'dark');
  }

  private apply(): void {
    const dark = this.mode() === 'dark' || (this.mode() === 'system' && this.media.matches);
    this.dark.set(dark);
    document.documentElement.classList.toggle('dark', dark);
  }
}

function readMode(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}
