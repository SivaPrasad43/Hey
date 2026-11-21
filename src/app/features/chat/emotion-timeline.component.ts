import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { getMood } from '../../core/moods';
import { DisplayMessage, timelineSegments } from './message-rows';

/** Thin vertical strip: one colored segment per loaded message, click to jump. */
@Component({
  selector: 'app-emotion-timeline',
  imports: [HlmTooltipImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (segments().length > 1) {
      <nav class="relative h-full w-2" aria-label="Emotion timeline">
        @for (s of segments(); track s.id) {
          <button
            type="button"
            class="absolute right-0 left-0 rounded-[1px] opacity-70 transition-[opacity,transform] hover:scale-x-150 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            [class]="dot(s.mood)"
            [style.top.%]="s.top"
            [style.height]="'max(2px, calc(' + s.height + '% - 1px))'"
            [hlmTooltip]="s.label"
            position="left"
            [attr.aria-label]="'Jump to: ' + s.label"
            (click)="jump.emit(s.id)"
          ></button>
        }
      </nav>
    }
  `,
})
export class EmotionTimelineComponent {
  messages = input.required<DisplayMessage[]>();
  jump = output<string>();

  segments = computed(() => timelineSegments(this.messages()));

  dot(mood: string): string {
    return getMood(mood).dot;
  }
}
