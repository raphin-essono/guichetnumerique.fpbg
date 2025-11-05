import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { SessionsEvaluationService } from '../../services/api/sessions-evaluation.service';
import { EvaluateursApi } from '../../services/evaluateurs.api';
import { AAPService } from '../../services/api/aap.service';
import { GrillesService } from '../../services/api/grilles.service';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';

// ===== INTERFACES =====
interface SessionEvaluation {
  id: string;
  intitule: string;
  appelOffre: string;
  nbProjets: number;
  nbEvaluateurs: number;
  statut: 'Planifiée' | 'En cours' | 'Terminée';
  dateDebut: string;
  dateFin: string;
  projets?: ProjetEvalue[];
  evaluateurs?: EvaluateurSession[];
}

interface ProjetEvalue {
  id: string;
  nom: string;
  notes: number[];
  noteMoyenne: number;
}

interface EvaluateurSession {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  disponibilite?: 'EN_ATTENTE' | 'OUI' | 'NON'; // ✅ AJOUTÉ
  reponduLe?: string; // ✅ AJOUTÉ : Date de réponse
  nbProjetsAffectes?: number; // ✅ AJOUTÉ : Nombre de projets affectés
}

interface Projet {
  id: string;
  nom: string;
  organisation: string;
  porteur: string;
  dateSoumission: string;
  appelOffreId?: string;
}

interface Evaluateur {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  dateCreation: string;
  nbProjetsEvalues: number;
}

interface AppelOffre {
  id: string;
  nom: string;
}

// ===== NOUVELLE STRUCTURE À POINTS =====
interface CritereDTO {
  libelle: string;
  description?: string;
  poids: number;
  pointsMax: number;
}

interface SectionDTO {
  nom: string;
  poids: number;
  criteres: CritereDTO[];
}

interface CritereGrille {
  id?: string;
  libelle: string;
  description?: string | null;
  poids: number;
  pointsMax: number;
}

interface SectionGrille {
  id?: string;
  nom: string;
  poids: number;
  criteres: CritereGrille[];
}

interface GrilleEvaluation {
  id: string;
  nom: string;
  noteMin: number;
  noteMax: number;
  creeLe?: string;
  estDefaut?: boolean;
  versionId?: string; // ID de la version à utiliser (dernière version non figée ou dernière version)
  sections?: SectionGrille[]; // Pour les grilles existantes chargées
}

interface NouvelleSessionData {
  appelOffreId: string;
  intitule: string;
  projetsIds: string[];
  evaluateursIds: string[];
  dateDebut: string;
  dateFin: string;
  grilleEvaluationId: string;
  seuilSelection: number;  // Seuil en points pour être ADMISSIBLE
}

