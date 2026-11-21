import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { suggestEmotion } from '../../core/emotion-suggest';
import { ReplyRef } from '../../core/models';
import { MOODS, MoodId, getMood, moodForShortcut } from '../../core/moods';
import { EmotionFaceComponent } from '../../shared/ui/emotion-face.component';
import { ChatStateService } from './chat-state.service';
import { isTouchUi } from './gestures';

const MAX_LINES = 5;
const MAX_LENGTH = 2000;
const HOLD_MS = 450;
const SUGGEST_DELAY_MS = 400;

@Component({
  selector: 'app-composer',
  imports: [NgIcon, HlmButtonImports, HlmTooltipImports, EmotionFaceComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
    '(document:keydown)': 'onGlobalKey($event)',
    '(document:pointerdown)': 'onOutside($event)',
  },
  template: `
    <form
      class="composer group/composer mx-auto w-full max-w-3xl"
      [style.--composer-accent]="accent()"
      [style.--composer-ring]="accentRing()"
      (submit)="$event.preventDefault(); submit()"
    >
      <!-- feeling tabs sit on the box's top edge; the selected one merges into it -->
      <div class="relative z-10 flex items-end gap-1 pl-3 sm:pl-4">
        <div class="flex items-end gap-1" role="radiogroup" aria-label="How do you feel?" (keydown)="onBarKey($event)">
          @for (m of moods; track m.id) {
            <button
              type="button"
              role="radio"
              class="composer-tab"
              [attr.aria-checked]="state.mood() === m.id"
              [tabindex]="state.mood() === m.id ? 0 : -1"
              [hlmTooltip]="m.label + ' · Alt ' + m.shortcut"
              (click)="pick(m.id)"
            >
              <app-emotion-face [emotion]="m.id" [size]="20" [play]="state.mood() === m.id ? playToken() : null" [interactive]="true" />
              <span class="max-sm:sr-only">{{ m.label }}</span>
            </button>
          }
        </div>

        @if (suggestion(); as s) {
          <div class="bg-muted text-muted-foreground mb-1.5 ml-auto inline-flex h-8 items-center gap-1.5 rounded-full pr-1 pl-2.5 text-xs font-medium" role="status">
            <app-emotion-face [emotion]="s" [size]="16" [play]="s" />
            <span class="max-sm:hidden">Sounds {{ adjective(s) }}</span>
            <button hlmBtn type="button" size="xs" variant="secondary" class="bg-background rounded-full" (click)="pick(s)">Use {{ label(s) }}</button>
            <button hlmBtn type="button" size="icon-xs" variant="ghost" class="rounded-full" aria-label="Dismiss suggestion" (click)="dismissSuggestion()">
              <ng-icon name="lucideX" />
            </button>
          </div>
        }
      </div>

      <!-- the box -->
      <div class="composer-box" (click)="focusFromBox($event)">
        @if (replyTo(); as r) {
          <div class="bg-muted/70 mx-3 mt-3 flex items-center gap-2.5 rounded-xl py-2 pr-1.5 pl-3 text-sm" role="status">
            <span class="h-8 w-[3px] shrink-0 rounded-full" [class]="moodDot(r.mood)"></span>
            <app-emotion-face [emotion]="r.mood" [size]="18" />
            <span class="min-w-0 flex-1 leading-tight">
              <span class="flex items-center gap-1 text-xs font-semibold"><ng-icon name="lucideReply" size="12" /> Replying to {{ r.senderName }}</span>
              <span class="text-muted-foreground block truncate text-xs">{{ r.text }}</span>
            </span>
            <button hlmBtn type="button" variant="ghost" size="icon-xs" aria-label="Cancel reply" (click)="cancelReply.emit(); focus()">
              <ng-icon name="lucideX" />
            </button>
          </div>
        }

        <label class="sr-only" for="composer-input">Message, feeling {{ current().label.toLowerCase() }}</label>
        <textarea
          #input
          id="composer-input"
          rows="2"
          [attr.enterkeyhint]="touch ? 'enter' : 'send'"
          (focus)="focused.emit()"
          class="placeholder:text-muted-foreground block max-h-48 min-h-16 w-full max-md:max-h-32 max-md:min-h-11 resize-none bg-transparent px-4 pt-3.5 pb-1 text-[0.95rem] leading-6 outline-none"
          [maxLength]="maxLength"
          [value]="text()"
          (input)="onInput($event)"
          (keydown.enter)="onEnter($any($event))"
          (keydown.escape)="onEscape($any($event))"
          (blur)="stoppedTyping.emit()"
          [placeholder]="placeholder()"
          autocomplete="off"
        ></textarea>

        <div class="flex items-center gap-1.5 px-2.5 pt-1 pb-2.5">
          <span class="text-muted-foreground hidden pl-1.5 text-xs lg:inline">Enter to send · Shift+Enter for a new line · Hold send for a one-off feeling</span>
          <span class="text-muted-foreground/70 ml-auto pr-1 text-xs tabular-nums" [class.invisible]="text().length < maxLength - 200">{{ maxLength - text().length }}</span>
          <button
            hlmBtn
            type="button"
            variant="ghost"
            size="icon-sm"
            class="rounded-xl"
            [attr.aria-label]="'Send a ' + current().label.toLowerCase() + ' sticker'"
            [hlmTooltip]="'Send ' + current().label.toLowerCase() + ' sticker'"
            (click)="sendSticker()"
          >
            <ng-icon name="lucideSticker" />
          </button>
          <div class="relative" #sendWrap>
            <button
              hlmBtn
              type="button"
              size="icon"
              class="rounded-xl transition-[background-color,opacity,transform] disabled:opacity-30"
              [disabled]="!canSend()"
              aria-label="Send message"
              aria-haspopup="menu"
              [attr.aria-expanded]="holdOpen()"
              hlmTooltip="Send · hold for another feeling"
              (pointerdown)="startHold($event)"
              (pointerup)="cancelHold()"
              (pointerleave)="cancelHold()"
              (contextmenu)="$event.preventDefault(); openHold()"
              (keydown.arrowUp)="$event.preventDefault(); openHold()"
              (click)="onSendClick()"
            >
              <ng-icon name="lucideSendHorizontal" />
            </button>

            @if (holdOpen()) {
              <div
                role="menu"
                aria-label="Send once with a feeling"
                class="bg-popover text-popover-foreground ring-foreground/10 animate-in fade-in-0 zoom-in-95 absolute right-0 bottom-full z-30 mb-2 flex gap-1 rounded-2xl p-2 shadow-float ring-1"
                (keydown)="onHoldKey($event)"
              >
                @for (m of moods; track m.id; let i = $index) {
                  <button
                    type="button"
                    role="menuitem"
                    class="hover:bg-accent focus-visible:bg-accent flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium outline-none"
                    [style.transform]="'translateY(' + arc[i] + 'px)'"
                    (click)="sendWith(m.id)"
                  >
                    <app-emotion-face [emotion]="m.id" [size]="26" [interactive]="true" [play]="m.id" />
                    {{ m.label }}
                  </button>
                }
              </div>
            }
          </div>
        </div>
      </div>
    </form>
  `,
})
export class ComposerComponent {
  roomName = input('');
  /** Message being replied to, if any. */
  replyTo = input<ReplyRef | null>(null);
  cancelReply = output<void>();
  /** The text box got focus (the room keeps the newest message in view when the keyboard opens). */
  focused = output<void>();
  readonly touch = isTouchUi();
  send = output<{ text: string; mood: MoodId }>();
  typing = output<void>();
  stoppedTyping = output<void>();

