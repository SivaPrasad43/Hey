import { Injectable, signal } from '@angular/core';
import { DEFAULT_MOOD, MoodId, getMood } from '../../core/moods';

const MOOD_KEY = 'hey-mood';

/** UI state shared between the chat shell and the open room. */
@Injectable({ providedIn: 'root' })
export class ChatStateService {
  readonly activeRoomId = signal<string | null>(null);
  readonly mood = signal<MoodId>(readMood());

  private defaultApplied = false;

  /** Start each session in the user's chosen default mood (once). */
  applyDefault(id: MoodId | undefined): void {
    if (this.defaultApplied || !id) return;
    this.defaultApplied = true;
    this.mood.set(getMood(id).id);
  }

  setMood(id: MoodId): void {
    this.mood.set(id);
    try {
      localStorage.setItem(MOOD_KEY, id);
    } catch {
      /* ignore */
    }
  }
}

function readMood(): MoodId {
  try {
    return getMood(localStorage.getItem(MOOD_KEY)).id;
  } catch {
    return DEFAULT_MOOD;
  }
}
