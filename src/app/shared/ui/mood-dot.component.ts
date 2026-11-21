import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { getMood } from '../../core/moods';

@Component({
  selector: 'app-mood-dot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0 items-center', '[attr.title]': 'mood().label' },
  template: `<span class="block size-2 rounded-full" [class]="mood().dot" aria-hidden="true"></span>`,
})
export class MoodDotComponent {
  value = input<string | null | undefined>('happy');
  mood = computed(() => getMood(this.value()));
}
