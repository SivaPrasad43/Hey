import { Injectable } from '@angular/core';
import { toast } from '@spartan-ng/brain/sonner';

/** Thin wrapper over sonner so call sites stay framework-agnostic. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  show(text: string): void {
    toast(text);
  }
  success(text: string): void {
    toast.success(text);
  }
  error(text: string): void {
    toast.error(text);
  }
}
