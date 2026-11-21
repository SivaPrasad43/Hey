import { Injectable, signal } from '@angular/core';
import { DEFAULT_MOOD, MoodId, getMood } from '../../core/moods';

/** UI state shared between the chat shell and the open room. */
@Injectable({ providedIn: 'root' })
export class ChatStateService {
  readonly activeRoomId = signal<string | null>(null);
  /** Every session starts on the default feeling (Calm, or the one picked in Settings). */
  readonly mood = signal<MoodId>(DEFAULT_MOOD);

  private defaultApplied = false;

  /** Start each session in the user's chosen default mood (once). */
  applyDefault(id: MoodId | undefined): void {
    if (this.defaultApplied || !id) return;
    this.defaultApplied = true;
    this.mood.set(getMood(id).id);
  }

  setMood(id: MoodId): void {
    this.mood.set(id);
  }
}
