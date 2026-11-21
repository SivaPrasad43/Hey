import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Observable, Subscription, catchError, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { MessageService, nextReaction } from '../../core/message.service';
import { Message, ReplyRef } from '../../core/models';
import { MoodId, getMood } from '../../core/moods';
import { Timestamp } from '@angular/fire/firestore';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { ConfirmService } from '../../shared/ui/confirm.service';
import { vibrate } from '../../core/haptics';
import { EmotionFaceComponent } from '../../shared/ui/emotion-face.component';
import { RoomMoodComponent } from './room-mood.component';
import { RoomInfoSheetComponent } from './room-info-sheet.component';
import { MessageAction, MessageActionsSheetComponent } from './message-actions-sheet.component';
import type { MessageMenuRequest } from './message-group.component';
import { replyRef } from './message-format';
import { EditEvent, ReactEvent } from './message-group.component';
import { RoomService, otherMember, roomTitle } from '../../core/room.service';
import { ToastService } from '../../core/toast.service';
import { TYPING_TTL_MS, TypingService } from '../../core/typing.service';
import { UserService, isOnline } from '../../core/user.service';
import { shortAgo } from '../../core/time';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { ChatStateService } from './chat-state.service';
import { ComposerComponent } from './composer.component';
import { DisplayMessage } from './message-rows';
import { MessageListComponent } from './message-list.component';
import { NewChatService } from './new-chat-dialog.component';
import { ShortcutsService } from './shortcuts-dialog.component';


import { recentMembers } from './recent-members';

