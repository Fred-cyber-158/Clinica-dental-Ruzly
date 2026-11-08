import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { construirHistorial } from '@/lib/expediente';
import { noAutorizado, prohibido, usuarioAutenticado } from '@/lib/sesion';

/**
 * GET /api/pacientes/[id]/historial
 * Línea de tiempo clínica del paciente, derivada de sus citas, tratamientos
 * y recetas. No existe una tabla "Historial": la historia es la agregación de
 * los registros clínicos reales.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await usuarioAutenticado();
    if (!user) return noAutorizado();

    const { id } = await context.params;

    // El paciente solo puede abrir su propia historia clínica.
    if (user.rol === 'PACIENTE' && user.pacienteId !== id) return prohibido();

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
      { error: 'Error al obtener el historial clínico' },
      { status: 500 },
    );
  }
}
