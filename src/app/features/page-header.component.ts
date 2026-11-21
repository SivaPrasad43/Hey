import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { ThemeToggleComponent } from '../shared/ui/theme-toggle.component';

/** Top bar shared by non-chat panes (Settings, Help). */
@Component({
  selector: 'app-page-header',
  imports: [RouterLink, NgIcon, HlmButtonImports, ThemeToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
      <a hlmBtn variant="ghost" size="icon-sm" routerLink="/chat" class="md:hidden" aria-label="Back to chats">
        <ng-icon name="lucideChevronLeft" />
      </a>
      <h1 class="flex-1 truncate text-sm font-medium">{{ title() }}</h1>
      <app-theme-toggle />
    </header>
  `,
})
export class PageHeaderComponent {
  title = input('');
}
