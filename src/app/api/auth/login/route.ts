import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { COOKIE_SESION, HORAS_SESION, crearToken } from '@/lib/auth';
import { consumirIntento } from '@/lib/rate-limit';       // ✅ Utilidad centralizada del proyecto
import { validarLogin } from '@/lib/validar-login';       // ✅ Validación centralizada del proyecto

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // 1. Validación estricta centralizada (Previene inyección de tipos y campos vacíos)
    const validacion = validarLogin(body);
    if (!validacion.ok) {
      return NextResponse.json(
        { error: Object.values(validacion.errores)[0] },
        { status: 400 }
      );
    }

    const { username: ident, password: clave } = validacion.data;

    // 2. Rate Limiting centralizado (5 intentos cada 10 minutos por IP + usuario)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown-ip';
    const llaveRateLimit = `login:${ip}:${ident.toLowerCase()}`;

    if (!consumirIntento(llaveRateLimit, 5, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Demasiados intentos fallidos. Por seguridad, espere 10 minutos antes de intentar nuevamente.' },
        { status: 429 }
      );
    }

    // 3. Búsqueda segura (Principio de Mínimo Privilegio)
    const usuario = await prisma.usuario.findFirst({
      where: {
        OR: [
          { email: ident.toLowerCase() },
          { username: ident.toLowerCase() },
        ],
      },
      select: {
        id: true,
        nombre: true,
        username: true,
        email: true,
        password: true,
        rol: true,
        activo: true,
        pendienteAprobacion: true,
      },
    });

    // 4. Verificación de credenciales (Prevención de enumeración de usuarios - OWASP)
    let valido = false;
    if (usuario) {
      if (usuario.password.startsWith('$2a$') || usuario.password.startsWith('$2b$')) {
        valido = await bcrypt.compare(clave, usuario.password);
      } else {
        // Migración transparente: si la contraseña antigua coincide, la actualizamos a bcrypt silenciosamente
        if (usuario.password === clave) {
          valido = true;
          await prisma.usuario.update({
            where: { id: usuario.id },
            data: { password: await bcrypt.hash(clave, 12) },
          });
        }
      }
    }

    if (!usuario || !valido) {
      // Mensaje genérico intencional: no revela si el usuario existe o no
      return NextResponse.json(
        { error: 'Credenciales incorrectas. Verifique sus datos e intente de nuevo.' },
        { status: 401 }
      );
    }

    // 5. Validación de estado de la cuenta
    if (usuario.pendienteAprobacion) {
      return NextResponse.json(
        { error: 'Su cuenta está pendiente de aprobación por el administrador.' },
        { status: 403 }
      );
    }

    if (!usuario.activo) {
      return NextResponse.json(
        { error: 'Su cuenta ha sido dada de baja. Contacte al administrador.' },
        { status: 403 }
      );
    }

    // 6. Éxito: Generar token y configurar cookie de sesión
    // ✅ CORRECCIÓN: Se agregó 'await' porque crearToken ahora es una función asíncrona
    const token = await crearToken(usuario.id, usuario.rol);
    
    const res = NextResponse.json({
      success: true, // ✅ Flag útil para el frontend
      id: usuario.id,
      nombre: usuario.nombre,
      username: usuario.username,
      email: usuario.email,
      rol: usuario.rol,
    });

    res.cookies.set(COOKIE_SESION, token, {
      httpOnly: true,                          // Inaccesible desde JS (Anti-XSS)
      sameSite: 'lax',                         // Protección básica Anti-CSRF
      secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
      path: '/',
      maxAge: HORAS_SESION * 3600,
    });

    return res;
  } catch (error) {
    // Log con prefijo para facilitar el monitoreo en servidores de producción
    console.error('[AUTH][LOGIN] Error crítico:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error interno al procesar su solicitud. Intente más tarde.' },
      { status: 500 }
    );
  }
}