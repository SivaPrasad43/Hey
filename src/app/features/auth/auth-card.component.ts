import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggleComponent } from '../../shared/ui/theme-toggle.component';

/** Dribbble-style auth layout: no box, big left-aligned heading, roomy form. */
@Component({
  selector: 'app-auth-card',
  imports: [RouterLink, ThemeToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-background flex min-h-svh flex-col">
      <header class="flex h-16 items-center justify-between px-6 sm:px-10">
        <a routerLink="/" class="flex items-center gap-2 text-base font-bold tracking-tight">
          <span class="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full text-xs font-bold">H</span>
          Hey
        </a>
        <app-theme-toggle />
      </header>
      <main class="flex flex-1 items-center justify-center px-6 pb-16">
        <section class="w-full max-w-[400px]">
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
