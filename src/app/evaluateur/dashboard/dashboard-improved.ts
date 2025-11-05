import { CommonModule, DatePipe } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import {
  EvaluateurDashboardService,
  VueEnsemble,
  SessionEnCours
} from '../../services/api/evaluateur-dashboard.service';
import {
  NotificationsService,
  Notification
} from '../../services/api/notifications.service';

@Component({
  selector: 'app-evaluateur-dashboard',
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
export class EvaluateurDashboard implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private dashboardService = inject(EvaluateurDashboardService);
  private notificationsService = inject(NotificationsService);

  // State - Vue d'ensemble
  vueEnsemble = signal<VueEnsemble | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  // Computed values depuis vueEnsemble
  stats = computed(() => this.vueEnsemble()?.stats || {
    notificationsNonLues: 0,
    disponibilitesEnAttente: 0,
    sessionsEnCours: 0,
    projetsAEvaluer: 0,
    projetsEvalues: 0,
    totalProjets: 0
  });

  notifications = computed(() => this.vueEnsemble()?.notifications || []);
  disponibilitesEnAttente = computed(() => this.vueEnsemble()?.disponibilitesEnAttente || []);
  sessionsEnCours = computed(() => this.vueEnsemble()?.sessionsEnCours || []);
  sessionsAVenir = computed(() => this.vueEnsemble()?.sessionsAVenir || []);
  appelsProjets = computed(() => this.vueEnsemble()?.appelsProjets || []);

  // Compatibilité avec l'ancien template
  totalProjets = computed(() => this.stats().totalProjets);
  projetsTermines = computed(() => this.stats().projetsEvalues);
  projetsEnCours = computed(() => this.stats().projetsAEvaluer);

  // Session active (première session en cours)
  sessionActive = computed(() => {
    const sessions = this.sessionsEnCours();
    if (sessions.length === 0) return null;

    const session = sessions[0];
    return {
      id: session.session.id,
      intitule: session.session.nom,
      dateDebut: session.session.dateDebut,
      dateFin: session.session.dateFin,
      statut: 'En cours' as const,
      disponibiliteConfirmee: true,
      nbProjets: session.nbProjetsTotal,
      nbProjetsEvalues: session.nbProjetsEvalues
    };
  });

  // Tous les projets (depuis toutes les sessions)
  projets = computed(() => {
    const sessions = this.sessionsEnCours();
    const allProjets = sessions.flatMap(session =>
      session.projets.map(projet => ({
        id: projet.id,
        identifiant: projet.id.substring(0, 8),
        titre: projet.titre,
        budget: 0, // À récupérer depuis les détails du projet si nécessaire
        typeSubvention: '',
        date: session.session.dateDebut,
        statut: this.mapStatut(projet.statut),
        appelProjetId: projet.appelProjets?.id || null,
        appelProjetTitre: projet.appelProjets?.titre || 'Non spécifié'
      }))
    );
    return allProjets;
  });

  // Recherche et filtrage par AAP
  q = new FormControl<string>('', { nonNullable: true });
  selectedAapId = signal<string>('');

  filteredProjets = computed(() => {
    const query = (this.q.value || '').toLowerCase().trim();
    const aapId = this.selectedAapId();
    let filtered = this.projets();

    // Filtrer par AAP si sélectionné
    if (aapId) {
      filtered = filtered.filter(p => p.appelProjetId === aapId);
    }

    // Filtrer par recherche textuelle
    if (query) {
      filtered = filtered.filter((p) => {
        return (
          (p.titre || '').toLowerCase().includes(query) ||
          (p.identifiant || '').toLowerCase().includes(query) ||
          (p.typeSubvention || '').toLowerCase().includes(query) ||
          (p.appelProjetTitre || '').toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  });

  ngOnInit() {
    this.chargerDonnees();
  }

  chargerDonnees() {
    this.loading.set(true);
    this.error.set(null);

    this.dashboardService.getVueEnsemble().subscribe({
      next: (data) => {
        console.log('📊 Dashboard data:', data);
        this.vueEnsemble.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Erreur chargement dashboard:', err);
        this.error.set('Erreur lors du chargement des données. Veuillez réessayer.');
        this.loading.set(false);
      }
    });
  }

  confirmerDisponibilite(sessionId: string) {
    if (!confirm('Confirmez-vous votre disponibilité pour cette session ?')) {
      return;
    }

    this.loading.set(true);

    this.dashboardService.confirmerDisponibilite(sessionId, true).subscribe({
      next: (response) => {
        console.log('✅ Disponibilité confirmée:', response);
        alert('Disponibilité confirmée avec succès !');
        // Recharger les données
        this.chargerDonnees();
      },
      error: (err) => {
        console.error('❌ Erreur confirmation:', err);
        alert('Erreur lors de la confirmation. Veuillez réessayer.');
        this.loading.set(false);
      }
    });
  }

  refuserDisponibilite(sessionId: string) {
    if (!confirm('Êtes-vous sûr de refuser cette session ?')) {
      return;
    }

    this.loading.set(true);

    this.dashboardService.confirmerDisponibilite(sessionId, false).subscribe({
      next: (response) => {
        console.log('✅ Disponibilité refusée:', response);
        alert('Vous avez refusé cette session.');
        // Recharger les données
        this.chargerDonnees();
      },
      error: (err) => {
        console.error('❌ Erreur refus:', err);
        alert('Erreur lors du refus. Veuillez réessayer.');
        this.loading.set(false);
      }
    });
  }

  evaluerProjet(projetId: string) {
    this.router.navigate(['/evaluateur/evaluations', projetId]);
  }

  continuerEvaluation(projetId: string) {
    this.router.navigate(['/evaluateur/evaluations', projetId]);
  }

  voirSession(sessionId: string) {
    this.router.navigate(['/evaluateur/sessions', sessionId]);
  }

  marquerNotificationLue(notificationId: string) {
    this.notificationsService.marquerCommeLue(notificationId).subscribe({
      next: () => {
        console.log('✅ Notification marquée comme lue');
        // Recharger les données
        this.chargerDonnees();
      },
      error: (err) => {
        console.error('❌ Erreur marquage notification:', err);
      }
    });
  }

  actionNotification(notification: Notification) {
    const action = notification.donnees.action;
    const sessionId = notification.donnees.sessionId;

    // Marquer comme lue
    this.marquerNotificationLue(notification.id);

    // Effectuer l'action
    switch (action) {
      case 'confirmer_disponibilite':
        if (sessionId) {
          // Scroll vers la section des disponibilités
          const element = document.getElementById('disponibilites-section');
          element?.scrollIntoView({ behavior: 'smooth' });
        }
        break;

      case 'voir_projets':
        if (sessionId) {
          this.voirSession(sessionId);
        }
        break;

      default:
        // Juste marquer comme lue
        break;
    }
  }

  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(montant);
  }

  getStatutClass(statut: string): string {
    const classes: { [key: string]: string } = {
      'A évaluer': 'bg-amber-100 text-amber-800 border-amber-200',
      'En cours': 'bg-blue-100 text-blue-800 border-blue-200',
      'Terminé': 'bg-green-100 text-green-800 border-green-200',
    };
    return classes[statut] || 'bg-slate-100 text-slate-800 border-slate-200';
  }

  getSeveriteClass(severite: string): string {
    return this.notificationsService.getClasseSeverite(severite);
  }

  getIconeContexte(contexte: string): string {
    return this.notificationsService.getIconeContexte(contexte);
  }

  formatDate(dateString: string): string {
    return this.dashboardService.formatDate(dateString);
  }

  onAapChange(value: string) {
    this.selectedAapId.set(value);
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/evaluateur/login');
  }

  trackById = (index: number, item: any) => item.id;

  // Helper pour mapper les statuts backend vers frontend
  private mapStatut(statut: string): 'A évaluer' | 'En cours' | 'Terminé' {
    const mapping: { [key: string]: 'A évaluer' | 'En cours' | 'Terminé' } = {
      'EN_ATTENTE': 'A évaluer',
      'EN_COURS': 'En cours',
      'SOUMISE': 'Terminé',
      'ANNULEE': 'Terminé'
    };
    return mapping[statut] || 'A évaluer';
  }
}
