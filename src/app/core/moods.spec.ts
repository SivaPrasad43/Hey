import { MOODS, getMood, moodForShortcut } from './moods';

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
});
