/**
 * Servicio de correo electronico transaccional con Brevo (Sendinblue)
 * Envia notificaciones por email a los socios de la institucion.
 */
import { supabase } from './supabase';

const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const SENDER = {
  name: 'Control Financiero Institucional',
  email: 'notificaciones@controlfinanciero.org'
};

const baseTemplate = (title, content, accentColor = '#1e3a5f') => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg, ${accentColor}, ${accentColor}dd);padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">
                Control<span style="opacity:0.85;">Financiero</span>
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:12px;text-transform:uppercase;letter-spacing:2px;font-weight:700;">
                ${title}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #f1f5f9;background-color:#f8fafc;">
              <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">
                Control Financiero Institucional ${new Date().getFullYear()}. Todos los derechos reservados.<br/>
                Este correo es generado automaticamente, por favor no responda a este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const enviarEmail = async ({ to, subject, htmlContent }) => {
  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: SENDER,
        to: Array.isArray(to) ? to : [to],
        subject,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Brevo] Error al enviar email:', errorData);
      return { success: false, error: errorData };
    }

    const data = await response.json();
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('[Brevo] Error de red:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Guarda una notificacion en la base de datos para que aparezca en el portal
 */
const guardarNotificacionDB = async (miembroId, titulo, descripcion) => {
  try {
    if (!miembroId) return;
    await supabase.from('notificacion').insert([{
      miembro_id: miembroId,
      titulo,
      descripcion,
      estado: 'pendiente'
    }]);
  } catch (err) {
    console.error('[Brevo] Error guardando notificacion en BD:', err);
  }
};

export const brevoService = {

  notificarPagoRegistrado: async ({ email, nombre, monto, fecha, concepto = 'Cuota mensual', miembroId }) => {
    const content = `
      <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:700;">Pago Registrado Exitosamente</h2>
      <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
        Estimado/a <strong>${nombre}</strong>, le confirmamos que su pago ha sido registrado correctamente en el sistema institucional.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:24px;">
        <tr>
          <td style="padding:16px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;">Concepto</td>
                <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${concepto}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;">Monto</td>
                <td style="padding:6px 0;color:#16a34a;font-size:18px;font-weight:800;text-align:right;">Bs. ${monto}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;">Fecha</td>
                <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${fecha}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="margin:0;color:#64748b;font-size:13px;">Gracias por mantener al dia sus obligaciones con la institucion.</p>
    `;

    await guardarNotificacionDB(miembroId, 'Pago registrado', `Se registro su pago de Bs. ${monto} por concepto de: ${concepto}. Fecha: ${fecha}.`);

    return enviarEmail({
      to: { email, name: nombre },
      subject: `Confirmacion de pago - Bs. ${monto}`,
      htmlContent: baseTemplate('Confirmacion de Pago', content, '#16a34a'),
    });
  },

  notificarPagoPendiente: async ({ email, nombre, monto, fechaLimite, diasRetraso = 0, miembroId }) => {
    const esRetraso = diasRetraso > 0;
    const content = `
      <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:700;">
        ${esRetraso ? 'Aviso: Pago con Retraso' : 'Recordatorio de Pago Pendiente'}
      </h2>
      <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
        Estimado/a <strong>${nombre}</strong>, ${esRetraso
          ? `le informamos que registra un pago con <strong>${diasRetraso} dias de retraso</strong>.`
          : 'le recordamos que tiene un pago pendiente por realizar.'}
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${esRetraso ? '#fef2f2' : '#fffbeb'};border:1px solid ${esRetraso ? '#fecaca' : '#fde68a'};border-radius:12px;margin-bottom:24px;">
        <tr>
          <td style="padding:16px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;">Monto adeudado</td>
                <td style="padding:6px 0;color:${esRetraso ? '#dc2626' : '#d97706'};font-size:18px;font-weight:800;text-align:right;">Bs. ${monto}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;">Fecha limite</td>
                <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${fechaLimite}</td>
              </tr>
              ${esRetraso ? `
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;">Dias de retraso</td>
                <td style="padding:6px 0;color:#dc2626;font-size:13px;font-weight:800;text-align:right;">${diasRetraso} dias</td>
              </tr>` : ''}
            </table>
          </td>
        </tr>
      </table>
      <p style="margin:0;color:#64748b;font-size:13px;">
        Por favor, regularice su situacion lo antes posible. Si ya realizo el pago, ignore este mensaje.
      </p>
    `;

    await guardarNotificacionDB(miembroId, esRetraso ? 'Pago con retraso' : 'Pago pendiente',
      esRetraso ? `Tiene un pago de Bs. ${monto} con ${diasRetraso} dias de retraso. Fecha limite: ${fechaLimite}.`
                : `Recordatorio: tiene un pago pendiente de Bs. ${monto}. Fecha limite: ${fechaLimite}.`
    );

    return enviarEmail({
      to: { email, name: nombre },
      subject: esRetraso ? `Aviso de pago con retraso - ${diasRetraso} dias` : 'Recordatorio: Pago pendiente',
      htmlContent: baseTemplate(esRetraso ? 'Pago con Retraso' : 'Pago Pendiente', content, esRetraso ? '#dc2626' : '#d97706'),
    });
  },

  notificarNuevoEvento: async ({ destinatarios, evento }) => {
    const fechaFormateada = new Date(evento.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const content = `
      <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:700;">Nuevo Evento Institucional</h2>
      <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
        Le informamos que se ha programado un nuevo evento institucional. A continuacion los detalles:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;margin-bottom:24px;">
        <tr>
          <td style="padding:20px;">
            <h3 style="margin:0 0 12px;color:#1e40af;font-size:18px;font-weight:800;">${evento.nombre}</h3>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;">Fecha</td>
                <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${fechaFormateada}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;">Ubicacion</td>
                <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${evento.ubicacion || 'Por confirmar'}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;">Costo</td>
                <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${evento.costo > 0 ? `Bs. ${evento.costo}` : 'Gratuito'}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;">Cupos disponibles</td>
                <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${evento.cupos || evento.asistentes || 'Limitados'}</td>
              </tr>
            </table>
            ${evento.descripcion ? `<p style="margin:16px 0 0;color:#475569;font-size:13px;line-height:1.6;border-top:1px solid #dbeafe;padding-top:12px;">${evento.descripcion}</p>` : ''}
          </td>
        </tr>
      </table>
      <p style="margin:0;color:#64748b;font-size:13px;">Ingrese al portal institucional para inscribirse y asegurar su lugar.</p>
    `;

    const results = [];
    for (const dest of destinatarios) {
      await guardarNotificacionDB(dest.id, 'Nuevo evento: ' + evento.nombre, `Se ha programado el evento "${evento.nombre}" para el ${fechaFormateada}. Ubicacion: ${evento.ubicacion || 'Por confirmar'}. Costo: ${evento.costo > 0 ? 'Bs. ' + evento.costo : 'Gratuito'}.`);
      const result = await enviarEmail({
        to: { email: dest.email, name: dest.nombre },
        subject: `Nuevo evento institucional: ${evento.nombre}`,
        htmlContent: baseTemplate('Nuevo Evento', content, '#1e3a5f'),
      });
      results.push(result);
    }
    return results;
  },

  notificarNuevoCurso: async ({ destinatarios, curso }) => {
    const fechaFormateada = new Date(curso.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const content = `
      <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:700;">Nueva Actividad Academica Disponible</h2>
      <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
        Le informamos que se ha registrado una nueva actividad academica. A continuacion los detalles:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;margin-bottom:24px;">
        <tr>
          <td style="padding:20px;">
            <h3 style="margin:0 0 12px;color:#047857;font-size:18px;font-weight:800;">${curso.nombre}</h3>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;">Fecha de inicio</td>
                <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${fechaFormateada}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;">Modalidad</td>
                <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;text-transform:capitalize;">${curso.modalidad || 'Presencial'}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;">Inversion</td>
                <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${curso.costo > 0 ? `Bs. ${curso.costo}` : 'Sin costo'}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;">Cupos disponibles</td>
                <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${curso.cupos || 'Limitados'}</td>
              </tr>
            </table>
            ${curso.descripcion ? `<p style="margin:16px 0 0;color:#475569;font-size:13px;line-height:1.6;border-top:1px solid #d1fae5;padding-top:12px;">${curso.descripcion}</p>` : ''}
          </td>
        </tr>
      </table>
      <p style="margin:0;color:#64748b;font-size:13px;">Visite el portal para inscribirse y reservar su plaza.</p>
    `;

    const results = [];
    for (const dest of destinatarios) {
      await guardarNotificacionDB(dest.id, 'Nuevo curso: ' + curso.nombre, `Se ha registrado la actividad "${curso.nombre}" para el ${fechaFormateada}. Modalidad: ${curso.modalidad || 'Presencial'}. Costo: ${curso.costo > 0 ? 'Bs. ' + curso.costo : 'Sin costo'}.`);
      const result = await enviarEmail({
        to: { email: dest.email, name: dest.nombre },
        subject: `Nueva actividad academica: ${curso.nombre}`,
        htmlContent: baseTemplate('Nueva Actividad Academica', content, '#059669'),
      });
      results.push(result);
    }
    return results;
  },

  notificarInscripcionEvento: async ({ email, nombre, evento, miembroId }) => {
    const fechaFormateada = new Date(evento.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const content = `
      <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:700;">Inscripcion Confirmada</h2>
      <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
        Estimado/a <strong>${nombre}</strong>, su participacion en el siguiente evento ha sido registrada exitosamente.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:24px;">
        <tr>
          <td style="padding:20px;">
            <h3 style="margin:0 0 12px;color:#15803d;font-size:18px;font-weight:800;">${evento.nombre}</h3>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;">Fecha</td>
                <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${fechaFormateada}</td>
              </tr>
              ${evento.hora ? `
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;">Hora</td>
                <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${evento.hora.substring(0, 5)}</td>
              </tr>` : ''}
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;">Ubicacion</td>
                <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${evento.ubicacion || 'Por confirmar'}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="margin:0;color:#64748b;font-size:13px;">Le esperamos. Recuerde asistir puntualmente.</p>
    `;

    await guardarNotificacionDB(miembroId, 'Inscripcion confirmada: ' + evento.nombre, `Su inscripcion al evento "${evento.nombre}" ha sido confirmada. Fecha: ${fechaFormateada}. Ubicacion: ${evento.ubicacion || 'Por confirmar'}.`);

    return enviarEmail({
      to: { email, name: nombre },
      subject: `Inscripcion confirmada - ${evento.nombre}`,
      htmlContent: baseTemplate('Inscripcion Confirmada', content, '#15803d'),
    });
  },

  notificarInscripcionCurso: async ({ email, nombre, curso, miembroId }) => {
    const fechaFormateada = new Date(curso.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const content = `
      <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:700;">Inscripcion Academica Confirmada</h2>
      <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
        Estimado/a <strong>${nombre}</strong>, su inscripcion en la siguiente actividad academica ha sido procesada correctamente.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;margin-bottom:24px;">
        <tr>
          <td style="padding:20px;">
            <h3 style="margin:0 0 12px;color:#047857;font-size:18px;font-weight:800;">${curso.nombre}</h3>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;">Fecha de inicio</td>
                <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${fechaFormateada}</td>
              </tr>
              ${curso.hora ? `
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;">Hora</td>
                <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${curso.hora.substring(0, 5)}</td>
              </tr>` : ''}
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;">Modalidad</td>
                <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;text-transform:capitalize;">${curso.modalidad || 'Presencial'}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="margin:0;color:#64748b;font-size:13px;">Le deseamos exito en su capacitacion. Recuerde revisar los requisitos previos.</p>
    `;

    await guardarNotificacionDB(miembroId, 'Inscripcion confirmada: ' + curso.nombre, `Su inscripcion a la actividad "${curso.nombre}" ha sido confirmada. Fecha: ${fechaFormateada}. Modalidad: ${curso.modalidad || 'Presencial'}.`);

    return enviarEmail({
      to: { email, name: nombre },
      subject: `Inscripcion confirmada - ${curso.nombre}`,
      htmlContent: baseTemplate('Inscripcion Academica', content, '#059669'),
    });
  },

  enviarNotificacionGeneral: async ({ email, nombre, titulo, mensaje, tipo = 'info', miembroId }) => {
    const colores = {
      info: { accent: '#1e3a5f', bg: '#eff6ff', border: '#bfdbfe' },
      success: { accent: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
      warning: { accent: '#d97706', bg: '#fffbeb', border: '#fde68a' },
      error: { accent: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    };
    const c = colores[tipo] || colores.info;

    const content = `
      <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:700;">${titulo}</h2>
      <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
        Estimado/a <strong>${nombre}</strong>,
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${c.bg};border:1px solid ${c.border};border-radius:12px;margin-bottom:24px;">
        <tr>
          <td style="padding:20px;">
            <p style="margin:0;color:#334155;font-size:14px;line-height:1.7;">${mensaje}</p>
          </td>
        </tr>
      </table>
      <p style="margin:0;color:#64748b;font-size:13px;">Si tiene consultas, contacte a la administracion de la institucion.</p>
    `;

    await guardarNotificacionDB(miembroId, titulo, mensaje);

    return enviarEmail({
      to: { email, name: nombre },
      subject: titulo,
      htmlContent: baseTemplate(titulo, content, c.accent),
    });
  },
};
