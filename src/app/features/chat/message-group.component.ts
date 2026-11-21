import { ChangeDetectionStrategy, Component, ElementRef, inject, input, output, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { MOODS, MoodId, getMood } from '../../core/moods';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { EmotionFaceComponent } from '../../shared/ui/emotion-face.component';
import { DisplayMessage, Row, reactionChips } from './message-rows';
import { ReactionBurstComponent } from './reaction-burst.component';

type Run = Extract<Row, { kind: 'run' }>;

export interface ReactEvent {
  msg: DisplayMessage;
  mood: MoodId;
}
export interface EditEvent {
  msg: DisplayMessage;
  text: string;
}

/** A run of consecutive messages from one sender; each line wears its emotion. */
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
    <article class="flex gap-3 pt-4" [attr.aria-label]="(run().own ? 'You' : run().senderName) + ' at ' + run().time">
      <app-avatar class="mt-0.5" [name]="run().senderName" [uid]="run().senderId" [color]="color()" />
      <div class="min-w-0 flex-1">
        <header class="mb-1 flex items-baseline gap-2">
          <span class="text-sm font-semibold">{{ run().own ? 'You' : run().senderName }}</span>
          <time class="text-muted-foreground text-xs tabular-nums">{{ run().time }}</time>
        </header>

        <div class="flex flex-col gap-1">
          @for (item of run().items; track item.msg.id) {
            @let m = moodOf(item.msg);
            <div
              class="group/line relative rounded-xl border border-l-[3px] py-2 pr-3 pl-3 transition-colors"
              [class]="lineClass(item.msg)"
              [attr.data-mid]="item.msg.id"
              [attr.data-active]="activeId() === item.msg.id"
              (click)="onLineTap($event, item.msg.id)"
            >
              @if (editingId() === item.msg.id) {
                <div class="flex flex-col gap-2">
                  <label class="sr-only" [for]="'edit-' + item.msg.id">Edit message</label>
                  <textarea
                    hlmTextarea
                    [id]="'edit-' + item.msg.id"
                    class="bg-background min-h-16"
                    maxlength="2000"
                    [value]="draft()"
                    (input)="draft.set($any($event.target).value)"
                    (keydown.enter)="onEditEnter($any($event), item.msg)"
                    (keydown.escape)="$event.stopPropagation(); cancelEdit()"
                  ></textarea>
                  <div class="flex items-center gap-2">
                    <button hlmBtn size="sm" [disabled]="!draft().trim()" (click)="saveEdit(item.msg)">Save</button>
                    <button hlmBtn size="sm" variant="ghost" (click)="cancelEdit()">Cancel</button>
                    <span class="text-muted-foreground text-xs">Enter to save, Esc to cancel</span>
                  </div>
                </div>
              } @else if (item.msg.deleted) {
                <p class="text-muted-foreground text-sm italic">This message was deleted.</p>
              } @else {
                <div class="flex items-start gap-2">
                  <button
                    type="button"
                    class="mt-px shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    [attr.aria-label]="'Feeling ' + m.label.toLowerCase() + '. Replay'"
                    [hlmTooltip]="m.label"
                    (click)="replay(item.msg.id)"
                    (mouseenter)="replay(item.msg.id)"
                  >
                    <app-emotion-face [emotion]="m.id" [size]="18" [play]="playToken()[item.msg.id] || (fresh().has(item.msg.id) ? item.msg.id : null)" />
                  </button>
                  <p class="min-w-0 flex-1 text-sm leading-relaxed break-words whitespace-pre-wrap" [class]="item.msg.pending ? 'text-muted-foreground' : m.text">
                    {{ item.msg.text }}
                    @if (item.msg.editedAt) {
                      <span class="text-muted-foreground text-xs font-normal">(edited)</span>
                    }
                    @if (item.msg.pending) {
                      <span class="text-muted-foreground text-xs">Sending…</span>
                    }
                  </p>
                </div>

                @if (chips(item.msg); as list) {
                  @if (list.length) {
                    <div class="mt-2 flex flex-wrap gap-1.5 pl-[26px]">
                      @for (c of list; track c.mood) {
                        <button
                          type="button"
                          class="relative inline-flex h-7 items-center gap-1 rounded-full border px-2 text-xs font-semibold tabular-nums transition-colors"
                          [class]="c.mine ? 'bg-background shadow-soft ' + moodOf(c.mood).pill : 'bg-background border-border text-muted-foreground shadow-soft hover:text-foreground'"
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

                @if (!item.msg.pending) {
                  <div
                    class="bg-popover border-border pointer-events-none absolute -top-4 right-2 flex items-center gap-0.5 rounded-full border p-1 opacity-0 shadow-float transition-opacity group-hover/line:pointer-events-auto group-hover/line:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100 has-[[aria-expanded=true]]:pointer-events-auto has-[[aria-expanded=true]]:opacity-100 data-[open=true]:pointer-events-auto data-[open=true]:opacity-100"
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
                      align="end"
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
              }
            </div>
          }
        </div>
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

  lineClass(msg: DisplayMessage): string {
    if (msg.deleted) return 'border-border bg-muted/40';
    const m = this.moodOf(msg);
    const motion = this.fresh().has(msg.id) ? m.motion : '';
    return `${m.tint} ${m.edge} ${motion} data-[active=true]:ring-1 data-[active=true]:ring-border`;
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
