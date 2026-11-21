import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';
import { hapticsEnabled, hapticsSupported, setHapticsEnabled, vibrate } from '../../core/haptics';
import { EmotionFaceComponent } from '../../shared/ui/emotion-face.component';
import { AuthService, authErrorMessage } from '../../core/auth.service';
import { MOODS, MoodId, getMood } from '../../core/moods';
import { ThemeMode, ThemeService } from '../../core/theme.service';
import { ToastService } from '../../core/toast.service';
import { AVATAR_COLORS, UserService, colorFor } from '../../core/user.service';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { ChatStateService } from '../chat/chat-state.service';
import { PageHeaderComponent } from '../page-header.component';

@Component({
  selector: 'app-settings-page',
  imports: [
    ReactiveFormsModule,
    NgIcon,
    HlmButtonImports,
    HlmFieldImports,
    HlmInputImports,
    HlmLabelImports,
    HlmRadioGroupImports,
        HlmSpinnerImports,
    HlmSwitchImports,
    AvatarComponent,
    EmotionFaceComponent,
    PageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col' },
  template: `
    <app-page-header title="Settings" />
    <div class="flex-1 overflow-y-auto">
      <form class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6" [formGroup]="form" (ngSubmit)="save()" novalidate>
        <section class="bg-card ring-foreground/10 shadow-soft grid gap-6 rounded-2xl p-6 ring-1 md:grid-cols-[200px_1fr] md:p-8">
          <div>
            <h2 class="text-base font-bold tracking-tight">Profile</h2>
            <p class="text-muted-foreground mt-1 text-sm">How others see you.</p>
          </div>
          <hlm-field-group>
            <hlm-field>
              <label hlmFieldLabel class="font-semibold" for="displayName">Display name</label>
              <input
                hlmInput
                id="displayName"
                formControlName="displayName"
                maxlength="32"
                autocomplete="nickname"
                [attr.aria-invalid]="nameInvalid() || null"
                [attr.aria-describedby]="nameInvalid() ? 'name-error' : null"
              />
              @if (nameInvalid()) {
                <p id="name-error" class="text-destructive text-sm">Use 2 to 32 characters.</p>
              }
            </hlm-field>
            <hlm-field>
              <span hlmFieldLabel class="font-semibold" id="color-label">Avatar color</span>
              <div class="flex items-center gap-4">
                <app-avatar size="lg" [name]="form.controls.displayName.value || auth.displayName()" [color]="form.controls.avatarColor.value" />
                <div class="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="color-label">
                  @for (c of colors; track c) {
                    <button
                      type="button"
                      role="radio"
                      class="ring-offset-background focus-visible:ring-ring flex size-8 items-center justify-center rounded-full text-white ring-offset-2 outline-none focus-visible:ring-2 aria-checked:ring-2 aria-checked:ring-foreground"
                      [style.background]="c"
                      [attr.aria-checked]="form.controls.avatarColor.value === c"
                      [attr.aria-label]="'Color ' + c"
                      (click)="pickColor(c)"
                    >
                      @if (form.controls.avatarColor.value === c) {
                        <ng-icon name="lucideCheck" size="12" />
                      }
                    </button>
                  }
                </div>
              </div>
            </hlm-field>
            <hlm-field>
              <label hlmFieldLabel class="font-semibold" for="email">Email</label>
              <input hlmInput id="email" [value]="me()?.email ?? ''" disabled />
            </hlm-field>
          </hlm-field-group>
        </section>

        <section class="bg-card ring-foreground/10 shadow-soft grid gap-6 rounded-2xl p-6 ring-1 md:grid-cols-[200px_1fr] md:p-8">
          <div>
            <h2 class="text-base font-bold tracking-tight">Chat</h2>
            <p class="text-muted-foreground mt-1 text-sm">The feeling you start each session with.</p>
          </div>
          <hlm-field-group>
            <hlm-field>
              <span hlmFieldLabel class="font-semibold" id="mood-label">Default feeling</span>
              <hlm-radio-group formControlName="defaultMood" class="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-labelledby="mood-label">
                @for (m of moods; track m.id) {
                  <div class="flex items-center gap-2">
                    <hlm-radio [value]="m.id" [inputId]="'mood-' + m.id"><hlm-radio-indicator indicator /></hlm-radio>
                    <label hlmLabel [for]="'mood-' + m.id" class="flex items-center gap-2 font-normal">
                      <app-emotion-face [emotion]="m.id" [size]="18" [interactive]="true" />{{ m.label }}
                    </label>
                  </div>
                }
              </hlm-radio-group>
            </hlm-field>
          </hlm-field-group>
        </section>

        <div class="flex items-center justify-end gap-2">
          <button hlmBtn type="button" variant="ghost" [disabled]="!form.dirty || saving()" (click)="reset()">Discard</button>
          <button hlmBtn type="submit" [disabled]="!form.dirty || saving()">
            @if (saving()) {
              <hlm-spinner />
            }
            Save changes
          </button>
        </div>

        <section class="bg-card ring-foreground/10 shadow-soft grid gap-6 rounded-2xl p-6 ring-1 md:grid-cols-[200px_1fr] md:p-8">
          <div>
            <h2 class="text-base font-bold tracking-tight">Appearance</h2>
            <p class="text-muted-foreground mt-1 text-sm">Applies on this device.</p>
          </div>
          <div class="flex flex-col gap-4">
          <div class="bg-muted inline-flex w-fit rounded-full p-1" role="radiogroup" aria-label="Theme">
            @for (t of themes; track t.id) {
              <button
                type="button"
                role="radio"
                class="text-muted-foreground aria-checked:bg-background aria-checked:text-foreground aria-checked:shadow-soft inline-flex h-8 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition"
                [attr.aria-checked]="theme.mode() === t.id"
                (click)="theme.setMode(t.id)"
              >
                <ng-icon [name]="t.icon" size="14" />{{ t.label }}
              </button>
            }
          </div>
          @if (canVibrate) {
            <div class="flex items-center justify-between gap-4">
              <label for="haptics" class="text-sm">
                Haptic feedback
                <span class="text-muted-foreground block text-xs">Each feeling has its own vibration when you send or react.</span>
              </label>
              <hlm-switch inputId="haptics" [checked]="haptics()" (checkedChange)="setHaptics($event)" />
            </div>
          }
          </div>
        </section>

        <section class="bg-card ring-foreground/10 shadow-soft grid gap-6 rounded-2xl p-6 ring-1 md:grid-cols-[200px_1fr] md:p-8">
          <div>
            <h2 class="text-base font-bold tracking-tight">Account</h2>
            <p class="text-muted-foreground mt-1 text-sm">Password and session.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button hlmBtn type="button" variant="outline" (click)="resetPassword()">Send password reset email</button>
            <button hlmBtn type="button" variant="destructive" (click)="auth.logout()"><ng-icon name="lucideLogOut" /> Log out</button>
          </div>
        </section>
      </form>
    </div>
  `,
})
export class SettingsPage {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  private users = inject(UserService);
  private toast = inject(ToastService);
  private state = inject(ChatStateService);

  readonly colors = AVATAR_COLORS;
  readonly moods = MOODS;
  readonly themes: { id: ThemeMode; label: string; icon: string }[] = [
    { id: 'light', label: 'Light', icon: 'lucideSun' },
    { id: 'dark', label: 'Dark', icon: 'lucideMoon' },
    { id: 'system', label: 'System', icon: 'lucideMonitor' },
  ];

  readonly canVibrate = hapticsSupported();
  haptics = signal(hapticsEnabled());

  setHaptics(on: boolean): void {
    this.haptics.set(on);
    setHapticsEnabled(on);
    if (on) vibrate('happy');
  }

  private all = toSignal(this.users.all$, { initialValue: [] });
  me = computed(() => this.all().find((u) => u.uid === this.auth.uid()));

  form = inject(NonNullableFormBuilder).group({
    displayName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(32), Validators.pattern(/\S/)]],
    avatarColor: [''],
    defaultMood: ['happy' as MoodId],
  });
  saving = signal(false);
  private loaded = false;

  constructor() {
    // Fill the form once the profile arrives, without overwriting edits in progress.
    effect(() => {
      const me = this.me();
      if (!me || this.loaded) return;
      untracked(() => {
        this.loaded = true;
        this.reset();
      });
    });
  }

  nameInvalid(): boolean {
    const c = this.form.controls.displayName;
    return c.invalid && (c.touched || c.dirty);
  }

  pickColor(c: string): void {
    this.form.controls.avatarColor.setValue(c);
    this.form.controls.avatarColor.markAsDirty();
  }

  reset(): void {
    const me = this.me();
    const uid = this.auth.uid() ?? '';
    this.form.reset({
      displayName: me?.displayName ?? this.auth.displayName(),
      avatarColor: me?.avatarColor ?? colorFor(uid),
      defaultMood: getMood(me?.defaultMood).id,
    });
  }

  async save(): Promise<void> {
    const uid = this.auth.uid();
    if (!uid || this.form.invalid) {
      this.form.controls.displayName.markAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const changes: { displayName?: string; avatarColor?: string; defaultMood?: MoodId } = {};
    if (this.form.controls.displayName.dirty) changes.displayName = v.displayName.trim();
    if (this.form.controls.avatarColor.dirty) changes.avatarColor = v.avatarColor;
    if (this.form.controls.defaultMood.dirty) changes.defaultMood = v.defaultMood;
    this.saving.set(true);
    try {
      await this.users.updateSettings(uid, changes);
      if (changes.displayName) this.auth.setDisplayName(changes.displayName);
      if (changes.defaultMood) this.state.setMood(changes.defaultMood);
      this.form.markAsPristine();
      this.toast.success('Settings saved');
    } catch {
      this.toast.error('Couldn’t save settings. Try again.');
    } finally {
      this.saving.set(false);
    }
  }

  async resetPassword(): Promise<void> {
    const email = this.me()?.email;
    if (!email) return;
    try {
      await this.auth.resetPassword(email);
      this.toast.success(`Reset email sent to ${email}`);
    } catch (err) {
      this.toast.error(authErrorMessage(err));
    }
  }
}
