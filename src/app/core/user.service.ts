import { Injectable, NgZone, inject, signal } from '@angular/core';
import {
  Firestore,
  Timestamp,
  arrayRemove,
  arrayUnion,
  collection,
  collectionData,
  doc,
  getDoc,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  getDocs,
} from '@angular/fire/firestore';
import { Auth, updateProfile } from '@angular/fire/auth';
import { MoodId } from './moods';
import { Observable, map, shareReplay } from 'rxjs';
import { AppUser } from './models';

export const AVATAR_COLORS = ['#9a4bb3', '#2563eb', '#db2777', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2'];
const HEARTBEAT_MS = 60_000;
/** A user counts as online if their heartbeat is fresher than this. */
const ONLINE_WINDOW_MS = 2.5 * 60_000;

export function colorFor(uid: string): string {
  let h = 0;
  for (const ch of uid) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function isOnline(user: Pick<AppUser, 'lastSeen'> & { online?: boolean } | undefined, now = Date.now()): boolean {
  if (!user?.online || !user.lastSeen) return false;
  return now - user.lastSeen.toMillis() < ONLINE_WINDOW_MS;
}

type UserDoc = AppUser & { online?: boolean };

/**
 * Make raw `users/*` documents safe to render: older or partially written docs may lack a name
 * (or even a uid field). Falls back to the email prefix, then a generic label, and sorts by name.
 */
export function normalizeUsers(list: Partial<UserDoc>[]): UserDoc[] {
  return list
    .filter((u): u is Partial<UserDoc> & { uid: string } => typeof u.uid === 'string' && u.uid.length > 0)
    .map((u) => ({
      ...u,
      uid: u.uid,
      email: typeof u.email === 'string' ? u.email : '',
      displayName:
        (typeof u.displayName === 'string' && u.displayName.trim()) ||
        (typeof u.email === 'string' && u.email.split('@')[0]) ||
        'Unknown user',
      avatarColor: typeof u.avatarColor === 'string' ? u.avatarColor : colorFor(u.uid),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private db = inject(Firestore);
  private auth = inject(Auth);
  private zone = inject(NgZone);

  /** Small-community app: keep the user directory live in memory. */
  readonly all$: Observable<UserDoc[]> = (
    collectionData(query(collection(this.db, 'users'), limit(500)), { idField: 'uid' }) as Observable<Partial<UserDoc>[]>
  ).pipe(
    map(normalizeUsers),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  /** Ticks every 30s so "online" derived from timestamps stays fresh. */
  readonly now = signal(Date.now());

  private heartbeat?: ReturnType<typeof setInterval>;
  private presenceUid: string | null = null;
  private onVisibility = () => {
    if (document.visibilityState === 'visible') void this.beat(true);
  };
  private onPageHide = () => void this.beat(false);

  constructor() {
    this.zone.runOutsideAngular(() => setInterval(() => this.zone.run(() => this.now.set(Date.now())), 30_000));
  }

  async ensureProfile(uid: string, displayName: string, email: string): Promise<void> {
    const ref = doc(this.db, 'users', uid);
    const snap = await getDoc(ref);
    const data: Partial<UserDoc> = { uid, displayName, email };
    if (!snap.exists()) data.avatarColor = colorFor(uid);
    await setDoc(ref, data, { merge: true });
  }

  startPresence(uid: string): void {
    if (this.presenceUid === uid) return;
    this.stopPresence();
    this.presenceUid = uid;
    void this.beat(true);
    this.zone.runOutsideAngular(() => {
      this.heartbeat = setInterval(() => {
        if (document.visibilityState === 'visible') void this.beat(true);
      }, HEARTBEAT_MS);
    });
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('pagehide', this.onPageHide);
  }

  stopPresence(): void {
    clearInterval(this.heartbeat);
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('pagehide', this.onPageHide);
    this.presenceUid = null;
  }

  async markOffline(): Promise<void> {
    await this.beat(false);
    this.stopPresence();
  }

  async markRead(uid: string, roomId: string): Promise<void> {
    await updateDoc(doc(this.db, 'users', uid), { [`lastRead.${roomId}`]: serverTimestamp() }).catch(() => undefined);
  }

  toggleFavorite(uid: string, roomId: string, on: boolean): Promise<void> {
    return updateDoc(doc(this.db, 'users', uid), { favorites: on ? arrayUnion(roomId) : arrayRemove(roomId) });
  }

  setArchived(uid: string, roomId: string, on: boolean): Promise<void> {
    return updateDoc(doc(this.db, 'users', uid), { archived: on ? arrayUnion(roomId) : arrayRemove(roomId) });
  }

  /** Saves profile settings; a name change is also copied into every room's cached member names. */
  async updateSettings(
    uid: string,
    changes: { displayName?: string; avatarColor?: string; defaultMood?: MoodId },
  ): Promise<void> {
    await updateDoc(doc(this.db, 'users', uid), { ...changes });
    const name = changes.displayName;
    if (!name) return;
    if (this.auth.currentUser) await updateProfile(this.auth.currentUser, { displayName: name });
    const rooms = await getDocs(query(collection(this.db, 'rooms'), where('members', 'array-contains', uid)));
    for (let i = 0; i < rooms.docs.length; i += 400) {
      const batch = writeBatch(this.db);
      for (const r of rooms.docs.slice(i, i + 400)) batch.update(r.ref, { [`memberNames.${uid}`]: name });
      await batch.commit();
    }
  }

  private async beat(online: boolean): Promise<void> {
    if (!this.presenceUid) return;
    await updateDoc(doc(this.db, 'users', this.presenceUid), {
      online,
      lastSeen: online ? serverTimestamp() : Timestamp.now(),
    }).catch(() => undefined);
  }
}
