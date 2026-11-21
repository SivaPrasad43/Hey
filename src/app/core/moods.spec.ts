import { MOODS, dominantMood, getMood, moodForShortcut, moodMix } from './moods';

describe('moods', () => {
  it('has unique ids and shortcuts', () => {
    expect(new Set(MOODS.map((m) => m.id)).size).toBe(MOODS.length);
    expect(new Set(MOODS.map((m) => m.shortcut)).size).toBe(MOODS.length);
  });

  it('getMood accepts legacy labels and falls back to happy', () => {
    expect(getMood('Angry').id).toBe('angry');
    expect(getMood('sad').id).toBe('sad');
    expect(getMood(undefined).id).toBe('happy');
    expect(getMood('nope').id).toBe('happy');
  });

  it('moodForShortcut matches Alt+letter only', () => {
    const ev = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init);
    expect(moodForShortcut(ev({ altKey: true, code: 'KeyL' }))?.id).toBe('lovely');
    expect(moodForShortcut(ev({ code: 'KeyL' }))).toBeUndefined();
    expect(moodForShortcut(ev({ altKey: true, ctrlKey: true, code: 'KeyL' }))).toBeUndefined();
    expect(moodForShortcut(ev({ altKey: true, code: 'KeyZ' }))).toBeUndefined();
  });

  it('moodMix counts every mood in order', () => {
    const mix = moodMix(['sad', 'sad', 'Happy', 'lovely']);
    expect(mix.map((m) => [m.mood.id, m.count, m.percent])).toEqual([
      ['happy', 1, 25],
      ['angry', 0, 0],
      ['sad', 2, 50],
      ['lovely', 1, 25],
    ]);
    expect(moodMix([]).every((m) => m.percent === 0)).toBeTrue();
  });

  it('dominantMood picks the most frequent, ties go to the most recent', () => {
    expect(dominantMood([])).toBeNull();
    expect(dominantMood(['sad', 'sad', 'angry'])).toBe('sad');
    expect(dominantMood(['sad', 'angry'])).toBe('angry');
  });

  it('every mood defines its expressive styling', () => {
    for (const m of MOODS) {
      expect(m.tint && m.edge && m.motion && m.color).toBeTruthy();
      expect(m.haptic.length).toBeGreaterThan(0);
    }
  });
});
