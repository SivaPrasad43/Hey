import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggleComponent } from '../../shared/ui/theme-toggle.component';
import { LogoComponent } from '../../shared/ui/logo.component';

/** Dribbble-style auth layout: no box, big left-aligned heading, roomy form. */
@Component({
  selector: 'app-auth-card',
  imports: [RouterLink, ThemeToggleComponent, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-background flex min-h-svh flex-col">
      <header class="flex h-16 items-center justify-between px-6 sm:px-10">
        <a routerLink="/" aria-label="Hey home"><app-logo [size]="30" /></a>
        <app-theme-toggle />
      </header>
      <main class="flex flex-1 items-center justify-center px-6 pb-16">
        <section class="w-full max-w-[400px]">
          <app-logo [size]="52" [wordmark]="false" class="mb-6" />
          <h1 class="text-display">{{ title() }}</h1>
          <p class="text-muted-foreground mt-2 mb-8 text-[0.95rem]">{{ description() }}</p>
          <ng-content />
        </section>
      </main>
    </div>
  `,
})
export class AuthCardComponent {
  title = input('');
  description = input('');
}
