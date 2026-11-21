import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  Timestamp,
  collection,
  collectionData,
  deleteField,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { Message, Room } from './models';
import { MoodId } from './moods';

export const PAGE_SIZE = 30;

/** Reaction toggle: picking your current mood removes it, anything else swaps to it. */
export function nextReaction(current: MoodId | undefined, picked: MoodId): MoodId | null {
  return current === picked ? null : picked;
}

export interface Page {
  /** createdAt of the oldest message in the page (null when the page is empty). */
  oldest: Timestamp | null;
  /** true when this page was full, so more history may exist before it. */
  full: boolean;
  /** Live messages in the page's range, oldest-first. */
  messages$: Observable<Message[]>;
}

@Injectable({ providedIn: 'root' })
export class MessageService {
  private db = inject(Firestore);

  private col(roomId: string) {
    return collection(this.db, 'rooms', roomId, 'messages');
  }

  /**
   * Finds the PAGE_SIZE messages strictly before `before` (or the latest ones when null) and returns a
   * live stream over exactly that range, so edits/reactions/deletes in older history stay current.
   * The newest page (before = null) is open-ended and also receives new messages.
   */
  async page(roomId: string, before: Timestamp | null): Promise<Page> {
    const parts = [orderBy('createdAt', 'desc'), ...(before ? [startAfter(before)] : []), limit(PAGE_SIZE)];
    const snap = await getDocs(query(this.col(roomId), ...parts));
    const docs = snap.docs;
    const oldest = docs.length ? (docs[docs.length - 1].data()['createdAt'] as Timestamp) : null;
    const range = [
      ...(oldest ? [where('createdAt', '>=', oldest)] : []),
      ...(before ? [where('createdAt', '<', before)] : []),
      orderBy('createdAt', 'asc'),
    ];
    const messages$ =
      !oldest && before
        ? of([])
        : (collectionData(query(this.col(roomId), ...range), { idField: 'id' }) as Observable<Message[]>);
    return { oldest, full: docs.length === PAGE_SIZE, messages$ };
  }

  async send(roomId: string, sender: { uid: string; name: string }, text: string, mood: MoodId, clientId: string) {
    const batch = writeBatch(this.db);
    const ref = doc(this.col(roomId));
    batch.set(ref, {
      type: 'text',
      text,
      senderId: sender.uid,
      senderName: sender.name,
      mood,
      clientId,
      createdAt: serverTimestamp(),
    });
    batch.update(doc(this.db, 'rooms', roomId), {
      updatedAt: serverTimestamp(),
      lastMessage: { messageId: ref.id, text: text.slice(0, 140), mood, senderId: sender.uid, senderName: sender.name },
    });
    await batch.commit();
  }

  async edit(room: Room, msg: Message, text: string): Promise<void> {
    const batch = writeBatch(this.db);
    batch.update(doc(this.col(room.id), msg.id), { text, editedAt: serverTimestamp() });
    if (room.lastMessage?.messageId === msg.id) {
      batch.update(doc(this.db, 'rooms', room.id), { 'lastMessage.text': text.slice(0, 140) });
    }
    await batch.commit();
  }

  /** Soft delete: keeps a tombstone so the conversation still reads naturally. */
  async remove(room: Room, msg: Message): Promise<void> {
    const batch = writeBatch(this.db);
    batch.update(doc(this.col(room.id), msg.id), { text: '', deleted: true });
    if (room.lastMessage?.messageId === msg.id) {
      batch.update(doc(this.db, 'rooms', room.id), { 'lastMessage.text': '', 'lastMessage.deleted': true });
    }
    await batch.commit();
  }

  react(roomId: string, msgId: string, uid: string, mood: MoodId | null): Promise<void> {
    return updateDoc(doc(this.col(roomId), msgId), { [`reactions.${uid}`]: mood ?? deleteField() });
  }
}

