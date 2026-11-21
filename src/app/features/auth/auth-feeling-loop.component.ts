import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { MOODS } from '../../core/moods';
import { EmotionFaceComponent } from '../../shared/ui/emotion-face.component';

const LINE = 'See you tonight.';
const STEP_MS = 2200;

/**
 * Mobile sign-in hero: the same words sent with each feeling in turn,
 * so the idea of Hey reads at a glance. Tap to skip ahead.
 */
@Component({
  selector: 'app-auth-feeling-loop',
  imports: [EmotionFaceComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', 'aria-hidden': 'true' },
  template: `
    <div class="auth-showcase-panel flex h-[168px] cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border select-none" (click)="next()">
      @for (m of [mood()]; track m.id) {
        <div class="flex items-center gap-2 rounded-2xl rounded-br-md px-4 py-2.5 text-[0.95rem] text-on-fill shadow-float" [class]="m.fill + ' ' + (animate ? m.motion : '')">
          <app-emotion-face [emotion]="m.id" [size]="22" [play]="animate ? m.id : null" />
          <span class="font-medium">{{ line }}</span>
        </div>
        <p class="text-muted-foreground text-sm">
          Same words. Sent <span class="text-foreground font-semibold">{{ m.adjective === 'loving' ? 'with love' : m.adjective === 'sad' ? 'sadly' : m.adjective === 'angry' ? 'angrily' : m.adjective === 'calm' ? 'calmly' : 'happily' }}</span>.
        </p>
      }
      <div class="flex gap-1.5">
        @for (m of moods; track m.id; let i = $index) {
          <span class="h-1.5 rounded-full transition-all duration-300" [class]="i === index() ? m.dot + ' w-5' : 'bg-foreground/15 w-1.5'"></span>
        }
      </div>
    </div>
  `,
})
export class AuthFeelingLoopComponent implements OnInit, OnDestroy {
  readonly line = LINE;
  readonly moods = MOODS;
  readonly animate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  index = signal(0);
  mood = computed(() => MOODS[this.index()]);
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    if (this.animate) this.restart();
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  next(): void {
    this.index.update((i) => (i + 1) % MOODS.length);
    if (this.animate) this.restart();
  }

  private restart(): void {
    clearInterval(this.timer);
    this.timer = setInterval(() => this.index.update((i) => (i + 1) % MOODS.length), STEP_MS);
  }
}
