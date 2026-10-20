import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Por favor proporcione un correo electrónico válido.' },
        { status: 400 }
      );
    }

    const resetUrl = `http://localhost:3000/login?reset=true&email=${encodeURIComponent(email)}`;
    
    // URL pública del logotipo para correos electrónicos (o un CDN/servidor público)
    const logoUrl = 'https://img.icons8.com/isometric/100/tooth.png';

    // Plantilla HTML con Logo Oficial
    const htmlEmail = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Restablecimiento de Contraseña - Clínica Dental Ruzly</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #090d16; font-family: 'Segoe UI', Helvetica, Arial, sans-serif; color: #e2e8f0;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
          <tr>
            <td align="center" style="padding: 40px 15px;">
              
              <!-- Contenedor Principal / Tarjeta -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #0d1527; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                
                <!-- Encabezado con Logo y Gradiente Corporativo -->
                <tr>
                  <td align="center" style="padding: 35px 20px 25px 20px; background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); border-bottom: 1px solid #1e293b;">
                    
                    <!-- Imagen del Logotipo -->
                    <img src="${logoUrl}" alt="Logo Clínica Dental Ruzly" width="60" height="60" style="display: block; margin: 0 auto 10px auto; border: 0; outline: none; text-decoration: none;" />

                    <h1 style="margin: 10px 0 0 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 1px; text-transform: uppercase;">
                      CLÍNICA DENTAL RUZLY
                    </h1>
                    <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 600; color: #38bdf8; letter-spacing: 1.5px; text-transform: uppercase;">
                      Sistema de Gestión Integral
                    </p>
                  </td>
                </tr>

                <!-- Cuerpo del Mensaje -->
                <tr>
                  <td style="padding: 32px 30px;">
                    <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #f8fafc;">
                      Solicitud de Restablecimiento de Contraseña
                    </h2>
                    
                    <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.6; color: #94a3b8;">
                      Hemos recibido una solicitud para restablecer la contraseña asociada a tu cuenta (<strong style="color: #cbd5e1;">${email}</strong>). Haz clic en el siguiente botón para crear tu nueva credencial de acceso:
                    </p>

                    <!-- Botón Call to Action -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                            Restablecer Mi Contraseña
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Bloque de Advertencia / Seguridad -->
                    <div style="background-color: #1e293b; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 14px; margin-top: 24px;">
                      <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #cbd5e1;">
                        <strong>⚠️ Aviso de Seguridad:</strong> Este enlace caducará en 30 minutos. Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
                      </p>
                    </div>

                    <!-- Enlace Alternativo directo -->
                    <p style="margin: 24px 0 0 0; font-size: 11px; line-height: 1.5; color: #64748b; word-break: break-all;">
                      Si el botón no funciona, copia y pega la siguiente URL en tu navegador:<br>
                      <a href="${resetUrl}" style="color: #38bdf8; text-decoration: underline;">${resetUrl}</a>
                    </p>
                  </td>
                </tr>

                <!-- Pie de Página -->
                <tr>
                  <td align="center" style="padding: 20px; background-color: #090d16; border-top: 1px solid #1e293b;">
                    <p style="margin: 0; font-size: 11px; font-weight: 600; color: #64748b;">
                      &copy; 2026 Clínica Dental Ruzly — Cochabamba, Bolivia
                    </p>
                    <p style="margin: 4px 0 0 0; font-size: 10px; color: #475569;">
                      Este es un correo automático generado por la plataforma web. No responda a este mensaje.
                    </p>
                  </td>
                </tr>

              </table>

            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: '"Clínica Dental Ruzly" <' + smtpUser + '>',
        to: email,
        subject: '🔐 Restablecimiento de Contraseña - Clínica Dental Ruzly',
        html: htmlEmail,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Instrucciones enviadas al correo: ${email}`,
    });
  } catch (error) {
    console.error('Error al enviar correo:', error);
    return NextResponse.json(
      { error: 'No se pudo enviar el correo. Verifique su conexión o credenciales SMTP.' },
      { status: 500 }
    );
  }
}