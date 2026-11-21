import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { APP_ICONS } from '../../core/icons';
import { ChatStateService } from './chat-state.service';
import { ComposerComponent } from './composer.component';

describe('ComposerComponent emotion bar', () => {
  let fixture: ComponentFixture<ComposerComponent>;
  let state: ChatStateService;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    localStorage.removeItem('hey-mood');
    await TestBed.configureTestingModule({ imports: [ComposerComponent], providers: [provideIcons(APP_ICONS)] }).compileComponents();
    fixture = TestBed.createComponent(ComposerComponent);
    state = TestBed.inject(ChatStateService);
    state.setMood('happy');
    fixture.detectChanges();
  });

  it('is a radio group that follows arrow keys', () => {
    const group = el().querySelector('[role="radiogroup"]') as HTMLElement;
    expect(el().querySelectorAll('[role="radio"]').length).toBe(4);
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(state.mood()).toBe('angry');
    expect(el().querySelector('[role="radio"][aria-checked="true"]')!.textContent).toContain('Angry');
  });

  it('suggests a feeling and applies it on Use', fakeAsync(() => {
    const ta = el().querySelector('textarea') as HTMLTextAreaElement;
    ta.value = 'I am so sorry, really sad today';
    ta.dispatchEvent(new Event('input'));
    tick(450);
    fixture.detectChanges();
    const status = el().querySelector('[role="status"]') as HTMLElement;
    expect(status.textContent).toContain('Sounds sad');
    (Array.from(status.querySelectorAll('button')).find((b) => b.textContent!.includes('Use')) as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(state.mood()).toBe('sad');
    expect(el().querySelector('[role="status"]')).toBeNull();
    tick(2000);
  }));

  it('sends once with a held feeling without changing the selection', () => {
    const sent: { text: string; mood: string }[] = [];
    fixture.componentInstance.send.subscribe((v) => sent.push(v));
    const ta = el().querySelector('textarea') as HTMLTextAreaElement;
    ta.value = 'hello';
    ta.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const sendBtn = el().querySelector('[aria-label="Send message"]') as HTMLButtonElement;
    sendBtn.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    const items = Array.from(el().querySelectorAll('[role="menuitem"]')) as HTMLButtonElement[];
    expect(items.length).toBe(4);
    items[3].click();
    fixture.detectChanges();
    expect(sent).toEqual([{ text: 'hello', mood: 'lovely' }]);
    expect(state.mood()).toBe('happy');
  });
});
