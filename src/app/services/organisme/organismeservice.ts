import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ProjetFormDTO } from '../../model/projetFormdto';
import { OrganisationDTO } from '../../model/organisationdto';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Organismeservice {
  private baseUrl = 'api/organisations';
  private ApiUrl = environment.urlServer;
  constructor(private http: HttpClient) {}

  /**
   * Récupérer la liste complète sans pagination
   */
  getOrganismeConnected(): Observable<OrganisationDTO> {
    return this.http.get<OrganisationDTO>(`${this.ApiUrl}/${this.baseUrl}/organismeconnected`);
  }
}
