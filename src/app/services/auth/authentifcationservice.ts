import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LoginVM } from '../../model/loginvm';
import { FpbgUsersDTO } from '../../model/fpbgusersdto';
import { OrganisationDTO } from '../../model/organisationdto';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Authentifcationservice {
  private ApiUrl = environment.urlServer;
  private baseUrl = '/api';

  constructor(private http: HttpClient) {}

  /**
   * Authentifie un utilisateur (login)
   * ✅ CORRECTION : Route corrigée vers /api/auth/login
   */
  login(loginVM: LoginVM): Observable<HttpResponse<any>> {
    return this.http.post(`${this.ApiUrl}${this.baseUrl}/auth/login`, loginVM, {
      observe: 'response',
      withCredentials: true, // permet d'inclure les cookies JWT
    });
  }

  /**
   * Vérifie si un utilisateur est authentifié
   */
  isAuthenticated(): Observable<string> {
    return this.http.get(`${this.ApiUrl}${this.baseUrl}/authenticate`, {
      responseType: 'text',
      withCredentials: true,
    });
  }

  /**
   * Déconnexion (supprime les cookies)
   */
  disconnected(): Observable<string> {
    return this.http.get(`${this.baseUrl}/disconnected`, {
      responseType: 'text',
      withCredentials: true,
    });
  }

  /**
   * Enregistre un nouvel agent FPBG
   */
  registerAgentFpbg(user: FpbgUsersDTO): Observable<HttpResponse<any>> {
    return this.http.post(`${this.ApiUrl}${this.baseUrl}/registeragentfpbg`, user, {
      observe: 'response',
      withCredentials: true,
    });
  }

  /**
   * Enregistre une nouvelle organisation
   */
  registerOrganisation(organisation: OrganisationDTO): Observable<HttpResponse<any>> {
    return this.http.post(`${this.ApiUrl}${this.baseUrl}/registerOrganisation`, organisation, {
      observe: 'response',
      withCredentials: true,
    });
  }

  /**
   * Vérifie un code OTP
   */
  verifyOtp(otp: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.ApiUrl}${this.baseUrl}/otpverifcation/${otp}`, {
      withCredentials: true,
    });
  }

  /**
   * Rafraîchit le token d’accès via cookie
   */
  refreshToken(): Observable<HttpResponse<any>> {
    return this.http.post(
      `${this.ApiUrl}${this.baseUrl}/refresh-token`,
      {},
      {
        observe: 'response',
        withCredentials: true,
      }
    );
  }
}
