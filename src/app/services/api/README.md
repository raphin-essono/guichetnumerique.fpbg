# Guide d'utilisation des services API

Ce dossier contient tous les services pour interagir avec le backend FPBG.

## Services disponibles

### 1. AAPService - Appels à Projets
**Fichier:** `aap.service.ts`

```typescript
import { AAPService } from './services/api/aap.service';

// Dans votre composant
export class MonComposant {
  constructor(private aapService: AAPService) {}

  async chargerAAPs() {
    // Récupérer tous les AAPs actifs
    const aaps = await this.aapService.getAllAAPs();

    // Récupérer un AAP par ID
    const aap = await this.aapService.getAAPById('id-here');

    // Récupérer un AAP par code
    const aapByCode = await this.aapService.getAAPByCode('AAP-2025-001');

    // Créer un AAP (admin seulement)
    const newAAP = await this.aapService.createAAP({
      code: 'AAP-2025-001',
      titre: 'Mon AAP',
      resume: 'Résumé...',
      contexte: 'Contexte...',
      objectif: 'Objectif...',
      contactEmail: 'contact@fpbg.sn',
      geographicEligibility: ['Dakar', 'Thiès'],
      eligibleOrganisations: ['ONG', 'PME'],
      eligibleActivities: ['Agriculture', 'Santé'],
      annexes: [],
      launchDate: '2025-01-01',
      tags: ['santé', 'développement']
    });

    // Activer/Désactiver un AAP
    await this.aapService.toggleAAPStatus('id-here');

    // Récupérer les types d'organisations
    const types = await this.aapService.getAllTypeOrganisations();
  }
}
```

### 2. ProjetService - Gestion des projets
**Fichier:** `projet.service.ts`

```typescript
import { ProjetService } from './services/api/projet.service';

// Dans votre composant
export class MonComposant {
  constructor(private projetService: ProjetService) {}

  async gererProjets() {
    // Récupérer tous les projets (avec pagination)
    const projets = await this.projetService.getAllProjets(0, 10);

    // Récupérer le projet de l'utilisateur connecté
    const monProjet = await this.projetService.getProjetByUser();

    // Créer un nouveau projet
    const newProjet = await this.projetService.createProjet({
      title: 'Mon projet',
      objP: 'Objectif du projet',
      conjP: 'Contexte et justification',
      actPrin: 'Activités principales',
      rAtt: 'Résultats attendus',
      stade: 'BROUILLON'
    });

    // Mettre à jour un projet
    await this.projetService.updateProjet('id-here', {
      title: 'Titre mis à jour',
      stade: 'SOUMIS'
    });

    // Supprimer un projet
    await this.projetService.deleteProjet('id-here');
  }

  // Exemple avec upload de fichiers
  async soumettreProjetAvecFichiers(formData: any, files: any) {
    const projet = await this.projetService.createProjet(formData, files);
    console.log('Projet créé:', projet);
  }
}
```

### 3. OrganisationService - Gestion des organisations
**Fichier:** `organisation.service.ts`

```typescript
import { OrganisationService } from './services/api/organisation.service';

// Dans votre composant
export class MonComposant {
  constructor(private orgService: OrganisationService) {}

  async gererOrganisations() {
    // Récupérer l'organisation connectée
    const monOrg = await this.orgService.getOrganismeConnected();

    // Récupérer toutes les organisations (admin)
    const organisations = await this.orgService.getAllOrganisations();

    // Mettre à jour une organisation
    await this.orgService.updateOrganisation('id-here', {
      name: 'Nouveau nom',
      contact: '+221 77 123 45 67'
    });
  }
}
```

## Configuration requise

### 1. Variables d'environnement
Assurez-vous que `environment.development.ts` contient l'URL du serveur :

```typescript
export const environDev = {
  urlServer: 'http://localhost:4000'
};
```

### 2. HttpClient Angular
Tous les services utilisent le HttpClient d'Angular qui :
- Envoie les cookies automatiquement (`withCredentials: true`)
- Utilise l'URL de base du serveur backend
- Configure les headers JSON
- Gère les Observables pour la réactivité

### 3. Intercepteur HTTP
L'intercepteur `CookieInterceptor` est déjà configuré pour :
- Envoyer les cookies d'authentification avec chaque requête
- Gérer les erreurs 401/403 (session expirée)

## Gestion des erreurs

```typescript
try {
  const aaps = await this.aapService.getAllAAPs();
} catch (error: any) {
  if (error.response?.status === 401) {
    console.error('Non authentifié');
    // Rediriger vers login
  } else if (error.response?.status === 403) {
    console.error('Non autorisé');
  } else {
    console.error('Erreur:', error.response?.data?.error || error.message);
  }
}
```

## Routes API disponibles

### AAP
- `GET /api/aap` - Liste des AAPs
- `GET /api/aap/:id` - Détail d'un AAP
- `GET /api/aap/code/:code` - AAP par code
- `POST /api/aap` - Créer un AAP (admin)
- `PUT /api/aap/:id` - Modifier un AAP (admin)
- `PATCH /api/aap/:id/toggle` - Activer/Désactiver (admin)
- `DELETE /api/aap/:id` - Supprimer un AAP (admin)

### Projet
- `GET /api/aprojet-v1` - Liste paginée
- `GET /api/aprojet-v1/all` - Tous les projets
- `GET /api/aprojet-v1/user` - Projet de l'utilisateur
- `GET /api/aprojet-v1/:id` - Détail d'un projet
- `POST /api/aprojet-v1/createProjet` - Créer un projet
- `PUT /api/aprojet-v1/:id` - Mettre à jour
- `PATCH /api/aprojet-v1/:id` - Mise à jour partielle
- `DELETE /api/aprojet-v1/:id` - Supprimer

### Organisation
- `GET /api/organisations/organismeconnected` - Organisation connectée
- `GET /api/organisations` - Toutes les organisations (admin)
- `GET /api/organisations/:id` - Détail (admin)
- `PUT /api/organisations/:id` - Mettre à jour
- `DELETE /api/organisations/:id` - Supprimer (admin)

## Authentification

Les services utilisent l'authentification par cookies (JWT). Assurez-vous que :
1. L'utilisateur est connecté via le service d'authentification
2. Le cookie JWT est stocké dans le navigateur
3. L'intercepteur envoie le cookie avec chaque requête

```typescript
// Exemple de connexion
import { AuthentificationService } from './services/auth/authentifcationservice';

async login(email: string, password: string) {
  await this.authService.login({ email, password });
  // Le cookie JWT est maintenant stocké
  // Toutes les requêtes suivantes seront authentifiées
}
```
