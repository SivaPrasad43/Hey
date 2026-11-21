import { ChangeDetectionStrategy, Component, Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports, HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { AuthService } from '../../core/auth.service';
import { Room } from '../../core/models';
import { RoomService } from '../../core/room.service';
import { ToastService } from '../../core/toast.service';
import { UserService, isOnline } from '../../core/user.service';
import { AvatarComponent } from '../../shared/ui/avatar.component';

type Mode = 'dm' | 'group' | 'add';
interface Context {
  mode: Mode;
  room: Room | null;
}

/** Opens the new-chat / add-people dialog from anywhere. */
@Injectable({ providedIn: 'root' })
export class NewChatService {
  private dialog = inject(HlmDialogService);

  open(mode: Mode = 'dm', room: Room | null = null): void {
    this.dialog.open(NewChatDialogComponent, { context: { mode, room } satisfies Context, contentClass: 'sm:max-w-md' });
  }
}

@Component({
  selector: 'app-new-chat-dialog',
  imports: [
    NgIcon,
    HlmButtonImports,
    HlmDialogImports,
    HlmFieldImports,
    HlmInputImports,
    HlmInputGroupImports,
    HlmSpinnerImports,
    HlmTabsImports,
    AvatarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4' },
  template: `
    <hlm-dialog-header>
      <h2 hlmDialogTitle>{{ mode() === 'add' ? 'Add people' : 'New chat' }}</h2>
      <p hlmDialogDescription>
        {{ mode() === 'add' ? 'Choose people to add to ' + (ctx.room?.name ?? 'this group') + '.' : mode() === 'dm' ? 'Start a direct conversation.' : 'Create a group and choose who to invite.' }}
      </p>
    </hlm-dialog-header>

    @if (mode() !== 'add') {
      <hlm-tabs [tab]="mode()" (tabActivated)="mode.set($any($event))">
        <hlm-tabs-list class="w-full" aria-label="Chat type">
          <button hlmTabsTrigger="dm" class="flex-1">Direct message</button>
          <button hlmTabsTrigger="group" class="flex-1">Group</button>
        </hlm-tabs-list>
      </hlm-tabs>
    }

    @if (mode() === 'group') {
      <hlm-field>
        <label hlmFieldLabel for="group-name">Group name</label>
        <input hlmInput id="group-name" maxlength="40" placeholder="e.g. Design team" [value]="groupName()" (input)="groupName.set($any($event.target).value)" />
      </hlm-field>
    }

    <hlm-input-group>
      <hlm-input-group-addon><ng-icon name="lucideSearch" /></hlm-input-group-addon>
      <input hlmInputGroupInput placeholder="Search people" aria-label="Search people" autocomplete="off" [value]="query()" (input)="query.set($any($event.target).value)" />
    </hlm-input-group>

    <ul class="-mx-2 max-h-72 min-h-24 overflow-y-auto" [attr.aria-label]="mode() === 'dm' ? 'People' : 'Select people'">
      @for (u of candidates(); track u.uid) {
        <li>
          <button
            type="button"
            class="hover:bg-accent flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors disabled:opacity-50"
            [attr.aria-pressed]="mode() === 'dm' ? null : selected().has(u.uid)"
            (click)="mode() === 'dm' ? startDm(u.uid, u.displayName) : toggle(u.uid)"
            [disabled]="busy()"
          >
            <app-avatar [name]="u.displayName" [uid]="u.uid" [color]="u.avatarColor" [online]="online(u)" />
            <span class="min-w-0 flex-1 leading-tight">
              <span class="block truncate text-sm font-medium">{{ u.displayName }}</span>
              <span class="text-muted-foreground block truncate text-xs">{{ u.email }}</span>
            </span>
            @if (mode() !== 'dm') {
              <span
                class="flex size-4 items-center justify-center rounded-[4px] border shadow-xs"
                [class]="selected().has(u.uid) ? 'bg-primary border-primary text-primary-foreground' : 'border-input'"
              >
                @if (selected().has(u.uid)) {
                  <ng-icon name="lucideCheck" size="12" />
                }
              </span>
            }
          </button>
        </li>
      } @empty {
        <li class="text-muted-foreground px-2 py-6 text-center text-sm">
          {{ query() ? 'No people match “' + query() + '”.' : 'No one else has joined yet.' }}
        </li>
      }
    </ul>

    @if (mode() !== 'dm') {
      <hlm-dialog-footer>
        <button hlmBtn variant="outline" (click)="ref.close()">Cancel</button>
        <button hlmBtn [disabled]="!canSubmit() || busy()" (click)="submit()">
          @if (busy()) {
            <hlm-spinner />
          }
          {{ mode() === 'add' ? 'Add ' + selected().size + (selected().size === 1 ? ' person' : ' people') : 'Create group' }}
        </button>
      </hlm-dialog-footer>
    }
  `,
})
export class NewChatDialogComponent {
  protected ref = inject(BrnDialogRef);
  protected ctx = injectBrnDialogContext<Context>();

  private auth = inject(AuthService);
  private rooms = inject(RoomService);
  private usersSvc = inject(UserService);
  private toast = inject(ToastService);
  private router = inject(Router);

  mode = signal<Mode>(this.ctx.mode ?? 'dm');
  query = signal('');
  groupName = signal('');
  selected = signal(new Set<string>());
  busy = signal(false);

  private users = toSignal(this.usersSvc.all$, { initialValue: [] });

  candidates = computed(() => {
    const me = this.auth.uid();
    const q = this.query().trim().toLowerCase();
    const exclude = new Set(this.mode() === 'add' ? (this.ctx.room?.members ?? []) : []);
    return this.users().filter(
      (u) =>
        u.uid !== me &&
        !exclude.has(u.uid) &&
        (!q || u.displayName.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)),
    );
  });

  canSubmit = computed(() =>
    this.mode() === 'group' ? this.groupName().trim().length > 0 && this.selected().size > 0 : this.selected().size > 0,
  );

  online(u: Parameters<typeof isOnline>[0]): boolean {
    return isOnline(u, this.usersSvc.now());
  }

  toggle(uid: string): void {
    this.selected.update((s) => {
      const next = new Set(s);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  private me() {
    return { uid: this.auth.uid()!, name: this.auth.displayName() };
  }

  private picked() {
    const byId = new Map(this.users().map((u) => [u.uid, u.displayName]));
    return [...this.selected()].map((uid) => ({ uid, name: byId.get(uid) ?? 'Unknown' }));
  }

  async startDm(uid: string, name: string): Promise<void> {
    this.busy.set(true);
    try {
      const id = await this.rooms.getOrCreateDm(this.me(), { uid, name });
      this.ref.close();
      await this.router.navigate(['/chat', id]);
    } catch {
      this.toast.error('Couldn’t start the conversation.');
      this.busy.set(false);
    }
  }

  async submit(): Promise<void> {
    this.busy.set(true);
    try {
      if (this.mode() === 'add') {
        const room = this.ctx.room;
        if (!room) return;
        await this.rooms.addMembers(room.id, this.me(), this.picked());
        this.toast.success(this.selected().size === 1 ? 'Added 1 person' : `Added ${this.selected().size} people`);
        this.ref.close();
      } else {
        const id = await this.rooms.createGroup(this.groupName(), this.me(), this.picked());
        this.ref.close();
        await this.router.navigate(['/chat', id]);
      }
    } catch {
      this.toast.error('Something went wrong. Try again.');
      this.busy.set(false);
    }
  }
}
