import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HlmKbdImports } from '@spartan-ng/helm/kbd';
import { MOODS } from '../../core/moods';
import { EmotionFaceComponent } from '../../shared/ui/emotion-face.component';
import { PageHeaderComponent } from '../page-header.component';

@Component({
  selector: 'app-help-page',
  imports: [HlmKbdImports, PageHeaderComponent, EmotionFaceComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col' },
  template: `
    <app-page-header title="Help" />
    <div class="flex-1 overflow-y-auto">
      <article class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 text-sm sm:px-6">
        <section class="bg-card ring-foreground/10 shadow-soft rounded-2xl p-6 ring-1 md:p-8">
          <h2 class="text-base font-bold tracking-tight">Feelings</h2>
          <p class="text-muted-foreground mt-1">
            Every message carries a feeling. It tints the message, gives it a face, and decides how it arrives on screen.
            Hover a face to replay it.
          </p>
          <table class="mt-4 w-full">
            <tbody class="divide-y">
              @for (m of moods; track m.id) {
                <tr>
                  <td class="py-2"><span class="flex items-center gap-2"><app-emotion-face [emotion]="m.id" [size]="20" [interactive]="true" />{{ m.label }}</span></td>
                  <td class="text-muted-foreground py-2">{{ motions[m.id] }}</td>
                  <td class="py-2 text-right"><kbd hlmKbd>Alt {{ m.shortcut }}</kbd></td>
                </tr>
              }
            </tbody>
          </table>
        </section>

        <section class="bg-card ring-foreground/10 shadow-soft rounded-2xl p-6 ring-1 md:p-8">
          <h2 class="text-base font-bold tracking-tight">Keyboard shortcuts</h2>
          <table class="mt-4 w-full">
            <tbody class="divide-y">
              @for (row of shortcuts; track row[0]) {
                <tr>
                  <td class="text-muted-foreground py-2">{{ row[0] }}</td>
                  <td class="py-2 text-right"><kbd hlmKbd>{{ row[1] }}</kbd></td>
                </tr>
              }
            </tbody>
          </table>
        </section>

        <section class="bg-card ring-foreground/10 shadow-soft flex flex-col gap-4 rounded-2xl p-6 ring-1 md:p-8">
          <h2 class="text-base font-bold tracking-tight">Choosing a feeling</h2>
          <div>
            <h3 class="font-semibold">Feeling bar</h3>
            <p class="text-muted-foreground mt-1">Pick a feeling above the message box. It stays selected until you change it.</p>
          </div>
          <div>
            <h3 class="font-semibold">Suggestions</h3>
            <p class="text-muted-foreground mt-1">As you type, Hey may suggest a feeling based on your words and emoji. It runs on your device and never changes anything until you choose Use.</p>
          </div>
          <div>
            <h3 class="font-semibold">One-off feeling</h3>
            <p class="text-muted-foreground mt-1">Hold the send button (or right-click it, or press the up arrow on it) to send just this message with a different feeling.</p>
          </div>
        </section>

        <section class="bg-card ring-foreground/10 shadow-soft flex flex-col gap-4 rounded-2xl p-6 ring-1 md:p-8">
          <h2 class="text-base font-bold tracking-tight">The room’s feeling</h2>
          <div>
            <h3 class="font-semibold">Feeling meter</h3>
            <p class="text-muted-foreground mt-1">The meter in the header shows the mix of the last 30 messages. Open it to see the breakdown and show only one feeling.</p>
          </div>
          <div>
            <h3 class="font-semibold">Timeline</h3>
            <p class="text-muted-foreground mt-1">On larger screens, a thin strip on the right shows the feeling of every loaded message. Click a segment to jump to it.</p>
          </div>
        </section>

        <section class="bg-card ring-foreground/10 shadow-soft flex flex-col gap-4 rounded-2xl p-6 ring-1 md:p-8">
          <h2 class="text-base font-bold tracking-tight">Messages</h2>
          <div>
            <h3 class="font-semibold">Reactions</h3>
            <p class="text-muted-foreground mt-1">Right-click a message (or hold it on a phone, or focus it and press Enter) to react, reply, copy, edit or delete. You get one reaction per message; choose it again to remove it.</p>
          </div>
          <div>
            <h3 class="font-semibold">Read receipts</h3>
            <p class="text-muted-foreground mt-1">Your messages show one tick when sent and two when read. In groups you see how many people have read your latest message. Others can see when you've read theirs.</p>
          </div>
          <div>
            <h3 class="font-semibold">Editing and deleting</h3>
            <p class="text-muted-foreground mt-1">You can edit or delete your own messages. Edited messages are marked, and deleted ones leave a short note in the conversation.</p>
          </div>
        </section>

        <section class="bg-card ring-foreground/10 shadow-soft flex flex-col gap-4 rounded-2xl p-6 ring-1 md:p-8">
          <h2 class="text-base font-bold tracking-tight">Conversations</h2>
          <div>
            <h3 class="font-semibold">Favorites and archive</h3>
            <p class="text-muted-foreground mt-1">Use the menu on a conversation in the sidebar. Archived conversations still receive messages; a dot next to Archive shows when something is unread.</p>
          </div>
          <div>
            <h3 class="font-semibold">Groups and direct messages</h3>
            <p class="text-muted-foreground mt-1">New chat starts a direct message or a group. In a group, use Add people in the header to invite more members.</p>
          </div>
        </section>
      </article>
    </div>
  `,
})
export class HelpPage {
  readonly moods = MOODS;
  readonly motions: Record<string, string> = {
    happy: 'Bounces in',
    angry: 'Shakes',
    sad: 'Drifts down slowly',
    lovely: 'Beats like a heart',
  };
  readonly shortcuts = [
    ['Send message', 'Enter'],
    ['New line', 'Shift Enter'],
    ['Show shortcuts', '?'],
    ['Close menu or dialog', 'Esc'],
  ];
}
