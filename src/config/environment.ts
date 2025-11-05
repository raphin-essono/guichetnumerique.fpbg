/**
 * Configuration de l'environnement backend
 * Ce fichier centralise toutes les variables d'environnement utilisées par le backend
 */

export const environment = {
  // URL du frontend pour les liens dans les emails
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',

  // Domaines
  domains: {
    frontend: process.env.FRONTEND_URL || 'http://localhost:4200',
    api: process.env.API_URL || 'http://localhost:4000'
  },

  // Configuration SMTP
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },

  // Configuration JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'super_secret_key_change_me'
  },

  // Configuration du serveur
  server: {
    port: parseInt(process.env.PORT || '4000')
  },

  // Environnement (development, production)
  nodeEnv: process.env.NODE_ENV || 'development',
  production: process.env.NODE_ENV === 'production'
};
