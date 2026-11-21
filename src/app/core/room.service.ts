import { Injectable, inject } from '@angular/core';
import {
  FieldValue,
  Firestore,
  arrayUnion,
  collection,
  collectionData,
  doc,
  docData,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { GENERAL_ROOM_ID, Room } from './models';

export function dmId(a: string, b: string): string {
  return [a, b].sort().join('_');
}

/** Name to show for a room from the viewer's perspective. */
export function roomTitle(room: Room, viewerUid: string | null): string {
  if (room.type !== 'dm') return room.name || 'Untitled group';
  const other = (room.members ?? []).find((m) => m !== viewerUid) ?? viewerUid ?? '';
  return room.memberNames?.[other] || 'Direct message';
}

export function otherMember(room: Room, viewerUid: string | null): string | null {
  if (room.type !== 'dm') return null;
  return (room.members ?? []).find((m) => m !== viewerUid) ?? null;
}

@Injectable({ providedIn: 'root' })
export class RoomService {
  private db = inject(Firestore);

  /** Rooms the user belongs to, most recent activity first (sorted client-side to avoid a composite index). */
  myRooms$(uid: string): Observable<Room[]> {
    const q = query(collection(this.db, 'rooms'), where('members', 'array-contains', uid));
    return (collectionData(q, { idField: 'id' }) as Observable<Room[]>).pipe(
      map((rooms) =>
        rooms.sort((a, b) => (b.updatedAt?.toMillis() ?? Date.now()) - (a.updatedAt?.toMillis() ?? Date.now())),
      ),
    );
  }

  room$(roomId: string): Observable<Room | undefined> {
    return docData(doc(this.db, 'rooms', roomId), { idField: 'id' }) as Observable<Room | undefined>;
  }

  /** Joins the shared "general" room once, creating it if needed. Posts a single "joined" notice. */
  async ensureGeneralMembership(uid: string, name: string): Promise<void> {
    const ref = doc(this.db, 'rooms', GENERAL_ROOM_ID);
    await runTransaction(this.db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists() && (snap.data()['members'] as string[]).includes(uid)) {
        // Keep the cached name current if the user renamed themself.
        if (snap.data()['memberNames']?.[uid] !== name) tx.update(ref, { [`memberNames.${uid}`]: name });
        return;
      }
      if (!snap.exists()) {
        tx.set(ref, {
          name: 'General',
          type: 'group',
          members: [uid],
          memberNames: { [uid]: name },
          createdBy: uid,
          updatedAt: serverTimestamp(),
          lastMessage: null,
        });
      } else {
        tx.update(ref, { members: arrayUnion(uid), [`memberNames.${uid}`]: name });
      }
      tx.set(doc(collection(ref, 'messages')), systemMessage(uid, name, `${name} joined the chat`));
    });
  }

  async createGroup(name: string, creator: { uid: string; name: string }, others: { uid: string; name: string }[]) {
    const members = [creator, ...others.filter((o) => o.uid !== creator.uid)];
    const ref = doc(collection(this.db, 'rooms'));
    await runTransaction(this.db, async (tx) => {
      tx.set(ref, {
        name: name.trim(),
        type: 'group',
        members: members.map((m) => m.uid),
        memberNames: Object.fromEntries(members.map((m) => [m.uid, m.name])),
        createdBy: creator.uid,
        updatedAt: serverTimestamp(),
        lastMessage: null,
      });
      tx.set(
        doc(collection(ref, 'messages')),
        systemMessage(creator.uid, creator.name, `${creator.name} created “${name.trim()}”`),
      );
    });
    return ref.id;
  }

  async addMembers(roomId: string, by: { uid: string; name: string }, people: { uid: string; name: string }[]) {
    const ref = doc(this.db, 'rooms', roomId);
    await runTransaction(this.db, async (tx) => {
      const update: Record<string, FieldValue | string> = { members: arrayUnion(...people.map((p) => p.uid)) };
      for (const p of people) update[`memberNames.${p.uid}`] = p.name;
      tx.update(ref, update);
      const names = people.map((p) => p.name).join(', ');
      tx.set(doc(collection(ref, 'messages')), systemMessage(by.uid, by.name, `${by.name} added ${names}`));
    });
  }

  async getOrCreateDm(me: { uid: string; name: string }, other: { uid: string; name: string }): Promise<string> {
    const id = dmId(me.uid, other.uid);
    const ref = doc(this.db, 'rooms', id);
    await runTransaction(this.db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) return;
      tx.set(ref, {
        name: '',
        type: 'dm',
        members: [me.uid, other.uid],
        memberNames: { [me.uid]: me.name, [other.uid]: other.name },
        createdBy: me.uid,
        updatedAt: serverTimestamp(),
        lastMessage: null,
      });
    });
    return id;
  }
}

function systemMessage(uid: string, name: string, text: string) {
  return {
    type: 'system',
    text,
    senderId: uid,
    senderName: name,
    mood: 'happy',
    createdAt: serverTimestamp(),
  };
}
