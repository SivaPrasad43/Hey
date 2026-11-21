import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';

/** Top bar shared by non-chat panes (Settings, Help). */
@Component({
  selector: 'app-page-header',
  imports: [RouterLink, NgIcon, HlmButtonImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex h-16 shrink-0 items-center gap-2 border-b px-3 sm:px-6">
      <a hlmBtn variant="ghost" size="icon-sm" routerLink="/chat" class="md:hidden" aria-label="Back to chats">
        <ng-icon name="lucideChevronLeft" />
      </a>
      <h1 class="text-title flex-1 truncate">{{ heading() }}</h1>
    </header>
  `,
})
export class PageHeaderComponent {
  /** Not `title`: that would also become a native tooltip on the host element. */
  heading = input('');
}
