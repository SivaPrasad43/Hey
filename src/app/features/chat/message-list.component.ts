import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { EditEvent, MessageGroupComponent, MessageMenuRequest, ReactEvent } from './message-group.component';
import { AppUser, Room } from '../../core/models';
import { MoodId } from '../../core/moods';
import { EmotionTimelineComponent } from './emotion-timeline.component';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { EmotionFaceComponent } from '../../shared/ui/emotion-face.component';
import {
  DisplayMessage,
  ReactionCounts,
  buildRows,
  countReactions,
  matchesFilter,
  newArrivals,
  reactionIncreases,
} from './message-rows';

const NEAR_BOTTOM_PX = 120;
const LOAD_MORE_PX = 150;
/** How far someone must scroll in one direction before the composer hides or comes back. */
const DIRECTION_PX = 24;

@Component({
    selector: 'app-message-list',
    imports: [MessageGroupComponent, EmotionTimelineComponent, AvatarComponent, EmotionFaceComponent, NgIcon, HlmButtonImports, HlmEmptyImports, HlmSkeletonImports, HlmSpinnerImports],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'relative flex min-h-0 flex-1 flex-col' },
    template: `
    <div
      #scroller
      class="flex-1 overflow-y-auto overscroll-contain"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="Messages"
      (scroll)="onScroll()"
    >
      <div class="mx-auto w-full max-w-3xl px-4 pb-6 sm:px-6">
        @if (loading()) {
          <div class="flex flex-col gap-5 pt-6" aria-hidden="true">
            @for (w of skeleton; track $index) {
              <div class="flex gap-3">
                <hlm-skeleton class="size-8 rounded-full" />
                <div class="flex flex-1 flex-col gap-2">
                  <hlm-skeleton class="h-3.5 w-28" />
                  <hlm-skeleton class="h-3.5" [style.width.%]="w" />
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="flex h-10 items-center justify-center">
            @if (loadingOlder()) {
              <hlm-spinner class="text-muted-foreground" />
            } @else if (!hasMore() && rows().length) {
              <span class="text-muted-foreground text-xs">Start of conversation</span>
            }
          </div>

          @if (!rows().length) {
            <hlm-empty class="mt-16">
              <hlm-empty-header>
                @if (filter()) {
                  <h2 hlmEmptyTitle>No {{ filterLabel() }} messages loaded</h2>
                  <p hlmEmptyDescription>Scroll up to load older history, or clear the filter.</p>
                } @else {
                  <h2 hlmEmptyTitle>No messages yet</h2>
                  <p hlmEmptyDescription>Pick how you feel below and say something.</p>
                }
              </hlm-empty-header>
            </hlm-empty>
          }

          @for (row of rows(); track row.key) {
            @switch (row.kind) {
              @case ('day') {
                <div class="my-5 flex items-center justify-center" role="separator" [attr.aria-label]="row.label">
                  <span class="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-semibold">{{ row.label }}</span>
                </div>
              }
              @case ('system') {
                <p class="text-muted-foreground my-2 pl-12 text-xs">{{ row.text }}</p>
              }
              @case ('run') {
                <app-message-group
                  [run]="row"
                  [meUid]="meUid()"
                  [color]="colors()[row.senderId]"
                  [fresh]="fresh()"
                  [bumps]="bumps()"
                  [room]="room()"
                  [users]="users()"
                  (react)="react.emit($event)"
                  (edit)="edit.emit($event)"
                  (remove)="remove.emit($event)"
                  (reply)="reply.emit($event)"
                  (longPress)="longPress.emit($event)"
                  [activeId]="activeId()"
                  [editRequest]="editRequest()"
                  (jump)="jumpTo($event)"
                />
              }
            }
          }

          @for (t of typers(); track t.uid) {
            <div class="mt-4 flex items-end gap-2 animate-in fade-in-0 slide-in-from-bottom-2" role="status" [attr.aria-label]="t.name + ' is typing'">
              <app-avatar size="sm" [name]="t.name" [uid]="t.uid" [color]="colors()[t.uid]" />
              <div class="bg-card border-border shadow-soft flex items-center gap-2 rounded-2xl rounded-bl-md border px-3 py-2.5">
                <app-emotion-face [emotion]="t.mood" [size]="16" [play]="t.mood" />
                <span class="flex gap-1" aria-hidden="true">
                  <span class="bg-muted-foreground/60 size-1.5 animate-typing-dot rounded-full"></span>
                  <span class="bg-muted-foreground/60 size-1.5 animate-typing-dot rounded-full [animation-delay:150ms]"></span>
                  <span class="bg-muted-foreground/60 size-1.5 animate-typing-dot rounded-full [animation-delay:300ms]"></span>
                </span>
              </div>
            </div>
          }
        }
      </div>
    </div>

    @if (!loading()) {
      <app-emotion-timeline
        class="absolute top-3 right-3 bottom-3 hidden md:block"
        [messages]="visible()"
        (jump)="jumpTo($event)"
      />
    }

    @if (showJump()) {
      <button
        hlmBtn
        variant="outline"
        size="sm"
        class="bg-background shadow-float absolute bottom-3 left-1/2 -translate-x-1/2"
        (click)="scrollToBottom(true)"
        [attr.aria-label]="newCount() ? newCount() + ' new messages. Jump to latest' : 'Jump to latest'"
      >
        <ng-icon name="lucideArrowDown" />
        {{ newCount() ? newCount() + ' new' : 'Latest' }}
      </button>
    }
  `
})
export class MessageListComponent implements AfterViewChecked {
  messages = input.required<DisplayMessage[]>();
  meUid = input<string | null>(null);
  /** uid -> avatar color */
  colors = input<Record<string, string>>({});
  loading = input(false);
  hasMore = input(false);
  loadingOlder = input(false);
  loadOlder = output<void>();
  react = output<ReactEvent>();
  edit = output<EditEvent>();
  remove = output<DisplayMessage>();
  reply = output<DisplayMessage>();
  longPress = output<MessageMenuRequest>();
  /** True while reading back through history (scrolling up), false when heading down or at the latest message. */
  readingBack = output<boolean>();
  /** Message whose actions menu is open. */
  activeId = input<string | null>(null);
  editRequest = input<{ id: string; n: number } | null>(null);
  /** People typing right now, with their current feeling. */
  typers = input<{ uid: string; name: string; mood: MoodId }[]>([]);

