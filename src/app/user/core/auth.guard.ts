// app/user/core/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Guard d'authentification simplifié et robuste
 *
 * Vérifie si l'utilisateur est authentifié (token + account présents)
 * Si non authentifié, redirige vers /login
 *
 * Note : La validation du token avec le backend se fait via l'intercepteur HTTP
 * qui gère automatiquement les tokens expirés (401) et déconnecte l'utilisateur
 */
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  console.log('🔐 [AUTH GUARD] Vérification accès:', state.url);

  // Vérifier si l'utilisateur a un token ET un compte local
  if (!auth.isAuthenticated()) {
    console.log('🚫 [AUTH GUARD] Non authentifié → redirection /login');
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  console.log('✅ [AUTH GUARD] Accès autorisé : utilisateur authentifié');
  return true;
};
