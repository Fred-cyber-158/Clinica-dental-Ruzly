import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import { consumirIntento } from '@/lib/rate-limit';
import crypto from 'crypto';

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MINUTOS_RESET = 15;
const VENTANA = 15 * 60 * 1000; // 15 minutos

function ipDe(request: Request): string {
  const reenviada = request.headers.get('x-forwarded-for');
  return (reenviada?.split(',')[0] ?? request.headers.get('x-real-ip') ?? 'local').trim();
}

const escapeHtml = (valor: string) =>
  valor.replace(/[&<>"']/g, (c) => {
    const mapa: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return mapa[c];
  });

function plantilla(email: string, resetUrl: string): string {
  const correo = escapeHtml(email);
  const enlace = escapeHtml(resetUrl);
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Restablecimiento de Contraseña - Clínica Dental Ruzly</title></head>
<body style="margin:0;padding:0;background-color:#090d16;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#e2e8f0;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout:fixed;">
<tr><td align="center" style="padding:40px 15px;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:540px;background-color:#0d1527;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
<tr><td align="center" style="padding:35px 20px 25px 20px;background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%);border-bottom:1px solid #1e293b;">
<img src="https://img.icons8.com/isometric/100/tooth.png" alt="Clínica Dental Ruzly" width="56" height="56" style="display:block;margin:0 auto 10px auto;border:0;" />
<h1 style="margin:10px 0 0 0;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:1px;text-transform:uppercase;">CLÍNICA DENTAL RUZLY</h1>
<p style="margin:4px 0 0 0;font-size:11px;font-weight:600;color:#38bdf8;letter-spacing:1.5px;text-transform:uppercase;">Sistema de Gestión Integral</p>
</td></tr>
<tr><td style="padding:32px 30px;">
<h2 style="margin:0 0 12px 0;font-size:18px;font-weight:700;color:#f8fafc;">Solicitud de Restablecimiento de Contraseña</h2>
<p style="margin:0 0 20px 0;font-size:13px;line-height:1.6;color:#94a3b8;">
Hemos recibido una solicitud para restablecer la contraseña asociada a la cuenta <strong style="color:#cbd5e1;">${correo}</strong>.
Haga clic en el siguiente botón para crear una nueva credencial de acceso:
</p>
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:28px 0;"><tr><td align="center">
<a href="${enlace}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;border-radius:10px;text-transform:uppercase;letter-spacing:0.5px;">Restablecer Mi Contraseña</a>
</td></tr></table>
<div style="background-color:#1e293b;border-left:4px solid #f59e0b;border-radius:8px;padding:14px;margin-top:24px;">
<p style="margin:0;font-size:11px;line-height:1.5;color:#cbd5e1;"><strong>Aviso de seguridad:</strong> este enlace caduca en ${MINUTOS_RESET} minutos y solo puede usarse una vez. Si no solicitó este cambio, ignore este correo.</p>
</div>
<p style="margin:24px 0 0 0;font-size:11px;line-height:1.5;color:#64748b;word-break:break-all;">
Si el botón no funciona, copie y pegue esta URL en su navegador:<br>
<a href="${enlace}" style="color:#38bdf8;text-decoration:underline;">${enlace}</a>
</p>
</td></tr>
<tr><td align="center" style="padding:20px;background-color:#090d16;border-top:1px solid #1e293b;">
<p style="margin:0;font-size:11px;font-weight:600;color:#64748b;">&copy; 2026 Clínica Dental Ruzly — Cochabamba, Bolivia</p>
<p style="margin:4px 0 0 0;font-size:10px;color:#475569;">Correo automático. No responda a este mensaje.</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/**
 * ✅ CORRECCIÓN CRÍTICA: Genera un token decodificable y firmado.
 * Al incluir el passwordHash en la firma, si el usuario cambia su contraseña, 
 * este token se vuelve matemáticamente inválido de forma automática.
 */
function crearTokenReset(userId: string, passwordHash: string): string {
  const exp = Date.now() + MINUTOS_RESET * 60 * 1000;
  const payload = JSON.stringify({ id: userId, exp });
  const base64Payload = Buffer.from(payload).toString('base64url');
  
  // El secreto combina la clave maestra con el hash actual de la contraseña del usuario
  const secret = (process.env.AUTH_SECRET || 'fallback_secret') + passwordHash;
  const signature = crypto.createHmac('sha256', secret).update(base64Payload).digest('hex');
  
  return `${base64Payload}.${signature}`;
}

export async function POST(request: Request) {
  try {
    const cuerpo: unknown = await request.json().catch(() => null);
    
    // ✅ CORRECCIÓN: Limpieza segura de email (NO usar limpiarTexto que borra @ y .)
    const emailRaw = cuerpo && typeof cuerpo === 'object' && !Array.isArray(cuerpo)
      ? (cuerpo as Record<string, unknown>).email
      : '';
    
    const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';

    if (!email || !RE_EMAIL.test(email)) {
      return NextResponse.json({ error: 'Por favor proporcione un correo electrónico válido.' }, { status: 400 });
    }

    const ip = ipDe(request);
    
    // ✅ Rate limiting dual: protege infraestructura (IP) y cuenta (Email)
    if (!consumirIntento(`reset-ip|${ip}`, 5, VENTANA)) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes desde esta red. Espere unos minutos e intente de nuevo.' },
        { status: 429 }
      );
    }
    if (!consumirIntento(`reset-email|${email}`, 3, VENTANA)) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes para ese correo. Espere unos minutos.' },
        { status: 429 }
      );
    }

    const usuario = await prisma.usuario.findFirst({
      where: { email },
      select: { id: true, email: true, activo: true, password: true },
    });

    // ✅ Respuesta genérica: NUNCA revela si el correo está registrado (Prevención de enumeración)
    const respuesta = NextResponse.json({
      success: true,
      message: 'Si el correo está registrado y activo, recibirá las instrucciones de recuperación.',
    });

    if (!usuario || !usuario.activo || !usuario.email) return respuesta;

    const token = crearTokenReset(usuario.id, usuario.password);
    
    const baseUrl = process.env.APP_URL ?? new URL(request.url).origin;
    const resetUrl = `${baseUrl.replace(/\/+$/, '')}/login?reset=${encodeURIComponent(token)}`;

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);

    if (smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true para 465, false para 587
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: `"Clínica Dental Ruzly" <${smtpUser}>`,
        to: usuario.email,
        subject: 'Restablecimiento de contraseña - Clínica Dental Ruzly',
        html: plantilla(usuario.email, resetUrl),
      });
    } else if (process.env.NODE_ENV !== 'production') {
      console.warn('[reset-password] SMTP no configurado. Enlace de recuperación (DEV):', resetUrl);
    } else {
      console.warn('[reset-password] SMTP no configurado en producción; no se envió el correo.');
    }

    return respuesta;
  } catch (error) {
    console.error('[AUTH][RESET] Error crítico:', error);
    return NextResponse.json(
      { error: 'No se pudo procesar la solicitud. Intente nuevamente más tarde.' },
      { status: 500 }
    );
  }
}