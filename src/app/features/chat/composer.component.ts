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
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { suggestEmotion } from '../../core/emotion-suggest';
import { MOODS, MoodId, getMood, moodForShortcut } from '../../core/moods';
import { EmotionFaceComponent } from '../../shared/ui/emotion-face.component';
import { ChatStateService } from './chat-state.service';

const MAX_LINES = 5;
const MAX_LENGTH = 2000;
const HOLD_MS = 450;
const SUGGEST_DELAY_MS = 400;

@Component({
  selector: 'app-composer',
  imports: [NgIcon, HlmButtonImports, HlmInputGroupImports, HlmTooltipImports, EmotionFaceComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
    '(document:keydown)': 'onGlobalKey($event)',
    '(document:pointerdown)': 'onOutside($event)',
  },
  template: `
    <form class="mx-auto w-full max-w-3xl" (submit)="$event.preventDefault(); submit()">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <div class="flex items-center gap-1" role="radiogroup" aria-label="How do you feel?" (keydown)="onBarKey($event)">
          @for (m of moods; track m.id; let i = $index) {
            <button
              #chip
              type="button"
              role="radio"
              [attr.aria-checked]="state.mood() === m.id"
              [tabindex]="state.mood() === m.id ? 0 : -1"
              class="inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-[background-color,border-color,color] outline-none focus-visible:ring-2 focus-visible:ring-ring"
              [class]="state.mood() === m.id ? m.tint + ' ' + m.pill + ' font-semibold shadow-soft' : 'text-muted-foreground hover:text-foreground bg-background border-border shadow-soft hover:bg-muted'"
              [hlmTooltip]="'Alt ' + m.shortcut"
              (click)="pick(m.id)"
            >
              <app-emotion-face [emotion]="m.id" [size]="18" [play]="state.mood() === m.id ? playToken() : null" [interactive]="true" />
              <span class="max-sm:sr-only">{{ m.label }}</span>
            </button>
          }
        </div>

        @if (suggestion(); as s) {
          <div class="bg-muted text-muted-foreground ml-auto inline-flex h-9 items-center gap-1.5 rounded-full pr-1 pl-3 text-xs font-medium" role="status">
            <app-emotion-face [emotion]="s" [size]="14" [play]="s" />
            Sounds {{ adjective(s) }}
            <button hlmBtn type="button" size="xs" variant="secondary" class="rounded-full" (click)="pick(s)">Use {{ label(s) }}</button>
            <button hlmBtn type="button" size="icon-xs" variant="ghost" class="rounded-full" aria-label="Dismiss suggestion" (click)="dismissSuggestion()">
              <ng-icon name="lucideX" />
            </button>
          </div>
        }
      </div>

      <div>
        <hlm-input-group class="composer-box h-auto rounded-2xl" [style.--composer-accent]="accent()" [style.--composer-ring]="accentRing()">
          <label class="sr-only" for="composer-input">Message, feeling {{ current().label.toLowerCase() }}</label>
          <textarea
            hlmInputGroupTextarea
            #input
            id="composer-input"
            rows="1"
            class="max-h-40 min-h-11 resize-none"
            [maxLength]="maxLength"
            [value]="text()"
            (input)="onInput($event)"
            (keydown.enter)="onEnter($any($event))"
            (blur)="stoppedTyping.emit()"
            [placeholder]="placeholder()"
            autocomplete="off"
          ></textarea>
          <hlm-input-group-addon align="block-end">
            <span class="text-muted-foreground hidden text-xs md:inline">
              Enter to send · Alt+H/A/S/L to change feeling · Hold send for a one-off
            </span>
            <div class="relative ml-auto" #sendWrap>
              <button
                hlmInputGroupButton
                variant="default"
                size="icon-sm"
                type="button"
                class="size-9 disabled:opacity-35"
                [disabled]="!canSend()"
                aria-label="Send message"
                aria-haspopup="menu"
                [attr.aria-expanded]="holdOpen()"
                hlmTooltip="Hold to send with another feeling"
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
                      #holdItem
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
          </hlm-input-group-addon>
        </hlm-input-group>
      </div>
    </form>
  `,
})
export class ComposerComponent {
  roomName = input('');
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

  onEnter(e: KeyboardEvent): void {
    if (e.shiftKey || e.isComposing) return;
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
