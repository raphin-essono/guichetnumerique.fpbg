# Guide de Déploiement - Configuration des Domaines

## 📋 Vue d'ensemble

Ce projet utilise un système de configuration d'environnement simplifié qui permet de basculer facilement entre développement local et production.

## 🔧 Configuration des Domaines

### Pour le Développement Local

Le fichier `src/environments/environment.ts` est configuré par défaut pour localhost.

**Aucune modification nécessaire** pour le développement local !

```typescript
const API_DOMAIN = 'localhost';
const API_PROTOCOL = 'http';
const API_PORT = ':4000';
```

### Pour la Production

Pour déployer en production, **il suffit de modifier 2-3 lignes** dans `src/environments/environment.prod.ts` :

```typescript
// ========================================
// À MODIFIER POUR VOTRE DÉPLOIEMENT
// ========================================

const API_DOMAIN = 'api.votre-domaine.com';  // ← Votre domaine API
const FRONTEND_DOMAIN = 'votre-domaine.com'; // ← Votre domaine frontend

const API_PROTOCOL = 'https'; // http ou https
const API_PORT = '';          // Laisser vide (ou ':4000' si port spécifique)
```

**Exemples de configuration :**

#### Exemple 1 : API et Frontend sur le même domaine
```typescript
const API_DOMAIN = 'fpbg.singcloud.ga';
const FRONTEND_DOMAIN = 'fpbg.singcloud.ga';
const API_PROTOCOL = 'https';
const API_PORT = '';
// Résultat: https://fpbg.singcloud.ga/api
```

#### Exemple 2 : API sur un sous-domaine séparé
```typescript
const API_DOMAIN = 'api.fpbg.singcloud.ga';
const FRONTEND_DOMAIN = 'fpbg.singcloud.ga';
const API_PROTOCOL = 'https';
const API_PORT = '';
// Résultat: https://api.fpbg.singcloud.ga/api
```

#### Exemple 3 : Avec un port spécifique
```typescript
const API_DOMAIN = 'api.fpbg.singcloud.ga';
const FRONTEND_DOMAIN = 'fpbg.singcloud.ga';
const API_PROTOCOL = 'https';
const API_PORT = ':8080';
// Résultat: https://api.fpbg.singcloud.ga:8080/api
```

## 🚀 Build et Déploiement

### Build pour le Développement
```bash
npm run build
# ou
ng build
```

### Build pour la Production
```bash
npm run build -- --configuration=production
# ou
ng build --configuration=production
```

Lors du build de production, Angular remplace automatiquement `environment.ts` par `environment.prod.ts`.

### Démarrer le serveur de dev
```bash
npm start
# ou
ng serve
```

## 📁 Structure des fichiers d'environnement

```
frontend/src/environments/
├── environment.ts              # Par défaut / Développement (localhost:4000)
├── environment.development.ts  # Développement explicite (localhost:4000)
└── environment.prod.ts         # Production (à configurer avec vos domaines)
```

## ✅ Vérification de la configuration

Après avoir modifié `environment.prod.ts`, vous pouvez vérifier que les URLs sont correctement générées :

1. Ouvrez la console du navigateur
2. Tapez : `console.log(environment)`
3. Vérifiez que `urlServer` et `apiBaseUrl` contiennent les bonnes URLs

Exemple de résultat attendu :
```javascript
{
  urlServer: "https://api.fpbg.singcloud.ga",
  apiBaseUrl: "https://api.fpbg.singcloud.ga/api",
  domains: {
    api: "api.fpbg.singcloud.ga",
    frontend: "fpbg.singcloud.ga"
  },
  // ...
}
```

## 🔗 Variables d'environnement disponibles

| Variable | Description | Exemple (dev) | Exemple (prod) |
|----------|-------------|---------------|----------------|
| `urlServer` | URL complète du backend | `http://localhost:4000` | `https://api.fpbg.singcloud.ga` |
| `apiBaseUrl` | URL de base de l'API | `http://localhost:4000/api` | `https://api.fpbg.singcloud.ga/api` |
| `domains.api` | Domaine de l'API | `localhost` | `api.fpbg.singcloud.ga` |
| `domains.frontend` | Domaine du frontend | `localhost` | `fpbg.singcloud.ga` |
| `liens.*` | Liens officiels (réseaux sociaux, site FPBG) | - | - |

## 🛠️ Configuration Backend

N'oubliez pas de configurer également le backend pour accepter les requêtes depuis votre domaine frontend !

Dans le fichier backend, ajoutez votre domaine frontend aux CORS :

```typescript
// backend/src/index.ts ou équivalent
app.use(cors({
  origin: [
    'http://localhost:4200',           // Développement
    'https://fpbg.singcloud.ga',       // Production frontend
    'https://www.fpbg.singcloud.ga'    // Production frontend (avec www)
  ],
  credentials: true
}));
```

## 📝 Checklist de Déploiement

- [ ] Modifier `API_DOMAIN` dans `environment.prod.ts`
- [ ] Modifier `FRONTEND_DOMAIN` dans `environment.prod.ts`
- [ ] Vérifier `API_PROTOCOL` (http vs https)
- [ ] Vérifier `API_PORT` (vide par défaut)
- [ ] Configurer les CORS côté backend
- [ ] Build avec `ng build --configuration=production`
- [ ] Déployer les fichiers du dossier `dist/`
- [ ] Tester que l'application se connecte correctement à l'API

## 🆘 Dépannage

### L'application ne se connecte pas à l'API

1. Vérifiez que `environment.prod.ts` est correctement configuré
2. Ouvrez la console navigateur et vérifiez les requêtes réseau
3. Vérifiez que le backend est accessible à l'URL configurée
4. Vérifiez les CORS côté backend
5. Vérifiez que le build a été fait avec `--configuration=production`

### Les liens ne fonctionnent pas

Vérifiez que vous avez bien importé `environment` dans votre composant :

```typescript
import { environment } from '../../../environments/environment';

// Dans la classe du composant
liens = environment.liens;
```

---

**🎯 Rappel :** Vous ne modifiez **que** le fichier `environment.prod.ts` pour le déploiement en production !
