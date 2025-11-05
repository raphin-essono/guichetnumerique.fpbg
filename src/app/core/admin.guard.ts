import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Guard admin simplifié et robuste
 *
 * 1. Vérifie si l'utilisateur a un token local
 * 2. Vérifie que l'utilisateur a le rôle ADMINISTRATEUR
 * 3. Si non authentifié ou rôle insuffisant, redirige vers /admin/login
 *
 * Note : La validation du token avec le backend se fait via l'intercepteur HTTP
 * qui gère automatiquement les tokens expirés (401) et déconnecte l'utilisateur
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  console.log('🔐 [ADMIN GUARD] Vérification accès:', state.url);

  // Étape 1 : Vérifier si l'utilisateur est connecté (token présent)
  if (!auth.isLoggedIn()) {
    console.log('❌ [ADMIN GUARD] Pas de token → /admin/login');
    return router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } });
  }

  // Étape 2 : Vérifier le rôle ADMINISTRATEUR
  const role = localStorage.getItem('role');
  const user = auth.user();

  console.log('🔍 [ADMIN GUARD] Rôle:', role, '| User role:', user?.role);

  if (role !== 'ADMINISTRATEUR' && user?.role !== 'ADMINISTRATEUR') {
    console.log('❌ [ADMIN GUARD] Rôle insuffisant → /admin/login');
    return router.createUrlTree(['/admin/login']);
  }

  console.log('✅ [ADMIN GUARD] Accès autorisé pour administrateur');
  return true;
};
