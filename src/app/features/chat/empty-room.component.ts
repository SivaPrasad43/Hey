import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { NewChatService } from './new-chat-dialog.component';

@Component({
  selector: 'app-empty-room',
  imports: [NgIcon, HlmButtonImports, HlmEmptyImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 items-center justify-center p-6' },
  template: `
    <hlm-empty>
      <hlm-empty-header>
        <hlm-empty-media variant="icon"><ng-icon name="lucideMessageSquare" /></hlm-empty-media>
        <h2 hlmEmptyTitle>No conversation selected</h2>
        <p hlmEmptyDescription>Choose a conversation from the sidebar or start a new one.</p>
      </hlm-empty-header>
      <hlm-empty-content>
        <button hlmBtn variant="outline" size="sm" (click)="newChat.open('dm')"><ng-icon name="lucidePlus" /> New chat</button>
      </hlm-empty-content>
    </hlm-empty>
  `,
})
export class EmptyRoomComponent {
  newChat = inject(NewChatService);
}