  readonly maxLength = MAX_LENGTH;
  readonly moods = MOODS;
  /** Slight arc for the hold-to-pick menu. */
  readonly arc = [4, 0, 0, 4];

  state = inject(ChatStateService);
  text = signal('');
  canSend = computed(() => this.text().trim().length > 0);
  current = computed(() => getMood(this.state.mood()));
  placeholder = computed(() => {
    const feeling = this.current().label.toLowerCase();
    return this.roomName() ? `Message ${this.roomName()}, feeling ${feeling}` : `Write a message, feeling ${feeling}`;
  });
  accent = computed(() => `var(--mood-${this.current().id})`);
  accentRing = computed(() => `var(--mood-${this.current().id}-ring)`);
  playToken = signal(0);

  /** Suggested feeling for the current draft, if any. */
  suggestion = signal<MoodId | null>(null);
  private pickedThisDraft = false;
  private dismissed = new Set<MoodId>();
  private suggestTimer?: ReturnType<typeof setTimeout>;

  holdOpen = signal(false);
  private holdTimer?: ReturnType<typeof setTimeout>;
  private suppressClick = false;

  private textarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('input');
  private sendWrap = viewChild<ElementRef<HTMLElement>>('sendWrap');
  private host = inject(ElementRef<HTMLElement>);

  moodDot(id: MoodId): string {
    return getMood(id).dot;
  }

  /** A sticker is just the feeling's emoji; it renders as the feeling's artwork. */
  sendSticker(): void {
    const m = this.current();
    this.send.emit({ text: m.emoji, mood: m.id });
    this.focus();
  }

  label(id: MoodId): string {
    return getMood(id).label;
  }

  adjective(id: MoodId): string {
    return getMood(id).adjective;
  }

