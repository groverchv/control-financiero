/**
 * Servicio de correo electronico transaccional con Brevo
 *
 * UNICO USO: Envio de emails relacionados a cuotas de membresia:
 *  1. notificarPagoPendiente  → Factura cuando se genera una cuota
 *  2. notificarPagoRegistrado → Recibo cuando se registra el pago
 *
 * Todas las demas notificaciones del sistema se gestionan
 * internamente en la tabla `notificacion` de la base de datos.
 */
import { supabase } from './supabase';

const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const SENDER = {
  name: 'Control Financiero Institucional',
  email: import.meta.env.VITE_BREVO_SENDER_EMAIL || 'notificaciones@controlfinanciero.org'
};

// ─── Utilidades ────────────────────────────────────────────────────────────────

const formatFecha = (fechaStr) => {
  if (!fechaStr) return '—';
  try {
    const date = new Date(fechaStr);
    if (isNaN(date.getTime())) return String(fechaStr);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return String(fechaStr);
  }
};

const formatMonto = (monto) =>
  new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(monto) || 0);

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
                Este correo es generado automaticamente, no responda a este mensaje.
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
 * Verifica que el miembro este activo antes de enviar email.
 * Retorna true si puede recibir notificaciones.
 */
const miembroActivo = async (miembroId) => {
  if (!miembroId) return true;
  const { data } = await supabase.from('miembro').select('estado').eq('id', miembroId).maybeSingle();
  return !data || data.estado !== 'inactivo';
};

// ─── Emails de cuotas ──────────────────────────────────────────────────────────

