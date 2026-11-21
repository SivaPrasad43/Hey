import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { ThemeService } from '../../core/theme.service';

@Component({
  selector: 'app-theme-toggle',
  imports: [NgIcon, HlmButtonImports, HlmTooltipImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      hlmBtn
      variant="ghost"
      size="icon-sm"
      (click)="theme.toggle()"
      [attr.aria-label]="theme.dark() ? 'Switch to light theme' : 'Switch to dark theme'"
      [hlmTooltip]="theme.dark() ? 'Light theme' : 'Dark theme'"
    >
      <ng-icon [name]="theme.dark() ? 'lucideSun' : 'lucideMoon'" />
    </button>
  `,
})
export class ThemeToggleComponent {
  theme = inject(ThemeService);
}
