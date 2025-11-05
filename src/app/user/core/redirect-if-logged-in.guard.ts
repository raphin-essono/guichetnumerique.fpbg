// core/redirect-if-logged-in.guard.ts
import { CanMatchFn, Router, UrlSegment } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const redirectIfLoggedIn: CanMatchFn = (route, segs: UrlSegment[]) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Laisse passer si pas connecté
  if (!auth.isAuthenticated()) return true;

  // Déjà connecté → destination selon onboarding
  const onboardingDone = localStorage.getItem('onboarding_done') === '1';
  const path = segs.map(s => s.path).join('/');

  // Laisse passer /otp uniquement si pas d'access_token (rare). Si connecté, on redirige.
  if (path === 'otp') {
    router.navigate([onboardingDone ? '/dashboard' : '/form']);
    return false;
  }

  router.navigate([onboardingDone ? '/dashboard' : '/form']);
  return false;
};
