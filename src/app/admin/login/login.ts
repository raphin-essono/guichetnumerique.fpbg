import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { take } from 'rxjs';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/auth.service';
import { LoginVM } from '../../model/loginvm';
import { Authentifcationservice } from '../../services/auth/authentifcationservice';

@Component({
  selector: 'app-user-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, HttpClientModule],
  templateUrl: './login.html',
  providers: [Authentifcationservice],
})
export class Login {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(AuthService);
  private authenticationService = inject(Authentifcationservice);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.minLength(3)]],
    motDePasse: ['', [Validators.required, Validators.minLength(6)]],
  });

  loading = false;

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const loginVM: LoginVM = {
      email: this.form.value.email!,
      motDePasse: this.form.value.motDePasse!,
    };

    this.authenticationService
      .login(loginVM)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          console.log('✅ Connexion admin réussie - Statut HTTP:', response.status);
          console.log('✅ Données utilisateur:', response.body);

          if (response.body) {
            const { token, user, type, role, redirectTo } = response.body;

            console.log('✅ Token stocké:', token);
            console.log('✅ Utilisateur:', user?.email || user?.nomUtilisateur);
            console.log('✅ Type utilisateur:', type);
            console.log('✅ Rôle utilisateur:', role);

            // Stocker le token et les données utilisateur
            if (token) {
              localStorage.setItem('token', token);
              localStorage.setItem('fpbg.token', token); // Pour compatibilité
            }
            if (user) {
              localStorage.setItem('user', JSON.stringify(user));
            }
            if (type) {
              localStorage.setItem('userType', type);
            }
            if (role) {
              localStorage.setItem('role', role);
            }

            // ✅ Utiliser redirectTo ou déterminer en fonction du rôle
            const targetUrl =
              redirectTo || (role === 'ADMINISTRATEUR' ? '/admin/dashboard' : '/login');
            console.log('🎯 Redirection vers:', targetUrl, '(Rôle:', role, ')');

            this.showSuccessMessage('Connexion réussie');

            // ✅ Redirection immédiate avec un petit délai pour laisser le temps au token d'être stocké
            setTimeout(() => {
              this.router.navigateByUrl(targetUrl).then((success) => {
                if (success) {
                  console.log('✅ Redirection vers', targetUrl, 'réussie');
                } else {
                  console.error('❌ Échec de la redirection vers', targetUrl);
                }
              });
            }, 500);
          }

          this.loading = false;
        },
        error: (err) => {
          console.error('❌ Erreur de connexion admin:', err);
          this.showErrorMessage('Échec de la connexion. Vérifiez vos identifiants.');
          this.loading = false;
        },
      });
  }

  private showSuccessMessage(message: string) {
    const Toast = Swal.mixin({
      toast: true,
      position: 'center',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      iconColor: '#00e8b6',
      color: '#06417d',
    });

    Toast.fire({
      icon: 'success',
      title: message,
    });
  }

  private showErrorMessage(message: string) {
    const Toast = Swal.mixin({
      toast: true,
      position: 'center',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      iconColor: '#ff4444',
      color: '#06417d',
    });

    Toast.fire({
      icon: 'error',
      title: message,
    });
  }
}
