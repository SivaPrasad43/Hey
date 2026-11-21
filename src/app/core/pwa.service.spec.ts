import { isIos } from './pwa.service';

describe('isIos', () => {
  it('detects iPhone and iPad', () => {
    expect(isIos('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5)).toBeTrue();
    expect(isIos('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)', 5)).toBeTrue();
  });

  it('treats a touch "Macintosh" as iPadOS but not a desktop Mac', () => {
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBeTrue();
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBeFalse();
  });

  it('ignores Android and desktop', () => {
    expect(isIos('Mozilla/5.0 (Linux; Android 15; Pixel 9)', 5)).toBeFalse();
    expect(isIos('Mozilla/5.0 (X11; Linux x86_64)', 0)).toBeFalse();
  });
});
