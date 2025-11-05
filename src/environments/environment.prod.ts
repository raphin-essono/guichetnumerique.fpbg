import packageInfo from '../../package.json';

// ========================================
// CONFIGURATION PRODUCTION
// ========================================
// Pour déployer en production, il suffit de modifier ces 2 valeurs :
// 1. API_DOMAIN : Le domaine de votre API backend
// 2. FRONTEND_DOMAIN : Le domaine de votre frontend (optionnel)

const API_DOMAIN = 'api.fpbg.singcloud.ga'; // MODIFIEZ ICI pour votre domaine API
const FRONTEND_DOMAIN = 'fpbg.singcloud.ga';   // MODIFIEZ ICI pour votre domaine frontend (si différent)

// Le reste se configure automatiquement
const API_PROTOCOL = 'https'; // http ou https
const API_PORT = ''; // Laisser vide si pas de port spécifique, ou ':4000' par exemple

// Construction automatique des URLs
const API_BASE_URL = `${API_PROTOCOL}://${API_DOMAIN}${API_PORT}`;

export const environment = {
  appVersion: packageInfo.version,
  production: true,

  // === CONFIGURATION API ===
  urlServer: API_BASE_URL,
  apiBaseUrl: `${API_BASE_URL}/api`,

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
