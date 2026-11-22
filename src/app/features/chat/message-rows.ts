import { Message } from '../../core/models';
import { MOODS, MoodId, getMood } from '../../core/moods';
import { dayLabel, isSameDay, timeLabel, toDate } from '../../core/time';

/** Consecutive messages from one sender within this window share one card. */
const GROUP_WINDOW_MS = 5 * 60_000;

export interface DisplayMessage extends Message {
  pending?: boolean;
}

export interface RunItem {
  msg: DisplayMessage;
  time: string;
}

export type Row =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'system'; key: string; text: string }
  | {
      kind: 'run';
      key: string;
      senderId: string;
      senderName: string;
      own: boolean;
      /** time of the first message in the run */
      time: string;
      items: RunItem[];
    };

/** Text messages that are visible under an emotion filter. */
export function matchesFilter(m: Message, filter: MoodId | null): boolean {
  if (!filter) return true;
  return m.type === 'text' && !m.deleted && getMood(m.mood).id === filter;
}

export function buildRows(
  all: DisplayMessage[],
  meUid: string | null,
  now = new Date(),
  filter: MoodId | null = null,
): Row[] {
  const messages = filter ? all.filter((m) => matchesFilter(m, filter)) : all;
  const rows: Row[] = [];
  let prevDate: Date | null = null;
  let run: Extract<Row, { kind: 'run' }> | null = null;
  let prevMsg: DisplayMessage | undefined;

  for (const m of messages) {
    const d = toDate(m.createdAt);
    if (!prevDate || !isSameDay(prevDate, d)) {
      rows.push({ kind: 'day', key: `day-${d.toDateString()}`, label: dayLabel(d, now) });
      run = null;
    }
    prevDate = d;

    if (m.type === 'system') {
      rows.push({ kind: 'system', key: m.id, text: m.text });
      run = null;
    } else {
      const item = { msg: m, time: timeLabel(d) };
      if (run && continues(prevMsg, m)) {
        run.items.push(item);
      } else {
        run = {
          kind: 'run',
          key: m.id,
          senderId: m.senderId,
          senderName: m.senderName,
          own: m.senderId === meUid,
          time: item.time,
          items: [item],
        };
        rows.push(run);
      }
    }
    prevMsg = m;
  }
  return rows;
}

function continues(a: Message | undefined, b: Message): boolean {
  if (!a || a.type !== 'text' || b.type !== 'text' || a.senderId !== b.senderId) return false;
  const da = toDate(a.createdAt);
  const db = toDate(b.createdAt);
  return isSameDay(da, db) && db.getTime() - da.getTime() < GROUP_WINDOW_MS;
}

export interface ReactionChip {
  mood: MoodId;
  label: string;
  count: number;
  mine: boolean;
}

/** Reaction counts in mood order, skipping moods nobody picked. */
export function reactionChips(reactions: Record<string, MoodId> | undefined, meUid: string | null): ReactionChip[] {
  if (!reactions) return [];
  const values = Object.entries(reactions);
  return MOODS.map((m) => ({
    mood: m.id,
    label: m.label,
    count: values.filter(([, v]) => getMood(v).id === m.id).length,
    mine: !!meUid && getMood(reactions[meUid]).id === m.id && meUid in reactions,
  })).filter((c) => c.count > 0);
}

/**
 * Ids of messages that arrived at the end since the previous emission (live arrivals), ignoring
 * older pages that were prepended and server copies of messages we already showed optimistically.
 * `prev` is null for the first render, which yields nothing.
 */
export function newArrivals(prev: ReadonlySet<string> | null, next: readonly DisplayMessage[]): string[] {
  if (!prev) return [];
  const fresh: string[] = [];
  for (let i = next.length - 1; i >= 0; i--) {
    const m = next[i];
    if (prev.has(m.id) || (m.clientId && prev.has(m.clientId))) break;
    if (m.type === 'text') fresh.push(m.id);
  }
  return fresh.reverse();
}

export type ReactionCounts = Map<string, Partial<Record<MoodId, number>>>;

export function countReactions(messages: readonly DisplayMessage[]): ReactionCounts {
  const out: ReactionCounts = new Map();
  for (const m of messages) {
    if (!m.reactions) continue;
    const c: Partial<Record<MoodId, number>> = {};
    for (const v of Object.values(m.reactions)) {
      const id = getMood(v).id;
      c[id] = (c[id] ?? 0) + 1;
    }
    out.set(m.id, c);
  }
  return out;
}

/** `${messageId}:${mood}` keys whose reaction count went up. */
export function reactionIncreases(prev: ReactionCounts | null, next: ReactionCounts): string[] {
  if (!prev) return [];
  const keys: string[] = [];
  for (const [id, counts] of next) {
    const before = prev.get(id) ?? {};
    for (const mood of Object.keys(counts) as MoodId[]) {
      if ((counts[mood] ?? 0) > (before[mood] ?? 0)) keys.push(`${id}:${mood}`);
    }
  }
  return keys;
}

/** A message laid out on the emotion minimap, in scroll-content pixels. */
export interface MinimapSpan {
  id: string;
  mood: MoodId;
  /** Offset of the message from the top of the scroll content. */
  top: number;
  height: number;
}

/** Short tooltip / screen-reader text for a message on the minimap. */
export function minimapLabel(m: Pick<DisplayMessage, 'senderName' | 'mood' | 'text' | 'type'>): string {
  const text = m.type === 'text' ? m.text : 'Sticker';
  return `${m.senderName} · ${getMood(m.mood).label}: ${text.length > 60 ? text.slice(0, 60) + '…' : text}`;
}

/**
 * Hard-stop CSS gradient that paints each span in its mood colour, scaled from content height to the
 * track height. Each span stretches down to the next one so the line reads as one continuous stroke,
 * with a 1px break between messages when there is room for it.
 */
export function minimapGradient(spans: readonly MinimapSpan[], contentPx: number, trackPx: number): string {
  if (!spans.length || contentPx <= 0 || trackPx <= 0) return 'none';
  const k = trackPx / contentPx;
  const stops: string[] = [];
  let cursor = 0;
  const px = (v: number) => `${Math.round(v * 10) / 10}px`;
  spans.forEach((s, i) => {
    const top = Math.max(cursor, s.top * k);
    const nextTop = i + 1 < spans.length ? spans[i + 1].top * k : (s.top + s.height) * k;
    let bottom = Math.max(top + 1, nextTop);
    if (i + 1 < spans.length && bottom - top >= 3) bottom -= 1;
    if (top > cursor) stops.push(`transparent ${px(cursor)} ${px(top)}`);
    stops.push(`var(--mood-${s.mood}) ${px(top)} ${px(bottom)}`);
    cursor = bottom;
  });
  stops.push(`transparent ${px(cursor)}`);
  return `linear-gradient(to bottom, ${stops.join(', ')})`;
}

/** Index of the span covering (or nearest to) content offset `y`; -1 when there are none. */
export function spanAt(spans: readonly MinimapSpan[], y: number): number {
  if (!spans.length) return -1;
  let lo = 0;
  let hi = spans.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (spans[mid].top <= y) lo = mid;
    else hi = mid - 1;
  }
  // Before the first message: snap to it.
  return lo;
}
