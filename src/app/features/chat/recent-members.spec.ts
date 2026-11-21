import { Timestamp } from 'firebase/firestore';
import { recentMembers } from './recent-members';

describe('recentMembers', () => {
  const users = new Map([
    ['a', { lastSeen: Timestamp.fromMillis(100) }],
    ['b', { lastSeen: Timestamp.fromMillis(500) }],
    ['c', { lastSeen: Timestamp.fromMillis(300) }],
    ['d', { lastSeen: null }],
    ['e', { lastSeen: Timestamp.fromMillis(900) }],
  ]);
  const members = ['a', 'b', 'c', 'd', 'e'];

  it('puts the latest senders first, without repeats', () => {
    const msgs = [
      { senderId: 'a', type: 'text' as const },
      { senderId: 'c', type: 'text' as const },
      { senderId: 'a', type: 'text' as const },
    ];
    expect(recentMembers(members, msgs, users)).toEqual(['a', 'c', 'e', 'b']);
  });

  it('skips system messages and people who left', () => {
    const msgs = [
      { senderId: 'x', type: 'text' as const },
      { senderId: 'd', type: 'system' as const },
    ];
    expect(recentMembers(members, msgs, users, 2)).toEqual(['e', 'b']);
  });
});
