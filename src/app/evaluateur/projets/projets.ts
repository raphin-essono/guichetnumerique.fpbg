import { CommonModule, DatePipe } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { SessionsEvaluationService } from '../../services/api/sessions-evaluation.service';

interface ProjetAEvaluer {
  id: string;
  identifiant: string;
  titre: string;
  budget: number;
  typeSubvention: string;
  date: string;
  statut: 'A évaluer' | 'En cours' | 'Terminé';
  sessionId: string;
  sessionNom: string;
  evaluation?: {
    id: string;
    statut: 'BROUILLON' | 'SOUMISE';
    score: number | null;
    misAJourLe: Date;
    soumiseLe: Date | null;
  };
}

@Component({
  selector: 'app-evaluateur-projets',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    HttpClientModule,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './projets.html',
})
export class EvaluateurProjets implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private sessionsService = inject(SessionsEvaluationService);

  // State
  projets = signal<ProjetAEvaluer[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  filtreStatut = signal<string>('TOUS');

  // Stats
  totalProjets = computed(() => this.projets().length);
  projetsAEvaluer = computed(() => this.projets().filter(p => p.statut === 'A évaluer').length);
  projetsEnCours = computed(() => this.projets().filter(p => p.statut === 'En cours').length);
  projetsTermines = computed(() => this.projets().filter(p => p.statut === 'Terminé').length);

  // Filtres
  filtered = computed(() => {
    let result = this.projets();
    const statut = this.filtreStatut();
    
    if (statut !== 'TOUS') {
      result = result.filter(p => p.statut === statut);
    }
    
    return result;
  });

  ngOnInit() {
    this.chargerProjets();
  }

  chargerProjets() {
    this.loading.set(true);
    this.error.set(null);

    this.sessionsService.getMesAffectations().subscribe({
      next: (response) => {
        console.log('[EvaluateurProjets] Affectations reçues:', response);

        if (response.success && response.data) {
          // Transformer les affectations en projets pour l'affichage
          const projets = response.data.map((affectation: any) => {
            // Déterminer le statut selon l'évaluation
            let statut: 'A évaluer' | 'En cours' | 'Terminé' = 'A évaluer';

            if (affectation.evaluation) {
              if (affectation.evaluation.statut === 'SOUMISE') {
                statut = 'Terminé';
              } else if (affectation.evaluation.statut === 'BROUILLON') {
                statut = 'En cours';
              }
            }

            // Calculer le budget total (somme des lignes de budget)
            // Pour l'instant on utilise une valeur par défaut, à améliorer plus tard
            const budget = 0; // TODO: calculer depuis les données du projet

            return {
              id: affectation.offre.id,
              identifiant: affectation.offre.code || affectation.offre.id,
              titre: affectation.offre.titre,
              budget: budget,
              typeSubvention: 'Subvention', // TODO: récupérer le type réel
              date: new Date(affectation.session.dateDebut).toLocaleDateString('fr-FR'),
              statut: statut,
              sessionId: affectation.session.id,
              sessionNom: affectation.session.nom,
              evaluation: affectation.evaluation,
            };
          });

          this.projets.set(projets);
          console.log('[EvaluateurProjets] Projets chargés:', projets.length);
        }

        this.loading.set(false);
      },
      error: (err) => {
        console.error('[EvaluateurProjets] Erreur chargement:', err);
        this.error.set('Impossible de charger les projets. Veuillez réessayer.');
        this.loading.set(false);
      }
    });
  }

  setFiltreStatut(statut: string) {
    this.filtreStatut.set(statut);
  }

  /**
   * Démarrer une nouvelle évaluation
   */
  demarrerEvaluation(projet: ProjetAEvaluer) {
    console.log('[EvaluateurProjets] Démarrer évaluation:', projet);
    this.router.navigate(['/evaluateur/evaluations', projet.id], {
      queryParams: {
        sessionId: projet.sessionId,
        action: 'demarrer'
      }
    });
  }

  /**
   * Continuer une évaluation en cours (brouillon)
   */
  continuerEvaluation(projet: ProjetAEvaluer) {
    console.log('[EvaluateurProjets] Continuer évaluation:', projet);
    this.router.navigate(['/evaluateur/evaluations', projet.id], {
      queryParams: {
        sessionId: projet.sessionId,
        evaluationId: projet.evaluation?.id,
        action: 'continuer'
      }
    });
  }

  /**
   * Voir une évaluation terminée (soumise)
   */
  voirEvaluation(projet: ProjetAEvaluer) {
    console.log('[EvaluateurProjets] Voir évaluation:', projet);
    this.router.navigate(['/evaluateur/evaluations', projet.id], {
      queryParams: {
        sessionId: projet.sessionId,
        evaluationId: projet.evaluation?.id,
        action: 'voir'
      }
    });
  }

  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(montant);
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/evaluateur/login');
  }

  trackById = (index: number, item: any) => item.id;
}