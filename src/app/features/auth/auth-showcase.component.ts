import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { MOODS, MoodId, getMood } from '../../core/moods';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { EmotionFaceComponent } from '../../shared/ui/emotion-face.component';
import { ReactionBurstComponent } from '../chat/reaction-burst.component';

interface DemoLine {
  own: boolean;
  mood: MoodId;
  text: string;
}

/** The conversation that plays on the sign-in screen. */
const SCRIPT: DemoLine[] = [
  { own: false, mood: 'happy', text: 'We got the apartment!!' },
  { own: true, mood: 'lovely', text: 'No way, I’m so proud of you' },
  { own: false, mood: 'sad', text: 'Now I have to pack 200 boxes' },
  { own: true, mood: 'angry', text: 'Who owns 200 boxes?!' },
];
const STEP_MS = 1500;
const HOLD_MS = 4200;

/**
 * Decorative preview of Hey: messages arrive wearing their feeling, someone reacts,
 * someone types. Loops; shows the finished conversation statically for reduced motion.
 */
@Component({
  selector: 'app-auth-showcase',
  imports: [AvatarComponent, EmotionFaceComponent, ReactionBurstComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', 'aria-hidden': 'true' },
  template: `
    <div class="bg-card ring-foreground/10 shadow-pop mx-auto w-full max-w-[380px] overflow-hidden rounded-[1.75rem] ring-1">
      <!-- mini chat header -->
      <div class="flex items-center gap-3 border-b px-4 py-3">
        <app-avatar name="Maya Chen" uid="demo-maya" color="#db2777" [online]="true" />
        <div class="min-w-0 flex-1 leading-tight">
          <p class="text-sm font-semibold">Maya Chen</p>
          <p class="text-muted-foreground text-xs">{{ typing() ? 'typing…' : 'Online' }}</p>
        </div>
        <span class="bg-muted flex h-7 items-center gap-1.5 rounded-full px-2">
          <app-emotion-face [emotion]="roomMood()" [size]="16" [play]="roomMood() + shown()" />
          <span class="flex h-1.5 w-10 overflow-hidden rounded-full">
            @for (m of moods; track m.id) {
              <span class="h-full flex-1" [class]="m.dot"></span>
            }
          </span>
        </span>
      </div>

      <!-- messages -->
      <div class="flex h-[330px] flex-col justify-end gap-2 px-4 py-4">
        @for (line of script; track $index; let i = $index) {
          @if (i < shown()) {
            @let m = mood(line.mood);
            <div class="flex" [class.justify-end]="line.own">
              <div
                class="relative max-w-[78%] rounded-2xl px-3.5 py-2 text-[0.9rem] leading-snug shadow-soft"
                [class]="(line.own ? m.fill + ' text-on-fill rounded-br-md' : 'bg-background border ' + m.pill + ' rounded-bl-md') + ' ' + (animate ? m.motion : '')"
              >
                <span class="flex items-start gap-2">
                  <app-emotion-face [emotion]="line.mood" [size]="18" [play]="animate ? line.mood + i : null" />
                  <span>{{ line.text }}</span>
                </span>
                @if (i === 0 && reacted()) {
                  <span class="bg-background border-mood-lovely/60 text-foreground absolute -right-2 -bottom-3 inline-flex h-6 items-center gap-1 rounded-full border px-1.5 text-xs font-semibold shadow-soft">
                    <app-emotion-face emotion="lovely" [size]="14" [play]="animate ? 'react' : null" />1
                    <app-reaction-burst mood="lovely" dotClass="bg-mood-lovely" [trigger]="animate && reacted() ? 'react' : null" />
                  </span>
                }
              </div>
            </div>
            @if (i === 0 && reacted()) {
              <div class="h-2"></div>
            }
          }
        }
        @if (typing()) {
          <div class="flex items-center gap-2">
            <div class="bg-background flex items-center gap-2 rounded-2xl rounded-bl-md border px-3 py-2.5 shadow-soft">
              <app-emotion-face emotion="happy" [size]="16" [play]="'t' + shown()" />
              <span class="flex gap-1">
                <span class="bg-muted-foreground/60 animate-typing-dot size-1.5 rounded-full"></span>
                <span class="bg-muted-foreground/60 animate-typing-dot size-1.5 rounded-full [animation-delay:150ms]"></span>
                <span class="bg-muted-foreground/60 animate-typing-dot size-1.5 rounded-full [animation-delay:300ms]"></span>
              </span>
            </div>
          </div>
        }
      </div>

      <!-- composer with feeling tabs -->
      <div class="px-4 pb-4">
        <div class="flex items-end gap-1 pl-2">
          @for (m of moods; track m.id) {
            <span
              class="flex h-8 items-center rounded-t-xl border border-b-0 px-2.5"
              [class]="m.id === composerMood() ? 'bg-background border-border relative -mb-px' : 'border-transparent opacity-60'"
            >
              <app-emotion-face [emotion]="m.id" [size]="16" />
            </span>
          }
        </div>
        <div class="bg-background text-muted-foreground flex h-11 items-center justify-between rounded-2xl border px-3.5 text-sm">
          Say it with feeling…
          <span class="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-lg">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.7 3.3 21 12 3.7 20.7 6 12z" /><path d="M6 12h15" /></svg>
          </span>
        </div>
      </div>
    </div>
  `,
})
export class AuthShowcaseComponent implements OnInit, OnDestroy {
  readonly script = SCRIPT;
  readonly moods = MOODS;
  readonly animate = !matchMedia('(prefers-reduced-motion: reduce)').matches;

  shown = signal(0);
  reacted = signal(false);
  typing = signal(false);
  roomMood = computed<MoodId>(() => SCRIPT[Math.max(0, this.shown() - 1)].mood);
  composerMood = computed<MoodId>(() => SCRIPT[Math.min(this.shown(), SCRIPT.length - 1)].mood);

  private timers: ReturnType<typeof setTimeout>[] = [];

  mood(id: MoodId) {
    return getMood(id);
  }

  ngOnInit(): void {
    if (!this.animate) {
      this.shown.set(SCRIPT.length);
      this.reacted.set(true);
      return;
    }
    this.play();
  }

  ngOnDestroy(): void {
    this.timers.forEach(clearTimeout);
  }

  private at(ms: number, fn: () => void): void {
    this.timers.push(setTimeout(fn, ms));
  }

  /** One pass of the conversation, then reset and loop. */
  private play(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.shown.set(0);
    this.reacted.set(false);
    this.typing.set(false);
    let t = 500;
    SCRIPT.forEach((line, i) => {
      if (!line.own) {
        this.at(t, () => this.typing.set(true));
        t += 900;
      }
      this.at(t, () => {
        this.typing.set(false);
        this.shown.set(i + 1);
      });
      t += STEP_MS;
      if (i === 1) this.at(t - 600, () => this.reacted.set(true));
    });
    this.at(t + HOLD_MS, () => this.play());
  }
}
