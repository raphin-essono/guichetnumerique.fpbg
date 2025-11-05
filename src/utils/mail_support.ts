import type { Transporter } from 'nodemailer';
import nodemailer from 'nodemailer';

/**
 * Crée un transporter SMTP pour l'envoi d'emails de support
 * La création est lazy (à la demande) pour s'assurer que les variables d'environnement sont chargées
 */
function createTransporter(): Transporter {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.starget.tech',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // SSL/TLS pour port 465
    auth: {
      user: process.env.SMTP_USER || 'noreply-fpbg@pivot40.tech',
      pass: process.env.SMTP_PASS || ''
    },
    tls: {
      rejectUnauthorized: false, // Accepter les certificats auto-signés
      minVersion: 'TLSv1.2'
    },
    authMethod: 'LOGIN', // Méthode d'authentification
    debug: false, // Mets true si tu veux voir les logs SMTP détaillés
    logger: false
  });

  return transporter;
}

/**
 * Genere un template HTML professionnel pour l'email de support
 */
function generateSupportEmailTemplate(name: string, email: string, phone: string, message: string): string {
  const currentDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouveau message de support</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f6f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 40px 30px; text-align: center;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center">
                    <div style="background-color: rgba(255,255,255,0.2); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" fill="white"/>
                      </svg>
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                      Nouveau Message de Support
                    </h1>
                    <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                      Vous avez recu une nouvelle demande d'assistance
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corps du message -->
          <tr>
            <td style="padding: 40px 30px;">

              <!-- Informations du contact -->
              <table role="presentation" style="width: 100%; margin-bottom: 30px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 18px; font-weight: 600;">
                      Informations du contact
                    </h2>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table role="presentation" style="width: 100%; background-color: #f8fafc; border-radius: 12px; padding: 20px;">
                      <tr>
                        <td style="padding: 8px 0;">
                          <table role="presentation" style="width: 100%;">
                            <tr>
                              <td style="width: 100px; color: #64748b; font-size: 14px; font-weight: 500;">
                                Nom:
                              </td>
                              <td style="color: #1e293b; font-size: 14px; font-weight: 600;">
                                ${name}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <table role="presentation" style="width: 100%;">
                            <tr>
                              <td style="width: 100px; color: #64748b; font-size: 14px; font-weight: 500;">
                                Email:
                              </td>
                              <td style="color: #16a34a; font-size: 14px; font-weight: 600;">
                                <a href="mailto:${email}" style="color: #16a34a; text-decoration: none;">${email}</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ${
                        phone
                          ? `
                      <tr>
                        <td style="padding: 8px 0;">
                          <table role="presentation" style="width: 100%;">
                            <tr>
                              <td style="width: 100px; color: #64748b; font-size: 14px; font-weight: 500;">
                                Telephone:
                              </td>
                              <td style="color: #1e293b; font-size: 14px; font-weight: 600;">
                                <a href="tel:${phone}" style="color: #1e293b; text-decoration: none;">${phone}</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      `
                          : ''
                      }
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Message -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 18px; font-weight: 600;">
                      Message
                    </h2>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div style="background-color: #f8fafc; border-left: 4px solid #16a34a; border-radius: 8px; padding: 20px; color: #334155; font-size: 15px; line-height: 1.6;">
                      ${message.replace(/\n/g, '<br>')}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Bouton d'action -->
              <table role="presentation" style="width: 100%; margin-top: 30px;">
                <tr>
                  <td align="center">
                    <a href="mailto:${email}?subject=Re: Votre demande de support"
                        style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);">
                      Repondre au client
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px;">
                Recu le ${currentDate}
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                &copy; ${new Date().getFullYear()} FPBG Platform - Systeme de support automatise
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Interface pour les donnees du formulaire de contact
 */
export interface SupportContactData {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

/**
 * Envoie un email au support avec les informations du formulaire de contact
 */
export async function sendSupportEmail(
  data: SupportContactData,
  supportEmail: string = 'association.pivot40@sing.ga'
): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('[SUPPORT EMAIL] ENVOI EN COURS');
  console.log('='.repeat(80));
  console.log(`[ENV] NODE_ENV          : ${process.env.NODE_ENV}`);
  console.log(`Destinataire support : ${supportEmail}`);
  console.log(`Nom du contact       : ${data.name}`);
  console.log(`Email du contact     : ${data.email}`);
  console.log(`Telephone            : ${data.phone || 'Non fourni'}`);
  console.log(`Message              : ${data.message.substring(0, 100)}${data.message.length > 100 ? '...' : ''}`);
  console.log('='.repeat(80) + '\n');

  // Créer le transporter à la demande pour s'assurer que les variables d'environnement sont chargées
  const transporter = createTransporter();

  try {
    console.log(`[SENDING] Tentative d'envoi d'email de support a ${supportEmail}...`);

    const htmlContent = generateSupportEmailTemplate(data.name, data.email, data.phone || '', data.message);
    console.log('[OK] Template HTML genere');

    console.log("[SMTP] Envoi de l'email via SMTP...");
    const info = await transporter.sendMail({
      from: `"FPBG Support System" <${process.env.SMTP_USER || 'noreply-fpbg@pivot40.tech'}>`,
      to: supportEmail,
      replyTo: data.email,
      subject: `[FPBG Support] Nouveau message de ${data.name}`,
      html: htmlContent
    });

    console.log('[SUCCESS] Email de support envoye avec succes :', info.messageId);
    console.log('[NOTIFIED] Le support a ete notifie de la nouvelle demande\n');
  } catch (error: any) {
    console.error("[ERROR] Erreur d'envoi d'email de support :");
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    console.error('   Command:', error.command);
    throw new Error("Impossible d'envoyer l'email de support");
  }
}

/**
 * Verification de la configuration email
 */
export async function verifySupportEmailConfig(): Promise<boolean> {
  const transporter = createTransporter();
  try {
    console.log('[CHECK] Verification de la configuration SMTP pour le support...');
    await transporter.verify();
    console.log('[OK] Configuration email de support valide');
    return true;
  } catch (error: any) {
    console.error('[ERROR] Erreur de configuration email de support:', error.message);
    return false;
  }
}
