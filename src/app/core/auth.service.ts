import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  Auth,
  User,
  authState,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from '@angular/fire/auth';
import { FirebaseError } from '@angular/fire/app';
import { toSignal } from '@angular/core/rxjs-interop';
import { UserService } from './user.service';
import { RoomService } from './room.service';
import { ToastService } from './toast.service';

const AUTH_ERRORS: Record<string, string> = {
  'auth/invalid-email': 'That email address doesn’t look right.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/email-already-in-use': 'An account with that email already exists.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
};

export function authErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError && AUTH_ERRORS[err.code]) return AUTH_ERRORS[err.code];
  return 'Something went wrong. Please try again.';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private router = inject(Router);
  private users = inject(UserService);
  private rooms = inject(RoomService);
  private toast = inject(ToastService);

  /** undefined = still resolving, null = signed out */
  readonly firebaseUser = toSignal<User | null>(authState(this.auth));
  /** Display name may be set after account creation; keep a local override. */
  private nameOverride = signal<string | null>(null);

  readonly uid = computed(() => this.firebaseUser()?.uid ?? null);
  readonly displayName = computed(
    () => this.nameOverride() ?? this.firebaseUser()?.displayName ?? this.firebaseUser()?.email?.split('@')[0] ?? 'You',
  );

  private bootstrappedFor: string | null = null;
  /** True while register() runs: it bootstraps itself once the display name is set. */
  private registering = false;
  private session: Promise<void> = Promise.resolve();

  constructor() {
    authState(this.auth).subscribe((user) => {
      if (user && this.bootstrappedFor !== user.uid && !this.registering) {
        this.bootstrappedFor = user.uid;
        this.session = this.bootstrapSession(user);
      }
      if (!user) {
        this.bootstrappedFor = null;
        this.users.stopPresence();
      }
    });
  }

  /** Resolves once the signed-in user's profile and General membership exist. */
  whenSessionReady(): Promise<void> {
    return this.session;
  }

  async login(email: string, password: string): Promise<void> {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    if (this.bootstrappedFor !== cred.user.uid) {
      this.bootstrappedFor = cred.user.uid;
      this.session = this.bootstrapSession(cred.user);
    }
    await this.session;
  }

  async register(email: string, password: string, displayName: string): Promise<void> {
    this.registering = true;
    try {
      const cred = await createUserWithEmailAndPassword(this.auth, email, password);
      await updateProfile(cred.user, { displayName });
      this.nameOverride.set(displayName);
      this.bootstrappedFor = cred.user.uid;
      this.session = this.bootstrapSession(cred.user, displayName);
      await this.session;
    } finally {
      this.registering = false;
    }
  }

  /** Reflect a display-name change made in Settings without waiting for a token refresh. */
  setDisplayName(name: string): void {
    this.nameOverride.set(name);
  }

  resetPassword(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email);
  }

  async logout(): Promise<void> {
    await this.users.markOffline();
    await signOut(this.auth);
    this.nameOverride.set(null);
    await this.router.navigate(['/login']);
  }

  private async bootstrapSession(user: User, nameOverride?: string): Promise<void> {
    const name = nameOverride ?? user.displayName ?? user.email?.split('@')[0] ?? 'Someone';
    try {
      await this.users.ensureProfile(user.uid, name, user.email ?? '');
      await this.rooms.ensureGeneralMembership(user.uid, name);
      this.users.startPresence(user.uid);
    } catch (err) {
      console.error('Session setup failed', err);
      const code = (err as { code?: string })?.code;
      this.toast.error(
        code === 'permission-denied'
          ? 'The database refused access. Deploy firestore.rules to your Firebase project (npm run deploy:rules).'
          : 'Couldn’t finish setting up your session. Check your connection and reload.',
      );
    }
  }
}
