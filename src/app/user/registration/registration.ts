import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './registration.html',
})
export class Registration {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(AuthService);

  // état UI
  public step = signal<1 | 2>(1);
  public loading = signal(false);
  public error = signal<string | null>(null);
  public emailAlreadyUsed = signal(false);
  public showPassword = signal(false); // ✅ Toggle pour voir le mot de passe
  public showConfirmPassword = signal(false); // ✅ Toggle pour voir la confirmation

  // listes
  public type = [
    'Secteur privé (PME, PMI, Startups)',
    'ONG et Associations',
    'Coopératives communautaires',
    'Communautés organisées',
    'Entités gouvernementales',
    'Organismes de recherche',
  ];
  public couvertureGeographique = ['Estuaire', 'Ogooué Maritime', 'Nyanga'];
  public typeSubvention = ['Petite subvention', 'Moyenne subvention']; // ⬅️ AJOUT

  // form commun aux 2 étapes
  public form = this.fb.group({
    // ÉTAPE 1 — organisme
    nom_organisation: ['', Validators.required],
    type: ['', Validators.required],
    couvertureGeographique: ['', Validators.required],
    typeSubvention: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telephone: ['', [Validators.required, gabonPhoneValidator()]],

    // ÉTAPE 2 — demandeur + credentials
    prenom: ['', Validators.required],
    nom: ['', Validators.required],
    fonction: [''],
    telephoneContact: ['', [Validators.required, gabonPhoneValidator()]],
    // email: ['', [Validators.required, Validators.email]],
    motDePasse: ['', [Validators.required, Validators.minLength(6)]],
    confirmMotDePasse: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    // Réinitialiser l'erreur d'email quand l'utilisateur modifie le champ
    this.form.controls.email.valueChanges.subscribe(() => {
      if (this.emailAlreadyUsed()) {
        this.emailAlreadyUsed.set(false);
        this.error.set(null);
        // Enlever l'erreur spécifique d'email utilisé
        const errors = this.form.controls.email.errors;
        if (errors && errors['emailUsed']) {
          delete errors['emailUsed'];
          if (Object.keys(errors).length === 0) {
            this.form.controls.email.setErrors(null);
          } else {
            this.form.controls.email.setErrors(errors);
          }
        }
      }
    });
  }

  // Toggle pour afficher/masquer le mot de passe
  public togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }

  // Toggle pour afficher/masquer la confirmation du mot de passe
  public toggleConfirmPasswordVisibility() {
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }

  // passage étape 1 -> 2
  public next() {
    this.error.set(null);
    this.emailAlreadyUsed.set(false);

    // Contrôles réellement présents à l'étape 1
    const step1Ctrls = [
      this.form.controls.nom_organisation,
      this.form.controls.type,
      this.form.controls.couvertureGeographique,
      this.form.controls.email,
      this.form.controls.telephone,
    ];

    // Si typeSubvention existe SUR LE FORMULAIRE, on le valide, sinon on l'ignore
    const typeSubventionCtrl = this.form.get('typeSubvention');
    if (typeSubventionCtrl) step1Ctrls.push(typeSubventionCtrl as any);

    const invalid = step1Ctrls.some((c) => c.invalid);
    if (invalid) {
      step1Ctrls.forEach((c) => c.markAsTouched());
      this.error.set('Veuillez compléter correctement les informations de votre organisation.');
      return;
    }

    // Préremplissage de l'étape 2 si vide
    if (!this.form.controls.email.value) {
      this.form.controls.email.setValue(this.form.controls.email.value as string);
    }
    if (!this.form.controls.telephoneContact.value) {
      this.form.controls.telephoneContact.setValue(this.form.controls.telephone.value as string);
    }

    this.step.set(2);
  }

  // soumission finale → appel backend + OTP
  public submit() {
    this.error.set(null);
    this.emailAlreadyUsed.set(false);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Veuillez compléter tous les champs requis.');
      return;
    }
    if (this.form.value.motDePasse !== this.form.value.confirmMotDePasse) {
      this.error.set('Les mots de passe ne correspondent pas.');
      return;
    }

