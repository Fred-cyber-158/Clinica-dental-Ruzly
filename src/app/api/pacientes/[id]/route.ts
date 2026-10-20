import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const paciente = await prisma.paciente.findUnique({
      where: { id },
      include: {
        citas: { orderBy: { createdAt: 'desc' } },
        tratamientos: { orderBy: { createdAt: 'desc' } },
        recetas: { orderBy: { createdAt: 'desc' } },
        cobros: { orderBy: { createdAt: 'desc' } },
        fotos: { orderBy: { createdAt: 'desc' } },
        odontogramas: { orderBy: { createdAt: 'desc' } }, // 👈 Incluye los hallazgos del odontograma
      },
    });

    if (!paciente) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    return NextResponse.json(paciente);
  } catch (error) {
    console.error('Error al obtener expediente:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}