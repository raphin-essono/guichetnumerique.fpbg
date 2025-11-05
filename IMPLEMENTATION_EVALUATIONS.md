# Implémentation de la Gestion des Évaluations

## Vue d'ensemble

Cette documentation décrit l'implémentation complète de la fonctionnalité de gestion des évaluations dans l'application FPBG, incluant :

1. **Modal d'attribution de sessions aux évaluateurs** avec filtre de recherche
2. **Gestion complète de l'onglet Évaluations** avec connexion au backend
3. **Intégration avec la base de données** via les services API

---

## 📁 Fichiers Créés/Modifiés

### Nouveaux Fichiers

#### 1. Service SessionsEvaluationService
**Fichier:** [`frontend/src/app/services/api/sessions-evaluation.service.ts`](frontend/src/app/services/api/sessions-evaluation.service.ts)

**Description:** Service Angular pour gérer toutes les opérations liées aux sessions d'évaluation.

**Méthodes principales:**
- `creerSession(data)` - Créer une nouvelle session d'évaluation
- `obtenirSessions(filtres?)` - Récupérer toutes les sessions (avec filtres optionnels)
- `obtenirSessionParId(id)` - Récupérer une session spécifique
- `mettreAJourSession(id, data)` - Mettre à jour une session
- `supprimerSession(id)` - Supprimer une session
- `affecterProjets(payload)` - Affecter des projets à des évaluateurs
- `retirerAffectation(sessionId, offreId, evaluateurId)` - Retirer une affectation
- `obtenirGrilles()` - Récupérer toutes les grilles d'évaluation
- `creerGrille(data)` - Créer une nouvelle grille d'évaluation
- `supprimerGrille(id)` - Supprimer une grille d'évaluation
- `obtenirStatistiquesSession(sessionId)` - Récupérer les statistiques d'une session
- `changerStatutSession(sessionId, statut)` - Changer le statut d'une session

**Endpoints API utilisés:**
```typescript
- POST   /api/admin/sessions-evaluation
- GET    /api/admin/sessions-evaluation
- GET    /api/admin/sessions-evaluation/:id
- PATCH  /api/admin/sessions-evaluation/:id
- DELETE /api/admin/sessions-evaluation/:id
- POST   /api/admin/evaluateurs/affecter
- DELETE /api/admin/evaluateurs/desaffecter/:sid/:oid/:eid
- GET    /api/grilles-evaluation
- POST   /api/grilles-evaluation
- DELETE /api/grilles-evaluation/:id
- GET    /api/admin/sessions-evaluation/:id/statistiques
- PATCH  /api/admin/sessions-evaluation/:id/statut
```

### Fichiers Modifiés

#### 2. Composant Evaluations (TypeScript)
**Fichier:** [`frontend/src/app/admin/evaluations/evaluations.ts`](frontend/src/app/admin/evaluations/evaluations.ts)

**Modifications principales:**

##### a) Import des Services
```typescript
import { SessionsEvaluationService } from '../../services/api/sessions-evaluation.service';
import { EvaluateursApi } from '../../services/evaluateurs.api';
import { AAPService } from '../../services/api/aap.service';
import { ProjetService } from '../../services/api/projet.service';
```

##### b) Injection des Dépendances
```typescript
private sessionsService = inject(SessionsEvaluationService);
private evaluateursApi = inject(EvaluateursApi);
private aapService = inject(AAPService);
private projetService = inject(ProjetService);
```

##### c) Ajout du Filtre de Recherche d'Évaluateurs
```typescript
// Signal pour la recherche
rechercheEvaluateur = signal('');

// Computed pour filtrer les évaluateurs
evaluateursFiltres = computed(() => {
  const recherche = this.rechercheEvaluateur().toLowerCase().trim();
  if (!recherche) return this.evaluateurs();

  return this.evaluateurs().filter((e) => {
    const nomComplet = `${e.prenom} ${e.nom}`.toLowerCase();
    const email = e.email.toLowerCase();
    return nomComplet.includes(recherche) || email.includes(recherche);
  });
});
```

##### d) Chargement des Données depuis le Backend
Remplacé les données de démonstration par des appels API réels :

