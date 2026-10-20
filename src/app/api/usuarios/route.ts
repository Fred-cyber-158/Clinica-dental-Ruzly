import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Rol } from '@prisma/client';

export async function GET() {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nombre: true,
        username: true,
        email: true,
        rol: true,
        activo: true,
        createdAt: true,
        pacienteId: true,
      },
    });
    return NextResponse.json(usuarios, { status: 200 });
  } catch (error: unknown) {
    console.error('Error GET /api/usuarios:', error);
    return NextResponse.json(
      { error: 'Error al obtener el listado de usuarios.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, username, password, email, rol, pacienteId } = body;

    if (!nombre || !username || !password) {
      return NextResponse.json(
        { error: '⚠️ El nombre completo, usuario y contraseña son campos obligatorios.' },
        { status: 400 }
      );
    }

    const usernameClean = String(username).replace(/[@\s]/g, '').trim().toLowerCase();

    // Verificación de duplicados en el nombre de usuario
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { username: usernameClean },
    });

    if (usuarioExistente) {
      return NextResponse.json(
        { error: `⚠️ El nombre de usuario "@${usernameClean}" ya está registrado. Elija otro usuario.` },
        { status: 400 }
      );
    }

    // Mapeo exacto hacia las claves del Enum de Prisma en tu proyecto
    let rolFinal: Rol = Rol.PACIENTE;
    const rolInput = String(rol || '').toUpperCase();

    if (rolInput.includes('ADMIN')) {
      rolFinal = Rol.ADMINISTRADOR;
    } else if (rolInput.includes('ODONTO')) {
      rolFinal = Rol.ODONTO_LOGO; // Coincide con el Enum de tu schema.prisma
    } else if (rolInput.includes('RECEPCION')) {
      rolFinal = Rol.RECEPCIONISTA;
    } else if (rolInput.includes('PACIENTE')) {
      rolFinal = Rol.PACIENTE;
    }

    // Inserción en la base de datos
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre: String(nombre).trim().toUpperCase(),
        username: usernameClean,
        password: String(password).trim(),
        email: email && email.trim() ? String(email).trim().toLowerCase() : null,
        rol: rolFinal,
        pacienteId: pacienteId || null,
        activo: true,
      },
    });

    return NextResponse.json(
      {
        id: nuevoUsuario.id,
        nombre: nuevoUsuario.nombre,
        username: nuevoUsuario.username,
        rol: nuevoUsuario.rol,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error al registrar usuario:', error);
    const errObj = error as { code?: string; meta?: { target?: string[] }; message?: string };

    if (errObj?.code === 'P2002') {
      return NextResponse.json(
        { error: '⚠️ El correo electrónico o nombre de usuario ya están registrados.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: `⚠️ Error de Base de Datos: ${errObj?.message || 'No se pudo completar el registro.'}` },
      { status: 500 }
    );
  }
}