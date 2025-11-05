import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreationDemandeSubventionDTO,
  DemandeSubvention,
  StatutSoumission,
  TypeSoumission,
} from '../../types/models';

/**
 * Service Angular pour gérer les demandes de subvention
 * Communique avec l'API backend /api/demandes
 */
@Injectable({ providedIn: 'root' })
export class DemandeSubventionService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.urlServer}/api/demandes`;

  /**
   * Créer une nouvelle demande de subvention
   */
  creer(
    data: Partial<CreationDemandeSubventionDTO>
  ): Observable<{ message: string; data: DemandeSubvention }> {
    return this.http.post<{ message: string; data: DemandeSubvention }>(this.baseUrl, data);
  }

  /**
   * Récupérer toutes les demandes (avec filtres optionnels)
   */
  obtenirTout(filtres?: {
    statut?: StatutSoumission;
    typeSoumission?: TypeSoumission;
    idOrganisation?: string;
    idAppelProjets?: string;
  }): Observable<{ message: string; data: DemandeSubvention[] }> {
    let params = new HttpParams();

    if (filtres?.statut) {
      params = params.set('statut', filtres.statut);
    }
    if (filtres?.typeSoumission) {
      params = params.set('typeSoumission', filtres.typeSoumission);
    }
    if (filtres?.idOrganisation) {
      params = params.set('idOrganisation', filtres.idOrganisation);
    }
    if (filtres?.idAppelProjets) {
      params = params.set('idAppelProjets', filtres.idAppelProjets);
    }

    return this.http.get<{ message: string; data: DemandeSubvention[] }>(this.baseUrl, { params });
  }

  /**
   * Récupérer les demandes de l'utilisateur connecté
   */
  obtenirMesDemandes(): Observable<{ message: string; data: DemandeSubvention[] }> {
    return this.http.get<{ message: string; data: DemandeSubvention[] }>(
      `${this.baseUrl}/mes-demandes`
    );
  }

  /**
   * Récupérer une demande par ID
   */
  obtenirParId(id: string): Observable<{ message: string; data: DemandeSubvention }> {
    return this.http.get<{ message: string; data: DemandeSubvention }>(`${this.baseUrl}/${id}`);
  }

  /**
   * Mettre à jour une demande
   * ✅ CORRECTION : Accepte maintenant statut + motifRejet
   */
  mettreAJour(
    id: string,
    data: Partial<DemandeSubvention> & { motifRejet?: string }
  ): Observable<{ message: string; data: DemandeSubvention }> {
    return this.http.put<{ message: string; data: DemandeSubvention }>(
      `${this.baseUrl}/${id}`,
      data
    );
  }

  /**
   * Changer le statut d'une demande (admin uniquement)
   * ✅ CORRECTION : Accepte maintenant motifRejet comme 2ème paramètre optionnel
   */
  changerStatut(
    id: string,
    statut: StatutSoumission,
    options?: { motifRejet?: string }
  ): Observable<{ message: string; data: DemandeSubvention }> {
    return this.http.patch<{ message: string; data: DemandeSubvention }>(
      `${this.baseUrl}/${id}/statut`,
      { statut, ...options }
    );
  }

  /**
   * Supprimer une demande
   */
  supprimer(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }

  /**
   * Récupérer les statistiques (dashboard admin)
   */
  obtenirStatistiques(): Observable<{
    message: string;
    data: {
      total: number;
      parStatut: Array<{ statut: string; nombre: number }>;
      parTypeSoumission: Array<{ type: string; nombre: number }>;
      demandesRecentes: DemandeSubvention[];
    };
  }> {
    return this.http.get<any>(`${this.baseUrl}/statistiques`);
  }
}