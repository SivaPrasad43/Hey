export type MoodId = 'happy' | 'angry' | 'sad' | 'lovely';

export interface Mood {
  id: MoodId;
  label: string;
  /** Key used with Alt (e.g. Alt+H). Matched against KeyboardEvent.code. */
  shortcut: string;
  /** Small solid swatch (meter segments, timeline). */
  dot: string;
  /** Foreground color (faces, labels). */
  color: string;
  /** Soft surface for a message line. */
  tint: string;
  /** Outline + strong left edge for a message line. */
  edge: string;
  /** Uniform border for pills (feeling chips, reactions). */
  pill: string;
  /** Solid bubble fill for your own messages (white text on top). */
  fill: string;
  /** oklch [L, C, h] of the fill, mirrored from styles.css so tests can check contrast. */
  /** Dark-theme fill (white text). */
  fillOklch: [number, number, number];
  /** Dark fill is bright enough that it carries ink text instead of white. */
  darkInk?: boolean;
  /** Light-theme pastel fill (ink text). */
  fillLightOklch: [number, number, number];
  /** Text treatment for a message line. */
  text: string;
  /** One-shot entrance animation class (see styles.css). */
  motion: string;
  /** navigator.vibrate pattern. */
  haptic: number[];
  /** Short phrase used by the suggester ("Sounds sad"). */
  adjective: string;
  /** Emoji character a sticker message is sent as (renders as the feeling's artwork). */
  emoji: string;
}

export const MOODS: readonly Mood[] = [
  {
    id: 'happy',
    label: 'Happy',
    shortcut: 'H',
    dot: 'bg-mood-happy',
    color: 'text-mood-happy',
    tint: 'bg-mood-happy/10 dark:bg-mood-happy/14',
    edge: 'border-mood-happy/30 border-l-mood-happy',
    pill: 'border-mood-happy/60',
    fill: 'bg-mood-happy-fill [--on-fill:var(--on-fill-ink)]',
    fillOklch: [0.86, 0.16, 95],
    fillLightOklch: [0.94, 0.1, 98],
    darkInk: true,
    text: '',
    motion: 'emo-in-happy',
    haptic: [15, 40, 15],
    adjective: 'happy',
    emoji: '😁',
  },
  {
    id: 'angry',
    label: 'Angry',
    shortcut: 'A',
    dot: 'bg-mood-angry',
    color: 'text-mood-angry',
    tint: 'bg-mood-angry/10 dark:bg-mood-angry/14',
    edge: 'border-mood-angry/30 border-l-mood-angry',
    pill: 'border-mood-angry/60',
    fill: 'bg-mood-angry-fill',
    fillOklch: [0.53, 0.19, 27],
    fillLightOklch: [0.9, 0.06, 25],
    text: 'font-medium',
    motion: 'emo-in-angry',
    haptic: [35, 30, 35, 30, 35],
    adjective: 'angry',
    emoji: '😡',
  },
  {
    id: 'sad',
    label: 'Sad',
    shortcut: 'S',
    dot: 'bg-mood-sad',
    color: 'text-mood-sad',
    tint: 'bg-mood-sad/10 dark:bg-mood-sad/14',
    edge: 'border-mood-sad/30 border-l-mood-sad',
    pill: 'border-mood-sad/60',
    fill: 'bg-mood-sad-fill',
    fillOklch: [0.52, 0.16, 258],
    fillLightOklch: [0.9, 0.055, 255],
    text: 'text-foreground/80',
    motion: 'emo-in-sad',
    haptic: [60],
    adjective: 'sad',
    emoji: '🥺',
  },
  {
    id: 'lovely',
    label: 'Lovely',
    shortcut: 'L',
    dot: 'bg-mood-lovely',
    color: 'text-mood-lovely',
    tint: 'bg-mood-lovely/10 dark:bg-mood-lovely/14',
    edge: 'border-mood-lovely/30 border-l-mood-lovely',
    pill: 'border-mood-lovely/60',
    fill: 'bg-mood-lovely-fill',
    fillOklch: [0.53, 0.19, 355],
    fillLightOklch: [0.9, 0.065, 350],
    text: '',
    motion: 'emo-in-lovely',
    haptic: [20, 90, 20],
    adjective: 'loving',
    emoji: '😍',
  },
];

export const DEFAULT_MOOD: MoodId = 'happy';

const BY_ID = new Map(MOODS.map((m) => [m.id, m]));
/** Legacy data stored the label ("Happy"); accept both. */
export function getMood(id: string | null | undefined): Mood {
  const key = (id ?? '').toLowerCase() as MoodId;
  return BY_ID.get(key) ?? BY_ID.get(DEFAULT_MOOD)!;
}

export function moodForShortcut(event: KeyboardEvent): Mood | undefined {
  if (!event.altKey || event.ctrlKey || event.metaKey) return undefined;
  const letter = event.code.startsWith('Key') ? event.code.slice(3) : '';
  return MOODS.find((m) => m.shortcut === letter);
}

export interface MoodShare {
  mood: Mood;
  count: number;
  /** 0–100, rounded */
  percent: number;
}

/** Count and share of each mood, in MOODS order (moods with 0 included). */
export function moodMix(ids: readonly string[]): MoodShare[] {
  const counts = new Map<MoodId, number>();
  for (const id of ids) {
    const m = getMood(id).id;
    counts.set(m, (counts.get(m) ?? 0) + 1);
  }
  const total = ids.length;
  return MOODS.map((mood) => {
    const count = counts.get(mood.id) ?? 0;
    return { mood, count, percent: total ? Math.round((count / total) * 100) : 0 };
  });
}

/** Most frequent mood; ties go to the most recent. Null when there is nothing to judge. */
export function dominantMood(ids: readonly string[]): MoodId | null {
  if (!ids.length) return null;
  const counts = new Map<MoodId, number>();
  let best: MoodId = getMood(ids[ids.length - 1]).id;
  let bestCount = 0;
  for (let i = ids.length - 1; i >= 0; i--) {
    const m = getMood(ids[i]).id;
    const c = (counts.get(m) ?? 0) + 1;
    counts.set(m, c);
    if (c > bestCount) {
      best = m;
      bestCount = c;
    }
  }
  return best;
}
