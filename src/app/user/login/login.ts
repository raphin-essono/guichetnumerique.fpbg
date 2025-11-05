import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

interface LoginResponse {
  message: string;
  token: string;
  user: any;
  type: 'user' | 'organisation';
  role?: 'UTILISATEUR' | 'ADMINISTRATEUR'; // ✅ Ajout du rôle
  redirectTo?: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(false);
  error = signal<string | null>(null);
  showPassword = signal(false); // ✅ Toggle pour voir le mot de passe

  // Connexion par EMAIL + mot de passe uniquement
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  // ✅ Toggle affichage mot de passe
  togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }

  ngOnInit() {
    // Pré-remplir si on arrive depuis OTP : /login?email=...
    const emailFromQuery = this.route.snapshot.queryParamMap.get('email');
    if (emailFromQuery) this.form.controls.email.setValue(emailFromQuery);

    // Pré-remplir si flag posé après inscription/OTP
    const wantsAutofill = localStorage.getItem('fpbg.autofillLogin') === '1';
    if (wantsAutofill) {
      try {
        const raw = localStorage.getItem('fpbg.pendingReg');
        if (raw) {
          const p = JSON.parse(raw);
          if (p?.data?.email) this.form.controls.email.setValue(p.data.email);
          if (p?.data?.password) this.form.controls.password.setValue(p.data.password);
        }
      } catch {}
    }
  }

  submit() {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { email, password } = this.form.value as { email: string; password: string };

    this.auth.login({ email, motDePasse: password }).subscribe({
      next: (response: any) => {
        this.loading.set(false);
        console.log('✅ Connexion réussie:', response);
        console.log('🔍 Rôle:', response?.role, '- Type:', response?.type);

        // ✅ Redirection basée sur le rôle (prioritaire) puis le type
        let targetUrl = '/dashboard'; // Par défaut

        if (response?.redirectTo) {
          // Si le backend spécifie une redirection, l'utiliser
          targetUrl = response.redirectTo;
        } else if (response?.role === 'ADMINISTRATEUR') {
          // Admin → dashboard admin
          targetUrl = '/admin/dashboard';
        } else if (response?.type === 'organisation') {
          // Organisation → dashboard utilisateur
          targetUrl = '/admin/dashboard';
        } else {
          // Utilisateur simple → dashboard utilisateur
          targetUrl = '/dashboard';
        }

        console.log('🎯 Redirection vers:', targetUrl);

        this.router.navigate([targetUrl]).then((success) => {
          if (success) {
            console.log('✅ Redirection réussie vers', targetUrl);
          } else {
            console.error('❌ Échec de la redirection vers', targetUrl);
          }
        });

        // Nettoyage
        localStorage.removeItem('fpbg.autofillLogin');
        localStorage.removeItem('fpbg.pendingReg');
      },
      error: (err) => {
        this.loading.set(false);
        console.error('❌ Erreur de connexion:', err);

        // Gestion des erreurs spécifiques
        if (err.status === 401) {
          this.error.set('Email ou mot de passe incorrect.');
        } else if (err.status === 409) {
          this.error.set('Compte non vérifié. Vérifiez votre email.');
        } else {
          this.error.set('Erreur de connexion. Email ou mot de passe incorrect.');
        }
      },
    });
  }
}
