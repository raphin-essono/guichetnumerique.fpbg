import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AAPService, AAP, Subvention, Thematique } from '../../services/api/aap.service';

// Interfaces pour les listes dynamiques
interface PalierForm {
  type: 'PETITE' | 'MOYENNE';
  libelleAffiche: string;
  montantMin: number;
  montantMax: number;
  dureeMaxEnMois: number;
  dateLancement?: string;
  dateLimiteNC: string;
  etapes: EtapeForm[];
}

interface EtapeForm {
  libelle: string;
  libelleDates?: string;
  debut?: string;
  fin?: string;
}

interface ThematiqueForm {
  palierId?: string;
  titre: string;
  puces: string[];
}

interface CategorieDepenseForm {
  categorie: string;
  libelle: string;
}

interface DocumentExigeForm {
  libelle: string;
  description?: string;
  obligatoire: boolean;
  modeleUrl?: string;
  organisationIndex?: number; // Index de l'organisation à laquelle ce document appartient
}

interface EligibiliteForm {
  libelle: string;
}

@Component({
  selector: 'app-wizard-aap',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './wizard-aap.html',
})
export class WizardAAPComponent implements OnInit {
  private aapService = inject(AAPService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // État du wizard
  currentStep = signal(1);
  totalSteps = 7;
  isEditMode = signal(false);
  editingAAPId = signal<string | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  // --- Étape 1 : Identité ---
  code = signal('');
  titre = signal('');
  resume = signal('');
  descriptionLongue = signal('');
  imageCouvertureUrl = signal('');
  contexte = signal('');
  objectif = signal('');
  contactEmail = signal('');
  lienDocumentsOfficiels = signal('');
  devise = signal('XAF');
  fuseau = signal('Africa/Libreville');
  statut = signal<'BROUILLON' | 'PREPUBLIE' | 'PUBLIE' | 'CLOTURE' | 'ARCHIVE'>('BROUILLON');

  // --- Étape 2 : Jalons ---
  dateOuverture = signal('');
  dateCloture = signal('');
  publierDansCatalogue = signal(true);
  publierApresCloture = signal(false);

  // --- Étape 3 : Subventions ---
  paliers = signal<PalierForm[]>([]);

  // --- Étape 4 : Thématiques ---
  thematiques = signal<ThematiqueForm[]>([]);

  // --- Étape 5 : Règles budgétaires ---
  pourcentageMaxAdmin = signal(10);
  categoriesDepenses = signal<CategorieDepenseForm[]>([]);

  // --- Étape 6 : Éligibilités & Annexes ---
  eligibilitesZones = signal<EligibiliteForm[]>([]);
  eligibilitesOrganisations = signal<EligibiliteForm[]>([]);
  eligibilitesActivites = signal<EligibiliteForm[]>([]);
  documentsExiges = signal<DocumentExigeForm[]>([]);

  // --- Computed : Validation par étape ---
  step1Valid = computed(() => {
    return this.code().trim() !== '' && this.titre().trim() !== '';
  });

  step2Valid = computed(() => {
    const ouv = this.dateOuverture();
    const clo = this.dateCloture();
    if (!ouv || !clo) return false;
    return new Date(clo) > new Date(ouv);
  });

  step3Valid = computed(() => {
    return this.paliers().length > 0;
  });

  step4Valid = computed(() => {
    return true; // Thématiques optionnelles
  });

  step5Valid = computed(() => {
    const pct = this.pourcentageMaxAdmin();
    return pct >= 0 && pct <= 100;
  });

  step6Valid = computed(() => {
    return true; // Éligibilités optionnelles
  });

  // Computed: Données complètes pour récapitulatif
  aapData = computed<Partial<AAP>>(() => {
    return {
      code: this.code(),
      titre: this.titre(),
      resume: this.resume(),
      descriptionLongue: this.descriptionLongue() || undefined,
      imageCouvertureUrl: this.imageCouvertureUrl() || undefined,
      contexte: this.contexte() || undefined,
      objectif: this.objectif() || undefined,
      contactEmail: this.contactEmail() || undefined,
      lienDocumentsOfficiels: this.lienDocumentsOfficiels() || undefined,
      devise: this.devise(),
      fuseau: this.fuseau(),
      // statut: this.statut(),
      dateOuverture: this.dateOuverture(),
      dateCloture: this.dateCloture(),
      // publierDansCatalogue: this.publierDansCatalogue(),
      // publierApresCloture: this.publierApresCloture(),
      // pourcentageMaxAdmin: this.pourcentageMaxAdmin(),
      // Relations
      // paliers: this.paliers(),
      // thematiques: this.thematiques(),
      // categoriesDepenses: this.categoriesDepenses(),
      // eligibilitesZones: this.eligibilitesZones(),
      // eligibilitesOrganisations: this.eligibilitesOrganisations(),
      // eligibilitesActivites: this.eligibilitesActivites(),
      // documentsExiges: this.documentsExiges(),
    };
  });

  ngOnInit() {
    // Vérifier si on est en mode édition
    this.route.queryParams.subscribe((params) => {
      const id = params['id'];
      if (id) {
        this.isEditMode.set(true);
        this.editingAAPId.set(id);
        this.loadAAP(id);
      }
    });
  }

  /**
   * Charger un AAP existant (mode édition)
   */
  loadAAP(id: string) {
    this.loading.set(true);
    this.aapService.getAAPById(id).subscribe({
      next: (aap) => {
        this.populateFormWithAAP(aap);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erreur lors du chargement de l\'AAP:', err);
        this.error.set('Erreur lors du chargement de l\'AAP');
        this.loading.set(false);
      },
    });
  }

