import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Projet {
  id?: string;
  organisationId?: string;
  title?: string;
  actPrin?: string;
  dateLimPro?: string;
  rAtt?: string;
  objP?: string;
  conjP?: string;
  lexGcp?: string;
  poRistEnvSoPo?: string;
  dPRep?: string;
  conseilPr?: string;
  cv?: string[];
  ficheC?: string;
  lM?: string;
  stR?: string;
  rib?: string;
  cA?: string;
  budgetD?: string;
  che?: string;
  cartography?: string;
  lP?: string;
  stade?: string;
  funding?: string;
  dateCreation?: string;
  createdAt?: string;
  updatedAt?: string;
  organisation?: any;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root',
})
export class ProjetService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.urlServer}/api/aprojet-v1`;

  /**
   * Créer un nouveau projet
   */
  createProjet(projetData: Partial<Projet>, files?: any): Observable<Projet> {
    const formData = new FormData();

    // Ajouter les données du projet
    Object.keys(projetData).forEach((key) => {
      const value = (projetData as any)[key];
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value);
        }
      }
    });

    // Ajouter les fichiers si présents
    if (files) {
      Object.keys(files).forEach((key) => {
        const fileList = files[key];
        if (Array.isArray(fileList)) {
          fileList.forEach((file: File) => {
            formData.append(key, file);
          });
        } else {
          formData.append(key, fileList);
        }
      });
    }

    return this.http
      .post<{ projet: Projet }>(`${this.baseUrl}/createProjet`, formData)
      .pipe(map((response) => response.projet));
  }

  /**
   * Récupérer tous les projets avec pagination
   */
  getAllProjets(
    page: number = 0,
    size: number = 10,
    eagerload: boolean = false
  ): Observable<PaginatedResponse<Projet>> {
    return this.http.get<PaginatedResponse<Projet>>(this.baseUrl, {
      params: { page: page.toString(), size: size.toString(), eagerload: eagerload.toString() },
    });
  }

  /**
   * Récupérer tous les projets sans pagination
   */
  getAllProjetsNoPage(): Observable<Projet[]> {
    return this.http.get<Projet[]>(`${this.baseUrl}/all`);
  }

  /**
   * Récupérer un projet par ID
   */
  getProjetById(id: string): Observable<Projet> {
    return this.http.get<Projet>(`${this.baseUrl}/${id}`);
  }

  /**
   * Récupérer le projet de l'utilisateur connecté
   */
  getProjetByUser(): Observable<Projet> {
    return this.http.get<Projet>(`${this.baseUrl}/user`);
  }

  /**
   * Mettre à jour un projet
   */
  updateProjet(id: string, projetData: Partial<Projet>): Observable<Projet> {
    return this.http
      .put<{ projet: Projet }>(`${this.baseUrl}/${id}`, projetData)
      .pipe(map((response) => response.projet));
  }

  /**
   * Mise à jour partielle d'un projet
   */
  partialUpdateProjet(id: string, projetData: Partial<Projet>): Observable<Projet> {
    return this.http
      .patch<{ projet: Projet }>(`${this.baseUrl}/${id}`, projetData)
      .pipe(map((response) => response.projet));
  }

  /**
   * Supprimer un projet
   */
  deleteProjet(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }

  /**
   * Soumettre un projet complet depuis le wizard
   */
  submitProject(projectData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/submit`, projectData);
  }

  /**
   * Récupérer le projet de l'utilisateur connecté
   */
  getMyProject(): Observable<Projet | null> {
    return this.http.get<Projet>(`${this.baseUrl}/my-project`);
  }

  /**
   * Récupérer tous les collaborateurs de l'utilisateur
   */
  getMyCollaborateurs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/my-collaborateurs`);
  }

  /**
   * Ajouter un collaborateur à un projet
   */
  addCollaborateur(
    projetId: string,
    collaborateurData: {
      nom: string;
      prenom: string;
      email: string;
      telephone?: string;
      role?: string;
    }
  ): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${projetId}/collaborateurs`, collaborateurData);
  }

  /**
   * Supprimer un collaborateur
   */
  deleteCollaborateur(collaborateurId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.baseUrl}/collaborateurs/${collaborateurId}`
    );
  }
}
