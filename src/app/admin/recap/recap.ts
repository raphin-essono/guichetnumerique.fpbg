// app/user/form/recap/recap.ts
import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DemandeSubventionService } from '../../services/api/demande-subvention.service';
import { DemandeSubvention, Activite as ActiviteModel, LigneBudget, Risque as RisqueModel, PieceJointe, StatutSoumission } from '../../types/models';
import { PdfService } from '../../services/pdf.service';
import { Subscription } from 'rxjs';

type SubmissionStatus = 'BROUILLON' | 'SOUMIS' | 'EN_REVUE' | 'ACCEPTE' | 'REFUSE';

interface Activity {
  label: string;
  months?: number[];
}
interface Risk {
  description: string;
  mitigation: string;
}
interface BudgetLine {
  category: 'ACTIVITES_TERRAIN' | 'INVESTISSEMENTS' | 'FONCTIONNEMENT';
  description: string;
  total: number;
  partFPBG?: number;
  partCofinance?: number;
}
interface Step1 {
  nom_organisation: string;
  type: string;
  contactPerson: string;
  geocouvertureGeographique: string;
  domains: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
}
interface Step2 {
  title: string;
  locationAndTarget: string;
  contextJustification: string;
}
interface Step3 {
  objectives: string;
  expectedResults: string;
  durationMonths: number;
}
interface StateStep {
  projectStage: string;
  hasFunding: boolean;
  fundingDetails?: string;
}
interface SustainabilityStep {
  sustainability?: string;
  replicability?: string;
}
interface Attachment {
  key: string;
  label: string;
  fileName: string;
  fileSize: number;
  fileType?: string;
  base64?: string;
  url?: string;
}
interface Submission {
  step1: Step1;
  step2: Step2;
  step3: Step3;
  activitiesSummary?: string;
  activities?: Activity[];
  risks?: Risk[];
  budgetLines?: BudgetLine[];
  stateStep?: StateStep;
  sustainabilityStep?: SustainabilityStep;
  attachments?: Attachment[] | Record<string, string>; // Support both formats
  status?: SubmissionStatus;
  updatedAt?: number;
}

const ADMIN_DATA_KEY = 'fpbg_admin_records'; // liste des dossiers "soumis" (ton wizard l’écrit)
const SUBMISSION_META_KEY = 'submission_meta'; // { id, status, updatedAt } (écrit au submit)
const DRAFT_KEYS = ['fpbg.nc.draft', 'fpbg_submission_v2']; // brouillon (selon version)

