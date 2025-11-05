import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AAPService, AAP } from '../../services/api/aap.service';

@Component({
  selector: 'app-gestion-aap',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './gestion-aap.html',
})
export class GestionAAPComponent implements OnInit {
  private aapService = inject(AAPService);

  // Signals pour la gestion de l'état
  appels = signal<AAP[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Statistiques
  stats = signal<{ total: number; actifs: number; inactifs: number; totalSubventions: number } | null>(null);

  // Filtres
  searchQuery = signal('');
  statusFilter = signal<'all' | 'active' | 'inactive'>('all');

  // Modal states
  showDeleteModal = signal(false);
  showDuplicateModal = signal(false);
  selectedAAP = signal<AAP | null>(null);

  // Duplication form
  duplicateCode = signal('');
  duplicateTitre = signal('');

  // Computed: AAP filtrés
  filteredAAPs = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();

    return this.appels().filter((aap) => {
      // Filtre par recherche
      const matchQuery = !query ||
        aap.titre.toLowerCase().includes(query) ||
        aap.code.toLowerCase().includes(query) ||
        aap.resume?.toLowerCase().includes(query);

      // Filtre par statut
      const matchStatus =
        status === 'all' ||
        (status === 'active' && aap.isActive) ||
        (status === 'inactive' && !aap.isActive);

      return matchQuery && matchStatus;
    });
  });

  ngOnInit() {
    this.loadData();
  }

  /**
   * Charger les données (AAP + statistiques)
   */
  loadData() {
    this.loading.set(true);
    this.error.set(null);

    Promise.all([
      this.loadAAPs(),
      this.loadStatistics(),
    ]).finally(() => {
      this.loading.set(false);
    });
  }

  /**
   * Charger tous les AAP (incluant inactifs pour admin)
   */
  loadAAPs() {
    return this.aapService.getAllAAPs(true).subscribe({
      next: (data) => {
        this.appels.set(data);
      },
      error: (err) => {
        console.error('Erreur lors du chargement des AAP:', err);
        this.error.set('Erreur lors du chargement des appels à projets');
      },
    });
  }

  /**
   * Charger les statistiques
   */
  loadStatistics() {
    return this.aapService.getAAPStatistics().subscribe({
      next: (data) => {
        this.stats.set(data);
      },
      error: (err) => {
        console.error('Erreur lors du chargement des statistiques:', err);
      },
    });
  }

  /**
   * Publier un AAP
   */
  publishAAP(aap: AAP) {
    if (!aap.id) return;

    this.loading.set(true);
    this.aapService.publishAAP(aap.id, {
      publierDansCatalogue: true,
      publierApresCloture: false,
    }).subscribe({
      next: (updatedAAP) => {
        this.updateAAPInList(updatedAAP);
        this.loadStatistics();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erreur lors de la publication:', err);
        this.error.set('Erreur lors de la publication de l\'AAP');
        this.loading.set(false);
      },
    });
  }

  /**
   * Dépublier un AAP
   */
  unpublishAAP(aap: AAP) {
    if (!aap.id) return;

    this.loading.set(true);
    this.aapService.unpublishAAP(aap.id).subscribe({
      next: (updatedAAP) => {
        this.updateAAPInList(updatedAAP);
        this.loadStatistics();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erreur lors de la dépublication:', err);
        this.error.set('Erreur lors de la dépublication de l\'AAP');
        this.loading.set(false);
      },
    });
  }

  /**
   * Archiver un AAP
   */
  archiveAAP(aap: AAP) {
    if (!aap.id) return;

    this.loading.set(true);
    this.aapService.archiveAAP(aap.id).subscribe({
      next: (updatedAAP) => {
        this.updateAAPInList(updatedAAP);
        this.loadStatistics();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erreur lors de l\'archivage:', err);
        this.error.set('Erreur lors de l\'archivage de l\'AAP');
        this.loading.set(false);
      },
    });
  }

  /**
   * Ouvrir la modal de suppression
   */
  openDeleteModal(aap: AAP) {
    this.selectedAAP.set(aap);
    this.showDeleteModal.set(true);
  }

  /**
   * Fermer la modal de suppression
   */
  closeDeleteModal() {
    this.showDeleteModal.set(false);
    this.selectedAAP.set(null);
  }

  /**
   * Confirmer la suppression
   */
  confirmDelete() {
    const aap = this.selectedAAP();
    if (!aap?.id) return;

    this.loading.set(true);
    this.aapService.deleteAAP(aap.id).subscribe({
      next: () => {
        const currentList = this.appels();
        this.appels.set(currentList.filter((a) => a.id !== aap.id));
        this.closeDeleteModal();
        this.loadStatistics();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erreur lors de la suppression:', err);
        this.error.set('Erreur lors de la suppression de l\'AAP');
        this.loading.set(false);
      },
    });
  }

  /**
   * Ouvrir la modal de duplication
   */
  openDuplicateModal(aap: AAP) {
    this.selectedAAP.set(aap);
    this.duplicateCode.set('');
    this.duplicateTitre.set(`${aap.titre} (Copie)`);
    this.showDuplicateModal.set(true);
  }

  /**
   * Fermer la modal de duplication
   */
  closeDuplicateModal() {
    this.showDuplicateModal.set(false);
    this.selectedAAP.set(null);
    this.duplicateCode.set('');
    this.duplicateTitre.set('');
  }

  /**
   * Confirmer la duplication
   */
  confirmDuplicate() {
    const aap = this.selectedAAP();
    const code = this.duplicateCode().trim();
    const titre = this.duplicateTitre().trim();

    if (!aap?.id || !code) {
      this.error.set('Le code est requis pour la duplication');
      return;
    }

    this.loading.set(true);
    this.aapService.duplicateAAP(aap.id, code, titre || undefined).subscribe({
      next: (newAAP) => {
        const currentList = this.appels();
        this.appels.set([newAAP, ...currentList]);
        this.closeDuplicateModal();
        this.loadStatistics();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erreur lors de la duplication:', err);
        this.error.set('Erreur lors de la duplication de l\'AAP');
        this.loading.set(false);
      },
    });
  }

  /**
   * Mettre à jour un AAP dans la liste
   */
  private updateAAPInList(updatedAAP: AAP) {
    const currentList = this.appels();
    const index = currentList.findIndex((a) => a.id === updatedAAP.id);
    if (index !== -1) {
      const newList = [...currentList];
      newList[index] = updatedAAP;
      this.appels.set(newList);
    }
  }

  /**
   * Formater un montant en FCFA
   */
  formatAmount(amount: number): string {
    return amount.toLocaleString('fr-FR') + ' FCFA';
  }

  /**
   * Formater une date
   */
  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'Non défini';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date invalide';
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  /**
   * Obtenir le badge de statut
   */
  getStatusBadge(aap: AAP): { text: string; class: string } {
    if (aap.isActive) {
      return {
        text: 'Actif',
        class: 'bg-green-100 text-green-800 border-green-200',
      };
    } else {
      return {
        text: 'Inactif',
        class: 'bg-slate-100 text-slate-600 border-slate-200',
      };
    }
  }
}
