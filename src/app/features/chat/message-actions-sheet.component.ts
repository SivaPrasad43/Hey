import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { MOODS, MoodId, getMood } from '../../core/moods';
import { EmotionFaceComponent } from '../../shared/ui/emotion-face.component';
import { DisplayMessage } from './message-rows';

export type MessageAction = 'reply' | 'copy' | 'edit' | 'delete';

/** Bottom action sheet for a long-pressed message (touch devices). */
@Component({
  selector: 'app-message-actions-sheet',
  imports: [NgIcon, EmotionFaceComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'msg() && closed.emit()' },
  template: `
    @if (msg(); as m) {
      <div class="fixed inset-0 z-50 flex flex-col justify-end" role="presentation">
        <div class="animate-in fade-in-0 absolute inset-0 bg-black/40 backdrop-blur-[2px]" (click)="closed.emit()"></div>
        <div
          class="bg-popover text-popover-foreground animate-in slide-in-from-bottom relative rounded-t-3xl pb-[max(1rem,env(safe-area-inset-bottom))] shadow-pop duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Message actions"
        >
          <div class="bg-muted-foreground/30 mx-auto mt-2.5 mb-3 h-1 w-10 rounded-full" aria-hidden="true"></div>

          <!-- preview -->
          <div class="mx-4 mb-4 flex items-start gap-2.5 rounded-2xl border px-3 py-2.5">
            <app-emotion-face [emotion]="m.mood" [size]="20" />
            <p class="line-clamp-3 min-w-0 flex-1 text-sm">{{ m.deleted ? 'This message was deleted.' : m.text }}</p>
          </div>

          @if (!m.deleted) {
            <!-- react -->
            <div class="mx-4 mb-3 grid grid-cols-4 gap-2" role="group" aria-label="React with a feeling">
              @for (mo of moods; track mo.id) {
                <button
                  type="button"
                  class="flex flex-col items-center gap-1.5 rounded-2xl py-3 text-xs font-semibold transition-colors active:scale-95"
                  [class]="mine() === mo.id ? 'border ' + mo.tint + ' ' + mo.pill : 'bg-muted/60 border border-transparent'"
                  [attr.aria-pressed]="mine() === mo.id"
                  (click)="react.emit(mo.id)"
                >
                  <app-emotion-face [emotion]="mo.id" [size]="34" [play]="mo.id" />
                  {{ mo.label }}
                </button>
              }
            </div>

            <!-- actions -->
            <ul class="mx-2">
              <li><button #first type="button" class="sheet-row" (click)="act.emit('reply')"><ng-icon name="lucideReply" size="20" /> Reply</button></li>
              <li><button type="button" class="sheet-row" (click)="act.emit('copy')"><ng-icon name="lucideCopy" size="20" /> Copy text</button></li>
              @if (own()) {
                <li><button type="button" class="sheet-row" (click)="act.emit('edit')"><ng-icon name="lucidePencil" size="20" /> Edit</button></li>
                <li><button type="button" class="sheet-row text-destructive" (click)="act.emit('delete')"><ng-icon name="lucideTrash2" size="20" /> Delete</button></li>
              }
            </ul>
          } @else {
            <p class="text-muted-foreground mx-4 mb-2 text-center text-sm">No actions for deleted messages.</p>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .sheet-row {
      display: flex;
      width: 100%;
      align-items: center;
      gap: 0.875rem;
      border-radius: 0.875rem;
      padding: 0.875rem 0.75rem;
      font-size: 0.95rem;
      font-weight: 500;
      text-align: left;
    }
    .sheet-row:active,
    .sheet-row:hover {
      background: var(--muted);
    }
    .sheet-row:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: -2px;
    }
  `,
})
export class MessageActionsSheetComponent {
  msg = input<DisplayMessage | null>(null);
  meUid = input<string | null>(null);
  react = output<MoodId>();
  act = output<MessageAction>();
  closed = output<void>();

  readonly moods = MOODS;
  private host = inject(ElementRef<HTMLElement>);

  own = computed(() => !!this.msg() && this.msg()!.senderId === this.meUid());
  mine = computed<MoodId | null>(() => {
    const me = this.meUid();
    const r = me ? this.msg()?.reactions?.[me] : undefined;
    return r ? getMood(r).id : null;
  });

  constructor() {
    // Move focus into the sheet when it opens (keyboard / screen-reader users).
    effect(() => {
      if (this.msg()) setTimeout(() => (this.host.nativeElement.querySelector('[role=dialog] button') as HTMLElement | null)?.focus());
    });
  }
}
