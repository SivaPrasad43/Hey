import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { AuthService, authErrorMessage } from '../../core/auth.service';
import { AuthCardComponent } from './auth-card.component';
import { PasswordFieldComponent } from './password-field.component';

type Field = 'name' | 'email' | 'password';

@Component({
  selector: 'app-register-page',
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
    <app-auth-card heading="Create your account" description="Pick a name, then start sharing how you feel.">
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <hlm-field-group>
          @if (error()) {
            <p class="bg-destructive/10 text-destructive rounded-xl px-4 py-3 text-sm font-medium" role="alert">
              {{ error() }}
            </p>
          }
          <hlm-field>
            <label hlmFieldLabel class="font-semibold" for="name">Display name</label>
            <input
              hlmInput
              id="name"
              formControlName="name"
              autocomplete="nickname"
              maxlength="32"
              [attr.aria-invalid]="showError('name') || null"
              [attr.aria-describedby]="showError('name') ? 'name-error' : null"
            />
            @if (showError('name')) {
              <p id="name-error" class="text-destructive text-sm">Use 2 to 32 characters.</p>
            }
          </hlm-field>
          <hlm-field>
            <label hlmFieldLabel class="font-semibold" for="email">Email</label>
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
            <label hlmFieldLabel class="font-semibold" for="password">Password</label>
            <app-password-field
              [control]="form.controls.password"
              autocomplete="new-password"
              [invalid]="showError('password')"
              describedBy="password-hint"
            />
            <p id="password-hint" class="text-sm" [class]="showError('password') ? 'text-destructive' : 'text-muted-foreground'">
              At least 6 characters.
            </p>
          </hlm-field>
          <hlm-field>
            <button hlmBtn size="lg" type="submit" class="mt-2 w-full" [disabled]="busy()">
              @if (busy()) {
                <hlm-spinner />
              }
              Create account
            </button>
            <p class="text-muted-foreground mt-2 text-center text-sm">
              Already have an account?
              <a routerLink="/login" class="text-foreground font-semibold underline underline-offset-4">Sign in</a>
            </p>
          </hlm-field>
        </hlm-field-group>
      </form>
    </app-auth-card>
  `,
})
export class RegisterPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(32), Validators.pattern(/\S/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });
  busy = signal(false);
  error = signal<string | null>(null);
  private submitted = signal(false);

  showError(name: Field): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  async submit(): Promise<void> {
    this.submitted.set(true);
    this.error.set(null);
    if (this.form.invalid) return;
    this.busy.set(true);
    try {
      const { name, email, password } = this.form.getRawValue();
      await this.auth.register(email.trim(), password, name.trim());
      await this.router.navigate(['/chat']);
    } catch (err) {
      this.error.set(authErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