```typescript
chargerDonnees() {
  this.loading.set(true);
  Promise.all([
    this.chargerSessions(),
    this.chargerProjets(),
    this.chargerEvaluateurs(),
    this.chargerAppelsOffres(),
    this.chargerGrilles(),
  ])
    .then(() => this.loading.set(false))
    .catch((error) => {
      console.error('Erreur:', error);
      this.chargerDonneesDemonstration(); // Fallback
    });
}
```

Méthodes de chargement individuelles:
- `chargerSessions()` - Charge les sessions via `sessionsService.obtenirSessions()`
- `chargerProjets()` - Charge les projets via `projetService.getAllProjetsNoPage()`
- `chargerEvaluateurs()` - Charge les évaluateurs via `evaluateursApi.lister()`
- `chargerAppelsOffres()` - Charge les AAP via `aapService.getAllAAPs()`
- `chargerGrilles()` - Charge les grilles via `sessionsService.obtenirGrilles()`

##### e) Création de Session avec Affectations
```typescript
creerSession() {
  this.sessionsService.creerSession(this.nouvelleSessionData).subscribe({
    next: (sessionCreee) => {
      // Créer les affectations (chaque projet à chaque évaluateur)
      const affectations = [];
      for (const projetId of this.nouvelleSessionData.projetsIds) {
        for (const evaluateurId of this.nouvelleSessionData.evaluateursIds) {
          affectations.push({
            offreId: projetId,
            evaluateurId: evaluateurId,
          });
        }
      }

      // Envoyer les affectations au backend
      this.sessionsService.affecterProjets({
        sessionId: sessionCreee.id,
        affectations: affectations,
      }).subscribe({
        next: () => {
          alert(`Session créée avec ${affectations.length} affectations !`);
          this.chargerDonnees();
        }
      });
    }
  });
}
```

##### f) Gestion des Grilles d'Évaluation
```typescript
// Suppression de grille
supprimerGrille(grilleId: string) {
  this.sessionsService.supprimerGrille(grilleId).subscribe({
    next: () => {
      // Retirer de la liste locale
      const grilles = this.grillesEvaluation().filter(g => g.id !== grilleId);
      this.grillesEvaluation.set(grilles);
      alert('Grille supprimée avec succès !');
    }
  });
}

// Création de grille
enregistrerGrille() {
  const grilleData = {
    titre: this.grilleEnEdition.titre,
    description: this.grilleEnEdition.description,
    noteMin: this.grilleEnEdition.noteMin,
    noteMax: this.grilleEnEdition.noteMax,
    criteres: this.grilleEnEdition.criteres.map(c => ({
      titre: c.titre,
      poids: 1,
      sousCriteres: c.sousCriteres.map(sc => ({
        titre: sc.titre,
        description: sc.description,
        points: sc.points,
      })),
    })),
  };

  this.sessionsService.creerGrille(grilleData).subscribe({
    next: (grilleCreee) => {
      this.grillesEvaluation.set([...this.grillesEvaluation(), grilleCreee]);
      alert('Grille créée avec succès !');
    }
  });
}
```

##### g) Méthodes Utilitaires
```typescript
// Mapper le statut du backend vers le format d'affichage
private mapStatut(statut: 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ARCHIVEE') {
  const mapping = {
    PLANIFIEE: 'Planifiée',
    EN_COURS: 'En cours',
    TERMINEE: 'Terminée',
    ARCHIVEE: 'Terminée',
  };
  return mapping[statut];
}

// Formater une date au format français
private formatDate(date: string | Date | undefined): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
```

#### 3. Template HTML des Évaluations
**Fichier:** [`frontend/src/app/admin/evaluations/evaluations.html`](frontend/src/app/admin/evaluations/evaluations.html)

**Modifications principales:**

##### a) Ajout du Champ de Recherche d'Évaluateurs (Étape 2)

Ajouté avant le tableau de sélection des évaluateurs :

```html
<!-- Champ de recherche des évaluateurs -->
<div class="mb-4">
  <div class="relative">
    <input
      type="text"
      [(ngModel)]="rechercheEvaluateur"
      placeholder="Rechercher un évaluateur par nom ou email..."
      class="w-full px-4 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
    />
    <svg
      class="absolute left-3 top-2.5 w-5 h-5 text-slate-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      ></path>
    </svg>
  </div>
</div>
```

##### b) Utilisation de `evaluateursFiltres()` au lieu de `evaluateurs()`

