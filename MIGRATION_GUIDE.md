# 🔄 Guide de migration Frontend → Backend

## ❌ Fichiers à SUPPRIMER (logique en local)

Ces fichiers contiennent de la logique métier côté frontend qui est maintenant gérée par le backend :

1. **`src/app/auth/otp.service.ts`** - Génération et vérification d'OTP en local
2. **`src/app/user/core/auth.service.ts`** - Authentification en LocalStorage
3. **`src/app/core/auth.service.ts`** - Doublon du précédent

## ✅ Fichiers à GARDER et UTILISER

Ces fichiers font correctement des appels HTTP au backend :

1. **`src/app/services/auth/authentifcationservice.ts`** ✅
2. **`src/app/services/aprojetv1.ts`** ✅
3. **`src/app/services/organisme/organismeservice.ts`** ✅

---

## 🔧 Modifications nécessaires

### 1. Remplacer le service d'auth dans les composants

**Fichier : `src/app/user/login/login.ts`**

#### ❌ AVANT (avec service local)

```typescript
import { AuthService } from '../core/auth.service'; // LOCAL - MAUVAIS

this.auth.login({ username: contact, password }).subscribe({
  next: () => {
    this.router.navigate(['/dashboard']);
  },
  error: () => {
    this.error.set('Identifiants incorrects.');
  },
});
```

#### ✅ APRÈS (avec service backend)

```typescript
import { Authentifcationservice } from '../../services/auth/authentifcationservice'; // BACKEND - BON

constructor(private authService: Authentifcationservice) {}

this.authService.login({ username: contact, password }).subscribe({
  next: (response) => {
    // Le backend retourne le token et l'utilisateur
    localStorage.setItem('token', response.body.token);
    localStorage.setItem('user', JSON.stringify(response.body.user));
    this.router.navigate(['/dashboard']);
  },
  error: (err) => {
    const errorMessage = err.error?.error || 'Identifiants incorrects.';
    this.error.set(errorMessage);
  }
});
```

---

### 2. Modifier le composant d'inscription

**Fichier : `src/app/user/registration/registration.ts`**

#### ✅ Utiliser le backend pour l'inscription + OTP

```typescript
import { Authentifcationservice } from '../../services/auth/authentifcationservice';

constructor(private authService: Authentifcationservice) {}

onSubmit() {
  if (this.form.invalid) return;

  const orgData = {
    email: this.form.value.email,
    password: this.form.value.password,
    name: this.form.value.nom_organisation,
    contact: this.form.value.contact,
    numTel: this.form.value.phone,
    type: this.form.value.type,
    typeOrganisationId: this.form.value.typeOrganisationId
  };

  this.authService.registerOrganisation(orgData).subscribe({
    next: (response) => {
      // Succès : un OTP a été envoyé par email via le backend
      alert('Inscription réussie ! Vérifiez votre email pour le code OTP.');

      // Sauvegarder l'email pour la page OTP
      localStorage.setItem('pendingEmail', orgData.email);

      // Rediriger vers la page de vérification OTP
      this.router.navigate(['/otp']);
    },
    error: (err) => {
      const errorMessage = err.error?.error || 'Erreur lors de l\'inscription.';
      alert(errorMessage);
    }
  });
}
```

---

### 3. Modifier le composant OTP

**Fichier : `src/app/user/otp/otp.ts`**

#### ✅ Vérifier l'OTP via le backend

```typescript
import { Authentifcationservice } from '../../services/auth/authentifcationservice';

constructor(
  private authService: Authentifcationservice,
  private router: Router
) {}

verifyOtp() {
  const otpCode = this.form.value.otp;
  const email = localStorage.getItem('pendingEmail');

  this.authService.verifyOtp(otpCode).subscribe({
    next: (response) => {
      if (response) {
        alert('Code OTP vérifié avec succès !');
        localStorage.removeItem('pendingEmail');
        this.router.navigate(['/login']);
      } else {
        alert('Code OTP invalide.');
      }
    },
    error: (err) => {
      const errorMessage = err.error?.error || 'Code OTP invalide ou expiré.';
      alert(errorMessage);
    }
  });
}
```

---

### 4. Guards d'authentification

Les guards doivent vérifier l'authentification via le backend.

**Fichier : `src/app/user/core/auth.guard.ts`**

```typescript
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Authentifcationservice } from '../../services/auth/authentifcationservice';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const authGuard = () => {
  const authService = inject(Authentifcationservice);
  const router = inject(Router);

  return authService.isAuthenticated().pipe(
    map(() => true),
    catchError(() => {
      router.navigate(['/login']);
      return of(false);
    })
  );
};
```

---

## 📝 Checklist de migration

- [ ] Supprimer `src/app/auth/otp.service.ts`
- [ ] Supprimer `src/app/user/core/auth.service.ts`
- [ ] Supprimer `src/app/core/auth.service.ts` (si existe)
- [ ] Remplacer tous les imports `AuthService` par `Authentifcationservice`
- [ ] Mettre à jour les composants :
  - [ ] `login.ts`
  - [ ] `registration.ts`
  - [ ] `otp.ts`
- [ ] Mettre à jour les guards :
  - [ ] `auth.guard.ts`
  - [ ] `admin.guard.ts`
- [ ] Ajouter `withCredentials: true` partout
- [ ] Tester l'inscription complète
- [ ] Tester la connexion
- [ ] Tester la vérification OTP

---

## 🧪 Tests à effectuer

### Test 1 : Inscription

1. Remplir le formulaire d'inscription
2. Cliquer sur "S'inscrire"
3. Vérifier que vous recevez un email avec le code OTP

### Test 2 : Vérification OTP

1. Copier le code OTP de l'email
2. Le coller dans le formulaire OTP
3. Vérifier la redirection vers le login

### Test 3 : Connexion

1. Se connecter avec les identifiants
2. Vérifier la redirection vers le dashboard
3. Vérifier que le token est dans les cookies/localStorage

---

## 🎯 Résultat attendu

Après cette migration :

- ✅ Toute la logique d'authentification est côté backend
- ✅ Les OTP sont générés et envoyés par email depuis le backend
- ✅ Les tokens JWT sont sécurisés dans des cookies HttpOnly
- ✅ Plus de logique métier côté frontend
- ✅ Le frontend ne fait que des appels HTTP et affiche les données
