import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { getMood } from '../../core/moods';
import { EmotionFaceComponent } from '../../shared/ui/emotion-face.component';
import { DisplayMessage, MinimapSpan, minimapGradient, minimapLabel, spanAt } from './message-rows';

/** Smallest the viewport thumb gets, so it stays easy to grab in very long chats. */
const MIN_THUMB_PX = 24;

/**
 * Emotion minimap: a slim full-height line that maps the whole loaded conversation, each message drawn
 * in its mood colour at its real scroll position, with a viewport thumb that tracks scrolling. Click to
 * jump, drag the thumb (or anywhere on the line) to scroll, hover for a preview.
 *
 * Painted as one CSS gradient (recomputed only when the layout changes) plus one thumb element moved
 * directly on scroll, so long chats don't re-render anything while scrolling.
 */
@Component({
  selector: 'app-emotion-timeline',
  imports: [EmotionFaceComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div
      #track
      class="group/mm relative h-full w-3 cursor-pointer touch-none outline-none select-none md:w-4"
      [class.invisible]="!spans().length"
      [attr.data-drag]="dragging() || null"
      role="scrollbar"
      aria-orientation="vertical"
      aria-label="Emotion timeline. Arrow keys step through messages."
      [attr.aria-controls]="controls()"
      aria-valuemin="0"
      aria-valuemax="100"
      tabindex="0"
      (pointerdown)="onDown($event)"
      (pointermove)="onMove($event)"
      (pointerup)="onUp($event)"
      (pointercancel)="onUp($event)"
      (pointerleave)="hoverIdx.set(-1)"
      (keydown)="onKey($event)"
    >
      <!-- the line -->
      <div
        class="absolute inset-y-0 right-1 w-[3px] rounded-full opacity-80 transition-[width,opacity] duration-150 group-hover/mm:w-[5px] group-hover/mm:opacity-100 group-focus-visible/mm:w-[5px] group-focus-visible/mm:opacity-100 group-data-[drag]/mm:w-[5px] group-data-[drag]/mm:opacity-100 motion-reduce:transition-none md:right-1.5"
        [style.background]="gradient()"
      ></div>
      <!-- viewport -->
      <div
        #thumb
        class="border-foreground/30 bg-foreground/10 group-hover/mm:bg-foreground/15 group-focus-visible/mm:ring-ring group-data-[drag]/mm:bg-foreground/20 absolute top-0 right-0 left-0 rounded-[4px] border transition-colors group-focus-visible/mm:ring-2 motion-reduce:transition-none"
        style="will-change: transform"
      ></div>

      @if (hover(); as h) {
        <div
          class="bg-popover text-popover-foreground border-border shadow-float pointer-events-none absolute right-full mr-2 flex w-max max-w-64 -translate-y-1/2 items-start gap-2 rounded-lg border px-2.5 py-1.5 text-xs"
          [style.top.px]="h.y"
          aria-hidden="true"
        >
          <app-emotion-face class="mt-px shrink-0" [emotion]="h.mood" [size]="14" />
          <span class="min-w-0 break-words">{{ h.label }}</span>
        </div>
      }
    </div>
  `,
})
export class EmotionTimelineComponent {
  messages = input.required<DisplayMessage[]>();
  /** The scrolling element the minimap mirrors. */
  scroller = input<HTMLElement | null>(null);
  /** Centre and flash a message (keyboard steps through messages one at a time). */
  jump = output<string>();

  private track = viewChild.required<ElementRef<HTMLElement>>('track');
  private thumb = viewChild.required<ElementRef<HTMLElement>>('thumb');

  spans = signal<MinimapSpan[]>([]);
  private contentPx = signal(0);
  private trackPx = signal(0);
  gradient = computed(() => minimapGradient(this.spans(), this.contentPx(), this.trackPx()));
  controls = computed(() => this.scroller()?.id || null);

  dragging = signal(false);
  hoverIdx = signal(-1);
  private hoverY = signal(0);
  private byId = computed(() => new Map(this.messages().map((m) => [m.id, m])));
  hover = computed(() => {
    const s = this.spans()[this.hoverIdx()];
    const m = s && this.byId().get(s.id);
    return m ? { y: this.hoverY(), mood: getMood(m.mood).id, label: minimapLabel(m) } : null;
  });

  /** Offset between the pointer and the thumb's top while dragging. */
  private grab = 0;
  private frame = 0;
  private reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor() {
    effect((onCleanup) => {
      const el = this.scroller();
      if (!el) return;
      const onScroll = () => this.paintThumb();
      el.addEventListener('scroll', onScroll, { passive: true });
      // Layout changes: new or older messages, edits, images, filters, the composer hiding/showing.
      const ro = new ResizeObserver(() => this.scheduleMeasure());
      ro.observe(el);
      if (el.firstElementChild) ro.observe(el.firstElementChild);
      ro.observe(this.track().nativeElement);
      this.scheduleMeasure();
      onCleanup(() => {
        el.removeEventListener('scroll', onScroll);
        ro.disconnect();
        cancelAnimationFrame(this.frame);
      });
    });
    // Messages can re-render without changing the content height (mood edits).
    effect(() => {
      this.messages();
      untracked(() => this.scheduleMeasure());
    });
  }

  private scheduleMeasure(): void {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.measure());
  }

  /** Read every message's position once per layout change; never on scroll. */
  private measure(): void {
    const el = this.scroller();
    if (!el) return;
    const byId = this.byId();
    const base = el.getBoundingClientRect().top - el.scrollTop;
    const spans: MinimapSpan[] = [];
    for (const node of el.querySelectorAll<HTMLElement>('[data-mid]')) {
      const m = byId.get(node.dataset['mid'] ?? '');
      if (!m || m.deleted || m.type === 'system') continue;
      const r = node.getBoundingClientRect();
      spans.push({ id: m.id, mood: getMood(m.mood).id, top: r.top - base, height: r.height });
    }
    this.spans.set(spans);
    this.contentPx.set(el.scrollHeight);
    this.trackPx.set(this.track().nativeElement.clientHeight);
    this.paintThumb();
  }

  /** Move the viewport thumb to match the scroller. Direct DOM writes only: this runs on every scroll. */
  private paintThumb(): void {
    const el = this.scroller();
    if (!el) return;
    const track = this.track().nativeElement;
    const thumb = this.thumb().nativeElement;
    const { top, height } = this.thumbGeometry(el, track.clientHeight);
    thumb.style.transform = `translateY(${top}px)`;
    thumb.style.height = `${height}px`;
    thumb.style.display = el.scrollHeight > el.clientHeight + 1 ? '' : 'none';

    const pct = Math.round((el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)) * 100);
    track.setAttribute('aria-valuenow', String(pct));
    const s = this.spans()[spanAt(this.spans(), el.scrollTop + el.clientHeight / 2)];
    const m = s && this.byId().get(s.id);
    track.setAttribute('aria-valuetext', m ? `${pct}%, ${minimapLabel(m)}` : `${pct}%`);
  }

  /**
   * The thumb's size is the visible share of the conversation (with a floor so it stays grabbable);
   * its position maps scrollTop onto the track's remaining room, so it reaches both ends exactly.
   */
  private thumbGeometry(el: HTMLElement, trackPx: number): { top: number; height: number } {
    const height = Math.min(trackPx, Math.max(MIN_THUMB_PX, (el.clientHeight / Math.max(1, el.scrollHeight)) * trackPx));
    const max = Math.max(1, el.scrollHeight - el.clientHeight);
    return { top: (el.scrollTop / max) * (trackPx - height), height };
  }

  /** Scroll so the thumb's top lands at `thumbTop` (track pixels). */
  private scrollToThumbTop(thumbTop: number): void {
    const el = this.scroller();
    if (!el) return;
    const trackPx = this.track().nativeElement.clientHeight;
    const { height } = this.thumbGeometry(el, trackPx);
    const f = Math.min(1, Math.max(0, thumbTop / Math.max(1, trackPx - height)));
    el.scrollTop = f * (el.scrollHeight - el.clientHeight);
  }

  onDown(e: PointerEvent): void {
    const el = this.scroller();
    if (!el || e.button !== 0) return;
    e.preventDefault();
    const track = this.track().nativeElement;
    track.focus({ preventScroll: true });
    const y = e.clientY - track.getBoundingClientRect().top;
    const { top, height } = this.thumbGeometry(el, track.clientHeight);
    if (y >= top && y <= top + height) {
      // Grabbed the thumb: keep the same grip point while dragging.
      this.grab = y - top;
    } else {
      // Pressed elsewhere on the line: centre the viewport there (like VS Code's minimap), then drag on.
      this.grab = height / 2;
      this.scrollToThumbTop(y - this.grab);
    }
    track.setPointerCapture(e.pointerId);
    this.dragging.set(true);
    this.hoverIdx.set(-1);
  }

  onMove(e: PointerEvent): void {
    const track = this.track().nativeElement;
    const y = e.clientY - track.getBoundingClientRect().top;
    if (this.dragging()) {
      this.scrollToThumbTop(y - this.grab);
      return;
    }
    if (e.pointerType !== 'mouse') return;
    const trackPx = track.clientHeight;
    this.hoverY.set(Math.min(Math.max(y, 16), trackPx - 16));
    this.hoverIdx.set(spanAt(this.spans(), (y / Math.max(1, trackPx)) * this.contentPx()));
  }

  onUp(e: PointerEvent): void {
    if (!this.dragging()) return;
    this.dragging.set(false);
    const track = this.track().nativeElement;
    if (track.hasPointerCapture(e.pointerId)) track.releasePointerCapture(e.pointerId);
  }

  onKey(e: KeyboardEvent): void {
    const el = this.scroller();
    if (!el) return;
    const spans = this.spans();
    const centre = el.scrollTop + el.clientHeight / 2;
    const mid = (s: MinimapSpan) => s.top + s.height / 2;
    const behavior: ScrollBehavior = this.reduceMotion ? 'auto' : 'smooth';
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowDown': {
        // Step to the previous/next message relative to the middle of the view.
        const target =
          e.key === 'ArrowUp'
            ? [...spans].reverse().find((s) => mid(s) < centre - 4) ?? spans[0]
            : spans.find((s) => mid(s) > centre + 4) ?? spans[spans.length - 1];
        if (target) this.jump.emit(target.id);
        break;
      }
      case 'PageUp':
      case 'PageDown':
        el.scrollBy({ top: (e.key === 'PageUp' ? -0.9 : 0.9) * el.clientHeight, behavior });
        break;
      case 'Home':
        el.scrollTo({ top: 0, behavior });
        break;
      case 'End':
        el.scrollTo({ top: el.scrollHeight, behavior });
        break;
      default:
        return;
    }
    e.preventDefault();
  }
}
