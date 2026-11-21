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

  it('own-bubble fills keep their text at WCAG AA in both themes (>= 4.5:1)', () => {
    const toLinear = ([L, C, h]: [number, number, number]) => {
      const a = C * Math.cos((h * Math.PI) / 180);
      const b = C * Math.sin((h * Math.PI) / 180);
      const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
      const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
      const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
      const clamp = (v: number) => Math.min(1, Math.max(0, v));
      return [
        clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
        clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
        clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
      ];
    };
    const lum = (c: [number, number, number]) => {
      const [r, g, b] = toLinear(c);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ink = lum([0.24, 0.02, 285]); // --on-fill in light theme
    for (const mood of MOODS) {
      const dark = mood.darkInk ? (lum(mood.fillOklch) + 0.05) / (ink + 0.05) : 1.05 / (lum(mood.fillOklch) + 0.05);
      expect(dark >= 4.5).withContext(mood.id + ' dark').toBeTrue();
      expect((lum(mood.fillLightOklch) + 0.05) / (ink + 0.05) >= 4.5).withContext(mood.id + ' light').toBeTrue();
    }
  });
});
