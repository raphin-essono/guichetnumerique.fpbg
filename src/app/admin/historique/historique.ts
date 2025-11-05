import { CommonModule, DatePipe } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { DemandeSubventionService } from '../../services/api/demande-subvention.service';
import { OrganisationService } from '../../services/api/organisation.service';
import { DemandeSubvention } from '../../types/models';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Interface pour représenter une action dans l'historique
 */
interface ActionHistorique {
  id: string;
  description: string;
  details?: string;
  nomResponsable: string;
  emailResponsable: string;
  date: Date;
  type: 'creation' | 'modification' | 'suppression' | 'connexion' | 'validation' | 'rejet';
}

@Component({
  selector: 'app-historique',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    HttpClientModule,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './historique.html',
  styleUrl: './historique.css',
})
export class Historique implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private demandeService = inject(DemandeSubventionService);
  private organisationService = inject(OrganisationService);

  // ===== State =====
  actions = signal<ActionHistorique[]>([]);
  loading = signal(false);
  statistiques = signal<any>(null);
  demandes = signal<DemandeSubvention[]>([]);

  // Filtres
  q = new FormControl<string>('', { nonNullable: true });
  filtreType = new FormControl<string>('', { nonNullable: true });
  filtrePeriode = new FormControl<string>('', { nonNullable: true });

  // Computed pour les actions filtrées
  filtered = computed(() => {
    const query = (this.q.value || '').toLowerCase().trim();
    const type = this.filtreType.value;
    const periode = this.filtrePeriode.value;
    let result = this.actions();

    // Filtre par recherche
    if (query) {
      result = result.filter((a) => {
        return (
          (a.description || '').toLowerCase().includes(query) ||
          (a.details || '').toLowerCase().includes(query) ||
          (a.nomResponsable || '').toLowerCase().includes(query) ||
          (a.emailResponsable || '').toLowerCase().includes(query)
        );
      });
    }

    // Filtre par type
    if (type) {
      result = result.filter((a) => a.type === type);
    }

    // Filtre par période
    if (periode) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

      result = result.filter((a) => {
        const actionDate = new Date(a.date);
        switch (periode) {
          case 'today':
            return actionDate >= today;
          case 'week':
            return actionDate >= weekAgo;
          case 'month':
            return actionDate >= monthAgo;
          case 'year':
            return actionDate >= yearAgo;
          default:
            return true;
        }
      });
    }

    return result;
  });

  // Stats
  totalProjects = computed(() => this.demandes().length);
  totalActions = computed(() => this.actions().length);
  actionsAujourdhui = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.actions().filter((a) => {
      const actionDate = new Date(a.date);
      actionDate.setHours(0, 0, 0, 0);
      return actionDate.getTime() === today.getTime();
    }).length;
  });
  actionsSemaine = computed(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return this.actions().filter((a) => new Date(a.date) >= weekAgo).length;
  });
  utilisateursActifs = computed(() => {
    const uniqueEmails = new Set(
      this.actions()
        .map((a) => a.emailResponsable)
        .filter((e) => e)
    );
    return uniqueEmails.size;
  });

  ngOnInit() {
    this.chargerDonnees();
  }

  /**
   * Charger toutes les données nécessaires
   */
  chargerDonnees() {
    this.loading.set(true);

    // Charger les demandes
    this.demandeService.obtenirTout().subscribe({
      next: (response) => {
        console.log('✅ [HISTORIQUE] Demandes récupérées:', response.data.length);
        this.demandes.set(response.data);
        this.genererHistorique(response.data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ [HISTORIQUE] Erreur chargement demandes:', err);
        this.loading.set(false);
      },
    });

    // Charger les statistiques
    this.demandeService.obtenirStatistiques().subscribe({
      next: (response) => {
        console.log('✅ [HISTORIQUE] Statistiques récupérées:', response.data);
        this.statistiques.set(response.data);
      },
      error: (err) => {
        console.error('❌ [HISTORIQUE] Erreur chargement statistiques:', err);
      },
    });
  }

  /**
   * Générer l'historique à partir des demandes
   */
  private genererHistorique(demandes: DemandeSubvention[]) {
    const actions: ActionHistorique[] = [];

    demandes.forEach((demande) => {
      // Action de création
      if (demande.creeLe) {
        actions.push({
          id: `creation-${demande.id}`,
          description: `Création d'une nouvelle demande de subvention`,
          details: `Projet: ${demande.titre}`,
          nomResponsable: demande.soumisPar?.nom || demande.organisation?.nom || 'Inconnu',
          emailResponsable: demande.soumisPar?.email || 'N/A',
          date: new Date(demande.creeLe),
          type: 'creation',
        });
      }

      // Action de modification (si misAJourLe existe et est différent de creeLe)
      if (demande.misAJourLe && demande.misAJourLe !== demande.creeLe) {
        actions.push({
          id: `modification-${demande.id}`,
          description: `Modification d'une demande de subvention`,
          details: `Projet: ${demande.titre}`,
          nomResponsable: demande.soumisPar?.nom || demande.organisation?.nom || 'Inconnu',
          emailResponsable: demande.soumisPar?.email || 'N/A',
          date: new Date(demande.misAJourLe),
          type: 'modification',
        });
      }

      // Action de validation
      if (demande.statut === 'APPROUVE') {
        actions.push({
          id: `validation-${demande.id}`,
          description: `Validation d'une demande de subvention`,
          details: `Projet: ${demande.titre}`,
          nomResponsable: 'Administrateur',
          emailResponsable: 'admin@fpbg.ga',
          date: demande.misAJourLe ? new Date(demande.misAJourLe) : new Date(demande.creeLe),
          type: 'validation',
        });
      }

      // Action de rejet
      if (demande.statut === 'REJETE') {
        actions.push({
          id: `rejet-${demande.id}`,
          description: `Rejet d'une demande de subvention`,
          details: `Projet: ${demande.titre}`,
          nomResponsable: 'Administrateur',
          emailResponsable: 'admin@fpbg.ga',
          date: demande.misAJourLe ? new Date(demande.misAJourLe) : new Date(demande.creeLe),
          type: 'rejet',
        });
      }
    });

    // Trier par date décroissante (plus récent en premier)
    actions.sort((a, b) => b.date.getTime() - a.date.getTime());

    this.actions.set(actions);
  }

  /**
   * Obtenir le label du type d'action
   */
  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      creation: 'Création',
      modification: 'Modification',
      suppression: 'Suppression',
      connexion: 'Connexion',
      validation: 'Validation',
      rejet: 'Rejet',
    };
    return labels[type] || type;
  }

  /**
   * Obtenir la classe CSS du type d'action
   */
  getTypeClass(type: string): string {
    const classes: Record<string, string> = {
      creation: 'bg-blue-100 text-blue-800',
      modification: 'bg-amber-100 text-amber-800',
      suppression: 'bg-rose-100 text-rose-800',
      connexion: 'bg-slate-100 text-slate-800',
      validation: 'bg-emerald-100 text-emerald-800',
      rejet: 'bg-red-100 text-red-800',
    };
    return classes[type] || 'bg-slate-100 text-slate-800';
  }

  /**
   * Rafraîchir les données
   */
  refresh() {
    this.chargerDonnees();
  }

  /**
   * Exporter en Excel
   */
  exporterExcel() {
    const data = this.filtered().map((action) => ({
      'Actions effectuées': action.description,
      Détails: action.details || '',
      'Nom responsable': action.nomResponsable,
      'Email responsable': action.emailResponsable,
      Date: new Date(action.date).toLocaleString('fr-FR'),
      Type: this.getTypeLabel(action.type),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historique');

    // Générer le nom du fichier avec la date
    const date = new Date().toISOString().split('T')[0];
    const filename = `historique_actions_${date}.xlsx`;

    XLSX.writeFile(wb, filename);
    console.log('✅ Export Excel réussi:', filename);
  }

  /**
   * Exporter en PDF
   */
  exporterPDF() {
    const doc = new jsPDF();

    // Titre
    doc.setFontSize(18);
    doc.text('Historique des Actions', 14, 20);

    // Sous-titre avec date
    doc.setFontSize(11);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 28);

    // Statistiques
    doc.setFontSize(10);
    doc.text(`Total actions: ${this.totalActions()}`, 14, 36);
    doc.text(`Actions affichées: ${this.filtered().length}`, 14, 42);

    // Tableau
    const tableData = this.filtered().map((action) => [
      action.description,
      action.nomResponsable,
      action.emailResponsable,
      new Date(action.date).toLocaleDateString('fr-FR'),
      this.getTypeLabel(action.type),
    ]);

    autoTable(doc, {
      head: [['Action', 'Responsable', 'Email', 'Date', 'Type']],
      body: tableData,
      startY: 48,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] },
    });

    // Générer le nom du fichier avec la date
    const date = new Date().toISOString().split('T')[0];
    const filename = `historique_actions_${date}.pdf`;

    doc.save(filename);
    console.log('✅ Export PDF réussi:', filename);
  }

  trackById = (index: number, item: ActionHistorique) => item.id;

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/admin/login');
  }
}
