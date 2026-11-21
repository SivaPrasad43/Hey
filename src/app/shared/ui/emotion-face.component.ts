import { ChangeDetectionStrategy, Component, computed, effect, input, signal, untracked } from '@angular/core';
import { MoodId, getMood } from '../../core/moods';

/**
 * Hand-drawn emotion faces (24×24, 2px stroke, matches Lucide). Each face has its own micro-motion
 * that plays on hover, when focused, or whenever `play` changes to a new truthy value.
 */
@Component({
  selector: 'app-emotion-face',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'emo-face inline-flex shrink-0',
    '[class]': "'face-' + id() + ' ' + (colored() ? moodDef().color : '')",
    '[class.playing]': 'playing()',
    'aria-hidden': 'true',
    '(mouseenter)': 'interactive() && replay()',
  },
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      @switch (id()) {
        @case ('happy') {
          <path class="f-eyes" d="M9 9.5h.01M15 9.5h.01" stroke-width="2.6" />
          <path class="f-mouth" d="M8 14s1.5 2.5 4 2.5 4-2.5 4-2.5" />
        }
        @case ('angry') {
          <path class="f-brows" d="M7.5 7.5l3 1.6M16.5 7.5l-3 1.6" />
          <path d="M9.5 11.5h.01M14.5 11.5h.01" stroke-width="2.6" />
          <path d="M8.5 16.5s1.3-1.5 3.5-1.5 3.5 1.5 3.5 1.5" />
        }
        @case ('sad') {
          <path d="M8.5 9.5l1.5-.8M15.5 9.5l-1.5-.8" />
          <path d="M9 11.5h.01M15 11.5h.01" stroke-width="2.6" />
          <path d="M8.5 17s1.3-1.8 3.5-1.8 3.5 1.8 3.5 1.8" />
          <path class="f-tear" d="M9 13.2c0 .7-.4 1.3-.4 1.3s-.4-.6-.4-1.3a.4.4 0 0 1 .8 0z" fill="currentColor" stroke-width="1" />
        }
        @default {
          <g class="f-eyes" fill="currentColor" stroke-width="1">
            <path d="M9 11.6 7.4 10.1a.95.95 0 0 1 1.6-1.1.95.95 0 0 1 1.6 1.1z" />
            <path d="M15 11.6l-1.6-1.5a.95.95 0 0 1 1.6-1.1.95.95 0 0 1 1.6 1.1z" />
          </g>
          <path d="M8 14.5s1.5 2.2 4 2.2 4-2.2 4-2.2" />
        }
      }
    </svg>
  `,
})
export class EmotionFaceComponent {
  mood = input<string | null | undefined>('happy', { alias: 'emotion' });
  size = input(16);
  /** Use the mood color (default) or inherit currentColor. */
  colored = input(true);
  /** Replay on hover. */
  interactive = input(false);
  /** Any new truthy value plays the motion once. */
  play = input<unknown>(null);

  protected id = computed<MoodId>(() => getMood(this.mood()).id);
  protected moodDef = computed(() => getMood(this.mood()));
  protected playing = signal(false);

  constructor() {
    effect(() => {
      if (this.play()) untracked(() => this.replay());
    });
  }

  replay(): void {
    this.playing.set(false);
    // next frame so the class re-applies and the animation restarts
    setTimeout(() => this.playing.set(true), 16);
    setTimeout(() => this.playing.set(false), 1300);
  }
}
