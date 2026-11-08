import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { noAutorizado, prohibido, usuarioAutenticado } from '@/lib/sesion';

type Ctx = { params: Promise<{ id: string }> };

// Desactivar o reactivar un plan de tratamiento
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const user = await usuarioAutenticado();
    if (!user) return noAutorizado();
    
    // Solo Administrador y Odontólogo pueden gestionar el estado de los tratamientos
    if (user.rol !== 'ADMINISTRADOR' && user.rol !== 'ODONTOLOGO') {
      return prohibido();
    }

    const { id } = await params;
    const cuerpo = (await request.json().catch(() => null)) as { activo?: unknown } | null;
    
    if (!cuerpo || typeof cuerpo.activo !== 'boolean') {
      return NextResponse.json(
        { error: 'Debe indicar si el plan queda activo (true) o inactivo (false).' }, 
        { status: 400 }
      );
    }

    // ✅ MEJORA: Select parcial para la validación (no traemos toda la fila de la BD)
    const t = await prisma.tratamiento.findUnique({ 
      where: { id },
      select: { id: true, pagado: true, activo: true } 
    });
    
    if (!t) {
      return NextResponse.json({ error: 'Tratamiento no encontrado.' }, { status: 404 });
    }

    // 🛡️ REGLA DE NEGOCIO CLARA:
    // 1. Si tiene pagos (pagado > 0), solo el ADMIN puede desactivarlo.
    // 2. Si se está reactivando (cuerpo.activo === true), solo el ADMIN puede hacerlo.
    const esReactivacion = cuerpo.activo === true;
    const tienePagos = t.pagado > 0;

    if ((tienePagos || esReactivacion) && user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json(
        { error: 'Solo el administrador puede desactivar un plan con pagos o reactivar un plan inactivo.' },
        { status: 403 }
      );
    }

    // ✅ MEJORA: Select parcial en la respuesta para optimizar el payload y la red
    const actualizado = await prisma.tratamiento.update({
      where: { id },
      data: { activo: cuerpo.activo },
      select: {
        id: true,
        nombre: true,
        costo: true,
        pagado: true,
        activo: true,
        paciente: {
          select: { id: true, nombre: true } // Solo lo que el frontend necesita para actualizar la UI
        }
      },
    });
    
    return NextResponse.json(actualizado);
  } catch (error) {
    console.error('[TRATAMIENTOS][PATCH] Error:', error);
    return NextResponse.json(
      { error: 'No se pudo actualizar el estado del tratamiento.' }, 
      { status: 500 }
    );
  }
}