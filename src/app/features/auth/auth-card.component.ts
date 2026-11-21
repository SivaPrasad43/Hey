import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { ThemeToggleComponent } from '../../shared/ui/theme-toggle.component';

@Component({
  selector: 'app-auth-card',
  imports: [HlmCardImports, ThemeToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="bg-muted/40 relative flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <app-theme-toggle class="absolute top-4 right-4" />
      <div class="flex items-center gap-2 text-sm font-medium">
        <span class="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md text-xs font-semibold">H</span>
        Hey
      </div>
      <hlm-card class="w-full max-w-sm">
        <hlm-card-header>
          <h1 hlmCardTitle>{{ title() }}</h1>
          <p hlmCardDescription>{{ description() }}</p>
        </hlm-card-header>
        <div hlmCardContent>
          <ng-content />
        </div>
      </hlm-card>
    </main>
  `,
})
export class AuthCardComponent {
  title = input('');
  description = input('');
}
