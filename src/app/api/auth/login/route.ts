import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const emailInput = username ? username.trim().toLowerCase() : '';
    const passwordInput = password ? password.trim() : '';

    if (!emailInput || !passwordInput) {
      return NextResponse.json(
        { error: 'Por favor complete el correo y la contraseña.' },
        { status: 400 }
      );
    }

    // Buscar únicamente coincidencia por correo electrónico
    const usuario = await prisma.usuario.findFirst({
      where: {
        email: emailInput,
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'El usuario no existe en la base de datos.' },
        { status: 404 }
      );
    }

    if (!usuario.activo) {
      return NextResponse.json(
        { error: 'El usuario se encuentra dado de baja.' },
        { status: 403 }
      );
    }

    // Comprobar coincidencia exacta de contraseña guardada en la BD
    if (usuario.password !== passwordInput) {
      return NextResponse.json(
        { error: 'La contraseña ingresada es incorrecta.' },
        { status: 401 }
      );
    }

    // Respuesta exitosa
    return NextResponse.json({
      id: usuario.id,
      nombre: usuario.nombre,
      username: usuario.username,
      email: usuario.email,
      rol: usuario.rol,
    });
  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json(
      { error: 'Error interno en el servidor de autenticación.' },
      { status: 500 }
    );
  }
}