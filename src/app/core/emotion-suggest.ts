import { MoodId } from './moods';

/**
 * Local, dependency-free emotion guess for a draft message. Deliberately conservative:
 * it only answers when the signal is clear, and never sends text anywhere.
 */
const RULES: Record<MoodId, { words: RegExp[]; symbols: RegExp[] }> = {
  happy: {
    words: [/\b(ha(ha)+|lol|lmao|yay+|great|awesome|amazing|nice|glad|happy|congrats|congratulations|excited|can'?t wait|let'?s go|woo+)\b/i],
    symbols: [/:-?\)|:D|😀|😃|😄|😁|😂|🤣|😊|🎉|🥳|👍/],
  },
  angry: {
    words: [/\b(angry|mad|furious|annoy(ed|ing)?|hate|wtf|stupid|ridiculous|seriously\?|unbelievable|sick of|fed up|shut up)\b/i],
    symbols: [/>:\(|😠|😡|🤬|💢/],
  },
  sad: {
    words: [/\b(sad|sorry|miss(ing)?|lonely|cry(ing)?|upset|tired|hurt|depressed|unfortunately|sigh|lost|alone|bad day)\b/i],
    symbols: [/:-?\(|:'\(|😢|😭|😞|😔|🥺|💔/],
  },
  lovely: {
    words: [/\b(love|loving|lovely|adore|cute|sweet|darling|babe|honey|xoxo|hugs?|kiss(es)?|miss you|thank you so much|beautiful)\b/i],
    symbols: [/<3|❤️?|💕|💖|💗|😍|🥰|😘|💞/],
  },
};

const THRESHOLD = 2;

export function suggestEmotion(text: string): MoodId | null {
  const t = text.trim();
  if (t.length < 3) return null;
  const scores: Record<MoodId, number> = { happy: 0, angry: 0, sad: 0, lovely: 0 };
  for (const id of Object.keys(RULES) as MoodId[]) {
    for (const re of RULES[id].words) scores[id] += (t.match(new RegExp(re, 'gi')) ?? []).length * 2;
    for (const re of RULES[id].symbols) scores[id] += (t.match(new RegExp(re, 'g')) ?? []).length * 2;
  }
  // Shouting: repeated "!" or mostly-caps words lean angry unless something else is clearly stronger.
  const letters = t.replace(/[^a-z]/gi, '');
  if (/!{3,}/.test(t)) scores.angry += 1;
  if (letters.length >= 6 && letters === letters.toUpperCase()) scores.angry += 2;
  // "miss you" is affectionate more than sad.
  if (/\bmiss you\b/i.test(t)) scores.sad -= 1;

  let best: MoodId | null = null;
  let bestScore = 0;
  let tie = false;
  for (const id of Object.keys(scores) as MoodId[]) {
    if (scores[id] > bestScore) {
      best = id;
      bestScore = scores[id];
      tie = false;
    } else if (scores[id] === bestScore && bestScore > 0) {
      tie = true;
    }
  }
  return best && !tie && bestScore >= THRESHOLD ? best : null;
}
