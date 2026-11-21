import { MoodId } from '../../core/moods';
import { formatText, isEmojiOnly, replyRef, stickerMood } from './message-format';

describe('message formatting', () => {
  it('tokenises links, code, bold and italic without touching plain text', () => {
    expect(formatText('plain words')).toEqual([{ kind: 'text', value: 'plain words' }]);
    expect(formatText('see https://hey.app/x?y=1, then **go** _now_ with `npm start`.')).toEqual([
      { kind: 'text', value: 'see ' },
      { kind: 'link', value: 'https://hey.app/x?y=1', href: 'https://hey.app/x?y=1' },
      { kind: 'text', value: ', then ' },
      { kind: 'bold', value: 'go' },
      { kind: 'text', value: ' ' },
      { kind: 'italic', value: 'now' },
      { kind: 'text', value: ' with ' },
      { kind: 'code', value: 'npm start' },
      { kind: 'text', value: '.' },
    ]);
  });

  it('does not treat snake_case or markup as formatting', () => {
    expect(formatText('my_var_name').map((t) => t.kind)).toEqual(['text']);
    expect(formatText('<b>x</b>')).toEqual([{ kind: 'text', value: '<b>x</b>' }]);
  });

  it('only links http(s) URLs', () => {
    expect(formatText('javascript:alert(1)').map((t) => t.kind)).toEqual(['text']);
  });

  it('detects 1–3 emoji messages', () => {
    expect(isEmojiOnly('🎉')).toBeTrue();
    expect(isEmojiOnly(' 👍🏽 ❤️ 🔥 ')).toBeTrue();
    expect(isEmojiOnly('👨‍👩‍👧')).toBeTrue();
    expect(isEmojiOnly('🎉🎉🎉🎉')).toBeFalse();
    expect(isEmojiOnly('ok 👍')).toBeFalse();
    expect(isEmojiOnly('123')).toBeFalse();
  });

  it('maps a single feeling emoji to a sticker', () => {
    expect(stickerMood('😍')).toBe('lovely');
    expect(stickerMood(' 🥺 ')).toBe('sad');
    expect(stickerMood('😍😍')).toBeNull();
    expect(stickerMood('hi')).toBeNull();
  });

  it('builds compact reply references', () => {
    // legacy label casing on purpose
    const base = { id: 'm1', senderId: 'u', senderName: 'Bob', mood: 'Sad' as MoodId };
    expect(replyRef({ ...base, text: 'a\n  b' })).toEqual({ id: 'm1', senderId: 'u', senderName: 'Bob', text: 'a b', mood: 'sad' });
    expect(replyRef({ ...base, text: 'x'.repeat(200) }).text.length).toBe(91);
    expect(replyRef({ ...base, text: 'gone', deleted: true }).text).toBe('Deleted message');
    expect(replyRef({ ...base, text: '😁' }).text).toBe('Happy sticker');
  });
});