@Component({
    selector: 'app-room-page',
    imports: [RouterLink, NgIcon, HlmButtonImports, HlmEmptyImports, HlmTooltipImports, AvatarComponent, ComposerComponent, MessageListComponent, RoomMoodComponent, EmotionFaceComponent, RoomInfoSheetComponent, MessageActionsSheetComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
    class: 'flex h-full min-h-0 flex-col',
        '(document:keydown)': 'onKey($event)',
    },
    template: `
    @if (notFound()) {
      <hlm-empty class="flex-1">
        <hlm-empty-header>
          <h2 hlmEmptyTitle>Conversation not found</h2>
          <p hlmEmptyDescription>It may have been removed, or you’re not a member.</p>
        </hlm-empty-header>
        <hlm-empty-content>
          <a hlmBtn variant="outline" routerLink="/chat">Back to chats</a>
        </hlm-empty-content>
      </hlm-empty>
    } @else {
      <header class="flex h-16 shrink-0 items-center gap-2 border-b px-3 pt-[env(safe-area-inset-top)] max-md:h-14 max-md:gap-1.5 max-md:px-2 sm:px-6">
        <a hlmBtn variant="ghost" size="icon-sm" routerLink="/chat" class="md:hidden" aria-label="Back to chats">
          <ng-icon name="lucideChevronLeft" />
        </a>
        @if (room(); as r) {
          @if (r.type === 'dm') {
            <app-avatar size="sm" [name]="title()" [uid]="dmPeerId() ?? ''" [color]="dmPeer()?.avatarColor" [online]="dmPeerOnline()" />
          } @else {
            <ng-icon name="lucideHash" class="text-muted-foreground" />
          }
          <div class="min-w-0 flex-1 leading-tight">
            <h1 class="text-title truncate">{{ title() }}</h1>
            <p class="text-muted-foreground truncate text-xs" aria-live="polite">{{ typingLabel() || subtitle() }}</p>
          </div>
          @if (r.type === 'group' && stack().length) {
            <!-- latest members, overlapping -->
            <div class="mr-1 flex items-center" [hlmTooltip]="stackNames()" [attr.aria-label]="'Recently active: ' + stackNames()" role="img">
              @for (u of stack(); track u.uid; let i = $index) {
                <span class="relative flex rounded-full ring-2 ring-white" [class.-ml-1.5]="i > 0">
                  <app-avatar size="sm" [name]="u.name" [uid]="u.uid" [color]="u.color" />
                </span>
              }
              @if (r.members.length > stack().length) {
                <span class="bg-muted text-muted-foreground relative -ml-1.5 flex size-6 ring-white items-center justify-center rounded-full text-[0.65rem] font-semibold ring-2 max-sm:hidden">+{{ r.members.length - stack().length }}</span>
              }
            </div>
          }
          <app-room-mood [messages]="messages()" [filter]="filter()" (filterChange)="filter.set($event)" />
          <app-room-info-sheet [room]="r" [users]="usersById()" [messages]="messages()" [filter]="filter()" (filterChange)="filter.set($event)" />
        } @else {
          <div class="flex-1"></div>
        }
      </header>

      @if (filter(); as f) {
        <div class="flex shrink-0 justify-center px-4 pt-3"><div class="bg-muted flex h-10 items-center gap-2 rounded-full pr-1.5 pl-4 text-sm">
          <app-emotion-face [emotion]="f" [size]="16" [play]="f" />
          <span>Showing <span class="font-medium">{{ filterLabel() }}</span> messages · {{ filteredCount() }}</span>
          <button hlmBtn variant="outline" size="xs" class="bg-background ml-2" (click)="filter.set(null)"><ng-icon name="lucideX" /> Clear</button>
        </div></div>
      }

      <app-message-list
        [filter]="filter()"
        [room]="room() ?? null"
        [users]="usersById()"
        [messages]="messages()"
        [meUid]="auth.uid()"
        [colors]="colors()"
        [loading]="loading()"
        [hasMore]="hasMore()"
        [loadingOlder]="loadingOlder()"
        (loadOlder)="loadOlder()"
        (react)="onReact($event)"
        (edit)="onEdit($event)"
        (remove)="onRemove($event)"
        (reply)="startReply($event)"
        (longPress)="openActions($event)"
        [activeId]="actionsFor()?.id ?? null"
        [editRequest]="editRequest()"
        [typers]="activeTypers()"
      />

      <div class="px-3 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
        <app-message-actions-sheet
          [msg]="actionsFor()"
          [at]="actionsAt()"
          [meUid]="auth.uid()"
          (closed)="closeActions()"
          (react)="sheetReact($event)"
          (act)="sheetAct($event)"
        />
        <app-composer
          [roomName]="title()"
          [replyTo]="replyTo()"
          (cancelReply)="replyTo.set(null)"
          (send)="send($event)"
          (typing)="onTyping()"
          (stoppedTyping)="onStopTyping()"
          (focused)="keepLatestInView()"
        />
      </div>
    }
  `
})
export class RoomPage {
  roomId = input.required<string>();

  auth = inject(AuthService);
  private roomsSvc = inject(RoomService);
  private messagesSvc = inject(MessageService);
  private typingSvc = inject(TypingService);
  private usersSvc = inject(UserService);
  private toast = inject(ToastService);
  private state = inject(ChatStateService);

  newChat = inject(NewChatService);
  shortcuts = inject(ShortcutsService);
  private confirm = inject(ConfirmService);
  private composer = viewChild(ComposerComponent);

  private roomId$ = toObservable(this.roomId);
  private roomState = toSignal(
    this.roomId$.pipe(switchMap((id) => this.roomsSvc.room$(id).pipe(catchError(() => of(null))))),
    { initialValue: undefined },
  );
  room = computed(() => this.roomState() ?? undefined);
  notFound = computed(() => this.roomState() === null);

  private users = toSignal(this.usersSvc.all$, { initialValue: [] });
  usersById = computed(() => new Map(this.users().map((u) => [u.uid, u])));
  colors = computed(() => Object.fromEntries(this.users().map((u) => [u.uid, u.avatarColor])));

  title = computed(() => {
    const r = this.room();
    return r ? roomTitle(r, this.auth.uid()) : '';
  });
  dmPeerId = computed(() => {
    const r = this.room();
    return r ? otherMember(r, this.auth.uid()) : null;
  });
  dmPeer = computed(() => {
    const id = this.dmPeerId();
    return id ? this.usersById().get(id) : undefined;
  });
  dmPeerOnline = computed(() => isOnline(this.dmPeer(), this.usersSvc.now()));

