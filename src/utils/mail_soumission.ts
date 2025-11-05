// sendMail.js
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { acknowledgmentTemplate } from './templates/acknowledgmentTemplate';
import { internalNotificationTemplate } from './templates/internalNotificationTemplate';

/**
 * Crée un transporter SMTP pour l'envoi d'emails de soumission
 * ✅ Configuration adaptée selon le type de serveur SMTP
 */
function createTransporter(): Transporter {
  const emailUser = process.env.SMTP_USER;
  const emailPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '465');

  if (!emailUser || !emailPass) {
    throw new Error(
      "SMTP_USER et SMTP_PASS doivent être définis dans les variables d'environnement"
    );
  }

  // Si c'est un email Gmail, utiliser service: 'gmail'
  if (emailUser.endsWith('@gmail.com')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });
  }

  // Sinon, utiliser le serveur SMTP personnalisé (singcloud.ga)
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: emailUser,
      pass: emailPass
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

export const sendMailSoumissionnaireAdmin = async (to: string, name: string, subject: string, message: string) => {
  const transporter = createTransporter();

  // Premier mail → au client
  const clientMail = {
    from: `"Support" <${process.env.SMTP_USER}>`,
    to,
    subject: `Accusé de réception - ${subject}`,
    html: acknowledgmentTemplate(name, subject, message)
  };

  // Second mail → à ton équipe interne
  const internalMail = {
    from: `"Support" <${process.env.SMTP_USER}>`,
    to: 'morelmintsa@gmail.com', // ou une variable d’env
    subject: `Nouvelle demande de ${name}`,
    html: internalNotificationTemplate(name, subject, message)
  };

  // Envoi simultané
  await Promise.all([transporter.sendMail(clientMail), transporter.sendMail(internalMail)]);

  console.log('✅ Accusé envoyé au client et notification à l’équipe.');
};
