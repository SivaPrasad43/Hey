import { nextReaction } from './message.service';

describe('nextReaction', () => {
  it('adds when none', () => expect(nextReaction(undefined, 'happy')).toBe('happy'));
  it('removes when same', () => expect(nextReaction('happy', 'happy')).toBeNull());
  it('swaps when different', () => expect(nextReaction('happy', 'sad')).toBe('sad'));
});
