import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import {
  SessionsEvaluationService,
  DisponibiliteResponse,
} from '../../services/api/sessions-evaluation.service';

@Component({
  selector: 'app-disponibilites',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './disponibilites.html',
})
export class DisponibilitesComponent implements OnInit {
  private sessionsService = inject(SessionsEvaluationService);
  private auth = inject(AuthService);
  private router = inject(Router);

  // State
  disponibilites = signal<DisponibiliteResponse[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  processingSessionId = signal<string | null>(null);

  ngOnInit() {
    this.chargerDisponibilites();
  }

  /**
   * Charger les disponibilités en attente
   */
  chargerDisponibilites() {
    this.loading.set(true);
    this.error.set(null);

    this.sessionsService.getMesDisponibilites().subscribe({
      next: (response) => {
        console.log('✅ [ÉVALUATEUR] Disponibilités récupérées:', response.data);
        this.disponibilites.set(response.data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ [ÉVALUATEUR] Erreur chargement disponibilités:', err);
        this.error.set('Erreur lors du chargement des disponibilités');
        this.loading.set(false);
      },
    });
  }

  /**
   * Accepter une session
   */
  accepterSession(dispo: DisponibiliteResponse) {
    if (this.processingSessionId()) return;

    const confirmer = confirm(
      `Voulez-vous accepter la session "${dispo.session.nom}" ?\n\n` +
        `Du ${this.formatDate(dispo.session.dateDebut)} au ${this.formatDate(dispo.session.dateFin)}\n` +
        `Appel à projet : ${dispo.session.appelOffre?.titre || 'Non spécifié'}`
    );

    if (!confirmer) return;

    this.processingSessionId.set(dispo.sessionId);

    this.sessionsService.repondreDispo(dispo.sessionId, 'OUI').subscribe({
      next: (response) => {
        console.log('✅ Session acceptée:', response);
        alert(response.message || 'Session acceptée avec succès !');

        // Retirer la disponibilité de la liste
        this.disponibilites.update((dispos) =>
          dispos.filter((d) => d.sessionId !== dispo.sessionId)
        );

        this.processingSessionId.set(null);

        // Rediriger vers la page des projets
        this.router.navigate(['/evaluateur/projets']);
      },
      error: (err) => {
        console.error('❌ Erreur acceptation session:', err);
        alert(err.error?.error || 'Erreur lors de l\'acceptation de la session');
        this.processingSessionId.set(null);
      },
    });
  }

  /**
   * Refuser une session
   */
  refuserSession(dispo: DisponibiliteResponse) {
    if (this.processingSessionId()) return;

    const confirmer = confirm(
      `Voulez-vous refuser la session "${dispo.session.nom}" ?\n\n` +
        `Cette action est définitive.`
    );

    if (!confirmer) return;

    this.processingSessionId.set(dispo.sessionId);

    this.sessionsService.repondreDispo(dispo.sessionId, 'NON').subscribe({
      next: (response) => {
        console.log('✅ Session refusée:', response);
        alert(response.message || 'Session refusée');

        // Retirer la disponibilité de la liste
        this.disponibilites.update((dispos) =>
          dispos.filter((d) => d.sessionId !== dispo.sessionId)
        );

        this.processingSessionId.set(null);
      },
      error: (err) => {
        console.error('❌ Erreur refus session:', err);
        alert(err.error?.error || 'Erreur lors du refus de la session');
        this.processingSessionId.set(null);
      },
    });
  }

  /**
   * Formater une date
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Calculer le nombre de jours restants
   */
  joursRestants(dateDebut: string): number {
    const debut = new Date(dateDebut);
    const maintenant = new Date();
    const diff = debut.getTime() - maintenant.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Obtenir le badge de statut
   */
  getStatutBadge(jours: number): { text: string; class: string } {
    if (jours < 0) {
      return { text: 'En cours', class: 'bg-blue-100 text-blue-800' };
    } else if (jours <= 3) {
      return { text: 'Urgent', class: 'bg-red-100 text-red-800' };
    } else if (jours <= 7) {
      return { text: 'Bientôt', class: 'bg-orange-100 text-orange-800' };
    } else {
      return { text: `Dans ${jours} jours`, class: 'bg-green-100 text-green-800' };
    }
  }

  /**
   * Se déconnecter
   */
  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/evaluateur/login');
  }

  /**
   * Rafraîchir les données
   */
  refresh() {
    this.chargerDisponibilites();
  }

  /**
   * Track by function pour ngFor
   */
  trackById = (index: number, item: DisponibiliteResponse) => item.id;
}
