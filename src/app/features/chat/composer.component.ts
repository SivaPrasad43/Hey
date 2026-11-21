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
import { MoodId, moodForShortcut } from '../../core/moods';
import { NgIcon } from '@ng-icons/core';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmKbdImports } from '@spartan-ng/helm/kbd';
import { ChatStateService } from './chat-state.service';
import { MoodPickerComponent } from './mood-picker.component';

const MAX_LINES = 5;
const MAX_LENGTH = 2000;

@Component({
    selector: 'app-composer',
    imports: [NgIcon, HlmInputGroupImports, HlmKbdImports, MoodPickerComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'block',
        '(document:keydown)': 'onGlobalKey($event)',
    },
    template: `
    <form class="mx-auto w-full max-w-3xl" (submit)="$event.preventDefault(); submit()">
      <hlm-input-group>
        <label class="sr-only" for="composer-input">Message</label>
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
          <app-mood-picker [value]="state.mood()" (changed)="setMood($event)" />
          <span class="text-muted-foreground ml-auto hidden text-xs md:inline">
            <kbd hlmKbd>Enter</kbd> to send, <kbd hlmKbd>Shift Enter</kbd> for a new line
          </span>
          <button
            hlmInputGroupButton
            variant="default"
            size="icon-sm"
            type="submit"
            class="ml-auto rounded-md md:ml-2"
            [disabled]="!canSend()"
            aria-label="Send message"
          >
            <ng-icon name="lucideSendHorizontal" />
          </button>
        </hlm-input-group-addon>
      </hlm-input-group>
    </form>
  `
})
export class ComposerComponent {
  roomName = input('');
  send = output<{ text: string; mood: MoodId }>();
  typing = output<void>();
  stoppedTyping = output<void>();

  readonly maxLength = MAX_LENGTH;
  state = inject(ChatStateService);
  text = signal('');
  canSend = computed(() => this.text().trim().length > 0);
  placeholder = computed(() => (this.roomName() ? `Message ${this.roomName()}` : 'Write a message'));

  private textarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('input');

  setMood(id: MoodId): void {
    this.state.setMood(id);
  }

  focus(): void {
    this.textarea().nativeElement.focus();
  }

  onInput(e: Event): void {
    const el = e.target as HTMLTextAreaElement;
    this.text.set(el.value);
    this.resize();
    if (el.value.trim()) this.typing.emit();
    else this.stoppedTyping.emit();
  }

  onEnter(e: KeyboardEvent): void {
    if (e.shiftKey || e.isComposing) return;
    e.preventDefault();
    this.submit();
  }

  submit(): void {
    const text = this.text().trim();
    if (!text) return;
    this.send.emit({ text, mood: this.state.mood() });
    this.text.set('');
    this.textarea().nativeElement.value = '';
    this.resize();
    this.stoppedTyping.emit();
    this.focus();
  }

  onGlobalKey(e: KeyboardEvent): void {
    const mood = moodForShortcut(e);
    if (mood) {
      e.preventDefault();
      this.setMood(mood.id);
    }
  }

  private resize(): void {
    const el = this.textarea().nativeElement;
    el.style.height = 'auto';
    const max = 24 * MAX_LINES + 20;
    el.style.height = Math.min(el.scrollHeight + 4, max) + 'px';
    el.style.overflowY = el.scrollHeight + 4 > max ? 'auto' : 'hidden';
  }
}
