// app.routes.ts
import { Routes } from '@angular/router';
import { userRoutes } from './user/user.routes';
import { adminRoutes } from './admin/admin.route';
import { evaluateurRoutes } from './evaluateur/evaluateur.route';

export const routes: Routes = [
  // Accueil publique (landing)
  { path: '', loadComponent: () => import('./user/home/home').then((m) => m.Home) },

  // Pages publiques globales
  { path: 'page404', loadComponent: () => import('./page404/page404').then((m) => m.Page404) },
  {
    path: 'appelaprojet',
    loadComponent: () => import('./appelaprojet/appelaprojet').then((m) => m.Appelaprojet),
  },
  {
    path: 'liste-appels',
    loadComponent: () => import('./liste-appels/liste-appels').then((m) => m.ListeAppels),
  },

  // Routes utilisateur (login, register, dashboard, soumission, etc.)
  // Toutes les routes user sont définies dans userRoutes avec leurs guards
  { path: '', children: userRoutes },

  // Routes admin (login, dashboard, etc.)
  // Toutes les routes admin sont définies dans adminRoutes avec adminGuard
  { path: 'admin', children: adminRoutes },

  // Routes évaluateur (login, dashboard, évaluations, etc.)
  // Toutes les routes évaluateur sont définies dans evaluateurRoutes avec evaluateurGuard
  { path: 'evaluateur', children: evaluateurRoutes },

  // Fallback 404
  { path: '**', redirectTo: 'page404' },
];
