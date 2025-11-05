import { CommonModule } from '@angular/common';
import { Component, ElementRef, QueryList, ViewChildren, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { environment } from '../../../environments/environment';
import { SondageApi, CanalSondage, CorpsCreationSondage } from '../api/sondage.api';
import { FenetreSondageComponent } from '../ui/fenetre-sondage/fenetre-sondage.component';

@Component({
  selector: 'app-otp',
  standalone: true,
  imports: [CommonModule, RouterModule, FenetreSondageComponent], // ✅ Ajout du composant de sondage
  templateUrl: './otp.html',
})
export class Otp {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private sondageApi = inject(SondageApi);

  redirectApresSondage = '/soumission'; // URL de redirection après le sondage

  afficherSondage = signal(false);
  envoiSondage = signal(false);
  verificationEnCours = signal(false); // 🔄 État de chargement pour le bouton OTP
  @ViewChildren('otpInput') inputs!: QueryList<ElementRef<HTMLInputElement>>;

  email = signal<string>('');
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  digits = signal<string[]>(['', '', '', '', '', '']);
  counter = signal<number>(60);
  currentOtp = signal<string | null>(null);
  private timerId: any = null;

  ngOnInit() {
    this.email.set(this.route.snapshot.queryParamMap.get('email') ?? '');
    const p = this._getPending();
    if (!p) {
      this.router.navigate(['/register']);
      return;
    }
    this._startTimer();
  }

  // ===== UI handlers =====
  onInput(i: number, ev: Event) {
    const v = (ev.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 1);
    const arr = [...this.digits()];
    arr[i] = v;
    this.digits.set(arr);
    if (v && i < 5) this.inputs.get(i + 1)?.nativeElement.focus();
  }
  onKeyDown(i: number, ev: KeyboardEvent) {
    if (ev.key === 'Backspace' && !this.digits()[i] && i > 0) {
      this.inputs.get(i - 1)?.nativeElement.focus();
    }
  }

  resend() {
    const p = this._getPending();
    if (!p) {
      this.error.set("Session expirée. Veuillez recommencer l'inscription.");
      this.success.set(null);
      return;
    }

    this.error.set(null);
    this.success.set(null);

    // ====================================
    // Appeler le backend pour générer et envoyer un nouveau OTP via Nodemailer
    // ====================================
    this.auth.resendOtp(p.email).subscribe({
      next: (response: any) => {
        console.log('✅ Nouveau OTP généré et envoyé via Nodemailer:', response);

        this.counter.set(60);
        this._startTimer();
        // Mettre à jour l'expiration
        p.expiresAt = Date.now() + 10 * 60 * 1000;
        this._savePending(p);

        // Afficher un message de succès
        this.success.set('Un nouveau code a été envoyé à votre adresse email.');
      },
      error: (err) => {
        console.error('❌ Erreur resend:', err);
        const msg = err.message || '';
        if (msg.includes('Aucune inscription') || msg.includes('en attente')) {
          this.error.set("Session expirée. Veuillez recommencer l'inscription.");
        } else {
          this.error.set('Erreur lors du renvoi du code. Veuillez réessayer.');
        }
      },
    });
  }

  // ===== Vérification + création utilisateur via backend =====
  verify() {
    const code = this.digits().join('');
    const p = this._getPending();
    if (!p) {
      this.error.set('Session expirée.');
      return;
    }
    if (Date.now() > p.expiresAt) {
      this.error.set('Code expiré.');
      return;
    }

    this.error.set(null);
    this.verificationEnCours.set(true); // 🔄 Démarrer l'animation

    // ====================================
    // 🔥 CRITIQUE : Nettoyer TOUS les anciens tokens AVANT la vérification OTP
    // pour s'assurer qu'aucun ancien token ne traîne
    // ====================================
    console.log('🧹 [verify] Nettoyage de tous les anciens tokens...');
    localStorage.removeItem('token');
    localStorage.removeItem('fpbg.token');
    console.log('✅ [verify] Tokens nettoyés, prêt pour la vérification OTP');

    // ====================================
    // Vérifier l'OTP via le backend
    // ====================================
    this.auth.verifyOtp(p.email, code).subscribe({
      next: (response: any) => {
        console.log('✅ OTP vérifié, compte créé - Réponse complète:', response);
        console.log(
          '🔍 Token reçu:',
          response?.token ? response.token.substring(0, 30) + '...' : 'absent'
        );
        console.log('🔍 redirectTo:', response?.redirectTo);

        // ====================================
        // 🔥 CRITIQUE : S'assurer que le NOUVEAU token est bien stocké
        // et remplace complètement l'ancien avant toute autre action
        // ====================================
        if (response?.token) {
          console.log('🔄 [verify] Mise à jour forcée du token dans localStorage...');
          console.log('🔍 [verify] Token complet reçu du backend:', response.token);
          localStorage.setItem('token', response.token);
          localStorage.setItem('fpbg.token', response.token);

          // Vérifier que le token est bien stocké
          const stored = localStorage.getItem('token');
          console.log('✅ [verify] Token stocké - Vérification:', stored?.substring(0, 30) + '...');
          console.log('🔍 [verify] Token match?', stored === response.token ? 'OUI ✅' : 'NON ❌');
        } else {
          console.error('❌ [verify] ERREUR: Aucun token reçu du backend!');
        }

        // Nettoyer le localStorage
        localStorage.removeItem('fpbg.pendingReg');
        localStorage.removeItem('onboarding_done');

        // ====================================
        // 🎯 Arrêter l'animation de vérification
        // ====================================
        this.verificationEnCours.set(false);

        // ====================================
        // 🎯 Décider : Sondage ou Redirection directe
        // ====================================
        const redirectUrl = response?.redirectTo || '/soumission';
        const doitAfficherSondage = !!response?.exigerSondage;
        console.log(`🎯 Configuration sondage:`);
        console.log(`   - environment.activerSondagePostOtp: ${environment.activerSondagePostOtp}`);
        console.log(`   - doitAfficherSondage (backend): ${doitAfficherSondage}`);
        console.log(`   - redirectUrl: ${redirectUrl}`);

        // Donner un peu de temps pour que le DOM se mette à jour
        setTimeout(() => {
          if (environment.activerSondagePostOtp && doitAfficherSondage) {
            console.log('✅ Affichage du sondage ACTIVÉ');
            this.redirectApresSondage = redirectUrl;
            this.afficherSondage.set(true);
            console.log('🔍 Signal afficherSondage:', this.afficherSondage());
          } else {
            console.log('⏭️ Redirection directe vers:', redirectUrl);
            this.router.navigate([redirectUrl]).then((success) => {
              if (!success) this.router.navigate(['/dashboard']);
            });
          }
        }, 300);
      },
      error: (err) => {
        console.error('❌ Erreur verify OTP:', err);
        this.verificationEnCours.set(false); // 🔄 Arrêter l'animation
        const msg = err.message || '';
        if (msg.includes('invalide') || msg.includes('INVALID')) {
          this.error.set('Code OTP invalide.');
        } else if (msg.includes('expiré') || msg.includes('EXPIRED')) {
          this.error.set('Code expiré. Veuillez en demander un nouveau.');
        } else {
          this.error.set('Erreur lors de la vérification.');
        }
      },
    });
  }

  private _goLogin(p: any) {
    localStorage.setItem('fpbg.autofillLogin', '1');
    this.router.navigate(['/login'], { queryParams: { email: p.data?.email || p.email } });
  }

  // ===== helpers =====
  private _getPending(): any {
    try {
      return JSON.parse(localStorage.getItem('fpbg.pendingReg') || '');
    } catch {
      return null;
    }
  }
  private _savePending(p: any) {
    localStorage.setItem('fpbg.pendingReg', JSON.stringify(p));
  }
  private _startTimer() {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      if (this.counter() <= 0) {
        clearInterval(this.timerId);
        this.timerId = null;
        return;
      }
      this.counter.update((v) => v - 1);
    }, 1000);
  }

  // Vérifie si le sondage est requis, l’affiche si besoin, puis redirige.
  private _workflowSondageOuRedirection(redirectUrl: string) {
    if (!environment.activerSondagePostOtp) {
      this._naviguerVers(redirectUrl);
      return;
    }
    const cle = environment.cleQuestionnaireSondage;

    this.sondageApi.verifierSiDejaRepondu(cle).subscribe({
      next: () => this._naviguerVers(redirectUrl),
      error: (err) => {
        console.log('[sondage GET] statut=', err?.status);
        if (err?.status === 404) {
          this.afficherSondage.set(true);
        } else if (err?.status === 401) {
          // 🔁  retry unique (le temps que le token soit bien lisible)
          setTimeout(() => {
            this.sondageApi.verifierSiDejaRepondu(cle).subscribe({
              next: () => this._naviguerVers(redirectUrl),
              error: (err2) => {
                console.log('[sondage GET retry] statut=', err2?.status);
                if (err2?.status === 404) this.afficherSondage.set(true);
                else this._naviguerVers(redirectUrl);
              },
            });
          }, 200);
        } else {
          this._naviguerVers(redirectUrl);
        }
      },
    });
  }

  // Appelée par la modale (événement (valider))
  validerSondage(e: { choixSelectionne: CanalSondage; texteAutre?: string; commentaire?: string }) {
    // 🔥 DEBUG : Vérifier quel token sera utilisé
    const tokenDansLS = localStorage.getItem('token') || localStorage.getItem('fpbg.token');
    console.log(
      '🔍 [validerSondage] Token dans localStorage:',
      tokenDansLS?.substring(0, 30) + '...'
    );
    console.log('🔍 [validerSondage] Données du sondage:', e);

    const corps: CorpsCreationSondage = {
      cleQuestionnaire: environment.cleQuestionnaireSondage,
      choixSelectionne: e.choixSelectionne,
      texteAutre: e.texteAutre,
      commentaire: e.commentaire,
      meta: this._construireMeta(),
    };

    console.log('📤 [validerSondage] Envoi vers API avec corps:', corps);
    this.envoiSondage.set(true);

    this.sondageApi.enregistrerReponse(corps).subscribe({
      next: (response) => {
        console.log('✅ [validerSondage] Succès:', response);
        this.afficherSondage.set(false);
        this.envoiSondage.set(false);
        this._naviguerVers(this.redirectApresSondage);
      },
      error: (err) => {
        console.error('❌ [validerSondage] Erreur:', err);
        console.error('❌ [validerSondage] Status:', err.status);
        console.error('❌ [validerSondage] Message:', err.message);
        // On redirige quand même pour ne pas bloquer l'utilisateur
        this.afficherSondage.set(false);
        this.envoiSondage.set(false);
        this._naviguerVers(this.redirectApresSondage);
      },
    });
  }

  // Navigation sûre avec fallback (réutilise ton comportement actuel)
  private _naviguerVers(url: string) {
    this.router.navigate([url]).then((ok) => {
      if (!ok) this.router.navigate(['/dashboard']);
    });
  }

  // Construire les métadonnées pour le sondage
  private _construireMeta(): Record<string, any> | null {
    try {
      return {
        userAgent: navigator.userAgent,
        language: navigator.language,
        timestamp: new Date().toISOString(),
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    } catch {
      return null;
    }
  }
}
