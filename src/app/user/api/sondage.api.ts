import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type CanalSondage =
  | 'RESEAUX_SOCIAUX' | 'EMAIL' | 'SITE_WEB' | 'PARTENAIRE'
  | 'BOUCHE_A_OREILLE' | 'EVENEMENT' | 'MOTEUR_RECHERCHE'
  | 'CHAINE_WHATSAPP' | 'AUTRE';

export interface CorpsCreationSondage {
  cleQuestionnaire: string;
  choixSelectionne: CanalSondage;  // ← SINGULIER
  texteAutre?: string;
  commentaire?: string;
  meta?: Record<string, any> | null;
}

@Injectable({ providedIn: 'root' })
export class SondageApi {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/sondage`;

  /** 🔐 Récupère un JWT depuis localStorage (peu importe la clé) */
  private _trouverToken(): string | null {
    // clés usuelles
    const candidates = [
      'token', 'fpbg.token', 'jwt', 'auth_token', 'access_token', 'fpbg.jwt'
    ];
    for (const k of candidates) {
      const v = localStorage.getItem(k);
      if (v && /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(v)) return v;
    }
    // certains projets stockent un objet { token: '...' }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      try {
        const val = JSON.parse(localStorage.getItem(key)!);
        const maybe = val?.token || val?.access_token || val?.jwt;
        if (typeof maybe === 'string' &&
          /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(maybe)) {
          return maybe;
        }
      } catch { /* ignore */ }
    }
    return null;
  }

  private _authOptions() {
    const t = this._trouverToken();
    if (!t) return {};
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${t}`,
      }),
      withCredentials: false,
    };
  }

  verifierSiDejaRepondu(cleQuestionnaire: string) {
    const params = new HttpParams().set('cleQuestionnaire', cleQuestionnaire);
    return this.http.get(`${this.base}/reponses/moi`, {
      params,
      ...this._authOptions(),   // ⬅️ IMPORTANT
    });
  }

  enregistrerReponse(donnees: CorpsCreationSondage) {
    return this.http.post(`${this.base}/reponses`, donnees, {
      ...this._authOptions(),   // ⬅️ IMPORTANT
    });
  }
}
