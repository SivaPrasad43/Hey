export type MoodId = 'happy' | 'angry' | 'sad' | 'lovely';

export interface Mood {
  id: MoodId;
  label: string;
  /** Key used with Alt (e.g. Alt+H). Matched against KeyboardEvent.code. */
  shortcut: string;
  /** Background class for the small mood dot. */
  dot: string;
  /** Border class for the thin mood marker. */
  border: string;
}

export const MOODS: readonly Mood[] = [
  { id: 'happy', label: 'Happy', shortcut: 'H', dot: 'bg-mood-happy', border: 'border-mood-happy' },
  { id: 'angry', label: 'Angry', shortcut: 'A', dot: 'bg-mood-angry', border: 'border-mood-angry' },
  { id: 'sad', label: 'Sad', shortcut: 'S', dot: 'bg-mood-sad', border: 'border-mood-sad' },
  { id: 'lovely', label: 'Lovely', shortcut: 'L', dot: 'bg-mood-lovely', border: 'border-mood-lovely' },
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
