import { SWIPE_REPLY_PX, swipeState } from './gestures';

describe('swipeState', () => {
  it('follows the finger until the threshold, then eases and arms', () => {
    expect(swipeState(20, 2)).toEqual({ offset: 20, armed: false, cancelled: false });
    const at = swipeState(SWIPE_REPLY_PX, 0);
    expect(at.armed).toBeTrue();
    const far = swipeState(200, 0);
    expect(far.offset).toBeLessThanOrEqual(72);
    expect(far.armed).toBeTrue();
  });

  it('ignores left swipes', () => {
    expect(swipeState(-40, 0)).toEqual({ offset: 0, armed: false, cancelled: false });
  });

  it('treats mostly-vertical movement as scrolling', () => {
    expect(swipeState(10, 30).cancelled).toBeTrue();
    expect(swipeState(40, 10).cancelled).toBeFalse();
  });
});
