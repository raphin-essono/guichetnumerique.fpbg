import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Organisation {
  id?: string;
  name?: string;
  username?: string;
  email: string;
  password?: string;
  contact?: string;
  numTel?: string;
  postalAddress?: string;
  physicalAddress?: string;
  type?: string;
  usernamePersonneContacter?: string;
  typeOrganisationId?: string;
  typeOrganisation?: any;
  projets?: any[];
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OrganisationService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.urlServer}/api/organisations`;

  /**
   * Récupérer l'organisation connectée
   */
  getOrganismeConnected(): Observable<Organisation> {
    return this.http.get<Organisation>(`${this.baseUrl}/organismeconnected`);
  }

  /**
   * Récupérer toutes les organisations (admin only)
   */
  getAllOrganisations(): Observable<Organisation[]> {
    return this.http.get<Organisation[]>(this.baseUrl);
  }

  /**
   * Récupérer une organisation par ID (admin only)
   */
  getOrganisationById(id: string): Observable<Organisation> {
    return this.http.get<Organisation>(`${this.baseUrl}/${id}`);
  }

  /**
   * Mettre à jour une organisation
   */
  updateOrganisation(
    id: string,
    organisationData: Partial<Organisation>
  ): Observable<Organisation> {
    return this.http
      .put<{ organisation: Organisation }>(`${this.baseUrl}/${id}`, organisationData)
      .pipe(map((response) => response.organisation));
  }

  /**
   * Supprimer une organisation (admin only)
   */
  deleteOrganisation(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }
}
