import { Timestamp } from '@angular/fire/firestore';
import { AppUser } from '../../core/models';
import { readersOf, receiptFor } from './receipts';

const t = (ms: number) => Timestamp.fromMillis(ms);
const user = (uid: string, readAt?: number): AppUser => ({
  uid,
  displayName: uid.toUpperCase(),
  email: '',
  avatarColor: '',
  lastRead: readAt === undefined ? {} : { r1: t(readAt) },
});
const users = (...list: AppUser[]) => new Map(list.map((u) => [u.uid, u]));

describe('read receipts', () => {
  const dm = { id: 'r1', members: ['me', 'bob'] };
  const group = { id: 'r1', members: ['me', 'bob', 'cara', 'dan'] };
  const msg = { senderId: 'me', createdAt: t(1000) };

  it('is pending without a server timestamp', () => {
    expect(receiptFor({ ...msg, createdAt: null }, dm, users()).kind).toBe('pending');
    expect(receiptFor({ ...msg, pending: true }, dm, users()).kind).toBe('pending');
  });

  it('is sent until the other side reads at or after the message', () => {
    expect(receiptFor(msg, dm, users(user('bob', 999))).kind).toBe('sent');
    const r = receiptFor(msg, dm, users(user('bob', 1000)));
    expect(r).toEqual({ kind: 'seen', seenBy: 1, names: ['BOB'], everyone: true });
  });

  it('counts readers in groups and never counts the sender', () => {
    const map = users(user('me', 5000), user('bob', 2000), user('cara', 500), user('dan'));
    expect(readersOf(msg, group, map).map((u) => u.uid)).toEqual(['bob']);
    const r = receiptFor(msg, group, map);
    expect(r.kind === 'seen' && r.seenBy).toBe(1);
    expect(r.kind === 'seen' && r.everyone).toBeFalse();
  });

  it('ignores members missing from the directory', () => {
    expect(receiptFor(msg, group, users(user('bob', 2000))).kind).toBe('seen');
  });
});
