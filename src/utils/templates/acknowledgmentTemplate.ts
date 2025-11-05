// mailTemplates/acknowledgmentTemplate.js

export const acknowledgmentTemplate = (name, subject, message) => `
  <!DOCTYPE html>
  <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Accusé de réception</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f6f9fc;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 30px auto;
          background: #ffffff;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
          background: #09B927FF;
          color: #fff;
          text-align: center;
          padding: 20px;
        }
        .content {
          padding: 25px;
          color: #333;
        }
        .footer {
          text-align: center;
          font-size: 13px;
          color: #777;
          padding: 15px;
          border-top: 1px solid #eee;
        }
        .highlight {
          color: #09B927FF;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Accusé de réception</h2>
        </div>
        <div class="content">
          <p>Bonjour <span class="highlight">${name}</span>,</p>
          <p>Nous avons bien reçu votre message concernant : <strong>${subject}</strong>.</p>
          <p>Notre équipe prendra connaissance de votre demande dans les plus brefs délais.</p>
          <blockquote style="background:#f1f1f1;padding:10px 15px;border-left:4px solid #09B927FF;">
            <em>${message}</em>
          </blockquote>
          <p>Merci de votre confiance,</p>
          <p><strong>L’équipe Support</strong></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} VotreEntreprise. Tous droits réservés.</p>
        </div>
      </div>
    </body>
  </html>
`;