  /**
   * Remplir le formulaire avec les données d'un AAP existant
   */
  populateFormWithAAP(aap: any) {
    // Étape 1
    this.code.set(aap.code);
    this.titre.set(aap.titre);
    this.resume.set(aap.resume || '');
    this.descriptionLongue.set(aap.descriptionLongue || '');
    this.imageCouvertureUrl.set(aap.imageCouvertureUrl || '');
    this.contexte.set(aap.contexte || '');
    this.objectif.set(aap.objectif || '');
    this.contactEmail.set(aap.contactEmail || '');
    this.lienDocumentsOfficiels.set(aap.lienDocumentsOfficiels || '');
    this.devise.set(aap.devise || 'XAF');
    this.fuseau.set(aap.fuseau || 'Africa/Libreville');
    if (aap.statut) {
      this.statut.set(aap.statut);
    }

    // Étape 2
    // Le backend peut renvoyer dateDebut/dateFin ou launchDate
    const dateDebut = aap.dateDebut || aap.launchDate;
    const dateFin = aap.dateFin;

    if (dateDebut) {
      this.dateOuverture.set(this.formatDateForInput(dateDebut));
    }
    if (dateFin) {
      this.dateCloture.set(this.formatDateForInput(dateFin));
    }
    if (aap.publierDansCatalogue !== undefined) {
      this.publierDansCatalogue.set(aap.publierDansCatalogue);
    }
    if (aap.publierApresCloture !== undefined) {
      this.publierApresCloture.set(aap.publierApresCloture);
    }

    // Étape 3: Subventions
    if (aap.subventions && aap.subventions.length > 0) {
      const paliersForm: PalierForm[] = aap.subventions.map((subv: any) => ({
        type: subv.name === 'Petite subvention' ? 'PETITE' : 'MOYENNE',
        libelleAffiche: subv.name,
        montantMin: subv.amountMin,
        montantMax: subv.amountMax,
        dureeMaxEnMois: subv.durationMaxMonths,
        dateLimiteNC: this.formatDateForInput(subv.deadlineNoteConceptuelle),
        etapes: (subv.cycleSteps || []).map((step: any) => ({
          libelle: step.step,
          libelleDates: step.dates,
        })),
      }));
      this.paliers.set(paliersForm);
    }

    // Étape 4: Thématiques (backend renvoie thematiquesList)
    const thematiques = aap.thematiquesList || aap.thematiques || [];
    if (thematiques.length > 0) {
      const themForm: ThematiqueForm[] = thematiques.map((them: any) => ({
        titre: them.title || them.titre,
        puces: them.bullets || them.puces || [],
      }));
      this.thematiques.set(themForm);
    }

    // Étape 5: Règles budgétaires
    if (aap.pourcentageMaxAdmin !== undefined) {
      this.pourcentageMaxAdmin.set(aap.pourcentageMaxAdmin);
    }
    // Note: categoriesDepenses n'existe pas dans le schéma Prisma actuel
    // Si vous l'ajoutez plus tard, décommentez ceci:
    // if (aap.categoriesDepenses && aap.categoriesDepenses.length > 0) {
    //   this.categoriesDepenses.set(aap.categoriesDepenses);
    // }

    // Étape 6: Éligibilités & Annexes
    if (aap.eligibilitesZones && aap.eligibilitesZones.length > 0) {
      this.eligibilitesZones.set(aap.eligibilitesZones.map((e: any) => ({
        libelle: e.libelle
      })));
    }
    if (aap.eligibilitesOrganisations && aap.eligibilitesOrganisations.length > 0) {
      this.eligibilitesOrganisations.set(aap.eligibilitesOrganisations.map((e: any) => ({
        libelle: e.libelle
      })));
    }
    if (aap.eligibilitesActivites && aap.eligibilitesActivites.length > 0) {
      this.eligibilitesActivites.set(aap.eligibilitesActivites.map((e: any) => ({
        libelle: e.libelle
      })));
    }
    if (aap.documentsExiges && aap.documentsExiges.length > 0) {
      this.documentsExiges.set(aap.documentsExiges.map((d: any) => ({
        libelle: d.libelle,
        description: d.description || '',
        obligatoire: d.obligatoire !== false,
        modeleUrl: d.modeleUrl || '',
        organisationIndex: d.organisationIndex
      })));
    }
  }

