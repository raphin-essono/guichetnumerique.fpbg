import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Subvention {
  id?: string;
  name: string;
  amountMin: number;
  amountMax: number;
  durationMaxMonths: number;
  deadlineNoteConceptuelle: string;
  cycleSteps?: CycleStep[];
}

export interface CycleStep {
  id?: string;
  step: string;
  dates: string;
  ordre: number;
}

export interface Thematique {
  id?: string;
  title: string;
  bullets: string[];
  typeSubvention: string;
}

export interface AAP {
  id?: string;
  code: string;
  titre: string;
  resume: string;
  contexte: string;
  objectif: string;
  contactEmail: string;
  geographicEligibility: string[];
  eligibleOrganisations: string[];
  eligibleActivities: string[];
  cofinancement?: string;
  annexes: string[];
  launchDate: string;
  dateDebut?: string; // ✅ Nouveau champ pour compatibilité backend
  dateFin?: string; // ✅ Nouveau champ pour compatibilité backend
  cover?: string;
  tags: string[];
  isActive?: boolean;
  subventions?: Subvention[];
  thematiques?: Thematique[];
  thematiquesList?: Thematique[]; // ✅ Support du nouveau nom backend
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AAPService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.urlServer}/api/aap`;

  /**
   * Récupérer tous les appels à projets
   */
  getAllAAPs(includeInactive: boolean = false): Observable<AAP[]> {
    return this.http.get<{ success: boolean; data: AAP[] }>(this.baseUrl, {
      params: { includeInactive: includeInactive.toString() },
    }).pipe(map((response) => response.data || []));
  }

  /**
   * Récupérer un appel à projets par ID
   */
  getAAPById(id: string): Observable<AAP> {
    return this.http.get<{ success: boolean; data: AAP }>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  /**
   * Récupérer un appel à projets par code
   */
  getAAPByCode(code: string): Observable<AAP> {
    return this.http.get<{ success: boolean; data: AAP }>(`${this.baseUrl}/code/${code}`)
      .pipe(map((response) => response.data));
  }

  /**
   * Créer un nouvel appel à projets (admin only)
   */
  createAAP(aapData: AAP): Observable<AAP> {
    return this.http
      .post<{ success: boolean; data: AAP }>(this.baseUrl, aapData)
      .pipe(map((response) => response.data));
  }

  /**
   * Mettre à jour un appel à projets (admin only)
   */
  updateAAP(id: string, aapData: Partial<AAP>): Observable<AAP> {
    return this.http
      .put<{ success: boolean; data: AAP }>(`${this.baseUrl}/${id}`, aapData)
      .pipe(map((response) => response.data));
  }

  /**
   * Activer/Désactiver un appel à projets (admin only)
   */
  toggleAAPStatus(id: string): Observable<AAP> {
    return this.http
      .patch<{ success: boolean; data: AAP }>(`${this.baseUrl}/${id}/toggle`, {})
      .pipe(map((response) => response.data));
  }

  /**
   * Supprimer un appel à projets (admin only)
   */
  deleteAAP(id: string): Observable<{ message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => ({ message: response.message })));
  }

  /**
   * Récupérer tous les types d'organisations
   */
  getAllTypeOrganisations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/types/organisations`);
  }

  /**
   * Créer un type d'organisation (admin only)
   */
  createTypeOrganisation(nom: string): Observable<any> {
    return this.http
      .post<any>(`${this.baseUrl}/types/organisations`, { nom });
  }

  /**
   * Publier un AAP (admin only)
   */
  publishAAP(id: string, options?: { publierDansCatalogue?: boolean; publierApresCloture?: boolean }): Observable<AAP> {
    return this.http
      .post<{ success: boolean; data: AAP }>(`${this.baseUrl}/${id}/publish`, options || {})
      .pipe(map((response) => response.data));
  }

  /**
   * Dépublier un AAP (admin only)
   */
  unpublishAAP(id: string): Observable<AAP> {
    return this.http
      .post<{ success: boolean; data: AAP }>(`${this.baseUrl}/${id}/unpublish`, {})
      .pipe(map((response) => response.data));
  }

  /**
   * Archiver un AAP (admin only)
   */
  archiveAAP(id: string): Observable<AAP> {
    return this.http
      .post<{ success: boolean; data: AAP }>(`${this.baseUrl}/${id}/archive`, {})
      .pipe(map((response) => response.data));
  }

  /**
   * Changer le statut d'un AAP (admin only)
   */
  changeAAPStatus(id: string, statut: string): Observable<AAP> {
    return this.http
      .patch<{ success: boolean; data: AAP }>(`${this.baseUrl}/${id}/status`, { statut })
      .pipe(map((response) => response.data));
  }

  /**
   * Récupérer les statistiques des AAP (admin only)
   */
  getAAPStatistics(): Observable<{ total: number; actifs: number; inactifs: number; totalSubventions: number }> {
    return this.http
      .get<{ success: boolean; data: any }>(`${this.baseUrl}/statistics/all`)
      .pipe(map((response) => response.data));
  }

  /**
   * Dupliquer un AAP existant (admin only)
   */
  duplicateAAP(id: string, nouveauCode: string, nouveauTitre?: string): Observable<AAP> {
    return this.http
      .post<{ success: boolean; data: AAP }>(`${this.baseUrl}/${id}/duplicate`, {
        nouveauCode,
        nouveauTitre,
      })
      .pipe(map((response) => response.data));
  }
}