@Component({
  selector: 'app-evaluations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './evaluations.html',
  styleUrl: './evaluations.css',
})
export class Evaluations implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private sessionsService = inject(SessionsEvaluationService);
  private evaluateursApi = inject(EvaluateursApi);
  private aapService = inject(AAPService);
  private grillesService = inject(GrillesService);

  // ===== STATE =====
  loading = signal(false);
  sessions = signal<SessionEvaluation[]>([]);
  projets = signal<Projet[]>([]);
  evaluateurs = signal<Evaluateur[]>([]);
  appelOffres = signal<AppelOffre[]>([]);
  grillesEvaluation = signal<GrilleEvaluation[]>([]);

  // Stats pour sidebar
  totalProjets = computed(() => this.projets().length);
  totalAAP = computed(() => this.appelOffres().length);

  // ===== MODALES =====
  modalNouvelleSession = signal(false);
  etapeNouvelleSession = signal(1);
  modalVoir = signal(false);
  modalParametrage = signal(false);
  modalNouvelleGrille = signal(false);

  // ===== ONGLETS =====
  ongletVoir = signal<'projets' | 'evaluateurs'>('projets');
  ongletGrille = signal<'nouveau' | 'titre' | 'description' | 'min'>('nouveau');

  // ===== FILTRES =====
  rechercheEvaluateur = signal('');

  // ===== DATA EN ÉDITION =====
  sessionSelectionnee = signal<SessionEvaluation | null>(null);
  nouvelleSessionData: NouvelleSessionData = {
    appelOffreId: '',
    intitule: '',
    projetsIds: [],
    evaluateursIds: [],
    dateDebut: '',
    dateFin: '',
    grilleEvaluationId: '',
    seuilSelection: 0,
  };

  // ===== NOUVELLE STRUCTURE GRILLE EN ÉDITION =====
  grilleEnEdition: {
    id: string;
    nom: string;
    noteMin: number;
    noteMax: number;
    sections: SectionGrille[];
  } = {
    id: '',
    nom: '',
    noteMin: 0,
    noteMax: 0, // Auto-calculé
    sections: [],
  };

  nouvelleSection: SectionGrille = {
    nom: '',
    poids: 1,
    criteres: [],
  };

  nouveauCritere: CritereGrille = {
    libelle: '',
    description: '',
    poids: 1,
    pointsMax: 1,
  };

  sectionIndexEnEdition = -1;
  critereIndexEnEdition = -1;

  /* -------------------------- NOTIFICATIONS SWEETALERT2 -------------------------- */
  private showToast(type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-right',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      iconColor:
        type === 'success'
          ? '#00e8b6'
          : type === 'error'
          ? '#ff4444'
          : type === 'warning'
          ? '#ffa500'
          : '#3498db',
      color: '#06417d',
    });

    Toast.fire({
      icon: type,
      title: title || message,
      text: title ? message : undefined,
    });
  }

  /* -------------------------- HEADERS D'AUTHENTIFICATION -------------------------- */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || localStorage.getItem('fpbg.token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    });
  }

  ngOnInit() {
    this.chargerDonnees();
  }

  // ===== CHARGEMENT DES DONNÉES =====
  chargerDonnees() {
    this.loading.set(true);

    // Charger les données depuis le backend
    Promise.all([
      this.chargerSessions(),
      this.chargerProjets(),
      this.chargerEvaluateurs(),
      this.chargerAppelsOffres(),
      this.chargerGrilles(),
    ])
      .then((resultats) => {
        this.loading.set(false);

        // Vérifier si toutes les données ont été chargées avec succès
        const erreurs = resultats.filter(r => !r.success);

        if (erreurs.length === 0) {
          this.showToast('success', 'Données chargées avec succès');
        } else if (erreurs.length === resultats.length) {
          this.showToast('error', 'Impossible de charger les données. Veuillez vérifier votre connexion au serveur.');
        } else {
          // Certaines données chargées, d'autres non
          const messagesErreurs = erreurs.map(e => e.type).join(', ');
          this.showToast('warning', `Données partiellement chargées. Échec: ${messagesErreurs}`);
        }
      })
      .catch((error) => {
        console.error('Erreur inattendue lors du chargement des données:', error);
        this.loading.set(false);
        this.showToast('error', 'Erreur inattendue lors du chargement des données.');
      });
  }

  private chargerSessions(): Promise<{ success: boolean; type: string }> {
    return new Promise((resolve) => {
      this.sessionsService.obtenirSessions().subscribe({
        next: (response: any) => {
          // L'API peut retourner { data: [...] } ou directement [...]
          const data = Array.isArray(response) ? response : (response.data || []);

          // Mapper les données du backend vers le format local
          this.sessions.set(
            data.map((s: any) => ({
              id: s.id,
              intitule: s.intitule || 'Sans intitulé',
              appelOffre: s.appelOffre?.titre || 'N/A',
              nbProjets: s.nbProjets || 0,
              nbEvaluateurs: s.nbEvaluateurs || 0,
              statut: this.mapStatut(s.statut || 'PLANIFIEE'),
              dateDebut: s.dateDebut, // Garder la date brute avec l'heure
              dateFin: s.dateFin, // Garder la date brute avec l'heure
              // Les projets et évaluateurs seront chargés à la demande (lazy loading)
              projets: undefined,
              evaluateurs: undefined,
            }))
          );
          resolve({ success: true, type: 'sessions' });
        },
        error: (error) => {
          console.error('Erreur chargement sessions:', error);
          this.sessions.set([]);
          resolve({ success: false, type: 'sessions' });
        },
      });
    });
  }

  private chargerProjets(): Promise<{ success: boolean; type: string }> {
    return new Promise((resolve) => {
      // Utiliser le service des demandes de subvention au lieu de projet
      this.http.get<any>(`${environment.apiBaseUrl}/demandes`, {
        headers: this.getAuthHeaders()
      }).subscribe({
        next: (response: any) => {
          // L'API peut retourner { data: [...] } ou directement [...]
          const data = Array.isArray(response) ? response : (response.data || []);

          this.projets.set(
            data.map((p: any) => ({
              id: p.id,
              nom: p.titre || p.title || 'Sans titre',
              organisation: p.organisation?.nom || p.organisationName || 'N/A',
              porteur: p.organisation?.email || p.organisationEmail || 'N/A',
              dateSoumission: this.formatDate(p.creeLe || p.createdAt || p.dateCreation),
              appelOffreId: p.appelProjetsId || p.appelOffreId || p.aapId,
            }))
          );
          resolve({ success: true, type: 'projets' });
        },
        error: (error: any) => {
          console.error('Erreur chargement projets:', error);
          this.projets.set([]);
          resolve({ success: false, type: 'projets' });
        },
      });
    });
  }

  private chargerEvaluateurs(): Promise<{ success: boolean; type: string }> {
    return new Promise((resolve) => {
      this.evaluateursApi.lister().subscribe({
        next: (response: any) => {
          // L'API peut retourner { data: [...] } ou directement [...]
          const data = Array.isArray(response) ? response : (response.data || []);

          this.evaluateurs.set(
            data.map((e: any) => ({
              id: e.id,
              prenom: e.prenom,
              nom: e.nom,
              email: e.email,
              dateCreation: this.formatDate(e.dateCreation || e.createdAt),
              nbProjetsEvalues: e.projetsTermines || 0,
            }))
          );
          resolve({ success: true, type: 'évaluateurs' });
        },
        error: (error) => {
          console.error('Erreur chargement évaluateurs:', error);
          this.evaluateurs.set([]);
          resolve({ success: false, type: 'évaluateurs' });
        },
      });
    });
  }

  private chargerAppelsOffres(): Promise<{ success: boolean; type: string }> {
    return new Promise((resolve) => {
      this.aapService.getAllAAPs().subscribe({
        next: (response: any) => {
          // L'API peut retourner { data: [...] } ou directement [...]
          const data = Array.isArray(response) ? response : (response.data || []);

          this.appelOffres.set(
            data.map((aap: any) => ({
              id: aap.id,
              nom: aap.titre || aap.nom,
            }))
          );
          resolve({ success: true, type: "appels d'offres" });
        },
        error: (error) => {
          console.error("Erreur chargement appels d'offres:", error);
          this.appelOffres.set([]);
          resolve({ success: false, type: "appels d'offres" });
        },
      });
    });
  }

  private chargerGrilles(): Promise<{ success: boolean; type: string }> {
    return new Promise((resolve) => {
      this.grillesService.listerGrilles().subscribe({
        next: (grilles: any) => {
          // Mapper les grilles avec la nouvelle structure
          this.grillesEvaluation.set(
            grilles.map((g: any) => {
              // Récupérer la dernière version (ou la version non figée si disponible)
              let versionAUtiliser = null;
              if (g.versions && g.versions.length > 0) {
                // Chercher une version non figée
                versionAUtiliser = g.versions.find((v: any) => !v.figeeLe);
                // Sinon prendre la dernière version
                if (!versionAUtiliser) {
                  versionAUtiliser = g.versions[g.versions.length - 1];
                }
              }

              return {
                id: g.id,
                nom: g.nom,
                noteMin: g.noteMin,
                noteMax: g.noteMax,
                creeLe: g.creeLe,
                estDefaut: g.estDefaut,
                versionId: versionAUtiliser?.id || null,
                sections: versionAUtiliser?.sections || [],
              };
            })
          );
          resolve({ success: true, type: 'grilles' });
        },
        error: (error) => {
          console.error('Erreur chargement grilles:', error);
          this.grillesEvaluation.set([]);
          resolve({ success: false, type: 'grilles' });
        },
      });
    });
  }


  // Méthodes utilitaires
  private mapStatut(
    statut: 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ARCHIVEE'
  ): 'Planifiée' | 'En cours' | 'Terminée' {
    const mapping = {
      PLANIFIEE: 'Planifiée' as const,
      EN_COURS: 'En cours' as const,
      TERMINEE: 'Terminée' as const,
      ARCHIVEE: 'Terminée' as const,
    };
    return mapping[statut];
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  formatDateTime(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ===== FILTRES =====
  projetsFiltres = computed(() => {
    const appelOffreId = this.nouvelleSessionData.appelOffreId;
    if (!appelOffreId) return this.projets();
    return this.projets().filter((p) => p.appelOffreId === appelOffreId);
  });

  evaluateursFiltres = computed(() => {
    const recherche = this.rechercheEvaluateur().toLowerCase().trim();
    if (!recherche) return this.evaluateurs();

    return this.evaluateurs().filter((e) => {
      const nomComplet = `${e.prenom} ${e.nom}`.toLowerCase();
      const email = e.email.toLowerCase();
      return nomComplet.includes(recherche) || email.includes(recherche);
    });
  });

  // ===== MODALE NOUVELLE SESSION =====
  ouvrirModalNouvelleSession() {
    this.resetNouvelleSessionData();
    this.etapeNouvelleSession.set(1);
    this.modalNouvelleSession.set(true);
  }

  fermerModalNouvelleSession() {
    this.modalNouvelleSession.set(false);
    this.resetNouvelleSessionData();
  }

  allerEtape(etape: number) {
    this.etapeNouvelleSession.set(etape);
  }

  peutAllerEtape2(): boolean {
    return (
      this.nouvelleSessionData.intitule.trim() !== '' &&
      this.nouvelleSessionData.projetsIds.length > 0
    );
  }

  peutCreerSession(): boolean {
    return (
      this.nouvelleSessionData.dateDebut !== '' &&
      this.nouvelleSessionData.dateFin !== '' &&
      this.nouvelleSessionData.grilleEvaluationId !== '' &&
      this.nouvelleSessionData.seuilSelection > 0 &&
      this.nouvelleSessionData.evaluateursIds.length > 0
    );
  }

  toggleProjetSelection(projetId: string) {
    const index = this.nouvelleSessionData.projetsIds.indexOf(projetId);
    if (index > -1) {
      this.nouvelleSessionData.projetsIds.splice(index, 1);
    } else {
      this.nouvelleSessionData.projetsIds.push(projetId);
    }
  }

  toggleEvaluateurSelection(evaluateurId: string) {
    const index = this.nouvelleSessionData.evaluateursIds.indexOf(evaluateurId);
    if (index > -1) {
      this.nouvelleSessionData.evaluateursIds.splice(index, 1);
    } else {
      this.nouvelleSessionData.evaluateursIds.push(evaluateurId);
    }
  }

  tousProjetsCochesEtape1(): boolean {
    const projetsFiltres = this.projetsFiltres();
    return (
      projetsFiltres.length > 0 &&
      projetsFiltres.every((p) => this.nouvelleSessionData.projetsIds.includes(p.id))
    );
  }

  toggleTousProjetsEtape1(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.nouvelleSessionData.projetsIds = this.projetsFiltres().map((p) => p.id);
    } else {
      this.nouvelleSessionData.projetsIds = [];
    }
  }

  tousEvaluateursCochesEtape2(): boolean {
    const evaluateurs = this.evaluateurs();
    return (
      evaluateurs.length > 0 &&
      evaluateurs.every((e) => this.nouvelleSessionData.evaluateursIds.includes(e.id))
    );
  }

  toggleTousEvaluateursEtape2(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.nouvelleSessionData.evaluateursIds = this.evaluateurs().map((e) => e.id);
    } else {
      this.nouvelleSessionData.evaluateursIds = [];
    }
  }

  creerSession() {
    console.log('➡️ Création session:', this.nouvelleSessionData);

    this.loading.set(true);

    // Trouver la grille sélectionnée pour récupérer son versionId
    const grille = this.grillesEvaluation().find(
      g => g.id === this.nouvelleSessionData.grilleEvaluationId
    );

    if (!grille || !grille.versionId) {
      this.loading.set(false);
      this.showToast('error', 'Grille d\'évaluation invalide ou sans version disponible');
      return;
    }

    // Préparer les données avec le versionId au lieu du grilleEvaluationId
    const sessionData = {
      ...this.nouvelleSessionData,
      grilleEvaluationId: grille.versionId  // Remplacer par versionId
    };

    console.log('➡️ Données envoyées au backend:', sessionData);

    // Créer la session avec toutes les données
    this.sessionsService.creerSession(sessionData).subscribe({
      next: (sessionCreee) => {
        console.log('✅ Session créée:', sessionCreee);

        // Créer les affectations (chaque projet à chaque évaluateur)
        const affectations = [];
        for (const projetId of this.nouvelleSessionData.projetsIds) {
          for (const evaluateurId of this.nouvelleSessionData.evaluateursIds) {
            affectations.push({
              offreId: projetId,
              evaluateurId: evaluateurId,
            });
          }
        }

        // Envoyer les affectations au backend
        if (affectations.length > 0) {
          this.sessionsService
            .affecterProjets({
              sessionId: (sessionCreee as any).data?.id || sessionCreee.id,
              affectations: affectations,
            })
            .subscribe({
              next: () => {
                console.log('✅ Affectations créées');
                this.loading.set(false);
                const intitule = (sessionCreee as any).data?.intitule || sessionCreee.intitule || 'Session';
                this.showToast(
                  'success',
                  `Session "${intitule}" créée avec succès ! ${affectations.length} affectation(s) créée(s).`
                );
                this.fermerModalNouvelleSession();
                this.chargerDonnees();
              },
              error: (error) => {
                console.error('❌ Erreur lors de la création des affectations:', error);
                this.loading.set(false);
                this.showToast(
                  'error',
                  "Session créée mais erreur lors de l'affectation des évaluateurs: " +
                    (error.error?.message || error.message || 'Erreur inconnue')
                );
                this.fermerModalNouvelleSession();
                this.chargerDonnees();
              },
            });
        } else {
          this.loading.set(false);
          this.showToast('success', `Session "${sessionCreee.intitule}" créée avec succès !`);
          this.fermerModalNouvelleSession();
          this.chargerDonnees();
        }
      },
      error: (error) => {
        console.error('❌ Erreur lors de la création de la session:', error);
        this.loading.set(false);
        this.showToast(
          'error',
          'Erreur lors de la création de la session: ' +
            (error.error?.message || error.message || 'Erreur inconnue')
        );
      },
    });
  }

  resetNouvelleSessionData() {
    this.nouvelleSessionData = {
      appelOffreId: '',
      intitule: '',
      projetsIds: [],
      evaluateursIds: [],
      dateDebut: '',
      dateFin: '',
      grilleEvaluationId: '',
      seuilSelection: 0,
    };
  }

  // ===== MODALE VOIR SESSION =====
  ouvrirModalVoir(session: SessionEvaluation) {
    // Charger les données complètes de la session depuis la base de données
    this.loading.set(true);
    this.sessionsService.obtenirSessionParId(session.id).subscribe({
      next: (sessionComplete) => {
        // Mapper les données complètes
        const sessionMapped: SessionEvaluation = {
          id: sessionComplete.id,
          intitule: sessionComplete.intitule || (sessionComplete as any).nom || 'Sans intitulé',
          appelOffre: sessionComplete.appelOffre?.titre || 'N/A',
          nbProjets: sessionComplete.nbProjets || 0,
          nbEvaluateurs: sessionComplete.nbEvaluateurs || 0,
          statut: this.mapStatut(sessionComplete.statut || 'PLANIFIEE'),
          dateDebut: sessionComplete.dateDebut, // Garder la date brute avec l'heure
          dateFin: sessionComplete.dateFin, // Garder la date brute avec l'heure
          projets: sessionComplete.projets?.map((p) => ({
            id: p.id,
            nom: p.nom || 'Sans nom',
            notes: p.notes || [],
            noteMoyenne: p.noteMoyenne || 0,
          })),
          evaluateurs: sessionComplete.evaluateurs?.map((e) => ({
            id: e.id,
            prenom: e.prenom || '',
            nom: e.nom || '',
            email: e.email || '',
            disponibilite: e.disponibilite, // ✅ AJOUTÉ
            reponduLe: e.reponduLe, // ✅ AJOUTÉ
            nbProjetsAffectes: e.nbProjetsAffectes, // ✅ AJOUTÉ
          })),
        };
        this.sessionSelectionnee.set(sessionMapped);
        this.ongletVoir.set('projets');
        this.modalVoir.set(true);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement de la session:', error);
        // En cas d'erreur, utiliser les données de base
        this.sessionSelectionnee.set(session);
        this.ongletVoir.set('projets');
        this.modalVoir.set(true);
        this.loading.set(false);
      },
    });
  }

  fermerModalVoir() {
    this.modalVoir.set(false);
    this.sessionSelectionnee.set(null);
  }

  changerOngletVoir(onglet: 'projets' | 'evaluateurs') {
    this.ongletVoir.set(onglet);
  }

  // ===== MODALE PARAMÉTRAGE =====
  ouvrirModalParametrage() {
    this.modalParametrage.set(true);
  }

  fermerModalParametrage() {
    this.modalParametrage.set(false);
  }

  supprimerGrille(grilleId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette grille ?')) return;
    console.log('➡️ Suppression grille:', grilleId);

    this.loading.set(true);
    this.sessionsService.supprimerGrille(grilleId).subscribe({
      next: () => {
        console.log('✅ Grille supprimée');
        const grilles = this.grillesEvaluation().filter((g) => g.id !== grilleId);
        this.grillesEvaluation.set(grilles);
        this.loading.set(false);
        this.showToast('success', 'Grille supprimée avec succès !');
      },
      error: (error) => {
        console.error('❌ Erreur lors de la suppression de la grille:', error);
        this.loading.set(false);
        this.showToast(
          'error',
          'Erreur lors de la suppression de la grille: ' +
            (error.error?.message || error.message || 'Erreur inconnue')
        );
      },
    });
  }

  enregistrerGrilles() {
    console.log('➡️ Enregistrement grilles');
    // TODO: Appel API si nécessaire
    this.fermerModalParametrage();
  }

  // ===== MODALE NOUVELLE/MODIFIER GRILLE =====
  ouvrirModalNouvelleGrille() {
    this.resetGrilleEnEdition();
    this.ongletGrille.set('nouveau');
    this.modalNouvelleGrille.set(true);
  }

  modifierGrille(grille: GrilleEvaluation) {
    this.grilleEnEdition = {
      id: grille.id,
      nom: grille.nom,
      noteMin: grille.noteMin,
      noteMax: grille.noteMax,
      sections: JSON.parse(JSON.stringify(grille.sections || [])),
    };
    this.ongletGrille.set('nouveau');
    this.modalNouvelleGrille.set(true);
  }

  fermerModalNouvelleGrille() {
    this.modalNouvelleGrille.set(false);
    this.resetGrilleEnEdition();
  }

  changerOngletGrille(onglet: 'nouveau' | 'titre' | 'description' | 'min') {
    this.ongletGrille.set(onglet);
  }

  enregistrerGrille() {
    // Validation
    if (!this.grilleEnEdition.nom.trim()) {
      this.showToast('warning', 'Veuillez saisir un nom pour la grille');
      return;
    }

    if (this.grilleEnEdition.sections.length === 0) {
      this.showToast('warning', 'Veuillez ajouter au moins une section à la grille');
      return;
    }

    // Vérifier que chaque section a au moins un critère
    for (const section of this.grilleEnEdition.sections) {
      if (section.criteres.length === 0) {
        this.showToast('warning', `La section "${section.nom}" doit contenir au moins un critère`);
        return;
      }
    }

    // Vérifier que pointsMax >= 1 pour tous les critères
    for (const section of this.grilleEnEdition.sections) {
      for (const critere of section.criteres) {
        if (critere.pointsMax < 1) {
          this.showToast('warning', `Le critère "${critere.libelle}" doit avoir au moins 1 point`);
          return;
        }
      }
    }

    console.log('➡️ Enregistrement grille:', this.grilleEnEdition);

    // Préparer les données pour l'API
    const grilleData = {
      nom: this.grilleEnEdition.nom,
      estDefaut: false,
      sections: this.grilleEnEdition.sections.map((s) => ({
        nom: s.nom,
        poids: s.poids,
        criteres: s.criteres.map((c) => ({
          libelle: c.libelle,
          description: c.description || undefined,
          poids: c.poids,
          pointsMax: c.pointsMax,
        })),
      })),
    };

    this.loading.set(true);

    // Création de nouvelle grille uniquement (pas de modification pour le moment)
    this.grillesService.creerGrille(grilleData).subscribe({
      next: (grilleCreee: any) => {
        console.log('✅ Grille créée:', grilleCreee);
        this.loading.set(false);

        // Ajouter la nouvelle grille à la liste
        const nouvelleGrille: GrilleEvaluation = {
          id: grilleCreee.id,
          nom: grilleCreee.nom,
          noteMin: grilleCreee.noteMin,
          noteMax: grilleCreee.noteMax,
          creeLe: grilleCreee.creeLe,
          estDefaut: grilleCreee.estDefaut,
          sections: grilleCreee.versions && grilleCreee.versions.length > 0
            ? grilleCreee.versions[0].sections || []
            : [],
        };

        this.grillesEvaluation.set([...this.grillesEvaluation(), nouvelleGrille]);
        this.showToast('success', `Grille "${grilleCreee.nom}" créée avec succès ! Note maximale : ${grilleCreee.noteMax} points`);
        this.fermerModalNouvelleGrille();
      },
      error: (error) => {
        console.error('❌ Erreur lors de la création de la grille:', error);
        this.loading.set(false);
        this.showToast(
          'error',
          'Erreur lors de la création de la grille: ' +
            (error.error?.message || error.message || 'Erreur inconnue')
        );
      },
    });
  }

  resetGrilleEnEdition() {
    this.grilleEnEdition = {
      id: '',
      nom: '',
      noteMin: 0,
      noteMax: 0,
      sections: [],
    };
    this.nouvelleSection = {
      nom: '',
      poids: 1,
      criteres: [],
    };
    this.nouveauCritere = {
      libelle: '',
      description: '',
      poids: 1,
      pointsMax: 1,
    };
  }

  // ===== GESTION DES SECTIONS ET CRITÈRES =====
  ajouterSection() {
    if (!this.nouvelleSection.nom.trim()) {
      this.showToast('warning', 'Veuillez saisir un nom pour la section');
      return;
    }

    this.grilleEnEdition.sections.push(JSON.parse(JSON.stringify(this.nouvelleSection)));
    this.nouvelleSection = { nom: '', poids: 1, criteres: [] };
    this.showToast('success', 'Section ajoutée avec succès');
  }

  supprimerSection(index: number) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette section ?')) return;
    this.grilleEnEdition.sections.splice(index, 1);
    this.showToast('success', 'Section supprimée');
  }

  ajouterCritere(sectionIndex: number) {
    if (!this.nouveauCritere.libelle.trim()) {
      this.showToast('warning', 'Veuillez saisir un libellé pour le critère');
      return;
    }

    if (this.nouveauCritere.pointsMax < 1) {
      this.showToast('warning', 'Les points maximaux doivent être >= 1');
      return;
    }

    this.grilleEnEdition.sections[sectionIndex].criteres.push(
      JSON.parse(JSON.stringify(this.nouveauCritere))
    );
    this.nouveauCritere = { libelle: '', description: '', poids: 1, pointsMax: 1 };
    this.showToast('success', 'Critère ajouté avec succès');
  }

  supprimerCritere(sectionIndex: number, critereIndex: number) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce critère ?')) return;
    this.grilleEnEdition.sections[sectionIndex].criteres.splice(critereIndex, 1);
    this.showToast('success', 'Critère supprimé');
  }

  calculerTotalPoints(): number {
    let total = 0;
    this.grilleEnEdition.sections.forEach((section) => {
      section.criteres.forEach((critere) => {
        if (critere.poids > 0) {
          total += critere.pointsMax;
        }
      });
    });
    return total;
  }

  calculerSousTotal(section: SectionGrille): number {
    let total = 0;
    section.criteres.forEach((critere) => {
      if (critere.poids > 0) {
        total += critere.pointsMax;
      }
    });
    return total;
  }

  getNoteMaxGrilleSelectionnee(): number {
    const grille = this.grillesEvaluation().find(g => g.id === this.nouvelleSessionData.grilleEvaluationId);
    return grille?.noteMax || 100;
  }

  // ===== UTILITAIRES =====
  getStatutClass(statut: string): string {
    switch (statut) {
      case 'Planifiée':
        return 'bg-blue-100 text-blue-800';
      case 'En cours':
        return 'bg-yellow-100 text-yellow-800';
      case 'Terminée':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  }

  trackById = (index: number, item: any) => item.id;

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/admin/login');
  }
}
