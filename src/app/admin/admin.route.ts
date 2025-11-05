// app/admin/admin.routes.ts
import { Routes } from '@angular/router';
import { adminGuard } from '../core/admin.guard';

export const adminRoutes: Routes = [
  // Route de login (pas de guard)
  {
    path: 'login',
    loadComponent: () => import('./login/login').then((m) => m.Login),
  },

  // Routes protégées par authentification admin (token + rôle ADMINISTRATEUR)
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
    canActivate: [adminGuard], // ✅ Vérifie token + rôle ADMINISTRATEUR
  },
  {
    path: 'projets',
    loadComponent: () => import('./projets/projets').then((m) => m.Projets),
    canActivate: [adminGuard], // ✅ Vérifie token + rôle ADMINISTRATEUR
  },
  {
    path: 'evaluations',
    loadComponent: () => import('./evaluations/evaluations').then((m) => m.Evaluations),
    canActivate: [adminGuard], // ✅ Vérifie token + rôle ADMINISTRATEUR
  },
  {
    path: 'statistiques',
    loadComponent: () => import('./statistiques/statistiques').then((m) => m.Statistiques),
    canActivate: [adminGuard], // ✅ Vérifie token + rôle ADMINISTRATEUR
  },
  {
    path: 'evaluateurs',
    loadComponent: () => import('./evaluateurs/evaluateurs').then((m) => m.Evaluateurs),
    canActivate: [adminGuard], // ✅ Vérifie token + rôle ADMINISTRATEUR
  },
  {
    path: 'historique',
    loadComponent: () => import('./historique/historique').then((m) => m.Historique),
    canActivate: [adminGuard], // ✅ Vérifie token + rôle ADMINISTRATEUR
  },
  {
    path: 'form/recap/:id',
    loadComponent: () => import('./recap/recap').then((m) => m.SubmissionRecap),
    canActivate: [adminGuard],
  },
  {
    path: 'form/recap',
    redirectTo: 'form/recap/current',
    pathMatch: 'full',
  },
  // Routes pour la gestion des appels à projets
  {
    path: 'appels-projets',
    loadComponent: () => import('./appels-projets/gestion-aap').then((m) => m.GestionAAPComponent),
    canActivate: [adminGuard], // ✅ Vérifie token + rôle ADMINISTRATEUR
  },
  {
    path: 'appels-projets/wizard',
    loadComponent: () => import('./appels-projets/wizard-aap').then((m) => m.WizardAAPComponent),
    canActivate: [adminGuard], // ✅ Vérifie token + rôle ADMINISTRATEUR
  },
];
