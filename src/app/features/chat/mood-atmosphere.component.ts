import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { EMOTION_PARTICLES } from '../../core/emotion-art';
import { MOODS, MoodId } from '../../core/moods';
import { Atmosphere } from './mood-atmosphere';

/** Where each feeling's glow sits, so blends read as distinct patches of colour. */
const GLOW_AT: Record<MoodId, { x: number; y: number }> = {
  calm: { x: 12, y: 8 },
  happy: { x: 88, y: 4 },
  lovely: { x: 92, y: 58 },
  angry: { x: 8, y: 62 },
  sad: { x: 50, y: 104 },
};

/** Fixed, hand-spread drift lanes so particles never clump (left %, size px, duration s, delay s). */
const LANES = [
  [8, 18, 26, 0],
  [22, 14, 31, -9],
  [37, 20, 24, -17],
  [55, 15, 29, -4],
  [68, 19, 27, -21],
  [81, 13, 33, -12],
  [93, 17, 25, -6],
] as const;

/**
 * Background "weather" for a conversation: soft glows tinted by the feelings in recent
 * messages, plus a few slow-drifting particles from the leading feeling.
 * Purely decorative: hidden from assistive tech, no pointer events, still with reduced motion.
 */
@Component({
  selector: 'app-mood-atmosphere',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pointer-events-none absolute inset-0 overflow-hidden', 'aria-hidden': 'true' },
  template: `
    @for (w of washes(); track w.id) {
      <div class="mood-atmo-wash" [style.opacity]="w.opacity" [style.--atmo-c]="'var(--mood-' + w.id + ')'"></div>
    }
    @for (g of glows(); track g.id) {
      <div
        class="mood-atmo-glow"
        [style.left.%]="g.x"
        [style.top.%]="g.y"
        [style.opacity]="g.opacity"
        [style.transform]="'translate(-50%, -50%) scale(' + g.scale + ')'"
        [style.--atmo-c]="'var(--mood-' + g.id + ')'"
      ></div>
    }
    @for (p of particles(); track p.key) {
      <img
        class="mood-atmo-particle"
        alt=""
        [src]="p.src"
        [style.left.%]="p.left"
        [style.width.px]="p.size"
        [style.height.px]="p.size"
        [style.animation-duration.s]="p.duration"
        [style.animation-delay.s]="p.delay"
      />
    }
  `,
})
export class MoodAtmosphereComponent {
  readonly weather = input.required<Atmosphere>();

  private readonly sanitizer = inject(DomSanitizer);
  /** Particle artwork is our own generated SVG, so it is safe to use as an image URL. */
  private readonly art = Object.fromEntries(
    MOODS.map((m) => [
      m.id,
      this.sanitizer.bypassSecurityTrustUrl(
        'data:image/svg+xml;charset=utf-8,' +
          encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${EMOTION_PARTICLES[m.id]}</svg>`),
      ),
    ]),
  ) as Record<MoodId, SafeUrl>;

  /** A room-wide tint in the leading feeling's colour; one layer per feeling so changes cross-fade. */
  readonly washes = computed(() => {
    const { shares, lead } = this.weather();
    return MOODS.map((m) => ({ id: m.id, opacity: m.id === lead ? shares[m.id] : 0 }));
  });

  readonly glows = computed(() => {
    const { shares, lead } = this.weather();
    return MOODS.map((m) => ({
      id: m.id,
      ...GLOW_AT[m.id],
      // Lift small shares a little so a single message of a feeling still shows.
      opacity: shares[m.id] ? Math.min(1, 0.25 + shares[m.id] * 1.1) : 0,
      scale: m.id === lead ? 1.2 : 0.75 + shares[m.id] * 0.4,
    }));
  });

  readonly particles = computed(() => {
    const lead = this.weather().lead;
    if (!lead) return [];
    return LANES.map(([left, size, duration, delay], i) => ({
      key: `${lead}-${i}`,
      src: this.art[lead],
      left,
      size,
      duration,
      delay,
    }));
  });
}
