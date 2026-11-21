import { ChangeDetectionStrategy, Component, ElementRef, inject, input, output, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { MOODS, MoodId, getMood } from '../../core/moods';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { DisplayMessage, Row, reactionChips } from './message-rows';

type Run = Extract<Row, { kind: 'run' }>;

export interface ReactEvent {
  msg: DisplayMessage;
  mood: MoodId;
}
export interface EditEvent {
  msg: DisplayMessage;
  text: string;
}

/** A run of consecutive messages from one sender. */
@Component({
  selector: 'app-message-group',
  imports: [
    NgIcon,
    HlmBadgeImports,
    HlmButtonImports,
    HlmDropdownMenuImports,
    HlmTextareaImports,
    HlmTooltipImports,
    AvatarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', '(document:pointerdown)': 'onOutside($event)' },
  template: `
    <article class="flex gap-4 pt-3" [attr.aria-label]="(run().own ? 'You' : run().senderName) + ' at ' + run().time">
      <app-avatar class="mt-0.5" [name]="run().senderName" [uid]="run().senderId" [color]="color()" />
      <div class="min-w-0 flex-1">
        <header class="flex items-baseline gap-2">
          <span class="text-sm font-medium">{{ run().own ? 'You' : run().senderName }}</span>
          <time class="text-muted-foreground text-xs tabular-nums">{{ run().time }}</time>
        </header>

        @for (item of run().items; track item.msg.id) {
          <div
            class="group/line hover:bg-muted/50 data-[active=true]:bg-muted/50 relative -mx-2 rounded-md px-2 py-0.5"
            [attr.data-active]="activeId() === item.msg.id"
            (click)="onLineTap($event, item.msg.id)"
          >
            @if (editingId() === item.msg.id) {
              <div class="flex flex-col gap-2 py-1">
                <label class="sr-only" [for]="'edit-' + item.msg.id">Edit message</label>
                <textarea
                  hlmTextarea
                  [id]="'edit-' + item.msg.id"
                  class="min-h-16"
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
            } @else {
              <span
                class="absolute top-[0.65rem] -left-[3px] size-1.5 rounded-full"
                [class]="item.msg.deleted ? 'bg-transparent' : moodOf(item.msg).dot"
                [attr.title]="moodOf(item.msg).label"
                aria-hidden="true"
              ></span>
              @if (item.msg.deleted) {
                <p class="text-muted-foreground text-sm italic">This message was deleted.</p>
              } @else {
                <p class="text-sm leading-relaxed break-words whitespace-pre-wrap" [class.text-muted-foreground]="item.msg.pending">
                  <span class="sr-only">{{ moodOf(item.msg).label }}: </span>{{ item.msg.text }}
                  @if (item.msg.editedAt) {
                    <span class="text-muted-foreground text-xs">(edited)</span>
                  }
                  @if (item.msg.pending) {
                    <span class="text-muted-foreground text-xs">Sending…</span>
                  }
                </p>

                @if (chips(item.msg); as list) {
                  @if (list.length) {
                    <div class="mt-1 flex flex-wrap gap-1">
                      @for (c of list; track c.mood) {
                        <button
                          hlmBadge
                          [variant]="c.mine ? 'secondary' : 'outline'"
                          class="cursor-pointer gap-1.5 tabular-nums"
                          [attr.aria-pressed]="c.mine"
                          [attr.aria-label]="c.label + ' reaction, ' + c.count + (c.mine ? '. Remove yours' : '. Add')"
                          (click)="react.emit({ msg: item.msg, mood: c.mood })"
                        >
                          <span class="size-1.5 rounded-full" [class]="moodOf(c.mood).dot"></span>
                          {{ c.label }} {{ c.count }}
                        </button>
                      }
                    </div>
                  }
                }

                @if (!item.msg.pending) {
                  <div
                    class="bg-background pointer-events-none absolute -top-3 right-2 flex items-center gap-0.5 rounded-md border p-0.5 opacity-0 shadow-xs transition-opacity group-hover/line:pointer-events-auto group-hover/line:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100 has-[[aria-expanded=true]]:pointer-events-auto has-[[aria-expanded=true]]:opacity-100 data-[open=true]:pointer-events-auto data-[open=true]:opacity-100"
                    [attr.data-open]="activeId() === item.msg.id"
                  >
                    <button
                      hlmBtn
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Add reaction"
                      hlmTooltip="Add reaction"
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
            }
          </div>
        }
      </div>
    </article>

    <ng-template #reactMenu let-msg>
      <hlm-dropdown-menu class="w-40">
        @for (m of moods; track m.id) {
          <button hlmDropdownMenuRadio keepOpen="false" [checked]="myReaction(msg) === m.id" (triggered)="react.emit({ msg, mood: m.id })">
            <hlm-dropdown-menu-radio-indicator />
            <span class="size-2 rounded-full" [class]="m.dot"></span>
            {{ m.label }}
          </button>
        }
      </hlm-dropdown-menu>
    </ng-template>
  `,
})
export class MessageGroupComponent {
  run = input.required<Run>();
  meUid = input<string | null>(null);
  /** Avatar color for the sender, if their profile is known. */
  color = input<string | undefined>(undefined);

  react = output<ReactEvent>();
  edit = output<EditEvent>();
  remove = output<DisplayMessage>();

  readonly moods = MOODS;
  private host = inject(ElementRef<HTMLElement>);

  editingId = signal<string | null>(null);
  draft = signal('');
  /** Line whose toolbar is pinned open by a tap (touch devices have no hover). */
  activeId = signal<string | null>(null);

  moodOf(m: DisplayMessage | MoodId) {
    return getMood(typeof m === 'string' ? m : m.mood);
  }

  chips(m: DisplayMessage) {
    return reactionChips(m.reactions, this.meUid());
  }

  myReaction(m: DisplayMessage): MoodId | null {
    const me = this.meUid();
    return me && m.reactions?.[me] ? getMood(m.reactions[me]).id : null;
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
