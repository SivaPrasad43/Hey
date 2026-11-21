import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, HlmButtonImports, HlmEmptyImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="flex min-h-svh items-center justify-center p-6">
      <hlm-empty>
        <hlm-empty-header>
          <p class="text-muted-foreground font-mono text-sm">404</p>
          <h1 hlmEmptyTitle>Page not found</h1>
          <p hlmEmptyDescription>The page you’re looking for doesn’t exist or has moved.</p>
        </hlm-empty-header>
        <hlm-empty-content>
          <a hlmBtn routerLink="/chat">Go to chats</a>
        </hlm-empty-content>
      </hlm-empty>
    </main>
  `,
})
export class NotFoundPage {}
