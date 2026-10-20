import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Consultar todas las citas con los datos del paciente
export async function GET() {
  try {
    const citas = await prisma.cita.findMany({
      include: {
        paciente: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(citas, { status: 200 });
  } catch (error: unknown) {
    console.error('Error GET /api/citas:', error);
    return NextResponse.json(
      { error: 'Error al obtener la lista de citas.' },
      { status: 500 }
    );
  }
}

// POST: Registrar nueva cita médica
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pacienteId, fecha, hora, motivo, estado } = body;

    if (!pacienteId || !fecha || !hora) {
      return NextResponse.json(
        { error: 'El paciente, la fecha y la hora son obligatorios.' },
        { status: 400 }
      );
    }

    const nuevaCita = await prisma.cita.create({
      data: {
        pacienteId: String(pacienteId),
        fecha: String(fecha),
        hora: String(hora),
        motivo: motivo ? String(motivo).trim().toUpperCase() : null,
        estado: estado ? String(estado).toUpperCase() : 'PENDIENTE',
      },
      include: {
        paciente: true,
      },
    });

    return NextResponse.json(nuevaCita, { status: 201 });
  } catch (error: unknown) {
    console.error('Error POST /api/citas:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error al registrar la cita.' },
      { status: 500 }
    );
  }
}