import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// ✅ Validateur personnalisé pour vérifier que les mots de passe correspondent
function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (!password || !confirmPassword) return null;

  return password.value === confirmPassword.value ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  resetToken = signal<string | null>(null);

  form = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator }
  );

  ngOnInit() {
    // Récupérer le token depuis l'URL (/reset-password?token=...)
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.error.set('Lien de réinitialisation invalide ou expiré.');
      return;
    }
    this.resetToken.set(token);
  }

  togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }

  submit() {
    this.error.set(null);
    this.success.set(false);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.resetToken()) {
      this.error.set('Lien de réinitialisation invalide.');
      return;
    }

    this.loading.set(true);
    const { password } = this.form.value as { password: string };

    // ✅ Correction : utiliser urlServer + /api/auth
    this.http
      .post(`${environment.urlServer}/api/auth/reset-password`, {
        token: this.resetToken(),
        newPassword: password,
      })
      .subscribe({
        next: (response: any) => {
          this.loading.set(false);
          this.success.set(true);
          console.log('✅ Mot de passe réinitialisé:', response);

          // Redirection vers le login après 3 secondes
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        },
        error: (err) => {
          this.loading.set(false);
          console.error('❌ Erreur:', err);

          if (err.status === 400) {
            this.error.set('Lien de réinitialisation invalide ou expiré.');
          } else if (err.status === 404) {
            this.error.set('Utilisateur introuvable.');
          } else {
            this.error.set('Une erreur est survenue. Veuillez réessayer.');
          }
        },
      });
  }
}
