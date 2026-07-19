import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// SEC-10: Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Límite de 10 creaciones/cambios de contraseña por IP
  message: { error: 'Demasiadas peticiones. Intenta de nuevo más tarde.' }
});

const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // Límite de 20 emails por IP
  message: { error: 'Límite de correos alcanzado. Intenta de nuevo más tarde.' }
});

app.use('/api/admin/', authLimiter);
app.use('/api/emails/', emailLimiter);

// Require env variables
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BREVO_API_KEY, BREVO_SENDER_EMAIL } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend.");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
});

// Helper for sending Brevo emails
const sendBrevoEmail = async (toEmail, toName, subject, htmlContent) => {
  if (!BREVO_API_KEY) {
    console.warn("BREVO_API_KEY no configurado, simulando envío de email a:", toEmail);
    return { messageId: 'simulated-id' };
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: 'Asociación de Profesionales Financieros', email: BREVO_SENDER_EMAIL || 'notificaciones@controlfinanciero.org' },
      to: [{ email: toEmail, name: toName }],
      subject: subject,
      htmlContent: htmlContent,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error Brevo API: ${errorBody}`);
  }

  return await response.json();
};


/**
 * API: /api/admin/miembros/crear
 * Crea un usuario de Auth (bypass RLS)
 */
app.post('/api/admin/miembros/crear', async (req, res) => {
  try {
    const { email, password, nombre, rol, telefono, apellidoPaterno, apellidoMaterno, monto_inscripcion } = req.body;
    
    // 1. Create the user in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { rol, full_name: `${nombre} ${apellidoPaterno} ${apellidoMaterno}`.trim() }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // 2. The DB trigger handle_new_user should have created the record in public.miembro.
    // We update the extra fields like telefono, profesion using the service_role key to bypass RLS.
    const { error: updateError } = await supabaseAdmin
      .from('miembro')
      .update({
        telefono,
        "apellidoPaterno": apellidoPaterno,
        "apellidoMaterno": apellidoMaterno,
        monto_inscripcion
      })
      .eq('id', authData.user.id);

    if (updateError) {
      console.error("Error updating member profile:", updateError);
      // Optional: Delete user if profile creation failed to keep consistency
    }

    res.status(201).json({ user: authData.user });
  } catch (err) {
    console.error("Error creating member:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});


/**
 * API: /api/admin/miembros/actualizar-password
 * Actualiza la contraseña de un usuario (admin only task)
 */
app.post('/api/admin/miembros/actualizar-password', async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({ error: 'Faltan datos requeridos (userId, newPassword)' });
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({ success: true, message: 'Contraseña actualizada' });
  } catch (err) {
    console.error("Error updating password:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

/**
 * API: /api/emails/send
 * Envía emails transaccionales (recibos)
 */
app.post('/api/emails/send', async (req, res) => {
  try {
    const { toEmail, toName, subject, htmlContent } = req.body;
    
    if (!toEmail || !subject || !htmlContent) {
      return res.status(400).json({ error: 'Faltan parámetros de email requeridos' });
    }

    const result = await sendBrevoEmail(toEmail, toName, subject, htmlContent);
    res.status(200).json({ success: true, result });
  } catch (err) {
    console.error("Error sending email:", err);
    res.status(500).json({ error: "Error enviando email" });
  }
});


app.listen(port, () => {
  console.log(`✅ Sec Backend corriendo en http://localhost:${port}`);
});
