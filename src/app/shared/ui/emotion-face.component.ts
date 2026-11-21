import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { EMOTION_FACES } from '../../core/emotion-art';
import { MoodId, getMood } from '../../core/moods';

/** Pre-trusted SVG markup per feeling. The art is a static, bundled constant (never user input). */
const TRUSTED = new Map<MoodId, SafeHtml>();

/**
 * Emotion artwork (Fluent Emoji, flat). Each feeling has its own one-shot motion that plays on hover
 * (when interactive) or whenever `play` changes to a new truthy value.
 */
@Component({
  selector: 'app-emotion-face',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'emo-face inline-flex shrink-0',
    '[class]': "'face-' + id()",
    '[class.playing]': 'playing()',
    'aria-hidden': 'true',
    '(mouseenter)': 'interactive() && replay()',
  },
  template: `<svg
    [attr.width]="size()"
    [attr.height]="size()"
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
    [innerHTML]="art()"
  ></svg>`,
})
export class EmotionFaceComponent {
  mood = input<string | null | undefined>('happy', { alias: 'emotion' });
  size = input(16);
  /** Kept for API compatibility: the artwork carries its own colors. */
  colored = input(true);
  /** Replay on hover. */
  interactive = input(false);
  /** Any new truthy value plays the motion once. */
  play = input<unknown>(null);

  private sanitizer = inject(DomSanitizer);
  protected id = computed<MoodId>(() => getMood(this.mood()).id);
  protected art = computed(() => {
    const id = this.id();
    if (!TRUSTED.has(id)) TRUSTED.set(id, this.sanitizer.bypassSecurityTrustHtml(EMOTION_FACES[id]));
    return TRUSTED.get(id)!;
  });
  protected playing = signal(false);

  constructor() {
    effect(() => {
      if (this.play()) untracked(() => this.replay());
    });
  }

  replay(): void {
    this.playing.set(false);
    // next tick so the class re-applies and the animation restarts
    setTimeout(() => this.playing.set(true), 16);
    setTimeout(() => this.playing.set(false), 1000);
  }
}
