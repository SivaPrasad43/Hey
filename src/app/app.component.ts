import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { ThemeService } from './core/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HlmToasterImports],
  template: `<router-outlet /><hlm-toaster position="bottom-right" [theme]="theme.dark() ? 'dark' : 'light'" />`,
})
export class AppComponent {
  theme = inject(ThemeService);
}