  pick(id: MoodId): void {
    this.state.setMood(id);
    // Only a choice made while writing means "don't second-guess me" for this draft.
    if (this.text().trim()) this.pickedThisDraft = true;
    this.suggestion.set(null);
    this.playToken.update((n) => n + 1);
  }

  dismissSuggestion(): void {
    const s = this.suggestion();
    if (s) this.dismissed.add(s);
    this.suggestion.set(null);
    this.focus();
  }

  /** Clicking empty space in the box focuses the textarea (buttons keep their own behaviour). */
  focusFromBox(e: MouseEvent): void {
    if (!(e.target as Element).closest('button, textarea, a')) this.focus();
  }

  focus(): void {
    this.textarea().nativeElement.focus();
  }

  onInput(e: Event): void {
    const el = e.target as HTMLTextAreaElement;
    this.text.set(el.value);
    this.resize();
    if (el.value.trim()) this.typing.emit();
    else {
      this.stoppedTyping.emit();
      this.resetDraft();
    }
    clearTimeout(this.suggestTimer);
    this.suggestTimer = setTimeout(() => this.updateSuggestion(), SUGGEST_DELAY_MS);
  }

  private updateSuggestion(): void {
    const s = suggestEmotion(this.text());
    const show = s && !this.pickedThisDraft && s !== this.state.mood() && !this.dismissed.has(s);
    this.suggestion.set(show ? s : null);
  }

  onEscape(e: KeyboardEvent): void {
    if (this.replyTo()) {
      e.preventDefault();
      this.cancelReply.emit();
    }
  }

  onEnter(e: KeyboardEvent): void {
    // Phones: Enter adds a line (like common chat apps); the send button sends.
    if (e.shiftKey || e.isComposing || isTouchUi()) return;
    e.preventDefault();
    this.submit();
  }

  submit(mood: MoodId = this.state.mood()): void {
    const text = this.text().trim();
    if (!text) return;
    this.send.emit({ text, mood });
    this.text.set('');
    this.textarea().nativeElement.value = '';
    this.resize();
    this.stoppedTyping.emit();
    this.resetDraft();
    this.focus();
  }

  private resetDraft(): void {
    this.pickedThisDraft = false;
    this.dismissed.clear();
    this.suggestion.set(null);
    clearTimeout(this.suggestTimer);
  }

  // ----- hold send to pick a one-off feeling -----
  startHold(e: PointerEvent): void {
    if (e.button !== 0 || !this.canSend()) return;
    clearTimeout(this.holdTimer);
    this.holdTimer = setTimeout(() => {
      this.suppressClick = true;
      this.openHold();
    }, HOLD_MS);
  }

  cancelHold(): void {
    clearTimeout(this.holdTimer);
  }

  onSendClick(): void {
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }
    if (!this.holdOpen()) this.submit();
  }

  openHold(): void {
    if (!this.canSend()) return;
    this.holdOpen.set(true);
    setTimeout(() => (this.host.nativeElement.querySelector('[role="menu"] [role="menuitem"]') as HTMLElement | null)?.focus());
  }

  closeHold(refocus = true): void {
    this.holdOpen.set(false);
    if (refocus) this.focus();
  }

  sendWith(id: MoodId): void {
    this.closeHold();
    this.submit(id);
  }

  onHoldKey(e: KeyboardEvent): void {
    const items = Array.from(this.host.nativeElement.querySelectorAll('[role="menu"] [role="menuitem"]')) as HTMLElement[];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') this.closeHold();
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') items[(i + 1) % items.length]?.focus();
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') items[(i - 1 + items.length) % items.length]?.focus();
    else return;
    e.preventDefault();
    e.stopPropagation();
  }

  // ----- emotion bar keyboard (roving radio group) -----
  onBarKey(e: KeyboardEvent): void {
    const idx = MOODS.findIndex((m) => m.id === this.state.mood());
    let next = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % MOODS.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + MOODS.length) % MOODS.length;
    else return;
    e.preventDefault();
    this.pick(MOODS[next].id);
    setTimeout(() => (this.host.nativeElement.querySelector('[role="radio"][aria-checked="true"]') as HTMLElement | null)?.focus());
  }

  onGlobalKey(e: KeyboardEvent): void {
    const mood = moodForShortcut(e);
    if (mood) {
      e.preventDefault();
      this.pick(mood.id);
    }
  }

  onOutside(e: PointerEvent): void {
    if (this.holdOpen() && !this.sendWrap()?.nativeElement.contains(e.target as Node)) this.closeHold(false);
  }

  private resize(): void {
    const el = this.textarea().nativeElement;
    el.style.height = 'auto';
    const max = 24 * MAX_LINES + 20;
    el.style.height = Math.min(el.scrollHeight + 4, max) + 'px';
    el.style.overflowY = el.scrollHeight + 4 > max ? 'auto' : 'hidden';
  }
}
