const https = require('https');

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

    // Petición HTTPS nativa a la API de OneSignal para evitar problemas de compatibilidad con fetch
    const postData = JSON.stringify({
      app_id: onesignalAppId,
      include_external_user_ids: [miembro_id],
      headings: { en: titulo, es: titulo },
      contents: { en: descripcion, es: descripcion },
    });

    const result = await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.onesignal.com',
          path: '/notifications',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': `Key ${onesignalRestApiKey}`,
            'Content-Length': Buffer.byteLength(postData),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode,
              body: data,
            });
          });
        }
      );

      req.on('error', (e) => {
        reject(e);
      });

      req.write(postData);
      req.end();
    });

    const responseBody = JSON.parse(result.body || '{}');

    if (result.statusCode < 200 || result.statusCode >= 300) {
      console.error('OneSignal API Error:', responseBody);
      return {
        statusCode: result.statusCode,
        body: JSON.stringify({ error: 'Failed to send notification via OneSignal', details: responseBody }),
      };
    }

    console.log('Push notification sent successfully:', responseBody);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Notification sent successfully', result: responseBody }),
    };

  } catch (error) {
    console.error('Error processing notification webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message }),
    };
  }
};
