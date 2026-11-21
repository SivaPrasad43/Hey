import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { AppUser, Room } from '../../core/models';
import { MOODS, MoodId, getMood } from '../../core/moods';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { EmotionFaceComponent } from '../../shared/ui/emotion-face.component';
import { DisplayMessage, Row, reactionChips } from './message-rows';
import { ReactionBurstComponent } from './reaction-burst.component';
import { Receipt, receiptFor } from './receipts';
import { LONG_PRESS_MS, PRESS_SLOP_PX, isTouchUi, swipeState } from './gestures';
import { vibrate } from '../../core/haptics';
import { Token, formatText, isEmojiOnly, stickerMood } from './message-format';

type Run = Extract<Row, { kind: 'run' }>;

export interface ReactEvent {
  msg: DisplayMessage;
  mood: MoodId;
}
export interface MessageMenuRequest {
  msg: DisplayMessage;
  /** Where to anchor a desktop menu; absent for the phone sheet. */
  at?: { x: number; y: number };
}
export interface EditEvent {
  msg: DisplayMessage;
  text: string;
}

/** A run of consecutive messages from one sender, as chat bubbles that wear their feeling. */
@Component({
  selector: 'app-message-group',
  imports: [
    NgIcon,
    HlmButtonImports,
    HlmTextareaImports,
    HlmTooltipImports,
    AvatarComponent,
    EmotionFaceComponent,
    ReactionBurstComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <article
      class="flex pt-4"
      [class.justify-end]="run().own"
      [attr.aria-label]="(run().own ? 'You' : run().senderName) + ' at ' + run().time"
    >
      <div class="flex max-w-[90%] min-w-0 flex-col gap-1 sm:max-w-[75%]" [class]="run().own ? 'items-end' : 'items-start'">
        @for (item of run().items; track item.msg.id; let last = $last) {
          @let m = moodOf(item.msg);
          <div
            class="group/line relative flex max-w-full touch-pan-y items-center gap-1.5 rounded-2xl outline-none select-none focus-visible:ring-2 focus-visible:ring-ring md:select-auto"
            [class.flex-row-reverse]="!run().own"
            [attr.data-mid]="item.msg.id"
            [attr.tabindex]="item.msg.pending ? null : 0"
            [attr.aria-haspopup]="item.msg.pending ? null : 'menu'"
            (click)="onLineTap()"
            (keydown)="onLineKey($event, item.msg)"
            (pointerdown)="onPointerDown($event, item.msg)"
            (pointermove)="onPointerMove($event)"
            (pointerup)="onPointerUp()"
            (pointercancel)="resetGesture()"
            (contextmenu)="onContextMenu($event, item.msg)"
          >
            <!-- swipe-to-reply hint (phones) -->
            @if (swipe().id === item.msg.id && swipe().offset > 6) {
              <span
                class="text-muted-foreground absolute top-1/2 left-0 flex size-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors"
                [class]="swipe().armed ? 'bg-primary text-primary-foreground' : 'bg-muted'"
                [style.opacity]="swipe().offset / 56"
                aria-hidden="true"
              >
                <ng-icon name="lucideReply" size="16" />
              </span>
            }
            <div
              class="flex min-w-0 flex-col"
              [class]="run().own ? 'items-end' : 'items-start'"
              [style.transform]="swipe().id === item.msg.id && swipe().offset ? 'translateX(' + swipe().offset + 'px)' : null"
              [style.transition]="swipe().id === item.msg.id && swipe().dragging ? 'none' : 'transform 180ms ease-out'"
            >
              <div
                class="relative min-w-0 rounded-2xl px-3.5 py-2 shadow-soft transition-[box-shadow]"
                [class]="bubbleClass(item.msg, last)"
                [attr.data-active]="activeId() === item.msg.id"
              >
                @if (editingId() === item.msg.id) {
                  <div class="flex w-72 max-w-full flex-col gap-2 py-1">
                    <label class="sr-only" [for]="'edit-' + item.msg.id">Edit message</label>
                    <textarea
                      hlmTextarea
                      [id]="'edit-' + item.msg.id"
                      class="bg-background text-foreground min-h-16"
                      maxlength="2000"
                      [value]="draft()"
                      (input)="draft.set($any($event.target).value)"
                      (keydown.enter)="onEditEnter($any($event), item.msg)"
                      (keydown.escape)="$event.stopPropagation(); cancelEdit()"
                    ></textarea>
                    <div class="flex items-center justify-end gap-2">
                      <button hlmBtn size="xs" [variant]="run().own ? 'secondary' : 'ghost'" (click)="cancelEdit()">Cancel</button>
                      <button hlmBtn size="xs" [disabled]="!draft().trim()" (click)="saveEdit(item.msg)">Save</button>
                    </div>
                  </div>
                } @else if (item.msg.deleted) {
                  <p class="text-sm italic">This message was deleted.</p>
                } @else {
                  @let kind = kindOf(item.msg);
                  @if (item.msg.replyTo; as q) {
                    <button
                      type="button"
                      class="mb-1.5 flex w-full max-w-72 min-w-40 items-start gap-2 rounded-xl border-l-[3px] px-2.5 py-1.5 text-left text-xs transition-opacity hover:opacity-80"
                      [class]="quoteClass(q.mood)"
                      [attr.aria-label]="'Replying to ' + q.senderName + ': ' + q.text + '. Jump to message'"
                      (click)="jump.emit(q.id)"
                    >
                      <app-emotion-face [emotion]="q.mood" [size]="14" class="mt-px" />
                      <span class="min-w-0 flex-1">
                        <span class="block truncate font-semibold">{{ q.senderId === meUid() ? 'You' : q.senderName }}</span>
                        <span class="block truncate opacity-80">{{ q.text }}</span>
                      </span>
                    </button>
                  }
                  @switch (kind) {
                    @case ('sticker') {
                      <button
                        type="button"
                        class="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        [attr.aria-label]="m.label + ' sticker. Replay'"
                        (click)="replay(item.msg.id)"
                        (mouseenter)="replay(item.msg.id)"
                      >
                        <app-emotion-face [emotion]="m.id" [size]="76" [play]="playToken()[item.msg.id] || (fresh().has(item.msg.id) ? item.msg.id : null)" />
                      </button>
                    }
                    @case ('emoji') {
                      <p class="text-5xl leading-tight tracking-wide" [attr.aria-label]="m.label + ': ' + item.msg.text">{{ item.msg.text }}</p>
                    }
                    @default {
                      <div class="flex items-start gap-2">
                        <button
                          type="button"
                          class="mt-0.5 shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          [attr.aria-label]="'Feeling ' + m.label.toLowerCase() + '. Replay'"
                          [hlmTooltip]="m.label"
                          (click)="replay(item.msg.id)"
                          (mouseenter)="replay(item.msg.id)"
                        >
                          <app-emotion-face
                            [emotion]="m.id"
                            [size]="18"
                            [play]="playToken()[item.msg.id] || (fresh().has(item.msg.id) ? item.msg.id : null)"
                          />
                        </button>
                        <p class="min-w-0 text-[0.925rem] leading-relaxed break-words whitespace-pre-wrap" [class]="run().own ? '' : m.text"
                          >@for (t of tokens(item.msg.text); track $index) {
                            @switch (t.kind) {
                              @case ('bold') {
                                <strong class="font-semibold">{{ t.value }}</strong>
                              }
                              @case ('italic') {
                                <em>{{ t.value }}</em>
                              }
                              @case ('code') {
                                <code class="rounded-md px-1 py-0.5 font-mono text-[0.85em]" [class]="run().own ? 'bg-black/20' : 'bg-muted'">{{ t.value }}</code>
                              }
                              @case ('link') {
                                <a
                                  [href]="t.href"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  class="font-medium break-all underline underline-offset-2"
                                  [class]="run().own ? 'decoration-on-fill/50' : 'text-primary decoration-primary/40'"
                                  >{{ t.value }}</a
                                >
                              }
                              @default {
                                <span>{{ t.value }}</span>
                              }
                            }
                          }
                        </p>
                      </div>
                    }
                  }
                  <!-- meta row inside the bubble -->
                  @if (item.msg.editedAt || run().own) {
                    <div class="mt-0.5 flex items-center justify-end gap-1 text-[0.7rem]" [class]="run().own && kind === 'text' ? 'text-on-fill/70' : 'text-muted-foreground'">
                      @if (item.msg.editedAt) {
                        <span>edited</span>
                      }
                      @if (run().own) {
                        @let r = receipt(item.msg);
                        @switch (r.kind) {
                          @case ('pending') {
                            <ng-icon name="lucideClock3" size="12" aria-label="Sending" />
                          }
                          @case ('sent') {
                            <ng-icon name="lucideCheck" size="13" aria-label="Sent" />
                          }
                          @case ('seen') {
                            @if (isGroup()) {
                              @if (last) {
                                <span [hlmTooltip]="'Seen by ' + seenNames(r)" class="inline-flex items-center gap-0.5">
                                  <ng-icon name="lucideCheckCheck" size="13" />
                                  {{ r.everyone ? 'Seen by everyone' : 'Seen by ' + r.seenBy }}
                                </span>
                              } @else {
                                <ng-icon name="lucideCheckCheck" size="13" aria-label="Seen" />
                              }
                            } @else {
                              <ng-icon name="lucideCheckCheck" size="13" aria-label="Seen" [class]="kind === 'text' ? 'text-on-fill' : 'text-primary'" />
                            }
                          }
                        }
                      }
                    </div>
                  }
                }
              </div>

              @if (chips(item.msg); as list) {
                @if (list.length && !item.msg.deleted) {
                  <div class="-mt-1.5 flex flex-wrap gap-1 px-2" [class.justify-end]="run().own">
                    @for (c of list; track c.mood) {
                      <button
                        type="button"
                        class="relative inline-flex h-6 items-center gap-1 rounded-full border px-1.5 text-xs font-semibold tabular-nums shadow-soft transition-colors"
                        [class]="c.mine ? 'bg-background ' + moodOf(c.mood).pill : 'bg-background border-border text-muted-foreground hover:text-foreground'"
                        [attr.aria-pressed]="c.mine"
                        [attr.aria-label]="c.label + ' reaction, ' + c.count + (c.mine ? '. Remove yours' : '. Add')"
                        (click)="onChip(item.msg, c.mood)"
                      >
                        <app-emotion-face [emotion]="c.mood" [size]="14" [play]="burstToken()[item.msg.id + ':' + c.mood] || bump(item.msg.id, c.mood)" />
                        <span [class.emo-count-bump]="!!bump(item.msg.id, c.mood)">{{ c.count }}</span>
                        <app-reaction-burst
                          [mood]="c.mood"
                          [dotClass]="moodOf(c.mood).dot"
                          [trigger]="burstToken()[item.msg.id + ':' + c.mood] || bump(item.msg.id, c.mood)"
                          [subtle]="!burstToken()[item.msg.id + ':' + c.mood]"
                        />
                      </button>
                    }
                  </div>
                }
              }
            </div>
          </div>
        }

        <!-- under the run: who said it (only needed for other people in groups), and when -->
        <footer class="mt-1 flex items-center gap-2 px-1" [class.flex-row-reverse]="run().own">
          @if (showSender()) {
            <app-avatar size="sm" [name]="run().senderName" [uid]="run().senderId" [color]="color()" />
            <span class="text-xs font-semibold">{{ run().senderName }}</span>
          }
          <time class="text-muted-foreground text-xs tabular-nums">{{ lastTime() }}</time>
        </footer>
      </div>
    </article>

  `,
})
export class MessageGroupComponent {
  run = input.required<Run>();
  meUid = input<string | null>(null);
  /** Avatar color for the sender, if their profile is known. */
  color = input<string | undefined>(undefined);
  /** Messages that just arrived live: play their entrance once. */
  fresh = input<ReadonlySet<string>>(new Set());
  /** `${msgId}:${mood}` reaction counts that just went up (someone else reacted). */
  bumps = input<ReadonlySet<string>>(new Set());
  /** Room + user directory, for read receipts on your own messages. */
  room = input<Room | null>(null);
  /** Message whose actions menu is open: highlighted. */
  activeId = input<string | null>(null);
  users = input<ReadonlyMap<string, AppUser>>(new Map());

  react = output<ReactEvent>();
  edit = output<EditEvent>();
  remove = output<DisplayMessage>();
  reply = output<DisplayMessage>();
  /** Long-press on touch devices: open the action sheet. */
  /** Open the message's actions: a sheet on phones (long-press), a menu at `at` on desktop (right-click). */
  longPress = output<MessageMenuRequest>();
  /** Ask this group to start editing a message (from the action sheet). */
  editRequest = input<{ id: string; n: number } | null>(null);
  /** Scroll to a quoted message. */
  jump = output<string>();

  readonly moods = MOODS;
  private host = inject(ElementRef<HTMLElement>);

  editingId = signal<string | null>(null);
  draft = signal('');
  /** Replay tokens for faces, keyed by message id. */
  playToken = signal<Record<string, number>>({});
  /** Burst tokens for my own reactions, keyed by `${msgId}:${mood}`. */
  burstToken = signal<Record<string, number>>({});

  constructor() {
    effect(() => {
      const req = this.editRequest();
      if (!req) return;
      const item = untracked(() => this.run().items.find((i) => i.msg.id === req.id));
      if (item) untracked(() => this.startEdit(item.msg));
    });
  }

  moodOf(m: DisplayMessage | MoodId) {
    return getMood(typeof m === 'string' ? m : m.mood);
  }

  isGroup = computed(() => this.room()?.type !== 'dm');
  /** In a DM it's obvious who's who, and your own runs are already on the right: show names only for others in groups. */
  showSender = computed(() => this.isGroup() && !this.run().own);
  lastTime = computed(() => this.run().items[this.run().items.length - 1]?.time ?? this.run().time);

  /** Bubble surface: yours filled with the feeling, others on the card with a feeling outline. */
  bubbleClass(msg: DisplayMessage, last: boolean): string {
    const own = this.run().own;
    const tail = last ? (own ? 'rounded-br-md' : 'rounded-bl-md') : '';
    const active = 'data-[active=true]:ring-2 data-[active=true]:ring-ring/40';
    if (msg.deleted) return `${tail} ${active} border border-border bg-muted text-muted-foreground`;
    const m = this.moodOf(msg);
    const motion = this.fresh().has(msg.id) ? m.motion : '';
    if (this.kindOf(msg) !== 'text' && !msg.replyTo) return `!bg-transparent !shadow-none !px-1 !py-0 ${motion}`;
    const surface = own
      ? `${m.fill} text-on-fill ${msg.pending ? 'opacity-70' : ''}`
      : `bg-card text-card-foreground border ${m.pill}`;
    return `${surface} ${tail} ${motion} ${active}`;
  }

  /** How a message's body is drawn: a feeling sticker, big emoji, or formatted text. */
  kindOf(msg: DisplayMessage): 'sticker' | 'emoji' | 'text' {
    if (stickerMood(msg.text)) return 'sticker';
    if (isEmojiOnly(msg.text)) return 'emoji';
    return 'text';
  }

  private tokenCache = new Map<string, Token[]>();
  tokens(text: string): Token[] {
    let t = this.tokenCache.get(text);
    if (!t) {
      t = formatText(text);
      if (this.tokenCache.size > 500) this.tokenCache.clear();
      this.tokenCache.set(text, t);
    }
    return t;
  }

  quoteClass(mood: MoodId): string {
    const m = this.moodOf(mood);
    return this.run().own ? 'bg-on-fill/8 border-l-on-fill/45 text-on-fill' : `bg-muted text-foreground ${m.edge.split(' ').find((c) => c.startsWith('border-l-')) ?? ''}`;
  }

  receipt(msg: DisplayMessage): Receipt {
    const room = this.room();
    if (!room) return msg.pending ? { kind: 'pending' } : { kind: 'sent' };
    return receiptFor(msg, room, this.users());
  }

  seenNames(r: Receipt): string {
    return r.kind === 'seen' ? r.names.join(', ') : '';
  }

  bump(msgId: string, mood: MoodId): string | null {
    const key = `${msgId}:${mood}`;
    return this.bumps().has(key) ? key : null;
  }

  replay(id: string): void {
    this.playToken.update((t) => ({ ...t, [id]: (t[id] ?? 0) + 1 }));
  }

  chips(m: DisplayMessage) {
    return reactionChips(m.reactions, this.meUid());
  }

  myReaction(m: DisplayMessage): MoodId | null {
    const me = this.meUid();
    return me && m.reactions?.[me] ? getMood(m.reactions[me]).id : null;
  }

  onChip(msg: DisplayMessage, mood: MoodId): void {
    const adding = this.myReaction(msg) !== mood;
    if (adding) {
      const key = `${msg.id}:${mood}`;
      this.burstToken.update((t) => ({ ...t, [key]: (t[key] ?? 0) + 1 }));
    }
    this.react.emit({ msg, mood });
  }

  /** Swallow the click that ends a long-press or swipe. */
  onLineTap(): void {
    this.suppressTap = false;
  }

  /** Keyboard: Enter, the Menu key or Shift+F10 opens the actions menu. */
  onLineKey(e: KeyboardEvent, msg: DisplayMessage): void {
    if (e.target !== e.currentTarget || msg.pending) return;
    if (e.key === 'Enter' || e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
      e.preventDefault();
      this.openMenu(msg, e.currentTarget as HTMLElement);
    }
  }

  private openMenu(msg: DisplayMessage, el: HTMLElement, x?: number, y?: number): void {
    const r = el.getBoundingClientRect();
    this.longPress.emit({ msg, at: { x: x ?? (this.run().own ? r.right : r.left), y: y ?? r.bottom + 4 } });
  }

  // ----- touch gestures: long-press opens actions, swipe right replies -----
  swipe = signal<{ id: string | null; offset: number; armed: boolean; dragging: boolean }>({
    id: null,
    offset: 0,
    armed: false,
    dragging: false,
  });
  private gesture: { msg: DisplayMessage; x: number; y: number; timer?: ReturnType<typeof setTimeout>; mode: 'press' | 'swipe' | 'none' } | null = null;
  private suppressTap = false;

  onPointerDown(e: PointerEvent, msg: DisplayMessage): void {
    if (e.pointerType !== 'touch' || msg.pending || this.editingId() === msg.id) return;
    if ((e.target as Element).closest('a, textarea')) return;
    const g: NonNullable<typeof this.gesture> = { msg, x: e.clientX, y: e.clientY, mode: 'press' };
    g.timer = setTimeout(() => {
      if (this.gesture !== g || g.mode !== 'press') return;
      g.mode = 'none';
      this.suppressTap = true;
      vibrate('happy');
      this.longPress.emit({ msg });
    }, LONG_PRESS_MS);
    this.gesture = g;
  }

  onPointerMove(e: PointerEvent): void {
    const g = this.gesture;
    if (!g || g.mode === 'none') return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (g.mode === 'press' && Math.hypot(dx, dy) > PRESS_SLOP_PX) {
      clearTimeout(g.timer);
      g.mode = g.msg.deleted ? 'none' : 'swipe';
    }
    if (g.mode !== 'swipe') return;
    const st = swipeState(dx, dy);
    if (st.cancelled) {
      g.mode = 'none';
      this.swipe.set({ id: null, offset: 0, armed: false, dragging: false });
      return;
    }
    const wasArmed = this.swipe().armed;
    this.swipe.set({ id: g.msg.id, offset: st.offset, armed: st.armed, dragging: true });
    if (st.armed && !wasArmed) vibrate('happy');
  }

  onPointerUp(): void {
    const g = this.gesture;
    if (g?.mode === 'swipe' && this.swipe().armed) {
      this.suppressTap = true;
      this.reply.emit(g.msg);
    }
    this.resetGesture();
  }

  resetGesture(): void {
    if (this.gesture?.timer) clearTimeout(this.gesture.timer);
    this.gesture = null;
    this.swipe.set({ id: null, offset: 0, armed: false, dragging: false });
  }

  /** Right-click (desktop) opens the menu at the cursor; touch long-press fires it too, so hide the native one. */
  onContextMenu(e: MouseEvent, msg: DisplayMessage): void {
    if ((e.target as Element).closest('a, textarea')) return; // keep the browser menu for links and editing
    e.preventDefault();
    if (msg.pending || this.editingId() === msg.id) return;
    if (isTouchUi() || this.gesture?.mode === 'press') {
      if (this.gesture?.mode === 'press') {
        clearTimeout(this.gesture.timer);
        this.gesture.mode = 'none';
        this.suppressTap = true;
        this.longPress.emit({ msg });
      }
      return;
    }
    const keyboard = e.clientX === 0 && e.clientY === 0;
    this.openMenu(msg, e.currentTarget as HTMLElement, keyboard ? undefined : e.clientX, keyboard ? undefined : e.clientY);
  }

  startEdit(m: DisplayMessage): void {
    this.draft.set(m.text);
    this.editingId.set(m.id);
    setTimeout(() => {
      const el = this.host.nativeElement.querySelector(`#edit-${CSS.escape(m.id)}`) as HTMLTextAreaElement | null;
      el?.focus();
      el?.setSelectionRange(el.value.length, el.value.length);
    });
  }

  onEditEnter(e: KeyboardEvent, m: DisplayMessage): void {
    if (e.shiftKey || e.isComposing) return;
    e.preventDefault();
    this.saveEdit(m);
  }

  saveEdit(m: DisplayMessage): void {
    const text = this.draft().trim();
    if (!text) return;
    if (text !== m.text) this.edit.emit({ msg: m, text });
    this.editingId.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }
}
