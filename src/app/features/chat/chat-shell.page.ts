import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { ThemeMode, ThemeService } from '../../core/theme.service';
import { EmotionFaceComponent } from '../../shared/ui/emotion-face.component';
import { LogoComponent } from '../../shared/ui/logo.component';
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
    NgIcon,
    HlmButtonImports,
    HlmDropdownMenuImports,
    HlmInputGroupImports,
    HlmSkeletonImports,
    HlmTooltipImports,
    AvatarComponent,
    EmotionFaceComponent,
    LogoComponent,
  ],
    changeDetection: ChangeDetectionStrategy.OnPush,
      template: `
    <div class="flex h-dvh">
      <aside
        class="bg-sidebar text-sidebar-foreground border-sidebar-border flex w-full min-w-0 flex-col md:w-72 md:shrink-0 md:border-r"
        [class.max-md:hidden]="!atRoot()"
        aria-label="Chats"
      >
        <div class="flex h-16 shrink-0 items-center gap-2 px-5 pt-[env(safe-area-inset-top)] max-md:h-14 max-md:px-4">
          <app-logo [size]="28" />
          <!-- phone: account menu lives in the app bar -->
          <button
            type="button"
            class="ml-auto rounded-full md:hidden"
            [hlmDropdownMenuTrigger]="userMenu"
            align="end"
            aria-label="Account menu"
          >
            <app-avatar [name]="auth.displayName()" [uid]="auth.uid() ?? ''" [color]="me()?.avatarColor" />
          </button>
        </div>
        <!-- phone: large title like common chat apps -->
        <h1 class="text-display px-4 pb-3 md:hidden">{{ mobileTitle() }}</h1>

        <div class="flex flex-col gap-3 px-4">
          <button hlmBtn class="w-full max-md:hidden" (click)="newChat.open('dm')">
            <ng-icon name="lucidePlus" />
            New chat
          </button>
          <hlm-input-group class="rounded-full">
            <hlm-input-group-addon><ng-icon name="lucideSearch" /></hlm-input-group-addon>
            <input hlmInputGroupInput placeholder="Search" aria-label="Search chats" autocomplete="off"
              [value]="filterText()" (input)="filterText.set($any($event.target).value)" />
          </hlm-input-group>
        </div>

        <!-- desktop: section filters as a row of pill tabs -->
        <nav class="mt-4 px-4 max-md:hidden" aria-label="Sections">
          <div class="bg-muted flex gap-1 rounded-full p-1" role="tablist">
            @for (s of sections; track s.id) {
              <button
                type="button"
                role="tab"
                class="relative flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-[background-color,color,box-shadow,flex-grow] duration-200"
                [class]="section() === s.id ? 'bg-background text-foreground shadow-soft grow-[2]' : 'text-muted-foreground hover:text-foreground grow'"
                [attr.aria-selected]="section() === s.id"
                [attr.aria-label]="s.label + ', ' + counts()[s.id]"
                [hlmTooltip]="section() === s.id ? '' : s.label"
                (click)="setSection(s.id)"
              >
                <ng-icon [name]="s.icon" size="15" />
                @if (section() === s.id) {
                  <span class="truncate">{{ s.label }}</span>
                }
                @if (counts()[s.id]) {
                  <span class="tabular-nums opacity-60">{{ counts()[s.id] }}</span>
                }
                @if (s.id === 'archive' && archiveUnread()) {
                  <span class="bg-primary ring-background absolute top-1 right-1.5 size-1.5 rounded-full ring-2" aria-label="Unread in archive"></span>
                }
              </button>
            }
          </div>
        </nav>

        <div class="mt-4 flex min-h-0 flex-1 flex-col max-md:mt-2">
          <p class="text-muted-foreground px-8 pb-2 text-xs font-semibold tracking-wide uppercase max-md:hidden">{{ sectionLabel() }}</p>
          <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-3 max-md:px-2 max-md:pb-40">
            @if (!roomsLoaded()) {
              @for (i of [1, 2, 3, 4]; track i) {
                <div class="flex items-center gap-2 px-2 py-2" aria-hidden="true">
                  <hlm-skeleton class="size-6 rounded-full" />
                  <div class="flex-1 space-y-1.5"><hlm-skeleton class="h-3 w-24" /><hlm-skeleton class="h-3 w-36" /></div>
                </div>
              }
            } @else {
              <ul class="flex flex-col gap-1">
                @for (item of visibleItems(); track item.room.id) {
                  <li class="group/item relative">
                    <a
                      [routerLink]="['/chat', item.room.id]"
                      class="hover:bg-sidebar-accent active:bg-sidebar-accent flex items-start gap-3 rounded-xl px-3 py-2.5 pr-9 transition-colors max-md:py-3.5"
                      [class]="item.room.id === state.activeRoomId() ? 'bg-sidebar-accent' : ''"
                      [attr.aria-current]="item.room.id === state.activeRoomId() ? 'page' : null"
                    >
                      @if (item.room.type === 'dm') {
                        <app-avatar class="mt-0.5" size="sm" [name]="item.title" [uid]="item.peerId ?? ''" [color]="item.peerColor" [online]="item.peerOnline" />
                      } @else {
                        <span class="bg-muted text-muted-foreground mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full">
                          <ng-icon name="lucideHash" size="14" />
                        </span>
                      }
                      <span class="min-w-0 flex-1">
                        <span class="flex items-center gap-1.5">
                          <span class="truncate text-sm max-md:text-[0.95rem]" [class.font-semibold]="item.unread">{{ item.title }}</span>
                          @if (item.favorite) {
                            <ng-icon name="lucideStar" size="12" class="text-muted-foreground shrink-0" aria-label="Favorite" />
                          }
                          <span class="text-muted-foreground ml-auto shrink-0 text-xs tabular-nums">{{ item.when }}</span>
                        </span>
                        <span class="flex items-center gap-1.5">
                          @if (item.mood) {
                            <app-emotion-face [emotion]="item.mood" [size]="13" />
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
                      class="absolute top-2.5 right-2 opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100 [@media(hover:none)]:opacity-100"
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
                <button hlmBtn variant="ghost" size="sm" class="text-muted-foreground mt-2 w-full" (click)="limit.set(limit() + PAGE)">
                  Show more
                </button>
              }
            }
          </div>
        </div>

        <div class="border-sidebar-border flex flex-col gap-1 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] max-md:hidden">
          <button
            type="button"
            class="hover:bg-sidebar-accent aria-expanded:bg-sidebar-accent flex items-center gap-3 rounded-full p-1.5 pr-3 text-left"
            [hlmDropdownMenuTrigger]="userMenu"
            side="top"
            align="start"
            aria-label="Account menu"
          >
            <app-avatar [name]="auth.displayName()" [uid]="auth.uid() ?? ''" [color]="me()?.avatarColor" />
            <span class="min-w-0 flex-1 leading-tight">
              <span class="block truncate text-sm font-semibold">{{ auth.displayName() }}</span>
              <span class="text-muted-foreground block truncate text-xs">{{ me()?.email }}</span>
            </span>
            <ng-icon name="lucideChevronsUpDown" class="text-muted-foreground" />
          </button>
        </div>
      </aside>

      <main class="bg-background min-w-0 flex-1 flex-col" [class]="(atRoot() ? 'hidden md:flex' : 'flex') + (showTabBar() ? ' max-md:pb-[calc(4rem+env(safe-area-inset-bottom))]' : '')">
        <router-outlet />
      </main>
    </div>

    <!-- phone: floating new-chat button -->
    @if (atRoot()) {
      <button
        hlmBtn
        size="icon-lg"
        class="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 size-14 rounded-2xl shadow-pop md:hidden"
        aria-label="New chat"
        (click)="newChat.open('dm')"
      >
        <ng-icon name="lucideSquarePen" size="22" />
      </button>
    }

    <!-- phone: bottom tab bar -->
    @if (showTabBar()) {
      <nav
        class="bg-background/95 supports-backdrop-filter:bg-background/80 fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur md:hidden"
        aria-label="Main"
      >
        <div class="grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
          @for (t of tabs; track t.id) {
            <button
              type="button"
              class="relative flex h-16 flex-col items-center justify-center gap-1 text-[0.7rem] font-semibold transition-colors"
              [class]="activeTab() === t.id ? 'text-foreground' : 'text-muted-foreground'"
              [attr.aria-current]="activeTab() === t.id ? 'page' : null"
              (click)="openTab(t.id)"
            >
              <span class="relative flex h-8 w-14 items-center justify-center rounded-full transition-colors" [class.bg-muted]="activeTab() === t.id">
                <ng-icon [name]="t.icon" size="20" />
                @if (t.id === 'chats' && unreadCount()) {
                  <span class="bg-primary text-primary-foreground absolute -top-1 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.6rem] tabular-nums">{{ unreadCount() > 9 ? '9+' : unreadCount() }}</span>
                }
                @if (t.id === 'archive' && archiveUnread()) {
                  <span class="bg-primary absolute top-0.5 right-3 size-2 rounded-full"></span>
                }
              </span>
              {{ t.label }}
            </button>
          }
        </div>
      </nav>
    }

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
  /** Phone bottom tabs. */
  readonly tabs: { id: Section | 'settings'; label: string; icon: string }[] = [
    { id: 'chats', label: 'Chats', icon: 'lucideMessageSquare' },
    { id: 'favorites', label: 'Favorites', icon: 'lucideStar' },
    { id: 'archive', label: 'Archive', icon: 'lucideArchive' },
    { id: 'settings', label: 'Settings', icon: 'lucideSettings' },
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
  private url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url.split('?')[0]),
    ),
    { initialValue: this.router.url.split('?')[0] },
  );
  /** Bottom tabs show on the list and on Settings/Help, never inside a conversation. */
  showTabBar = computed(() => ['/chat', '/chat/settings', '/chat/help'].includes(this.url()));
  activeTab = computed<Section | 'settings'>(() => (this.url().startsWith('/chat/settings') ? 'settings' : this.section()));
  mobileTitle = computed(() => ({ chats: 'Chats', favorites: 'Favorites', archive: 'Archive' })[this.section()]);
  unreadCount = computed(() => this.allItems().filter((i) => i.unread && !i.archived).length);

  openTab(id: Section | 'settings'): void {
    if (id === 'settings') {
      void this.router.navigate(['/chat/settings']);
      return;
    }
    this.setSection(id);
    if (this.url() !== '/chat') void this.router.navigate(['/chat']);
  }

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
    return this.allItems().filter((i) => inSection.has(i.room.id) && (!q || (i.title ?? '').toLowerCase().includes(q)));
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
