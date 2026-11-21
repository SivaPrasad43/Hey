import { TestBed } from '@angular/core/testing';
import { Timestamp } from '@angular/fire/firestore';
import { provideIcons } from '@ng-icons/core';
import { APP_ICONS } from '../../core/icons';
import { MessageGroupComponent } from './message-group.component';
import { buildRows } from './message-rows';

function render(senderId: string) {
  TestBed.configureTestingModule({ imports: [MessageGroupComponent], providers: [provideIcons(APP_ICONS)] });
  const f = TestBed.createComponent(MessageGroupComponent);
  const [, run] = buildRows(
    [{ id: 'm1', type: 'text', text: 'hey', senderId, senderName: senderId, mood: 'sad', createdAt: Timestamp.now() }],
    'me',
  );
  f.componentRef.setInput('run', run);
  f.componentRef.setInput('meUid', 'me');
  f.detectChanges();
  return f.nativeElement as HTMLElement;
}

describe('MessageGroupComponent bubbles', () => {
  it('puts your messages on the right, filled with the feeling', () => {
    const el = render('me');
    expect(el.querySelector('article')!.classList).toContain('justify-end');
    const bubble = el.querySelector('[data-mid] .rounded-2xl') as HTMLElement;
    expect(bubble.className).toContain('bg-mood-sad-fill');
    expect(bubble.className).toContain('text-on-fill');
    expect(el.querySelector('[aria-label="Sent"]')).not.toBeNull();
  });

  it('puts other people on the left with a white bubble', () => {
    const el = render('bob');
    expect(el.querySelector('article')!.classList).not.toContain('justify-end');
    const bubble = el.querySelector('[data-mid] .rounded-2xl') as HTMLElement;
    expect(bubble.className).toContain('bg-card');
    expect(bubble.className).not.toContain('-fill');
    expect(el.querySelector('[aria-label="Sent"]')).toBeNull();
  });
});
