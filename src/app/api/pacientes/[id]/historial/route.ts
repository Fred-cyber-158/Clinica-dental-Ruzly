import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { construirHistorial } from '@/lib/expediente';

/**
 * GET /api/pacientes/[id]/historial
 * Linea de tiempo clinica del paciente, derivada de sus citas, tratamientos
 * y recetas. No existe una tabla "Historial": la historia es la agregacion de
 * los registros clinicos reales.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const paciente = await prisma.paciente.findUnique({
      where: { id },
      select: { id: true, nombre: true },
    });

    if (!paciente) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    const [citas, tratamientos, recetas] = await Promise.all([
      prisma.cita.findMany({ where: { pacienteId: id }, orderBy: { createdAt: 'desc' } }),
      prisma.tratamiento.findMany({ where: { pacienteId: id }, orderBy: { createdAt: 'desc' } }),
      prisma.receta.findMany({ where: { pacienteId: id }, orderBy: { createdAt: 'desc' } }),
    ]);

    return NextResponse.json({
      pacienteId: paciente.id,
      pacienteNombre: paciente.nombre,
      historial: construirHistorial(citas, tratamientos, recetas),
    });
  } catch (error) {
    console.error('Error en GET /api/pacientes/[id]/historial:', error);
    return NextResponse.json(
      { error: 'Error al obtener el historial clinico' },
      { status: 500 },
    );
  }
}