    this.loading.set(true);

    // 🚀 DÉBOGAGE: Afficher les valeurs du formulaire
    console.log('📋 [FORM DEBUG] Valeurs complètes:', this.form.value);
    console.log('📋 [FORM DEBUG] prenom:', this.form.value.prenom);
    console.log('📋 [FORM DEBUG] nom:', this.form.value.nom);

    // 🎯 Générer personneContact automatiquement depuis prenom + nom
    const personneContact = `${this.form.value.prenom} ${this.form.value.nom}`.trim();
    console.log('📋 [FORM DEBUG] personneContact généré:', personneContact);

    const data = {
      // Organisation
      nom_organisation: this.form.value.nom_organisation!,
      type: this.form.value.type!,
      couvertureGeographique: this.form.value.couvertureGeographique!,
      typeSubvention: this.form.value.typeSubvention!,
      email: this.form.value.email!,
      telephone: this.form.value.telephone!,
      // Utilisateur
      prenom: this.form.value.prenom!,
      nom: this.form.value.nom!,
      personneContact, // 🎯 Généré automatiquement = prenom + nom
      fonction: this.form.value.fonction || '',
      telephoneContact: this.form.value.telephoneContact!,
      // email: this.form.value.email!,
      motDePasse: this.form.value.motDePasse!,
    };

    console.log('🚀 [FRONTEND] Données envoyées au backend:', data);

    // ====================================
    // Appeler le backend pour générer et envoyer l'OTP via Nodemailer
    // ====================================
    this.auth.registerOrganisation(data).subscribe({
      next: (response) => {
        console.log('✅ Registration initié:', response);
        console.log('📧 Email OTP envoyé automatiquement par le backend via Nodemailer');

        // Stocker les infos pour la page OTP
        const pending = {
          data,
          email: response.email,
          expiresAt: Date.now() + 10 * 60 * 1000,
        };

        localStorage.setItem('fpbg.pendingReg', JSON.stringify(pending));
        localStorage.setItem('fpbg.autofillLogin', '1');

        this.loading.set(false);
        this.router.navigate(['/otp'], { queryParams: { email: response.email } });
      },
      error: (err) => {
        this.loading.set(false);
        console.error('❌ Erreur registration:', err);

        // Gestion des erreurs spécifiques
        if (err.status === 409) {
          this.emailAlreadyUsed.set(true);
          this.error.set('Ces identifiants sont déjà utilisés');
          // Marquer le champ email comme invalide pour le mettre en surbrillance
          this.form.controls.email.setErrors({ emailUsed: true });
          // Retourner à l'étape 1 si on est à l'étape 2
          if (this.step() === 2) {
            this.step.set(1);
          }
        } else if (err.status === 400) {
          this.error.set('Données invalides. Vérifiez vos informations.');
        } else {
          this.error.set('Ces identifiants sont deja utilisés. Veuillez réessayer.');
        }
      },
    });
  }
}

// Validation du numéro de téléphone gabonais
// ✅ Formats acceptés :
// - 9 chiffres commençant par 0 : 062897570
// - +241 suivi de 9 chiffres : +241062897570
// - 00241 suivi de 9 chiffres : 00241062897570
// - Format avec espaces/tirets : 06 28 97 570 ou 06-28-97-570
export function gabonPhoneValidator(): ValidatorFn {
  const re = /^(?:0\d{8,9}|\+241\d{8,9}|00241\d{8,9}|0\d{1,2}(?:[ -]?\d{2,3}){2,3})$/;
  return (control: AbstractControl): ValidationErrors | null => {
    const val = (control.value ?? '').toString().trim().replace(/\s+/g, ''); // Enlever espaces
    if (!val) return null; // laisser required() gérer l'absence
    return re.test(val) ? null : { gabonPhone: { valid: false, actual: val } };
  };
}
