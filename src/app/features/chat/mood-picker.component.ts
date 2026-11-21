import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { MOODS, MoodId, getMood } from '../../core/moods';

@Component({
  selector: 'app-mood-picker',
  imports: [NgIcon, HlmButtonImports, HlmDropdownMenuImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      hlmBtn
      variant="ghost"
      size="sm"
      class="text-muted-foreground hover:text-foreground gap-2 px-2"
      [hlmDropdownMenuTrigger]="menu"
      side="top"
      align="start"
      [attr.aria-label]="'Mood: ' + current().label + '. Change mood'"
    >
      <span class="size-2 rounded-full" [class]="current().dot" aria-hidden="true"></span>
      {{ current().label }}
      <ng-icon name="lucideChevronsUpDown" size="12" />
    </button>
    <ng-template #menu>
      <hlm-dropdown-menu class="w-48">
        <hlm-dropdown-menu-label class="text-muted-foreground text-xs font-normal">Mood</hlm-dropdown-menu-label>
        @for (m of moods; track m.id) {
          <button hlmDropdownMenuRadio keepOpen="false" [checked]="m.id === value()" (triggered)="changed.emit(m.id)">
            <hlm-dropdown-menu-radio-indicator />
            <span class="size-2 rounded-full" [class]="m.dot" aria-hidden="true"></span>
            {{ m.label }}
            <hlm-dropdown-menu-shortcut>Alt {{ m.shortcut }}</hlm-dropdown-menu-shortcut>
          </button>
        }
      </hlm-dropdown-menu>
    </ng-template>
  `,
})
export class MoodPickerComponent {
  value = input.required<MoodId>();
  changed = output<MoodId>();

  readonly moods = MOODS;
  current = computed(() => getMood(this.value()));
}
