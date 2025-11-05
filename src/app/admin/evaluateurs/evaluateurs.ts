import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { EvaluateursApi, Evaluateur, CreerEvaluateurDTO } from '../../services/evaluateurs.api';
import { environment } from '../../../environments/environment';
import { DemandeSubventionService } from '../../services/api/demande-subvention.service';
import Swal from 'sweetalert2';

// ⚠️ Id de session "courante" pour les actions d'extension.
//   - Récupère-le depuis la route / le store / une sélection admin.
//   - En attendant, on lit un fallback dans localStorage.
const getSessionCourante = () => localStorage.getItem('sessionCouranteId') || '';

@Component({
  selector: 'app-evaluateurs',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './evaluateurs.html',
  styleUrls: ['./evaluateurs.css'],
})
export class Evaluateurs implements OnInit {
  // Stats
  totalProjets = 0;
  totalAAP = 0;
  totalEvaluateurs = 0;
  evaluateursActifs = 0;

  // Liste des évaluateurs
  evaluateurs: Evaluateur[] = [];
  filtreActifs = true;

  // État du modal
  isModalOuverte = false;
  nouvelEvaluateur: CreerEvaluateurDTO = { nom: '', prenom: '', email: '' };

  // UI
  chargement = false;
  chargementCreation = false;

  private demandeService = inject(DemandeSubventionService);

  constructor(private router: Router, private api: EvaluateursApi) {}