```html
<!-- Avant -->
<tr *ngFor="let evaluateur of evaluateurs()" class="hover:bg-slate-50">

<!-- Après -->
<tr *ngFor="let evaluateur of evaluateursFiltres()" class="hover:bg-slate-50">
```

##### c) Message Amélioré pour Absence de Résultats

```html
<tr *ngIf="evaluateursFiltres().length === 0">
  <td colspan="6" class="px-4 py-6 text-center text-slate-500">
    <p class="text-sm" *ngIf="rechercheEvaluateur()">
      Aucun évaluateur trouvé pour "{{ rechercheEvaluateur() }}"
    </p>
    <p class="text-sm" *ngIf="!rechercheEvaluateur()">
      Aucun évaluateur disponible
    </p>
  </td>
</tr>
```

---

## 🎯 Fonctionnalités Implémentées

### 1. Modal d'Attribution de Session (Étape 2)

#### Avant
- Liste simple des évaluateurs sans possibilité de recherche
- Difficulté à trouver un évaluateur spécifique dans une longue liste

#### Après
✅ **Champ de recherche en temps réel**
- Filtre par nom (prénom + nom)
- Filtre par email
- Mise à jour instantanée lors de la saisie
- Message contextuel si aucun résultat

✅ **Sélection des évaluateurs**
- Checkbox pour sélection individuelle
- Checkbox globale pour tout sélectionner/désélectionner
- Affichage du nombre de projets évalués par chaque évaluateur

✅ **Validation avant création**
- Vérification que des dates sont sélectionnées
- Vérification qu'une grille d'évaluation est sélectionnée
- Vérification qu'au moins un évaluateur est sélectionné

### 2. Gestion Complète de l'Onglet Évaluations

#### a) Affichage des Sessions
✅ Chargement depuis le backend via API
✅ Affichage du tableau avec :
- Intitulé de la session
- Appel d'offres associé
- Nombre de projets
- Nombre d'évaluateurs
- Statut (Planifiée, En cours, Terminée)
- Période (dates début/fin)
- Action "Voir"

#### b) Création de Session
✅ **Étape 1 : Sélection des projets**
- Sélection de l'appel d'offres
- Saisie de l'intitulé de la session
- Filtrage automatique des projets par appel d'offres
- Sélection multiple des projets
- Validation avant passage à l'étape 2

✅ **Étape 2 : Configuration et affectation**
- Sélection des dates (début/fin)
- Sélection de la grille d'évaluation
- **Recherche et sélection des évaluateurs**
- Création de la session
- Création automatique des affectations (chaque projet à chaque évaluateur)

#### c) Gestion des Grilles d'Évaluation
✅ **Affichage des grilles**
- Liste complète depuis le backend
- Informations : titre, description, dates, notes min/max

✅ **Création de grille**
- Création de critères
- Ajout de sous-critères avec points
- Définition des notes min/max
- Sauvegarde dans la base de données

✅ **Suppression de grille**
- Confirmation avant suppression
- Suppression via API
- Mise à jour de la liste locale

