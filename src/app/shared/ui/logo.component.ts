import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Hey logo: a speech bubble with a face whose smile is made of the four feelings
 * (happy, angry, sad, lovely). The bubble follows `currentColor`, the face punches through
 * with the page background, so it adapts to light and dark themes.
 */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-2 select-none' },
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      [attr.role]="wordmark() ? null : 'img'"
      [attr.aria-label]="wordmark() ? null : 'Hey'"
      [attr.aria-hidden]="wordmark() ? 'true' : null"
      class="shrink-0"
    >
      <path d="M22 6h20c11 0 16 5 16 16v10c0 11-5 16-16 16H27.5l-10.2 8.6c-1.5 1.3-3.7-.1-3.2-2l1.5-6.9C9.5 45.5 6 40.9 6 32V22C6 11 11 6 22 6Z" fill="currentColor"/><circle cx="24.5" cy="21" r="3.6" fill="var(--logo-face, var(--background))"/><circle cx="39.5" cy="21" r="3.6" fill="var(--logo-face, var(--background))"/><g fill="none" stroke-width="4.4" stroke-linecap="round"><path d="M19.60 30.01A13.2 13.2 0 0 0 22.35 34.50" stroke="#F5A524"/><path d="M25.20 36.81A13.2 13.2 0 0 0 30.16 38.57" stroke="#EF4444"/><path d="M33.84 38.57A13.2 13.2 0 0 0 38.80 36.81" stroke="#3B82F6"/><path d="M41.65 34.50A13.2 13.2 0 0 0 44.40 30.01" stroke="#EC4899"/></g>
    </svg>
    @if (wordmark()) {
      <span class="font-bold tracking-[-0.04em]" [style.font-size.px]="size() * 0.78" [style.line-height]="1">hey</span>
    }
  `,
})
export class LogoComponent {
  size = input(28);
  /** Show the "hey" wordmark next to the mark. */
  wordmark = input(true);
}
