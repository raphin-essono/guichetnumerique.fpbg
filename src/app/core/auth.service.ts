import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, of, map } from 'rxjs';
import { environment } from '../../environments/environment';

export type Role = 'ADMIN' | 'APPLICANT' | 'ORGANISATION';
export type UserType = 'user' | 'organisation';

export interface LoginRequest {
  email: string;
  motDePasse: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: any;
  type: UserType;
  role?: 'UTILISATEUR' | 'ADMINISTRATEUR'; // ✅ Ajout du rôle
  redirectTo?: string;
}

export interface RegisterRequest {
  nom_organisation: string;
  type: string;
  couvertureGeographique: string;
  typeSubvention: string;
  email: string;
  telephone: string;
  prenom: string;
  nom: string;
  personneContact: string;
  fonction?: string;
  telephoneContact: string;
  motDePasse: string;
}

export interface RegisterResponse {
  message: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.urlServer}/api/auth`;

  private _token = signal<string | null>(this.loadToken());
  private _user = signal<any>(this.loadUser());
  private _userType = signal<UserType | null>(localStorage.getItem('userType') as UserType | null);
  private _isLoading = signal<boolean>(false);

  // Getters
  isLoggedIn() {
    return !!this._token();
  }
  user() {
    return this._user();
  }
  userType() {
    return this._userType();
  }
  isLoading() {
    return this._isLoading();
  }
  token() {
    return this._token();
  }

  // ✅ Charger le token depuis les deux sources possibles
  private loadToken(): string | null {
    return localStorage.getItem('token') || localStorage.getItem('fpbg.token') || null;
  }

  // ✅ Charger l'utilisateur depuis localStorage au démarrage
  private loadUser(): any {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        return JSON.parse(userStr);
      }
    } catch (e) {
      console.error("Erreur lors du chargement de l'utilisateur:", e);
    }
    return null;
  }

  /**
   * Connexion utilisateur
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    this._isLoading.set(true);

    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, credentials).pipe(
      tap((response) => {
        console.log('✅ [AUTH SERVICE CORE] Login réussi - Stockage des données de session');

        // Stocker le token dans les deux clés pour compatibilité
        localStorage.setItem('token', response.token);
        localStorage.setItem('fpbg.token', response.token);

        // Stocker les informations utilisateur
        localStorage.setItem('userType', response.type);
        localStorage.setItem('user', JSON.stringify(response.user));

        // Stocker le compte au format legacy pour compatibilité avec le guard
        const account = {
          login:
            response.user.nomUtilisateur || response.user.personneContact || response.user.email,
          prenom: response.user.prenom,
          nom: response.user.nom,
          telephone: response.user.telephone,
          fonction: response.user.fonction,
          nom_organisation: response.user.nom_organisation,
          typeUtilisateur: response.user.typeUtilisateur || response.type,
          email: response.user.email,
          authorities: ['UTILISATEUR'],
        };
        localStorage.setItem('fpbg.account', JSON.stringify(account));

        // ✅ Stocker le rôle si présent
        if (response.role) {
          localStorage.setItem('role', response.role);
        }

        // Mettre à jour les signaux
        this._token.set(response.token);
        this._user.set(response.user);
        this._userType.set(response.type);
        this._isLoading.set(false);

        console.log('✅ [AUTH SERVICE CORE] Token et données stockés:', {
          token: '***' + response.token.slice(-10),
          userType: response.type,
          role: response.role,
        });
      }),
      catchError((error) => {
        this._isLoading.set(false);
        throw error;
      })
    );
  }

  /**
   * Inscription d'une organisation
   */
  registerOrganisation(data: RegisterRequest): Observable<RegisterResponse> {
    this._isLoading.set(true);

    return this.http.post<RegisterResponse>(`${this.baseUrl}/register-organisation`, data).pipe(
      tap(() => {
        this._isLoading.set(false);
      }),
      catchError((error) => {
        this._isLoading.set(false);
        throw error;
      })
    );
  }

  /**
   * Inscription d'un agent FPBG
   */
  registerAgentFpbg(data: any): Observable<RegisterResponse> {
    this._isLoading.set(true);

    return this.http.post<RegisterResponse>(`${this.baseUrl}/register-agent-fpbg`, data).pipe(
      tap(() => {
        this._isLoading.set(false);
      }),
      catchError((error) => {
        this._isLoading.set(false);
        throw error;
      })
    );
  }

  /**
   * Vérification OTP
   */
  verifyOtp(email: string, otp: string): Observable<LoginResponse> {
    this._isLoading.set(true);

    return this.http.post<LoginResponse>(`${this.baseUrl}/verify-otp`, { email, otp }).pipe(
      tap((response) => {
        console.log('✅ [AUTH SERVICE CORE] OTP vérifié - Stockage des données de session');

        // Stocker le token dans les deux clés pour compatibilité
        localStorage.setItem('token', response.token);
        localStorage.setItem('fpbg.token', response.token);

        // Stocker les informations utilisateur
        localStorage.setItem('userType', response.type);
        localStorage.setItem('user', JSON.stringify(response.user));

        // Stocker le compte au format legacy pour compatibilité avec le guard
        const account = {
          login:
            response.user.nomUtilisateur || response.user.personneContact || response.user.email,
          prenom: response.user.prenom,
          nom: response.user.nom,
          telephone: response.user.telephone,
          fonction: response.user.fonction,
          nom_organisation: response.user.nom_organisation,
          typeUtilisateur: response.user.typeUtilisateur || response.type,
          email: response.user.email,
          authorities: ['UTILISATEUR'],
        };
        localStorage.setItem('fpbg.account', JSON.stringify(account));

        // Stocker le rôle si présent
        if (response.role) {
          localStorage.setItem('role', response.role);
        }

        // Mettre à jour les signaux
        this._token.set(response.token);
        this._user.set(response.user);
        this._userType.set(response.type);
        this._isLoading.set(false);

        console.log('✅ [AUTH SERVICE CORE] Token et données stockés après OTP:', {
          token: '***' + response.token.slice(-10),
          userType: response.type,
          role: response.role,
        });
      }),
      catchError((error) => {
        this._isLoading.set(false);
        throw error;
      })
    );
  }

  /**
   * Renvoyer OTP
   */
  resendOtp(email: string): Observable<{ message: string; email: string }> {
    return this.http.post<{ message: string; email: string }>(`${this.baseUrl}/resend-otp`, {
      email,
    });
  }

  /**
   * Vérifier si l'utilisateur est authentifié
   */
  isAuthenticated(): Observable<boolean> {
    if (!this._token()) {
      return of(false);
    }

    return this.http.get<any>(`${this.baseUrl}/me`).pipe(
      tap((response) => {
        console.log('✅ [AUTH SERVICE] Vérification token - Réponse /me:', response);
        // Mettre à jour l'utilisateur dans le signal
        if (response && response.user) {
          this._user.set(response.user);
        }
      }),
      map(() => true), // ✅ Retourner true si la requête réussit
      catchError((error) => {
        console.error('❌ [AUTH SERVICE] Erreur vérification token:', error);
        // NE PAS déconnecter automatiquement ici pour éviter les boucles
        // this.logout();
        return of(false);
      })
    );
  }

  /**
   * Déconnexion
   */
  logout(): void {
    console.log('🔴 [AUTH SERVICE CORE] Déconnexion - Nettoyage du localStorage');

    // Nettoyer toutes les clés de localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('fpbg.token');
    localStorage.removeItem('fpbg.account');
    localStorage.removeItem('userType');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.removeItem('fpbg.pendingReg');
    localStorage.removeItem('fpbg.autofillLogin');

    // Réinitialiser les signaux
    this._token.set(null);
    this._user.set(null);
    this._userType.set(null);
    this._isLoading.set(false);

    console.log('✅ [AUTH SERVICE CORE] Déconnexion terminée');
  }

  /**
   * Obtenir les headers d'authentification
   */
  getAuthHeaders(): { [key: string]: string } {
    const token = this._token();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}
