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
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { EditEvent, MessageGroupComponent, ReactEvent } from './message-group.component';
import { DisplayMessage, buildRows } from './message-rows';

const NEAR_BOTTOM_PX = 120;
const LOAD_MORE_PX = 150;

@Component({
    selector: 'app-message-list',
    imports: [MessageGroupComponent, NgIcon, HlmButtonImports, HlmEmptyImports, HlmSkeletonImports, HlmSpinnerImports],
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
                <h2 hlmEmptyTitle>No messages yet</h2>
                <p hlmEmptyDescription>Messages you send here appear for everyone in this conversation.</p>
              </hlm-empty-header>
            </hlm-empty>
          }

          @for (row of rows(); track row.key) {
            @switch (row.kind) {
              @case ('day') {
                <div class="my-4 flex items-center gap-3" role="separator" [attr.aria-label]="row.label">
                  <span class="bg-border h-px flex-1"></span>
                  <span class="text-muted-foreground text-xs font-medium">{{ row.label }}</span>
                  <span class="bg-border h-px flex-1"></span>
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
                  (react)="react.emit($event)"
                  (edit)="edit.emit($event)"
                  (remove)="remove.emit($event)"
                />
              }
            }
          }
        }
      </div>
    </div>

    @if (showJump()) {
      <button
        hlmBtn
        variant="outline"
        size="sm"
        class="bg-background absolute bottom-3 left-1/2 -translate-x-1/2 shadow-sm"
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

  readonly skeleton = [60, 40, 75, 50];
  rows = computed(() => buildRows(this.messages(), this.meUid()));

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

  constructor() {
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
    }
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
    if (el.scrollTop < LOAD_MORE_PX && this.hasMore() && !this.loadingOlder() && !this.loading()) {
      this.loadOlder.emit();
    }
  }

  private onMessagesChanged(msgs: DisplayMessage[], loading: boolean): void {
    if (loading) {
      this.prevFirstId = this.prevLastId = null;
      this.pendingScroll = { kind: 'bottom', smooth: false };
      this.atBottom.set(true);
      this.newCount.set(0);
      return;
    }
    const first = msgs[0]?.id ?? null;
    const last = msgs[msgs.length - 1];
    const el = this.scroller()?.nativeElement;

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
}
