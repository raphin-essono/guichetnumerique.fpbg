import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Notification {
  id: string;
  message: string;
  contexte: 'SESSION' | 'AFFECTATION' | 'DISPONIBILITE' | 'EXTENSION' | 'RAPPEL' | 'EVALUATION';
  severite: 'INFO' | 'AVERTISSEMENT' | 'CRITIQUE';
  lu: boolean;
  luLe: string | null;
  creeLe: string;
  donnees: {
    sessionId?: string;
    sessionNom?: string;
    evaluateurId?: string;
    dateDebut?: string;
    dateFin?: string;
    nbProjets?: number;
    disponible?: boolean;
    action?: 'confirmer_disponibilite' | 'voir_projets' | 'evaluer' | 'info';
    [key: string]: any;
  };
  envoyePar: {
    nom: string;
    email: string;
  };
}

export interface NotificationsResponse {
  success: boolean;
  data: Notification[];
}

export interface NotificationCountResponse {
  success: boolean;
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/notifications`;

  /**
   * Obtenir toutes les notifications de l'utilisateur connecté
   */
  getMesNotifications(options?: {
    nonLuesUniquement?: boolean;
    contexte?: string;
    limit?: number;
  }): Observable<Notification[]> {
    let params: any = {};

    if (options?.nonLuesUniquement) {
      params.nonLuesUniquement = 'true';
    }
    if (options?.contexte) {
      params.contexte = options.contexte;
    }
    if (options?.limit) {
      params.limit = options.limit.toString();
    }

    return this.http.get<NotificationsResponse>(this.apiUrl, { params })
      .pipe(
        tap(response => console.log('[NotificationsService] Notifications reçues:', response)),
        map(response => response.data)
      );
  }

  /**
   * Compter les notifications non lues
   */
  compterNonLues(): Observable<number> {
    return this.http.get<NotificationCountResponse>(`${this.apiUrl}/count`)
      .pipe(
        map(response => response.count)
      );
  }

  /**
   * Marquer une notification comme lue
   */
  marquerCommeLue(notificationId: string): Observable<Notification> {
    return this.http.patch<{ success: boolean; data: Notification }>(
      `${this.apiUrl}/${notificationId}/lire`,
      {}
    ).pipe(
      tap(() => console.log('[NotificationsService] Notification marquée comme lue:', notificationId)),
      map(response => response.data)
    );
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  marquerToutesCommeLues(): Observable<{ count: number }> {
    return this.http.patch<{ success: boolean; message: string }>(
      `${this.apiUrl}/lire-tout`,
      {}
    ).pipe(
      tap(response => console.log('[NotificationsService] Toutes marquées comme lues:', response)),
      map(response => ({ count: 0 })) // Le backend retourne un message, pas un count
    );
  }

  /**
   * Supprimer une notification
   */
  supprimerNotification(notificationId: string): Observable<void> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/${notificationId}`
    ).pipe(
      tap(() => console.log('[NotificationsService] Notification supprimée:', notificationId)),
      map(() => undefined)
    );
  }

  /**
   * Helper pour obtenir l'icône selon le contexte
   */
  getIconeContexte(contexte: string): string {
    const icones: { [key: string]: string } = {
      'SESSION': '📋',
      'AFFECTATION': '📂',
      'DISPONIBILITE': '📅',
      'EXTENSION': '⏰',
      'RAPPEL': '🔔',
      'EVALUATION': '✍️'
    };
    return icones[contexte] || '📌';
  }

  /**
   * Helper pour obtenir la classe CSS selon la sévérité
   */
  getClasseSeverite(severite: string): string {
    const classes: { [key: string]: string } = {
      'INFO': 'bg-blue-50 border-blue-200 text-blue-800',
      'AVERTISSEMENT': 'bg-amber-50 border-amber-200 text-amber-800',
      'CRITIQUE': 'bg-red-50 border-red-200 text-red-800'
    };
    return classes[severite] || 'bg-slate-50 border-slate-200 text-slate-800';
  }
}
