import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';

@Component({
  selector: 'app-password-field',
  imports: [ReactiveFormsModule, NgIcon, HlmInputGroupImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-input-group>
      <input
        hlmInputGroupInput
        [id]="inputId()"
        [type]="visible() ? 'text' : 'password'"
        [formControl]="control()"
        [attr.autocomplete]="autocomplete()"
        [attr.aria-invalid]="invalid() || null"
        [attr.aria-describedby]="describedBy() || null"
      />
      <hlm-input-group-addon align="inline-end">
        <button
          hlmInputGroupButton
          size="icon-xs"
          type="button"
          (click)="visible.set(!visible())"
          [attr.aria-label]="visible() ? 'Hide password' : 'Show password'"
          [attr.aria-pressed]="visible()"
        >
          <ng-icon [name]="visible() ? 'lucideEyeOff' : 'lucideEye'" />
        </button>
      </hlm-input-group-addon>
    </hlm-input-group>
  `,
})
export class PasswordFieldComponent {
  control = input.required<FormControl<string>>();
  inputId = input('password');
  autocomplete = input('current-password');
  invalid = input(false);
  describedBy = input('');
  visible = signal(false);
}