  subtitle = computed(() => {
    const r = this.room();
    if (!r) return '';
    const now = this.usersSvc.now();
    if (r.type === 'dm') {
      const peer = this.dmPeer();
      if (isOnline(peer, now)) return 'Online';
      return peer?.lastSeen ? `Last seen ${shortAgo(peer.lastSeen.toDate(), new Date(now))} ago`.replace('now ago', 'just now') : 'Offline';
    }
    const online = r.members.filter((m) => isOnline(this.usersById().get(m), now)).length;
    return `${r.members.length} member${r.members.length === 1 ? '' : 's'} · ${online} online`;
  });

  /** Header avatar stack: the four most recently active members. */
  stack = computed(() => {
    const r = this.room();
    if (!r || r.type !== 'group') return [];
    const users = this.usersById();
    return recentMembers(r.members, this.messages(), users).map((uid) => ({
      uid,
      name: users.get(uid)?.displayName ?? r.memberNames?.[uid] ?? 'Someone',
      label: uid === this.auth.uid() ? 'You' : (users.get(uid)?.displayName ?? r.memberNames?.[uid] ?? 'Someone'),
      color: users.get(uid)?.avatarColor,
    }));
  });
  stackNames = computed(() => this.stack().map((u) => u.label).join(', '));

  // ---- messages ----
  /** page key (0 = newest, -1, -2… older) -> live messages in that page */
  private pages = signal<Record<number, Message[]>>({});
  private pageSubs: Subscription[] = [];
  private oldestCursor: Timestamp | null = null;
  private live = computed(() => this.pages()[0] ?? []);
  private pending = signal<DisplayMessage[]>([]);
  loading = signal(true);
  loadingOlder = signal(false);
  hasMore = signal(false);

