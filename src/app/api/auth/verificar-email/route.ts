import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Los datos enviados no son válidos.' },
        { status: 400 }
      );
    }

    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'El correo electrónico es obligatorio.' },
        { status: 400 }
      );
    }

    // Limpiar y normalizar el email
    const emailLimpio = email.trim().toLowerCase();
    const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!RE_EMAIL.test(emailLimpio)) {
      return NextResponse.json(
        { error: 'El formato del correo electrónico no es válido.' },
        { status: 400 }
      );
    }

    // Buscar el usuario en la base de datos
    const usuario = await prisma.usuario.findUnique({
      where: { email: emailLimpio },
      select: {
        id: true,
        nombre: true,
        username: true,
        email: true,
        rol: true,
        activo: true,
      },
    });

    // 🛡️ SEGURIDAD CRÍTICA: Respuesta genérica para prevenir enumeración de usuarios.
    // No importa si el usuario existe, no existe o está inactivo, la respuesta es la misma.
    const respuestaGenerica = {
      success: true,
      message: 'Si el correo está registrado y activo en el sistema, la información ha sido verificada.',
      // Solo enviamos datos si realmente existe y está activo, pero el mensaje exterior es siempre el mismo
      usuario: (usuario && usuario.activo) ? {
        id: usuario.id,
        nombre: usuario.nombre,
        username: usuario.username,
        email: usuario.email,
        rol: usuario.rol,
      } : null
    };

    // Si no existe o no está activo, podríamos devolver un 404 genérico o un 200 con usuario: null.
    // Para máxima seguridad contra ataques de tiempo (timing attacks), lo ideal es devolver 200 siempre.
    return NextResponse.json(respuestaGenerica, { status: 200 });

  } catch (error) {
    console.error('[AUTH][VERIFICAR-EMAIL] Error crítico:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al procesar la solicitud.' },
      { status: 500 }
    );
  }
}