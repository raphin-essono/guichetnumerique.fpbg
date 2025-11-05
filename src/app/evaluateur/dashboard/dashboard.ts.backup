import { CommonModule, DatePipe } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth.service';

interface SessionEvaluation {
  id: string;
  intitule: string;
  dateDebut: string;
  dateFin: string;
  statut: 'Planifiée' | 'En cours' | 'Terminée';
  disponibiliteConfirmee: boolean;
  nbProjets: number;
  nbProjetsEvalues: number;
}

interface ProjetAEvaluer {
  id: string;
  identifiant: string;
  titre: string;
  budget: number;
  typeSubvention: string;
  date: string;
  statut: 'A évaluer' | 'En cours' | 'Terminé';
}

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

  // State
  sessions = signal<SessionEvaluation[]>([]);
  projets = signal<ProjetAEvaluer[]>([]);
  loading = signal(false);

  // Stats
  totalProjets = computed(() => this.projets().length);
  projetsEnCours = computed(() => this.projets().filter(p => p.statut === 'En cours').length);
  projetsTermines = computed(() => this.projets().filter(p => p.statut === 'Terminé').length);
  sessionActive = computed(() => this.sessions().find(s => s.statut === 'En cours'));

  // Recherche
  q = new FormControl<string>('', { nonNullable: true });
  filteredProjets = computed(() => {
    const query = (this.q.value || '').toLowerCase().trim();
    if (!query) return this.projets();
    return this.projets().filter((p) => {
      return (
        (p.titre || '').toLowerCase().includes(query) ||
        (p.identifiant || '').toLowerCase().includes(query) ||
        (p.typeSubvention || '').toLowerCase().includes(query)
      );
    });
  });

  ngOnInit() {
    this.chargerDonnees();
  }

  chargerDonnees() {
    this.loading.set(true);
    
    // TODO: Remplacer par des appels API réels
    // Données mockées pour l'instant
    this.sessions.set([
      {
        id: '1',
        intitule: 'Session d\'évaluation 2026',
        dateDebut: '2026-01-15',
        dateFin: '2026-02-28',
        statut: 'En cours',
        disponibiliteConfirmee: true,
        nbProjets: 10,
        nbProjetsEvalues: 3
      }
    ]);

    this.projets.set([
      {
        id: '32',
        identifiant: '32',
        titre: 'Restauration des mangroves',
        budget: 10000000,
        typeSubvention: 'Petite subvention',
        date: '23/09/2025',
        statut: 'En cours'
      },
      {
        id: '33',
        identifiant: '33',
        titre: 'pecherie artisanale',
        budget: 8000000,
        typeSubvention: 'Petite subvention',
        date: '20/09/2025',
        statut: 'A évaluer'
      },
      {
        id: '34',
        identifiant: '34',
        titre: 'Restauration et suivi de 10 hectares',
        budget: 60000000,
        typeSubvention: 'Moyenne subvention',
        date: '18/09/2025',
        statut: 'A évaluer'
      }
    ]);

    this.loading.set(false);
  }

  confirmerDisponibilite(sessionId: string) {
    const session = this.sessions().find(s => s.id === sessionId);
    if (session) {
      session.disponibiliteConfirmee = true;
      this.sessions.set([...this.sessions()]);
      alert('Disponibilité confirmée avec succès !');
    }
  }

  refuserDisponibilite(sessionId: string) {
    if (confirm('Êtes-vous sûr de refuser cette session ?')) {
      alert('Disponibilité refusée');
      // TODO: Appel API
    }
  }

  evaluerProjet(projetId: string) {
    this.router.navigate(['/evaluateur/evaluations', projetId]);
  }

  continuerEvaluation(projetId: string) {
    this.router.navigate(['/evaluateur/evaluations', projetId]);
  }

  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(montant);
  }

  getStatutClass(statut: string): string {
    const classes: { [key: string]: string } = {
      'A évaluer': 'bg-amber-100 text-amber-800',
      'En cours': 'bg-blue-100 text-blue-800',
      'Terminé': 'bg-green-100 text-green-800',
    };
    return classes[statut] || 'bg-slate-100 text-slate-800';
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/evaluateur/login');
  }

  trackById = (index: number, item: any) => item.id;
}