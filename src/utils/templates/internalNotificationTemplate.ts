export const internalNotificationTemplate = (name, subject, message) => `
  <html>
    <body style="font-family: Arial, sans-serif; color: #333;">
      <h2>Nouvelle demande reçue</h2>
      <p><strong>De :</strong> ${name}</p>
      <p><strong>Sujet :</strong> ${subject}</p>
      <p><strong>Message :</strong></p>
      <blockquote>${message}</blockquote>
      <p>Merci de traiter cette demande rapidement.</p>
    </body>
  </html>
`;
