import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { noAutorizado, prohibido, usuarioAutenticado } from '@/lib/sesion';
import { ESTADOS_CITA, type EstadoCita } from '@/lib/validar-cita';

type Ctx = { params: Promise<{ id: string }> };

// Estados que puede asignar cada rol
const PERMITIDOS: Record<string, EstadoCita[]> = {
  ADMINISTRADOR: ['PENDIENTE', 'CONFIRMADA', 'ATENDIDA', 'CANCELADA'],
  ODONTOLOGO: ['PENDIENTE', 'CONFIRMADA', 'ATENDIDA', 'CANCELADA'],
  RECEPCIONISTA: ['PENDIENTE', 'CONFIRMADA', 'CANCELADA'],
  PACIENTE: ['CANCELADA'],
};

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const user = await usuarioAutenticado();
    if (!user) return noAutorizado();

    const { id } = await params;
    const cuerpo = (await request.json().catch(() => null)) as { estado?: unknown } | null;
    const estado = typeof cuerpo?.estado === 'string' ? cuerpo.estado.toUpperCase() : '';
    
    if (!(ESTADOS_CITA as readonly string[]).includes(estado)) {
      return NextResponse.json({ error: 'Estado de cita no válido.' }, { status: 400 });
    }
    if (!PERMITIDOS[user.rol]?.includes(estado as EstadoCita)) {
      return prohibido();
    }

    // ✅ OPTIMIZACIÓN: Solo traemos los campos necesarios para la validación
    const cita = await prisma.cita.findUnique({ 
      where: { id },
      select: { id: true, pacienteId: true, fecha: true, hora: true, estado: true }
    });
    
    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada.' }, { status: 404 });
    }

    // Un paciente solo puede modificar sus propias citas
    if (user.rol === 'PACIENTE' && cita.pacienteId !== user.pacienteId) {
      return prohibido();
    }

    // Una cita atendida o cancelada ya no se modifica (solo el administrador puede corregirla)
    const finalizada = cita.estado === 'ATENDIDA' || cita.estado === 'CANCELADA';
    if (finalizada && user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json(
        { error: `La cita ya está ${cita.estado.toLowerCase()} y no puede modificarse.` }, 
        { status: 409 }
      );
    }

    // 🛡️ TRANSACCIÓN para reactivación: Previene condiciones de carrera (Race Conditions).
    // Si dos usuarios intentan reactivar citas canceladas en el mismo horario simultáneamente,
    // el aislamiento Serializable garantiza que solo una tenga éxito (Commit) y la otra falle (Rollback).
    if (cita.estado === 'CANCELADA' && estado !== 'CANCELADA') {
      const resultado = await prisma.$transaction(
        async (tx) => {
          const choque = await tx.cita.findFirst({
            where: { 
              fecha: cita.fecha, 
              hora: cita.hora, 
              estado: { not: 'CANCELADA' }, 
              id: { not: id } 
            },
            select: { id: true },
          });
          
          if (choque) {
            throw new Error('COLISION_HORARIO');
          }

          return tx.cita.update({
            where: { id },
            data: { estado },
            select: {
              id: true,
              fecha: true,
              hora: true,
              estado: true,
              motivo: true,
              paciente: {
                select: { id: true, nombre: true, ci: true } // ✅ Optimización de payload (Mobile-First)
              }
            }
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }
      );
      
      return NextResponse.json(resultado);
    }

    // Actualización estándar (sin riesgo de colisión de horario)
    const actualizada = await prisma.cita.update({
      where: { id },
      data: { estado },
      select: {
        id: true,
        fecha: true,
        hora: true,
        estado: true,
        motivo: true,
        paciente: {
          select: { id: true, nombre: true, ci: true } // ✅ Optimización de payload (Mobile-First)
        }
      }
    });

    return NextResponse.json(actualizada);
  } catch (error) {
    // Manejo específico del error de colisión lanzado dentro de la transacción
    if (error instanceof Error && error.message === 'COLISION_HORARIO') {
      return NextResponse.json(
        { error: 'No se puede reactivar: ese horario ya fue tomado por otra cita.' }, 
        { status: 409 }
      );
    }

    console.error('[CITAS][PATCH] Error crítico:', error);
    return NextResponse.json(
      { error: 'No se pudo actualizar la cita.' }, 
      { status: 500 }
    );
  }
}