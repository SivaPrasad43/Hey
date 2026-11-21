import { ChangeDetectionStrategy, Component, Injectable, inject } from '@angular/core';
import { HlmDialogImports, HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmKbdImports } from '@spartan-ng/helm/kbd';
import { MOODS } from '../../core/moods';
import { EmotionFaceComponent } from '../../shared/ui/emotion-face.component';

@Injectable({ providedIn: 'root' })
export class ShortcutsService {
  private dialog = inject(HlmDialogService);
  private open = false;

  show(): void {
    if (this.open) return;
    this.open = true;
    this.dialog.open(ShortcutsDialogComponent, { contentClass: 'sm:max-w-sm' }).closed$.subscribe(() => (this.open = false));
  }
}

@Component({
  selector: 'app-shortcuts-dialog',
  imports: [HlmDialogImports, HlmKbdImports, EmotionFaceComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4' },
  template: `
    <hlm-dialog-header>
      <h2 hlmDialogTitle>Keyboard shortcuts</h2>
    </hlm-dialog-header>
    <dl class="divide-border divide-y text-sm">
      @for (row of rows; track row[0]) {
        <div class="flex items-center justify-between py-2">
          <dt class="text-muted-foreground">{{ row[0] }}</dt>
          <dd><kbd hlmKbd>{{ row[1] }}</kbd></dd>
        </div>
      }
      @for (m of moods; track m.id) {
        <div class="flex items-center justify-between py-2">
          <dt class="text-muted-foreground flex items-center gap-2">
            <app-emotion-face [emotion]="m.id" [size]="16" />Feel {{ m.label.toLowerCase() }}
          </dt>
          <dd><kbd hlmKbd>Alt {{ m.shortcut }}</kbd></dd>
        </div>
      }
    </dl>
  `,
})
export class ShortcutsDialogComponent {
  readonly moods = MOODS;
  readonly rows = [
    ['Send message', 'Enter'],
    ['New line', 'Shift Enter'],
    ['Send with another feeling', 'Hold send'],
    ['Show shortcuts', '?'],
    ['Close menu or dialog', 'Esc'],
  ];
}
