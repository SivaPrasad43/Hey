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

/** Typing entries older than this are ignored (covers crashed tabs). */
export const TYPING_TTL_MS = 6_000;
const WRITE_EVERY_MS = 3_000;

export interface TypingEntry {
  uid: string;
  name: string;
  at: Timestamp | null;
}

@Injectable({ providedIn: 'root' })
export class TypingService {
  private db = inject(Firestore);
  private lastWrite = new Map<string, number>();

  typers$(roomId: string): Observable<TypingEntry[]> {
    return (collectionData(collection(this.db, 'rooms', roomId, 'typing'), { idField: 'uid' }) as Observable<
      TypingEntry[]
    >).pipe(map((list) => list.filter((t) => t.at)));
  }

  /** Call on every keystroke; writes at most every few seconds. */
  ping(roomId: string, uid: string, name: string): void {
    const key = `${roomId}/${uid}`;
    const now = Date.now();
    if (now - (this.lastWrite.get(key) ?? 0) < WRITE_EVERY_MS) return;
    this.lastWrite.set(key, now);
    void setDoc(doc(this.db, 'rooms', roomId, 'typing', uid), { name, at: serverTimestamp() }).catch(() => undefined);
  }

  stop(roomId: string, uid: string): void {
    const key = `${roomId}/${uid}`;
    if (!this.lastWrite.has(key)) return;
    this.lastWrite.delete(key);
    void deleteDoc(doc(this.db, 'rooms', roomId, 'typing', uid)).catch(() => undefined);
  }
}
