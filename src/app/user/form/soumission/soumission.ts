// soumission.ts
// ============================================================================
// FPBG – Wizard de soumission (Standalone Angular Component)
// Organisation & commentaires pour faciliter l’intégration backend ultérieure.
// Etapes UI affichées à partir de 1 dans le template (i+1), logique interne 0-based.
// ============================================================================
//
// ✅ Ce qui a été nettoyé/synchronisé (sans retirer de logique fonctionnelle) :
// - Harmonisation des champs pour coller au HTML actuel :
//   • Activité : champ de description = `summary` (au lieu de `description`).
//   • Sous-activités : `label` + `summary` (au lieu de `title` + `description`).
// - Autosave : 1 seule souscription `form.valueChanges.pipe(debounceTime(400))`
//   qui met à jour LS_DRAFT_KEY + DRAFT_META_KEY + event `fpbg:draft-updated`.
// - Ajout de la logique de modal “Engagement sur l’honneur” (hasFunding === false).
//
// ❌ Suppressions (non utilisées / doublons) :
// - `lineAmountsMatch`, `arrSum` (jamais utilisées).
// - `wordLimit: any` (déclaration redondante).
// - `protected readonly FormGroup = FormGroup` (inutile).
//
// NB : Les clés LS sont conservées :
//   - Brouillon :  LS_DRAFT_KEY = 'fpbg_submission_v3'
//   - Etape      :  LS_STEP_KEY  = 'fpbg_submission_step_v3'
//   - Méta       :  DRAFT_META_KEY = 'fpbg.nc.draft'
//
// ============================================================================

import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, computed, inject, signal } from '@angular/core';

import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { debounceTime } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { PdfService } from '../../../services/pdf.service';

/* ==============================
   Constantes & petites utilités
   ============================== */
const LS_DRAFT_KEY = 'fpbg_submission_v3';
const LS_STEP_KEY = 'fpbg_submission_step_v3';
const DRAFT_META_KEY = 'fpbg.nc.draft'; // méta simple pour dashboard/aperçus

// ⚠️ MODIFICATION: Accepter uniquement les PDF pour les pièces jointes
const ALLOWED_MIME = ['application/pdf'];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 Mo

/* ---- Validators ---- */
// Limite de mots
function wordLimit(max: number) {
  return (c: AbstractControl): ValidationErrors | null => {
    const t = ('' + (c.value ?? '')).trim();
    const n = t ? t.split(/\s+/).length : 0;
    return n > max ? { wordLimit: { max, actual: n } } : null;
  };
}
// Contrôle "array non vide"
function nonEmpty(min = 1) {
  return (c: AbstractControl) => ((c as FormArray).length < min ? { arrayMin: { min } } : null);
}
// Contrôle "array non vide" pour FormControl<string[]>
function minArrayLen(min = 1) {
  return (c: AbstractControl): ValidationErrors | null => {
    const v = c.value as string[] | null | undefined;
    return Array.isArray(v) && v.length >= min ? null : { arrayMin: { min } };
  };
}

// Validateur de domaines autorisés (sera configuré dynamiquement selon le type de subvention)
function domainsValidator(allowedDomains: () => string[]) {
  return (c: AbstractControl): ValidationErrors | null => {
    const val = (c.value ?? []) as string[];
    if (!Array.isArray(val) || val.length === 0) return { domainsRequired: true };
    const allowed = new Set(allowedDomains());
    const allOk = val.every((d) => allowed.has(d));
    return allOk ? null : { domainNotAllowed: true };
  };
}

// Validateur pour les dates de projet (durée max selon type de subvention)
function projectDatesValidator(getMaxMonths: () => number) {
  return (group: AbstractControl): ValidationErrors | null => {
    const g = group as FormGroup;
    const s = g.get('startDate')?.value;
    const e = g.get('endDate')?.value;
    if (!s || !e) return null;

    const start = new Date(s);
    const end = new Date(e);
    if (end < start) return { dateRange: true };

    // Calcul de la durée en mois
    const monthsDiff =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    const maxMonths = getMaxMonths();

    return monthsDiff > maxMonths ? { maxMonths: { actual: monthsDiff, max: maxMonths } } : null;
  };
}

// Validateur pour les dates d'activité (doivent être dans la fenêtre du projet)
function activityDatesValidator(getProjectDates: () => { start: Date | null; end: Date | null }) {
  return (group: AbstractControl): ValidationErrors | null => {
    const g = group as FormGroup;
    const s = g.get('start')?.value;
    const e = g.get('end')?.value;
    if (!s || !e) return null;

    const start = new Date(s);
    const end = new Date(e);
    if (end < start) return { dateRange: true };

    const { start: projStart, end: projEnd } = getProjectDates();
    if (projStart && start < projStart) return { outOfProjectWindow: 'before' };
    if (projEnd && end > projEnd) return { outOfProjectWindow: 'after' };

    return null;
  };
}

// Validateur pour une ligne de budget : label, cfa>0, fpbg+cofin = 100
function budgetLineValidator(group: AbstractControl): ValidationErrors | null {
  const g = group as FormGroup;
  const label = (g.get('label')?.value || '').toString().trim();
  const cfa = Number(g.get('cfa')?.value || 0);
  const a = Number(g.get('fpbgPct')?.value || 0);
  const b = Number(g.get('cofinPct')?.value || 0);

  const errs: any = {};
  if (!label) errs.labelRequired = true;
  if (!(cfa > 0)) errs.cfaMin = true;
  if (a + b !== 100) errs.pctSum = true;

  return Object.keys(errs).length ? errs : null;
}

// Contraintes fichiers
function fileConstraints() {
  return (c: AbstractControl): ValidationErrors | null => {
    const f: File | null = c.value;
    if (!f) return null;
    if (f.size > MAX_FILE_BYTES) return { fileTooLarge: true };
    if (!ALLOWED_MIME.includes(f.type)) return { fileType: true };
    return null;
  };
}

@Component({
  selector: 'app-soumission',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './soumission.html',
})
export class SubmissionWizard {
  /* ==============================
     Injections & services
     ============================== */
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private pdfService = inject(PdfService);

  // Type d'organisation de l'utilisateur connecté
  usertype: string = '';
  userAccount: any = null;

  // 🎯 Configuration des types de subvention
  subventionConfig: Record<
    string,
    {
      libelle: string;
      montantMin: number;
      montantMax: number;
      dureeMax: number;
      domaines: string[];
    }
  > = {
    PETITE: {
      libelle: 'Petite subvention',
      montantMin: 5_000_000,
      montantMax: 50_000_000,
      dureeMax: 12,
      domaines: [
        'Pêche communautaire durable',
        'Réduction de la pollution plastique (milieux marins & littoraux)',
        'Sensibilisation environnementale (conservation marins & littoraux)',
        'Renforcement des capacités / accompagnement des acteurs locaux',
        'Caractérisation des écosystèmes littoraux et marins (recherche, matériel scientifique)',
      ],
    },
    MOYENNE: {
      libelle: 'Moyenne subvention',
      montantMin: 51_000_000,
      montantMax: 200_000_000,
      dureeMax: 24,
      domaines: [
        'Implication des communautés locales dans la gestion durable du milieu marin',
        'Valorisation des savoirs locaux & amélioration de la chaîne de valeur halieutique',
        'Cartographie & restauration des habitats littoraux pollués/dégradés (mangroves, etc.)',
        'Amélioration des connaissances du milieu marin (habitats, stocks, dynamiques…)',
        'Recherche & vulgarisation des interactions Homme/Faune aquatique',
        "Projets en faveur de l'économie bleue (filières durables, tourisme, déchets, etc)",
      ],
    },
  };

  // Signals pour les informations de type de subvention
  typeSubvention = signal<string>('Petite subvention');
  typeSubventionCode = signal<'PETITE' | 'MOYENNE'>('PETITE');
  montantRange = signal<string>('5.000.000 – 50.000.000 FCFA');
  dureeMax = signal<number>(12); // en mois

  // État des documents (pour l'interface de sélection/upload)
  documentsState: Map<
    string,
    {
      selected: boolean;
      file: File | null;
      uploaded: boolean;
      base64?: string; // Contenu Base64 du PDF
      fileName?: string; // Nom du fichier
      fileSize?: number; // Taille du fichier
    }
  > = new Map();

  // État de la modale de succès
  showSuccessModal = false;
  submissionSummary: {
    projectTitle: string;
    documentsCount: number;
    totalBudget: number;
  } | null = null;

  // État de soumission (loading)
  isSubmitting = signal(false);

  /* ==============================
     Navigation locale (UI)
     ============================== */
  steps = [
    'Proposition de projet', // Etape 1 (index 0)
    'Objectifs & résultats', // Etape 2 (index 1)
    'Activités & calendrier', // Etape 3 (index 2)
    'Risques', // Etape 4 (index 3)
    'Estimation du budget', // Etape 5 (index 4)
    'État & financement', // Etape 6 (index 5)
    'Durabilité & réplication', // Etape 7 (index 6)
    'Annexes', // Etape 8 (index 7)
    'Récapitulatif', // Etape 9 (index 8)
  ] as const;

  current = signal<number>(
    Math.max(0, Math.min(this.steps.length - 1, Number(localStorage.getItem(LS_STEP_KEY) || 0)))
  );

  // 2) Dans goTo(i), juste après avoir changé 'current':
  goTo = (i: number) => {
    if (i < 0 || i >= this.steps.length) return;
    const curr = this.current();
    if (!(i === curr || i === curr - 1 || i === curr + 1)) return;
    this.current.set(i);
    localStorage.setItem(LS_STEP_KEY, String(i));

    // ⬇️ tant qu'on est avant l'étape 5, tout budget reste OFF
    if (i < 4) this.ensureAllBudgetsDisabledBeforeStep5();
  };
  next = () => this.goTo(this.current() + 1);
  prev = () => this.goTo(this.current() - 1);

  // Calcul de la progression basé sur l'étape actuelle (simple et visuel)
  progress = computed(() => {
    const currentStep = this.current() + 1; // Étape actuelle (1-9)
    const totalSteps = this.steps.length; // Total d'étapes (9)
    return Math.round((currentStep / totalSteps) * 100);
  });

  debugStep3(): any {
    const out: any = { header: {}, activities: [] };
    out.header.valid = this.activitiesHeader.valid;
    out.header.errors = this.activitiesHeader.errors;
    const groups = this.activities.controls as FormGroup[];
    groups.forEach((g, idx) => {
      out.activities[idx] = {
        title: g.get('title')?.errors || null,
        start: g.get('start')?.errors || null,
        end: g.get('end')?.errors || null,
        summary: g.get('summary')?.errors || null,
        budgetDisabled: (g.get('budget') as FormGroup)?.disabled ?? true,
      };
    });
    return out;
  }

  /**
   * Méthode de débogage pour voir pourquoi canGoNext() retourne false à l'étape 3
   * Utilisation: Ouvrir la console et taper: this.debugCanGoNextStep3()
   */
  debugCanGoNextStep3(): string {
    const startDate = this.activitiesHeader.get('startDate');
    const endDate = this.activitiesHeader.get('endDate');
    const summary = this.activitiesHeader.get('summary');

    const start = startDate?.value;
    const end = endDate?.value;
    const summaryVal = summary?.value;

    if (!start) return '❌ Date de début manquante';
    if (!end) return '❌ Date de fin manquante';
    if (!summaryVal || summaryVal.trim() === '') return '❌ Résumé manquant';

    const startD = new Date(start);
    const endD = new Date(end);
    if (isNaN(startD.getTime())) return '❌ Date de début invalide';
    if (isNaN(endD.getTime())) return '❌ Date de fin invalide';
    if (endD < startD) return '❌ Date de fin < date de début';

    const monthsDiff =
      (endD.getFullYear() - startD.getFullYear()) * 12 + (endD.getMonth() - startD.getMonth()) + 1;
    const maxMonths = this.getMaxDuration();
    if (monthsDiff > maxMonths)
      return `❌ Durée trop longue: ${monthsDiff} mois > ${maxMonths} mois max`;

    const wordCount = summaryVal
      .trim()
      .split(/\s+/)
      .filter((w: string) => w.length > 0).length;
    if (wordCount > 200) return `❌ Résumé trop long: ${wordCount} mots > 200 mots max`;

    const groups = this.activities.controls as FormGroup[];
    if (groups.length < 1) return '❌ Aucune activité';

    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const title = g.get('title')?.value;
      const actStart = g.get('start')?.value;
      const actEnd = g.get('end')?.value;
      const actSummary = g.get('summary')?.value;

      if (!title || title.trim() === '') return `❌ Activité ${i + 1}: titre manquant`;
      if (!actStart) return `❌ Activité ${i + 1}: date début manquante`;
      if (!actEnd) return `❌ Activité ${i + 1}: date fin manquante`;
      if (!actSummary || actSummary.trim() === '') return `❌ Activité ${i + 1}: résumé manquant`;

      if (title.length > 50) return `❌ Activité ${i + 1}: titre trop long (${title.length} > 50)`;

      const actWordCount = actSummary
        .trim()
        .split(/\s+/)
        .filter((w: string) => w.length > 0).length;
      if (actWordCount > 50)
        return `❌ Activité ${i + 1}: résumé trop long (${actWordCount} > 50 mots)`;

      const actStartD = new Date(actStart);
      const actEndD = new Date(actEnd);
      if (isNaN(actStartD.getTime())) return `❌ Activité ${i + 1}: date début invalide`;
      if (isNaN(actEndD.getTime())) return `❌ Activité ${i + 1}: date fin invalide`;
      if (actEndD < actStartD) return `❌ Activité ${i + 1}: date fin < date début`;
      if (actStartD < startD)
        return `❌ Activité ${i + 1}: commence avant le projet (${actStart} < ${start})`;
      if (actEndD > endD) return `❌ Activité ${i + 1}: finit après le projet (${actEnd} > ${end})`;
    }

