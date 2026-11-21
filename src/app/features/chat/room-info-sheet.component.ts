import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { AuthService } from '../../core/auth.service';
import { AppUser, Room } from '../../core/models';
import { MoodId, dominantMood, moodMix } from '../../core/moods';
import { otherMember, roomTitle } from '../../core/room.service';
import { shortAgo } from '../../core/time';
import { ToastService } from '../../core/toast.service';
import { UserService, isOnline } from '../../core/user.service';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { EmotionFaceComponent } from '../../shared/ui/emotion-face.component';
import { DisplayMessage } from './message-rows';
import { NewChatService } from './new-chat-dialog.component';

type Member = AppUser & { online?: boolean };

/** Slide-in panel with the room's people, feeling breakdown and actions. */
@Component({
  selector: 'app-room-info-sheet',
  imports: [NgIcon, HlmButtonImports, HlmSheetImports, HlmTooltipImports, AvatarComponent, EmotionFaceComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-sheet side="right">
      <button hlmBtn hlmSheetTrigger variant="ghost" size="icon-sm" aria-label="Conversation info" hlmTooltip="Info">
        <ng-icon name="lucideInfo" />
      </button>
      <hlm-sheet-content *hlmSheetPortal="let ctx" class="w-full gap-0 overflow-y-auto p-0 sm:max-w-sm">
        <!-- header -->
        <div class="flex flex-col items-center gap-3 border-b px-6 pt-10 pb-6 text-center">
          @if (room().type === 'dm') {
            <app-avatar size="lg" [name]="title()" [uid]="peer()?.uid ?? ''" [color]="peer()?.avatarColor" [online]="peerOnline()" />
          } @else {
            <span class="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full"><ng-icon name="lucideHash" size="22" /></span>
          }
          <div>
            <h2 hlmSheetTitle class="text-title">{{ title() }}</h2>
            <p hlmSheetDescription class="text-muted-foreground mt-1 text-sm">{{ subtitle() }}</p>
          </div>
          <div class="flex gap-2">
            <button hlmBtn variant="outline" size="sm" (click)="toggleFavorite()">
              <ng-icon [name]="isFavorite() ? 'lucideStarOff' : 'lucideStar'" />
              {{ isFavorite() ? 'Unfavorite' : 'Favorite' }}
            </button>
            <button hlmBtn variant="outline" size="sm" (click)="toggleArchive(); ctx.close()">
              <ng-icon [name]="isArchived() ? 'lucideArchiveRestore' : 'lucideArchive'" />
              {{ isArchived() ? 'Unarchive' : 'Archive' }}
            </button>
          </div>
        </div>

        <!-- feeling breakdown -->
        <section class="border-b px-6 py-5">
          <div class="mb-3 flex items-center gap-2">
            <h3 class="flex-1 text-sm font-bold">Room feeling</h3>
            @if (recent().length) {
              <app-emotion-face [emotion]="dominant()" [size]="20" [interactive]="true" />
            }
          </div>
          @if (recent().length) {
            <span class="bg-muted mb-4 flex h-2 w-full overflow-hidden rounded-full" aria-hidden="true">
              @for (s of mix(); track s.mood.id) {
                @if (s.count) {
                  <span class="h-full" [class]="s.mood.dot" [style.width.%]="s.percent"></span>
                }
              }
            </span>
            <ul class="flex flex-col gap-1">
              @for (s of mix(); track s.mood.id) {
                <li>
                  <button
                    type="button"
                    class="hover:bg-accent flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm font-medium disabled:opacity-50"
                    [class.bg-accent]="filter() === s.mood.id"
                    [disabled]="!s.count"
                    [attr.aria-pressed]="filter() === s.mood.id"
                    (click)="filterChange.emit(filter() === s.mood.id ? null : s.mood.id); ctx.close()"
                  >
                    <app-emotion-face [emotion]="s.mood.id" [size]="18" [interactive]="true" />
                    <span class="flex-1">{{ s.mood.label }}</span>
                    <span class="text-muted-foreground text-xs tabular-nums">{{ s.count }} · {{ s.percent }}%</span>
                  </button>
                </li>
              }
            </ul>
            <p class="text-muted-foreground mt-2 text-xs">Last {{ recent().length }} messages. Choose a feeling to show only those.</p>
          } @else {
            <p class="text-muted-foreground text-sm">No messages yet.</p>
          }
        </section>

        <!-- members -->
        <section class="px-6 py-5">
          <div class="mb-3 flex items-center">
            <h3 class="flex-1 text-sm font-bold">{{ room().type === 'dm' ? 'People' : 'Members · ' + members().length }}</h3>
            @if (room().type === 'group') {
              <button hlmBtn variant="ghost" size="xs" (click)="ctx.close(); newChat.open('add', room())">
                <ng-icon name="lucideUserPlus" /> Add people
              </button>
            }
          </div>
          <ul class="flex flex-col gap-1">
            @for (m of members(); track m.uid) {
              <li class="flex items-center gap-3 rounded-xl px-1 py-1.5">
                <app-avatar [name]="m.displayName" [uid]="m.uid" [color]="m.avatarColor" [online]="online(m)" />
                <span class="min-w-0 flex-1 leading-tight">
                  <span class="block truncate text-sm font-semibold">{{ m.displayName }}{{ m.uid === auth.uid() ? ' (you)' : '' }}</span>
                  <span class="text-muted-foreground block truncate text-xs">{{ presence(m) }}</span>
                </span>
              </li>
            }
          </ul>
        </section>
      </hlm-sheet-content>
    </hlm-sheet>
  `,
})
export class RoomInfoSheetComponent {
  room = input.required<Room>();
  users = input<ReadonlyMap<string, Member>>(new Map());
  messages = input<DisplayMessage[]>([]);
  filter = input<MoodId | null>(null);
  filterChange = output<MoodId | null>();

  auth = inject(AuthService);
  newChat = inject(NewChatService);
  private usersSvc = inject(UserService);
  private toast = inject(ToastService);

  title = computed(() => roomTitle(this.room(), this.auth.uid()));
  peer = computed(() => {
    const id = otherMember(this.room(), this.auth.uid());
    return id ? this.users().get(id) : undefined;
  });
  peerOnline = computed(() => isOnline(this.peer(), this.usersSvc.now()));
  members = computed<Member[]>(() =>
    (this.room().members ?? [])
      .map((uid) => this.users().get(uid) ?? ({ uid, displayName: this.room().memberNames?.[uid] || 'Unknown user', email: '', avatarColor: '' } as Member))
      .sort((a, b) => Number(b.uid === this.auth.uid()) - Number(a.uid === this.auth.uid()) || a.displayName.localeCompare(b.displayName)),
  );
  subtitle = computed(() => {
    const now = this.usersSvc.now();
    if (this.room().type === 'dm') return this.presence(this.peer());
    const online = this.members().filter((m) => isOnline(m, now)).length;
    return `${this.members().length} members · ${online} online`;
  });

  recent = computed(() => this.messages().filter((m) => m.type === 'text' && !m.deleted).slice(-30).map((m) => m.mood));
  mix = computed(() => moodMix(this.recent()));
  dominant = computed(() => dominantMood(this.recent()) ?? 'happy');

  private me = computed(() => this.users().get(this.auth.uid() ?? ''));
  isFavorite = computed(() => !!this.me()?.favorites?.includes(this.room().id));
  isArchived = computed(() => !!this.me()?.archived?.includes(this.room().id));

  online(m: Member | undefined): boolean {
    return isOnline(m, this.usersSvc.now());
  }

  presence(m: Member | undefined): string {
    if (!m) return '';
    if (this.online(m)) return 'Online';
    if (m.lastSeen) {
      const ago = shortAgo(m.lastSeen.toDate(), new Date(this.usersSvc.now()));
      return ago === 'now' ? 'Last seen just now' : `Last seen ${ago} ago`;
    }
    return 'Offline';
  }

  async toggleFavorite(): Promise<void> {
    const uid = this.auth.uid();
    if (!uid) return;
    await this.usersSvc.toggleFavorite(uid, this.room().id, !this.isFavorite()).catch(() => this.toast.error('Couldn’t update favorites.'));
  }

  async toggleArchive(): Promise<void> {
    const uid = this.auth.uid();
    if (!uid) return;
    const archiving = !this.isArchived();
    try {
      await this.usersSvc.setArchived(uid, this.room().id, archiving);
      this.toast.show(archiving ? `Archived “${this.title()}”` : `Moved “${this.title()}” to Chats`);
    } catch {
      this.toast.error('Couldn’t update the archive.');
    }
  }
}
