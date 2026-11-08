import { NextResponse } from 'next/server';
import { Prisma, Rol } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { consumirIntento } from '@/lib/rate-limit'; // ✅ Protección contra spam de registros

// Expresiones regulares para validación estricta
const RE_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .\-]{3,80}$/;
const RE_USERNAME = /^[a-z0-9_]{3,20}$/;
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// ✅ Contraseña fuerte: Mínimo 8 caracteres, 1 mayúscula, 1 número, 1 carácter especial
const RE_PASSWORD = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// 🚨 CRÍTICO: Solo permitimos que el público se registre como PACIENTE.
// Los roles ADMINISTRADOR y ODONTOLOGO deben crearse desde el panel interno protegido.
const ROLES_PUBLICOS_VALIDOS: Rol[] = ['PACIENTE'];

export async function POST(request: Request) {
  try {
    // 1. Parseo seguro del cuerpo
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Los datos enviados no tienen el formato correcto.' },
        { status: 400 }
      );
    }

    const { nombre, username, password, email, rol } = body;

    // 2. Rate Limiting (Máximo 3 registros por IP cada 15 minutos)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown-ip';
    const llaveRateLimit = `register:${ip}`;
    
    if (!consumirIntento(llaveRateLimit, 3, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Demasiados intentos de registro. Por seguridad, espere 15 minutos.' },
        { status: 429 }
      );
    }

    // 3. Validaciones estrictas de formato
    if (!nombre || !username || !password || !rol) {
      return NextResponse.json(
        { error: 'Los campos nombre, usuario, contraseña y rol son obligatorios.' },
        { status: 400 }
      );
    }

    const nombreLimpio = String(nombre).trim().toUpperCase();
    if (!RE_NOMBRE.test(nombreLimpio)) {
      return NextResponse.json(
        { error: 'El nombre debe tener entre 3 y 80 caracteres, usando solo letras, espacios y guiones.' },
        { status: 400 }
      );
    }

    const usernameLimpio = String(username).trim().toLowerCase();
    if (!RE_USERNAME.test(usernameLimpio)) {
      return NextResponse.json(
        { error: 'El usuario debe tener entre 3 y 20 caracteres, usando solo letras minúsculas, números y guión bajo (_).' },
        { status: 400 }
      );
    }

    // ✅ Validación de contraseña fuerte
    if (!RE_PASSWORD.test(String(password))) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial (ej: @, $, !).' },
        { status: 400 }
      );
    }

    // ✅ Validación y cast seguro al Enum de Prisma (Restringido a roles públicos)
    const rolInput = String(rol).trim().toUpperCase();
    if (!ROLES_PUBLICOS_VALIDOS.includes(rolInput as Rol)) {
      return NextResponse.json(
        { error: 'El registro público está habilitado exclusivamente para pacientes.' },
        { status: 400 }
      );
    }
    const rolLimpio = rolInput as Rol;

    let emailLimpio: string | null = null;
    if (email && String(email).trim() !== '') {
      emailLimpio = String(email).trim().toLowerCase();
      if (!RE_EMAIL.test(emailLimpio)) {
        return NextResponse.json(
          { error: 'El formato del correo electrónico no es válido.' },
          { status: 400 }
        );
      }
    }

    // 4. Verificación de duplicados
    const duplicado = await prisma.usuario.findFirst({
      where: {
        OR: [
          { username: usernameLimpio },
          ...(emailLimpio ? [{ email: emailLimpio }] : []),
        ],
      },
    });

    if (duplicado) {
      if (duplicado.username === usernameLimpio) {
        return NextResponse.json(
          { error: `El usuario "@${usernameLimpio}" ya está registrado. Elija otro.` },
          { status: 409 }
        );
      }
      if (emailLimpio && duplicado.email === emailLimpio) {
        return NextResponse.json(
          { error: `El correo "${emailLimpio}" ya está registrado.` },
          { status: 409 }
        );
      }
    }

    // 5. Hasheo seguro de la contraseña
    const passwordHash = await bcrypt.hash(String(password), 12);

    // 6. Creación del usuario en la base de datos (Transacción atómica implícita)
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre: nombreLimpio,
        username: usernameLimpio,
        password: passwordHash,
        email: emailLimpio,
        rol: rolLimpio,
        activo: false,                // ❌ No puede ingresar hasta ser aprobado
        pendienteAprobacion: true,    // ⏳ Requiere aprobación del administrador
      },
      select: {
        id: true,
        nombre: true,
        username: true,
        email: true,
        rol: true,
        activo: true,
        pendienteAprobacion: true,
        createdAt: true,
      },
    });

    // 7. Respuesta de éxito (Sin exponer datos sensibles)
    return NextResponse.json(
      {
        success: true,
        message: '✅ Registro exitoso. Su cuenta está PENDIENTE DE APROBACIÓN. El administrador revisará su solicitud.',
        usuario: {
          id: nuevoUsuario.id,
          nombre: nuevoUsuario.nombre,
          username: nuevoUsuario.username,
          rol: nuevoUsuario.rol,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[AUTH][REGISTER] Error crítico:', error);
    
    // ✅ MEJORA: Uso del código de error específico de Prisma para duplicados
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un usuario con esos datos únicos. Intente con otros diferentes.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor al procesar el registro.' },
      { status: 500 }
    );
  }
}