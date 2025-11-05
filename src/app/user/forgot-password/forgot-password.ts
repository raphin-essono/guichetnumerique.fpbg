import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit() {
    this.error.set(null);
    this.success.set(false);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { email } = this.form.value as { email: string };

    // ✅ Correction : ajouter /api/auth au lieu de juste /auth
    this.http.post(`${environment.urlServer}/api/auth/forgot-password`, { email }).subscribe({
      next: (response: any) => {
        this.loading.set(false);
        this.success.set(true);
        console.log('✅ Email de réinitialisation envoyé:', response);

        // Redirection après 3 secondes
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (err) => {
        this.loading.set(false);
        console.error('❌ Erreur:', err);

        if (err.status === 404) {
          this.error.set('Aucun compte trouvé avec cet email.');
        } else if (err.status === 429) {
          this.error.set('Trop de tentatives. Veuillez réessayer dans quelques minutes.');
        } else {
          this.error.set('Une erreur est survenue. Veuillez réessayer.');
        }
      },
    });
  }
}
