// backend/src/types/sondage.ts

export type CanalSondage =
  | 'RESEAUX_SOCIAUX'
  | 'EMAIL'
  | 'SITE_WEB'
  | 'PARTENAIRE'
  | 'BOUCHE_A_OREILLE'
  | 'EVENEMENT'
  | 'MOTEUR_RECHERCHE'
  | 'CHAINE_WHATSAPP'
  | 'AUTRE';

export interface CorpsCreationSondage {
  cleQuestionnaire: string; // ex : "acquisition_channel_v1"
  choixSelectionne: CanalSondage; // 1 seul choix (singulier)
  texteAutre?: string; // requis si "AUTRE" est coché
  commentaire?: string;
  meta?: Record<string, any> | null; // { locale, referrer, utm, userAgent, ... }
}

export const canauxAutorises: CanalSondage[] = [
  'RESEAUX_SOCIAUX',
  'EMAIL',
  'SITE_WEB',
  'PARTENAIRE',
  'BOUCHE_A_OREILLE',
  'EVENEMENT',
  'MOTEUR_RECHERCHE',
  'CHAINE_WHATSAPP',
  'AUTRE'
];

export function validerDonneesCreationSondage(body: any): { ok: true } | { ok: false; message: string } {
  if (!body || typeof body !== 'object') return { ok: false, message: 'Corps invalide.' };

  const { cleQuestionnaire, choixSelectionne, texteAutre, commentaire, meta } = body;

  if (!cleQuestionnaire || typeof cleQuestionnaire !== 'string')
    return { ok: false, message: 'cleQuestionnaire est requis.' };

  if (!choixSelectionne || typeof choixSelectionne !== 'string')
    return { ok: false, message: 'choixSelectionne est requis.' };

  if (!(canauxAutorises as readonly string[]).includes(choixSelectionne))
    return { ok: false, message: `choixSelectionne contient une valeur invalide : ${choixSelectionne}` };

  if (choixSelectionne === 'AUTRE') {
    if (!texteAutre || typeof texteAutre !== 'string' || texteAutre.trim().length === 0)
      return { ok: false, message: 'texteAutre est requis quand AUTRE est sélectionné.' };
    if (texteAutre.length > 255) return { ok: false, message: 'texteAutre doit faire 255 caractères maximum.' };
  }

  if (commentaire && typeof commentaire !== 'string')
    return { ok: false, message: 'commentaire doit être une chaîne.' };
  if (commentaire && commentaire.length > 1000)
    return { ok: false, message: 'commentaire doit faire 1000 caractères maximum.' };

  if (meta && typeof meta !== 'object') return { ok: false, message: 'meta doit être un objet.' };

  return { ok: true };
}
