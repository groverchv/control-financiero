export const sendPushNotification = async (miembroId, titulo, descripcion) => {
  try {
    const response = await fetch('/api/notifications/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        miembro_id: miembroId,
        titulo,
        descripcion,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.warn('[OneSignal Push] Servidor retornó error:', errData);
    }
  } catch (err) {
    console.warn('[OneSignal Push] Error al conectar con Netlify Function:', err);
  }
};