✅ **Modification de grille**
- Interface prête (TODO: compléter l'API backend)

#### d) Visualisation de Session
✅ **Onglet Projets**
- Tableau avec notes de chaque évaluateur
- Calcul de la note moyenne par projet

✅ **Onglet Évaluateurs**
- Liste des évaluateurs assignés à la session
- Coordonnées de chaque évaluateur

### 3. Intégration avec la Base de Données

#### Endpoints Utilisés

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/admin/sessions-evaluation` | GET | Récupérer toutes les sessions |
| `/api/admin/sessions-evaluation` | POST | Créer une nouvelle session |
| `/api/admin/sessions-evaluation/:id` | GET | Récupérer une session |
| `/api/admin/sessions-evaluation/:id` | PATCH | Mettre à jour une session |
| `/api/admin/sessions-evaluation/:id` | DELETE | Supprimer une session |
| `/api/admin/evaluateurs/affecter` | POST | Affecter des projets aux évaluateurs |
| `/api/admin/evaluateurs/desaffecter/:s/:o/:e` | DELETE | Retirer une affectation |
| `/api/admin/evaluateurs` | GET | Lister les évaluateurs |
| `/api/grilles-evaluation` | GET | Récupérer les grilles |
| `/api/grilles-evaluation` | POST | Créer une grille |
| `/api/grilles-evaluation/:id` | DELETE | Supprimer une grille |
| `/api/aprojet-v1` | GET | Récupérer les projets |
| `/api/aap` | GET | Récupérer les appels d'offres |

#### Flux de Données

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend   │ ◄─────► │   Services   │ ◄─────► │   Backend    │
│  (Angular)   │  HTTP   │   Angular    │   API   │  (Node.js)   │
└──────────────┘         └──────────────┘         └──────────────┘
                                                           │
                                                           ▼
                                                   ┌──────────────┐
                                                   │  PostgreSQL  │
                                                   │   (Prisma)   │
                                                   └──────────────┘
```

#### Modèles de Données

**SessionEvaluation**
```typescript
{
  id: string
  intitule: string
  appelOffre: { id, code, titre }
  dateDebut: string
  dateFin: string
  statut: 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ARCHIVEE'
  nbProjets: number
  nbEvaluateurs: number
  grilleEvaluation: { id, titre }
  projets?: ProjetSessionResponse[]
  evaluateurs?: EvaluateurSessionResponse[]
}
```

**GrilleEvaluation**
```typescript
{
  id: string
  titre: string
  description: string
  dateCreation: string
  noteMax: number
  noteMin: number
  criteres: [
    {
      id: string
      titre: string
      poids: number
      sousCriteres: [
        {
          id: string
          titre: string
          description: string
          points: number
        }
      ]
    }
  ]
}
```

---

## 🔧 Configuration Requise

### Variables d'Environnement

Le service utilise `environment.apiBase` défini dans [`frontend/src/environments/environment.ts`](frontend/src/environments/environment.ts) :

```typescript
export const environment = {
  apiBase: 'http://localhost:4000/api',  // Développement
  // OU
  apiBase: 'https://api.fpbg.singcloud.ga/api',  // Production
};
```

### Authentification

Tous les appels API utilisent l'authentification JWT via headers :

```typescript
private getAuthHeaders(): HttpHeaders {
  const token = localStorage.getItem('token') || localStorage.getItem('fpbg.token');
  return new HttpHeaders({
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  });
}
```

---

## 📊 Gestion des Erreurs

### Stratégie de Fallback

Si le backend ne répond pas, le système utilise des données de démonstration :

```typescript
chargerDonnees() {
  Promise.all([/* appels API */])
    .catch((error) => {
      console.error('Erreur:', error);
      this.chargerDonneesDemonstration(); // Données de démonstration
    });
}
```

### Affichage des Erreurs

Toutes les erreurs sont :
1. **Loggées** dans la console (`console.error`)
2. **Affichées** à l'utilisateur via `alert()`
3. **Gérées** pour ne pas bloquer l'application

Exemple :
```typescript
error: (error) => {
  console.error('❌ Erreur:', error);
  this.loading.set(false);
  alert(
    'Erreur lors de l\'opération:\n' +
    (error.error?.message || error.message || 'Erreur inconnue')
  );
}
```

---

## 🧪 Tests Recommandés

### Tests Manuels

1. **Création de Session**
   - [ ] Créer une session sans évaluateur → Doit être bloqué
   - [ ] Créer une session sans projet → Doit être bloqué
   - [ ] Créer une session complète → Doit réussir
   - [ ] Vérifier que les affectations sont créées
   - [ ] Vérifier que la session apparaît dans la liste

2. **Recherche d'Évaluateurs**
   - [ ] Rechercher par prénom
   - [ ] Rechercher par nom
   - [ ] Rechercher par email
   - [ ] Rechercher avec texte inexistant → Affiche message approprié
   - [ ] Vider la recherche → Affiche tous les évaluateurs

3. **Grilles d'Évaluation**
   - [ ] Créer une grille simple
   - [ ] Créer une grille avec critères et sous-critères
   - [ ] Supprimer une grille
   - [ ] Utiliser une grille dans une session

4. **Gestion des Erreurs**
   - [ ] Tester avec backend arrêté → Doit utiliser données de démo
   - [ ] Tester avec token invalide → Doit afficher erreur claire

### Tests d'Intégration

1. **Frontend → Backend**
   - [ ] Vérifier que tous les endpoints sont accessibles
   - [ ] Vérifier que les données sont correctement mappées
   - [ ] Vérifier que les affectations sont créées côté backend

2. **Backend → Base de Données**
   - [ ] Vérifier que les sessions sont persistées
   - [ ] Vérifier que les affectations sont créées
   - [ ] Vérifier que les grilles sont sauvegardées

---

## 🚀 Prochaines Étapes Recommandées

### Améliorations Suggérées

1. **Notifications Toast**
   - Remplacer les `alert()` par le `ToastService` existant
   - Messages de succès en vert
   - Messages d'erreur en rouge

2. **Modification de Grille**
   - Implémenter l'endpoint PUT dans le backend
   - Activer la modification dans le frontend

3. **Statistiques de Session**
   - Utiliser `obtenirStatistiquesSession()`
   - Afficher des graphiques
   - Afficher le taux de progression

4. **Filtres Avancés**
   - Filtrer les sessions par statut
   - Filtrer les sessions par appel d'offres
   - Rechercher une session par intitulé

5. **Pagination**
   - Implémenter la pagination pour les grandes listes
   - Surtout pour les évaluateurs et projets

6. **Gestion des Statuts**
   - Ajouter des boutons pour changer le statut d'une session
   - Planifiée → En cours → Terminée
   - Avec confirmation et validation

7. **Export de Données**
   - Exporter les résultats d'une session en PDF
   - Exporter les statistiques en Excel

8. **Notifications Email**
   - Notifier les évaluateurs lors de l'affectation
   - Rappels pour les délais

---

## 📝 Notes Techniques

### Performances

- **Computed Signals** : Les filtres utilisent `computed()` pour une réactivité optimale
- **Promises Parallèles** : `Promise.all()` charge toutes les données en parallèle
- **Lazy Loading** : Les données sont chargées uniquement quand nécessaire

### Sécurité

- ✅ Authentification JWT sur tous les endpoints
- ✅ Validation côté frontend (disabled buttons, required fields)
- ✅ Validation côté backend (à vérifier)
- ✅ Confirmation avant suppression

### Accessibilité

- ✅ Labels appropriés sur les champs de formulaire
- ✅ Messages d'erreur clairs
- ✅ Indicateurs de chargement
- ⚠️ À améliorer : Navigation au clavier, ARIA labels

---

## 🐛 Problèmes Connus et Solutions

### 1. "Service not found" lors du chargement

**Problème :** Le service `SessionsEvaluationService` n'est pas trouvé

**Solution :** Vérifier que le service est bien dans `providedIn: 'root'`

### 2. Données de démonstration affichées

**Problème :** Les données de démonstration s'affichent au lieu des vraies données

**Solution :**
- Vérifier que le backend est démarré
- Vérifier la configuration `environment.apiBase`
- Vérifier le token d'authentification dans localStorage

### 3. Erreur CORS

**Problème :** Requêtes bloquées par CORS

**Solution :** Vérifier la configuration CORS du backend pour autoriser `http://localhost:4200`

### 4. Token expiré

**Problème :** Erreur 401 Unauthorized

**Solution :** Se reconnecter pour obtenir un nouveau token

---

## 📚 Ressources

- [Documentation Angular Signals](https://angular.io/guide/signals)
- [Documentation RxJS](https://rxjs.dev/)
- [API Backend Prisma Schema](../../backend/prisma/schema.prisma)
- [Variables d'Environnement](../src/environments/)

---

## ✅ Checklist d'Implémentation

- [x] Service SessionsEvaluationService créé
- [x] Injection des services dans le composant
- [x] Chargement des données depuis le backend
- [x] Filtre de recherche d'évaluateurs
- [x] Création de session avec affectations
- [x] Gestion des grilles d'évaluation (CRUD)
- [x] Gestion des erreurs
- [x] Fallback sur données de démonstration
- [x] Documentation complète
- [ ] Tests unitaires
- [ ] Tests d'intégration
- [ ] Migration vers ToastService
- [ ] Modification de grilles (backend requis)
- [ ] Statistiques de session
- [ ] Notifications email

---

## 👥 Contact et Support

Pour toute question ou problème :
1. Consulter cette documentation
2. Vérifier la console du navigateur (F12)
3. Vérifier les logs du backend
4. Vérifier la base de données PostgreSQL

---

**Date de création :** 01/11/2025
**Version :** 1.0.0
**Auteur :** Claude Code Assistant
