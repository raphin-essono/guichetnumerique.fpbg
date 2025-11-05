// app/user/dashboard/dashboard.ts
import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DemandeSubventionService } from '../../services/api/demande-subvention.service';
import { ProjetService } from '../../services/api/projet.service';
import {
  COULEURS_STATUT_SOUMISSION,
  DemandeSubvention,
  LABELS_STATUT_SOUMISSION,
  StatutSoumission,
} from '../../types/models';
import { AuthService } from '../core/auth.service';
// import { ToastHost } from '../ui/toast-host/toast-host';

type Submission = {
  id?: string;
  status: 'BROUILLON' | 'EN REVUE' | 'ACCEPTE' | 'REJETE';
  updatedAt: number;
};
type Collaborator = {
  id?: string;
  fullName: string;
  nom?: string;
  prenom?: string;
  email: string;
  telephone?: string;
  role: string;
};

const LS = {
  draft: 'fpbg.nc.draft',
  submission: 'fpbg.submission',
  collaborators: 'fpbg.collaborators',
  photo: 'fpbg.user.photo', // <= avatar (data:URL)
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    //  ToastHost
  ],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit, OnDestroy {
  [x: string]: any;
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  public router = inject(Router); // Public pour l'utiliser dans le template
  private projetService = inject(ProjetService);
  private demandeService = inject(DemandeSubventionService);

  /** === ÉTATS UI === */
  asideOpen = signal(false);
  imgError = signal(false);
  showAddCollaborator = signal(false);

  // Menu avatar
  avatarMenuOpen = signal(false);
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  /** === UTILISATEUR === */
  user = signal<{ fullName: string; photoUrl?: string }>({ fullName: 'Utilisateur' });

  /** === DONNÉES PROJET === */
  submission = signal<Submission | null>(null);
  currentProjetId = signal<string | null>(null);

  /** === DONNÉES DEMANDE SUBVENTION === */
  mesDemandes = signal<DemandeSubvention[]>([]);
  derniereDemande = signal<DemandeSubvention | null>(null);
  loadingDemandes = signal(false);

  /** === COLLABORATEURS === */
  collaborators = signal<Collaborator[]>([]);
  loadingCollabs = signal(false);
  collabForm = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: ['Éditeur', Validators.required],
  });

  // “cache” réactif de la dernière mise à jour
  private lastUpdatedAt = signal<number | null>(null);
  private heartbeat?: any;

  // ---------- lifecycle ----------
  // Dans Dashboard (TS)

  ngOnInit() {
    /** 1) Avatar : charger la photo locale AVANT tout rendu/asynchrone */
    const localPhoto = this.readPhotoFromLS() || '';
    const current = this.user();
    this.user.set({ ...current, photoUrl: localPhoto });
    this.imgError.set(false); // on repart d’un état sain au mount

    /** 2) Profil depuis AuthService (maj du nom, on préserve la photo) */
    this.auth.me().subscribe({
      next: (acc) => {
        const fullName = [acc.prenom, acc.nom].filter(Boolean).join(' ') || acc.login;
        // on garde la photo déjà chargée en mémoire / LS
        const photoUrl = this.user().photoUrl || this.readPhotoFromLS() || '';
        this.user.set({ fullName, photoUrl });
      },
      error: () => {
        // si me() échoue, au moins on conserve la photo locale déjà lue
        const u = this.user();
        this.user.set({ ...u, photoUrl: u.photoUrl || localPhoto });
      },
    });

    /** 3) Données projet + horodatage */
    this.refreshSubmissionFromStorage();
    this.refreshLastUpdated();

    /** 4) Charger le projet et les collaborateurs depuis le backend */
    this.loadProjectAndCollaborators();

    /** 5) Charger les demandes de subvention depuis le nouveau backend */
    this.chargerDemandes();

    /** 5) Listeners (MAJ live date + mutli-onglets) */
    window.addEventListener('storage', this.onStorage);
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('focus', this.onFocus);
    window.addEventListener('fpbg:draft-updated', this.onDraftEvent as EventListener);

    /** 6) Heartbeat : rafraîchit l’heure toutes les 5s */
    this.heartbeat = setInterval(() => this.refreshLastUpdated(), 5000);
  }

  /** Appelé si l’image ne charge pas (URL invalide, data:URL corrompue, etc.) */
  onAvatarLoadError() {
    // On bascule sur le fallback visuel, mais on NE supprime PAS la valeur LS.
    // Ainsi, si l’utilisateur recharge ou ré-uploade, l’avatar peut revenir.
    this.imgError.set(true);
    // Optionnel: log dev
    // console.warn('Avatar image failed to load; showing fallback.');
  }

  ngOnDestroy() {
    window.removeEventListener('storage', this.onStorage);
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('focus', this.onFocus);
    window.removeEventListener('fpbg:draft-updated', this.onDraftEvent as EventListener);
    if (this.heartbeat) clearInterval(this.heartbeat);
  }

  // ---------- Dernière MAJ ----------
  private onStorage = (e: StorageEvent) => {
    if (e.key === LS.submission || e.key === LS.draft) {
      this.refreshSubmissionFromStorage();
      this.refreshLastUpdated();
    }
    if (e.key === LS.photo) {
      // si la photo change dans un autre onglet
      const current = this.user();
      this.user.set({ ...current, photoUrl: this.readPhotoFromLS() || '' });
      this.imgError.set(false);
    }
  };
  private onVisibility = () => {
    if (!document.hidden) this.refreshLastUpdated();
  };
  private onFocus = () => this.refreshLastUpdated();
  private onDraftEvent = () => this.refreshLastUpdated();

  private refreshSubmissionFromStorage() {
    try {
      const subRaw = localStorage.getItem(LS.submission);
      this.submission.set(subRaw ? JSON.parse(subRaw) : null);
    } catch {
      this.submission.set(null);
    }
  }
  private readLastUpdatedAtFromStorage(): number | null {
    try {
      const subRaw = localStorage.getItem(LS.submission);
      if (subRaw) {
        const sub = JSON.parse(subRaw) as Submission;
        if (typeof sub?.updatedAt === 'number') return sub.updatedAt;
      }
    } catch {}
    try {
      const d = JSON.parse(localStorage.getItem(LS.draft) || 'null');
      if (typeof d?.updatedAt === 'number') return d.updatedAt;
      if (typeof d?.updatedAt === 'string') {
        const t = Date.parse(d.updatedAt);
        if (!Number.isNaN(t)) return t;
      }
      if (d?._updatedAt) {
        const t = Date.parse(d._updatedAt);
        if (!Number.isNaN(t)) return t;
      }
    } catch {}
    return null;
  }
  private refreshLastUpdated() {
    this.lastUpdatedAt.set(this.readLastUpdatedAtFromStorage());
  }
  lastUpdate(): number | null {
    return this.lastUpdatedAt();
  }

  // ---------- Avatar ----------
  toggleAvatarMenu(ev?: Event) {
    ev?.stopPropagation();
    this.avatarMenuOpen.update((v) => !v);
  }
  @HostListener('document:click')
  closeAvatarMenu() {
    this.avatarMenuOpen.set(false);
  }

  triggerAvatarUpload() {
    this.closeAvatarMenu();
    this.fileInputRef?.nativeElement?.click();
  }

  onAvatarFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // reset
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      alert('Formats acceptés : JPG, PNG, WebP');
      return;
    }
    const MAX = 2 * 1024 * 1024; // 2 Mo
    if (file.size > MAX) {
      alert('Image trop lourde (max 2 Mo).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      this.savePhotoToLS(dataUrl);
      const current = this.user();
      this.user.set({ ...current, photoUrl: dataUrl });
      this.imgError.set(false);
    };
    reader.readAsDataURL(file);
  }

  removeAvatar() {
    this.closeAvatarMenu();
    localStorage.removeItem(LS.photo);
    const current = this.user();
    this.user.set({ ...current, photoUrl: '' });
    this.imgError.set(true); // force fallback
  }

  private readPhotoFromLS(): string | null {
    try {
      return localStorage.getItem(LS.photo);
    } catch {
      return null;
    }
  }
  private savePhotoToLS(dataUrl: string) {
    try {
      localStorage.setItem(LS.photo, dataUrl);
    } catch {}
  }

  // ---------- Divers UI ----------
  toggleAside() {
    this.asideOpen.update((v) => !v);
  }
  initials(): string {
    const n = this.user().fullName || '';
    return n
      .split(' ')
      .map((s) => s.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  hasProject(): boolean {
    return this.isDraft() || !!this.submission();
  }
  isDraft(): boolean {
    return !!localStorage.getItem(LS.draft);
  }

  status(): string {
    if (this.isDraft()) return 'BROUILLON';
    return this.submission()?.status ?? '';
  }
  statusClass(): string {
    const s = this.status();
    if (s === 'BROUILLON') return 'bg-amber-100 text-amber-800';
    if (s === 'EN REVUE') return 'bg-blue-100 text-blue-800';
    if (s === 'ACCEPTE') return 'bg-green-100 text-green-800';
    if (s === 'REJETE') return 'bg-red-100 text-red-800';
    return 'bg-slate-200 text-slate-800';
  }

  ctaLabel(): string {
    if (!this.hasProject()) return 'Créer un projet';
    if (this.isDraft()) return 'Continuer le formulaire';
    return 'Voir le projet';
  }

  primaryActionClick() {
    if (!this.hasProject() || this.isDraft()) this.router.navigate(['/soumission']);
    else this.goRecap();
    this.asideOpen.set(false);
  }

  scrollTo(id: string) {
    this.asideOpen.set(false);
    // 👉 Met la bonne version selon ton préfixe de module :
    const toWizard = '/soumission'; // ou '/user/soumission'
    const toRecap = '/form/recap/current'; // ou '/user/form/recap/current'

    if (!this.hasProject() || this.isDraft()) {
      this.router.navigateByUrl(toWizard);
    } else {
      this.router.navigateByUrl(toRecap);
    }
  }
  // Dashboard.ts
  goRecap() {
    const meta = JSON.parse(localStorage.getItem('submission_meta') || 'null');
    const id = meta?.id ?? 'current';
    this.router.navigate(['/form/recap', id]);
  }

  logout() {
    this.closeAvatarMenu();
    this.auth.logout().subscribe(() => this.router.navigate(['/login']));
  }

  // Cartes d’actions
  startProject() {
    if (!this.isDraft()) {
      const now = Date.now();
      const draft = {
        createdAt: now,
        updatedAt: now,
        _updatedAt: new Date(now).toISOString(),
        step: 1,
      };
      localStorage.setItem(LS.draft, JSON.stringify(draft));
    }
    this.refreshLastUpdated();
    this.router.navigate(['/soumission']);
  }
  resumeDraft() {
    this.router.navigate(['/soumission']);
  }
  clearDraftOnly() {
    localStorage.removeItem(LS.draft);
    this.refreshLastUpdated();
  }
  submitProjectMock() {
    const submission: Submission = {
      id: crypto.randomUUID(),
      status: 'EN REVUE',
      updatedAt: Date.now(),
    };
    localStorage.setItem(LS.submission, JSON.stringify(submission));
    localStorage.removeItem(LS.draft);
    this.submission.set(submission);
    this.refreshLastUpdated();
    alert('Projet soumis (mode démo).');
  }

  /** Charger le projet et les collaborateurs depuis le backend */
  loadProjectAndCollaborators() {
    // ❌ DÉSACTIVÉ - Route obsolète /my-project qui causait des erreurs 500
    // On se base maintenant uniquement sur le système de demandes de subvention
    this.loadingCollabs.set(false);

    // Fallback sur localStorage pour les collaborateurs
    try {
      this.collaborators.set(JSON.parse(localStorage.getItem(LS.collaborators) || '[]'));
    } catch {
      this.collaborators.set([]);
    }

    /* CODE DÉSACTIVÉ - Ancienne version avec getMyProject()
    this.loadingCollabs.set(true);

    // Charger le projet de l'utilisateur
    this.projetService.getMyProject().subscribe({
      next: (projet) => {
        if (projet && projet.id) {
          this.currentProjetId.set(projet.id);

          // Charger les collaborateurs
          this.projetService.getMyCollaborateurs().subscribe({
            next: (collabs) => {

              // Transformer les données backend en format UI
              const formatted: Collaborator[] = collabs.map((c: any) => ({
                id: c.id,
                fullName: `${c.prenom || ''} ${c.nom || ''}`.trim(),
                nom: c.nom,
                prenom: c.prenom,
                email: c.email,
                telephone: c.telephone,
                role: c.role || 'Collaborateur',
              }));

              this.collaborators.set(formatted);
            },
            error: (error) => {
              console.error('❌ Erreur lors du chargement des collaborateurs:', error);
              // Fallback sur localStorage si le backend échoue
              try {
                this.collaborators.set(JSON.parse(localStorage.getItem(LS.collaborators) || '[]'));
              } catch {
                // noop
              }
            }
          });
        }
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement du projet:', error);
      },
      complete: () => {
        this.loadingCollabs.set(false);
      }
    });
    */
  }

  async addCollaborator() {
    if (this.collabForm.invalid) {
      this.collabForm.markAllAsTouched();
      return;
    }

    const projetId = this.currentProjetId();
    if (!projetId) {
      alert("Aucun projet trouvé. Veuillez d'abord créer un projet.");
      return;
    }

    try {
      const formValue = this.collabForm.getRawValue();
      const [prenom, ...nomParts] = (formValue.fullName || '').trim().split(' ');
      const nom = nomParts.join(' ');

      const collaborateurData = {
        nom: nom || prenom, // Si pas de nom, utiliser prenom comme nom
        prenom: nom ? prenom : '', // Si pas de nom, prenom est vide
        email: formValue.email || '',
        telephone: '',
        role: formValue.role || 'Collaborateur',
      };

      // Appel backend
      const result = await this.projetService.addCollaborateur(projetId, collaborateurData);

      // Recharger la liste des collaborateurs
      await this.loadProjectAndCollaborators();

      // Reset formulaire
      this.collabForm.reset({ role: 'Éditeur' });
      this.showAddCollaborator.set(false);

      console.log('✅ Collaborateur ajouté:', result);
    } catch (error: any) {
      console.error("❌ Erreur lors de l'ajout du collaborateur:", error);
      alert(error?.response?.data?.message || "Erreur lors de l'ajout du collaborateur");
    }
  }

  projectName(): string {
    // Priorité 1 : Dernière demande depuis le backend
    const demande = this.derniereDemande();
    if (demande?.titre) {
      return demande.titre;
    }

    // Priorité 2 : Draft localStorage (ancien système)
    try {
      const d = JSON.parse(localStorage.getItem(LS.draft) || 'null');
      return d?.data?.titre?.trim?.() || d?.title || '';
    } catch {
      return '';
    }
  }

  /**
   * Charger les demandes de subvention depuis le nouveau backend
   */
  chargerDemandes() {
    console.log('🔄 [USER DASHBOARD] Chargement des demandes de subvention...');
    this.loadingDemandes.set(true);
    this.demandeService.obtenirMesDemandes().subscribe({
      next: (response) => {
        console.log('✅ [USER DASHBOARD] Demandes récupérées:', response);
        console.log('   Nombre de demandes:', response.data.length);
        this.mesDemandes.set(response.data);

        // Prendre la dernière demande
        if (response.data.length > 0) {
          const derniere = response.data[0];
          console.log('   Dernière demande:', derniere.titre);
          this.derniereDemande.set(derniere);

          // Mettre à jour les données du dashboard
          const submission: Submission = {
            id: derniere.id,
            status: this.mapStatutToOldFormat(derniere.statut),
            updatedAt: new Date(derniere.misAJourLe).getTime(),
          };
          this.submission.set(submission);
          localStorage.setItem(LS.submission, JSON.stringify(submission));
          this.refreshLastUpdated();
        } else {
          console.log('   Aucune demande trouvée pour cet utilisateur');
        }

        this.loadingDemandes.set(false);
      },
      error: (err) => {
        console.error('❌ [USER DASHBOARD] Erreur chargement demandes:', err);
        console.error('   Status:', err.status);
        console.error('   Message:', err.message);
        console.error('   Details:', err.error);
        this.loadingDemandes.set(false);
      },
    });
  }

  /**
   * Mapper le nouveau format de statut vers l'ancien
   */
  private mapStatutToOldFormat(statut: string): 'BROUILLON' | 'EN REVUE' | 'ACCEPTE' | 'REJETE' {
    const mapping: Record<string, 'BROUILLON' | 'EN REVUE' | 'ACCEPTE' | 'REJETE'> = {
      BROUILLON: 'BROUILLON',
      SOUMIS: 'EN REVUE',
      EN_REVUE: 'EN REVUE',
      APPROUVE: 'ACCEPTE',
      REJETE: 'REJETE',
    };
    return mapping[statut] || 'BROUILLON';
  }

  /**
   * Obtenir le label du statut en français
   */
  statutLabel(demande?: DemandeSubvention): string {
    const d = demande || this.derniereDemande();
    if (d) {
      return (
        LABELS_STATUT_SOUMISSION[d.statut as keyof typeof LABELS_STATUT_SOUMISSION] || d.statut
      );
    }
    return this.status();
  }

  /**
   * Obtenir la classe CSS du statut
   */
  statutCssClass(demande?: DemandeSubvention): string {
    const d = demande || this.derniereDemande();
    if (d) {
      return (
        COULEURS_STATUT_SOUMISSION[d.statut as keyof typeof COULEURS_STATUT_SOUMISSION] ||
        this.statusClass()
      );
    }
    return this.statusClass();
  }

  /**
   * TrackBy function pour optimiser le rendu de la liste
   */
  trackById = (index: number, item: DemandeSubvention) => item.id;

  /**
   * Compter les demandes approuvées
   */
  getApprovedCount(): number {
    return this.mesDemandes().filter((d) => d.statut === 'APPROUVE').length;
  }

  /**
   * Compter les demandes en attente (soumises ou en revue)
   */
  getPendingCount(): number {
    return this.mesDemandes().filter((d) => d.statut === 'SOUMIS' || d.statut === 'EN_REVUE')
      .length;
  }

  /**
   * Calculer le budget total du projet
   * Utilise montantTotal s'il existe, sinon calcule depuis les lignes de budget
   */
  getBudgetTotal(demande: DemandeSubvention): number {
    // Si montantTotal existe, l'utiliser
    if (demande.montantTotal && demande.montantTotal > 0) {
      return demande.montantTotal;
    }

    // Sinon, calculer depuis les activités et lignes de budget
    let total = 0;

    if (demande.activites && demande.activites.length > 0) {
      demande.activites.forEach((activite) => {
        if (activite.lignesBudget && activite.lignesBudget.length > 0) {
          activite.lignesBudget.forEach((ligne) => {
            total += ligne.cfa || 0;
          });
        }
      });
    }

    // Si on a trouvé un total via les lignes de budget, le retourner
    if (total > 0) {
      return total;
    }

    // Sinon, utiliser les champs de budget directs
    const terrainCfa = demande.terrainCfa || 0;
    const investCfa = demande.investCfa || 0;
    const overheadCfa = demande.overheadCfa || 0;
    const cofinCfa = demande.cofinCfa || 0;
    const fraisIndirectsCfa = demande.fraisIndirectsCfa || 0;

    return terrainCfa + investCfa + overheadCfa + cofinCfa + fraisIndirectsCfa;
  }
}
