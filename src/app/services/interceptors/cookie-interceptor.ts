import { Injectable, inject } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class CookieInterceptor implements HttpInterceptor {
  private auth = inject(AuthService);
  private router = inject(Router);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // ✅ TOUJOURS lire le token DIRECTEMENT depuis localStorage
    // pour garantir qu'on utilise le token le plus récent
    // (évite les problèmes de synchronisation avec les signals Angular)
    const token = localStorage.getItem('token') || localStorage.getItem('fpbg.token') || null;

    // Debug: Afficher un extrait du token utilisé (seulement en dev)
    if (token && (req.url.includes('/api/sondage') || req.url.includes('/api/aap'))) {
      console.log('🔑 [Interceptor] Token utilisé pour', req.url, ':', token.substring(0, 30) + '...');
    }

    // Cloner la requête et ajouter les headers nécessaires
    let clonedRequest = req.clone({
      withCredentials: true
    });

    // Ajouter le token Bearer si disponible
    if (token) {
      clonedRequest = clonedRequest.clone({
        setHeaders: {
          'Authorization': `Bearer ${token}`
        }
      });
    } else {
      console.warn('⚠️ [Interceptor] Aucun token disponible pour', req.url);
    }

    return next.handle(clonedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        // ✅ Ne déconnecter que sur les routes d'authentification (/auth/me, /auth/login, etc.)
        // Pour les autres routes, on laisse passer l'erreur sans déconnecter
        if ((error.status === 401 || error.status === 403) &&
            (req.url.includes('/auth/me') || req.url.includes('/auth/login') || req.url.endsWith('/me'))) {
          console.warn('Session expirée ou non autorisée pour:', req.url);

          // ✅ Seulement déconnecter si on n'est pas déjà sur une page de login
          const currentUrl = this.router.url;
          if (!currentUrl.includes('/login') && !currentUrl.includes('/register')) {
            this.auth.logout();

            // ✅ Redirection intelligente basée sur le rôle
            const isAdmin = localStorage.getItem('role') === 'ADMINISTRATEUR';
            this.router.navigate([isAdmin ? '/admin/login' : '/login']);
          }
        }
        return throwError(() => error);
      })
    );
  }
}
