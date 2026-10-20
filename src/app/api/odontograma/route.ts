import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pacienteId = searchParams.get('pacienteId');

    const odontogramas = await prisma.odontograma.findMany({
      where: pacienteId ? { pacienteId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { paciente: true },
    });

    return NextResponse.json(odontogramas);
  } catch {
    return NextResponse.json(
      { error: 'Error al obtener los registros del odontograma.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pieza, hallazgo, estado, observacion, pacienteId } = body;

    if (!pieza || !hallazgo || !pacienteId) {
      return NextResponse.json(
        { error: 'Pieza dental, hallazgo y paciente son obligatorios.' },
        { status: 400 }
      );
    }

    const nuevoOdontograma = await prisma.odontograma.create({
      data: {
        pieza: pieza.trim().toUpperCase(),
        hallazgo: hallazgo.trim().toUpperCase(),
        estado: estado ? estado.trim().toUpperCase() : 'DIAGNÓSTICO',
        observacion: observacion ? observacion.trim().toUpperCase() : null,
        pacienteId,
      },
    });

    return NextResponse.json(nuevoOdontograma, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Error al registrar el hallazgo en el odontograma.' },
      { status: 500 }
    );
  }
}