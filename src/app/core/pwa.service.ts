import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { toast } from '@spartan-ng/brain/sonner';

/** Chrome/Edge/Android fire this before showing their own install UI. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallMode = 'prompt' | 'ios' | 'installed' | 'unsupported';

const UPDATE_CHECK_MS = 30 * 60 * 1000;

/**
 * Install-as-app support: keeps the browser's deferred install prompt,
 * knows when we already run standalone, and offers a reload when a new
 * version of the service worker is ready.
 */
@Injectable({ providedIn: 'root' })
export class PwaService {
  private readonly sw = inject(SwUpdate);
  private deferred: BeforeInstallPromptEvent | null = null;

  private readonly hasPrompt = signal(false);
  private readonly standalone = signal(isStandalone());

  readonly mode = computed<InstallMode>(() => {
    if (this.standalone()) return 'installed';
    if (this.hasPrompt()) return 'prompt';
    if (isIos()) return 'ios';
    return 'unsupported';
  });
  /** True when we can show an "Install app" action. */
  readonly canInstall = computed(() => this.mode() === 'prompt' || this.mode() === 'ios');

  constructor() {
    if (typeof window === 'undefined') return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      this.deferred = e as BeforeInstallPromptEvent;
      this.hasPrompt.set(true);
    };
    const onInstalled = () => {
      this.deferred = null;
      this.hasPrompt.set(false);
      this.standalone.set(true);
      toast.success('Hey is installed. Find it with your other apps.');
    };
    const media = matchMedia('(display-mode: standalone)');
    const onMedia = () => this.standalone.set(isStandalone());

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    media.addEventListener('change', onMedia);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      media.removeEventListener('change', onMedia);
    });

    this.watchUpdates();
  }

  /** Shows the browser install dialog. Resolves true if the person accepted. */
  async install(): Promise<boolean> {
    const e = this.deferred;
    if (!e) return false;
    await e.prompt();
    const { outcome } = await e.userChoice;
    // A prompt can only be used once.
    this.deferred = null;
    this.hasPrompt.set(false);
    return outcome === 'accepted';
  }

  private watchUpdates(): void {
    if (!this.sw.isEnabled) return;
    this.sw.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() =>
        toast('A new version of Hey is ready.', {
          duration: Infinity,
          action: { label: 'Reload', onClick: () => document.location.reload() },
        }),
      );
    this.sw.unrecoverable.subscribe(() =>
      toast.error('Hey needs a reload to keep working.', {
        duration: Infinity,
        action: { label: 'Reload', onClick: () => document.location.reload() },
      }),
    );
    // Long-lived tabs and installed apps rarely navigate, so poll now and then.
    setInterval(() => this.sw.checkForUpdate().catch(() => undefined), UPDATE_CHECK_MS);
  }
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function isIos(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent, touchPoints = typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints): boolean {
  // iPadOS reports itself as a Mac, so also check for touch.
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && touchPoints > 1);
}
