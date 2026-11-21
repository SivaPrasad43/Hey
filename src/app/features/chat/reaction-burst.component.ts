import { ChangeDetectionStrategy, Component, effect, input, signal, untracked } from '@angular/core';
import { EmotionFaceComponent } from '../../shared/ui/emotion-face.component';

interface Particle {
  id: number;
  face: boolean;
  dx: string;
  dy: string;
  rot: string;
  delay: string;
  size: number;
}

let seq = 0;

/** Small one-shot burst of faces and sparks rising from its parent. Parent must be `relative`. */
@Component({
  selector: 'app-reaction-burst',
  imports: [EmotionFaceComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pointer-events-none absolute inset-x-0 top-0 z-10 block h-0', 'aria-hidden': 'true' },
  template: `
    @for (p of particles(); track p.id) {
      <span
        class="emo-particle absolute top-0 left-1/2"
        [style.--dx]="p.dx"
        [style.--dy]="p.dy"
        [style.--rot]="p.rot"
        [style.animation-delay]="p.delay"
      >
        @if (p.face) {
          <app-emotion-face [emotion]="mood()" [size]="p.size" />
        } @else {
          <span class="block size-1.5 rounded-full" [class]="dotClass()"></span>
        }
      </span>
    }
  `,
})
export class ReactionBurstComponent {
  mood = input<string>('happy');
  dotClass = input('bg-mood-happy');
  /** Any new truthy value fires a burst. */
  trigger = input<unknown>(null);
  /** Smaller, sparser burst for other people's reactions. */
  subtle = input(false);

  particles = signal<Particle[]>([]);

  constructor() {
    effect(() => {
      if (this.trigger()) untracked(() => this.fire());
    });
  }

  fire(): void {
    const n = this.subtle() ? 4 : 8;
    const reach = this.subtle() ? 0.6 : 1;
    const batch: Particle[] = Array.from({ length: n }, (_, i) => {
      const spread = (i / (n - 1) - 0.5) * 2; // -1..1
      return {
        id: ++seq,
        face: i % 3 === 0,
        dx: `${Math.round((spread * 26 + (Math.random() - 0.5) * 10) * reach)}px`,
        dy: `${Math.round(-(22 + Math.random() * 24) * reach)}px`,
        rot: `${Math.round((Math.random() - 0.5) * 60)}deg`,
        delay: `${Math.round(Math.random() * 90)}ms`,
        size: 12,
      };
    });
    this.particles.update((p) => [...p, ...batch]);
    const ids = new Set(batch.map((b) => b.id));
    setTimeout(() => this.particles.update((p) => p.filter((x) => !ids.has(x.id))), 950);
  }
}