export const brevoService = {

  /**
   * FACTURA DE CUOTA GENERADA
   * Se envia cuando el sistema detecta una nueva cuota pendiente.
   * Si el socio tiene deudas anteriores, se muestran en el email.
   *
   * @param {string} params.email         Correo del socio
   * @param {string} params.nombre        Nombre completo del socio
   * @param {number} params.monto         Monto de la cuota actual
   * @param {string} params.periodoKey    Periodo (ej: "2025-06")
   * @param {string} params.miembroId     ID del miembro
   * @param {Array}  params.deudasExtra   Cuotas anteriores pendientes [{mes, monto}]
   */
  notificarPagoPendiente: async ({ email, nombre, monto, periodoKey, miembroId, deudasExtra = [] }) => {
    if (!await miembroActivo(miembroId)) return { success: false, error: 'Miembro inactivo' };

    // Formatear periodoKey para el asunto de forma amigable (ej: "Min 1/6/2026 14:27" -> "Junio 2026")
    const parsePeriodoToNombre = (periodoStr) => {
      if (!periodoStr) return 'Membresía';
      const cleanStr = periodoStr.replace(/^(Min|Día|Sem)\s+/, '');
      const matchSpanish = cleanStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (matchSpanish) {
        const mesNombre = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][Number(matchSpanish[2]) - 1];
        return `${mesNombre} ${matchSpanish[3]}`;
      }
      const matchIso = cleanStr.match(/^(\d{4})-(\d{2})$/);
      if (matchIso) {
        const mesNombre = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][Number(matchIso[2]) - 1];
        return `${mesNombre} ${matchIso[1]}`;
      }
      return cleanStr;
    };

    const periodoLimpio = parsePeriodoToNombre(periodoKey);
    const hayDeudasExtra = deudasExtra.length > 0;
    const totalDeuda = deudasExtra.reduce((acc, d) => acc + Number(d.monto || monto), Number(monto));

    const filasDeudaExtra = hayDeudasExtra
      ? deudasExtra.map(d => `
          <tr style="border-top:1px solid #edf2f7;">
            <td style="padding:10px 0;color:#64748b;font-size:13px;font-weight:600;">Cuota pendiente: ${parsePeriodoToNombre(d.mes)}</td>
            <td style="padding:10px 0;color:#d97706;font-size:13px;font-weight:700;text-align:right;">Bs. ${formatMonto(d.monto || monto)}</td>
          </tr>`).join('')
      : '';

    const content = `
      <h2 style="margin:0 0 4px;color:#d97706;font-size:22px;font-weight:800;text-align:center;">FACTURA DE CUOTA</h2>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:12px;text-align:center;text-transform:uppercase;letter-spacing:1px;">Aviso de cobro generado automáticamente</p>

      <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
        Estimado/a <strong>${nombre}</strong>, te informamos que se ha generado tu cuota de membresía correspondiente al período de <strong>${periodoLimpio}</strong>.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:12px;margin-bottom:${hayDeudasExtra ? '16px' : '24px'};">
        <tr>
          <td style="padding:20px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 0;color:#78716c;font-size:13px;font-weight:600;">Concepto</td>
                <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">Cuota de membresía</td>
              </tr>
              <tr style="border-top:1px solid #fde68a;">
                <td style="padding:8px 0;color:#78716c;font-size:13px;font-weight:600;">Período</td>
                <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${periodoLimpio}</td>
              </tr>
              <tr style="border-top:1px solid #fde68a;">
                <td style="padding:8px 0;color:#78716c;font-size:13px;font-weight:600;">Estado de Pago</td>
                <td style="padding:8px 0;color:#b45309;font-size:13px;font-weight:700;text-align:right;">⚠ Pendiente</td>
              </tr>
              <tr style="border-top:1px solid #fde68a;">
                <td style="padding:10px 0 0;color:#78716c;font-size:13px;font-weight:600;">Monto Cuota</td>
                <td style="padding:10px 0 0;color:#d97706;font-size:22px;font-weight:800;text-align:right;">Bs. ${formatMonto(monto)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      ${hayDeudasExtra ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef3c7;border:1px solid #fcd34d;border-radius:12px;margin-bottom:24px;">
        <tr>
          <td style="padding:16px 24px;">
            <p style="margin:0 0 12px;color:#92400e;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">⚠ También tienes cuotas pendientes anteriores:</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${filasDeudaExtra}
              <tr style="border-top:2px solid #fcd34d;">
                <td style="padding:12px 0 0;color:#92400e;font-size:14px;font-weight:800;">TOTAL ADEUDADO</td>
                <td style="padding:12px 0 0;color:#b45309;font-size:18px;font-weight:800;text-align:right;">Bs. ${formatMonto(totalDeuda)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>` : ''}

      <div style="background-color:#fffbeb;border-radius:8px;padding:12px 20px;margin-bottom:20px;text-align:center;">
        <p style="margin:0;color:#b45309;font-size:13px;font-weight:700;">Acérquese a secretaría para realizar su pago.</p>
      </div>
    `;

    if (!email || email === 'no-reply@control.com') return { success: true };

    return enviarEmail({
      to: { email, name: nombre },
      subject: `[Control Financiero] 📑 Aviso de Cobro — Cuota de Membresía de ${periodoLimpio}`,
      htmlContent: baseTemplate('Factura de Cuota', content, '#d97706'),
    });
  },

  /**
   * RECIBO DE PAGO DE CUOTA
   * Se envia cuando se confirma el pago de una cuota.
   * Detalla el concepto, monto, fecha y estado de deuda restante.
   *
   * @param {string} params.email                 Correo del socio
   * @param {string} params.nombre                Nombre completo del socio
   * @param {number} params.monto                 Monto pagado
   * @param {string} params.fecha                 Fecha del pago
   * @param {string} params.concepto              Descripcion del pago (ej: "Cuota 2025-06")
   * @param {string} params.miembroId             ID del miembro
   * @param {string} params.registradoPorNombre   Nombre del admin que registro el pago
   * @param {number} params.cuotasPendientes      Cuotas restantes despues de este pago
   */
  notificarPagoRegistrado: async ({
    email, nombre, monto, fecha, concepto = 'Cuota de membresía',
    miembroId, registradoPorNombre, cuotasPendientes = 0
  }) => {
    if (!await miembroActivo(miembroId)) return { success: false, error: 'Miembro inactivo' };

    const fechaPago = formatFecha(fecha);
    const montoFormateado = formatMonto(monto);
    const numeroRecibo = `RCP-${Date.now().toString().slice(-8)}`;

    const content = `
      <h2 style="margin:0 0 4px;color:#16a34a;font-size:22px;font-weight:800;text-align:center;">RECIBO DE PAGO</h2>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:12px;text-align:center;text-transform:uppercase;letter-spacing:1px;">Comprobante digital — ${numeroRecibo}</p>

      <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
        Estimado/a <strong>${nombre}</strong>, nos complace confirmar que tu pago ha sido registrado y procesado exitosamente en nuestra secretaría:
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:1px solid #86efac;border-radius:12px;margin-bottom:24px;">
        <tr>
          <td style="padding:20px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:600;">N° Recibo</td>
                <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${numeroRecibo}</td>
              </tr>
              <tr style="border-top:1px solid #bbf7d0;">
                <td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:600;">Concepto</td>
                <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${concepto}</td>
              </tr>
              <tr style="border-top:1px solid #bbf7d0;">
                <td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:600;">Fecha de Pago</td>
                <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${fechaPago}</td>
              </tr>
              ${registradoPorNombre ? `
              <tr style="border-top:1px solid #bbf7d0;">
                <td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:600;">Registrado por</td>
                <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${registradoPorNombre}</td>
              </tr>` : ''}
              <tr style="border-top:1px solid #bbf7d0;">
                <td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:600;">Estado de Transacción</td>
                <td style="padding:8px 0;color:#16a34a;font-size:13px;font-weight:700;text-align:right;">✓ Confirmado y Sellado</td>
              </tr>
              <tr style="border-top:1px solid #bbf7d0;">
                <td style="padding:12px 0 0;color:#166534;font-size:14px;font-weight:800;">MONTO PAGADO</td>
                <td style="padding:12px 0 0;color:#16a34a;font-size:24px;font-weight:800;text-align:right;">Bs. ${montoFormateado}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <div style="background-color:#dcfce7;border-radius:8px;padding:12px 20px;margin-bottom:${cuotasPendientes > 0 ? '16px' : '0'};text-align:center;">
        <p style="margin:0;color:#166534;font-size:14px;font-weight:700;">✔ COMPROBANTE DE PAGO REGISTRADO</p>
      </div>

      ${cuotasPendientes > 0 ? `
      <div style="background-color:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px 20px;text-align:center;">
        <p style="margin:0;color:#92400e;font-size:13px;font-weight:600;">
          ⚠ Recuerda que aún tienes <strong>${cuotasPendientes}</strong> cuota(s) pendiente(s) de pago en tu cuenta.
        </p>
      </div>` : ''}
    `;

    if (!email || email === 'no-reply@control.com') return { success: true };

    return enviarEmail({
      to: { email, name: nombre },
      subject: `[Control Financiero] ✅ Confirmación de Pago — Recibo de ${concepto}`,
      htmlContent: baseTemplate('Recibo de Pago', content, '#16a34a'),
    });
  },

  /**
   * BIENVENIDA AL NUEVO MIEMBRO
   * Se envia cuando se registra un usuario en el sistema.
   * Funciona con cualquier tipo de correo (Google, institucional, etc.)
   *
   * @param {string} params.email     Correo del socio
   * @param {string} params.nombre    Nombre completo o primer nombre del socio
   * @param {string} params.rol       Rol asignado al usuario
   */
  enviarBienvenida: async ({ email, nombre, rol }) => {
    const rolFormateado = rol ? (rol.charAt(0).toUpperCase() + rol.slice(1)) : 'Miembro';
    const content = `
      <h2 style="margin:0 0 4px;color:#1e3a5f;font-size:22px;font-weight:800;text-align:center;">¡TE DAMOS LA BIENVENIDA!</h2>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:12px;text-align:center;text-transform:uppercase;letter-spacing:1px;">Tu cuenta ha sido creada exitosamente</p>

      <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
        Estimado/a <strong>${nombre}</strong>, nos alegra mucho darte la bienvenida a nuestra institucion. Tu cuenta de acceso al sistema de <strong>Control Financiero</strong> ya esta activa.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:24px;">
        <tr>
          <td style="padding:20px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:600;">Correo Registrado</td>
                <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${email}</td>
              </tr>
              <tr style="border-top:1px solid #edf2f7;">
                <td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:600;">Rol asignado</td>
                <td style="padding:8px 0;color:#1e3a5f;font-size:13px;font-weight:700;text-align:right;">${rolFormateado}</td>
              </tr>
              <tr style="border-top:1px solid #edf2f7;">
                <td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:600;">Estado de la cuenta</td>
                <td style="padding:8px 0;color:#16a34a;font-size:13px;font-weight:700;text-align:right;">✓ Activo</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;text-align:center;">
        Ahora puedes iniciar sesion para ver tus actividades academicas, estado de cuenta, realizar pagos de cuotas y mas.
      </p>

      <div style="text-align:center;margin-bottom:24px;">
        <a href="${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'}" style="display:inline-block;background-color:#1e3a5f;color:#ffffff;padding:12px 28px;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;box-shadow:0 4px 12px rgba(30,58,95,0.2);">
          Acceder al Portal
        </a>
      </div>
    `;

    if (!email || email === 'no-reply@control.com') return { success: true };

    return enviarEmail({
      to: { email, name: nombre },
      subject: `[Control Financiero] 🌟 ¡Tu cuenta ha sido creada con éxito! Bienvenida`,
      htmlContent: baseTemplate('Bienvenida', content, '#1e3a5f'),
    });
  },
};
