import { Timestamp } from '@angular/fire/firestore';
import { Message } from '../../core/models';
import { buildRows, countReactions, newArrivals, reactionChips, reactionIncreases, minimapGradient, spanAt } from './message-rows';

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

describe('emotion helpers', () => {
  const t = new Date(2026, 10, 21, 10, 0);

  it('buildRows filter keeps only matching text messages', () => {
    const rows = buildRows(
      [msg('a', t, { mood: 'sad' }), msg('a', t, { mood: 'happy' }), msg('b', t, { type: 'system', text: 'x' }), msg('b', t, { mood: 'sad', deleted: true }), msg('b', t, { mood: 'sad' })],
      'a',
      t,
      'sad',
    );
    const runs = rows.filter((r) => r.kind === 'run') as Extract<ReturnType<typeof buildRows>[number], { kind: 'run' }>[];
    expect(rows.some((r) => r.kind === 'system')).toBeFalse();
    expect(runs.flatMap((r) => r.items.map((i) => i.msg.mood))).toEqual(['sad', 'sad']);
  });

  it('newArrivals returns only messages appended at the end', () => {
    const a = msg('a', t), b = msg('a', t), c = msg('b', t), older = msg('b', t);
    expect(newArrivals(null, [a, b])).toEqual([]);
    expect(newArrivals(new Set([a.id, b.id]), [a, b, c])).toEqual([c.id]);
    expect(newArrivals(new Set([a.id, b.id]), [older, a, b])).toEqual([]);
  });

  it('newArrivals ignores the server copy of an optimistic message', () => {
    const a = msg('a', t);
    const confirmed = msg('a', t, { clientId: 'tmp-1' });
    expect(newArrivals(new Set([a.id, 'tmp-1']), [a, confirmed])).toEqual([]);
  });

  it('reactionIncreases spots new reactions only', () => {
    const before = countReactions([msg('a', t, { id: 'x', reactions: { u1: 'sad' } })]);
    const after = countReactions([msg('a', t, { id: 'x', reactions: { u1: 'sad', u2: 'sad', u3: 'lovely' } })]);
    expect(reactionIncreases(null, after)).toEqual([]);
    expect(reactionIncreases(before, after).sort()).toEqual(['x:lovely', 'x:sad']);
    expect(reactionIncreases(after, before)).toEqual([]);
  });

  it('minimapGradient scales spans to the track, with a crisp 1px break between messages', () => {
    const spans = [
      { id: 'a', mood: 'angry' as const, top: 100, height: 50 },
      { id: 'b', mood: 'sad' as const, top: 200, height: 100 },
    ];
    expect(minimapGradient(spans, 400, 200)).toBe(
      'linear-gradient(to bottom, transparent 0px 50px, var(--mood-angry) 50px 99px, transparent 99px 100px, var(--mood-sad) 100px 150px, transparent 150px)',
    );
    expect(minimapGradient([], 400, 200)).toBe('none');
  });

  it('spanAt finds the message at a content offset', () => {
    const spans = [
      { id: 'a', mood: 'calm' as const, top: 10, height: 20 },
      { id: 'b', mood: 'calm' as const, top: 40, height: 20 },
      { id: 'c', mood: 'calm' as const, top: 90, height: 20 },
    ];
    expect(spanAt(spans, 0)).toBe(0);
    expect(spanAt(spans, 45)).toBe(1);
    expect(spanAt(spans, 89)).toBe(1);
    expect(spanAt(spans, 500)).toBe(2);
    expect(spanAt([], 5)).toBe(-1);
  });
});
