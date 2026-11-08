import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { noAutorizado, prohibido, usuarioAutenticado } from '@/lib/sesion';

export async function GET() {
  try {
    const user = await usuarioAutenticado();
    if (!user) return noAutorizado();
    
    // 🛡️ SEGURIDAD: Solo el administrador puede ver la cola de aprobaciones
    if (user.rol !== 'ADMINISTRADOR') return prohibido();

    const pendientes = await prisma.usuario.findMany({
      where: { 
        pendienteAprobacion: true,
        activo: false
      },
      orderBy: { createdAt: 'desc' },
      // ✅ OPTIMIZACIÓN: Select explícito para minimizar el payload y no exponer datos sensibles
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

    return NextResponse.json(pendientes, { status: 200 });
  } catch (error) {
    console.error('[USUARIOS][PENDIENTES][GET] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener la lista de usuarios pendientes de aprobación.' },
      { status: 500 }
    );
  }
}