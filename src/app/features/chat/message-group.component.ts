import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, output, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { AppUser, Room } from '../../core/models';
import { MOODS, MoodId, getMood } from '../../core/moods';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { EmotionFaceComponent } from '../../shared/ui/emotion-face.component';
import { DisplayMessage, Row, reactionChips } from './message-rows';
import { ReactionBurstComponent } from './reaction-burst.component';
import { Receipt, receiptFor } from './receipts';

type Run = Extract<Row, { kind: 'run' }>;

export interface ReactEvent {
  msg: DisplayMessage;
  mood: MoodId;
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
    HlmDropdownMenuImports,
    HlmTextareaImports,
    HlmTooltipImports,
    AvatarComponent,
    EmotionFaceComponent,
    ReactionBurstComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', '(document:pointerdown)': 'onOutside($event)' },
  template: `
    <article
      class="flex pt-4"
      [class.justify-end]="run().own"
      [attr.aria-label]="(run().own ? 'You' : run().senderName) + ' at ' + run().time"
    >
      <div class="flex max-w-[85%] min-w-0 flex-col gap-1 sm:max-w-[75%]" [class]="run().own ? 'items-end' : 'items-start'">
        @for (item of run().items; track item.msg.id; let last = $last) {
          @let m = moodOf(item.msg);
          <div
            class="group/line relative flex max-w-full items-center gap-1.5"
            [class.flex-row-reverse]="!run().own"
            [attr.data-mid]="item.msg.id"
            (click)="onLineTap($event, item.msg.id)"
          >
            <!-- hover / tap toolbar, on the inner side of the bubble -->
            @if (!item.msg.pending && !item.msg.deleted && editingId() !== item.msg.id) {
              <div
                class="bg-popover border-border pointer-events-none flex shrink-0 items-center gap-0.5 rounded-full border p-1 opacity-0 shadow-float transition-opacity group-hover/line:pointer-events-auto group-hover/line:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100 has-[[aria-expanded=true]]:pointer-events-auto has-[[aria-expanded=true]]:opacity-100 data-[open=true]:pointer-events-auto data-[open=true]:opacity-100"
                [attr.data-open]="activeId() === item.msg.id"
              >
                <button
                  hlmBtn
                  variant="ghost"
                  size="icon-xs"
                  aria-label="React with a feeling"
                  hlmTooltip="React"
                  [hlmDropdownMenuTrigger]="reactMenu"
                  [hlmDropdownMenuTriggerData]="{ $implicit: item.msg }"
                  [align]="run().own ? 'end' : 'start'"
                >
                  <ng-icon name="lucideSmilePlus" />
                </button>
                @if (item.msg.senderId === meUid()) {
                  <button hlmBtn variant="ghost" size="icon-xs" aria-label="Edit message" hlmTooltip="Edit" (click)="startEdit(item.msg)">
                    <ng-icon name="lucidePencil" />
                  </button>
                  <button hlmBtn variant="ghost" size="icon-xs" aria-label="Delete message" hlmTooltip="Delete" (click)="remove.emit(item.msg)">
                    <ng-icon name="lucideTrash2" />
                  </button>
                }
              </div>
            }

            <div class="flex min-w-0 flex-col" [class]="run().own ? 'items-end' : 'items-start'">
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
                        [size]="16"
                        [colored]="!run().own"
                        [play]="playToken()[item.msg.id] || (fresh().has(item.msg.id) ? item.msg.id : null)"
                      />
                    </button>
                    <p class="min-w-0 text-[0.925rem] leading-relaxed break-words whitespace-pre-wrap" [class]="run().own ? '' : m.text">{{ item.msg.text }}</p>
                  </div>
                  <!-- meta row inside the bubble -->
                  @if (item.msg.editedAt || run().own) {
                    <div class="mt-0.5 flex items-center justify-end gap-1 text-[0.7rem]" [class]="run().own ? 'text-white/80' : 'text-muted-foreground'">
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
                              <ng-icon name="lucideCheckCheck" size="13" aria-label="Seen" class="text-white" />
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

        <!-- sender row under the run -->
        <footer class="mt-1 flex items-center gap-2 px-1" [class.flex-row-reverse]="run().own">
          <app-avatar size="sm" [name]="run().senderName" [uid]="run().senderId" [color]="color()" />
          <span class="text-xs font-semibold">{{ run().own ? 'You' : run().senderName }}</span>
          <time class="text-muted-foreground text-xs tabular-nums">{{ lastTime() }}</time>
        </footer>
      </div>
    </article>

    <ng-template #reactMenu let-msg>
      <hlm-dropdown-menu class="w-auto p-1.5">
        <div class="flex gap-1" role="group" aria-label="React with a feeling">
          @for (mo of moods; track mo.id) {
            <button
              hlmDropdownMenuItem
              class="flex-col gap-1 px-2.5 py-2"
              [class.bg-accent]="myReaction(msg) === mo.id"
              [attr.aria-pressed]="myReaction(msg) === mo.id"
              (triggered)="onChip(msg, mo.id)"
            >
              <app-emotion-face [emotion]="mo.id" [size]="24" [interactive]="true" />
              <span class="text-xs">{{ mo.label }}</span>
            </button>
          }
        </div>
      </hlm-dropdown-menu>
    </ng-template>
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
  users = input<ReadonlyMap<string, AppUser>>(new Map());

  react = output<ReactEvent>();
  edit = output<EditEvent>();
  remove = output<DisplayMessage>();

  readonly moods = MOODS;
  private host = inject(ElementRef<HTMLElement>);

  editingId = signal<string | null>(null);
  draft = signal('');
  /** Line whose toolbar is pinned open by a tap (touch devices have no hover). */
  activeId = signal<string | null>(null);
  /** Replay tokens for faces, keyed by message id. */
  playToken = signal<Record<string, number>>({});
  /** Burst tokens for my own reactions, keyed by `${msgId}:${mood}`. */
  burstToken = signal<Record<string, number>>({});

  moodOf(m: DisplayMessage | MoodId) {
    return getMood(typeof m === 'string' ? m : m.mood);
  }

  isGroup = computed(() => this.room()?.type !== 'dm');
  lastTime = computed(() => this.run().items[this.run().items.length - 1]?.time ?? this.run().time);

  /** Bubble surface: yours filled with the feeling, others white with a feeling outline. */
  bubbleClass(msg: DisplayMessage, last: boolean): string {
    const own = this.run().own;
    const tail = last ? (own ? 'rounded-br-md' : 'rounded-bl-md') : '';
    const active = 'data-[active=true]:ring-2 data-[active=true]:ring-ring/40';
    if (msg.deleted) return `${tail} ${active} border border-border bg-muted text-muted-foreground`;
    const m = this.moodOf(msg);
    const motion = this.fresh().has(msg.id) ? m.motion : '';
    const surface = own
      ? `${m.fill} text-white ${msg.pending ? 'opacity-70' : ''}`
      : `bg-card text-card-foreground border ${m.pill}`;
    return `${surface} ${tail} ${motion} ${active}`;
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

  onLineTap(e: MouseEvent, id: string): void {
    if ((e.target as Element).closest('button, textarea, a')) return;
    this.activeId.update((cur) => (cur === id ? null : id));
  }

  startEdit(m: DisplayMessage): void {
    this.activeId.set(null);
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

  onOutside(e: PointerEvent): void {
    if (this.activeId() && !this.host.nativeElement.contains(e.target as Node)) this.activeId.set(null);
  }
}
