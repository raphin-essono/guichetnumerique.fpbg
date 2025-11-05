import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { EvaluationService, type CritereGrille, type ProjetAnonymise, type GrilleVersion, type SessionInfo, type DemandeExtension } from '../../services/api/evaluation.service';

interface CritereNote {
  critere: CritereGrille;
  section: {
    id: string;
    nom: string;
    poids: number;
  };
  note: number; // valeurPct (0-100)
}

@Component({
  selector: 'app-evaluateur-evaluations',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './evaluations.html',
})
export class EvaluateurEvaluations implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private evaluationService = inject(EvaluationService);

  // State
  sessionInfo = signal<SessionInfo | null>(null);
  projet = signal<ProjetAnonymise | null>(null);
  grille = signal<GrilleVersion | null>(null);
  notes = signal<Map<string, number>>(new Map()); // critereId -> valeurPct (0-100)
  commentaire = signal('');
  loading = signal(false);
  error = signal<string | null>(null);
  showSubmitModal = signal(false);
  showExtensionModal = signal(false);
  critereActifIndex = signal(0); // Pour navigation dans le template
  progression = signal(0); // Progression en pourcentage
  demandeExtension = signal<DemandeExtension | null>(null);
  tempsRestant = signal<string>('');
  extensionDemandee = signal(false);

  // Computed - Liste plate de tous les critères
  criteres = computed(() => {
    const grille = this.grille();
    if (!grille) return [];

    const criteres: CritereNote[] = [];
    grille.sections.forEach(section => {
      section.criteres.forEach(critere => {
        // Filtrer les critères avec poids > 0 uniquement
        if (critere.poids > 0) {
          criteres.push({
            critere,
            section: {
              id: section.id,
              nom: section.nom,
              poids: section.poids,
            },
            note: this.notes().get(critere.id) || 0,
          });
        }
      });
    });
    return criteres;
  });

  // Computed - Nom de la grille
  nomGrille = computed(() => {
    const grille = this.grille();
    const session = this.sessionInfo();
    if (!session) return '';
    // Le nom de la grille n'est pas dans GrilleVersion, on utilise le nom de la session
    return session.nom || 'Grille d\'évaluation';
  });

  // Computed - Nombre de critères notés
  nombreCriteresNotes = computed(() => {
    const criteres = this.criteres();
    return criteres.filter(c => c.note > 0).length;
  });

  // Score en pourcentage pondéré
  scorePourcentage = computed(() => {
    const grille = this.grille();
    if (!grille) return 0;

    let sommePonderee = 0;
    let sommePoids = 0;

    grille.sections.forEach(section => {
      section.criteres.forEach(critere => {
        if (critere.poids > 0) {
          const note = this.notes().get(critere.id) || 0;
          sommePonderee += note * critere.poids;
          sommePoids += critere.poids;
        }
      });
    });

    return sommePoids > 0 ? Math.round(sommePonderee / sommePoids) : 0;
  });

  // Vérifier si tous les critères sont notés
  tousLesCriteresNotes = computed(() => {
    const criteres = this.criteres();
    return criteres.every(c => c.note > 0);
  });

  // Total des points (pour compatibilité template)
  totalPoints = computed(() => {
    return Array.from(this.notes().values()).reduce((sum, note) => sum + note, 0);
  });

  // Total des points max (pour compatibilité template)
  totalPointsMax = computed(() => {
    const criteres = this.criteres();
    return criteres.length * 100; // Chaque critère est noté sur 100
  });

  ngOnInit() {
    // Récupérer l'ID de l'offre et sessionId depuis la route
    const offreId = this.route.snapshot.paramMap.get('id');
    const sessionId = this.route.snapshot.queryParamMap.get('sessionId');

    console.log('[EvaluateurEvaluations] ngOnInit - Params:', { offreId, sessionId });
    console.log('[EvaluateurEvaluations] Route snapshot:', this.route.snapshot);

    if (!offreId || !sessionId) {
      this.error.set('Paramètres manquants (projet ID ou session ID)');
      console.error('[EvaluateurEvaluations] Paramètres manquants!', { offreId, sessionId });
      this.router.navigate(['/evaluateur/projets']);
      return;
    }

    console.log('[EvaluateurEvaluations] ✅ Paramètres OK, chargement des données...');
    
    // Charger les données principales d'abord
    this.chargerDonneesEvaluation(sessionId, offreId);
    
    // Charger la demande d'extension (ne bloque pas si erreur)
    this.chargerDemandeExtension(sessionId);
  }

  /**
   * Charger toutes les données nécessaires pour l'évaluation en un seul appel
   */
  private chargerDonneesEvaluation(sessionId: string, offreId: string) {
    this.loading.set(true);
    this.error.set(null);

    this.evaluationService.getDonneesEvaluation(sessionId, offreId).subscribe({
      next: (response) => {
        console.log('[EvaluateurEvaluations] Données reçues:', response);

        // Charger les données
        this.sessionInfo.set(response.data.session);
        this.projet.set(response.data.projet);
        this.grille.set(response.data.grille);

        // Charger les notes existantes (si évaluation en brouillon)
        if (response.data.evaluation?.notes) {
          const notesMap = new Map<string, number>();
          response.data.evaluation.notes.forEach(note => {
            notesMap.set(note.critereId, note.valeurPct);
          });
          this.notes.set(notesMap);
          this.commentaire.set(response.data.evaluation.commentaire || '');
        }

        this.loading.set(false);
        
        // Démarrer le compteur de temps maintenant que la session est chargée
        this.demarrerCompteurTemps();
        
        console.log('[EvaluateurEvaluations] ✅ Données chargées avec succès');
      },
      error: (error) => {
        console.error('[EvaluateurEvaluations] ❌ Erreur chargement:', error);
        this.error.set(error.error?.message || 'Impossible de charger les données d\'évaluation');
        this.loading.set(false);
      },
    });
  }

  /**
   * Mettre à jour la note d'un critère (0-100)
   */
  updateNote(critereId: string, valeurPct: number) {
    const noteValide = Math.max(0, Math.min(100, valeurPct));
    const newNotes = new Map(this.notes());
    newNotes.set(critereId, noteValide);
    this.notes.set(newNotes);
  }

  /**
   * Navigation entre critères
   */
  precedent() {
    if (this.critereActifIndex() > 0) {
      this.critereActifIndex.set(this.critereActifIndex() - 1);
    }
  }

  suivant() {
    const criteres = this.criteres();
    if (this.critereActifIndex() < criteres.length - 1) {
      this.critereActifIndex.set(this.critereActifIndex() + 1);
    }
  }

  allerAuCritere(index: number) {
    this.critereActifIndex.set(index);
  }

  critereActif = computed(() => {
    const criteres = this.criteres();
    const index = this.critereActifIndex();
    return criteres[index] || null;
  });

  /**
   * Sauvegarder l'évaluation en brouillon
   */
  sauvegarder() {
    const sessionInfo = this.sessionInfo();
    const projet = this.projet();

    if (!sessionInfo || !projet) {
      alert('Données manquantes');
      return;
    }

    this.loading.set(true);

    // Convertir Map en Array
    const notesArray = Array.from(this.notes().entries()).map(([critereId, valeurPct]) => ({
      idCritere: critereId,
      valeurPct,
    }));

    this.evaluationService.soumettreEvaluation({
      idSession: sessionInfo.id,
      idOffre: projet.id,
      commentaire: this.commentaire(),
      soumettre: false, // Sauvegarde en brouillon
      notes: notesArray,
    }).subscribe({
      next: () => {
        this.loading.set(false);
        alert('✅ Évaluation sauvegardée en brouillon');
      },
      error: (error) => {
        console.error('Erreur sauvegarde:', error);
        this.loading.set(false);
        alert('❌ Erreur lors de la sauvegarde: ' + (error.error?.message || error.message));
      },
    });
  }

  /**
   * Ouvrir la modale de confirmation de soumission
   */
  ouvrirModalSoumission() {
    if (!this.tousLesCriteresNotes()) {
      alert('⚠️ Veuillez noter tous les critères avant de soumettre');
      return;
    }
    this.showSubmitModal.set(true);
  }

  /**
   * Fermer la modale de soumission
   */
  fermerModalSoumission() {
    this.showSubmitModal.set(false);
  }

  /**
   * Soumettre définitivement l'évaluation
   */
  soumettre() {
    const sessionInfo = this.sessionInfo();
    const projet = this.projet();

    if (!sessionInfo || !projet) {
      alert('Données manquantes');
      return;
    }

    if (!this.tousLesCriteresNotes()) {
      alert('⚠️ Veuillez noter tous les critères avant de soumettre');
      this.fermerModalSoumission();
      return;
    }

    this.loading.set(true);

    // Convertir Map en Array
    const notesArray = Array.from(this.notes().entries()).map(([critereId, valeurPct]) => ({
      idCritere: critereId,
      valeurPct,
    }));

    this.evaluationService.soumettreEvaluation({
      idSession: sessionInfo.id,
      idOffre: projet.id,
      commentaire: this.commentaire(),
      soumettre: true, // Soumettre définitivement
      notes: notesArray,
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.fermerModalSoumission();
        alert('✅ Évaluation soumise avec succès !');
        this.router.navigate(['/evaluateur/projets']);
      },
      error: (error) => {
        console.error('Erreur soumission:', error);
        this.loading.set(false);
        alert('❌ Erreur lors de la soumission: ' + (error.error?.message || error.message));
      },
    });
  }

  /**
   * Retour à la liste des projets
   */
  retour() {
    this.router.navigate(['/evaluateur/projets']);
  }

  /**
   * Déconnexion
   */
  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/evaluateur/login');
  }

  /**
   * Charger la demande d'extension si elle existe
   */
  private chargerDemandeExtension(sessionId: string) {
    this.evaluationService.getDemandeExtension(sessionId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.demandeExtension.set(response.data);
          console.log('[EvaluateurEvaluations] Demande d\'extension:', response.data);
        } else {
          console.log('[EvaluateurEvaluations] Aucune demande d\'extension trouvée');
        }
      },
      error: (err) => {
        // Ne pas bloquer l'interface si la demande d'extension échoue
        console.warn('[EvaluateurEvaluations] Impossible de charger la demande d\'extension (normal si aucune demande):', err.status);
        // Pas de demande d'extension, c'est normal
        this.demandeExtension.set(null);
      }
    });
  }

  /**
   * Calculer et mettre à jour le temps restant
   */
  private demarrerCompteurTemps() {
    const updateTemps = () => {
      const session = this.sessionInfo();
      if (!session) return;

      const maintenant = new Date();
      const dateFin = new Date(session.dateFin);
      const diff = dateFin.getTime() - maintenant.getTime();

      if (diff <= 0) {
        this.tempsRestant.set('Session terminée');
        return;
      }

      const heures = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secondes = Math.floor((diff % (1000 * 60)) / 1000);

      this.tempsRestant.set(`${heures}h ${minutes}m ${secondes}s`);
    };

    // Mettre à jour immédiatement
    updateTemps();

    // Mettre à jour toutes les secondes
    setInterval(updateTemps, 1000);
  }

  /**
   * Méthodes pour modale d'extension
   */
  ouvrirModalExtension() {
    const demande = this.demandeExtension();
    
    // Vérifier si une demande existe déjà
    if (demande) {
      if (demande.statut === 'EN_ATTENTE') {
        alert('Vous avez déjà une demande d\'extension en attente.');
        return;
      }
      if (demande.statut === 'ACCEPTEE') {
        alert('Votre demande d\'extension a déjà été acceptée.');
        return;
      }
    }

    this.showExtensionModal.set(true);
  }

  fermerModalExtension() {
    this.showExtensionModal.set(false);
  }

  demanderExtension() {
    const sessionInfo = this.sessionInfo();
    if (!sessionInfo) {
      alert('Informations de session manquantes');
      return;
    }

    this.extensionDemandee.set(true);

    this.evaluationService.demanderExtension(sessionInfo.id, 'Besoin de plus de temps pour finaliser l\'évaluation').subscribe({
      next: (response) => {
        console.log('[EvaluateurEvaluations] Extension demandée:', response);
        this.extensionDemandee.set(false);
        this.fermerModalExtension();
        alert('✅ Votre demande d\'extension a été envoyée à l\'administrateur');
        
        // Recharger la demande d'extension
        this.chargerDemandeExtension(sessionInfo.id);
      },
      error: (error) => {
        console.error('[EvaluateurEvaluations] Erreur demande extension:', error);
        this.extensionDemandee.set(false);
        alert('❌ Erreur lors de la demande d\'extension: ' + (error.error?.message || error.message));
      }
    });
  }

  /**
   * Helper pour afficher le budget total
   */
  calculerBudgetTotal(projet: ProjetAnonymise | null): number {
    if (!projet) return 0;

    let total = 0;
    projet.activites.forEach(activite => {
      activite.lignesBudget.forEach(ligne => {
        total += Number(ligne.cfa) || 0;
      });
    });
    return total;
  }

  /**
   * Computed pour le budget total
   */
  budgetTotal = computed(() => {
    return this.calculerBudgetTotal(this.projet());
  });

  /**
   * Computed pour le score total
   */
  scoreTotal = computed(() => {
    return this.totalPoints();
  });

  /**
   * Computed pour l'index du critère actif
   */
  indexCritereActif = computed(() => {
    return this.critereActifIndex();
  });

  /**
   * Naviguer vers le critère précédent
   */
  criterePrecedent() {
    const index = this.critereActifIndex();
    if (index > 0) {
      this.critereActifIndex.set(index - 1);
    }
  }

  /**
   * Naviguer vers le critère suivant
   */
  critereSuivant() {
    const criteres = this.criteres();
    const index = this.critereActifIndex();
    if (index < criteres.length - 1) {
      this.critereActifIndex.set(index + 1);
    }
  }

  /**
   * Signals pour les modales
   */
  afficherModaleValidation = signal(false);
  afficherModaleExtension = signal(false);
  motifExtension = '';

  /**
   * Ouvrir la modale de validation
   */
  ouvrirModaleValidation() {
    // Vérifier que tous les critères sont notés
    if (!this.tousLesCriteresNotes()) {
      alert('⚠️ Veuillez noter tous les critères avant de valider');
      return;
    }
    this.afficherModaleValidation.set(true);
  }

  /**
   * Fermer la modale de validation
   */
  fermerModaleValidation() {
    this.afficherModaleValidation.set(false);
  }

  /**
   * Ouvrir la modale d'extension
   */
  ouvrirModaleExtension() {
    this.afficherModaleExtension.set(true);
  }

  /**
   * Fermer la modale d'extension
   */
  fermerModaleExtension() {
    this.afficherModaleExtension.set(false);
    this.motifExtension = '';
  }

  /**
   * Formater un montant
   */
  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(montant);
  }
}
