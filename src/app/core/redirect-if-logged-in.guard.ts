import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Guard qui redirige les utilisateurs déjà connectés vers leur dashboard
 * Empêche l'accès aux pages de login si déjà authentifié
 */
export const redirectIfLoggedIn: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  console.log('🔄 Redirect Guard - Vérification si déjà connecté...');

  // Si pas connecté, laisser accéder à la page de login
  if (!auth.isLoggedIn()) {
    console.log('✅ Redirect Guard - Pas connecté, accès autorisé');
    return true;
  }

  // Déjà connecté, rediriger vers le dashboard approprié
  const role = localStorage.getItem('role');
  const user = auth.user();

  console.log('🔍 Redirect Guard - Déjà connecté, Rôle:', role, '- User:', user);

  // Déterminer la redirection basée sur le rôle
  let redirectUrl = '/dashboard'; // Par défaut
  if (role === 'ADMINISTRATEUR' || user?.role === 'ADMINISTRATEUR') {
    redirectUrl = '/admin/dashboard';
  }

  console.log('🎯 Redirect Guard - Redirection vers:', redirectUrl);
  return router.createUrlTree([redirectUrl]);
};