    return '✅ Tout est valide - canGoNext() devrait retourner true';
  }

  //calcul de la taille mot
  // Dans soumission.ts (dans la classe)
  countWords(v: any): number {
    const t = ('' + (v ?? '')).trim();
    return t ? t.split(/\s+/).length : 0;
  }

  //calcul de la barre de progression
  private isFilled(ctrl: AbstractControl | null): boolean {
    if (!ctrl) return false;
    if (ctrl.invalid) return false; // on ne compte que ce qui est valide
    const v = ctrl.value;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'string') return v.trim().length > 0;
    return v !== null && v !== undefined;
  }

  private computeProgressParts(): { done: number; total: number } {
    let done = 0,
      total = 0;

    // Étape 1
    const s1 = this.stepProp.controls;
    const s1Ctrls = [s1.title, s1.location, s1.targetGroup, s1.contextJustification, s1.domains];
    s1Ctrls.forEach((c) => {
      total++;
      if (this.isFilled(c)) done++;
    });

    // Étape 2
    const s2 = this.obj.controls;
    [s2.objectives, s2.expectedResults, s2.durationMonths].forEach((c) => {
      total++;
      if (this.isFilled(c)) done++;
    });

    // Étape 3 – header
    const h = this.activitiesHeader.controls;
    [h.startDate, h.endDate, h.summary].forEach((c) => {
      total++;
      if (this.isFilled(c)) done++;
    });

    // Étape 3 – activités (dynamiques)
    (this.activities.controls as FormGroup[]).forEach((a) => {
      ['title', 'start', 'end', 'summary'].forEach((k) => {
        total++;
        if (this.isFilled(a.get(k))) done++;
      });
    });

    // Étape 4 – risques (dynamiques)
    (this.risks.controls as FormGroup[]).forEach((r) => {
      ['description', 'mitigation'].forEach((k) => {
        total++;
        if (this.isFilled(r.get(k))) done++;
      });
    });

    // Étape 5 – budget (chaque ligne)
    (this.activities.controls as FormGroup[]).forEach((a) => {
      const lines = (a.get(['budget', 'lines']) as FormArray<FormGroup>)?.controls || [];
      lines.forEach((line) => {
        // on compte 3 "unités" : label, cfa, somme des pourcentages
        total += 3;
        if (this.isFilled(line.get('label'))) done++;
        if (this.isFilled(line.get('cfa'))) done++;
        if (!line.errors?.['pctSum']) done++; // somme = 100
      });
    });

    // Étape 6 – état & financement
    const st = this.projectState;
    total += 2; // stage + hasFunding
    if (this.isFilled(st.get('stage'))) done++;
    if (this.isFilled(st.get('hasFunding'))) done++;
    if (st.get('hasFunding')!.value === true) {
      total += 1;
      if (this.isFilled(st.get('fundingDetails'))) done++;
    } else {
      total += 1; // honorAccepted (si Non)
      if (st.get('honorAccepted')!.value === true) done++;
    }

    // Étape 7 – durabilité
    total += 1;
    if (this.isFilled(this.sustainability.get('text'))) done++;

    // (Étape 8 annexes — ignorée pour le moment)

    return { done, total };
  }

  // Bouton retour vers dashboard
  backToDashboard(): void {
    this.router.navigateByUrl('/dashboard');
  }
  // Raccourci clavier (optionnel) Alt+←
  onKeydown(e: KeyboardEvent) {
    if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      this.backToDashboard();
    }
  }

  /* ==============================
     Données auxiliaires (UI)
     ============================== */
  // Domaines autorisés selon le type de subvention
  get domaines(): string[] {
    const code = this.typeSubventionCode();
    return this.subventionConfig[code]?.domaines || [];
  }

  /* ==============================
     Formulaires par étape
     ============================== */

  // ---- Étape 1 : Proposition de projet ----
  stepProp = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    domains: this.fb.control<string[]>([], {
      validators: [domainsValidator(() => this.domaines)],
    }), // domaines autorisés selon le type de subvention
    location: ['', [Validators.required, wordLimit(200)]],
    targetGroup: ['', [Validators.required, wordLimit(200)]],
    contextJustification: ['', [Validators.required, wordLimit(500)]],
  });
  get sp() {
    return this.stepProp.controls;
  }

  // Helpers (récap) qui restent compatibles
  get propLocation(): string {
    const v = this.stepProp.getRawValue();
    return (v.location || (v as any).locationAndTarget || '').trim();
  }
  get propTarget(): string {
    return (this.stepProp.get('targetGroup')?.value || '').trim();
  }

  // ---- Étape 2 : Objectifs & résultats ----
  obj = this.fb.group({
    objectives: ['', [Validators.required, wordLimit(200)]],
    expectedResults: ['', [Validators.required, wordLimit(100)]],
    durationMonths: [
      12,
      [
        Validators.required,
        Validators.min(1),
        // Validateur dynamique qui vérifie selon le type de subvention
        (control: AbstractControl): ValidationErrors | null => {
          const value = Number(control.value);
          const maxDuration = this.getMaxDuration();
          return value > maxDuration ? { max: { max: maxDuration, actual: value } } : null;
        },
      ],
    ],
  });

  // Retourne la durée maximale selon le type de subvention
  getMaxDuration(): number {
    const code = this.typeSubventionCode();
    return this.subventionConfig[code]?.dureeMax || 12;
  }

  // Force la durée entre 1 et la durée max selon le type de subvention
  clampDuration(): void {
    const ctrl = this.obj.get('durationMonths') as FormControl<number | null>;
    const v = Number(ctrl?.value ?? 0);
    const maxDuration = this.getMaxDuration();
    const clamped = Math.max(1, Math.min(maxDuration, isNaN(v) ? 12 : v));
    if (clamped !== v) ctrl.setValue(clamped);
  }

  // Met à jour les validateurs de durée quand le type de subvention change
  updateDurationValidators(): void {
    const ctrl = this.obj.get('durationMonths');
    if (ctrl) {
      // Force la revalidation avec le nouveau maximum
      ctrl.updateValueAndValidity({ emitEvent: false });

      // Clampe la valeur si elle dépasse le nouveau max
      const currentValue = Number(ctrl.value || 0);
      const maxDuration = this.getMaxDuration();
      if (currentValue > maxDuration) {
        ctrl.setValue(maxDuration, { emitEvent: false });
      }
    }
  }

  /**
   * Change le type de subvention et met à jour toutes les validations
   */
  setTypeSubvention(type: 'PETITE' | 'MOYENNE'): void {
    this.typeSubventionCode.set(type);

    // Mise à jour du libellé et des infos affichées
    const config = this.subventionConfig[type];
    this.typeSubvention.set(config.libelle);
    this.montantRange.set(
      `${config.montantMin.toLocaleString('fr-FR')} – ${config.montantMax.toLocaleString(
        'fr-FR'
      )} FCFA`
    );
    this.dureeMax.set(config.dureeMax);

    // Revalider les domaines
    this.stepProp.get('domains')?.updateValueAndValidity({ emitEvent: false });

    // Revalider les dates du projet
    this.activitiesHeader.updateValueAndValidity({ emitEvent: false });

    // Revalider toutes les activités
    this.activities.controls.forEach((activity) => {
      activity.updateValueAndValidity({ emitEvent: false });
    });

    // Mettre à jour la validation de durée
    this.updateDurationValidators();

    // Recalculer les contraintes budgétaires
    this.recomputeIndirectCapGlobal();
  }

  // ---- Étape 3 : Activités & calendrier ----
  activitiesHeader = this.fb.group(
    {
      startDate: this.fb.control<string>(this.today(), {
        nonNullable: true,
        validators: [Validators.required],
      }),
      endDate: this.fb.control<string>(this.defaultEndDate(), {
        nonNullable: true,
        validators: [Validators.required],
      }),
      summary: this.fb.control<string>('', {
        nonNullable: true,
        validators: [Validators.required, wordLimit(200)],
      }),
    },
    {
      validators: [projectDatesValidator(() => this.getMaxDuration())],
    }
  );

  private makeActivity(
    data?: Partial<{ title: string; start: string; end: string; summary: string }>
  ): FormGroup {
    const startDate = data?.start ?? this.today();
    return this.fb.group(
      {
        title: this.fb.control<string>(data?.title ?? '', {
          nonNullable: true,
          validators: [Validators.required, Validators.maxLength(50)],
        }),
        start: this.fb.control<string>(startDate, {
          nonNullable: true,
          validators: [Validators.required],
        }),
        end: this.fb.control<string>(data?.end ?? this.defaultActivityEndDate(startDate), {
          nonNullable: true,
          validators: [Validators.required],
        }),
        summary: this.fb.control<string>(data?.summary ?? '', {
          nonNullable: true,
          validators: [Validators.required, wordLimit(50)],
        }),
        subs: this.fb.array<FormGroup>([]),
      },
      {
        validators: [
          activityDatesValidator(() => {
            const start = this.activitiesHeader.get('startDate')?.value;
            const end = this.activitiesHeader.get('endDate')?.value;
            return {
              start: start ? new Date(start) : null,
              end: end ? new Date(end) : null,
            };
          }),
        ],
      }
    );
  }

  // Tableau des activités
  activities = this.fb.array<FormGroup>([], { validators: nonEmpty(1) });

  // Fabrique d’une sous-activité (alignée sur le HTML : label + summary)
  private makeSub(): FormGroup {
    return this.fb.group({
      label: this.fb.control<string>('', {
        nonNullable: true,
        validators: [Validators.maxLength(160)],
      }),
      summary: this.fb.control<string>('', { nonNullable: true, validators: [wordLimit(50)] }),
    });
  }

  // Fabrique d’une activité (alignée sur le HTML : title + dates + summary)

  // ---- BUDGET (par activité) ----
  public selectedBudgetActivity: number | null = null;

  private createBudgetLine(): FormGroup {
    return this.fb.group(
      {
        label: ['', [Validators.required]],
        kind: ['direct'], // 'direct' | 'indirect'
        cfa: [0, [Validators.required, Validators.min(1)]],
        fpbgPct: [100, [Validators.min(0), Validators.max(100)]],
        cofinPct: [0, [Validators.min(0), Validators.max(100)]],
      },
      { validators: [budgetLineValidator] }
    ); // ⬅️ somme 100 + label + cfa>0
  }

  // S’assure qu’une activité possède le sous-groupe budget
  // S’assure qu’une activité possède le sous-groupe budget
  // enabled=false  => le groupe est désactivé (n’influence pas la validité des étapes 1–4)
  // S’assure qu’une activité possède le sous-groupe budget
  // mode: 'keep' (ne touche pas l'état), 'enable', 'disable'
  private ensureActivityBudget(g: FormGroup, mode: 'keep' | 'enable' | 'disable' = 'keep'): void {
    if (!g || typeof g.get !== 'function') return;

    let budget = g.get('budget') as FormGroup | null;
    if (!budget) {
      budget = this.fb.group({
        lines: this.fb.array<FormGroup>([this.createBudgetLine()]),
        indirectOverheads: [0, [Validators.min(0)]], // Frais indirects par activité
      });
      g.addControl('budget', budget);
      // Si on vient de le créer et qu'on veut le laisser inactif avant l'étape 5 :
      if (mode === 'disable') budget.disable({ emitEvent: false });
      if (mode === 'enable') budget.enable({ emitEvent: false });
      return;
    }

    // S'assurer que le champ indirectOverheads existe (pour la rétrocompatibilité)
    if (!budget.get('indirectOverheads')) {
      budget.addControl('indirectOverheads', this.fb.control(0, [Validators.min(0)]));
    }

    if (mode === 'disable' && !budget.disabled) budget.disable({ emitEvent: false });
    if (mode === 'enable' && budget.disabled) budget.enable({ emitEvent: false });
    // mode 'keep' -> ne rien faire
  }

  // Liste d’activités valides pour le sélecteur de budget
  // Liste d’activités valides pour le sélecteur de budget
  public activitiesForBudget(): { index: number; title: string }[] {
    const arr: { index: number; title: string }[] = [];
    (this.activities.controls as FormGroup[]).forEach((g, idx) => {
      const title = String(g.get('title')?.value || '').trim();
      const start = g.get('start')?.value;
      const end = g.get('end')?.value;
      if (title && start && end) {
        // Assure l'existence, NE TOUCHE PAS l'état (keep)
        this.ensureActivityBudget(g, 'keep');
        arr.push({ index: idx, title });
      }
    });
    return arr;
  }
  public selectBudgetActivity(i: number) {
    this.selectedBudgetActivity = i;
    this.ensureActivityBudget(this.activities.at(i) as FormGroup, 'enable'); // ⬅️ on active
  }
  private enableBudgetForActivity(i: number) {
    const g = this.activities.at(i) as FormGroup;
    const budget = g.get('budget') as FormGroup | null;
    if (budget && budget.disabled) {
      budget.enable({ emitEvent: false });
    }
  }
  public activityTitle(i: number | null): string {
    return i === null ? '' : this.activities.at(i).get('title')?.value || '';
  }

  public getBudgetLines(activityIndex: number): FormGroup[] {
    const lines = this.activities
      .at(activityIndex)
      .get(['budget', 'lines']) as FormArray<FormGroup>;
    return lines.controls;
  }
  public addBudgetLine(activityIndex: number) {
    const lines = this.activities
      .at(activityIndex)
      .get(['budget', 'lines']) as FormArray<FormGroup>;
    lines.push(this.createBudgetLine());
    this.recomputeIndirectCap();
  }
  public removeBudgetLine(activityIndex: number, lineIndex: number) {
    const lines = this.activities
      .at(activityIndex)
      .get(['budget', 'lines']) as FormArray<FormGroup>;
    lines.removeAt(lineIndex);
    this.recomputeIndirectCap();
  }
  public asNumber(v: any): number {
    return Number(v || 0);
  }
  public linePctError(activityIndex: number, lineIndex: number): boolean {
    const l = this.activities.at(activityIndex).get(['budget', 'lines', lineIndex]) as FormGroup;
    const a = this.asNumber(l.get('fpbgPct')?.value);
    const b = this.asNumber(l.get('cofinPct')?.value);
    return a + b !== 100;
  }
  public totalActivityCfa(activityIndex: number): number {
    return this.getBudgetLines(activityIndex).reduce(
      (s, l) => s + this.asNumber(l.get('cfa')?.value),
      0
    );
  }
  public totalActivityUsd(activityIndex: number): number {
    const rate = Math.max(1, this.asNumber(this.form.get('usdRate')?.value));
    return Math.floor(this.totalActivityCfa(activityIndex) / rate);
  }
  public totalActivityFpbg(activityIndex: number): number {
    return this.getBudgetLines(activityIndex).reduce(
      (s, l) =>
        s +
        Math.round(
          this.asNumber(l.get('cfa')?.value) * (this.asNumber(l.get('fpbgPct')?.value) / 100)
        ),
      0
    );
  }
  public totalActivityCofin(activityIndex: number): number {
    return this.getBudgetLines(activityIndex).reduce(
      (s, l) =>
        s +
        Math.round(
          this.asNumber(l.get('cfa')?.value) * (this.asNumber(l.get('cofinPct')?.value) / 100)
        ),
      0
    );
  }

  // Règle globale : Indirects ≤ 10% du total projet
  public indirectCapError = false;
  private recomputeIndirectCap() {
    const acts = this.activities.controls as FormGroup[];
    let total = 0,
      indirect = 0;
    for (const a of acts) {
      const lines = (a.get(['budget', 'lines']) as FormArray<FormGroup>)?.controls || [];
      for (const l of lines) {
        const cfa = this.asNumber(l.get('cfa')?.value);
        total += cfa;
        if (l.get('kind')?.value === 'indirect') indirect += cfa;
      }
    }
    this.indirectCapError = total > 0 && indirect > total * 0.1;
  }
  get activitiesArray(): FormArray<FormGroup> {
    return this.activities;
  }

  // API template activités
  addActivity() {
    const g = this.makeActivity();
    this.ensureActivityBudget(g, 'disable'); // ⬅️ reste OFF tant qu'on n'est pas à l'étape 5
    this.activities.push(g);
  }
  removeActivity(i: number) {
    this.activitiesArray.removeAt(i);
  }
  addSub(i: number) {
    this.subArray(i).push(this.makeSub());
  }
  removeSub(i: number, j: number) {
    this.subArray(i).removeAt(j);
  }
  trackByIndex = (_idx: number, _item: unknown) => _idx;
  onDateBlur(g: FormGroup) {
    const s = g.get('start')?.value,
      e = g.get('end')?.value;
    if (s && e && new Date(e) < new Date(s)) {
      g.get('end')?.setValue(s);
      g.updateValueAndValidity({ onlySelf: true });
    }
  }

  // ---- Étape 4 : Risques ----
  risks = this.fb.array<FormGroup>([], nonEmpty(1));
  private makeRisk(description = '', mitigation = '') {
    return this.fb.group({
      description: [description, [Validators.required, Validators.maxLength(200)]],
      mitigation: [mitigation, [Validators.required, Validators.maxLength(200)]],
    });
  }
  addRisk() {
    this.risks.push(this.makeRisk());
  }
  removeRisk(i: number) {
    this.risks.removeAt(i);
  }

  // ---- Étape 5 : Budget agrégé (rubriques simples) ----
  budget = this.fb.group({
    terrain: [0, [Validators.min(0)]],
    invest: [0, [Validators.min(0)]],
    overhead: [0, [Validators.min(0)]], // fonctionnement (ancienne vue)
    cofin: [0, [Validators.min(0)]], // facultatif
  });
  // ---- Étape 6 : État & financement ----
  projectState = this.fb.group({
    stage: this.fb.control<'CONCEPTION' | 'DEMARRAGE' | 'AVANCE' | 'PHASE_FINALE'>('DEMARRAGE', {
      validators: [Validators.required],
    }),
    hasFunding: this.fb.control<boolean>(true, { validators: [Validators.required] }), // ✅ "Oui" par défaut
    fundingDetails: this.fb.control<string>(''), // devient requis si hasFunding = true
    honorAccepted: this.fb.control<boolean>(false), // requis si hasFunding = false (via modal)
  });

  public showHonorModal = false;

  // Ouvre la modal si hasFunding === false, et force l’acceptation
  private wireHonorModal(): void {
    // on s’abonne au changement Oui/Non
    const hasFundingCtrl = this.projectState.get('hasFunding') as FormControl<boolean | null>;
    const honor = this.projectState.get('honorAccepted') as FormControl<boolean>;

    hasFundingCtrl?.valueChanges.subscribe((v) => {
      if (v === false) {
        // Ouvre la modal et force l’utilisateur à cocher dans la modal
        this.showHonorModal = true;
        honor.setValue(false, { emitEvent: false });
      }
    });
  }

  // Fermeture de la modal (confirm = accepte l’engagement ; sinon on revient à Oui)
  closeHonorModal(confirm: boolean) {
    const honor = this.projectState.get('honorAccepted') as FormControl<boolean>;
    if (confirm) {
      honor.setValue(true);
      this.showHonorModal = false;
    } else {
      this.projectState.get('hasFunding')?.setValue(true);
      honor.setValue(false);
      this.showHonorModal = false;
    }
  }

  // ---- Étape 7 : Durabilité ----
  sustainability = this.fb.group({
    text: ['', [Validators.required, wordLimit(250)]],
  });

  // ---- Étape 8 : Annexes conditionnelles selon type d'organisation ----
  // ✅ ALIGNÉ SUR TABLEAU.md - Documents requis pour l'appel à projets FPBG
  attachments = this.fb.group({
    // === DOCUMENTS OBLIGATOIRES UNIVERSELS ===
    NOTE_CONCEPTUELLE: new FormControl<File | null>(null, [fileConstraints()]),
    LETTRE_MOTIVATION: new FormControl<File | null>(null, [fileConstraints()]),
    BUDGET_DETAILLE: new FormControl<File | null>(null, [fileConstraints()]),
    CHRONOGRAMME: new FormControl<File | null>(null, [fileConstraints()]),
    CV_RESPONSABLES: new FormControl<File | null>(null, [fileConstraints()]),
    RIB: new FormControl<File | null>(null, [fileConstraints()]),
    RAPPORT_ACTIVITE: new FormControl<File | null>(null, [fileConstraints()]),

    // === DOCUMENTS SPÉCIFIQUES OBLIGATOIRES ===
    STATUTS: new FormControl<File | null>(null, [fileConstraints()]),
    REGLEMENT_INTERIEUR: new FormControl<File | null>(null, [fileConstraints()]),
    FICHE_CIRCUIT: new FormControl<File | null>(null, [fileConstraints()]),
    DECRET_ARRETE_CREATION: new FormControl<File | null>(null, [fileConstraints()]),
    RECIPISSE: new FormControl<File | null>(null, [fileConstraints()]),
    AGREMENT: new FormControl<File | null>(null, [fileConstraints()]),
    DECLARATION_STAT_FISCALE: new FormControl<File | null>(null, [fileConstraints()]),
    RAPPORT_FINANCIER: new FormControl<File | null>(null, [fileConstraints()]),

    // === DOCUMENTS FACULTATIFS ===
    CARTOGRAPHIE: new FormControl<File | null>(null, [fileConstraints()]),
    LETTRES_SOUTIEN: new FormControl<File | null>(null, [fileConstraints()]),

    // === ANCIENS (pour compatibilité) ===
    STATUTS_REGLEMENT: new FormControl<File | null>(null, [fileConstraints()]),
    CV: new FormControl<File | null>(null, [fileConstraints()]),
    CERTIFICAT_ENREGISTREMENT: new FormControl<File | null>(null, [fileConstraints()]),
    PV_ASSEMBLEE: new FormControl<File | null>(null, [fileConstraints()]),
    RAPPORTS_FINANCIERS: new FormControl<File | null>(null, [fileConstraints()]),
    RCCM: new FormControl<File | null>(null, [fileConstraints()]),
    ETATS_FINANCIERS: new FormControl<File | null>(null, [fileConstraints()]),
    DOCUMENTS_STATUTAIRES: new FormControl<File | null>(null, [fileConstraints()]),
    PREUVE_NON_FAILLITE: new FormControl<File | null>(null, [fileConstraints()]),
  });

  // ---- Form racine (pour autosave/récap) ----
  form = this.fb.group({
    prop: this.stepProp,
    obj: this.obj,
    activitiesHeader: this.activitiesHeader,
    activities: this.activities,
    risks: this.risks,
    budget: this.budget,
    projectState: this.projectState,
    sustainability: this.sustainability,
    attachments: this.attachments,
    // + champs additionnels dynamiques : usdRate, indirectOverheads (ajoutés au ctor)
  });

  /* ==============================
     Guides (colonne droite)
     ============================== */
  guideHtml: SafeHtml[] = [];
  conseilsHtml: SafeHtml[] = [];

  /* ==============================
     Calculs & helpers budget global
     ============================== */
  // Ancienne méthode totalBudget conservée pour compatibilité (utilise le FormGroup budget)
  totalBudget = computed(() => {
    const b = this.budget.getRawValue();
    return Number(b.terrain || 0) + Number(b.invest || 0) + Number(b.overhead || 0);
  });

  allowedAccept = ALLOWED_MIME.join(',');
  lastSavedAt = signal<number | null>(null);

  // Petites métriques pour badges
  public budgetLinesCount(i: number): number {
    const lines = this.activities.at(i).get(['budget', 'lines']) as FormArray;
    return lines?.length || 0;
  }
  public activityHasIndirectOver10(i: number): boolean {
    const lines =
      ((this.activities.at(i).get(['budget', 'lines']) as FormArray)?.controls as FormGroup[]) ||
      [];
    let total = 0,
      indirect = 0;
    for (const l of lines) {
      const cfa = this.asNumber(l.get('cfa')?.value);
      total += cfa;
      if (l.get('kind')?.value === 'indirect') indirect += cfa;
    }
    return total > 0 && indirect / total > 0.1;
  }

  /**
   * Compte le nombre d'activités qui ont au moins une ligne budgétaire
   */
  public activitiesWithLinesCount(): number {
    const acts = (this.activities.controls as FormGroup[]) || [];
    let count = 0;
    for (const a of acts) {
      const lines = (a.get(['budget', 'lines']) as FormArray<FormGroup>)?.controls || [];
      if (lines.length > 0) count++;
    }
    return count;
  }

  /**
   * Retourne la ventilation des frais indirects par activité
   * Les frais indirects sont répartis proportionnellement aux coûts directs
   */
  public indirectBreakdown(): Array<{
    title: string;
    direct: number;
    share: number;
    indirect: number;
  }> {
    const totalDir = this.sumDirect();
    if (totalDir === 0) return [];

    const totalInd = this.totalIndirect();
    const acts = (this.activities.controls as FormGroup[]) || [];
    const result: Array<{ title: string; direct: number; share: number; indirect: number }> = [];

    for (const a of acts) {
      const lines = (a.get(['budget', 'lines']) as FormArray<FormGroup>)?.controls || [];
      if (lines.length === 0) continue;

      let actDirect = 0;
      for (const l of lines) {
        actDirect += this.asNumber(l.get('cfa')?.value);
      }

      const share = actDirect / totalDir;
      const actIndirect = totalInd * share;

      result.push({
        title: a.get('title')?.value || 'Activité sans titre',
        direct: actDirect,
        share: share,
        indirect: actIndirect,
      });
    }

    return result;
  }

  public showSubtotalOnBadge = false;
  public formatK(n: number): string {
    n = Number(n || 0);
    if (n >= 1_000_000) return Math.round(n / 100_000) / 10 + 'M';
    if (n >= 1_000) return Math.round(n / 1_000) + 'k';
    return String(n);
  }

  // Budget global direct/indirect (vue projet)
  public sumDirect(): number {
    let total = 0;
    const acts = (this.activities.controls as FormGroup[]) || [];
    for (const a of acts) {
      const lines = (a.get(['budget', 'lines']) as FormArray<FormGroup>)?.controls || [];
      for (const l of lines) total += this.asNumber(l.get('cfa')?.value);
    }
    return total;
  }

  public totalIndirect(): number {
    // Agréger les frais indirects de toutes les activités
    let total = 0;
    const acts = (this.activities.controls as FormGroup[]) || [];
    for (const a of acts) {
      total += this.asNumber(a.get(['budget', 'indirectOverheads'])?.value);
    }
    return total;
  }

  public totalProject(): number {
    return this.sumDirect() + this.totalIndirect();
  }

  public indirectShare(): number {
    const total = this.totalProject();
    return total > 0 ? this.totalIndirect() / total : 0;
  }

  /**
   * Plafond officiel des frais indirects: 10% du budget total
   * Formule: I_max = floor(D / 9)
   * Car si I = D/9, alors I / (D + I) = D/9 / (D + D/9) = 1/10 = 10%
   */
  public allowedIndirectMax(): number {
    const direct = this.sumDirect();
    return direct > 0 ? Math.floor(direct / 9) : 0;
  }

  public overheadTooHigh(): boolean {
    return this.totalIndirect() > this.allowedIndirectMax();
  }

  public budgetTooLow(): boolean {
    const total = this.totalProject();
    const min = this.budgetMin();
    return total < min;
  }

  public budgetTooHigh(): boolean {
    const total = this.totalProject();
    const max = this.budgetMax();
    return total > max;
  }

  /**
   * Calcule le total des coûts directs pour une activité spécifique
   */
  public activityDirectCosts(activityIndex: number): number {
    const activity = this.activities.at(activityIndex) as FormGroup;
    if (!activity) return 0;
    const lines = (activity.get(['budget', 'lines']) as FormArray<FormGroup>)?.controls || [];
    let total = 0;
    for (const l of lines) {
      total += this.asNumber(l.get('cfa')?.value);
    }
    return total;
  }

  /**
   * Récupère les frais indirects d'une activité spécifique
   */
  public activityIndirectCosts(activityIndex: number): number {
    const activity = this.activities.at(activityIndex) as FormGroup;
    if (!activity) return 0;
    const control = activity.get(['budget', 'indirectOverheads']);
    // Utiliser getRawValue pour être sûr d'avoir la valeur actuelle
    const budget = activity.get('budget') as FormGroup;
    if (!budget) return 0;
    const value = budget.getRawValue().indirectOverheads;
    return this.asNumber(value);
  }

  /**
   * Calcule le plafond des frais indirects pour une activité (10% des coûts directs)
   */
  public activityAllowedIndirectMax(activityIndex: number): number {
    const direct = this.activityDirectCosts(activityIndex);
    return direct > 0 ? Math.floor(direct / 9) : 0;
  }

  /**
   * Vérifie si les frais indirects d'une activité dépassent 10%
   */
  public activityOverheadTooHigh(activityIndex: number): boolean {
    return (
      this.activityIndirectCosts(activityIndex) > this.activityAllowedIndirectMax(activityIndex)
    );
  }

  /**
   * Calcule le total d'une activité (directs + indirects)
   */
  public activityTotal(activityIndex: number): number {
    return this.activityDirectCosts(activityIndex) + this.activityIndirectCosts(activityIndex);
  }

  /**
   * Calcule la part des frais indirects pour une activité
   */
  public activityIndirectShare(activityIndex: number): number {
    const total = this.activityTotal(activityIndex);
    const indirect = this.activityIndirectCosts(activityIndex);
    return total > 0 ? indirect / total : 0;
  }

  /**
   * Retourne le FormControl des frais indirects d'une activité
   */
  public activityIndirectControl(activityIndex: number): any {
    const activity = this.activities.at(activityIndex) as FormGroup;
    return activity?.get(['budget', 'indirectOverheads']);
  }

  /**
   * Retourne les bornes min/max du budget selon le type de subvention
   */
  public budgetMin(): number {
    const code = this.typeSubventionCode();
    return this.subventionConfig[code]?.montantMin || 5_000_000;
  }

  public budgetMax(): number {
    const code = this.typeSubventionCode();
    return this.subventionConfig[code]?.montantMax || 50_000_000;
  }

  private totalOutOfRange(): boolean {
    const total = this.totalProject();
    return total < this.budgetMin() || total > this.budgetMax();
  }

  // Signals pour les erreurs de budget (mise à jour réactive)
  private _budgetTooLowSignal = signal(false);
  private _budgetTooHighSignal = signal(false);
  private _overheadTooHighSignal = signal(false);

  // Getters publics pour accéder aux signals dans le template
  get budgetTooLowSignal() {
    return this._budgetTooLowSignal.asReadonly();
  }
  get budgetTooHighSignal() {
    return this._budgetTooHighSignal.asReadonly();
  }
  get overheadTooHighSignal() {
    return this._overheadTooHighSignal.asReadonly();
  }

  // Erreur globale si dépassement 10% ou hors tranche
  public recomputeIndirectCapGlobal(): void {
    // Mettre à jour les signals
    this._budgetTooLowSignal.set(this.budgetTooLow());
    this._budgetTooHighSignal.set(this.budgetTooHigh());
    this._overheadTooHighSignal.set(this.overheadTooHigh());

    this.indirectCapError = this.overheadTooHigh();
    const rangeBudgetError = this.totalOutOfRange();

    const errs = { ...(this.form.errors || {}) };
    if (this.indirectCapError) errs['indirectCap'] = true;
    else delete errs['indirectCap'];
    if (rangeBudgetError) errs['budgetRange'] = true;
    else delete errs['budgetRange'];
    this.form.setErrors(Object.keys(errs).length ? errs : null);

    // Forcer la détection de changement Angular
    this.cdr.markForCheck();
  }

  /* ==============================
     Méthodes pour gérer les annexes conditionnelles
     ============================== */

  /**
   * Retourne la liste des documents requis selon le type d'organisation
   */
  getRequiredDocuments(): Array<{ key: string; label: string; required: boolean }> {
    // ✅ ALIGNÉ SUR TABLEAU.md - Documents requis pour l'appel à projets FPBG

    // ===== DOCUMENTS OBLIGATOIRES UNIVERSELS =====
    const universalRequired = [
      {
        key: 'NOTE_CONCEPTUELLE',
        label: 'Formulaire de Note Conceptuelle complété',
        required: true,
      },
      {
        key: 'LETTRE_MOTIVATION',
        label: 'Lettre de motivation du porteur de projet',
        required: true,
      },
      { key: 'BUDGET_DETAILLE', label: 'Budget détaillé du projet', required: true },
      { key: 'CHRONOGRAMME', label: "Chronogramme d'exécution", required: true },
      {
        key: 'CV_RESPONSABLES',
        label: 'CV du porteur et des responsables techniques',
        required: true,
      },
      { key: 'RIB', label: "RIB de l'organisation", required: true },
      { key: 'RAPPORT_ACTIVITE', label: "Rapport d'activité (n-1)", required: true },
    ];

    // Normaliser le type d'organisation (les valeurs viennent de l'enum Prisma TypeOrganisation)
    const type = this.usertype?.toUpperCase().trim() || '';

    let specificDocuments: Array<{ key: string; label: string; required: boolean }> = [];

    // ===== DOCUMENTS SPÉCIFIQUES OBLIGATOIRES selon le type d'organisation =====
    // Correspondance exacte avec TABLEAU.md

    if (type === 'ONG' || type === 'ASSOCIATION') {
      // 🏢 ONG/Associations
      specificDocuments = [
        { key: 'STATUTS', label: 'Statuts', required: true },
        { key: 'REGLEMENT_INTERIEUR', label: 'Règlement intérieur', required: true },
        { key: 'RECIPISSE', label: "Récépissé d'existence juridique", required: true },
        { key: 'AGREMENT', label: 'Agrément', required: false }, // ✅ Facultatif
        { key: 'RAPPORT_FINANCIER', label: 'Rapport financier (n-1)', required: true },
      ];
    } else if (type === 'COOPERATIVE') {
      // 🏢 Coopératives
      specificDocuments = [
        { key: 'STATUTS', label: 'Statuts', required: true },
        { key: 'REGLEMENT_INTERIEUR', label: 'Règlement intérieur', required: true },
        { key: 'RECIPISSE', label: "Récépissé d'existence juridique", required: true },
        { key: 'AGREMENT', label: 'Agrément', required: false }, // ✅ Facultatif
        { key: 'RAPPORT_FINANCIER', label: 'Rapport financier (n-1)', required: true },
      ];
    } else if (type === 'PME' || type === 'PMI' || type === 'STARTUP') {
      // 💼 PME/PMI/Startups
      specificDocuments = [
        { key: 'FICHE_CIRCUIT', label: 'Fiche circuit (immatriculation)', required: true },
        { key: 'AGREMENT', label: 'Agrément', required: false }, // ✅ Facultatif
        {
          key: 'DECLARATION_STAT_FISCALE',
          label: 'Déclaration Statistique et fiscale (n-1)',
          required: true,
        },
      ];
    } else if (type === 'SECTEUR_PUBLIC') {
      // 🏛 Entités gouvernementales (Secteur public)
      specificDocuments = [
        { key: 'DECRET_ARRETE_CREATION', label: 'Décret/arrêté de création', required: true },
        { key: 'AGREMENT', label: 'Agrément', required: false }, // ✅ Facultatif
      ];
    } else if (type === 'RECHERCHE') {
      // 🔬 Organismes de recherche
      specificDocuments = [
        { key: 'STATUTS', label: 'Statuts', required: true },
        { key: 'REGLEMENT_INTERIEUR', label: 'Règlement intérieur', required: true },
        { key: 'DECRET_ARRETE_CREATION', label: 'Décret/arrêté de création', required: true },
        { key: 'AGREMENT', label: 'Agrément', required: false }, // ✅ Facultatif
        { key: 'RAPPORT_FINANCIER', label: 'Rapport financier (n-1)', required: true },
      ];
    } else if (type === 'COMMUNAUTE') {
      // 👥 Communautés organisées
      specificDocuments = [
        { key: 'STATUTS', label: 'Statuts', required: true },
        { key: 'REGLEMENT_INTERIEUR', label: 'Règlement intérieur', required: true },
        { key: 'RECIPISSE', label: "Récépissé d'existence juridique", required: true },
        { key: 'AGREMENT', label: 'Agrément', required: false }, // ✅ Facultatif
        { key: 'RAPPORT_FINANCIER', label: 'Rapport financier (n-1)', required: true },
      ];
    }

    // ===== DOCUMENTS FACULTATIFS =====
    const optionalDocuments = [
      { key: 'CARTOGRAPHIE', label: 'Cartographie/localisation du projet', required: false },
      { key: 'LETTRES_SOUTIEN', label: 'Lettre de partenariat/soutien', required: false },
    ];

    // Retourner tous les documents pertinents pour ce type d'organisation
    return [...universalRequired, ...specificDocuments, ...optionalDocuments];
  }

  /**
   * Vérifie si un document doit être affiché
   */
  shouldShowDocument(key: string): boolean {
    return this.getRequiredDocuments().some((doc) => doc.key === key);
  }

  /**
   * Récupère les infos utilisateur depuis localStorage
   */
  private loadUserInfo(): void {
    try {
      // 🎯 Charger depuis la clé 'user' qui contient les données complètes du backend
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        console.log('📋 Données utilisateur complètes:', user);

        // Déterminer le type d'utilisateur et d'organisation
        const org = user?.organisation;
        // ✅ Utiliser le vrai type d'organisation (ONG, PME, etc.)
        this.usertype = org?.type || 'user';
        console.log("📋 Type d'organisation détecté:", this.usertype);

        // Charger le type de subvention depuis l'organisation
        if (org?.typeSubvention) {
          const typeSubv = org.typeSubvention;
          const code = (typeSubv.code || 'PETITE') as 'PETITE' | 'MOYENNE';
          const config = this.subventionConfig[code];

          if (config) {
            // ✅ Utiliser setTypeSubvention() pour mettre à jour TOUS les validateurs
            console.log(
              '✅ Type de subvention détecté:',
              config.libelle,
              '(code:',
              code,
              ') - Durée max:',
              config.dureeMax,
              'mois'
            );
            this.setTypeSubvention(code);
          } else {
            console.warn('⚠️ Aucune configuration trouvée pour le code:', code);
          }
        } else {
          console.warn("⚠️ Aucun typeSubvention trouvé dans l'organisation");
        }
      }

      // Fallback sur fpbg.account pour compatibilité
      const accountData = localStorage.getItem('fpbg.account');
      if (accountData) {
        this.userAccount = JSON.parse(accountData);
        if (!this.usertype) {
          this.usertype = this.userAccount?.type || '';
        }
        console.log("📋 Type d'organisation (fallback):", this.usertype);
      }

      this.updateAttachmentsValidators();
    } catch (error) {
      console.error('❌ Erreur lecture compte utilisateur:', error);
    } 
  }

  /**
   * Met à jour les validateurs des champs d'annexes selon le type d'organisation
   */
  private updateAttachmentsValidators(): void {
    const requiredDocs = this.getRequiredDocuments();

    requiredDocs.forEach((doc) => {
      const control = this.attachments.get(doc.key);
      if (control) {
        if (doc.required) {
          control.setValidators([Validators.required, fileConstraints()]);
        } else {
          control.setValidators([fileConstraints()]);
        }
        control.updateValueAndValidity({ emitEvent: false });
      }

      // Initialiser l'état du document
      if (!this.documentsState.has(doc.key)) {
        this.documentsState.set(doc.key, {
          selected: false,
          file: null,
          uploaded: false,
        });
      }
    });
  }

  /* ==============================
     Gestion de l'interface de sélection/upload des documents
     ============================== */

  /**
   * Retourne les documents non uploadés
   */
  getPendingDocuments(): Array<{ key: string; label: string; required: boolean }> {
    return this.getRequiredDocuments().filter((doc) => {
      const state = this.documentsState.get(doc.key);
      return !state?.uploaded;
    });
  }

  /**
   * Retourne les documents uploadés
   */
  getUploadedDocuments(): Array<{
    key: string;
    label: string;
    required: boolean;
    file: File | null;
  }> {
    const uploaded = this.getRequiredDocuments()
      .filter((doc) => {
        const state = this.documentsState.get(doc.key);
        return state?.uploaded;
      })
      .map((doc) => ({
        ...doc,
        file: this.documentsState.get(doc.key)?.file || null,
      }));

    // Log pour debug
    if (this.current() === 8) {
      console.log('📎 getUploadedDocuments() appelé - Résultat:', uploaded.length, 'documents');
    }

    return uploaded;
  }

  /**
   * Toggle la sélection d'un document
   */
  toggleDocumentSelection(key: string): void {
    const state = this.documentsState.get(key);
    if (state) {
      state.selected = !state.selected;
    }
  }

  /**
   * Vérifie si un document est sélectionné
   */
  isDocumentSelected(key: string): boolean {
    return this.documentsState.get(key)?.selected || false;
  }

  /**
   * Ouvre le sélecteur de fichier pour un document
   */
  openFileSelector(key: string): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = this.allowedAccept;
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.uploadDocument(key, file);
      }
    };
    input.click();
  }

  /**
   * Upload un document
   */
  async uploadDocument(key: string, file: File): Promise<void> {
    // Validation avec le PdfService
    const validation = this.pdfService.validatePdfFile(file);
    if (!validation.valid) {
      alert(validation.error || "Le fichier n'est pas valide");
      return;
    }

    // Convertir le PDF en Base64
    const conversion = await this.pdfService.convertPdfToBase64(file);
    if (!conversion.success) {
      alert(conversion.error || 'Erreur lors de la conversion du fichier');
      return;
    }

    // Mettre à jour l'état avec le Base64
    const state = this.documentsState.get(key);
    if (state) {
      state.file = file;
      state.uploaded = true;
      state.selected = false;
      state.base64 = conversion.base64;
      state.fileName = conversion.fileName;
      state.fileSize = conversion.fileSize;
    }

    // Mettre à jour le FormControl et marquer comme valide
    const control = this.attachments.get(key);
    if (control) {
      control.setValue(file);
      control.markAsTouched();
      control.updateValueAndValidity();
    }

    console.log(`✅ Document uploadé et converti en Base64: ${key} - ${file.name}`);
  }

  /**
   * Supprime un document uploadé
   */
  removeDocument(key: string): void {
    const state = this.documentsState.get(key);
    if (state) {
      state.file = null;
      state.uploaded = false;
      state.selected = false;
      state.base64 = undefined;
      state.fileName = undefined;
      state.fileSize = undefined;
    }

    // Réinitialiser le FormControl
    const control = this.attachments.get(key);
    if (control) {
      control.setValue(null);
      control.markAsUntouched();
      control.updateValueAndValidity();
    }

    console.log(`🗑️ Document supprimé: ${key}`);
  }

  /**
   * Prévisualise un document (ouvre dans un nouvel onglet)
   */
  previewDocument(key: string): void {
    const state = this.documentsState.get(key);
    if (state?.file) {
      const url = URL.createObjectURL(state.file);
      window.open(url, '_blank');
    }
  }

  /**
   * Télécharge les documents sélectionnés
   */
  uploadSelectedDocuments(): void {
    const selectedKeys = Array.from(this.documentsState.entries())
      .filter(([_, state]) => state.selected)
      .map(([key, _]) => key);

    if (selectedKeys.length === 0) {
      alert('Veuillez sélectionner au moins un document');
      return;
    }

    // Pour chaque document sélectionné, ouvrir le sélecteur de fichier
    selectedKeys.forEach((key) => {
      this.openFileSelector(key);
    });
  }

  /**
   * Formate la taille du fichier
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Retourne les documents obligatoires manquants
   */
  getMissingRequiredDocuments(): Array<{ key: string; label: string; required: boolean }> {
    return this.getRequiredDocuments().filter((doc) => {
      if (!doc.required) return false;
      const state = this.documentsState.get(doc.key);
      return !state?.uploaded;
    });
  }

  /**
   * Compte le nombre de documents obligatoires uploadés
   */
  getUploadedRequiredCount(): number {
    return this.getUploadedDocuments().filter((doc) => doc.required).length;
  }

  /**
   * Compte le nombre total de documents obligatoires
   */
  getTotalRequiredCount(): number {
    return this.getRequiredDocuments().filter((doc) => doc.required).length;
  }

  /* ==============================
     Méthode de nettoyage du localStorage
     ============================== */
  /**
   * Nettoie complètement le localStorage lié au formulaire de soumission
   * Utilisé pour démarrer une nouvelle soumission sur un formulaire vierge
   */
  clearLocalStorageDraft(): void {
    console.log('🧹 Nettoyage du brouillon localStorage...');

    // Supprimer le brouillon du formulaire
    localStorage.removeItem(LS_DRAFT_KEY);

    // Réinitialiser l'étape à 0
    localStorage.removeItem(LS_STEP_KEY);

    // Optionnel : supprimer les métadonnées du brouillon
    localStorage.removeItem(DRAFT_META_KEY);

    // Émettre un événement pour notifier le dashboard (si nécessaire)
    window.dispatchEvent(new Event('fpbg:draft-cleared'));

    console.log('✅ Brouillon localStorage nettoyé');
  }

  /**
   * Vérifie si un brouillon existe dans le localStorage
   */
  hasDraft(): boolean {
    const raw = localStorage.getItem(LS_DRAFT_KEY);
    return raw !== null && raw.trim() !== '';
  }

  /* ==============================
     Cycle de vie / Constructor
     ============================== */
  constructor() {
    // 🧹 IMPORTANT : Nettoyer le localStorage au démarrage
    // Cela garantit que chaque nouvelle soumission démarre avec un formulaire vierge
    // et évite la confusion avec d'anciennes valeurs sauvegardées d'une précédente soumission
    this.clearLocalStorageDraft();

    // Charger les informations utilisateur
    this.loadUserInfo();

    // ---- Paramètre : taux USD (lecture seule côté UI) ----
    const DEFAULT_USD_RATE = 600;
    if (!this.form.get('usdRate')) {
      // @ts-ignore readonly côté UI
      this.form.addControl('usdRate', new FormControl({ value: DEFAULT_USD_RATE, disabled: true }));
    }
    if (!this.form.get('indirectOverheads')) {
      // @ts-ignore
      this.form.addControl('indirectOverheads', new FormControl(0, [Validators.min(0)]));
    }

    // Initialiser au moins une activité
    if (this.activities.length === 0) this.addActivity();

    // Configurer la validation dynamique pour fundingDetails
    this.projectState.get('hasFunding')!.valueChanges.subscribe((v) => {
      const fd = this.projectState.get('fundingDetails')!;
      if (v === true) {
        fd.addValidators([Validators.required]);
      } else {
        fd.removeValidators([Validators.required]);
        fd.setValue(''); // on vide si Non
      }
      fd.updateValueAndValidity({ emitEvent: false });
    });

    // Note: La surveillance des changements de type de subvention est gérée via effect()
    // dans le template ou manuellement quand le type change

    // Calcul initial des erreurs de budget
    setTimeout(() => this.recomputeIndirectCapGlobal(), 0);

    // Autosave unique (LS + méta + event)
    this.form.valueChanges.pipe(debounceTime(400)).subscribe((v) => {
      // Sauve le brouillon
      localStorage.setItem(LS_DRAFT_KEY, JSON.stringify(v));

      // Meta à jour (timestamp)
      const now = Date.now();
      const currentMeta = JSON.parse(localStorage.getItem(DRAFT_META_KEY) || '{}') || {};
      currentMeta.updatedAt = now; // ms
      currentMeta._updatedAt = new Date(now).toISOString(); // ISO lecture
      localStorage.setItem(DRAFT_META_KEY, JSON.stringify(currentMeta));

      // Event pour dashboard
      window.dispatchEvent(new Event('fpbg:draft-updated'));

      // Vérifie le plafond 10 % (global)
      this.recomputeIndirectCapGlobal();

      // Horodatage local (UI)
      this.lastSavedAt.set(now);
    });

    // Précharge guides (colonne droite)
    this.loadGuides();

    // Filtrage modal engagement d’honneur
    this.wireHonorModal();
  }

  // Affichage horodatage “Sauvegardé HH:MM:SS”
  lastSaved(): string {
    const t = this.lastSavedAt();
    if (!t) return '—';
    const d = new Date(t);
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  /* ==============================
     Méthodes UI diverses
     ============================== */
  today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  }

  /**
   * Retourne une date par défaut pour la fin du projet (12 mois après aujourd'hui)
   */
  defaultEndDate(): string {
    const d = new Date();
    d.setMonth(d.getMonth() + 12); // Ajouter 12 mois par défaut
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  }

  /**
   * Retourne une date de fin par défaut pour une activité (1 mois après la date donnée)
   */
  defaultActivityEndDate(startDate?: string): string {
    const d = startDate ? new Date(startDate) : new Date();
    d.setMonth(d.getMonth() + 1); // Ajouter 1 mois par défaut
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  }

  toggleDomain(d: string, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    const ctrl = this.stepProp.get('domains') as FormControl<string[]>;
    let arr = [...(ctrl.value ?? [])];
    if (checked) {
      if (!arr.includes(d)) arr.push(d);
    } else {
      arr = arr.filter((x) => x !== d);
    }
    ctrl.setValue(arr);
  }

  onFile(e: Event, key: string) {
    const f = (e.target as HTMLInputElement).files?.[0] ?? null;
    this.attachments.get(key)?.setValue(f);
  }

  // Validation douce pour autoriser "Suivant"
  canGoNext(): boolean {
    const i = this.current();

    switch (i) {
      case 0:
        return this.stepProp.valid;
      case 1:
        return this.obj.valid;
      case 2: {
        // ⬇️ Validation personnalisée pour l'étape 3

        // Récupérer les valeurs de l'en-tête
        const startDate = this.activitiesHeader.get('startDate');
        const endDate = this.activitiesHeader.get('endDate');
        const summary = this.activitiesHeader.get('summary');

        const start = startDate?.value;
        const end = endDate?.value;
        const summaryVal = summary?.value;

        // Vérifier que les champs sont remplis
        if (!start || !end || !summaryVal || summaryVal.trim() === '') {
          console.log('❌ [canGoNext] Étape 3 - Champs manquants:', { start, end, summaryVal });
          return false;
        }

        // Vérifier que les dates sont valides (date de fin >= date de début)
        const startD = new Date(start);
        const endD = new Date(end);
        if (isNaN(startD.getTime()) || isNaN(endD.getTime())) {
          console.log('❌ [canGoNext] Étape 3 - Dates invalides');
          return false;
        }
        if (endD < startD) {
          console.log('❌ [canGoNext] Étape 3 - Date fin < date début');
          return false;
        }

        // ✅ Vérifier que la durée est <= durée maximale autorisée
        const monthsDiff =
          (endD.getFullYear() - startD.getFullYear()) * 12 +
          (endD.getMonth() - startD.getMonth()) +
          1;
        const maxMonths = this.getMaxDuration();
        if (monthsDiff > maxMonths) {
          console.log(
            `❌ [canGoNext] Étape 3 - Durée trop longue: ${monthsDiff} mois > ${maxMonths} mois`
          );
          return false;
        }

        // Vérifier la limite de mots du résumé (200 mots)
        const wordCount = summaryVal
          .trim()
          .split(/\s+/)
          .filter((w: string) => w.length > 0).length;
        if (wordCount > 200) {
          console.log(`❌ [canGoNext] Étape 3 - Résumé trop long: ${wordCount} mots > 200`);
          return false;
        }

        // Vérifier qu'il y a au moins une activité
        const groups = this.activities.controls as FormGroup[];
        if (groups.length < 1) {
          console.log('❌ [canGoNext] Étape 3 - Aucune activité');
          return false;
        }

        // chaque activité doit avoir title/start/end/summary valides
        for (let idx = 0; idx < groups.length; idx++) {
          const g = groups[idx];
          const title = g.get('title')?.value;
          const actStart = g.get('start')?.value;
          const actEnd = g.get('end')?.value;
          const actSummary = g.get('summary')?.value;

          // Vérifier que les champs sont remplis
          if (!title || title.trim() === '') {
            console.log(`❌ [canGoNext] Activité ${idx + 1} - Titre manquant`);
            return false;
          }
          if (!actStart || !actEnd) {
            console.log(`❌ [canGoNext] Activité ${idx + 1} - Dates manquantes`);
            return false;
          }
          if (!actSummary || actSummary.trim() === '') {
            console.log(`❌ [canGoNext] Activité ${idx + 1} - Description manquante`);
            return false;
          }

          // Vérifier la longueur du titre (max 50)
          if (title.length > 50) {
            console.log(
              `❌ [canGoNext] Activité ${idx + 1} - Titre trop long: ${title.length} > 50`
            );
            return false;
          }

          // Vérifier la limite de mots du résumé d'activité (50 mots)
          const actWordCount = actSummary
            .trim()
            .split(/\s+/)
            .filter((w: string) => w.length > 0).length;
          if (actWordCount > 50) {
            console.log(
              `❌ [canGoNext] Activité ${
                idx + 1
              } - Description trop longue: ${actWordCount} > 50 mots`
            );
            return false;
          }

          // Vérifier que les dates d'activité sont valides
          const actStartD = new Date(actStart);
          const actEndD = new Date(actEnd);
          if (isNaN(actStartD.getTime()) || isNaN(actEndD.getTime())) {
            console.log(`❌ [canGoNext] Activité ${idx + 1} - Dates invalides`);
            return false;
          }

          // Date de fin >= date de début
          if (actEndD < actStartD) {
            console.log(`❌ [canGoNext] Activité ${idx + 1} - Date fin < date début`);
            return false;
          }

          // Les dates doivent être dans la fenêtre du projet
          if (actStartD < startD) {
            console.log(
              `❌ [canGoNext] Activité ${
                idx + 1
              } - Commence avant le projet (${actStart} < ${start})`
            );
            return false;
          }
          if (actEndD > endD) {
            console.log(
              `❌ [canGoNext] Activité ${idx + 1} - Finit après le projet (${actEnd} > ${end})`
            );
            return false;
          }
        }

        console.log('✅ [canGoNext] Étape 3 - Tout est valide!');
        return true;
      }
      case 3:
        return this.risks.valid;
      case 4:
        // Vérifier que le budget est valide, les frais indirects ne dépassent pas 10%,
        // et le montant total respecte les limites du type de subvention

        // Vérifier les frais indirects de chaque activité
        const activities = this.activities.controls as FormGroup[];
        for (let i = 0; i < activities.length; i++) {
          if (this.activityOverheadTooHigh(i)) {
            console.log(
              `❌ [canGoNext] Étape 4 - Activité ${
                i + 1
              } : frais indirects dépassent 10% des coûts directs`
            );
            return false;
          }
        }

        const totalBudget = this.totalProject();
        const minBudget = this.budgetMin();
        const maxBudget = this.budgetMax();
        if (totalBudget < minBudget) {
          console.log(
            `❌ [canGoNext] Étape 4 - Budget trop faible: ${totalBudget} FCFA < ${minBudget} FCFA`
          );
          return false;
        }
        if (totalBudget > maxBudget) {
          console.log(
            `❌ [canGoNext] Étape 4 - Budget trop élevé: ${totalBudget} FCFA > ${maxBudget} FCFA`
          );
          return false;
        }
        return this.budget.valid;
      case 5:
        return this.projectState.valid;
      case 6:
        return this.sustainability.valid;
      case 7:
        // Vérifier que tous les documents obligatoires sont uploadés
        const missingRequired = this.getMissingRequiredDocuments();
        return missingRequired.length === 0;
      default:
        return true;
    }
  }
  private ensureAllBudgetsDisabledBeforeStep5(): void {
    const groups = this.activities.controls as FormGroup[];
    groups.forEach((g) => this.ensureActivityBudget(g, 'disable')); // ta version 'mode' de ensureActivityBudget
  }
  /**
   * Prépare les données pour la soumission incluant les fichiers
   */
  private prepareSubmissionData(): FormData {
    const formData = new FormData();

    // Récupérer toutes les données du formulaire
    const formValue = this.form.getRawValue();

    // Aplatir les données pour correspondre au schéma Prisma
    const projectData = {
      // Étape 1: Proposition
      title: formValue.prop?.title || '',
      domains: formValue.prop?.domains || [],
      location: formValue.prop?.location || '',
      targetGroup: formValue.prop?.targetGroup || '',
      contextJustification: formValue.prop?.contextJustification || '',

      // Étape 2: Objectifs
      objectives: formValue.obj?.objectives || '',
      expectedResults: formValue.obj?.expectedResults || '',
      durationMonths: formValue.obj?.durationMonths || 0,

      // Étape 3: Activités
      activitiesStartDate: formValue.activitiesHeader?.startDate || '',
      activitiesEndDate: formValue.activitiesHeader?.endDate || '',
      activitiesSummary: formValue.activitiesHeader?.summary || '',
      activities: formValue.activities || [],

      // Étape 4: Risques
      risks: formValue.risks || [],

      // Étape 5: Budget
      usdRate: 655,
      budgetActivities:
        formValue.activities?.map((act: any, index: number) => ({
          activityIndex: index,
          lines: act.budget?.lines || [],
        })) || [],
      indirectOverheads: formValue.budget?.overhead || 0,

      // Étape 6: État du projet
      projectStage: formValue.projectState?.stage || 'CONCEPTION',
      hasFunding: formValue.projectState?.hasFunding || false,
      fundingDetails: formValue.projectState?.fundingDetails || '',
      honorAccepted: formValue.projectState?.honorAccepted || false,

      // Étape 7: Durabilité
      sustainability: formValue.sustainability?.text || '',
      replicability: formValue.sustainability?.text || '',

      // Collaborateurs (si présents)
      collaborateurs: [],
    };

    // Ajouter les données textuelles en JSON
    formData.append('projectData', JSON.stringify(projectData));

    // Ajouter les fichiers uploadés
    const uploadedDocs = this.getUploadedDocuments();
    uploadedDocs.forEach((doc) => {
      if (doc.file) {
        // Ajouter chaque fichier avec sa clé comme nom de champ
        formData.append(`attachment_${doc.key}`, doc.file, doc.file.name);
      }
    });

    // Ajouter un index des documents
    const attachmentsIndex = uploadedDocs.map((doc) => ({
      key: doc.key,
      label: doc.label,
      required: doc.required,
      fileName: doc.file?.name,
      fileSize: doc.file?.size,
      fileType: doc.file?.type,
    }));
    formData.append('attachmentsIndex', JSON.stringify(attachmentsIndex));

    return formData;
  }

  // Soumission du projet
  submit() {
    // Vérifier la validité du formulaire
    if (!this.canGoNext()) {
      this.form.markAllAsTouched();
      alert('Veuillez corriger les erreurs avant la soumission.');
      return;
    }

    if (this.overheadTooHigh()) {
      alert('Les frais de fonctionnement dépassent 10% du total.');
      return;
    }

    // Préparer les données JSON (sans fichiers pour l'instant)
    const formValue = this.form.getRawValue();

    const projectData = {
      // Étape 1: Proposition
      title: formValue.prop?.title || '',
      domains: formValue.prop?.domains || [],
      location: formValue.prop?.location || '',
      targetGroup: formValue.prop?.targetGroup || '',
      contextJustification: formValue.prop?.contextJustification || '',

      // Étape 2: Objectifs
      objectives: formValue.obj?.objectives || '',
      expectedResults: formValue.obj?.expectedResults || '',
      durationMonths: formValue.obj?.durationMonths || 0,

      // Étape 3: Activités
      activitiesStartDate: formValue.activitiesHeader?.startDate || '',
      activitiesEndDate: formValue.activitiesHeader?.endDate || '',
      activitiesSummary: formValue.activitiesHeader?.summary || '',
      activities: formValue.activities || [],

      // Étape 4: Risques
      risks: formValue.risks || [],

      // Étape 5: Budget
      usdRate: 655,
      budgetActivities:
        formValue.activities?.map((act: any, index: number) => ({
          activityIndex: index,
          lines: act.budget?.lines || [],
        })) || [],
      indirectOverheads: formValue.budget?.overhead || 0,

      // Étape 6: État du projet
      projectStage: formValue.projectState?.stage || 'CONCEPTION',
      hasFunding: formValue.projectState?.hasFunding || false,
      fundingDetails: formValue.projectState?.fundingDetails || '',
      honorAccepted: formValue.projectState?.honorAccepted || false,

      // Étape 7: Durabilité
      sustainability: formValue.sustainability?.text || '',
      replicability: formValue.sustainability?.text || '',

      // Collaborateurs (si présents)
      collaborateurs: [],

      // Pièces jointes - avec contenu Base64
      attachments: this.getUploadedDocuments().map((doc) => {
        const state = this.documentsState.get(doc.key);
        return {
          key: doc.key,
          label: doc.label,
          fileName: state?.fileName || doc.file?.name || '',
          fileSize: state?.fileSize || doc.file?.size || 0,
          fileType: doc.file?.type || 'application/pdf',
          required: doc.required,
          base64: state?.base64 || '', // Contenu Base64 du PDF
        };
      }),
    };

    // Logs pour debug
    console.log('📤 Soumission du projet (JSON uniquement):');
    console.log('- Titre:', projectData.title);
    console.log('- Activités:', projectData.activities.length);
    console.log('- Risques:', projectData.risks.length);
    console.log('- Documents:', projectData.attachments.length);

    // Envoyer au backend via HTTP
    const token = localStorage.getItem('fpbg.token');
    if (!token) {
      alert('Session expirée. Veuillez vous reconnecter.');
      this.router.navigateByUrl('/login');
      return;
    }

    // Activer l'état de chargement
    this.isSubmitting.set(true);
    console.log('⏳ Envoi en cours...');

    // Envoi JSON simple (sans fichiers)
    this.http
      .post(`${environment.urlServer}/api/demandes/submit-json`, projectData, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      .subscribe({
        next: (response: any) => {
          console.log('✅ Projet soumis avec succès:', response);

          // Désactiver l'état de chargement
          this.isSubmitting.set(false);

          // Préparer le résumé de la soumission
          this.submissionSummary = {
            projectTitle: this.stepProp.get('title')?.value || 'Projet sans titre',
            documentsCount: this.getUploadedDocuments().length,
            totalBudget: this.totalProject(),
          };

          // Nettoyer le localStorage (utiliser la méthode centralisée)
          this.clearLocalStorageDraft();

          // Afficher la modale de succès
          this.showSuccessModal = true;
        },
        error: (error) => {
          console.error('❌ Erreur lors de la soumission:', error);

          // Désactiver l'état de chargement
          this.isSubmitting.set(false);

          let errorMessage = 'Une erreur est survenue lors de la soumission du projet.';

          if (error.status === 401) {
            errorMessage = 'Session expirée. Veuillez vous reconnecter.';
            this.router.navigateByUrl('/login');
          } else if (error.error?.error) {
            errorMessage = error.error.error;
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }

          alert('❌ Erreur de soumission\n\n' + errorMessage);
        },
      });
  }

  /**
   * Ferme la modale de succès et redirige vers le dashboard
   */
  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.router.navigateByUrl('/dashboard');
  }

  /* ==============================
     Guides (colonne droite)
     ============================== */
  private sanitize(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private loadGuides() {
    const guides: string[] = [
      // 0 - Proposition
      `
    <p class="text-sm mb-2">
      <span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span>
      Proposition de projet
    </p>
    <div class="text-xs text-slate-500 mb-2">Note conceptuelle : <b>max. 5 pages</b> (hors annexes).</div>
    <ul class="list-disc ml-5 space-y-1">
      <li><b>Titre du projet</b> : clair, concis, accrocheur, résumant l’objectif principal.</li>
      <li><b>Lieu d’exécution & groupe cible</b> (<b>≤ 200 mots</b>) : précisez les sites d’intervention et les bénéficiaires (inclure, si pertinent, aspects genre et conservation communautaire).</li>
      <li><b>Contexte & justification</b> (<b>≤ 500 mots</b>) : expliquez le contexte, l’origine du projet et sa pertinence pour le FPBG. Répondez explicitement :
        <ul class="list-disc ml-5">
          <li>D’où vient l’idée ? Comment a-t-elle été identifiée ?</li>
          <li>Quelle problématique sous-jacente et en quoi est-elle importante ?</li>
          <li>Quelles lacunes/défis que d’autres projets n’ont pas encore résolus ?</li>
          <li>Quelles ressources naturelles concernées (biodiversité/écosystèmes) ?</li>
          <li>Quels risques si aucune mesure n’est prise ?</li>
        </ul>
      </li>
    </ul>
    <hr class="my-3">
    <h4 class="font-semibold text-emerald-700 mb-1">Conseils pratiques</h4>
    <ul class="list-disc ml-5 space-y-1">
      <li><b>Soyez clair et concis</b> : allez à l’essentiel, respectez les limites de mots.</li>
      <li><b>Impact</b> : mettez en avant les bénéfices concrets pour l’environnement et les communautés.</li>
      <li><b>Alignement</b> : cohérence avec les objectifs/priorités FPBG.</li>
      <li><b>Professionnalisme</b> : chiffres sourcés, relecture attentive.</li>
    </ul>
    `,

      // 1 - Objectifs & résultats
      `
    <p class="text-sm mb-2">
      <span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span>
      Objectifs & résultats
    </p>
    <ul class="list-disc ml-5 space-y-1">
      <li><b>Objectifs</b> (<b>≤ 200 mots</b>) : formulez des objectifs <b>SMART</b> (Spécifiques, Mesurables, Atteignables, Réalistes, Temporellement définis).</li>
      <li><b>Résultats attendus</b> (<b>≤ 100 mots</b>) : décrivez les changements <b>mesurables</b>. Exemples d’impacts :
        <ul class="list-disc ml-5">
          <li>Résilience accrue des écosystèmes face aux changements climatiques.</li>
          <li>Amélioration de la qualité de l’eau.</li>
          <li>Stabilisation des berges / réduction de l’érosion.</li>
          <li>Participation communautaire et sensibilisation renforcées.</li>
        </ul>
      </li>
      <li><b>Durée estimée</b> : indiquez une durée réaliste (<i>ex.</i> <b>12 mois</b>).</li>
    </ul>
    <hr class="my-3">
    <h4 class="font-semibold text-emerald-700 mb-1">Conseils pratiques</h4>
    <ul class="list-disc ml-5 space-y-1">
      <li>Évitez les généralités ; reliez objectifs ↔ résultats ↔ indicateurs.</li>
      <li>Vérifiez la cohérence avec le calendrier et le budget.</li>
    </ul>
    `,

      // 2 - Activités & calendrier
      `
    <p class="text-sm mb-2">
      <span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span>
      Activités & calendrier
    </p>
    <ul class="list-disc ml-5 space-y-1">
      <li><b>Activités principales</b> (<b>≤ 200 mots</b>) : décrivez les grandes lignes qui mènent aux résultats.</li>
      <li><b>Calendrier d’exécution</b> : planifiez les périodes <b>début/fin</b> par activité (mois).</li>
      <li><b>Exemples d’activités</b> :
        <ul class="list-disc ml-5">
          <li>Cartographie détaillée des zones de sensibilité (diagnostic, analyse des sols).</li>
          <li>Conception/planification d’<b>ingénierie écologique</b> (fascines, enrochements végétalisés, etc.).</li>
          <li>Plantation d’espèces <b>indigènes</b> adaptées.</li>
          <li>Mise en place de <b>suivi écologique</b> (qualité de l’eau, inventaires d’espèces).</li>
          <li>Actions de <b>sensibilisation</b> et d’engagement communautaire.</li>
        </ul>
      </li>
    </ul>
    <div class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
      Assurez-vous que les activités respectent la <b>liste d’exclusion</b> FPBG (pas d’activités non éligibles).
    </div>
    <hr class="my-3">
    <h4 class="font-semibold text-emerald-700 mb-1">Conseils pratiques</h4>
    <ul class="list-disc ml-5 space-y-1">
      <li>La charge de travail et la durée doivent rester réalistes.</li>
      <li>Reliez chaque activité à au moins un résultat attendu.</li>
    </ul>
    `,

      // 3 - Risques
      `
    <p class="text-sm mb-2">
      <span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span>
      Risques
    </p>
    <ul class="list-disc ml-5 space-y-1">
      <li>Identifiez les risques <b>techniques</b>, <b>environnementaux</b>, <b>sociaux</b> et <b>politiques</b> liés au projet.</li>
      <li>Décrivez, pour chacun, des <b>mesures d’évitement</b> ou <b>d’atténuation</b> concrètes (qui fait quoi, quand).</li>
    </ul>
    <hr class="my-3">
    <h4 class="font-semibold text-emerald-700 mb-1">Conseils pratiques</h4>
    <ul class="list-disc ml-5 space-y-1">
      <li>Priorisez les risques majeurs et surveillables ; restez spécifique.</li>
    </ul>
    `,

      // 4 - Budget estimatif
      `
    <p class="text-sm mb-2">
      <span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span>
      Budget estimatif
    </p>
    <ul class="list-disc ml-5 space-y-1">
      <li>Présentez une estimation réaliste par <b>grandes rubriques</b> :
        <ul class="list-disc ml-5">
          <li><b>Activités de terrain</b> : Coûts directement liés à l'exécution des activités sur le terrain (missions, matériel d'intervention, main-d'œuvre terrain, etc.)</li>
          <li><b>Investissements</b> : Acquisitions durables (équipements, infrastructures, matériel technique qui reste après le projet)</li>
          <li><b>Fonctionnement</b> : Frais récurrents de gestion courante (bureau, communication, consommables administratifs, assurances, etc.)</li>
        </ul>
      </li>
      <li>Indiquez les <b>cofinancements</b> éventuels (organisation, communautés, bailleurs A/B), en <b>numéraire</b> ou <b>en nature</b>.</li>
      <li>Les <b>frais indirects</b> (coûts institutionnels) doivent être <b>≤ 10 %</b> du budget total.</li>
    </ul>

    <hr class="my-3">
    <h4 class="font-semibold text-blue-700 mb-2">📘 Lexique des termes budgétaires</h4>
    <div class="bg-blue-50 border border-blue-200 rounded p-3 space-y-2 text-xs">
      <div>
        <span class="font-semibold text-blue-900">Cofin (Cofinanceur)</span> : Partenaire financier qui contribue au projet en complément du FPBG.
        Peut être votre organisation, une autre ONG, un bailleur international, une collectivité locale, ou même la communauté bénéficiaire.
      </div>
      <div>
        <span class="font-semibold text-blue-900">Contribution en numéraire</span> : Apport financier direct en argent (virements, espèces, chèques).
      </div>
      <div>
        <span class="font-semibold text-blue-900">Contribution en nature</span> : Apport non-monétaire valorisé en argent.
        Exemples : mise à disposition de personnel, locaux, véhicules, équipements, bénévolat communautaire, dons de matériaux.
      </div>
      <div>
        <span class="font-semibold text-blue-900">Budget total (ou coût total du projet)</span> :
        Somme de TOUTES les sources de financement : Financement FPBG demandé + Cofinancements (numéraire + nature).
      </div>
      <div>
        <span class="font-semibold text-blue-900">Frais directs</span> : Coûts directement imputables aux activités du projet (salaires équipe projet, matériel, transport terrain, ateliers, etc.).
      </div>
      <div>
        <span class="font-semibold text-blue-900">Frais indirects (ou coûts institutionnels)</span> :
        Coûts de structure partagés entre plusieurs projets (direction générale, comptabilité centrale, loyer siège, électricité, téléphone général).
        <b>Maximum 10% du budget total</b> pour le FPBG.
      </div>
      <div>
        <span class="font-semibold text-blue-900">Ligne budgétaire</span> : Poste de dépense spécifique dans votre tableau (ex: "Salaire Coordinateur projet", "Location véhicule 4x4", "Achat plants forestiers").
      </div>
      <div>
        <span class="font-semibold text-blue-900">Justification des coûts</span> : Explication de la méthode de calcul et des tarifs utilisés.
        Exemples : "Devis fournisseur", "Grille salariale nationale", "Tarif marché local", "Expérience projets similaires".
      </div>
      <div>
        <span class="font-semibold text-blue-900">Chronogramme financier</span> : Répartition des dépenses dans le temps (mois par mois ou trimestre par trimestre),
        permettant de planifier les décaissements et le suivi financier.
      </div>
    </div>

    <hr class="my-3">
    <h4 class="font-semibold text-emerald-700 mb-1">Conseils pratiques</h4>
    <ul class="list-disc ml-5 space-y-1">
      <li>Restez synthétique ici ; gardez le détail en annexe "Budget détaillé".</li>
      <li>Assurez la cohérence <b>Activités ↔ Budget</b> et justifiez les montants clés.</li>
      <li><b>Détaillez les cofinancements</b> : pour chaque cofinanceur, précisez le nom, le montant, le type (numéraire/nature) et le statut (confirmé/en attente/potentiel).</li>
      <li><b>Valorisez correctement les contributions en nature</b> : utilisez des tarifs réalistes et documentés (ex: tarif horaire du bénévolat selon grille nationale).</li>
      <li><b>Exemple de structure de budget détaillé</b> :
        <ul class="list-disc ml-5 text-xs">
          <li>Colonne 1 : Ligne budgétaire (description précise)</li>
          <li>Colonne 2 : Unité (jour, mois, unité, forfait, etc.)</li>
          <li>Colonne 3 : Quantité</li>
          <li>Colonne 4 : Coût unitaire (FCFA)</li>
          <li>Colonne 5 : Total ligne (FCFA)</li>
          <li>Colonne 6 : Source de financement (FPBG / Cofin A / Cofin B / Organisation)</li>
          <li>Colonne 7 : Justification / Référence</li>
        </ul>
      </li>
    </ul>
    `,

      // 5 - État & financement
      `
    <p class="text-sm mb-2">
      <span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span>
      État d’avancement & financement
    </p>
    <ul class="list-disc ml-5 space-y-1">
      <li><b>Stade de développement</b> : Conception, Démarrage, Avancé, Phase finale.</li>
      <li><b>Financements</b> : précisez si vous avez déjà demandé/obtenu des financements ; indiquez bailleur(s), montants et statuts.</li>
    </ul>
    <hr class="my-3">
    <h4 class="font-semibold text-emerald-700 mb-1">Conseils pratiques</h4>
    <ul class="list-disc ml-5 space-y-1">
      <li>Transparence sur l’historique des demandes et la complémentarité des sources.</li>
    </ul>
    `,

      // 6 - Durabilité & réplication
      `
    <p class="text-sm mb-2">
      <span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span>
      Durabilité & potentiel de réplication
    </p>
    <ul class="list-disc ml-5 space-y-1">
      <li><b>Durabilité</b> : que ferez-vous pour que les effets positifs perdurent après la fin du projet ? (gouvernance, maintenance, capacités locales, coûts récurrents)</li>
      <li><b>Réplication au Gabon</b> : dans quelles conditions le projet peut-il être reproduit ailleurs ? (pré-requis, partenaires, budget indicatif)</li>
    </ul>
    <hr class="my-3">
    <h4 class="font-semibold text-emerald-700 mb-1">Conseils pratiques</h4>
    <ul class="list-disc ml-5 space-y-1">
      <li>Restez concret : mécanismes, responsabilités et calendrier post-projet.</li>
    </ul>
    `,

      // 7 - Annexes
      `
    <p class="text-sm mb-2">
      <span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span>
      Annexes
    </p>
    <p class="text-sm">Téléversez les pièces demandées (PDF uniquement). <span class="text-xs text-slate-500">Hors pagination des 5 pages.</span></p>
    <ol class="list-decimal ml-5 space-y-0.5 text-sm">
      <li>Lettre de motivation</li>
      <li>Statuts & règlement / Agrément / Récépissé (selon type d’organisme)</li>
      <li>Fiche circuit (PME/PMI/Startup, si applicable)</li>
      <li>CV du porteur et des responsables techniques</li>
      <li>Budget détaillé (tableur)</li>
      <li>Chronogramme (Gantt mensuel)</li>
      <li>Cartographie / relevés techniques (si pertinent)</li>
      <li>Lettres de soutien / engagements partenaires (optionnel)</li>
    </ol>
    `,

      // 8 - Récapitulatif
      `
    <p class="text-sm mb-2">
      <span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Guide</span>
      Récapitulatif & contrôle qualité
    </p>
    <ul class="list-disc ml-5 space-y-1">
      <li>Vérifiez la <b>cohérence</b> <i>Objectifs ↔ Activités ↔ Résultats ↔ Budget ↔ Calendrier</i>.</li>
      <li>Relisez, corrigez, et confirmez le <b>respect des limites de mots</b>.</li>
      <li>Confirmez la conformité aux <b>priorités FPBG</b> et à la <b>liste d’exclusion</b>.</li>
    </ul>
    `,
    ];

    // Bloc "Sélection des dossiers" (extraits page 3)
    const conseils = guides.map(
      () => `
    <h4 class="font-semibold text-emerald-700 mb-1">Sélection des dossiers</h4>
    <ul class="list-disc ml-5 space-y-1">
      <li>La <b>fiche d’évaluation</b> utilisée par le FPBG est disponible (voir lien officiel).</li>
      <li>Après analyse/évaluation, les projets sont classés par <b>ordre de priorité</b> par le Comité Technique.</li>
      <li>Si plusieurs projets sont <b>identiques</b>, le Comité Technique se réserve le droit de <b>rejeter</b> ou de <b>reporter</b> leur financement selon ses critères de priorisation.</li>
    </ul>
  `
    );

    this.guideHtml = guides.map((g) => this.sanitize(g));
    this.conseilsHtml = conseils.map((c) => this.sanitize(c));
  }

  /* ==============================
     Accès pratiques pour le template
     ============================== */
  get activityGroups(): FormGroup[] {
    return this.activities.controls as FormGroup[];
  }
  get riskGroups(): FormGroup[] {
    return this.risks.controls as FormGroup[];
  }
  subArray(i: number): FormArray<FormGroup> {
    return this.activities.at(i).get('subs') as FormArray<FormGroup>;
  }
  getSubGroups(i: number): FormGroup[] {
    return this.subArray(i).controls as FormGroup[];
  }

  /* ==============================
     GANTT (SVG) — Vue par MOIS
     ============================== */
  private parseDate(v: any): Date | null {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  private startOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }
  private addDays(d: Date, n: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }
  private diffDays(a: Date, b: Date) {
    return Math.max(
      0,
      Math.round((this.startOfDay(b).getTime() - this.startOfDay(a).getTime()) / 86400000)
    );
  }
  private startOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  private addMonths(d: Date, n: number) {
    const x = new Date(d);
    x.setMonth(x.getMonth() + n);
    return x;
  }
  private monthDiff(a: Date, b: Date) {
    return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  }
  private monthShort(d: Date) {
    return d.toLocaleString(undefined, { month: 'short' });
  }

  private readActivities(): Array<{ title: string; start: Date; end: Date; subs: number }> {
    const items: Array<{ title: string; start: Date; end: Date; subs: number }> = [];
    const groups = this.activities.controls as FormGroup[];
    for (const g of groups) {
      const title = String(g.get('title')?.value || '').trim();
      const s = this.parseDate(g.get('start')?.value);
      const e = this.parseDate(g.get('end')?.value);
      if (!title || !s || !e) continue;
      const subs = (g.get('subs') as FormArray<FormGroup>)?.length || 0;
      items.push({ title, start: s, end: e, subs });
    }
    return items;
  }

  private computeSpan(items: { start: Date; end: Date }[]) {
    if (!items.length) return null;
    let min = items[0].start,
      max = items[0].end;
    for (const it of items) {
      if (it.start < min) min = it.start;
      if (it.end > max) max = it.end;
    }
    min = this.startOfMonth(min);
    max = this.addMonths(this.startOfMonth(max), 1);
    return { min, max };
  }

  private computePxPerMonth(units: number, leftLabelsW: number): number {
    const vw = Math.max(360, (window as any)?.innerWidth || 1024);
    const containerGuess = Math.min(1280, vw - 64);
    const free = Math.max(300, containerGuess - leftLabelsW - 40);
    const ideal = Math.floor(free / Math.max(1, units));
    return Math.max(28, Math.min(72, ideal));
  }

  public ganttSvg(): SafeHtml {
    const acts = this.readActivities();
    if (!acts.length) {
      return this.sanitizer.bypassSecurityTrustHtml(
        `<div class="p-6 text-sm text-slate-500">Ajoute au moins une activité avec des dates pour voir le diagramme.</div>`
      );
    }
    const span = this.computeSpan(acts);
    if (!span) return this.sanitizer.bypassSecurityTrustHtml('');

    const { min, max } = span;
    const units =
      this.monthDiff(this.startOfMonth(min), this.startOfMonth(this.addDays(max, -1))) + 1;

    // métriques & couleurs
    const leftLabelsW = 300;
    const pxPerUnit = this.computePxPerMonth(units, leftLabelsW);
    const rowH = 36,
      gap = 8,
      headYearH = 26,
      headMonthH = 26;
    const topH = headYearH + headMonthH;

    const strokeGrid = '#CBD5E1';
    const strokeGridLight = '#E2E8F0';
    const headBg = '#F8FAFC';
    const textHead = '#334155';
    const textBody = '#0f172a';
    const subBullet = '#94a3b8';
    const barA = '#10b981';
    const barB = '#059669';

    const width = leftLabelsW + units * pxPerUnit + 40;
    const height = topH + acts.length * (rowH + gap) + 20;

    type YearSpan = { year: number; startU: number; count: number };
    const years: YearSpan[] = [];
    for (let u = 0; u < units; u++) {
      const d = this.addMonths(min, u);
      const y = d.getFullYear();
      const last = years[years.length - 1];
      if (!last || last.year !== y) years.push({ year: y, startU: u, count: 1 });
      else last.count++;
    }
    const headParts: string[] = [];
    years.forEach((s) => {
      const x0 = leftLabelsW + s.startU * pxPerUnit;
      const w = s.count * pxPerUnit;
      const cx = x0 + w / 2;
      headParts.push(`
      <rect x="${x0}" y="0" width="${w}" height="${headYearH}" fill="${headBg}" />
      <text x="${cx}" y="${
        headYearH - 8
      }" font-size="12" font-weight="700" fill="${textHead}" text-anchor="middle">${s.year}</text>
    `);
    });

    for (let u = 0; u < units; u++) {
      const x = leftLabelsW + u * pxPerUnit + 0.5;
      const d = this.addMonths(min, u);
      headParts.push(`
      <rect x="${
        x - 0.5
      }" y="${headYearH}" width="${pxPerUnit}" height="${headMonthH}" fill="${headBg}" />
      <line x1="${x}" y1="${headYearH}" x2="${x}" y2="${height}" stroke="${strokeGridLight}" />
      <text x="${x + pxPerUnit / 2}" y="${
        headYearH + headMonthH - 8
      }" font-size="11" fill="${textHead}" text-anchor="middle">${this.monthShort(d)}</text>
    `);
    }
    const lastX = leftLabelsW + units * pxPerUnit + 0.5;
    headParts.push(
      `<line x1="${lastX}" y1="${headYearH}" x2="${lastX}" y2="${height}" stroke="${strokeGrid}" />`
    );

    const hLines: string[] = [];
    for (let r = 0; r <= acts.length; r++) {
      const y = topH + r * (rowH + gap) - (r ? gap / 2 : 0);
      hLines.push(
        `<line x1="${leftLabelsW}" y1="${y}" x2="${
          leftLabelsW + units * pxPerUnit
        }" y2="${y}" stroke="${strokeGrid}" />`
      );
    }

    const rows: string[] = [];
    acts.forEach((a, idx) => {
      const y = topH + idx * (rowH + gap);
      const bullets = a.subs
        ? `<tspan dx="8" fill="${subBullet}" font-size="11">• x${a.subs} sous-activit${
            a.subs > 1 ? 'és' : 'é'
          }</tspan>`
        : '';
      rows.push(
        `<text x="12" y="${y + rowH / 2 + 4}" font-size="13" fill="${textBody}">${this.escapeXml(
          a.title
        )}${bullets}</text>`
      );

      const s0 = this.startOfMonth(a.start);
      const e0 = this.startOfMonth(a.end);
      const startUnit = Math.max(0, this.monthDiff(this.startOfMonth(min), s0));
      const endUnit = Math.max(
        startUnit + 1,
        this.monthDiff(this.startOfMonth(min), this.addMonths(e0, 1))
      );

      const x = leftLabelsW + startUnit * pxPerUnit + 1;
      const w = Math.max(10, (endUnit - startUnit) * pxPerUnit - 2);
      const fill = idx % 2 === 0 ? barA : barB;

      const daysLen = Math.max(1, this.diffDays(a.start, a.end) + 1);
      rows.push(`
      <rect x="${x}" y="${y + 6}" rx="6" ry="6" width="${w}" height="${
        rowH - 12
      }" fill="${fill}" opacity="0.96"></rect>
      <text x="${x + 8}" y="${y + rowH / 2 + 4}" font-size="12" fill="white">${daysLen} j</text>
    `);
    });

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"
         style="display:block; max-width:100%;">
      <rect x="0" y="0" width="${width}" height="${height}" fill="white" />

      <rect x="0" y="0" width="${leftLabelsW}" height="${topH}" fill="${headBg}" />
      <text x="12" y="${
        headYearH + headMonthH - 8
      }" font-size="12" font-weight="600" fill="${textHead}">Activités</text>
      <line x1="${leftLabelsW + 0.5}" y1="0" x2="${
      leftLabelsW + 0.5
    }" y2="${height}" stroke="${strokeGrid}" />

      ${headParts.join('')}
      ${hLines.join('')}
      ${rows.join('')}

      <rect x="0.5" y="0.5" width="${width - 1}" height="${
      height - 1
    }" fill="none" stroke="${strokeGrid}"/>
    </svg>
    `;
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  private escapeXml(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  protected readonly Math = Math;
}
