import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ===== INTERFACES =====
export interface SessionEvaluationDTO {
  id?: string;
  intitule: string;
  appelOffreId: string;
  dateDebut: string;
  dateFin: string;
  grilleEvaluationId: string;
  statut?: 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ARCHIVEE';
}

export interface AffectationDTO {
  sessionId: string;
  offreId: string;
  evaluateurId: string;
}

export interface SessionEvaluationResponse {
  id: string;
  intitule: string;
  appelOffre: {
    id: string;
    code: string;
    titre: string;
  };
  dateDebut: string;
  dateFin: string;
  statut: 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ARCHIVEE';
  nbProjets: number;
  nbEvaluateurs: number;
  grilleEvaluation: {
    id: string;
    titre: string;
  };
  projets?: ProjetSessionResponse[];
  evaluateurs?: EvaluateurSessionResponse[];
}

export interface ProjetSessionResponse {
  id: string;
  nom: string;
  notes: number[];
  noteMoyenne: number;
}

export interface EvaluateurSessionResponse {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  disponibilite?: 'EN_ATTENTE' | 'OUI' | 'NON';
  reponduLe?: string;
  nbProjetsAffectes?: number;
}

export interface DisponibiliteResponse {
  id: string;
  sessionId: string;
  evaluateurId: string;
  statut: 'EN_ATTENTE' | 'OUI' | 'NON';
  reponduLe?: string;
  session: {
    id: string;
    nom: string;
    dateDebut: string;
    dateFin: string;
    appelOffre?: {
      id: string;
      code: string;
      titre: string;
    };
  };
}

export interface GrilleEvaluationResponse {
  id: string;
  titre: string;
  description: string;
  dateCreation: string;
  noteMax: number;
  noteMin: number;
  criteres: CritereResponse[];
}

export interface CritereResponse {
  id: string;
  titre: string;
  poids: number;
  sousCriteres: SousCritereResponse[];
}

export interface SousCritereResponse {
  id: string;
  titre: string;
  description: string;
  points: number;
}

export interface CreerSessionRequest {
  intitule: string;
  appelOffreId: string;
  dateDebut: string;
  dateFin: string;
  grilleEvaluationId: string;
  seuilSelection: number;
  projetsIds: string[];
  evaluateursIds: string[];
}

