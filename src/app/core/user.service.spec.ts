import { normalizeUsers } from './user.service';

describe('normalizeUsers', () => {
  it('never yields a user without a display name, and sorts by name', () => {
    const out = normalizeUsers([
      { uid: 'b', displayName: 'Zed', email: 'z@x.com' },
      { uid: 'a', email: 'alice@x.com' }, // name missing
      { uid: 'c', displayName: '   ' }, // blank name, no email
      { displayName: 'No uid' }, // dropped
      { uid: 'd', displayName: 42 as unknown as string, email: 'bob@x.com' }, // wrong type
    ]);
    expect(out.map((u) => [u.uid, u.displayName])).toEqual([
      ['a', 'alice'],
      ['d', 'bob'],
      ['c', 'Unknown user'],
      ['b', 'Zed'],
    ]);
    expect(out.every((u) => typeof u.avatarColor === 'string' && typeof u.email === 'string')).toBeTrue();
  });
});
