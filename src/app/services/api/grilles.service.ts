import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ===== INTERFACES =====

export interface CritereDTO {
  libelle: string;
  description?: string;
  poids: number;
  pointsMax: number;
}

export interface SectionDTO {
  nom: string;
  poids: number;
  criteres: CritereDTO[];
}

export interface CreerGrilleDTO {
  nom: string;
  estDefaut?: boolean;
  sections: SectionDTO[];
}

export interface ModifierGrilleDTO {
  nom?: string;
  sections?: SectionDTO[];
}

export interface CritereGrille {
  id: string;
  libelle: string;
  description?: string | null;
  poids: number;
  pointsMax: number;
}

export interface SectionGrille {
  id: string;
  nom: string;
  poids: number;
  criteres: CritereGrille[];
}

export interface GrilleVersion {
  id: string;
  grilleId: string;
  version: number;
  figeeLe: string | null;
  sections: SectionGrille[];
  noteMaxCalculee: number; // Calculé par le backend
}

export interface GrilleEvaluation {
  id: string;
  nom: string;
  estDefaut: boolean;
  noteMin: number;
  noteMax: number;
  creeLe: string;
  versions: GrilleVersion[];
}

@Injectable({
  providedIn: 'root'
})
export class GrillesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/grilles-evaluation`;

  /**
   * Créer une nouvelle grille d'évaluation
   */
  creerGrille(data: CreerGrilleDTO): Observable<GrilleEvaluation> {
    return this.http.post<GrilleEvaluation>(this.apiUrl, data);
  }

  /**
   * Lister toutes les grilles d'évaluation
   */
  listerGrilles(): Observable<GrilleEvaluation[]> {
    return this.http.get<GrilleEvaluation[]>(this.apiUrl);
  }

  /**
   * Récupérer une grille complète avec toutes ses versions
   */
  getGrille(grilleId: string): Observable<GrilleEvaluation> {
    return this.http.get<GrilleEvaluation>(`${this.apiUrl}/${grilleId}`);
  }

  /**
   * Récupérer une version spécifique d'une grille
   */
  getVersion(grilleId: string, versionId: string): Observable<GrilleVersion> {
    return this.http.get<GrilleVersion>(`${this.apiUrl}/${grilleId}/versions/${versionId}`);
  }

  /**
   * Modifier une version (seulement si non figée)
   */
  modifierVersion(
    grilleId: string,
    versionId: string,
    data: ModifierGrilleDTO
  ): Observable<GrilleVersion> {
    return this.http.put<GrilleVersion>(
      `${this.apiUrl}/${grilleId}/versions/${versionId}`,
      data
    );
  }

  /**
   * Figer une version (la rendre non modifiable)
   */
  figerVersion(grilleId: string, versionId: string): Observable<GrilleVersion> {
    return this.http.post<GrilleVersion>(
      `${this.apiUrl}/${grilleId}/versions/${versionId}/figer`,
      {}
    );
  }

  /**
   * Créer une nouvelle version d'une grille existante
   */
  creerNouvelleVersion(grilleId: string): Observable<GrilleVersion> {
    return this.http.post<GrilleVersion>(
      `${this.apiUrl}/${grilleId}/versions`,
      {}
    );
  }
}