  messages = computed<DisplayMessage[]>(() => {
    const live = this.live();
    const confirmed = new Set(live.map((m) => (m as Message & { clientId?: string }).clientId).filter(Boolean));
    const seen = new Set<string>();
    const out: DisplayMessage[] = [];
    const pages = this.pages();
    const ordered = Object.keys(pages)
      .map(Number)
      .sort((a, b) => a - b)
      .flatMap((k) => pages[k]);
    for (const m of ordered) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      out.push(m);
    }
    return [...out, ...this.pending().filter((p) => !confirmed.has(p.id))];
  });

  // ---- emotion filter ----
  filter = signal<MoodId | null>(null);
  filterLabel = computed(() => (this.filter() ? getMood(this.filter()).label : ''));
  filteredCount = computed(() => {
    const f = this.filter();
    return f ? this.messages().filter((m) => m.type === 'text' && !m.deleted && getMood(m.mood).id === f).length : 0;
  });

  // ---- typing ----
  private tick = signal(Date.now());
  private typers = toSignal(
    this.roomId$.pipe(switchMap((id) => this.typingSvc.typers$(id).pipe(catchError(() => of([]))))),
    { initialValue: [] },
  );
  /** People typing right now (not me), with their current feeling. */
  activeTypers = computed(() => {
    const now = this.tick();
    const me = this.auth.uid();
    return this.typers()
      .filter((t) => t.uid !== me && t.at && now - t.at.toMillis() < TYPING_TTL_MS)
      .map((t) => ({ uid: t.uid, name: t.name, mood: getMood(t.mood).id }));
  });
  typingLabel = computed(() => {
    const names = this.activeTypers().map((t) => t.name);
    if (!names.length) return '';
    if (names.length === 1) return `${names[0]} is typing…`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
    return `${names.length} people are typing…`;
  });

  private lastMarkRead = 0;

  constructor() {
    const destroyRef = inject(DestroyRef);

    this.roomId$.pipe(takeUntilDestroyed()).subscribe((id) => {
      const prev = this.state.activeRoomId();
      const me = this.auth.uid();
      if (prev && me && prev !== id) this.typingSvc.stop(prev, me);
      this.state.activeRoomId.set(id);
      void this.openRoom(id);
    });

    const tick = setInterval(() => this.tick.set(Date.now()), 2000);
    destroyRef.onDestroy(() => {
      clearInterval(tick);
      this.clearPages();
      const me = this.auth.uid();
      const id = this.state.activeRoomId();
      if (me && id) this.typingSvc.stop(id, me);
      this.state.activeRoomId.set(null);
    });

    // Mark the room read when it's opened and whenever new messages land while it's visible.
    effect(() => {
      const count = this.live().length;
      const me = this.auth.uid();
      const id = this.roomId();
      if (!me || !count) return;
      untracked(() => this.markRead(me, id));
    });

    document.addEventListener('visibilitychange', this.onVisible);
    destroyRef.onDestroy(() => document.removeEventListener('visibilitychange', this.onVisible));
  }

  private onVisible = () => {
    const me = this.auth.uid();
    if (document.visibilityState === 'visible' && me) this.markRead(me, this.roomId(), true);
  };

  private markRead(uid: string, roomId: string, force = false): void {
    if (document.visibilityState !== 'visible') return;
    const now = Date.now();
    if (!force && now - this.lastMarkRead < 3000) return;
    this.lastMarkRead = now;
    void this.usersSvc.markRead(uid, roomId);
  }

  private clearPages(): void {
    this.pageSubs.forEach((sub) => sub.unsubscribe());
    this.pageSubs = [];
    this.pages.set({});
    this.oldestCursor = null;
  }

  private watchPage(key: number, page: { messages$: Observable<Message[]> }, onFirst?: () => void): void {
    let first = true;
    this.pageSubs.push(
      page.messages$.subscribe({
        next: (msgs) => {
          this.pages.update((p) => ({ ...p, [key]: msgs }));
          if (first) {
            first = false;
            onFirst?.();
          }
        },
        error: () => onFirst?.(),
      }),
    );
  }

  private async openRoom(id: string): Promise<void> {
    this.filter.set(null);
    this.replyTo.set(null);
    this.clearPages();
    this.loading.set(true);
    this.pending.set([]);
    try {
      const page = await this.messagesSvc.page(id, null);
      if (id !== this.roomId()) return;
      this.hasMore.set(page.full);
      this.oldestCursor = page.oldest;
      this.watchPage(0, page, () => this.loading.set(false));
    } catch {
      this.loading.set(false);
    }
    setTimeout(() => this.composer()?.focus());
  }

  async loadOlder(): Promise<void> {
    const before = this.oldestCursor;
    if (!before || this.loadingOlder()) return;
    const id = this.roomId();
    this.loadingOlder.set(true);
    try {
      const page = await this.messagesSvc.page(id, before);
      if (id !== this.roomId()) return;
      const key = Math.min(0, ...Object.keys(this.pages()).map(Number)) - 1;
      this.oldestCursor = page.oldest;
      this.hasMore.set(page.full && !!page.oldest);
      await new Promise<void>((resolve) => this.watchPage(key, page, resolve));
    } catch {
      this.toast.error('Couldn’t load older messages.');
    } finally {
      this.loadingOlder.set(false);
    }
  }

  onReact({ msg, mood }: ReactEvent): void {
    const me = this.auth.uid();
    if (!me) return;
    const next = nextReaction(msg.reactions?.[me] ? getMood(msg.reactions[me]).id : undefined, mood);
    if (next) vibrate(next);
    this.messagesSvc.react(this.roomId(), msg.id, me, next).catch(() => this.toast.error('Couldn’t save the reaction.'));
  }

  onEdit({ msg, text }: EditEvent): void {
    const room = this.room();
    if (!room) return;
    this.messagesSvc.edit(room, msg, text).catch(() => this.toast.error('Couldn’t save the edit.'));
  }

  async onRemove(msg: Message): Promise<void> {
    const room = this.room();
    if (!room) return;
    const ok = await this.confirm.ask({
      title: 'Delete message?',
      description: 'Everyone in this conversation will see that a message was deleted. This can’t be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await this.messagesSvc.remove(room, msg);
    } catch {
      this.toast.error('Couldn’t delete the message.');
    }
  }

  private list = viewChild(MessageListComponent);

  /** When the on-screen keyboard opens, keep the newest message visible if we were near the bottom. */
  keepLatestInView(): void {
    const list = this.list();
    if (!list?.isNearBottom()) return;
    setTimeout(() => list.scrollToBottom(), 300);
  }

  // ---- message actions: sheet on phones (long-press), menu at the cursor on desktop (right-click) ----
  actionsFor = signal<DisplayMessage | null>(null);
  actionsAt = signal<{ x: number; y: number } | null>(null);
  private actionsReturn: HTMLElement | null = null;

  openActions(req: MessageMenuRequest): void {
    this.actionsReturn = document.activeElement as HTMLElement | null;
    this.actionsAt.set(req.at ?? null);
    this.actionsFor.set(req.msg);
  }

  closeActions(): void {
    this.actionsFor.set(null);
    const back = this.actionsReturn;
    this.actionsReturn = null;
    if (back?.isConnected && back !== document.body) back.focus();
  }
  editRequest = signal<{ id: string; n: number } | null>(null);

  sheetReact(mood: MoodId): void {
    const msg = this.actionsFor();
    this.closeActions();
    if (msg) this.onReact({ msg, mood });
  }

  async sheetAct(action: MessageAction): Promise<void> {
    const msg = this.actionsFor();
    this.closeActions();
    if (!msg) return;
    switch (action) {
      case 'reply':
        this.startReply(msg);
        break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(msg.text);
          this.toast.show('Copied');
        } catch {
          this.toast.error('Couldn’t copy the text.');
        }
        break;
      case 'edit':
        this.editRequest.set({ id: msg.id, n: (this.editRequest()?.n ?? 0) + 1 });
        break;
      case 'delete':
        await this.onRemove(msg);
        break;
    }
  }

  // ---- replies ----
  replyTo = signal<ReplyRef | null>(null);

  startReply(msg: Message): void {
    this.replyTo.set(replyRef(msg));
    setTimeout(() => this.composer()?.focus());
  }

  async send({ text, mood }: { text: string; mood: MoodId }): Promise<void> {
    const uid = this.auth.uid();
    if (!uid) return;
    const clientId = crypto.randomUUID();
    const replyTo = this.replyTo();
    this.replyTo.set(null);
    vibrate(mood);
    const sender = { uid, name: this.auth.displayName() };
    this.pending.update((p) => [
      ...p,
      { id: clientId, type: 'text', text, mood, senderId: uid, senderName: sender.name, createdAt: null, pending: true, replyTo },
    ]);
    try {
      await this.messagesSvc.send(this.roomId(), sender, text, mood, clientId, replyTo);
    } catch {
      this.pending.update((p) => p.filter((m) => m.id !== clientId));
      this.toast.error('Message not sent. Check your connection.');
    }
    // Drop the optimistic copy once the server copy has arrived (or after a grace period).
    setTimeout(() => this.pending.update((p) => p.filter((m) => m.id !== clientId)), 10_000);
  }

  onTyping(): void {
    const uid = this.auth.uid();
    if (uid) this.typingSvc.ping(this.roomId(), uid, this.auth.displayName(), this.state.mood());
  }

  onStopTyping(): void {
    const uid = this.auth.uid();
    if (uid) this.typingSvc.stop(this.roomId(), uid);
  }

  onKey(e: KeyboardEvent): void {
    const target = e.target instanceof Element ? e.target : null;
    const typingInField = !!target?.closest('input, textarea, select, [contenteditable="true"]');
    if (e.key === '?' && !typingInField && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      this.shortcuts.show();
    }
  }
}

