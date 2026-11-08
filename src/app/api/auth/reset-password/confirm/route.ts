import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { huellaReset, leerTokenReset } from '@/lib/auth';
import { consumirIntento } from '@/lib/rate-limit';
import { errorDePassword } from '@/lib/validar-usuario';

const VENTANA = 15 * 60 * 1000; // 15 minutos

// ✅ Regex para validar la fortaleza de la contraseña (misma que en validar-usuario.ts)
const RE_PASSWORD = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

function ipDe(request: Request): string {
  const reenviada = request.headers.get('x-forwarded-for');
  return (reenviada?.split(',')[0] ?? request.headers.get('x-real-ip') ?? 'local').trim();
}

export async function POST(request: Request) {
  try {
    const ip = ipDe(request);
    if (!consumirIntento(`reset-confirm|${ip}`, 5, VENTANA)) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Por seguridad, espere unos minutos.' },
        { status: 429 }
      );
    }

    const cuerpo: unknown = await request.json().catch(() => null);
    if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
      return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
    }
    
    const c = cuerpo as Record<string, unknown>;
    const token = typeof c.token === 'string' ? c.token.trim() : '';
    const password = typeof c.password === 'string' ? c.password : '';

    // ✅ CORRECCIÓN: Validar la fortaleza de la contraseña con la Regex.
    // Si no cumple, retornamos el mensaje de error centralizado.
    if (!RE_PASSWORD.test(password)) {
      return NextResponse.json({ error: errorDePassword('password') }, { status: 400 });
    }

    const datos = leerTokenReset(token);
    if (!datos) {
      return NextResponse.json(
        { error: 'El enlace de recuperación es inválido o ha expirado. Solicite uno nuevo.' },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: datos.id },
      select: { id: true, password: true, activo: true },
    });

    // Si no existe o está inactivo, mostramos el mismo error genérico por seguridad
    if (!usuario || !usuario.activo) {
      return NextResponse.json(
        { error: 'El enlace de recuperación es inválido o ha expirado. Solicite uno nuevo.' },
        { status: 400 }
      );
    }

    // Verificar que el token no haya sido usado (la huella debe coincidir con el password actual)
    if (datos.h !== huellaReset(usuario.password)) {
      return NextResponse.json(
        { error: 'Este enlace de recuperación ya fue utilizado. Solicite uno nuevo.' },
        { status: 400 }
      );
    }

    // Actualizar contraseña
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { password: await bcrypt.hash(password, 12) },
    });

    return NextResponse.json({ ok: true, message: 'Contraseña actualizada correctamente. Ya puede iniciar sesión.' });
  } catch (error) {
    console.error('[RESET-CONFIRM] Error crítico:', error);
    return NextResponse.json({ error: 'No se pudo procesar la solicitud. Intente nuevamente.' }, { status: 500 });
  }
}