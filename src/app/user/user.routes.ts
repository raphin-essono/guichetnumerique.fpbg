// app/user/user.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard'; // ✅ Import correct depuis user/core (CORRECTIONS_AUTH.md)

export const userRoutes: Routes = [
  // Routes publiques (pas de guard)
  {
    path: 'login',
    loadComponent: () => import('./login/login').then((m) => m.Login)
  },
  {
    path: 'register',
    loadComponent: () => import('./registration/registration').then((m) => m.Registration)
  },
  {
    path: 'otp',
    loadComponent: () => import('./otp/otp').then((m) => m.Otp)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./forgot-password/forgot-password').then((m) => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./reset-password/reset-password').then((m) => m.ResetPasswordComponent)
  },

  // Routes protégées par authentification (token requis)
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
    canActivate: [authGuard] // ✅ Vérifie uniquement le token
  },
  {
    path: 'soumission',
    loadComponent: () => import('./form/soumission/soumission').then((m) => m.SubmissionWizard),
    canActivate: [authGuard] // ✅ Maintenant accessible après inscription (CORRECTIONS_AUTH.md)
  },
  {
    path: 'form/recap/:id',
    loadComponent: () => import('./form/recap/recap').then((m) => m.SubmissionRecap),
    canActivate: [authGuard]
  },
  {
    path: 'form/recap',
    redirectTo: 'form/recap/current',
    pathMatch: 'full'
  }
];
