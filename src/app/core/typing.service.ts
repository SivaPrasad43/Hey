import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  Timestamp,
  collection,
  collectionData,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { MoodId } from './moods';

/** Typing entries older than this are ignored (covers crashed tabs). */
export const TYPING_TTL_MS = 6_000;
const WRITE_EVERY_MS = 3_000;

export interface TypingEntry {
  uid: string;
  name: string;
  /** The typer's currently selected feeling. */
  mood?: MoodId;
  at: Timestamp | null;
}

@Injectable({ providedIn: 'root' })
export class TypingService {
  private db = inject(Firestore);
  private lastWrite = new Map<string, number>();
  private lastMood = new Map<string, MoodId>();

  typers$(roomId: string): Observable<TypingEntry[]> {
    return (collectionData(collection(this.db, 'rooms', roomId, 'typing'), { idField: 'uid' }) as Observable<
      TypingEntry[]
    >).pipe(map((list) => list.filter((t) => t.at)));
  }

  /** Call on every keystroke; writes at most every few seconds. */
  ping(roomId: string, uid: string, name: string, mood: MoodId = 'happy'): void {
    const key = `${roomId}/${uid}`;
    const now = Date.now();
    // Throttle, but write right away when the feeling changes so others see it live.
    if (now - (this.lastWrite.get(key) ?? 0) < WRITE_EVERY_MS && this.lastMood.get(key) === mood) return;
    this.lastWrite.set(key, now);
    this.lastMood.set(key, mood);
    void setDoc(doc(this.db, 'rooms', roomId, 'typing', uid), { name, mood, at: serverTimestamp() }).catch(() => undefined);
  }

  stop(roomId: string, uid: string): void {
    const key = `${roomId}/${uid}`;
    if (!this.lastWrite.has(key)) return;
    this.lastWrite.delete(key);
    void deleteDoc(doc(this.db, 'rooms', roomId, 'typing', uid)).catch(() => undefined);
  }
}
