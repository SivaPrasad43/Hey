import { suggestEmotion } from './emotion-suggest';

describe('suggestEmotion', () => {
  it('reads clear words', () => {
    expect(suggestEmotion('this is so annoying!!!')).toBe('angry');
    expect(suggestEmotion('I miss you so much')).toBe('lovely');
    expect(suggestEmotion('sorry, I feel really lonely today')).toBe('sad');
    expect(suggestEmotion('haha that was awesome')).toBe('happy');
  });

  it('reads emoji and emoticons', () => {
    expect(suggestEmotion('see you soon <3')).toBe('lovely');
    expect(suggestEmotion('ugh :(')).toBe('sad');
    expect(suggestEmotion('done 🎉')).toBe('happy');
    expect(suggestEmotion('again 😡')).toBe('angry');
  });

  it('treats shouting as angry', () => {
    expect(suggestEmotion('WHY IS THIS BROKEN')).toBe('angry');
  });

  it('stays quiet when unsure', () => {
    expect(suggestEmotion('ok')).toBeNull();
    expect(suggestEmotion('meeting at 5 in room B')).toBeNull();
    expect(suggestEmotion('love it but sorry')).toBeNull(); // tie
  });
});
