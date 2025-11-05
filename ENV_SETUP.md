# Configuration des Variables d'Environnement

## Variables Importantes

### FRONTEND_URL
Cette variable définit l'URL de base du frontend utilisée pour générer les liens dans les emails.

**Valeurs possibles :**
- Production : `https://guichetnumerique.fpbg.ga`
- Développement local : `http://localhost:4200`
- Réseau local : `http://192.168.1.99:4200`

**Utilisation :**
- Liens de réinitialisation de mot de passe
- Liens de vérification par email
- Redirections après authentification

### Configuration dans .env

Ajoutez cette ligne dans votre fichier `.env` :

```bash
FRONTEND_URL="https://guichetnumerique.fpbg.ga"
```

**Note :** Si `FRONTEND_URL` n'est pas définie, le système utilisera automatiquement `https://guichetnumerique.fpbg.ga` par défaut.

## Vérification

Pour vérifier que l'URL est correcte, regardez dans les logs backend lors de l'envoi d'email de réinitialisation :

```
✅ [FORGOT-PASSWORD] Email envoyé à utilisateur@example.com
Lien: https://guichetnumerique.fpbg.ga/reset-password?token=...
```
