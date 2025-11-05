# 🌊 FPBG Backend API

Backend Node.js + TypeScript + Prisma + PostgreSQL pour la plateforme FPBG (Fonds de Préservation de la Biodiversité au Gabon).

## 📋 Table des matières

- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Structure du projet](#structure-du-projet)
- [Démarrage](#démarrage)
- [Scripts disponibles](#scripts-disponibles)
- [API Documentation](#api-documentation)
- [Base de données](#base-de-données)
- [Sécurité](#sécurité)
- [Tests](#tests)

---

## 🛠️ Prérequis

- **Node.js** >= 18.x
- **npm** >= 9.x
- **PostgreSQL** >= 14.x
- Un compte email (Gmail recommandé) pour l'envoi d'OTP

---

## 📦 Installation

1. **Cloner le dépôt**
```bash
git clone <repo-url>
cd backend
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**
```bash
cp .env.example .env
# Puis éditer le fichier .env avec vos valeurs
```

---

## ⚙️ Configuration

Créez un fichier `.env` à la racine du dossier `backend` avec les variables suivantes :

```env
# Base de données PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/fpbg_db?schema=public"

# JWT Secret (changez cette valeur en production)
JWT_SECRET="votre_secret_jwt_ultra_securise"

# Configuration Email (pour l'envoi des OTP)
EMAIL_USER="votre-email@gmail.com"
EMAIL_PASS="votre_mot_de_passe_app_gmail"

# URL du frontend (pour CORS)
FRONT_URL="http://localhost:4200"

# Port du serveur
PORT=4000

# Environnement
NODE_ENV="development"
```

### Configuration Gmail pour l'envoi d'emails

1. Activez la validation en 2 étapes sur votre compte Gmail
2. Générez un mot de passe d'application : [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Utilisez ce mot de passe dans `EMAIL_PASS`

---

## 📁 Structure du projet

```
backend/
├── prisma/
│   └── schema.prisma          # Schéma de la base de données
├── src/
│   ├── config/
│   │   └── db.ts              # Configuration Prisma
│   ├── controllers/           # Contrôleurs (logique des routes)
│   │   ├── auth.controller.ts
│   │   ├── projet.controller.ts
│   │   ├── organisation.controller.ts
│   │   └── aap.controller.ts
│   ├── services/              # Services métier
│   │   ├── auth.service.ts
│   │   ├── projet.service.ts
│   │   ├── organisation.service.ts
│   │   └── aap.service.ts
│   ├── routes/                # Définition des routes
│   │   ├── auth.routes.ts
│   │   ├── projet.routes.ts
│   │   ├── organisation.routes.ts
│   │   └── aap.routes.ts
│   ├── middlewares/           # Middlewares personnalisés
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── error.middleware.ts
│   ├── types/                 # Types TypeScript
│   │   └── index.ts
│   ├── utils/                 # Utilitaires
│   │   ├── generateOtp.ts
│   │   └── sendEmail.ts
│   └── server.ts              # Point d'entrée de l'application
├── .env                       # Variables d'environnement
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🚀 Démarrage

### 1. Créer la base de données

```bash
# Créer la base de données PostgreSQL
createdb fpbg_db
```

### 2. Générer le client Prisma

```bash
npm run prisma:generate
```

### 3. Appliquer les migrations

```bash
npm run prisma:migrate
```

### 4. Démarrer le serveur en mode développement

```bash
npm run dev
```

Le serveur sera accessible à l'adresse : **http://localhost:4000**

### 5. Vérifier que tout fonctionne

```bash
curl http://localhost:4000/health
```

Vous devriez recevoir :
```json
{
  "status": "OK",
  "message": "FPBG Backend API is running",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

---

## 📜 Scripts disponibles

| Script | Description |
|--------|-------------|
| `npm run dev` | Démarre le serveur en mode développement avec hot-reload |
| `npm run build` | Compile le TypeScript en JavaScript (dossier `dist/`) |
| `npm start` | Démarre le serveur en production (fichiers compilés) |
| `npm run prisma:generate` | Génère le client Prisma |
| `npm run prisma:migrate` | Applique les migrations de la base de données |

---

## 📖 API Documentation

La documentation complète de l'API est disponible dans le fichier [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

### Endpoints principaux

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/health` | GET | Health check de l'API |
| `/api/registeragentfpbg` | POST | Enregistrer un agent FPBG |
| `/api/registerOrganisation` | POST | Enregistrer une organisation |
| `/api/login` | POST | Connexion |
| `/api/authenticate` | GET | Vérifier l'authentification |
| `/api/aprojet-v1/*` | * | Gestion des projets |
| `/api/organisations/*` | * | Gestion des organisations |
| `/api/aap/*` | * | Gestion des appels à projets |

---

## 🗄️ Base de données

### Modèles principaux

- **User** : Utilisateurs/agents FPBG
- **Organisation** : Organisations soumissionnaires
- **TypeOrganisation** : Types d'organisations (ONG, PME, etc.)
- **Projet** : Projets soumis
- **AppelAProjet** : Appels à projets
- **Subvention** : Subventions (petites/moyennes)
- **CycleStep** : Étapes des cycles de subventions
- **Thematique** : Thématiques des AAP

### Gérer la base de données avec Prisma Studio

```bash
npx prisma studio
```

Cela ouvre une interface web à l'adresse **http://localhost:5555** pour visualiser et modifier les données.

### Réinitialiser la base de données

⚠️ **Attention : Cela supprime toutes les données !**

```bash
npx prisma migrate reset
```

---

## 🔒 Sécurité

### Mesures de sécurité implémentées

1. **Authentification JWT**
   - Tokens stockés dans des cookies HttpOnly
   - Expiration des tokens après 7 jours
   - Middleware de vérification sur toutes les routes protégées

2. **Hashage des mots de passe**
   - Utilisation de bcryptjs avec 12 rounds
   - Les mots de passe ne sont jamais stockés en clair

3. **Validation OTP**
   - Codes à 6 chiffres
   - Expiration après 10 minutes
   - Envoi sécurisé par email

4. **Validation des données**
   - Validation des emails, mots de passe et champs requis
   - Protection contre les injections SQL (via Prisma)
   - Sanitization des inputs

5. **CORS**
   - Configuration stricte pour n'autoriser que le frontend

6. **Gestion des erreurs**
   - Messages d'erreur génériques pour éviter les fuites d'informations
   - Logs détaillés en développement uniquement

---

## 🧪 Tests

### Tester avec cURL

**1. Enregistrer un utilisateur**
```bash
curl -X POST http://localhost:4000/api/registeragentfpbg \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test.user",
    "email": "test@fpbg.org",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User",
    "userType": "agent"
  }'
```

**2. Login**
```bash
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test.user",
    "password": "password123"
  }'
```

**3. Récupérer les projets (avec token)**
```bash
curl -X GET http://localhost:4000/api/aprojet-v1/all \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Tester avec Postman

1. Importez la collection Postman (à créer)
2. Configurez l'environnement avec l'URL de base : `http://localhost:4000`
3. Testez les endpoints un par un

---

## 🌍 Déploiement

### Variables d'environnement en production

```env
NODE_ENV="production"
DATABASE_URL="postgresql://..."
JWT_SECRET="votre_secret_ultra_securise_en_production"
EMAIL_USER="production-email@example.com"
EMAIL_PASS="production_password"
FRONT_URL="https://votre-domaine.com"
PORT=4000
```

### Build pour la production

```bash
npm run build
npm start
```

---

## 🤝 Contribution

1. Créer une branche pour votre fonctionnalité
2. Commiter vos changements
3. Créer une Pull Request

---

## 📝 Licence

Ce projet est sous licence propriétaire FPBG.

---

## 📧 Contact

Pour toute question : **contact@fpbg.org**
