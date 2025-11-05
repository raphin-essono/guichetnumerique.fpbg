// app/user/core/user-auth.guard.ts
// Guard basé sur GET /api/account pour valider la session (JWT en cookie).
// Fourni en 2 formes (CanActivate et CanMatch) pour s'adapter à ta config de routes.
/*
import { inject } from '@angular/core';
import { Router, UrlTree, CanActivateFn, CanMatchFn, Route, UrlSegment } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

function checkSession(): any {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.me().pipe(
    map(() => true),
    catchError((): UrlTree => router.createUrlTree(['/login']))
  );
}

// À utiliser avec `canActivate: [userAuthGuard]`
export const userAuthGuard: CanActivateFn = () => checkSession();

// À utiliser avec `canMatch: [userCanMatchGuard]`
export const userCanMatchGuard: CanMatchFn = (
  route: Route,
  segments: UrlSegment[]
) => checkSession();
*/
