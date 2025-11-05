import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Guard évaluateur
 *
 * 1. Vérifie si l'utilisateur a un token local
 * 2. Vérifie que l'utilisateur a le rôle EVALUATEUR
 * 3. Si non authentifié ou rôle insuffisant, redirige vers /evaluateur/login
 */
export const evaluateurGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  console.log('🔐 [EVALUATEUR GUARD] Vérification accès:', state.url);

  if (!auth.isLoggedIn()) {
    console.log('❌ [EVALUATEUR GUARD] Pas de token → /evaluateur/login');
    return router.createUrlTree(['/evaluateur/login'], { queryParams: { returnUrl: state.url } });
  }

  const role = localStorage.getItem('role');
  const user = auth.user();

  console.log('🔍 [EVALUATEUR GUARD] Rôle:', role, '| User role:', user?.role);

  if (role !== 'EVALUATEUR' && user?.role !== 'EVALUATEUR') {
    console.log('❌ [EVALUATEUR GUARD] Rôle insuffisant → /evaluateur/login');
    return router.createUrlTree(['/evaluateur/login']);
  }

  console.log('✅ [EVALUATEUR GUARD] Accès autorisé pour évaluateur');
  return true;
};