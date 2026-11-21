import { AppUser, Message, Room } from '../../core/models';

export type Receipt =
  | { kind: 'pending' }
  | { kind: 'sent' }
  | { kind: 'seen'; seenBy: number; names: string[]; everyone: boolean };

type Reader = Pick<AppUser, 'uid' | 'displayName' | 'lastRead'>;

/** Members other than the sender whose last read of this room is at or after the message. */
export function readersOf(msg: Pick<Message, 'senderId' | 'createdAt'>, room: Pick<Room, 'id' | 'members'>, users: ReadonlyMap<string, Reader>): Reader[] {
  if (!msg.createdAt) return [];
  const at = msg.createdAt.toMillis();
  const out: Reader[] = [];
  for (const uid of room.members ?? []) {
    if (uid === msg.senderId) continue;
    const u = users.get(uid);
    const read = u?.lastRead?.[room.id];
    if (u && read && read.toMillis() >= at) out.push(u);
  }
  return out;
}

export function receiptFor(
  msg: Pick<Message, 'senderId' | 'createdAt'> & { pending?: boolean },
  room: Pick<Room, 'id' | 'members'>,
  users: ReadonlyMap<string, Reader>,
): Receipt {
  if (msg.pending || !msg.createdAt) return { kind: 'pending' };
  const readers = readersOf(msg, room, users);
  if (!readers.length) return { kind: 'sent' };
  const others = (room.members ?? []).filter((m) => m !== msg.senderId).length;
  return { kind: 'seen', seenBy: readers.length, names: readers.map((r) => r.displayName), everyone: readers.length >= others };
}
