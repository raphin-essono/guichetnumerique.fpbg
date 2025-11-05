import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Notification } from './notifications.service';

export interface DashboardStats {
  notificationsNonLues: number;
  disponibilitesEnAttente: number;
  sessionsEnCours: number;
  // ✅ Sidebar : Projets des sessions actives uniquement
  projetsSessionsActives?: number;
  projetsSessionsActivesEvalues?: number;
  // ✅ Corps : TOUS les projets (toutes sessions)
  projetsAEvaluer: number;
  projetsEvalues: number;
  totalProjets: number;
}

export interface DisponibiliteEnAttente {
  sessionId: string;
  sessionNom: string;
  dateDebut: string;
  dateFin: string;
}

export interface SessionEnCours {
  session: {
    id: string;
    nom: string;
    dateDebut: string;
    dateFin: string;
    etat: string;
  };
  projets: ProjetAttribue[];
  nbProjetsTotal: number;
  nbProjetsEvalues: number;
}

export interface AppelProjet {
  id: string;
  code: string;
  titre: string;
  isActive?: boolean;
  dateDebut?: string;
  dateFin?: string;
}

export interface ProjetAttribue {
  id: string;
  titre: string;
  statut: 'EN_ATTENTE' | 'EN_COURS' | 'SOUMISE' | 'ANNULEE';
  sessionId?: string; // ✅ AJOUTÉ
  sessionNom?: string; // ✅ AJOUTÉ
  affectationId?: string; // ✅ AJOUTÉ
  appelProjets?: AppelProjet | null;
}

export interface SessionAVenir {
  id: string;
  nom: string;
  dateDebut: string;
  dateFin: string;
}

export interface VueEnsemble {
  stats: DashboardStats;
  notifications: Notification[];
  disponibilitesEnAttente: DisponibiliteEnAttente[];
  sessionsEnCours: SessionEnCours[];
  tousProjets: ProjetAttribue[]; // ✅ AJOUTÉ : Tous les projets (toutes sessions)
  sessionsAVenir: SessionAVenir[];
  appelsProjets: AppelProjet[];
}

export interface GrilleSection {
  id: string;
  nom: string;
  poids: number;
  criteres: GrilleCritere[];
}

export interface GrilleCritere {
  id: string;
  libelle: string;
  poids: number;
  pointsMax: number;
}

export interface GrilleEvaluation {
  id: string;
  nom: string;
  sections: GrilleSection[];
}

export interface SessionDetails {
  session: {
    id: string;
    nom: string;
    dateDebut: string;
    dateFin: string;
    etat: string;
    seuilSelection: number;
  };
  grilleEvaluation: GrilleEvaluation;
  projets: ProjetAttribue[];
  disponibilite: {
    statut: 'EN_ATTENTE' | 'OUI' | 'NON';
    reponduLe: string | null;
  };
}

@Injectable({
  providedIn: 'root'
})
export class EvaluateurDashboardService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/evaluateur`;

  /**
   * Obtenir la vue d'ensemble du dashboard
   */
  getVueEnsemble(): Observable<VueEnsemble> {
    return this.http.get<{ success: boolean; data: VueEnsemble }>(
      `${this.apiUrl}/dashboard`
    ).pipe(
      tap(response => console.log('[EvaluateurDashboard] Vue d\'ensemble:', response)),
      map(response => response.data)
    );
  }

  /**
   * Obtenir les détails d'une session
   */
  getSessionDetails(sessionId: string): Observable<SessionDetails> {
    return this.http.get<{ success: boolean; data: SessionDetails }>(
      `${this.apiUrl}/sessions/${sessionId}`
    ).pipe(
      tap(response => console.log('[EvaluateurDashboard] Détails session:', response)),
      map(response => response.data)
    );
  }

  /**
   * Confirmer la disponibilité pour une session
   */
  confirmerDisponibilite(sessionId: string, disponible: boolean): Observable<any> {
    // ✅ Le backend utilise l'utilisateur connecté depuis le token
    // Pas besoin d'envoyer evaluateurId
    return this.http.post<any>(
      `${environment.apiBaseUrl}/admin/sessions-evaluation/${sessionId}/confirmer-disponibilite`,
      { disponible }
    ).pipe(
      tap(response => console.log('[EvaluateurDashboard] Disponibilité confirmée:', response))
    );
  }

  /**
   * Helper pour formater les dates
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(date);
  }

  /**
   * Helper pour formater les dates avec heure
   */
  formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  /**
   * Helper pour obtenir la classe CSS du statut de projet
   */
  getStatutProjetClass(statut: string): string {
    const classes: { [key: string]: string } = {
      'EN_ATTENTE': 'bg-amber-100 text-amber-800 border-amber-200',
      'EN_COURS': 'bg-blue-100 text-blue-800 border-blue-200',
      'SOUMISE': 'bg-green-100 text-green-800 border-green-200',
      'ANNULEE': 'bg-slate-100 text-slate-800 border-slate-200'
    };
    return classes[statut] || 'bg-slate-100 text-slate-800 border-slate-200';
  }

  /**
   * Helper pour obtenir le libellé du statut de projet
   */
  getStatutProjetLibelle(statut: string): string {
    const libelles: { [key: string]: string } = {
      'EN_ATTENTE': 'À évaluer',
      'EN_COURS': 'En cours',
      'SOUMISE': 'Évalué',
      'ANNULEE': 'Annulé'
    };
    return libelles[statut] || statut;
  }

  /**
   * Helper pour calculer le pourcentage de progression
   */
  calculerProgression(nbEvalues: number, nbTotal: number): number {
    if (nbTotal === 0) return 0;
    return Math.round((nbEvalues / nbTotal) * 100);
  }
}
