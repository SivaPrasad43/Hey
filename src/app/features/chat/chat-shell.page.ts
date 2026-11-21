import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { ThemeMode, ThemeService } from '../../core/theme.service';
import { MoodDotComponent } from '../../shared/ui/mood-dot.component';
import { catchError, filter, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { Room } from '../../core/models';
import { RoomService, otherMember, roomTitle } from '../../core/room.service';
import { shortAgo } from '../../core/time';
import { ToastService } from '../../core/toast.service';
import { UserService, isOnline } from '../../core/user.service';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { ChatStateService } from './chat-state.service';
import { NewChatService } from './new-chat-dialog.component';
import { Section, filterRooms } from './room-sections';

const PAGE = 8;

interface RoomItem {
  room: Room;
  title: string;
  preview: string;
  mood: string | null;
  when: string;
  unread: boolean;
  favorite: boolean;
  archived: boolean;
  peerId: string | null;
  peerColor?: string;
  peerOnline: boolean | null;
}

@Component({
    selector: 'app-chat-shell-page',
    imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NgIcon,
    HlmButtonImports,
    HlmDropdownMenuImports,
    HlmInputGroupImports,
    HlmSkeletonImports,
    AvatarComponent,
    MoodDotComponent,
  ],
    changeDetection: ChangeDetectionStrategy.OnPush,
      template: `
    <div class="flex h-svh">
      <aside
        class="bg-sidebar text-sidebar-foreground border-sidebar-border flex w-full min-w-0 flex-col md:w-64 md:shrink-0 md:border-r"
        [class.max-md:hidden]="!atRoot()"
        aria-label="Chats"
      >
        <div class="flex h-14 shrink-0 items-center gap-2 px-4 pt-[env(safe-area-inset-top)]">
          <span class="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md text-xs font-semibold">H</span>
          <span class="text-sm font-semibold">Hey</span>
        </div>

        <div class="flex flex-col gap-2 px-3">
          <button hlmBtn variant="outline" size="sm" class="w-full justify-start" (click)="newChat.open('dm')">
            <ng-icon name="lucidePlus" />
            New chat
          </button>
          <hlm-input-group class="h-8">
            <hlm-input-group-addon><ng-icon name="lucideSearch" /></hlm-input-group-addon>
            <input hlmInputGroupInput placeholder="Search" aria-label="Search chats" autocomplete="off"
              [value]="filterText()" (input)="filterText.set($any($event.target).value)" />
          </hlm-input-group>
        </div>

        <nav class="mt-4 flex flex-col gap-0.5 px-3" aria-label="Sections">
          @for (s of sections; track s.id) {
            <button
              type="button"
              class="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex h-8 items-center gap-2 rounded-md px-2 text-sm transition-colors"
              [class]="section() === s.id ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : ''"
              [attr.aria-pressed]="section() === s.id"
              (click)="setSection(s.id)"
            >
              <ng-icon [name]="s.icon" class="text-muted-foreground" />
              <span class="flex-1 text-left">{{ s.label }}</span>
              @if (s.id === 'archive' && archiveUnread()) {
                <span class="bg-primary size-1.5 rounded-full" aria-label="Unread in archive"></span>
              }
              <span class="text-muted-foreground text-xs tabular-nums">{{ counts()[s.id] }}</span>
            </button>
          }
        </nav>

        <div class="mt-4 flex min-h-0 flex-1 flex-col">
          <p class="text-muted-foreground px-5 pb-1 text-xs font-medium">{{ sectionLabel() }}</p>
          <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            @if (!roomsLoaded()) {
              @for (i of [1, 2, 3, 4]; track i) {
                <div class="flex items-center gap-2 px-2 py-2" aria-hidden="true">
                  <hlm-skeleton class="size-6 rounded-full" />
                  <div class="flex-1 space-y-1.5"><hlm-skeleton class="h-3 w-24" /><hlm-skeleton class="h-3 w-36" /></div>
                </div>
              }
            } @else {
              <ul class="flex flex-col gap-0.5">
                @for (item of visibleItems(); track item.room.id) {
                  <li class="group/item relative">
                    <a
                      [routerLink]="['/chat', item.room.id]"
                      class="hover:bg-sidebar-accent flex items-start gap-2 rounded-md px-2 py-1.5 pr-8 transition-colors"
                      [class]="item.room.id === state.activeRoomId() ? 'bg-sidebar-accent' : ''"
                      [attr.aria-current]="item.room.id === state.activeRoomId() ? 'page' : null"
                    >
                      @if (item.room.type === 'dm') {
                        <app-avatar class="mt-0.5" size="sm" [name]="item.title" [uid]="item.peerId ?? ''" [color]="item.peerColor" [online]="item.peerOnline" />
                      } @else {
                        <span class="bg-muted text-muted-foreground mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md">
                          <ng-icon name="lucideHash" size="14" />
                        </span>
                      }
                      <span class="min-w-0 flex-1">
                        <span class="flex items-center gap-1.5">
                          <span class="truncate text-sm" [class.font-semibold]="item.unread">{{ item.title }}</span>
                          @if (item.favorite) {
                            <ng-icon name="lucideStar" size="12" class="text-muted-foreground shrink-0" aria-label="Favorite" />
                          }
                          <span class="text-muted-foreground ml-auto shrink-0 text-xs tabular-nums">{{ item.when }}</span>
                        </span>
                        <span class="flex items-center gap-1.5">
                          @if (item.mood) {
                            <app-mood-dot [value]="item.mood" />
                          }
                          <span class="truncate text-xs" [class]="item.unread ? 'text-foreground' : 'text-muted-foreground'">{{ item.preview }}</span>
                          @if (item.unread) {
                            <span class="bg-primary ml-auto size-1.5 shrink-0 rounded-full"></span>
                            <span class="sr-only">Unread</span>
                          }
                        </span>
                      </span>
                    </a>
                    <button
                      hlmBtn
                      variant="ghost"
                      size="icon-xs"
                      class="absolute top-1.5 right-1.5 opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100 [@media(hover:none)]:opacity-100"
                      [hlmDropdownMenuTrigger]="roomMenu"
                      [hlmDropdownMenuTriggerData]="{ $implicit: item }"
                      align="end"
                      [attr.aria-label]="'Options for ' + item.title"
                    >
                      <ng-icon name="lucideEllipsis" />
                    </button>
                  </li>
                } @empty {
                  <li class="text-muted-foreground px-2 py-6 text-sm">{{ emptyText() }}</li>
                }
              </ul>
              @if (items().length > visibleItems().length) {
                <button hlmBtn variant="ghost" size="sm" class="text-muted-foreground mt-1 w-full justify-start" (click)="limit.set(limit() + PAGE)">
                  Show more
                </button>
              }
            }
          </div>
        </div>

        <div class="border-sidebar-border flex flex-col gap-0.5 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <a routerLink="/chat/settings" routerLinkActive="bg-sidebar-accent font-medium" class="hover:bg-sidebar-accent flex h-8 items-center gap-2 rounded-md px-2 text-sm">
            <ng-icon name="lucideSettings" class="text-muted-foreground" /> Settings
          </a>
          <a routerLink="/chat/help" routerLinkActive="bg-sidebar-accent font-medium" class="hover:bg-sidebar-accent flex h-8 items-center gap-2 rounded-md px-2 text-sm">
            <ng-icon name="lucideCircleHelp" class="text-muted-foreground" /> Help
          </a>
          <button
            type="button"
            class="hover:bg-sidebar-accent aria-expanded:bg-sidebar-accent mt-1 flex items-center gap-2 rounded-md p-2 text-left"
            [hlmDropdownMenuTrigger]="userMenu"
            side="top"
            align="start"
            aria-label="Account menu"
          >
            <app-avatar [name]="auth.displayName()" [uid]="auth.uid() ?? ''" [color]="me()?.avatarColor" />
            <span class="min-w-0 flex-1 leading-tight">
              <span class="block truncate text-sm font-medium">{{ auth.displayName() }}</span>
              <span class="text-muted-foreground block truncate text-xs">{{ me()?.email }}</span>
            </span>
            <ng-icon name="lucideChevronsUpDown" class="text-muted-foreground" />
          </button>
        </div>
      </aside>

      <main class="bg-background min-w-0 flex-1 flex-col" [class]="atRoot() ? 'hidden md:flex' : 'flex'">
        <router-outlet />
      </main>
    </div>

    <ng-template #roomMenu let-item>
      <hlm-dropdown-menu class="w-44">
        <button hlmDropdownMenuItem (triggered)="toggleFavorite(item)">
          <ng-icon [name]="item.favorite ? 'lucideStarOff' : 'lucideStar'" />
          {{ item.favorite ? 'Remove favorite' : 'Add to favorites' }}
        </button>
        <button hlmDropdownMenuItem (triggered)="toggleArchive(item)">
          <ng-icon [name]="item.archived ? 'lucideArchiveRestore' : 'lucideArchive'" />
          {{ item.archived ? 'Unarchive' : 'Archive' }}
        </button>
      </hlm-dropdown-menu>
    </ng-template>

    <ng-template #userMenu>
      <hlm-dropdown-menu class="w-56">
        <hlm-dropdown-menu-label>
          <span class="block truncate">{{ auth.displayName() }}</span>
          <span class="text-muted-foreground block truncate text-xs font-normal">{{ me()?.email }}</span>
        </hlm-dropdown-menu-label>
        <hlm-dropdown-menu-separator />
        <a hlmDropdownMenuItem routerLink="/chat/settings"><ng-icon name="lucideSettings" /> Settings</a>
        <a hlmDropdownMenuItem routerLink="/chat/help"><ng-icon name="lucideCircleHelp" /> Help</a>
        <hlm-dropdown-menu-separator />
        <hlm-dropdown-menu-label class="text-muted-foreground text-xs font-normal">Theme</hlm-dropdown-menu-label>
        @for (t of themes; track t.id) {
          <button hlmDropdownMenuRadio keepOpen="false" [checked]="theme.mode() === t.id" (triggered)="theme.setMode(t.id)">
            <hlm-dropdown-menu-radio-indicator />
            {{ t.label }}
          </button>
        }
        <hlm-dropdown-menu-separator />
        <button hlmDropdownMenuItem variant="destructive" (triggered)="logout()"><ng-icon name="lucideLogOut" /> Log out</button>
      </hlm-dropdown-menu>
    </ng-template>
  `,
})
export class ChatShellPage {
  readonly PAGE = PAGE;
  readonly sections: { id: Section; label: string; icon: string }[] = [
    { id: 'chats', label: 'Chats', icon: 'lucideMessageSquare' },
    { id: 'favorites', label: 'Favorites', icon: 'lucideStar' },
    { id: 'archive', label: 'Archive', icon: 'lucideArchive' },
  ];
  readonly themes: { id: ThemeMode; label: string }[] = [
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
    { id: 'system', label: 'System' },
  ];

