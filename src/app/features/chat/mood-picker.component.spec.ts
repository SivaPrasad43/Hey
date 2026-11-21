import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { APP_ICONS } from '../../core/icons';
import { MoodId } from '../../core/moods';
import { MoodPickerComponent } from './mood-picker.component';

describe('MoodPickerComponent', () => {
  let fixture: ComponentFixture<MoodPickerComponent>;
  let picked: MoodId[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MoodPickerComponent], providers: [provideIcons(APP_ICONS)] }).compileComponents();
    fixture = TestBed.createComponent(MoodPickerComponent);
    fixture.componentRef.setInput('value', 'sad');
    picked = [];
    fixture.componentInstance.changed.subscribe((m) => picked.push(m));
    fixture.detectChanges();
  });

  const trigger = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement;

  it('labels the trigger with the current mood', () => {
    expect(trigger().textContent).toContain('Sad');
    expect(trigger().getAttribute('aria-label')).toBe('Mood: Sad. Change mood');
  });

  it('opens a menu with every mood and emits the picked one', async () => {
    trigger().click();
    fixture.detectChanges();
    await fixture.whenStable();
    const items = Array.from(document.querySelectorAll('[role="menuitemradio"]')) as HTMLElement[];
    expect(items.map((i) => i.textContent!.replace(/\s+/g, ' ').trim().split(' ')[0])).toEqual(['Happy', 'Angry', 'Sad', 'Lovely']);
    items[3].click();
    expect(picked).toEqual(['lovely']);
  });
});
