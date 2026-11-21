import { Message, ReplyRef } from '../../core/models';
import { MOODS, MoodId, getMood } from '../../core/moods';

export type Token =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'italic'; value: string }
  | { kind: 'code'; value: string }
  | { kind: 'link'; value: string; href: string };

// `code` | URL (no trailing punctuation) | **bold** | _italic_ (word-bounded)
const PATTERN = /(`[^`\n]+`)|(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])|(\*\*[^*\n]+?\*\*)|((?<![\w])_[^_\n]+?_(?![\w]))/g;

/** Split message text into safe display tokens (rendered with bindings, never as HTML). */
export function formatText(text: string): Token[] {
  const out: Token[] = [];
  let last = 0;
  for (const m of text.matchAll(PATTERN)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ kind: 'text', value: text.slice(last, i) });
    const [whole, code, url, bold, italic] = m;
    if (code) out.push({ kind: 'code', value: code.slice(1, -1) });
    else if (url) out.push({ kind: 'link', value: url, href: url });
    else if (bold) out.push({ kind: 'bold', value: bold.slice(2, -2) });
    else if (italic) out.push({ kind: 'italic', value: italic.slice(1, -1) });
    else out.push({ kind: 'text', value: whole });
    last = i + whole.length;
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) });
  return out;
}

const PICTO = /\p{Extended_Pictographic}/u;
const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Emoji_Component}|‍|️|\s)+$/u;

function graphemes(text: string): string[] {
  const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  return Array.from(seg.segment(text), (s) => s.segment).filter((g) => g.trim());
}

/** 1–3 emoji and nothing else: shown large without a bubble. */
export function isEmojiOnly(text: string): boolean {
  const t = text.trim();
  if (!t || !PICTO.test(t) || !EMOJI_ONLY.test(t)) return false;
  return graphemes(t).length <= 3;
}

/** A message that is exactly one feeling's emoji renders as that feeling's sticker. */
export function stickerMood(text: string): MoodId | null {
  const t = text.trim().replace(/️/g, '');
  return MOODS.find((m) => m.emoji === t)?.id ?? null;
}

/** Compact reference stored on a reply (kept small; survives edits/deletes of the original). */
export function replyRef(msg: Pick<Message, 'id' | 'senderId' | 'senderName' | 'text' | 'mood' | 'deleted'>): ReplyRef {
  const sticker = stickerMood(msg.text);
  const text = msg.deleted ? 'Deleted message' : sticker ? `${getMood(sticker).label} sticker` : msg.text.replace(/\s+/g, ' ').trim();
  return {
    id: msg.id,
    senderId: msg.senderId,
    senderName: msg.senderName,
    text: text.length > 90 ? text.slice(0, 90) + '…' : text,
    mood: getMood(msg.mood).id,
  };
}
