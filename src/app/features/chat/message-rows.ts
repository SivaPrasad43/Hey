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

export function buildRows(messages: DisplayMessage[], meUid: string | null, now = new Date()): Row[] {
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
