import { TestBed } from '@angular/core/testing';
import { MOODS } from '../../core/moods';
import { EmotionFaceComponent } from './emotion-face.component';

describe('EmotionFaceComponent', () => {
  it('renders a distinct, decorative face per mood', () => {
    const shapes = new Set<string>();
    for (const m of MOODS) {
      const f = TestBed.createComponent(EmotionFaceComponent);
      f.componentRef.setInput('emotion', m.id);
      f.detectChanges();
      const host = f.nativeElement as HTMLElement;
      expect(host.getAttribute('aria-hidden')).toBe('true');
      expect(host.classList).toContain('face-' + m.id);
      expect(host.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 32 32');
      shapes.add(host.querySelector('svg')!.innerHTML);
    }
    expect(shapes.size).toBe(MOODS.length);
  });

  it('plays its motion when asked', async () => {
    const f = TestBed.createComponent(EmotionFaceComponent);
    f.componentRef.setInput('emotion', 'angry');
    f.detectChanges();
    f.componentRef.setInput('play', 1);
    f.detectChanges();
    await new Promise((r) => setTimeout(r, 40));
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).classList).toContain('playing');
  });
});
