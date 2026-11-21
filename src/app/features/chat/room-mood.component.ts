import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { HlmPopoverImports } from '@spartan-ng/helm/popover';
import { MoodId, dominantMood, getMood, moodMix } from '../../core/moods';
import { EmotionFaceComponent } from '../../shared/ui/emotion-face.component';
import { DisplayMessage } from './message-rows';

const WINDOW = 30;

/** Header meter: the emotional mix of the last messages, with a breakdown that can filter the room. */
@Component({
  selector: 'app-room-mood',
  imports: [HlmPopoverImports, EmotionFaceComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (recent().length) {
      <hlm-popover align="end" sideOffset="6">
        <button
          hlmPopoverTrigger
          type="button"
          class="bg-muted hover:bg-accent aria-expanded:bg-accent flex h-9 items-center gap-2 rounded-full pr-3 pl-2 transition-colors"
          [attr.aria-label]="'Room feeling: mostly ' + dominantLabel() + '. Show breakdown'"
        >
          <app-emotion-face [emotion]="dominant()" [size]="18" [play]="dominant()" />
          <span class="bg-muted flex h-1.5 w-16 overflow-hidden rounded-full" aria-hidden="true">
            @for (s of mix(); track s.mood.id) {
              @if (s.count) {
                <span class="h-full transition-[width] duration-500" [class]="s.mood.dot" [style.width.%]="s.percent"></span>
              }
            }
          </span>
        </button>
        <hlm-popover-content *hlmPopoverPortal="let ctx" class="w-72 p-4">
          <p class="text-sm font-bold">Room feeling</p>
          <p class="text-muted-foreground mb-3 text-xs">Last {{ recent().length }} messages</p>
          <ul class="flex flex-col gap-1">
            @for (s of mix(); track s.mood.id) {
              <li>
                <button
                  type="button"
                  class="hover:bg-accent flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium disabled:opacity-50"
                  [class.bg-accent]="filter() === s.mood.id"
                  [disabled]="!s.count"
                  [attr.aria-pressed]="filter() === s.mood.id"
                  (click)="toggle(s.mood.id); ctx.close()"
                >
                  <app-emotion-face [emotion]="s.mood.id" [size]="18" [interactive]="true" />
                  <span class="flex-1">{{ s.mood.label }}</span>
                  <span class="bg-muted h-1.5 w-14 overflow-hidden rounded-full"><span class="block h-full" [class]="s.mood.dot" [style.width.%]="s.percent"></span></span>
                  <span class="text-muted-foreground w-8 text-right text-xs tabular-nums">{{ s.percent }}%</span>
                </button>
              </li>
            }
          </ul>
          <p class="text-muted-foreground mt-3 text-xs">{{ filter() ? 'Click again to show everything.' : 'Click a feeling to show only those messages.' }}</p>
        </hlm-popover-content>
      </hlm-popover>
    }
  `,
})
export class RoomMoodComponent {
  messages = input.required<DisplayMessage[]>();
  filter = input<MoodId | null>(null);
  filterChange = output<MoodId | null>();

  recent = computed(() =>
    this.messages()
      .filter((m) => m.type === 'text' && !m.deleted)
      .slice(-WINDOW)
      .map((m) => m.mood),
  );
  mix = computed(() => moodMix(this.recent()));
  dominant = computed(() => dominantMood(this.recent()) ?? 'happy');
  dominantLabel = computed(() => getMood(this.dominant()).label.toLowerCase());

  toggle(id: MoodId): void {
    this.filterChange.emit(this.filter() === id ? null : id);
  }
}
