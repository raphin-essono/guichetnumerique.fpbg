// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import packageInfo from '../../package.json';

// ========================================
// CONFIGURATION PAR DÉFAUT (DEV/LOCAL)
// ========================================
// Ce fichier est utilisé par défaut en développement
// Pour la production, Angular utilisera automatiquement environment.prod.ts

// const API_DOMAIN = 'guichetnumerique.fpbg.ga'; // Domaine local
// const FRONTEND_DOMAIN = 'guichetnumerique.fpbg.ga';

const API_DOMAIN = 'localhost'; // Domaine local
const FRONTEND_DOMAIN = 'localhost';

// Configuration locale
const API_PROTOCOL = 'http';
const API_PORT = ':4000'; // Port du backend local

// Construction automatique des URLs
const API_BASE_URL = `${API_PROTOCOL}://${API_DOMAIN}${API_PORT}`;

export const environment = {
  appVersion: packageInfo.version,
  production: true,

  // === CONFIGURATION API ===
  urlServer: API_BASE_URL,
  apiBaseUrl: `${API_BASE_URL}/api`,
  apiBase: `${API_BASE_URL}/api`, // Alias pour compatibilité

  // === DOMAINES ===
  domains: {
    api: API_DOMAIN,
    frontend: FRONTEND_DOMAIN,
  },

  // === AJOUTS pour le sondage ===
  activerSondagePostOtp: true,
  cleQuestionnaireSondage: 'acquisition_channel_v1',

  // === LIENS OFFICIELS ===
  liens: {
    siteOfficiel: 'https://fpbg.org/',
    whatsappChannel: 'https://whatsapp.com/channel/0029Vb6tduQK0IBibg4ui80B',
    facebook: 'https://www.facebook.com/profile.php?id=61572016092621',
    twitter: 'https://x.com/FPBG_Gabon',
    linkedin: 'https://www.linkedin.com/company/106050434/',
    instagram: 'https://instagram.com/fpbg.gabon',
    youtube: 'https://youtube.com/@fpbg-gabon',
  },
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.

// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
