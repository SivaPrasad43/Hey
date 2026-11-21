import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { AuthService, authErrorMessage } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { AuthCardComponent } from './auth-card.component';
import { PasswordFieldComponent } from './password-field.component';

@Component({
  selector: 'app-login-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AuthCardComponent,
    PasswordFieldComponent,
    HlmButtonImports,
    HlmFieldImports,
    HlmInputImports,
    HlmSpinnerImports,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-card title="Sign in" description="Enter your email and password to continue.">
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <hlm-field-group>
          @if (error()) {
            <p class="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm" role="alert">
              {{ error() }}
            </p>
          }
          <hlm-field>
            <label hlmFieldLabel for="email">Email</label>
            <input
              hlmInput
              id="email"
              type="email"
              formControlName="email"
              autocomplete="email"
              placeholder="name@example.com"
              [attr.aria-invalid]="showError('email') || null"
              [attr.aria-describedby]="showError('email') ? 'email-error' : null"
            />
            @if (showError('email')) {
              <p id="email-error" class="text-destructive text-sm">Enter a valid email address.</p>
            }
          </hlm-field>
          <hlm-field>
            <div class="flex items-center">
              <label hlmFieldLabel for="password">Password</label>
              <button type="button" class="text-muted-foreground hover:text-foreground ml-auto text-sm underline-offset-4 hover:underline" (click)="forgot()">
                Forgot password?
              </button>
            </div>
            <app-password-field
              [control]="form.controls.password"
              [invalid]="showError('password')"
              [describedBy]="showError('password') ? 'password-error' : ''"
            />
            @if (showError('password')) {
              <p id="password-error" class="text-destructive text-sm">Enter your password.</p>
            }
          </hlm-field>
          <hlm-field>
            <button hlmBtn type="submit" class="w-full" [disabled]="busy()">
              @if (busy()) {
                <hlm-spinner />
              }
              Sign in
            </button>
            <p class="text-muted-foreground text-center text-sm">
              Don’t have an account?
              <a routerLink="/register" class="text-foreground underline underline-offset-4">Sign up</a>
            </p>
          </hlm-field>
        </hlm-field-group>
      </form>
    </app-auth-card>
  `,
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  busy = signal(false);
  error = signal<string | null>(null);
  private submitted = signal(false);

  showError(name: 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  async submit(): Promise<void> {
    this.submitted.set(true);
    this.error.set(null);
    if (this.form.invalid) return;
    this.busy.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email.trim(), password);
      await this.router.navigate(['/chat']);
    } catch (err) {
      this.error.set(authErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async forgot(): Promise<void> {
    const email = this.form.controls.email;
    if (email.invalid) {
      email.markAsTouched();
      this.toast.error('Enter your email first.');
      return;
    }
    try {
      await this.auth.resetPassword(email.value.trim());
      this.toast.success(`If an account exists for ${email.value.trim()}, we sent a reset link.`);
    } catch (err) {
      this.toast.error(authErrorMessage(err));
    }
  }
}