  /**
   * Formater une date pour un input de type date
   */
  formatDateForInput(dateString: string): string {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Navigation: Étape suivante
   */
  nextStep() {
    if (this.canGoNext()) {
      this.currentStep.update((s) => Math.min(s + 1, this.totalSteps));
    }
  }

  /**
   * Navigation: Étape précédente
   */
  prevStep() {
    this.currentStep.update((s) => Math.max(s - 1, 1));
  }

  /**
   * Aller à une étape spécifique
   */
  goToStep(step: number) {
    if (step >= 1 && step <= this.totalSteps) {
      this.currentStep.set(step);
    }
  }

  /**
   * Vérifier si on peut aller à l'étape suivante
   */
  canGoNext(): boolean {
    const step = this.currentStep();
    switch (step) {
      case 1: return this.step1Valid();
      case 2: return this.step2Valid();
      case 3: return this.step3Valid();
      case 4: return this.step4Valid();
      case 5: return this.step5Valid();
      case 6: return this.step6Valid();
      default: return true;
    }
  }

  /**
   * Vérifier si un type de palier existe déjà
   */
  hasPalierType(type: 'PETITE' | 'MOYENNE'): boolean {
    return this.paliers().some(p => p.type === type);
  }

  /**
   * Ajouter un palier
   */
  addPalier(type: 'PETITE' | 'MOYENNE') {
    const newPalier: PalierForm = {
      type,
      libelleAffiche: type === 'PETITE' ? 'Petite subvention' : 'Subvention moyenne',
      montantMin: 0,
      montantMax: 0,
      dureeMaxEnMois: 12,
      dateLimiteNC: '',
      etapes: [],
    };
    this.paliers.update((p) => [...p, newPalier]);
  }

  /**
   * Supprimer un palier
   */
  removePalier(index: number) {
    this.paliers.update((p) => p.filter((_, i) => i !== index));
  }

  /**
   * Ajouter une étape à un palier
   */
  addEtapeToPalier(palierIndex: number) {
    const newEtape: EtapeForm = {
      libelle: '',
      libelleDates: '',
    };
    this.paliers.update((paliers) => {
      const updated = [...paliers];
      updated[palierIndex].etapes.push(newEtape);
      return updated;
    });
  }

  /**
   * Supprimer une étape d'un palier
   */
  removeEtapeFromPalier(palierIndex: number, etapeIndex: number) {
    this.paliers.update((paliers) => {
      const updated = [...paliers];
      updated[palierIndex].etapes = updated[palierIndex].etapes.filter((_, i) => i !== etapeIndex);
      return updated;
    });
  }

  /**
   * Ajouter une thématique
   */
  /**
   * Ajouter une thématique pour un palier spécifique
   */
  addThematiqueForPalier(palierIndex: number) {
    const newThem: ThematiqueForm = {
      palierId: palierIndex.toString(),
      titre: '',
      puces: [],
    };
    this.thematiques.update((t) => [...t, newThem]);
  }

  /**
   * Supprimer une thématique pour un palier spécifique
   */
  removeThematiqueForPalier(palierIndex: number, thematiqueIndex: number) {
    const globalIndex = this.getThematiqueGlobalIndex(palierIndex, thematiqueIndex);
    this.thematiques.update((t) => t.filter((_, i) => i !== globalIndex));
  }

  /**
   * Récupérer les thématiques d'un palier spécifique
   */
  getThematiquesForPalier(palierIndex: number): ThematiqueForm[] {
    return this.thematiques().filter((t) => t.palierId === palierIndex.toString());
  }

  /**
   * Obtenir l'index global d'une thématique à partir de son index local dans un palier
   */
  getThematiqueGlobalIndex(palierIndex: number, localIndex: number): number {
    const palierId = palierIndex.toString();
    let currentLocalIndex = 0;

    for (let i = 0; i < this.thematiques().length; i++) {
      if (this.thematiques()[i].palierId === palierId) {
        if (currentLocalIndex === localIndex) {
          return i;
        }
        currentLocalIndex++;
      }
    }

    return -1;
  }

  /**
   * DEPRECATED - Garder pour compatibilité
   */
  addThematique() {
    // Par défaut, ajouter au premier palier si disponible
    if (this.paliers().length > 0) {
      this.addThematiqueForPalier(0);
    }
  }

  /**
   * DEPRECATED - Garder pour compatibilité
   */
  removeThematique(index: number) {
    this.thematiques.update((t) => t.filter((_, i) => i !== index));
  }

  /**
   * Ajouter une puce à une thématique
   */
  addPuceToThematique(thematiqueIndex: number) {
    this.thematiques.update((thems) => {
      const updated = [...thems];
      updated[thematiqueIndex].puces.push('');
      return updated;
    });
  }

  /**
   * Supprimer une puce d'une thématique
   */
  removePuceFromThematique(thematiqueIndex: number, puceIndex: number) {
    this.thematiques.update((thems) => {
      const updated = [...thems];
      updated[thematiqueIndex].puces = updated[thematiqueIndex].puces.filter((_, i) => i !== puceIndex);
      return updated;
    });
  }

  /**
   * Ajouter une catégorie de dépense
   */
  addCategorieDepense() {
    const newCat: CategorieDepenseForm = {
      categorie: '',
      libelle: '',
    };
    this.categoriesDepenses.update((c) => [...c, newCat]);
  }

  /**
   * Supprimer une catégorie de dépense
   */
  removeCategorieDepense(index: number) {
    this.categoriesDepenses.update((c) => c.filter((_, i) => i !== index));
  }

  /**
   * Ajouter une éligibilité zone
   */
  addEligibiliteZone() {
    this.eligibilitesZones.update((e) => [...e, { libelle: '' }]);
  }

  removeEligibiliteZone(index: number) {
    this.eligibilitesZones.update((e) => e.filter((_, i) => i !== index));
  }

  /**
   * Ajouter une éligibilité organisation
   */
  addEligibiliteOrganisation() {
    this.eligibilitesOrganisations.update((e) => [...e, { libelle: '' }]);
  }

  removeEligibiliteOrganisation(index: number) {
    this.eligibilitesOrganisations.update((e) => e.filter((_, i) => i !== index));
  }

  /**
   * Ajouter une éligibilité activité
   */
  addEligibiliteActivite() {
    this.eligibilitesActivites.update((e) => [...e, { libelle: '' }]);
  }

  removeEligibiliteActivite(index: number) {
    this.eligibilitesActivites.update((e) => e.filter((_, i) => i !== index));
  }

  /**
   * Ajouter un document exigé
   */
  addDocumentExige() {
    const newDoc: DocumentExigeForm = {
      libelle: '',
      description: '',
      obligatoire: true,
      modeleUrl: '',
    };
    this.documentsExiges.update((d) => [...d, newDoc]);
  }

  /**
   * Supprimer un document exigé
   */
  removeDocumentExige(index: number) {
    this.documentsExiges.update((d) => d.filter((_, i) => i !== index));
  }

  /**
   * Ajouter un document pour une organisation spécifique
   */
  addDocumentForOrganisation(orgIndex: number) {
    const newDoc: DocumentExigeForm = {
      libelle: '',
      description: '',
      obligatoire: true,
      modeleUrl: '',
      organisationIndex: orgIndex,
    };
    this.documentsExiges.update((d) => [...d, newDoc]);
  }

  /**
   * Récupérer les documents pour une organisation spécifique
   */
  getDocumentsForOrganisation(orgIndex: number): DocumentExigeForm[] {
    return this.documentsExiges().filter((doc) => doc.organisationIndex === orgIndex);
  }

  /**
   * Supprimer un document d'une organisation spécifique
   */
  removeDocumentForOrganisation(orgIndex: number, docIndex: number) {
    const docsForOrg = this.getDocumentsForOrganisation(orgIndex);
    if (docIndex < 0 || docIndex >= docsForOrg.length) return;

    const docToRemove = docsForOrg[docIndex];
    this.documentsExiges.update((docs) => docs.filter((d) => d !== docToRemove));
  }

  /**
   * Enregistrer le formulaire comme brouillon (sans validation complète)
   */
  saveDraft() {
    // Construire le payload minimum pour un brouillon
    const aapPayload: any = {
      code: this.code() || `DRAFT-${Date.now()}`, // Générer un code temporaire si vide
      titre: this.titre() || 'Brouillon sans titre',
      resume: this.resume() || undefined,
      descriptionLongue: this.descriptionLongue() || undefined,
      imageCouvertureUrl: this.imageCouvertureUrl() || undefined,
      contexte: this.contexte() || undefined,
      objectif: this.objectif() || undefined,
      contactEmail: this.contactEmail() || undefined,
      lienDocumentsOfficiels: this.lienDocumentsOfficiels() || undefined,
      devise: this.devise(),
      fuseau: this.fuseau(),
      statut: 'BROUILLON', // Important: marquer comme brouillon
      launchDate: this.dateOuverture() || new Date().toISOString(),
      dateFin: this.dateCloture() || new Date().toISOString(),
      publierDansCatalogue: this.publierDansCatalogue(),
      publierApresCloture: this.publierApresCloture(),
      pourcentageMaxAdmin: this.pourcentageMaxAdmin(),
      subventions: this.paliers().map((p) => ({
        name: p.libelleAffiche,
        amountMin: p.montantMin || 0,
        amountMax: p.montantMax || 0,
        durationMaxMonths: p.dureeMaxEnMois || 12,
        deadlineNoteConceptuelle: p.dateLimiteNC || new Date().toISOString(),
        cycle: p.etapes.map((e, idx) => ({
          step: e.libelle,
          dates: e.libelleDates,
          ordre: idx + 1,
        })),
      })),
      thematiques: this.thematiques().map((t) => ({
        title: t.titre,
        bullets: t.puces,
        typeSubvention: '',
      })),
      eligibilitesZones: this.eligibilitesZones().filter(e => e.libelle.trim()),
      eligibilitesOrganisations: this.eligibilitesOrganisations().filter(e => e.libelle.trim()),
      eligibilitesActivites: this.eligibilitesActivites().filter(e => e.libelle.trim()),
      documentsExiges: this.documentsExiges().filter(d => d.libelle.trim()),
    };

    this.loading.set(true);
    this.error.set(null);

    const request = this.isEditMode()
      ? this.aapService.updateAAP(this.editingAAPId()!, aapPayload)
      : this.aapService.createAAP(aapPayload);

    request.subscribe({
      next: () => {
        this.loading.set(false);
        alert('Brouillon enregistré avec succès !');
        this.router.navigate(['/admin/appels-projets']);
      },
      error: (err) => {
        console.error('Erreur lors de l\'enregistrement du brouillon:', err);
        this.error.set('Erreur lors de l\'enregistrement du brouillon');
        this.loading.set(false);
      },
    });
  }

  /**
   * Soumettre le formulaire (Étape 7)
   */
  submitForm() {
    // Construire l'objet AAP complet
    const aapPayload: any = {
      code: this.code(),
      titre: this.titre(),
      resume: this.resume(),
      descriptionLongue: this.descriptionLongue() || undefined,
      imageCouvertureUrl: this.imageCouvertureUrl() || undefined,
      contexte: this.contexte() || undefined,
      objectif: this.objectif() || undefined,
      contactEmail: this.contactEmail() || undefined,
      lienDocumentsOfficiels: this.lienDocumentsOfficiels() || undefined,
      devise: this.devise(),
      fuseau: this.fuseau(),
      statut: 'PUBLIE', // Statut publié lors de la soumission finale
      launchDate: this.dateOuverture(),
      dateFin: this.dateCloture(),
      publierDansCatalogue: this.publierDansCatalogue(),
      publierApresCloture: this.publierApresCloture(),
      pourcentageMaxAdmin: this.pourcentageMaxAdmin(),
      // Note: Adapter selon votre schéma backend réel
      subventions: this.paliers().map((p) => ({
        name: p.libelleAffiche,
        amountMin: p.montantMin,
        amountMax: p.montantMax,
        durationMaxMonths: p.dureeMaxEnMois,
        deadlineNoteConceptuelle: p.dateLimiteNC,
        cycle: p.etapes.map((e, idx) => ({
          step: e.libelle,
          dates: e.libelleDates,
          ordre: idx + 1,
        })),
      })),
      thematiques: this.thematiques().map((t) => ({
        title: t.titre,
        bullets: t.puces,
        typeSubvention: '', // À adapter
      })),
      eligibilitesZones: this.eligibilitesZones().filter(e => e.libelle.trim()),
      eligibilitesOrganisations: this.eligibilitesOrganisations().filter(e => e.libelle.trim()),
      eligibilitesActivites: this.eligibilitesActivites().filter(e => e.libelle.trim()),
      documentsExiges: this.documentsExiges().filter(d => d.libelle.trim()),
    };

    this.loading.set(true);
    this.error.set(null);

    const request = this.isEditMode()
      ? this.aapService.updateAAP(this.editingAAPId()!, aapPayload)
      : this.aapService.createAAP(aapPayload);

    request.subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/admin/appels-projets']);
      },
      error: (err) => {
        console.error('Erreur lors de la soumission:', err);
        this.error.set('Erreur lors de l\'enregistrement de l\'AAP');
        this.loading.set(false);
      },
    });
  }

  /**
   * Annuler et retourner à la liste
   */
  cancel() {
    this.router.navigate(['/admin/appels-projets']);
  }

  /**
   * Copier le JSON dans le presse-papier
   */
  copyJSON() {
    const json = JSON.stringify(this.aapData(), null, 2);
    navigator.clipboard.writeText(json).then(() => {
      alert('JSON copié dans le presse-papier');
    });
  }

  /**
   * Télécharger le JSON
   */
  downloadJSON() {
    const json = JSON.stringify(this.aapData(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aap-${this.code()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