@Component({
  selector: 'app-submission-recap',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './recap.html',
})
export class SubmissionRecap implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private demandeService = inject(DemandeSubventionService);
  private pdfService = inject(PdfService);
  private sanitizer = inject(DomSanitizer);
  private subs = new Subscription();

  
  /** ===== Chargement depuis LS ===== */
  private loadFromSubmitted(idHint?: string | null): Submission | null {
    try {
      const meta = JSON.parse(localStorage.getItem(SUBMISSION_META_KEY) || 'null');
      const id = idHint || meta?.id;
      if (!id) return null;

      const list = JSON.parse(localStorage.getItem(ADMIN_DATA_KEY) || '[]') as any[];
      const rec = list.find((r) => r?.id === id);
      if (!rec) return null;

      // mapping -> notre interface Submission
      const p = rec.project || {};
      const s: Submission = {
        step1: p.step1 || {
          nom_organisation: p.nom_organisation || '—',
          type: p.type || '—',
          contactPerson: p.contact || '—',
          geocouvertureGeographique: p.couvertureGeographique || '—',
          domains: (p.domains || []).join(', ') || '—',
          address: p.address || '—',
          contactEmail: p.email || '—',
          contactPhone: p.phone || '—',
        },
        step2: {
          title: p.title || '—',
          locationAndTarget: p.locationAndTarget || '—',
          contextJustification: p.contextJustification || '—',
        },
        step3: {
          objectives: p.objectives || '—',
          expectedResults: p.expectedResults || '—',
          durationMonths: +p.durationMonths || 0,
        },
        activitiesSummary: p.activitiesSummary || '',
        activities: p.activities || [],
        risks: p.risks || [],
        budgetLines: p.budgetLines || [],
        stateStep: {
          projectStage: p.projectStage || 'CONCEPTION',
          hasFunding: !!p.hasFunding,
          fundingDetails: p.fundingDetails || '',
        },
        sustainabilityStep: {
          sustainability: p.sustainability || '',
          replicability: p.replicability || '',
        },
        attachments: rec.attachments || {},
        status: rec.status || 'SOUMIS',
        updatedAt: rec.updatedAt || Date.now(),
      };
      return s;
    } catch {
      return null;
    }
  }

  private loadFromDraft(): Submission | null {
    // Essaie plusieurs clés de brouillon
    for (const k of DRAFT_KEYS) {
      try {
        const d = JSON.parse(localStorage.getItem(k) || 'null');
        if (!d) continue;

        // mapping "léger" pour afficher quelque chose de propre
        const s: Submission = {
          step1: {
            nom_organisation: d?.nom_organisation || '—',
            type: d?.type || '—',
            contactPerson: d?.contact || '—',
            geocouvertureGeographique: d?.couvertureGeographique || '—',
            domains: (d?.stepProp?.domains || []).join(', ') || '—',
            address: d?.address || '—',
            contactEmail: d?.email || '—',
            contactPhone: d?.phone || '—',
          },
          step2: {
            title: d?.stepProp?.title || d?.title || '—',
            locationAndTarget: d?.stepProp?.locationAndTarget || '—',
            contextJustification: d?.stepProp?.contextJustification || '—',
          },
          step3: {
            objectives: d?.stepObj?.objectives || '—',
            expectedResults: d?.stepObj?.expectedResults || '—',
            durationMonths: +d?.stepObj?.durationMonths || 0,
          },
          activitiesSummary: d?.activitiesSummary || '',
          activities: d?.activities || [],
          risks: d?.risques || [],
          budgetLines: d?.budgetLines || [],
          stateStep: {
            projectStage: d?.stateStep?.projectStage || 'CONCEPTION',
            hasFunding: !!d?.stateStep?.hasFunding,
            fundingDetails: d?.stateStep?.fundingDetails || '',
          },
          sustainabilityStep: {
            sustainability: d?.sustainabilityStep?.sustainability || '',
            replicability: d?.sustainabilityStep?.replicability || '',
          },
          attachments: {},
          status: 'BROUILLON',
          updatedAt: d?.updatedAt || Date.now(),
        };
        return s;
      } catch {
        /* continue */
      }
    }
    return null;
  }

  private loadInitial(): Submission | null {
    const idFromRoute = this.route.snapshot.paramMap.get('id');
    return this.loadFromSubmitted(idFromRoute) || this.loadFromDraft() || null;
  }

  submission = signal<Submission | null>(this.loadInitial());
  isLoading = signal(true);

  /** ====== Utils d’affichage ====== */
  status = computed<SubmissionStatus | null>(() => this.submission()?.status ?? null);

  budgetTotal = computed(() =>
    (this.submission()?.budgetLines ?? []).reduce((s, b) => s + (+b.total || 0), 0)
  );
  budgetFonct = computed(() =>
    (this.submission()?.budgetLines ?? [])
      .filter((b) => b.category === 'FONCTIONNEMENT')
      .reduce((s, b) => s + (+b.total || 0), 0)
  );
  budgetWarn = computed(() => {
    const tot = this.budgetTotal() || 0;
    const fct = this.budgetFonct() || 0;
    return tot > 0 && fct / tot > 0.1;
  });

  short(text?: string, n = 220) {
    if (!text) return '—';
    return text.length > n ? text.slice(0, n).trim() + '…' : text;
  }

  /** ===== Modal plein écran ===== */
  modalOpen = signal(false);
  modal = signal<{ title: string; text: string } | null>(null);
  openModal(title: string, text?: string) {
    this.modal.set({ title, text: text || '—' });
    this.modalOpen.set(true);
  }
  closeModal() {
    this.modalOpen.set(false);
    this.modal.set(null);
  }
  private escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.closeModal();
  };
  ngOnInit() {
    document.addEventListener('keydown', this.escHandler);
    const idFromRoute = this.route.snapshot.paramMap.get('id');

    if (idFromRoute) {
      this.isLoading.set(true);

      if (idFromRoute === 'current') {
        this.subs.add(
          this.demandeService.obtenirMesDemandes().subscribe({
            next: (res) => {
              const list = res?.data || [];
              if (list.length > 0) {
                const first = list[0];
                this.submission.set(this.mapDemandeToSubmission(first));
                // store backend id for actions
                this.currentDemandeId.set(first.id || null);
              }
              this.isLoading.set(false);
            },
            error: () => {
              this.isLoading.set(false);
            },
          })
        );
      } else {
        this.subs.add(
          this.demandeService.obtenirParId(idFromRoute).subscribe({
            next: (res) => {
              const d = res?.data;
              if (d) {
                this.submission.set(this.mapDemandeToSubmission(d));
                // store backend id for actions
                this.currentDemandeId.set(d.id || idFromRoute);
              }
              this.isLoading.set(false);
            },
            error: () => {
              this.isLoading.set(false);
            },
          })
        );
      }
    } else {
      this.isLoading.set(false);
    }
  }
  ngOnDestroy() {
    document.removeEventListener('keydown', this.escHandler);
    this.subs.unsubscribe();
  }

  /** Map backend DemandeSubvention -> Submission (template shape) */
  private mapDemandeToSubmission(d: DemandeSubvention): Submission {
    const step1: Step1 = {
      nom_organisation: d.organisation?.nom || d.organisation?.id || '—',
      type: d.organisation?.type || '—',
      contactPerson: d.soumisPar ? `${d.soumisPar.prenom || ''} ${d.soumisPar.nom || ''}`.trim() : '—',
      // Use request localisation as a fallback for geographic coverage/address
      geocouvertureGeographique: d.localisation || '—',
      domains: (d.domaines || []).join(', ') || '—',
      address: d.localisation || '—',
      contactEmail: d.organisation?.email || d.soumisPar?.email || '—',
      contactPhone: d.organisation?.telephone || d.soumisPar?.telephone || '—',
    };

    const step2: Step2 = {
      title: d.titre || '—',
      locationAndTarget: `${d.localisation || '—'}${d.groupeCible ? ' — ' + d.groupeCible : ''}`,
      contextJustification: d.justificationContexte || '—',
    };

    const step3: Step3 = {
      objectives: d.objectifs || '—',
      expectedResults: d.resultatsAttendus || '—',
      durationMonths: +d.dureeMois || 0,
    };

    const activities: Activity[] = (d.activites || []).map((a: ActiviteModel) => ({
      label: a.titre || a.resume || '—',
      months: undefined,
    }));

    const risks: Risk[] = (d.risques || []).map((r: RisqueModel) => ({
      description: r.description || '—',
      mitigation: r.mitigation || '—',
    }));

    // Calculer le budget depuis les lignesBudget des activités
    const budgetLines: BudgetLine[] = [];
    const budgetMap = new Map<string, { total: number; fpbg: number; cofin: number }>();

    // Parcourir toutes les activités et leurs lignes de budget
    (d.activites || []).forEach((activite: ActiviteModel) => {
      (activite.lignesBudget || []).forEach((ligne: LigneBudget) => {
        const montant = Number(ligne.cfa) || 0;
        const pctFpbg = ligne.pctFpbg || 0;
        const pctCofin = ligne.pctCofin || 0;

        // Regrouper par type (DIRECT = ACTIVITES_TERRAIN, INDIRECT = FONCTIONNEMENT)
        const category = ligne.type === 'INDIRECT' ? 'FONCTIONNEMENT' : 'ACTIVITES_TERRAIN';
        const key = `${category}_${ligne.libelle}`;

        if (!budgetMap.has(key)) {
          budgetMap.set(key, { total: 0, fpbg: 0, cofin: 0 });
        }

        const entry = budgetMap.get(key)!;
        entry.total += montant;
        entry.fpbg += (montant * pctFpbg) / 100;
        entry.cofin += (montant * pctCofin) / 100;
      });
    });

    // Ajouter les frais indirects
    const fraisIndirects = Number(d.fraisIndirectsCfa) || 0;
    if (fraisIndirects > 0) {
      budgetLines.push({
        category: 'FONCTIONNEMENT',
        description: 'Frais indirects',
        total: fraisIndirects,
        partFPBG: fraisIndirects,
        partCofinance: 0
      });
    }

    // Convertir la Map en array de BudgetLine
    budgetMap.forEach((value, key) => {
      const [category, description] = key.split('_');
      budgetLines.push({
        category: category as any,
        description: description || 'Ligne budgétaire',
        total: value.total,
        partFPBG: value.fpbg,
        partCofinance: value.cofin
      });
    });

    // Transformer les pièces jointes en format Attachment[]
    // Le backend peut stocker soit base64 (temporaire) soit url (optimisé)
    const attachments: Attachment[] = (d.piecesJointes || []).map((p: PieceJointe) => ({
      key: p.cle || p.nomFichier || p.id || '',
      label: p.cle || 'Document',
      fileName: p.nomFichier || 'document.pdf',
      fileSize: 0, // Pas disponible depuis le backend pour l'instant
      fileType: 'application/pdf',
      base64: (p as any).base64 || undefined, // Si stocké temporairement en BDD
      url: p.url || undefined, // Si stocké sur serveur de fichiers (optimisé)
    }));

    // Map status from backend enum to the older SubmissionStatus
    let status: SubmissionStatus = 'SOUMIS';
    if (d.statut === 'BROUILLON') status = 'BROUILLON';
    else if (d.statut === 'EN_REVUE') status = 'EN_REVUE';
    else if (d.statut === 'APPROUVE') status = 'ACCEPTE';
    else if (d.statut === 'REJETE') status = 'REFUSE';

    const submission: Submission = {
      step1,
      step2,
      step3,
      activitiesSummary: d.resumeActivites || '',
      activities,
      risks,
      budgetLines,
      stateStep: {
        projectStage: d.stadeProjet || (d.stadeProjet as any) || 'CONCEPTION',
        hasFunding: !!d.aFinancement,
        fundingDetails: d.detailsFinancement || '',
      },
      sustainabilityStep: {
        sustainability: d.texteDurabilite || '',
        replicability: d.texteReplication || '',
      },
      attachments,
      status,
      updatedAt: d.misAJourLe ? +new Date(d.misAJourLe) : Date.now(),
    };

    return submission;
  }

  /** ===== Stepper d’affichage ===== */
  stepIndex = signal(0);
  stepTitles = [
    'Demandeur / Soumissionnaire',
    'Proposition de projet',
    'Objectifs & résultats',
    'Activités & calendrier',
    'Risques',
    'Budget estimatif',
    'État & financement',
    'Durabilité & réplication',
    'Annexes',
  ];
  goTo = (i: number) => {
    if (i >= 0 && i < this.stepTitles.length) this.stepIndex.set(i);
  };
  next = () => this.goTo(this.stepIndex() + 1);
  prev = () => this.goTo(this.stepIndex() - 1);
  progress = computed(() => Math.round(((this.stepIndex() + 1) / this.stepTitles.length) * 100));

  protected readonly Object = Object;

  /** Lien de fichier (assets locaux ou URL absolue) */
  fileHref(v?: string): string {
    if (!v) return '#';
    if (/^(https?:\/\/|data:|blob:)/i.test(v)) return v;
    return `/assets/uploads/${v}`;
  }

  /** ===== Gestion des PDF ===== */
  // Signal pour le PDF sélectionné
  selectedPdfKey = signal<string | null>(null);
  selectedPdfUrl = signal<SafeResourceUrl | null>(null);
  selectedPdfFileName = signal<string>('');

  /**
   * Affiche un PDF dans le visualiseur modal
   * Supporte base64 (soumission récente) OU url (stockage optimisé)
   */
  showPdf(attachment: any): void {
    if (!attachment) return;

    let pdfUrl: string;

    // Priorité 1 : Base64 (soumission récente, données en mémoire)
    if (attachment.base64) {
      pdfUrl = this.pdfService.getDataUrl(attachment.base64);
    }
    // Priorité 2 : URL (stockage optimisé sur serveur)
    else if (attachment.url) {
      pdfUrl = attachment.url;
    }
    else {
      console.warn('Aucun contenu PDF disponible pour cet attachement');
      return;
    }

    const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
    this.selectedPdfKey.set(attachment.key || attachment.fileName);
    this.selectedPdfUrl.set(safeUrl);
    this.selectedPdfFileName.set(attachment.fileName || 'document.pdf');
  }

  /**
   * Télécharge un PDF
   * Supporte base64 (soumission récente) OU url (stockage optimisé)
   */
  downloadPdf(attachment: any): void {
    if (!attachment) return;

    const link = document.createElement('a');

    // Priorité 1 : Base64 (soumission récente)
    if (attachment.base64) {
      link.href = this.pdfService.getDataUrl(attachment.base64);
    }
    // Priorité 2 : URL (stockage optimisé)
    else if (attachment.url) {
      link.href = attachment.url;
    }
    else {
      console.warn('Aucun contenu PDF disponible pour le téléchargement');
      return;
    }

    link.download = attachment.fileName || 'document.pdf';
    link.click();
  }

  /**
   * Ferme le visualiseur PDF
   */
  closePdfViewer(): void {
    this.selectedPdfKey.set(null);
    this.selectedPdfUrl.set(null);
    this.selectedPdfFileName.set('');
  }

  /**
   * Formate la taille d'un fichier
   */
  formatFileSize(bytes: number): string {
    return this.pdfService.formatFileSize(bytes);
  }

  /**
   * Vérifie si un attachement a du contenu disponible (base64 ou URL)
   */
  hasPdfContent(attachment: any): boolean {
    return !!(attachment && (attachment.base64 || attachment.url));
  }

  /**
   * Récupère les attachments en tant que tableau
   * Compatible avec ancien format Record<string, string> et nouveau format Attachment[]
   */
  getAttachmentsArray(): Attachment[] {
    const attachments = this.submission()?.attachments;

    if (!attachments) return [];

    // Si c'est déjà un tableau, le retourner
    if (Array.isArray(attachments)) {
      return attachments;
    }

    // Sinon, convertir le Record en tableau (ancien format)
    return Object.entries(attachments).map(([key, value]) => ({
      key,
      label: key,
      fileName: value || 'document.pdf',
      fileSize: 0,
      fileType: 'application/pdf',
      url: value,
    }));
  }

  // NEW: id courant si la submission vient du backend (permet appels API)
  currentDemandeId = signal<string | null>(null);

  // NEW: actions (modaux / raison / loading)
  actionLoading = signal(false);
  confirmModalOpen = signal(false);
  rejectModalOpen = signal(false);
  rejectReason = signal('');

  /** ===== Actions admin : confirmer conformité / rejeter avec motif ===== */

  openConfirmModal() {
    this.confirmModalOpen.set(true);
  }
  closeConfirmModal() {
    this.confirmModalOpen.set(false);
  }

  openRejectModal() {
    this.rejectModalOpen.set(true);
  }
  closeRejectModal() {
    this.rejectModalOpen.set(false);
    this.rejectReason.set('');
  }

  // confirmConformity() {
  //   const id = this.currentDemandeId();
  //   if (!id) {
  //     this.openModal('Erreur', "Impossible d'envoyer la requête : identifiant introuvable.");
  //     this.closeConfirmModal();
  //     return;
  //   }

  //   this.actionLoading.set(true);
  //   // utiliser any cast pour éviter mismatch signature si le service n'attend pas d'option
  //   (this.demandeService as any).changerStatut(id, StatutSoumission.EN_REVUE).subscribe({
  //     next: (res: any) => {
  //       this.actionLoading.set(false);
  //       // Mettre à jour l'affichage localement
  //       this.submission.update((s) => (s ? { ...s, status: 'EN_REVUE', updatedAt: Date.now() } : s));
  //       this.closeConfirmModal();
  //       this.openModal('Confirmation', "Le projet a été placé en revue.");
  //     },
  //     error: (err: any) => {
  //       this.actionLoading.set(false);
  //       console.error('Erreur confirmation conformité', err);
  //       this.openModal('Erreur', "Erreur lors du passage en revue. Veuillez réessayer.");
  //     },
  //   });
  // }

  // rejectWithReason() {
  //   const id = this.currentDemandeId();
  //   if (!id) {
  //     this.openModal('Erreur', "Impossible d'envoyer la requête : identifiant introuvable.");
  //     this.closeRejectModal();
  //     return;
  //   }

  //   const motif = this.rejectReason() || '';
  //   if (!motif.trim()) {
  //     this.openModal('Information', 'Veuillez saisir le motif du rejet avant de confirmer.');
  //     return;
  //   }

  //   this.actionLoading.set(true);
  //   // on envoie le changement de statut ; on tente de passer le motif si le backend l'accepte
  //   (this.demandeService as any).changerStatut(id, StatutSoumission.REJETE, { motif }).subscribe({
  //     next: (res: any) => {
  //       this.actionLoading.set(false);
  //       this.submission.update((s) => (s ? { ...s, status: 'REFUSE', updatedAt: Date.now() } : s));
  //       this.closeRejectModal();
  //       this.openModal('Rejet enregistré', 'Le projet a été rejeté pour non-conformité.');
  //     },
  //     error: (err: any) => {
  //       this.actionLoading.set(false);
  //       console.error('Erreur rejet', err);
  //       this.openModal('Erreur', "Erreur lors du rejet. Veuillez réessayer.");
  //     },
  //   });
  // }
  

  confirmConformity() {
    const id = this.currentDemandeId();
    if (!id) {
      this.openModal('Erreur', "Impossible d'envoyer la requête : identifiant introuvable.");
      this.closeConfirmModal();
      return;
    }

    this.actionLoading.set(true);
    
    // ✅ Envoyer le statut EN_REVUE au backend
    this.demandeService.changerStatut(id, StatutSoumission.EN_REVUE).subscribe({
      next: (res: any) => {
        this.actionLoading.set(false);
        this.closeConfirmModal();
        
        // ✅ Recharger les données depuis le backend pour garantir la synchronisation
        this.demandeService.obtenirParId(id).subscribe({
          next: (reloadRes) => {
            if (reloadRes?.data) {
              this.submission.set(this.mapDemandeToSubmission(reloadRes.data));
            }
            this.openModal('Confirmation', "Le projet a été placé en revue avec succès.");
          },
          error: () => {
            // Fallback : mise à jour locale si rechargement échoue
            this.submission.update((s) => (s ? { ...s, status: 'EN_REVUE', updatedAt: Date.now() } : s));
            this.openModal('Confirmation', "Le projet a été placé en revue.");
          }
        });
      },
      error: (err: any) => {
        this.actionLoading.set(false);
        console.error('Erreur confirmation conformité', err);
        this.openModal('Erreur', "Erreur lors du passage en revue. Veuillez réessayer.");
      },
    });
  }

  rejectWithReason() {
    const id = this.currentDemandeId();
    if (!id) {
      this.openModal('Erreur', "Impossible d'envoyer la requête : identifiant introuvable.");
      this.closeRejectModal();
      return;
    }

    const motif = this.rejectReason() || '';
    if (!motif.trim()) {
      this.openModal('Information', 'Veuillez saisir le motif du rejet avant de confirmer.');
      return;
    }

    this.actionLoading.set(true);
    
    // ✅ CORRECTION : Utiliser mettreAJour pour envoyer statut + motifRejet
    this.demandeService.mettreAJour(id, { 
      statut: StatutSoumission.REJETE,
      motifRejet: motif 
    } as any).subscribe({
      next: (res: any) => {
        this.actionLoading.set(false);
        this.closeRejectModal();
        
        // ✅ Recharger les données depuis le backend
        this.demandeService.obtenirParId(id).subscribe({
          next: (reloadRes) => {
            if (reloadRes?.data) {
              this.submission.set(this.mapDemandeToSubmission(reloadRes.data));
            }
            this.openModal('Rejet enregistré', `Le projet a été rejeté.\n\nMotif : ${motif}`);
          },
          error: () => {
            // Fallback : mise à jour locale
            this.submission.update((s) => (s ? { ...s, status: 'REFUSE', updatedAt: Date.now() } : s));
            this.openModal('Rejet enregistré', 'Le projet a été rejeté pour non-conformité.');
          }
        });
      },
      error: (err: any) => {
        this.actionLoading.set(false);
        console.error('Erreur rejet', err);
        this.openModal('Erreur', "Erreur lors du rejet. Veuillez réessayer.");
      },
    });
  }
}