  /** Show only messages of this emotion. */
  filter = input<MoodId | null>(null);
  /** For read receipts. */
  room = input<Room | null>(null);
  users = input<ReadonlyMap<string, AppUser>>(new Map());

  readonly skeleton = [60, 40, 75, 50];
  rows = computed(() => buildRows(this.messages(), this.meUid(), new Date(), this.filter()));
  visible = computed(() => this.messages().filter((m) => matchesFilter(m, this.filter())));
  filterLabel = computed(() => this.filter() ?? '');

  /** Messages that just arrived live (their entrance motion plays once). */
  fresh = signal<ReadonlySet<string>>(new Set());
  /** Reaction counts that just went up. */
  bumps = signal<ReadonlySet<string>>(new Set());
  private seenIds: Set<string> | null = null;
  private seenReactions: ReactionCounts | null = null;

  private scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private atBottom = signal(true);
  newCount = signal(0);
  showJump = computed(() => !this.atBottom());

  /** Pending scroll fix-up to apply after the DOM renders. */
  private pendingScroll: { kind: 'bottom'; smooth: boolean } | { kind: 'keep'; fromBottom: number } | null = {
    kind: 'bottom',
    smooth: false,
  };
  /** Distance from the bottom at the last scroll event; used to anchor the view when older pages are prepended. */
  private fromBottom = 0;
  private prevFirstId: string | null = null;
  private prevLastId: string | null = null;
  /** Scroll position where the current up/down run started. */
  private runStart = 0;
  private runDir = 0;
  private lastTop = 0;
  private reading = false;

  constructor() {
    effect(() => {
      if (this.typers().length && untracked(() => this.atBottom())) {
        untracked(() => {
          this.pendingScroll = { kind: 'bottom', smooth: true };
          setTimeout(() => this.applyPendingScroll());
        });
      }
    });
    effect(() => {
      const msgs = this.messages();
      const loading = this.loading();
      untracked(() => this.onMessagesChanged(msgs, loading));
    });
  }

  ngAfterViewChecked(): void {
    this.applyPendingScroll();
  }

