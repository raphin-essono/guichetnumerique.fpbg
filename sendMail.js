import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: 'mail.singcloud.ga',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Fonction pour remplir le template HTML avec les vraies données
 */
function fillTemplate(html, data) {
  return html
    .replace(/{{\s*to_name\s*}}/g, data.to_name)
    .replace(/{{\s*app_name\s*}}/g, data.app_name)
    .replace(/{{\s*otp_code\s*}}/g, data.otp_code)
    .replace(/{{\s*from_name\s*}}/g, data.from_name)
    .replace(/{{\s*year\s*}}/g, data.year)
    .replace(/{{\s*support_link\s*}}/g, data.support_link);
}

/**
 * Template HTML (copié depuis ton modèle)
 */
const otpTemplate = `
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Code de vérification OTP</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f3f6f4;
        margin: 0;
        padding: 0;
      }

      .container {
        max-width: 600px;
        margin: 40px auto;
        background: #ffffff;
        border-radius: 10px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
        overflow: hidden;
        border-top: 5px solid #16a34a;
      }

      .header {
        background-color: #16a34a;
        color: #ffffff;
        padding: 20px 30px;
        text-align: center;
      }

      .header h1 {
        margin: 0;
        font-size: 22px;
        font-weight: 600;
      }

      .content {
        padding: 30px;
        color: #333333;
        line-height: 1.6;
      }

      .otp-box {
        background-color: #ecfdf5;
        border: 1px solid #a7f3d0;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        margin: 20px 0;
        font-size: 28px;
        letter-spacing: 4px;
        color: #15803d;
        font-weight: bold;
      }

      .footer {
        background-color: #f9fafb;
        color: #6b7280;
        font-size: 13px;
        text-align: center;
        padding: 15px 20px;
        border-top: 1px solid #e5e7eb;
      }

      .footer a {
        color: #16a34a;
        text-decoration: none;
        font-weight: 500;
      }

      .footer a:hover {
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>CODE D'AUTHENTIFICATION</h1>
      </div>
      <div class="content">
        <p>Bonjour <strong>{{ to_name }}</strong>,</p>

        <p>
          Merci de vous être inscrit sur <strong>{{ app_name }}</strong> 🌿<br />
          Pour finaliser votre inscription et activer votre compte, veuillez saisir le code OTP ci-dessous :
        </p>

        <div class="otp-box">{{ otp_code }}</div>

        <p>
          Ce code expirera dans <strong>5 minutes</strong>.<br />
          Si vous n’avez pas demandé ce code, vous pouvez ignorer cet e-mail.
        </p>

        <p>Bien cordialement,<br /><strong>L’équipe {{ from_name }}</strong></p>
      </div>

      <div class="footer">
        <p>© {{ year }} {{ app_name }} — Tous droits réservés</p>
        <p>Besoin d’aide ? <a href="{{ support_link }}">Contactez le support</a></p>
      </div>
    </div>
  </body>
</html>
`;

/**
 * Envoi d’un mail OTP
 */
export async function sendOtpEmail({
  to,
  to_name,
  otp_code,
  app_name = 'FPBG Support',
  from_name = 'FPBG Team',
  support_link = 'https://singpay.ga/support'
}) {
  const data = {
    to_name,
    otp_code,
    app_name,
    from_name,
    year: new Date().getFullYear(),
    support_link
  };

  const html = fillTemplate(otpTemplate, data);
  const subject = `🔐 Votre code de vérification - ${app_name}`;

  const info = await transporter.sendMail({
    from: `${from_name} <${process.env.SMTP_USER}>`,
    to,
    subject,
    html
  });

  console.log('✅ Mail envoyé :', info.messageId || info.response);
  return info;
}

/**
 * Test rapide : node sendMail.js
 */
if (process.argv[1].endsWith('sendMail.js')) {
  (async () => {
    try {
      await transporter.verify();
      await sendOtpEmail({
        to: 'raphin.essono@sing.ga',
        to_name: 'Raphin Essono',
        otp_code: '384920'
      });
    } catch (err) {
      console.error('❌ Erreur envoi :', err.message);
    }
  })();
}
