/** Distance (px) a bubble must be swiped to the right to start a reply. */
export const SWIPE_REPLY_PX = 56;
const SWIPE_MAX_PX = 72;
/** Hold time (ms) that counts as a long press. */
export const LONG_PRESS_MS = 420;
/** Movement (px) that cancels a long press. */
export const PRESS_SLOP_PX = 8;

/** True on phones/tablets (no hover, coarse pointer). */
export function isTouchUi(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(hover: none) and (pointer: coarse)').matches;
}

export interface SwipeState {
  /** Visual offset to apply to the bubble (0..72, eased past the threshold). */
  offset: number;
  /** Past the threshold: releasing now triggers a reply. */
  armed: boolean;
  /** The gesture is a vertical scroll, not a swipe: ignore it. */
  cancelled: boolean;
}

/** Interpret a horizontal drag (dx right is positive) as swipe-to-reply. */
export function swipeState(dx: number, dy: number): SwipeState {
  if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) return { offset: 0, armed: false, cancelled: true };
  if (dx <= 0) return { offset: 0, armed: false, cancelled: false };
  const offset = dx <= SWIPE_REPLY_PX ? dx : SWIPE_REPLY_PX + (Math.min(dx, 160) - SWIPE_REPLY_PX) * 0.25;
  return { offset: Math.min(offset, SWIPE_MAX_PX), armed: dx >= SWIPE_REPLY_PX, cancelled: false };
}