@Injectable({
  providedIn: 'root',
})
export class SessionsEvaluationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/admin/sessions-evaluation`;
  private evaluateursUrl = `${environment.apiBaseUrl}/admin/evaluateurs`;

  /**
   * Récupère les headers d'authentification
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || localStorage.getItem('fpbg.token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    });
  }

  /**
   * Créer une nouvelle session d'évaluation avec affectations
   */
  creerSession(data: CreerSessionRequest): Observable<SessionEvaluationResponse> {
    return this.http.post<SessionEvaluationResponse>(`${this.apiUrl}`, data, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Récupérer toutes les sessions d'évaluation
   */
  obtenirSessions(filtres?: {
    statut?: 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ARCHIVEE';
    appelOffreId?: string;
  }): Observable<SessionEvaluationResponse[]> {
    let url = this.apiUrl;
    const params = new URLSearchParams();

    if (filtres?.statut) params.append('statut', filtres.statut);
    if (filtres?.appelOffreId) params.append('appelOffreId', filtres.appelOffreId);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.http.get<SessionEvaluationResponse[]>(url, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Récupérer une session d'évaluation par ID
   */
  obtenirSessionParId(id: string): Observable<SessionEvaluationResponse> {
    return this.http.get<SessionEvaluationResponse>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Mettre à jour une session d'évaluation
   */
  mettreAJourSession(
    id: string,
    data: Partial<SessionEvaluationDTO>
  ): Observable<SessionEvaluationResponse> {
    return this.http.patch<SessionEvaluationResponse>(`${this.apiUrl}/${id}`, data, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Supprimer une session d'évaluation
   */
  supprimerSession(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Affecter des projets à des évaluateurs pour une session
   */
  affecterProjets(payload: {
    sessionId: string;
    affectations: Array<{
      offreId: string;
      evaluateurId: string;
    }>;
  }): Observable<any> {
    // Transformer le format frontend vers le format backend
    const backendPayload = {
      idSession: payload.sessionId,
      affectations: payload.affectations.map(aff => ({
        idOffre: aff.offreId,
        idEvaluateur: aff.evaluateurId
      }))
    };
    
    return this.http.post(`${this.evaluateursUrl}/affecter`, backendPayload, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Confirmer ou refuser la disponibilité pour une session
   */
  confirmerDisponibilite(sessionId: string, disponible: boolean): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${sessionId}/confirmer-disponibilite`,
      { disponible },
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Retirer une affectation
   */
  retirerAffectation(
    sessionId: string,
    offreId: string,
    evaluateurId: string
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.evaluateursUrl}/desaffecter/${sessionId}/${offreId}/${evaluateurId}`,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  /**
   * Obtenir toutes les grilles d'évaluation
   */
  obtenirGrilles(): Observable<GrilleEvaluationResponse[]> {
    return this.http.get<GrilleEvaluationResponse[]>(`${environment.apiBaseUrl}/grilles-evaluation`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Créer une nouvelle grille d'évaluation
   */
  creerGrille(data: {
    titre: string;
    description: string;
    noteMin: number;
    noteMax: number;
    criteres: Array<{
      titre: string;
      poids: number;
      sousCriteres: Array<{
        titre: string;
        description: string;
        points: number;
      }>;
    }>;
  }): Observable<GrilleEvaluationResponse> {
    return this.http.post<GrilleEvaluationResponse>(
      `${environment.apiBaseUrl}/grilles-evaluation`,
      data,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  /**
   * Modifier une grille d'évaluation
   */
  modifierGrille(id: string, data: {
    titre?: string;
    description?: string;
    noteMin?: number;
    noteMax?: number;
    criteres?: Array<{
      titre: string;
      poids: number;
      sousCriteres: Array<{
        titre: string;
        description: string;
        points: number;
      }>;
    }>;
  }): Observable<GrilleEvaluationResponse> {
    return this.http.put<GrilleEvaluationResponse>(
      `${environment.apiBaseUrl}/grilles-evaluation/${id}`,
      data,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  /**
   * Supprimer une grille d'évaluation
   */
  supprimerGrille(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/grilles-evaluation/${id}`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Récupérer les statistiques d'une session
   */
  obtenirStatistiquesSession(sessionId: string): Observable<{
    nbProjets: number;
    nbEvaluateurs: number;
    nbEvaluationsTerminees: number;
    nbEvaluationsEnCours: number;
    moyenneGenerale: number;
  }> {
    return this.http.get<any>(`${this.apiUrl}/${sessionId}/statistiques`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Changer le statut d'une session
   */
  changerStatutSession(
    sessionId: string,
    statut: 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ARCHIVEE'
  ): Observable<SessionEvaluationResponse> {
    return this.http.patch<SessionEvaluationResponse>(
      `${this.apiUrl}/${sessionId}/statut`,
      { statut },
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  /* ==================== DISPONIBILITÉS (ÉVALUATEUR) ==================== */

  /**
   * [ÉVALUATEUR] Obtenir mes disponibilités en attente
   */
  getMesDisponibilites(): Observable<{ success: boolean; data: DisponibiliteResponse[] }> {
    return this.http.get<{ success: boolean; data: DisponibiliteResponse[] }>(
      `${environment.apiBaseUrl}/sessions-evaluation/disponibilites/mes-disponibilites`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * [ÉVALUATEUR] Répondre à une disponibilité
   */
  repondreDispo(sessionId: string, reponse: 'OUI' | 'NON'): Observable<{ success: boolean; data: any; message: string }> {
    return this.http.post<{ success: boolean; data: any; message: string }>(
      `${environment.apiBaseUrl}/sessions-evaluation/${sessionId}/repondre-disponibilite`,
      { reponse },
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * [ÉVALUATEUR] Obtenir mes affectations (projets à évaluer)
   */
  getMesAffectations(): Observable<any> {
    return this.http.get<any>(
      `${environment.apiBaseUrl}/admin/evaluateurs/mes-affectations`,
      { headers: this.getAuthHeaders() }
    );
  }
}
