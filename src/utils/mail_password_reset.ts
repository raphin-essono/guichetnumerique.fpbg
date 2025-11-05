import nodemailer from 'nodemailer';

/**
 * ✅ Template HTML pour email de réinitialisation de mot de passe
 */
function generatePasswordResetEmail(name: string, resetLink: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de mot de passe</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f6f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f766e 0%, #115e59 100%); padding: 40px 30px; text-align: center;">
              <div style="background-color: rgba(255,255,255,0.2); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C9.38 2 7.25 4.13 7.25 6.75c0 2.57 2.01 4.65 4.63 4.74v2.26H10c-.41 0-.75.34-.75.75s.34.75.75.75h1.88v1h-1.88c-.41 0-.75.34-.75.75s.34.75.75.75h1.88v2.75c0 .41.34.75.75.75s.75-.34.75-.75v-2.75h1.87c.41 0 .75-.34.75-.75s-.34-.75-.75-.75h-1.87v-1h1.87c.41 0 .75-.34.75-.75s-.34-.75-.75-.75h-1.87v-2.26c2.62-.09 4.63-2.17 4.63-4.74 0-2.62-2.13-4.75-4.75-4.75z" fill="white"/>
                </svg>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                Réinitialisation de mot de passe
              </h1>
              <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Vous avez demandé à réinitialiser votre mot de passe
              </p>
            </td>
          </tr>

          <!-- Corps -->
          <tr>
            <td style="padding: 40px 30px;">

              <p style="margin: 0 0 20px 0; color: #334155; font-size: 15px; line-height: 1.6;">
                Bonjour <strong>${name}</strong>,
              </p>

              <p style="margin: 0 0 20px 0; color: #334155; font-size: 15px; line-height: 1.6;">
                Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
              </p>

              <!-- Bouton de réinitialisation -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}"
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #0f766e 0%, #115e59 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(15, 118, 110, 0.3);">
                      Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Informations de sécurité -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #78350f; font-size: 16px; font-weight: 600;">
                  ⚠️ Important
                </h3>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #78350f; font-size: 14px; line-height: 1.8;">
                  <li>Ce lien est valable pendant <strong>1 heure</strong></li>
                  <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
                  <li>Ne partagez jamais ce lien avec quiconque</li>
                </ul>
              </div>

              <p style="margin: 20px 0 0 0; color: #334155; font-size: 15px; line-height: 1.6;">
                Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
              </p>

              <p style="margin: 10px 0 0 0; color: #0f766e; font-size: 13px; word-break: break-all;">
                ${resetLink}
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px;">
                ${new Date().toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                &copy; ${new Date().getFullYear()} FPBG - Fonds pour la Promotion de la Biodiversité au Gabon
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
 * ✅ Template HTML pour email de confirmation de changement de mot de passe
 */
function generatePasswordChangedEmail(name: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mot de passe modifié</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f6f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 40px 30px; text-align: center;">
              <div style="background-color: rgba(255,255,255,0.2); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="white"/>
                </svg>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                Mot de passe modifié !
              </h1>
              <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Votre mot de passe a été changé avec succès
              </p>
            </td>
          </tr>

          <!-- Corps -->
          <tr>
            <td style="padding: 40px 30px;">

              <p style="margin: 0 0 20px 0; color: #334155; font-size: 15px; line-height: 1.6;">
                Bonjour <strong>${name}</strong>,
              </p>

              <p style="margin: 0 0 20px 0; color: #334155; font-size: 15px; line-height: 1.6;">
                Nous vous confirmons que votre mot de passe a été <strong style="color: #16a34a;">modifié avec succès</strong>.
              </p>

              <p style="margin: 0 0 20px 0; color: #334155; font-size: 15px; line-height: 1.6;">
                Vous pouvez maintenant vous connecter à votre compte avec votre nouveau mot de passe.
              </p>

              <!-- Alerte de sécurité -->
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #991b1b; font-size: 16px; font-weight: 600;">
                  🔒 Sécurité de votre compte
                </h3>
                <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.8;">
                  Si vous n'êtes <strong>pas à l'origine</strong> de cette modification, contactez-nous immédiatement à <a href="mailto:support@fpbg.ga" style="color: #dc2626; text-decoration: none; font-weight: 600;">support@fpbg.ga</a>
                </p>
              </div>

              <p style="margin: 20px 0 0 0; color: #334155; font-size: 15px; line-height: 1.6;">
                Merci de votre confiance !
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px;">
                ${new Date().toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                &copy; ${new Date().getFullYear()} FPBG - Fonds pour la Promotion de la Biodiversité au Gabon
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
 * Créer un transporter Gmail pour tous les emails
 */
function createEmailTransporter(): nodemailer.Transporter {
  const emailUser = process.env.SMTP_USER;
  const emailPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '465');

  if (!emailUser || !emailPass) {
    throw new Error("SMTP_USER et SMTP_PASS doivent être définis dans les variables d'environnement");
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

  // Sinon, utiliser le serveur SMTP personnalisé
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

/**
 * ✅ Envoyer l'email de réinitialisation de mot de passe
 */
export async function sendPasswordResetEmail(email: string, name: string, resetLink: string): Promise<void> {
  console.log('[PASSWORD RESET EMAIL] Préparation de l\'email...');
  console.log(`[PASSWORD RESET EMAIL] Destinataire: ${email}`);
  console.log(`[PASSWORD RESET EMAIL] Lien: ${resetLink}`);

  try {
    const transporter = createEmailTransporter();
    const html = generatePasswordResetEmail(name, resetLink);

    await transporter.sendMail({
      from: `"FPBG - Réinitialisation" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '🔒 Réinitialisation de votre mot de passe - FPBG',
      html
    });

    console.log('[PASSWORD RESET EMAIL] ✅ Email envoyé avec succès');
  } catch (error: any) {
    console.error('[PASSWORD RESET EMAIL] ❌ Erreur:', error.message);
    throw new Error("Impossible d'envoyer l'email de réinitialisation");
  }
}

/**
 * ✅ Envoyer l'email de confirmation de changement de mot de passe
 */
export async function sendPasswordChangedEmail(email: string, name: string): Promise<void> {
  console.log('[PASSWORD CHANGED EMAIL] Préparation de l\'email...');
  console.log(`[PASSWORD CHANGED EMAIL] Destinataire: ${email}`);

  try {
    const transporter = createEmailTransporter();
    const html = generatePasswordChangedEmail(name);

    await transporter.sendMail({
      from: `"FPBG - Sécurité" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '✅ Votre mot de passe a été modifié - FPBG',
      html
    });

    console.log('[PASSWORD CHANGED EMAIL] ✅ Email envoyé avec succès');
  } catch (error: any) {
    console.error('[PASSWORD CHANGED EMAIL] ❌ Erreur:', error.message);
    throw new Error("Impossible d'envoyer l'email de confirmation");
  }
}
