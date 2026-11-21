import { Timestamp } from '@angular/fire/firestore';
import { Message } from '../../core/models';
import { buildRows, reactionChips } from './message-rows';

const at = (d: Date) => Timestamp.fromDate(d);
let n = 0;
const msg = (senderId: string, d: Date, extra: Partial<Message> = {}): Message => ({
  id: `m${n++}`,
  type: 'text',
  text: 'hi',
  senderId,
  senderName: senderId,
  mood: 'happy',
  createdAt: at(d),
  ...extra,
});

describe('buildRows', () => {
  const now = new Date(2026, 10, 21, 15, 0);

  it('inserts a day separator per calendar day', () => {
    const rows = buildRows(
      [msg('a', new Date(2026, 10, 20, 10)), msg('a', new Date(2026, 10, 21, 10)), msg('b', new Date(2026, 10, 21, 11))],
      'a',
      now,
    );
    expect(rows.filter((r) => r.kind === 'day').map((r) => (r as { label: string }).label)).toEqual(['Yesterday', 'Today']);
  });

  it('groups consecutive messages from the same sender within 5 minutes into one run', () => {
    const t = new Date(2026, 10, 21, 10, 0);
    const runs = buildRows(
      [
        msg('a', t, { mood: 'happy' }),
        msg('a', new Date(t.getTime() + 60_000), { mood: 'sad' }),
        msg('a', new Date(t.getTime() + 20 * 60_000)),
        msg('b', new Date(t.getTime() + 21 * 60_000)),
      ],
      'a',
      now,
    ).filter((r) => r.kind === 'run') as Extract<ReturnType<typeof buildRows>[number], { kind: 'run' }>[];

    expect(runs.map((r) => r.items.length)).toEqual([2, 1, 1]);
    expect(runs[0].own).toBeTrue();
    expect(runs[2].own).toBeFalse();
  });

  it('renders system messages as their own rows and breaks runs', () => {
    const t = new Date(2026, 10, 21, 10, 0);
    const rows = buildRows(
      [msg('a', t), msg('a', t, { type: 'system', text: 'x joined' }), msg('a', t)],
      'a',
      now,
    );
    expect(rows.map((r) => r.kind)).toEqual(['day', 'run', 'system', 'run']);
  });
});

describe('reactionChips', () => {
  it('counts per mood in mood order and flags mine', () => {
    const chips = reactionChips({ u1: 'lovely', u2: 'happy', me: 'lovely' }, 'me');
    expect(chips.map((c) => [c.mood, c.count, c.mine])).toEqual([
      ['happy', 1, false],
      ['lovely', 2, true],
    ]);
  });

  it('is empty without reactions', () => {
    expect(reactionChips(undefined, 'me')).toEqual([]);
  });
});
