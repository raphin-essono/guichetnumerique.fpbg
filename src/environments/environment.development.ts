import packageInfo from '../../package.json';

// ========================================
// CONFIGURATION DEVELOPMENT
// ========================================

const API_DOMAIN = 'localhost';
const FRONTEND_DOMAIN = 'localhost';

const API_PROTOCOL = 'http';
const API_PORT = ':4000';

const API_BASE_URL = `${API_PROTOCOL}://${API_DOMAIN}${API_PORT}`;

export const environDev = {
  appVersion: packageInfo.version,
  production: false,

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
