import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Rol } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { COOKIE_SESION, verificarToken } from '@/lib/auth';

// ✅ Alias de tipo para mantener la semántica de la aplicación sin duplicar el Enum
export type RolApp = Rol;

export interface UsuarioAutenticado {
  id: string;
  nombre: string;
  rol: RolApp;
  pacienteId: string | null;
}

/**
 * Obtiene el usuario autenticado a partir de la cookie de sesión.
 * Realiza una consulta ligera a la BD para verificar que el usuario exista y siga activo.
 * 
 * @returns El objeto UsuarioAutenticado si es válido, o null si la sesión es inválida, expiró o el usuario fue dado de baja.
 */
export async function usuarioAutenticado(): Promise<UsuarioAutenticado | null> {
  try {
    // Next.js 15+: cookies() debe ser awaitado
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_SESION)?.value;

    // Verificar la integridad y expiración del token criptográfico
    const sesion = await verificarToken(token);
    
    // Si no hay token o la firma es inválida, retornamos null sin tocar la base de datos
    if (!sesion) return null;

    // Consulta ultra-ligera: solo traemos los campos estrictamente necesarios para la sesión
    const u = await prisma.usuario.findUnique({
      where: { id: sesion.id },
      select: {
        id: true,
        nombre: true,
        rol: true,
        activo: true,
        pacienteId: true,
      },
    });

    // Si el usuario no existe o fue dado de baja (soft delete), denegamos el acceso
    if (!u || !u.activo) return null;

    return {
      id: u.id,
      nombre: u.nombre,
      rol: u.rol,
      pacienteId: u.pacienteId,
    };
  } catch (error) {
    // Fail-Safe: Si hay un error de BD (ej. desconexión), retornamos null para forzar el login
    // en lugar de dejar que la API route falle con un 500 inesperado.
    console.error('[SESION] Error crítico al validar usuario autenticado:', error);
    return null;
  }
}

/**
 * Genera una respuesta HTTP 401 (Unauthorized) estandarizada.
 * Se utiliza cuando el token falta, está manipulado o ha expirado.
 */
export const noAutorizado = () =>
  NextResponse.json(
    { error: 'Sesión no válida o vencida. Por favor, inicie sesión nuevamente.' },
    { status: 401 }
  );

/**
 * Genera una respuesta HTTP 403 (Forbidden) estandarizada.
 * Se utiliza cuando el usuario está autenticado pero no tiene el Rol necesario para la acción.
 */
export const prohibido = () =>
  NextResponse.json(
    { error: 'No tiene permisos suficientes para realizar esta acción.' },
    { status: 403 }
  );