import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { colorFor } from '../../core/user.service';

/** Initials avatar on top of the shadcn Avatar, with an optional presence badge. */
@Component({
  selector: 'app-avatar',
  imports: [HlmAvatarImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
  template: `
    <hlm-avatar [size]="size()">
      <span hlmAvatarFallback class="text-[0.7rem] font-medium text-white" [style.background]="bg()">{{ initials() }}</span>
      @if (online() !== null) {
        <hlm-avatar-badge [class]="online() ? 'bg-emerald-500' : 'bg-muted-foreground/40'">
          <span class="sr-only">{{ online() ? 'Online' : 'Offline' }}</span>
        </hlm-avatar-badge>
      }
    </hlm-avatar>
  `,
})
export class AvatarComponent {
  name = input('');
  uid = input('');
  color = input<string | undefined>(undefined);
  size = input<'sm' | 'default' | 'lg'>('default');
  /** null hides the presence badge */
  online = input<boolean | null>(null);

  initials = computed(() => {
    const parts = this.name().trim().split(/\s+/).filter(Boolean);
    const s = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2);
    return s.toUpperCase();
  });
  bg = computed(() => this.color() ?? colorFor(this.uid() || this.name()));
}
