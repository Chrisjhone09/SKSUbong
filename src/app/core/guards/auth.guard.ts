import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../services/auth.store';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  return (await auth.restore()) || router.createUrlTree(['/sign-in']);
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  return (await auth.restore()) ? router.createUrlTree(['/workspace', auth.landing()]) : true;
};

export const entryGuard: CanActivateFn = async () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  await auth.restore();
  return router.createUrlTree(auth.authenticated() ? ['/workspace', auth.landing()] : ['/sign-in']);
};
