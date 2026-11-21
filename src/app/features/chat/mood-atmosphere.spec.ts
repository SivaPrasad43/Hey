import { atmosphere } from './mood-atmosphere';

const msg = (mood: string, extra: object = {}) => ({ type: 'text', mood, ...extra });

describe('atmosphere', () => {
  it('is empty and leaderless for a quiet room', () => {
    const a = atmosphere([]);
    expect(a.lead).toBeNull();
    expect(Object.values(a.shares).every((s) => s === 0)).toBeTrue();
  });

  it('shares sum to 1 and newer messages weigh more', () => {
    const a = atmosphere([msg('sad'), msg('happy')]);
    expect(a.shares.sad + a.shares.happy).toBeCloseTo(1);
    expect(a.shares.happy).toBeGreaterThan(a.shares.sad);
  });

  it('ignores system and deleted messages', () => {
    const a = atmosphere([msg('angry', { type: 'system' }), msg('angry', { deleted: true }), msg('calm')]);
    expect(a.shares.angry).toBe(0);
    expect(a.shares.calm).toBe(1);
  });

  it('needs a few messages and a clear majority to name a lead', () => {
    expect(atmosphere([msg('lovely'), msg('lovely')]).lead).toBeNull();
    expect(atmosphere([msg('lovely'), msg('lovely'), msg('lovely')]).lead).toBe('lovely');
    expect(atmosphere([msg('calm'), msg('happy'), msg('lovely'), msg('angry'), msg('sad')]).lead).toBeNull();
  });

  it('only looks at the recent window', () => {
    const old = Array.from({ length: 40 }, () => msg('sad'));
    const a = atmosphere([...old, ...Array.from({ length: 30 }, () => msg('happy'))]);
    expect(a.shares.sad).toBe(0);
    expect(a.lead).toBe('happy');
  });

  it('treats unknown moods as calm', () => {
    expect(atmosphere([msg('???')]).shares.calm).toBe(1);
  });
});