  /* -------------------------- NOTIFICATIONS -------------------------- */
  private showToast(type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-right',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      iconColor: type === 'success' ? '#00e8b6' : type === 'error' ? '#ff4444' : type === 'warning' ? '#ffa500' : '#3498db',
      color: '#06417d',
    });

    Toast.fire({
      icon: type,
      title: title || message,
      text: title ? message : undefined,
    });
  }

  ngOnInit(): void {
    this.chargerEvaluateurs();
    this.chargerStatistiques();
  }

  /**
   * Charger les statistiques des projets et AAP
   */
  private chargerStatistiques(): void {
    this.demandeService.obtenirTout().subscribe({
      next: (response) => {
        if (response?.data) {
          this.totalProjets = response.data.length;
          const aapUniques = new Set(response.data.map((p) => p.appelProjets?.id).filter(Boolean));
          this.totalAAP = aapUniques.size;
          this.showToast('info', `Statistiques mises à jour : ${this.totalProjets} projets sur ${this.totalAAP} AAP`);
        }
      },
      error: (err) => {
        console.error('Erreur lors du chargement des statistiques:', err);
        this.showToast('error', 'Erreur lors du chargement des statistiques');
      },
    });
  }

  /* -------------------------- MODAL -------------------------- */
  ouvrirModal(): void {
    this.isModalOuverte = true;
  }

  fermerModal(): void {
    this.isModalOuverte = false;
    this.nouvelEvaluateur = { nom: '', prenom: '', email: '' };
  }

  /* ------------------------- ACTIONS ------------------------- */

  creerEvaluateur(): void {
    // Vérification des champs vides
    if (!this.nouvelEvaluateur.email) {
      this.showToast('warning', "L'adresse email est requise");
      return;
    }
    if (!this.nouvelEvaluateur.nom) {
      this.showToast('warning', 'Le nom est requis');
      return;
    }
    if (!this.nouvelEvaluateur.prenom) {
      this.showToast('warning', 'Le prénom est requis');
      return;
    }

    // Nettoyage des données
    const evaluateur = {
      email: this.nouvelEvaluateur.email.trim(),
      nom: this.nouvelEvaluateur.nom.trim(),
      prenom: this.nouvelEvaluateur.prenom.trim(),
    };

    // Validation du format email
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(evaluateur.email)) {
      this.showToast('error', "Le format de l'adresse email n'est pas valide");
      return;
    }

    // Validation de la longueur des champs
    if (evaluateur.nom.length < 2) {
      this.showToast('warning', 'Le nom doit contenir au moins 2 caractères');
      return;
    }
    if (evaluateur.prenom.length < 2) {
      this.showToast('warning', 'Le prénom doit contenir au moins 2 caractères');
      return;
    }

    this.chargementCreation = true;
    this.api.creer(evaluateur).subscribe({
      next: (response) => {
        console.log('Évaluateur créé:', response);
        this.chargementCreation = false;
        this.fermerModal();
        this.chargerEvaluateurs();
        this.showToast('success', 'Évaluateur créé avec succès');
      },
      error: (err) => {
        console.error('Erreur lors de la création:', err);
        this.chargementCreation = false;
        this.showToast('error', err?.error?.message || "Erreur lors de la création de l'évaluateur");
      },
    });
  }

  approuverExtension(e: Evaluateur): void {
    const idSession = getSessionCourante();
    if (!idSession) {
      this.showToast('warning', 'Veuillez sélectionner une session avant de continuer');
      return;
    }
    this.api.extension({ idSession, idEvaluateur: e.id, minutes: 60 }).subscribe({
      next: () => {
        e.extensionStatut = 'Autorisée';
        this.showToast('success', `Extension autorisée pour ${e.prenom} ${e.nom}`);
      },
      error: (er) => {
        this.showToast('error', er?.error?.message || "Erreur lors de l'extension");
        console.error('Erreur extension:', er);
      },
    });
  }

  refuserExtension(e: Evaluateur): void {
    const idSession = getSessionCourante();
    if (!idSession) {
      this.showToast('warning', 'Veuillez sélectionner une session avant de continuer');
      return;
    }
    this.api.extension({ idSession, idEvaluateur: e.id, minutes: 0, refuse: true }).subscribe({
      next: () => {
        e.extensionStatut = 'Refusée';
        this.showToast('info', `Extension refusée pour ${e.prenom} ${e.nom}`);
      },
      error: (er) => {
        this.showToast('error', er?.error?.message || "Erreur lors du refus d'extension");
        console.error('Erreur refus extension:', er);
      },
    });
  }

  supprimerEvaluateur(e: Evaluateur): void {
    Swal.fire({
      title: 'Confirmer la suppression',
      html: `Êtes-vous sûr de vouloir supprimer définitivement l'évaluateur <strong>${e.prenom} ${e.nom}</strong> ?<br><br>Cette action est <strong>irréversible</strong>.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      focusCancel: true,
    }).then((result) => {
      if (result.isConfirmed) {
        // Afficher un loader pendant la suppression
        Swal.fire({
          title: 'Suppression en cours...',
          text: 'Veuillez patienter',
          allowOutsideClick: false,
          allowEscapeKey: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        this.api.supprimer(e.id).subscribe({
          next: () => {
            Swal.close();
            this.showToast('success', `L'évaluateur ${e.prenom} ${e.nom} a été supprimé avec succès`);
            // On recharge la liste pour refléter la suppression
            this.chargerEvaluateurs();
          },
          error: (er) => {
            Swal.close();
            this.showToast('error', er?.error?.message || 'Une erreur est survenue lors de la suppression');
            console.error('Erreur suppression:', er);
          },
        });
      }
    });
  }

  logout(): void {
    if (!confirm('Voulez-vous vous déconnecter ?')) return;
    localStorage.removeItem('token');
    this.showToast('info', 'Déconnexion réussie');
    this.router.navigate(['/login']);
  }

  /* ----------------------- FILTRES -------------------------- */

  toggleFiltreActifs(): void {
    this.filtreActifs = !this.filtreActifs;
    this.chargerEvaluateurs();
  }

  /* ----------------------- CHARGEMENT ------------------------ */

  private chargerEvaluateurs(): void {
    this.chargement = true;
    this.evaluateurs = [];
    this.totalEvaluateurs = 0;
    this.evaluateursActifs = 0;

    this.api.lister({ actif: this.filtreActifs }).subscribe({
      next: (evaluateurs) => {
        this.evaluateurs = evaluateurs;
        this.totalEvaluateurs = evaluateurs.length;
        this.evaluateursActifs = evaluateurs.filter(
          (e) => e.projetsAttribues > 0 && e.projetsTermines < e.projetsAttribues
        ).length;

        const projetsUniques = new Set<string>();
        const aapUniques = new Set<string>();

        evaluateurs.forEach((e) => {
          if (e.projetsAttribues > 0) {
            projetsUniques.add(e.id);
            aapUniques.add(e.id);
          }
        });

        this.totalProjets = projetsUniques.size;
        this.totalAAP = aapUniques.size;

        this.showToast('success', `${this.totalEvaluateurs} évaluateurs chargés`);
      },
      error: (err) => {
        console.error('Erreur lors du chargement des évaluateurs:', err);
        this.showToast('error', err?.error?.message || 'Erreur lors du chargement des évaluateurs');
      },
      complete: () => {
        this.chargement = false;
      },
    });
  }
}
