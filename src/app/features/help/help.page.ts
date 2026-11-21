import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HlmKbdImports } from '@spartan-ng/helm/kbd';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { MOODS } from '../../core/moods';
import { PageHeaderComponent } from '../page-header.component';

@Component({
  selector: 'app-help-page',
  imports: [HlmKbdImports, HlmSeparatorImports, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col' },
  template: `
    <app-page-header title="Help" />
    <div class="flex-1 overflow-y-auto">
      <article class="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8 text-sm sm:px-6">
        <section>
          <h2 class="text-base font-medium">Moods</h2>
          <p class="text-muted-foreground mt-1">
            Each message carries a mood, shown as a small dot next to it. Pick the mood in the composer before sending.
          </p>
          <table class="mt-4 w-full">
            <tbody class="divide-y">
              @for (m of moods; track m.id) {
                <tr>
                  <td class="py-2"><span class="flex items-center gap-2"><span class="size-2 rounded-full" [class]="m.dot"></span>{{ m.label }}</span></td>
                  <td class="py-2 text-right"><kbd hlmKbd>Alt {{ m.shortcut }}</kbd></td>
                </tr>
              }
            </tbody>
          </table>
        </section>

        <hlm-separator />

        <section>
          <h2 class="text-base font-medium">Keyboard shortcuts</h2>
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

        <hlm-separator />

        <section class="flex flex-col gap-4">
          <h2 class="text-base font-medium">Messages</h2>
          <div>
            <h3 class="font-medium">Reactions</h3>
            <p class="text-muted-foreground mt-1">Hover a message (tap on touch screens) and choose a mood. You can leave one reaction per message; choose it again to remove it.</p>
          </div>
          <div>
            <h3 class="font-medium">Editing and deleting</h3>
            <p class="text-muted-foreground mt-1">You can edit or delete your own messages. Edited messages are marked, and deleted ones leave a short note in the conversation.</p>
          </div>
        </section>

        <hlm-separator />

        <section class="flex flex-col gap-4">
          <h2 class="text-base font-medium">Conversations</h2>
          <div>
            <h3 class="font-medium">Favorites and archive</h3>
            <p class="text-muted-foreground mt-1">Use the menu on a conversation in the sidebar. Archived conversations still receive messages; a dot next to Archive shows when something is unread.</p>
          </div>
          <div>
            <h3 class="font-medium">Groups and direct messages</h3>
            <p class="text-muted-foreground mt-1">New chat starts a direct message or a group. In a group, use Add people in the header to invite more members.</p>
          </div>
        </section>
      </article>
    </div>
  `,
})
export class HelpPage {
  readonly moods = MOODS;
  readonly shortcuts = [
    ['Send message', 'Enter'],
    ['New line', 'Shift Enter'],
    ['Show shortcuts', '?'],
    ['Close menu or dialog', 'Esc'],
  ];
}