  auth = inject(AuthService);
  state = inject(ChatStateService);
  private roomsSvc = inject(RoomService);
  private usersSvc = inject(UserService);
  private toast = inject(ToastService);
  private router = inject(Router);

  theme = inject(ThemeService);
  newChat = inject(NewChatService);

  filterText = signal('');
  section = signal<Section>('chats');
  limit = signal(PAGE);

  /** True on /chat itself: on mobile the list shows, otherwise the routed pane does. */
  atRoot = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url.split('?')[0] === '/chat'),
    ),
    { initialValue: this.router.url.split('?')[0] === '/chat' },
  );

  private rooms = toSignal(
    toObservable(this.auth.uid).pipe(
      filter((uid): uid is string => !!uid),
      switchMap((uid) => this.roomsSvc.myRooms$(uid).pipe(catchError(() => of([] as Room[])))),
    ),
  );
  roomsLoaded = computed(() => this.rooms() !== undefined);
  private users = toSignal(this.usersSvc.all$, { initialValue: [] });
  me = computed(() => this.users().find((u) => u.uid === this.auth.uid()));

  private allItems = computed<RoomItem[]>(() => {
    const uid = this.auth.uid();
    const usersById = new Map(this.users().map((u) => [u.uid, u]));
    const me = this.me();
    const lastRead = me?.lastRead ?? {};
    const fav = new Set(me?.favorites ?? []);
    const arch = new Set(me?.archived ?? []);
    const now = this.usersSvc.now();
    const active = this.state.activeRoomId();
    return (this.rooms() ?? []).map((room) => {
      const last = room.lastMessage;
      const peerId = otherMember(room, uid);
      const peer = peerId ? usersById.get(peerId) : undefined;
      const read = lastRead[room.id]?.toMillis() ?? 0;
      const updated = room.updatedAt?.toMillis() ?? 0;
      return {
        room,
        title: roomTitle(room, uid),
        preview: previewText(room, uid),
        mood: last && !last.deleted ? last.mood : null,
        when: room.updatedAt ? shortAgo(room.updatedAt.toDate(), new Date(now)) : '',
        unread: !!last && last.senderId !== uid && room.id !== active && updated > read,
        favorite: fav.has(room.id),
        archived: arch.has(room.id),
        peerId,
        peerColor: peer?.avatarColor,
        peerOnline: peerId ? isOnline(peer, now) : null,
      };
    });
  });

  counts = computed(() => {
    const me = this.me();
    const all = this.allItems().map((i) => i.room);
    return {
      chats: filterRooms(all, 'chats', me?.favorites, me?.archived).length,
      favorites: filterRooms(all, 'favorites', me?.favorites, me?.archived).length,
      archive: filterRooms(all, 'archive', me?.favorites, me?.archived).length,
    } satisfies Record<Section, number>;
  });
  archiveUnread = computed(() => this.allItems().some((i) => i.archived && i.unread));

  items = computed(() => {
    const me = this.me();
    const q = this.filterText().trim().toLowerCase();
    const inSection = new Set(
      filterRooms(this.allItems().map((i) => i.room), this.section(), me?.favorites, me?.archived).map((r) => r.id),
    );
    return this.allItems().filter((i) => inSection.has(i.room.id) && (!q || i.title.toLowerCase().includes(q)));
  });
  visibleItems = computed(() => this.items().slice(0, this.limit()));
  emptyText = computed(() => {
    if (this.filterText()) return 'No chats match your search.';
    return { chats: 'No conversations yet.', favorites: 'No favorites yet.', archive: 'No archived chats.' }[this.section()];
  });
  sectionLabel = computed(() => ({ chats: 'Conversations', favorites: 'Favorites', archive: 'Archived' })[this.section()]);

  constructor() {
    effect(() => this.state.applyDefault(this.me()?.defaultMood), { allowSignalWrites: true });
  }

  setSection(s: Section): void {
    this.section.set(s);
    this.limit.set(PAGE);
  }

  async toggleFavorite(item: RoomItem): Promise<void> {
    const uid = this.auth.uid();
    if (!uid) return;
    await this.usersSvc.toggleFavorite(uid, item.room.id, !item.favorite).catch(() => this.toast.error('Couldn’t update favorites.'));
  }

  async toggleArchive(item: RoomItem): Promise<void> {
    const uid = this.auth.uid();
    if (!uid) return;
    try {
      await this.usersSvc.setArchived(uid, item.room.id, !item.archived);
      this.toast.show(item.archived ? `Moved “${item.title}” to Chats` : `Archived “${item.title}”`);
    } catch {
      this.toast.error('Couldn’t update the archive.');
    }
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }
}

function previewText(room: Room, uid: string | null): string {
  const last = room.lastMessage;
  if (!last) return 'No messages yet';
  const who = last.senderId === uid ? 'You: ' : room.type === 'dm' ? '' : `${last.senderName}: `;
  return who + (last.deleted ? 'Message deleted' : last.text);
}
