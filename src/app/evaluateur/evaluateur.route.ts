// app/evaluateur/evaluateur.routes.ts
import { Routes } from '@angular/router';
import { evaluateurGuard } from '../core/evaluateur.guard';

export const evaluateurRoutes: Routes = [
  // Route de login (pas de guard)
  {
    path: 'login',
    loadComponent: () => import('./login/login').then((m) => m.EvaluateurLogin),
  },

  // Routes protégées par authentification évaluateur (token + rôle EVALUATEUR)
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard').then((m) => m.EvaluateurDashboard),
    canActivate: [evaluateurGuard],
  },
  {
    path: 'disponibilites',
    loadComponent: () =>
      import('./disponibilites/disponibilites').then((m) => m.DisponibilitesComponent),
    canActivate: [evaluateurGuard],
  },
  {
    path: 'projets',
    loadComponent: () => import('./projets/projets').then((m) => m.EvaluateurProjets),
    canActivate: [evaluateurGuard],
  },
  {
    path: 'evaluations',
    loadComponent: () => import('./evaluations/evaluations').then((m) => m.EvaluateurEvaluations),
    canActivate: [evaluateurGuard],
  },
  {
    path: 'evaluations/:id',
    loadComponent: () => import('./evaluations/evaluations').then((m) => m.EvaluateurEvaluations),
    canActivate: [evaluateurGuard],
  },
  {
    path: 'aide-support',
    loadComponent: () => import('./aide-support/aide-support').then((m) => m.EvaluateurAideSupport),
    canActivate: [evaluateurGuard],
  },

  // Redirection par défaut
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
];
