import { HttpClient, HttpResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ProjetFormDTO } from '../model/projetFormdto';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Aprojetv1 {
  private baseUrl = 'api/aprojet-v1';
  private ApiUrl = environment.urlServer;
  constructor(private http: HttpClient) {}

  /**
   * Créer un projet avec fichiers (multipart/form-data)
   */
  createProjet(formData: FormData): Observable<ProjetFormDTO> {
    return this.http.post<ProjetFormDTO>(`${this.ApiUrl}/${this.baseUrl}/createProjet`, formData);
  }

  /**
   * Mettre à jour un projet (PUT)
   */
  updateProjet(id: number, projet: ProjetFormDTO): Observable<ProjetFormDTO> {
    return this.http.put<ProjetFormDTO>(`${this.baseUrl}/${id}`, projet);
  }

  /**
   * Mise à jour partielle (PATCH)
   */
  partialUpdateProjet(id: number, projet: Partial<ProjetFormDTO>): Observable<ProjetFormDTO> {
    return this.http.patch<ProjetFormDTO>(`${this.baseUrl}/${id}`, projet);
  }

  /**
   * Récupérer la liste paginée des projets
   */
  getAllProjets(
    page: number = 0,
    size: number = 10,
    eagerload: boolean = true
  ): Observable<HttpResponse<ProjetFormDTO[]>> {
    let params = new HttpParams().set('page', page).set('size', size).set('eagerload', eagerload);
    return this.http.get<ProjetFormDTO[]>(`${this.baseUrl}`, {
      params,
      observe: 'response',
    });
  }

  /**
   * Récupérer la liste complète sans pagination
   */
  getAllProjetsNoPage(): Observable<ProjetFormDTO[]> {
    return this.http.get<ProjetFormDTO[]>(`${this.ApiUrl}/${this.baseUrl}/all`);
  }

  /**
   * Récupérer un projet par ID
   */
  getProjetById(id: number): Observable<ProjetFormDTO> {
    return this.http.get<ProjetFormDTO>(`${this.ApiUrl}/${this.baseUrl}/${id}`);
  }

  /**
   * Supprimer un projet
   */
  deleteProjet(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Télécharger un projet PDF
   */
  downloadProjetPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.ApiUrl}/${this.baseUrl}/download/${id}`, {
      responseType: 'blob',
    });
  }

  /**
   * Récupérer un projet lié à l'utilisateur connecté
   */
  getProjetByUser(): Observable<ProjetFormDTO> {
    return this.http.get<ProjetFormDTO>(`${this.ApiUrl}/${this.baseUrl}/user`);
  }

  /**
   * Afficher un fichier depuis le backend
   */
  showFile(pathFile: File): Observable<Blob> {
    const formData = new FormData();
    formData.append('file', pathFile);
    return this.http.post(`${this.ApiUrl}/${this.baseUrl}/showfile`, formData, {
      responseType: 'blob',
    });
  }
}
