import { MOODS, MoodId, getMood } from '../../core/moods';

export interface Atmosphere {
  /** Share of each feeling in the recent window, recent messages weighing more. Sums to 1 (or all 0). */
  shares: Record<MoodId, number>;
  /** Clearly leading feeling, or null when the room is quiet or mixed. */
  lead: MoodId | null;
}

interface MoodLike {
  type?: string;
  mood?: string;
  deleted?: boolean;
}

/** Messages looked at for the room's atmosphere. */
export const ATMOSPHERE_WINDOW = 30;
/** A feeling leads once it holds this much of the weighted window… */
const LEAD_SHARE = 0.4;
/** …and there are at least this many messages to judge. */
const LEAD_MIN_MESSAGES = 3;

/**
 * The room's current emotional weather: how much of each feeling is in the last
 * {@link ATMOSPHERE_WINDOW} messages. Newer messages count more (linearly), so the
 * mood shifts as the conversation does. System and deleted messages are ignored.
 */
export function atmosphere(messages: readonly MoodLike[], window = ATMOSPHERE_WINDOW): Atmosphere {
  const shares = Object.fromEntries(MOODS.map((m) => [m.id, 0])) as Record<MoodId, number>;
  const recent = messages.filter((m) => m.type !== 'system' && !m.deleted).slice(-window);
  if (!recent.length) return { shares, lead: null };

  let total = 0;
  recent.forEach((m, i) => {
    const w = i + 1;
    shares[getMood(m.mood).id] += w;
    total += w;
  });
  let lead: MoodId | null = null;
  for (const id of Object.keys(shares) as MoodId[]) {
    shares[id] /= total;
    if (!lead || shares[id] > shares[lead]) lead = id;
  }
  if (recent.length < LEAD_MIN_MESSAGES || !lead || shares[lead] < LEAD_SHARE) lead = null;
  return { shares, lead };
}
