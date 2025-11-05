import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ===== INTERFACES =====

export interface NoteEvaluationDTO {
  idCritere: string;
  valeurPct: number; // 0-100
}

export interface SoumettreEvaluationDTO {
  idSession: string;
  idOffre: string;
  commentaire?: string;
  soumettre?: boolean; // true = soumettre, false = brouillon
  notes: NoteEvaluationDTO[];
}

export interface CritereGrille {
  id: string;
  libelle: string;
  description?: string | null; // Description pour aider l'évaluateur
  poids: number;
  pointsMax: number; // Points max pour ce critère (≥ 1)
}

export interface SectionGrille {
  id: string;
  nom: string;
  poids: number;
  criteres: CritereGrille[];
}

export interface GrilleVersion {
  id: string;
  version: number;
  figeeLe: string | null;
  sections: SectionGrille[];
}

export interface ProjetAnonymise {
  id: string;
  code: string | null;
  titre: string;
  localisation: string;
  groupeCible: string;
  justificationContexte: string;
  objectifs: string;
  resultatsAttendus: string;
  dureeMois: number;
  dateDebutActivites: string;
  dateFinActivites: string;
  resumeActivites: string;
  texteDurabilite: string;
  texteReplication: string | null;
  domaines: string[];
  // Financement
  aFinancement: boolean;
  detailsFinancement: string | null;
  honneurAccepte: boolean;
  activites: Activite[];
  risques: Risque[];
}

export interface Activite {
  id: string;
  titre: string;
  debut: string;
  fin: string;
  resume: string;
  ordre: number;
  sousActivites: SousActivite[];
  lignesBudget: LigneBudget[];
}

export interface SousActivite {
  id: string;
  libelle: string;
  resume: string | null;
  ordre: number;
}

export interface LigneBudget {
  id: string;
  libelle: string;
  type: 'DIRECT' | 'INDIRECT';
  cfa: number;
  pctFpbg: number;
  pctCofin: number;
  ordre: number;
}

export interface Risque {
  id: string;
  description: string;
  mitigation: string;
  ordre: number;
}

export interface SessionInfo {
  id: string;
  nom: string;
  dateDebut: string;
  dateFin: string;
  appelOffre: {
    id: string;
    code: string;
    titre: string;
  } | null;
}

export interface DemandeExtension {
  id: string;
  sessionId: string;
  evaluateurId: string;
  statut: 'EN_ATTENTE' | 'ACCEPTEE' | 'REFUSEE';
  demandeLe: string;
  traiteLe: string | null;
  motif: string | null;
  traitePar: {
    prenom: string;
    nom: string;
  } | null;
}

export interface Extension {
  id: string;
  sessionId: string;
  evaluateurId: string;
  minutes: number;
  accordeeLe: string;
  expireLe: string;
}

export interface EvaluationExistante {
  id: string;
  statut: 'BROUILLON' | 'SOUMISE';
  scorePct: number | null;
  commentaire: string | null;
  soumiseLe: string | null;
  notes: {
    id: string;
    critereId: string;
    valeurPct: number;
  }[];
}

export interface DonneesEvaluationResponse {
  success: boolean;
  data: {
    session: SessionInfo;
    grille: GrilleVersion;
    projet: ProjetAnonymise;
    evaluation: EvaluationExistante | null;
  };
}

@Injectable({
  providedIn: 'root',
})
export class EvaluationService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/evaluateurs`;

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
   * [ÉVALUATEUR] Obtenir les données pour évaluer un projet
   * - Projet anonymisé (sans identité du soumissionnaire)
   * - Grille d'évaluation de la session
   * - Évaluation existante (si brouillon)
   */
  getDonneesEvaluation(sessionId: string, offreId: string): Observable<DonneesEvaluationResponse> {
    const url = `${this.baseUrl}/sessions/${sessionId}/projets/${offreId}/evaluer`;
    console.log('[EvaluationService] getDonneesEvaluation - URL:', url);
    console.log('[EvaluationService] getDonneesEvaluation - Params:', { sessionId, offreId });
    
    return this.http.get<DonneesEvaluationResponse>(url, { headers: this.getAuthHeaders() });
  }

  /**
   * [ÉVALUATEUR] Soumettre ou sauvegarder une évaluation
   */
  soumettreEvaluation(data: SoumettreEvaluationDTO): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/evaluation`,
      data,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * [ÉVALUATEUR] Demander une extension de temps
   */
  demanderExtension(sessionId: string, motif?: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/sessions/${sessionId}/demander-extension`,
      { motif },
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * [ÉVALUATEUR] Vérifier le statut de la demande d'extension
   */
  getDemandeExtension(sessionId: string): Observable<{ success: boolean; data: DemandeExtension | null }> {
    return this.http.get<{ success: boolean; data: DemandeExtension | null }>(
      `${this.baseUrl}/sessions/${sessionId}/demande-extension`,
      { headers: this.getAuthHeaders() }
    );
  }
}
