// backend/src/controllers/sondage.controller.ts
import { Request, Response } from 'express';
import { serviceSondage } from '../services/sondage.service';
import { validerDonneesCreationSondage } from '../types/sondage';

function obtenirIdUtilisateur(req: Request): string | null {
    const r: any = req;
    // Le middleware authenticate met userId dans req.user.userId
    return (
        r?.user?.userId ||
        r?.user?.id ||
        r?.auth?.userId ||
        r?.session?.user?.id ||
        null
    );
}

/** GET /api/sondage/reponses/moi?cleQuestionnaire=acquisition_channel_v1
 * 200 si réponse existe, 404 sinon
 */
export async function obtenirMaReponseSondage(req: Request, res: Response) {
    const idUtilisateur = obtenirIdUtilisateur(req);
    if (!idUtilisateur) return res.status(401).json({ message: 'Non authentifié.' });

    const cleQuestionnaire = String(req.query.cleQuestionnaire || '').trim();
    if (!cleQuestionnaire) return res.status(400).json({ message: 'cleQuestionnaire est requis.' });

    const rep = await serviceSondage.obtenirMaReponse(idUtilisateur, cleQuestionnaire);
    if (!rep) return res.status(404).json({ message: 'Aucune réponse.' });

    return res.status(200).json(rep);
}

/** POST /api/sondage/reponses
 * Body: { cleQuestionnaire, choixSelectionne, texteAutre?, commentaire?, meta? }
 * 201 en succès, 409 si déjà répondu
 */
export async function creerReponseSondage(req: Request, res: Response) {
    console.log('[creerReponseSondage] === DÉBUT ===');
    console.log('[creerReponseSondage] Headers:', req.headers);
    console.log('[creerReponseSondage] req.user:', (req as any).user);

    const idUtilisateur = obtenirIdUtilisateur(req);
    console.log('[creerReponseSondage] idUtilisateur extrait:', idUtilisateur);

    if (!idUtilisateur) {
        console.error('[creerReponseSondage] ERREUR: idUtilisateur non trouvé');
        return res.status(401).json({ message: 'Non authentifié.' });
    }

    console.log('[creerReponseSondage] Body reçu:', req.body);
    const verif = validerDonneesCreationSondage(req.body);
    if (!verif.ok) {
        console.error('[creerReponseSondage] Validation échouée:', verif.message);
        return res.status(400).json({ message: verif.message });
    }

    try {
        console.log('[creerReponseSondage] Tentative de création...');
        const cree = await serviceSondage.creerReponse(idUtilisateur, req.body);
        console.log('[creerReponseSondage] ✅ SUCCÈS - Réponse créée:', cree);
        return res.status(201).json(cree);
    } catch (e: any) {
        if (e?.status === 409) {
            console.warn('[creerReponseSondage] Conflit: déjà répondu');
            return res.status(409).json({ message: 'Déjà répondu.' });
        }
        console.error('[creerReponseSondage] ❌ ERREUR:', e);
        return res.status(500).json({ message: 'Erreur serveur.' });
    }
}
