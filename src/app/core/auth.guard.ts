import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { from, map, of, switchMap, take } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  return authState(inject(Auth)).pipe(
    take(1),
    // Wait for profile + General membership so the first screen never hits permission errors.
    switchMap((user) => (user ? from(auth.whenSessionReady()).pipe(map(() => true)) : of(router.createUrlTree(['/login'])))),
  );
};

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  return authState(inject(Auth)).pipe(
    take(1),
    map((user) => (user ? router.createUrlTree(['/chat']) : true)),
  );
};
