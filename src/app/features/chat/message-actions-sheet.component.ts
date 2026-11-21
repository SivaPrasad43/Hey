import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { MOODS, MoodId, getMood } from '../../core/moods';
import { EmotionFaceComponent } from '../../shared/ui/emotion-face.component';
import { DisplayMessage } from './message-rows';

export type MessageAction = 'reply' | 'copy' | 'edit' | 'delete';

/** Message actions: a bottom sheet on phones (long-press), or a menu at the cursor on desktop (right-click). */
@Component({
  selector: 'app-message-actions-sheet',
  imports: [NgIcon, NgTemplateOutlet, EmotionFaceComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'msg() && closed.emit()' },
  template: `
    @if (msg(); as m) {
      @if (at(); as p) {
        <!-- desktop: a menu at the cursor -->
        <div class="fixed inset-0 z-50" role="presentation" (pointerdown)="closed.emit()" (contextmenu)="$event.preventDefault(); closed.emit()"></div>
        <div
          class="bg-popover text-popover-foreground ring-foreground/10 animate-in fade-in-0 zoom-in-95 fixed z-50 w-80 rounded-2xl p-1.5 shadow-pop ring-1 duration-100"
          [style.left.px]="pos().left"
          [style.top.px]="pos().top"
          role="menu"
          aria-label="Message actions"
          (keydown)="onMenuKey($event)"
        >
          <ng-container [ngTemplateOutlet]="body" [ngTemplateOutletContext]="{ $implicit: m, compact: true }" />
        </div>
      } @else {
        <!-- phones: a bottom sheet -->
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
            <ng-container [ngTemplateOutlet]="body" [ngTemplateOutletContext]="{ $implicit: m, compact: false }" />
          </div>
        </div>
      }
    }

    <ng-template #body let-m let-compact="compact">
      @if (!m.deleted) {
        <!-- react -->
        <div class="grid grid-cols-5" [class]="compact ? 'mb-1 gap-1 border-b pb-1.5' : 'mx-4 mb-3 gap-2'" role="group" aria-label="React with a feeling">
          @for (mo of moods; track mo.id) {
            <button
              type="button"
              [attr.role]="compact ? 'menuitem' : null"
              class="flex flex-col items-center gap-1 rounded-xl font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
              [class]="(compact ? 'py-2 text-[0.7rem] ' : 'rounded-2xl py-3 text-xs ') + (mine() === mo.id ? 'border ' + mo.tint + ' ' + mo.pill : 'border border-transparent ' + (compact ? 'hover:bg-muted' : 'bg-muted/60'))"
              [attr.aria-pressed]="mine() === mo.id"
              (click)="react.emit(mo.id)"
            >
              <app-emotion-face [emotion]="mo.id" [size]="compact ? 26 : 34" [play]="mo.id" [interactive]="compact" />
              {{ mo.label }}
            </button>
          }
        </div>

        <!-- actions -->
        <ul [class.mx-2]="!compact">
          <li><button type="button" [attr.role]="compact ? 'menuitem' : null" [class]="compact ? 'menu-row' : 'sheet-row'" (click)="act.emit('reply')"><ng-icon name="lucideReply" [size]="compact ? '16' : '20'" /> Reply</button></li>
          <li><button type="button" [attr.role]="compact ? 'menuitem' : null" [class]="compact ? 'menu-row' : 'sheet-row'" (click)="act.emit('copy')"><ng-icon name="lucideCopy" [size]="compact ? '16' : '20'" /> Copy text</button></li>
          @if (own()) {
            <li><button type="button" [attr.role]="compact ? 'menuitem' : null" [class]="compact ? 'menu-row' : 'sheet-row'" (click)="act.emit('edit')"><ng-icon name="lucidePencil" [size]="compact ? '16' : '20'" /> Edit</button></li>
            <li><button type="button" [attr.role]="compact ? 'menuitem' : null" [class]="(compact ? 'menu-row' : 'sheet-row') + ' text-destructive'" (click)="act.emit('delete')"><ng-icon name="lucideTrash2" [size]="compact ? '16' : '20'" /> Delete</button></li>
          }
        </ul>
      } @else {
        <p class="text-muted-foreground mb-2 text-center text-sm" [class]="compact ? 'px-2 py-2' : 'mx-4'">No actions for deleted messages.</p>
      }
    </ng-template>
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
    .menu-row {
      display: flex;
      width: 100%;
      align-items: center;
      gap: 0.625rem;
      border-radius: 0.625rem;
      padding: 0.5rem 0.625rem;
      font-size: 0.875rem;
      font-weight: 500;
      text-align: left;
    }
    .sheet-row:active,
    .sheet-row:hover,
    .menu-row:hover,
    .menu-row:focus-visible {
      background: var(--muted);
    }
    .menu-row:focus-visible,
    .sheet-row:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: -2px;
    }
  `,
})
export class MessageActionsSheetComponent {
  msg = input<DisplayMessage | null>(null);
  /** Desktop: anchor the menu here (viewport px). Null shows the phone sheet. */
  at = input<{ x: number; y: number } | null>(null);
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

  /** Keep the menu on screen: flip left/up near the edges. */
  pos = computed(() => {
    const p = this.at();
    if (!p) return { left: 0, top: 0 };
    const w = 320;
    const rows = 2 + (this.own() ? 2 : 0);
    const h = this.msg()?.deleted ? 56 : 92 + rows * 37;
    const left = p.x + w + 8 > innerWidth ? Math.max(8, p.x - w) : p.x;
    const top = p.y + h + 8 > innerHeight ? Math.max(8, p.y - h) : p.y;
    return { left, top };
  });

  /** Arrow keys move between menu items. */
  onMenuKey(e: KeyboardEvent): void {
    if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const items = [...this.host.nativeElement.querySelectorAll('[role=menu] button')] as HTMLElement[];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (i + step + items.length) % items.length;
    items[next]?.focus();
  }

  constructor() {
    // Move focus into the sheet when it opens (keyboard / screen-reader users).
    effect(() => {
      if (this.msg()) setTimeout(() => (this.host.nativeElement.querySelector('[role=dialog] button, [role=menu] button') as HTMLElement | null)?.focus({ preventScroll: true }));
    });
  }
}
