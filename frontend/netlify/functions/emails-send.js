export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método no permitido. Use POST.' }),
    };
  }

  const { BREVO_API_KEY, BREVO_SENDER_EMAIL } = process.env;

  try {
    const body = JSON.parse(event.body || '{}');
    const { toEmail, toName, subject, htmlContent } = body;

    if (!toEmail || !subject || !htmlContent) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Faltan parámetros obligatorios (toEmail, subject, htmlContent).' }),
      };
    }

    if (!BREVO_API_KEY) {
      console.warn('[emails-send] BREVO_API_KEY no configurado, simulando envío de email a:', toEmail);
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: 'Envío de correo simulado con éxito (API Key faltante).' }),
      };
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: 'Asociación de Profesionales Financieros', email: BREVO_SENDER_EMAIL || 'notificaciones@controlfinanciero.org' },
        to: [{ email: toEmail, name: toName || toEmail.split('@')[0] }],
        subject: subject,
        htmlContent: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `Error de la API de Brevo: ${errorBody}` }),
      };
    }

    const result = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, result }),
    };
  } catch (err) {
    console.error('[emails-send] Error de servidor:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno de Netlify Function' }),
    };
  }
}
