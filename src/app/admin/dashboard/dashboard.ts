import { CommonModule, DatePipe } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { DemandeSubventionService } from '../../services/api/demande-subvention.service';
import {
  DemandeSubvention,
  LABELS_STATUT_SOUMISSION,
  COULEURS_STATUT_SOUMISSION,
  StatutSoumission,
} from '../../types/models';

type ProjectStatus = 'BROUILLON' | 'SOUMIS' | 'EN_REVUE' | 'ACCEPTE' | 'REJETE';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    HttpClientModule,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private demandeService = inject(DemandeSubventionService);

  // ===== State =====
  demandes = signal<DemandeSubvention[]>([]);
  loadingDemandes = signal(false);
  statistiques = signal<any>(null);

  // Recherche
  q = new FormControl<string>('', { nonNullable: true });
  filtered = computed(() => {
    const query = (this.q.value || '').toLowerCase().trim();
    if (!query) return this.demandes();
    return this.demandes().filter((d) => {
      return (
        (d.titre || '').toLowerCase().includes(query) ||
        (d.organisation?.nom || '').toLowerCase().includes(query) ||
        (d.soumisPar?.email || '').toLowerCase().includes(query) ||
        (d.statut || '').toLowerCase().includes(query) ||
        (d.localisation || '').toLowerCase().includes(query)
      );
    });
  });

  // Stats
  totalProjects = computed(() => this.demandes().length);
  totalSoumis = computed(() => this.demandes().filter((d) => d.statut === StatutSoumission.SOUMIS).length);
  totalEnRevue = computed(() => this.demandes().filter((d) => d.statut === StatutSoumission.EN_REVUE).length);
  totalApprouve = computed(() => this.demandes().filter((d) => d.statut === StatutSoumission.APPROUVE).length);
  totalRejete = computed(() => this.demandes().filter((d) => d.statut === StatutSoumission.REJETE).length);

  ngOnInit() {
    this.chargerDemandes();
    this.chargerStatistiques();
  }

  /**
   * Charger toutes les demandes (admin)
   */
  chargerDemandes() {
    this.loadingDemandes.set(true);
    this.demandeService.obtenirTout().subscribe({
      next: (response) => {
        console.log('✅ [ADMIN] Demandes récupérées:', response.data.length);
        this.demandes.set(response.data);
        this.loadingDemandes.set(false);
      },
      error: (err) => {
        console.error('❌ [ADMIN] Erreur chargement demandes:', err);
        this.loadingDemandes.set(false);
      },
    });
  }

  /**
   * Charger les statistiques
   */
  chargerStatistiques() {
    this.demandeService.obtenirStatistiques().subscribe({
      next: (response) => {
        console.log('✅ [ADMIN] Statistiques récupérées:', response.data);
        this.statistiques.set(response.data);
      },
      error: (err) => {
        console.error('❌ [ADMIN] Erreur chargement statistiques:', err);
      },
    });
  }

  /**
   * Actions de validation/rejet
   */
  markInReview(demande: DemandeSubvention) {
    if (!demande?.id) return;
    this.changerStatut(demande.id, StatutSoumission.EN_REVUE);
  }

  validate(demande: DemandeSubvention) {
    if (!demande?.id) return;
    if (!confirm(`Êtes-vous sûr de vouloir approuver le projet "${demande.titre}" ?`)) return;
    this.changerStatut(demande.id, StatutSoumission.APPROUVE);
  }

  reject(demande: DemandeSubvention) {
    if (!demande?.id) return;
    if (!confirm(`Êtes-vous sûr de vouloir rejeter le projet "${demande.titre}" ?`)) return;
    this.changerStatut(demande.id, StatutSoumission.REJETE);
  }

  /**
   * Changer le statut d'une demande
   */
  private changerStatut(id: string, nouveauStatut: StatutSoumission) {
    this.demandeService.changerStatut(id, nouveauStatut).subscribe({
      next: (response) => {
        console.log('✅ [ADMIN] Statut changé:', response.data);
        // Recharger les demandes
        this.chargerDemandes();
        alert('Statut modifié avec succès !');
      },
      error: (err) => {
        console.error('❌ [ADMIN] Erreur changement statut:', err);
        alert('Erreur lors du changement de statut.');
      },
    });
  }

  /**
   * Navigation vers le récapitulatif
   */
  goToRecap(id: string) {
    if (!id) return;
    this.router.navigate(['/admin/form/recap', id]);
  }

  /**
   * Obtenir le label du statut en français
   */
  getStatutLabel(statut: string): string {
    return LABELS_STATUT_SOUMISSION[statut as keyof typeof LABELS_STATUT_SOUMISSION] || statut;
  }

  /**
   * Obtenir la classe CSS du statut
   */
  getStatutClass(statut: string): string {
    return (
      COULEURS_STATUT_SOUMISSION[statut as keyof typeof COULEURS_STATUT_SOUMISSION] ||
      'bg-slate-100 text-slate-800'
    );
  }

  /**
   * Rafraîchir les données
   */
  refresh() {
    this.chargerDemandes();
    this.chargerStatistiques();
  }

  trackById = (index: number, item: DemandeSubvention) => item.id;

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/admin/login');
  }

  scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
