import { CommonModule, DatePipe } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { DemandeSubventionService } from '../../services/api/demande-subvention.service';
import { DemandeSubvention, StatutSoumission, TypeOrganisation } from '../../types/models';

interface StatistiquesDomaine {
  domaine: string;
  projets: number;
}

interface StatistiquesZone {
  zone: string;
  budget: number;
  projets: number;
}

interface StatistiquesTypeOrg {
  type: string;
  count: number;
}

@Component({
  selector: 'app-statistiques',
  standalone: true,
  imports: [CommonModule, DatePipe, HttpClientModule, RouterLink, RouterLinkActive],
  templateUrl: './statistiques.html',
  styleUrl: './statistiques.css',
})
export class Statistiques implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private demandeService = inject(DemandeSubventionService);

  // ===== State =====
  demandes = signal<DemandeSubvention[]>([]);
  loadingDemandes = signal(false);
  statistiques = signal<any>(null);

  // ===== Statistiques calculées =====
  totalProjects = computed(() => this.demandes().length);

  // Durée moyenne des projets
  dureeMoyenne = computed(() => {
    const demandes = this.demandes();
    if (demandes.length === 0) return 0;
    const totalMois = demandes.reduce((sum, d) => sum + (d.dureeMois || 0), 0);
    return Math.round(totalMois / demandes.length);
  });

  // Durée moyenne en jours
  dureeMoyenneJours = computed(() => {
    const demandes = this.demandes();
    if (demandes.length === 0) return 0;
    const totalJours = demandes.reduce((sum, d) => {
      const mois = d.dureeMois || 0;
      return sum + mois * 30; // Approximation
    }, 0);
    return Math.round(totalJours / demandes.length);
  });

  // Volume total (budget total)
  volumeTotal = computed(() => {
    const demandes = this.demandes();
    let total = 0;
    demandes.forEach((d) => {
      // Calculer le budget total à partir des activités
      if (d.activites && Array.isArray(d.activites)) {
        d.activites.forEach((act: any) => {
          if (act.lignesBudget && Array.isArray(act.lignesBudget)) {
            act.lignesBudget.forEach((ligne: any) => {
              total += Number(ligne.cfa || 0);
            });
          }
        });
      }
    });
    return total;
  });

  // Domaines d'intervention fréquents
  domainesFrequents = computed(() => {
    const demandes = this.demandes();
    const domainesMap = new Map<string, number>();

    demandes.forEach((d) => {
      if (d.domaines && Array.isArray(d.domaines)) {
        d.domaines.forEach((domaine: string) => {
          domainesMap.set(domaine, (domainesMap.get(domaine) || 0) + 1);
        });
      }
    });

    return Array.from(domainesMap.entries())
      .map(([domaine, projets]) => ({ domaine, projets }))
      .sort((a, b) => b.projets - a.projets)
      .slice(0, 5);
  });

  // Zones géographiques fréquentes
  zonesFrequentes = computed(() => {
    const demandes = this.demandes();
    const zonesMap = new Map<string, { budget: number; projets: number }>();

    demandes.forEach((d) => {
      const zone = d.localisation || 'Non spécifié';
      const existing = zonesMap.get(zone) || { budget: 0, projets: 0 };

      // Calculer le budget pour ce projet
      let budgetProjet = 0;
      if (d.activites && Array.isArray(d.activites)) {
        d.activites.forEach((act: any) => {
          if (act.lignesBudget && Array.isArray(act.lignesBudget)) {
            act.lignesBudget.forEach((ligne: any) => {
              budgetProjet += Number(ligne.cfa || 0);
            });
          }
        });
      }

      zonesMap.set(zone, {
        budget: existing.budget + budgetProjet,
        projets: existing.projets + 1,
      });
    });

    return Array.from(zonesMap.entries())
      .map(([zone, data]) => ({ zone, budget: data.budget, projets: data.projets }))
      .sort((a, b) => b.projets - a.projets)
      .slice(0, 5);
  });

  // Volume de demande par type d'organisation
  volumeParTypeOrg = computed(() => {
    const demandes = this.demandes();
    const typeMap = new Map<string, number>();

    demandes.forEach((d) => {
      const type = d.organisation?.type || 'Non spécifié';
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });

    return Array.from(typeMap.entries())
      .map(([type, count]) => ({ type: this.getTypeOrgLabel(type), count }))
      .sort((a, b) => b.count - a.count);
  });

  // Taux d'approbation
  tauxApprobation = computed(() => {
    const demandes = this.demandes();
    if (demandes.length === 0) return 0;
    const approuves = demandes.filter((d) => d.statut === StatutSoumission.APPROUVE).length;
    return Math.round((approuves / demandes.length) * 100);
  });

  // Taux de rejet
  tauxRejet = computed(() => {
    const demandes = this.demandes();
    if (demandes.length === 0) return 0;
    const rejetes = demandes.filter((d) => d.statut === StatutSoumission.REJETE).length;
    return Math.round((rejetes / demandes.length) * 100);
  });

  // Nombre d'appels à projets
  nombreAAP = computed(() => {
    return this.statistiques()?.aapCount || 0;
  });

  ngOnInit() {
    this.chargerDemandes();
    this.chargerStatistiques();
  }

  /**
   * Charger toutes les demandes
   */
  chargerDemandes() {
    this.loadingDemandes.set(true);
    this.demandeService.obtenirTout().subscribe({
      next: (response) => {
        console.log('✅ [STATS] Demandes récupérées:', response.data.length);
        this.demandes.set(response.data);
        this.loadingDemandes.set(false);
      },
      error: (err) => {
        console.error('❌ [STATS] Erreur chargement demandes:', err);
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
        console.log('✅ [STATS] Statistiques récupérées:', response.data);
        this.statistiques.set(response.data);
      },
      error: (err) => {
        console.error('❌ [STATS] Erreur chargement statistiques:', err);
      },
    });
  }

  /**
   * Rafraîchir les données
   */
  refresh() {
    this.chargerDemandes();
    this.chargerStatistiques();
  }

  /**
   * Exporter les statistiques en PDF
   */
  exporterPDF() {
    // Créer le contenu du PDF
    const content = this.genererContenuExport();

    // Créer un élément temporaire pour le téléchargement
    const element = document.createElement('a');
    const blob = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(blob);
    element.download = `statistiques_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    alert('Export PDF en cours de développement. Un fichier texte a été généré à la place.');
  }

  /**
   * Exporter les statistiques en Excel
   */
  exporterExcel() {
    // Créer le contenu CSV
    let csv = 'Statistiques FPBG\n\n';

    // Statistiques générales
    csv += 'STATISTIQUES GÉNÉRALES\n';
    csv += `Total projets,${this.totalProjects()}\n`;
    csv += `Durée moyenne,${this.dureeMoyenne()} mois ${this.dureeMoyenneJours() % 30} jours\n`;
    csv += `Volume total,${this.formatMontant(this.volumeTotal())} FCFA\n`;
    csv += `Taux d'approbation,${this.tauxApprobation()}%\n`;
    csv += `Taux de rejet,${this.tauxRejet()}%\n`;
    csv += `Nombre d'AAP,${this.nombreAAP()}\n\n`;

    // Domaines d'intervention
    csv += "DOMAINES D'INTERVENTION FRÉQUENTS\n";
    csv += 'Domaine,Projets\n';
    this.domainesFrequents().forEach((d) => {
      csv += `${d.domaine},${d.projets}\n`;
    });
    csv += '\n';

    // Zones géographiques
    csv += 'ZONES GÉOGRAPHIQUES FRÉQUENTES\n';
    csv += 'Zone,Budget,Projets\n';
    this.zonesFrequentes().forEach((z) => {
      csv += `${z.zone},${z.budget},${z.projets}\n`;
    });
    csv += '\n';

    // Volume par type d'organisation
    csv += "VOLUME PAR TYPE D'ORGANISATION\n";
    csv += 'Type,Nombre\n';
    this.volumeParTypeOrg().forEach((t) => {
      csv += `${t.type},${t.count}\n`;
    });

    // Télécharger le fichier
    const element = document.createElement('a');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    element.href = URL.createObjectURL(blob);
    element.download = `statistiques_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  /**
   * Générer le contenu pour l'export
   */
  private genererContenuExport(): string {
    let content = 'STATISTIQUES FPBG\n';
    content += '='.repeat(50) + '\n\n';

    content += 'STATISTIQUES GÉNÉRALES\n';
    content += '-'.repeat(50) + '\n';
    content += `Total projets: ${this.totalProjects()}\n`;
    content += `Durée moyenne: ${this.dureeMoyenne()} mois ${
      this.dureeMoyenneJours() % 30
    } jours\n`;
    content += `Volume total: ${this.formatMontant(this.volumeTotal())} FCFA\n`;
    content += `Taux d'approbation: ${this.tauxApprobation()}%\n`;
    content += `Taux de rejet: ${this.tauxRejet()}%\n`;
    content += `Nombre d'AAP: ${this.nombreAAP()}\n\n`;

    content += "DOMAINES D'INTERVENTION FRÉQUENTS\n";
    content += '-'.repeat(50) + '\n';
    this.domainesFrequents().forEach((d) => {
      content += `${d.domaine}: ${d.projets} projets\n`;
    });
    content += '\n';

    content += 'ZONES GÉOGRAPHIQUES FRÉQUENTES\n';
    content += '-'.repeat(50) + '\n';
    this.zonesFrequentes().forEach((z) => {
      content += `${z.zone}: ${z.projets} projets, ${this.formatMontant(z.budget)} FCFA\n`;
    });
    content += '\n';

    content += "VOLUME PAR TYPE D'ORGANISATION\n";
    content += '-'.repeat(50) + '\n';
    this.volumeParTypeOrg().forEach((t) => {
      content += `${t.type}: ${t.count}\n`;
    });

    return content;
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

  /**
   * Obtenir le label du type d'organisation
   */
  getTypeOrgLabel(type: string): string {
    const labels: { [key: string]: string } = {
      ASSOCIATION: 'Association',
      ONG: 'ONG',
      COMMUNAUTE: 'Communauté de base',
      COOPERATIVE: 'Coopérative',
      PME: 'PME',
      PMI: 'PMI',
      STARTUP: 'Startup',
      SECTEUR_PUBLIC: 'Secteur public',
      RECHERCHE: 'Recherche',
      PRIVE: 'Privé',
      AUTRE: 'Autre',
    };
    return labels[type] || type;
  }

  /**
   * Obtenir la couleur pour le graphique
   */
  getChartColor(index: number): string {
    const colors = [
      '#10b981', // emerald-500
      '#3b82f6', // blue-500
      '#f59e0b', // amber-500
      '#ef4444', // red-500
      '#8b5cf6', // violet-500
    ];
    return colors[index % colors.length];
  }

  /**
   * Calculer la hauteur de la barre pour le graphique
   */
  getBarHeight(value: number, max: number): number {
    if (max === 0) return 0;
    return (value / max) * 100;
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/admin/login');
  }
}
