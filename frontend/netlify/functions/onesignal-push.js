exports.handler = async (event, context) => {
  // Solo permitir peticiones POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    
    // Supabase envía el registro insertado dentro de payload.record
    const notificationRecord = payload.record || payload;
    const { miembro_id, titulo, descripcion } = notificationRecord;

    if (!miembro_id || !titulo || !descripcion) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required notification fields: miembro_id, titulo, or descripcion' }),
      };
    }

    const onesignalAppId = process.env.VITE_ONESIGNAL_APP_ID;
    const onesignalRestApiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!onesignalAppId || !onesignalRestApiKey) {
      console.warn('OneSignal credentials missing in environment variables.');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'OneSignal server credentials not configured' }),
      };
    }

    // Petición a la API de OneSignal para enviar la notificación push
    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Key ${onesignalRestApiKey}`,
      },
      body: JSON.stringify({
        app_id: onesignalAppId,
        include_external_user_ids: [miembro_id],
        headings: { en: titulo, es: titulo },
        contents: { en: descripcion, es: descripcion },
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('OneSignal API Error:', result);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Failed to send notification via OneSignal', details: result }),
      };
    }

    console.log('Push notification sent successfully:', result);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Notification sent successfully', result }),
    };

  } catch (error) {
    console.error('Error processing notification webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message }),
    };
  }
};
