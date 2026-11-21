import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '../../shared/ui/logo.component';
import { ThemeToggleComponent } from '../../shared/ui/theme-toggle.component';
import { AuthFeelingLoopComponent } from './auth-feeling-loop.component';
import { AuthShowcaseComponent } from './auth-showcase.component';

/**
 * Sign-in / sign-up frame: the form on the left, a live preview of
 * feeling-carrying messages on the right (large screens only).
 */
@Component({
  selector: 'app-auth-card',
  imports: [RouterLink, ThemeToggleComponent, LogoComponent, AuthFeelingLoopComponent, AuthShowcaseComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-background grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <!-- form column -->
      <div class="flex min-h-svh flex-col">
        <header class="flex h-16 items-center justify-between px-5 sm:px-10">
          <a routerLink="/" aria-label="Hey home"><app-logo [size]="30" /></a>
          <app-theme-toggle class="lg:hidden" />
        </header>
        <main class="flex flex-1 justify-center px-5 pt-2 pb-10 sm:px-10 lg:items-center lg:pt-0 lg:pb-16">
          <section class="w-full max-w-[400px]">
            <!-- phones/tablets: same words, four feelings -->
            <app-auth-feeling-loop class="mb-8 lg:hidden" />
            <h1 class="text-display">{{ heading() }}</h1>
            <p class="text-muted-foreground mt-2 mb-7 text-[0.95rem] lg:mb-8">{{ description() }}</p>
            <ng-content />
          </section>
        </main>
        <footer class="text-muted-foreground hidden px-10 pb-6 text-xs lg:block">
          Messages carry a feeling: calm, happy, lovely, angry or sad.
        </footer>
      </div>

      <!-- showcase column -->
      <aside class="auth-showcase-panel relative hidden overflow-hidden border-l lg:flex lg:flex-col">
        <div class="flex h-16 items-center justify-end px-10">
          <app-theme-toggle />
        </div>
        <div class="flex flex-1 flex-col items-center justify-center gap-10 px-10 pb-16">
          <app-auth-showcase class="w-full" />
          <div class="max-w-[380px] text-center">
            <p class="text-title">Say how you feel, not just what you mean.</p>
            <p class="text-muted-foreground mt-2 text-sm">
              Pick a feeling before you send. It colours the bubble, moves with the message and shows up in every reaction.
            </p>
          </div>
        </div>
      </aside>
    </div>
  `,
})
export class AuthCardComponent {
  /** Page heading. Not `title`: that would also become a native tooltip on the host element. */
  heading = input('');
  description = input('');
}
