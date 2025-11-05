import { Router, Request, Response } from 'express';
import { sendSupportEmail, SupportContactData } from '../utils/mail_support.js';

const router = Router();

/**
 * POST /api/support/contact
 * Envoie un email de support avec les informations du formulaire de contact
 * Body: { name: string, email: string, phone?: string, message: string }
 * Response: { success: boolean, message: string }
 */
router.post('/contact', async (req: Request, res: Response) => {
  console.log('[ROUTE] /api/support/contact - Requete recue');
  console.log('[BODY]', req.body);

  try {
    const { name, email, phone, message } = req.body;

    // Validation des champs requis
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Les champs nom, email et message sont requis'
      });
    }

    // Validation du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format d\'email invalide'
      });
    }

    // Validation de la longueur du message
    if (message.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Le message doit contenir au moins 10 caracteres'
      });
    }

    // Preparer les donnees
    const contactData: SupportContactData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : undefined,
      message: message.trim()
    };

    // Envoyer l'email de support
    await sendSupportEmail(contactData);

    console.log(`[SUPPORT] Message recu de ${contactData.name} (${contactData.email})`);

    // Reponse de succes
    return res.status(200).json({
      success: true,
      message: 'Votre message a ete envoye avec succes. Nous vous recontacterons dans les plus brefs delais.'
    });

  } catch (error: any) {
    console.error('[ERROR] Erreur lors de l\'envoi du message de support:', error);

    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de l\'envoi de votre message. Veuillez reessayer plus tard.'
    });
  }
});

export default router;
