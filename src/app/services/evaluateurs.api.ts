import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export type ExtensionStatut = 'Demandée' | 'Autorisée' | 'Refusée' | null;

export interface Evaluateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  projetsAttribues: number;
  projetsTermines: number;
  delaiRestant: string; // ex. "1h30" | "Terminé" | "-"
  extensionStatut: ExtensionStatut;
}

export interface CreerEvaluateurDTO {
  nom: string;
  prenom: string;
  email: string;
}

interface Session {
  id: string;
  nom: string;
  dateDebut: Date;
  dateFin: Date;
  seuilSelection: number;
  etat: string;
}

interface Affectation {
  id: string;
  session: Session;
  statut: string;
}

interface Evaluation {
  id: string;
  statut: string;
  soumiseLe: Date | null;
}

interface BackendEvaluateur {
  id: string;
  email: string;
  nom: string | null;
  prenom: string | null;
  actif: boolean;
  role: string;
  affectations: Affectation[];
  evaluations: Evaluation[];
}

@Injectable({ providedIn: 'root' })
export class EvaluateursApi {
  private base = `${environment.apiBaseUrl}/admin/evaluateurs`;

  constructor(private http: HttpClient) {}

  private h() {
    const token = localStorage.getItem('token') || '';
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  private toVM(u: BackendEvaluateur): Evaluateur {
    // Calcul des projets attribués et terminés
    const projetsAttribues = u.affectations?.length ?? 0;
    const projetsTermines = u.evaluations?.filter((e) => e.statut === 'SOUMISE').length ?? 0;

    // Vérifier les délais des sessions en cours
    const maintenant = new Date();
    const sessionsEnCours = u.affectations
      ?.filter((a) => a.session && new Date(a.session.dateFin) > maintenant)
      .map((a) => a.session)
      .sort((a, b) => new Date(a.dateFin).getTime() - new Date(b.dateFin).getTime());

    // Calculer le délai restant pour la prochaine session qui se termine
    let delaiRestant = '-';
    if (sessionsEnCours && sessionsEnCours.length > 0) {
      const prochaineFin = new Date(sessionsEnCours[0].dateFin);
      const deltaMinutes = Math.floor(
        (prochaineFin.getTime() - maintenant.getTime()) / (1000 * 60)
      );
      if (deltaMinutes <= 0) {
        delaiRestant = 'Terminé';
      } else {
        const heures = Math.floor(deltaMinutes / 60);
        const minutes = deltaMinutes % 60;
        delaiRestant = heures > 0 ? `${heures}h${minutes > 0 ? minutes : ''}` : `${minutes}min`;
      }
    }

    // Déterminer le statut d'extension en fonction des sessions en cours
    let extensionStatut: ExtensionStatut = null;
    if (sessionsEnCours && sessionsEnCours.length > 0) {
      if (projetsTermines === 0) {
        extensionStatut = 'Demandée';
      } else if (projetsTermines < projetsAttribues) {
        extensionStatut = 'Autorisée';
      }
    }

    return {
      id: u.id,
      nom: (u.nom ?? '').trim(),
      prenom: (u.prenom ?? '').trim(),
      email: u.email,
      projetsAttribues,
      projetsTermines,
      delaiRestant,
      extensionStatut,
    };
  }

  lister(params?: { actif?: boolean; q?: string }): Observable<Evaluateur[]> {
    const usp = new URLSearchParams();
    if (typeof params?.actif === 'boolean') usp.set('actif', String(params.actif));
    if (params?.q) usp.set('q', params.q);
    const url = `${this.base}${usp.toString() ? `?${usp.toString()}` : ''}`;

    return this.http.get<{ data: BackendEvaluateur[] }>(url, this.h()).pipe(
      map((response) => {
        if (!response?.data) return [];
        return response.data.map((evaluateur) => this.toVM(evaluateur));
      })
    );
  }

  creer(payload: CreerEvaluateurDTO) {
    return this.http.post(`${this.base}`, payload, this.h());
  }

  suspendre(idEvaluateur: string) {
    return this.http.patch(`${this.base}/${idEvaluateur}/suspendre`, {}, this.h());
  }

  reactiver(idEvaluateur: string) {
    return this.http.patch(`${this.base}/${idEvaluateur}/reactiver`, {}, this.h());
  }

  supprimer(idEvaluateur: string) {
    return this.http.delete(`${this.base}/${idEvaluateur}`, this.h());
  }

  /**
   * Accorder ou refuser une extension.
   * - Pour autoriser : minutes = 60 (ou autre)
   * - Pour refuser :  minutes = 0, refuse = true
   */
  extension(payload: {
    idSession: string;
    idEvaluateur: string;
    minutes?: number;
    refuse?: boolean;
  }) {
    return this.http.post(`${this.base}/prolonger`, payload, this.h());
  }

  /**
   * Récupérer les offres d'une session pour l'évaluateur
   */
  obtenirOffresSession(idSession: string): Observable<Array<{
    idOffre: string;
    codeAnonyme: string;
    statutAffectation: string;
  }>> {
    return this.http.get<{ data: Array<{
      idOffre: string;
      codeAnonyme: string;
      statutAffectation: string;
    }> }>(`${this.base}/sessions/${idSession}/offres`, this.h()).pipe(
      map((response) => response?.data || [])
    );
  }

  /**
   * Soumettre ou sauvegarder une évaluation (brouillon)
   */
  soumettreEvaluation(payload: {
    idSession: string;
    idOffre: string;
    commentaire?: string;
    soumettre: boolean; // true = soumettre, false = sauvegarder brouillon
    notes: Array<{ idCritere: string; valeurPct: number }>;
  }): Observable<any> {
    return this.http.post(`${this.base}/evaluation`, payload, this.h());
  }
}