  /** Runs after the DOM reflects the latest messages (effects can run after the view check). */
  private applyPendingScroll(): void {
    const el = this.scroller()?.nativeElement;
    const p = this.pendingScroll;
    if (!el || !p) return;
    this.pendingScroll = null;
    if (p.kind === 'bottom') {
      el.scrollTo({ top: el.scrollHeight, behavior: p.smooth ? 'smooth' : 'auto' });
      // Smooth scrolling doesn't animate in background tabs; make sure we end up at the bottom.
      if (p.smooth) setTimeout(() => (el.scrollTop = el.scrollHeight), 450);
    } else {
      el.scrollTop = el.scrollHeight - p.fromBottom;
      // Anchoring after older messages load isn't the reader scrolling down.
      this.lastTop = this.runStart = el.scrollTop;
    }
  }

  isNearBottom(): boolean {
    return this.atBottom();
  }

  scrollToBottom(smooth = false): void {
    this.pendingScroll = { kind: 'bottom', smooth };
    this.newCount.set(0);
    this.applyPendingScroll();
  }

  onScroll(): void {
    const el = this.scroller()?.nativeElement;
    if (!el) return;
    this.fromBottom = el.scrollHeight - el.scrollTop;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    this.atBottom.set(near);
    if (near) this.newCount.set(0);
    this.trackDirection(el.scrollTop, near);
    if (el.scrollTop < LOAD_MORE_PX && this.hasMore() && !this.loadingOlder() && !this.loading()) {
      this.loadOlder.emit();
    }
  }

  private trackDirection(top: number, near: boolean): void {
    const dir = Math.sign(top - this.lastTop);
    if (dir !== 0 && dir !== this.runDir) {
      this.runDir = dir;
      this.runStart = this.lastTop;
    }
    this.lastTop = top;
    const moved = top - this.runStart;
    const next = near ? false : moved < -DIRECTION_PX ? true : moved > DIRECTION_PX ? false : this.reading;
    if (next !== this.reading) {
      this.reading = next;
      this.readingBack.emit(next);
    }
  }

  private onMessagesChanged(msgs: DisplayMessage[], loading: boolean): void {
    if (loading) {
      this.seenIds = null;
      this.seenReactions = null;
      this.prevFirstId = this.prevLastId = null;
      this.pendingScroll = { kind: 'bottom', smooth: false };
      this.atBottom.set(true);
      this.newCount.set(0);
      this.lastTop = this.runStart = 0;
      if (this.reading) {
        this.reading = false;
        this.readingBack.emit(false);
      }
      return;
    }
    const first = msgs[0]?.id ?? null;
    const last = msgs[msgs.length - 1];
    const el = this.scroller()?.nativeElement;

    this.markFresh(newArrivals(this.seenIds, msgs), this.fresh);
    const counts = countReactions(msgs);
    this.markFresh(reactionIncreases(this.seenReactions, counts), this.bumps);
    this.seenIds = new Set(msgs.map((m) => m.id));
    this.seenReactions = counts;

    if (this.prevLastId === null) {
      this.pendingScroll = { kind: 'bottom', smooth: false };
    } else if (first !== this.prevFirstId && last?.id === this.prevLastId && el) {
      // Older page prepended: keep the viewport anchored.
      this.pendingScroll = { kind: 'keep', fromBottom: this.fromBottom };
    } else if (last && last.id !== this.prevLastId) {
      const mine = last.senderId === this.meUid();
      if (this.atBottom() || mine) {
        this.pendingScroll = { kind: 'bottom', smooth: true };
      } else if (last.type === 'text') {
        this.newCount.update((n) => n + 1);
      }
    }
    this.prevFirstId = first;
    this.prevLastId = last?.id ?? null;
    if (this.pendingScroll) setTimeout(() => this.applyPendingScroll());
  }

  /** Add keys to a short-lived set (cleared after the motion has played). */
  private markFresh(keys: string[], target: WritableSignal<ReadonlySet<string>>): void {
    if (!keys.length) return;
    target.update((s) => new Set([...s, ...keys]));
    setTimeout(() => target.update((s) => new Set([...s].filter((k) => !keys.includes(k)))), 1500);
  }

  /** Scroll a message into view and flash it (from the timeline). */
  jumpTo(id: string): void {
    const el = this.scroller()?.nativeElement.querySelector(`[data-mid="${CSS.escape(id)}"]`) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.remove('emo-flash');
    void el.offsetWidth;
    el.classList.add('emo-flash');
    setTimeout(() => el.classList.remove('emo-flash'), 1300);
  }
}
