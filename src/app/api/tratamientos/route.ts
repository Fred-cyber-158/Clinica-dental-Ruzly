import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Obtener todos los tratamientos registrados
export async function GET() {
  try {
    const tratamientos = await prisma.tratamiento.findMany({
      include: {
        paciente: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(tratamientos, { status: 200 });
  } catch (error: unknown) {
    console.error('Error GET /api/tratamientos:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error al obtener los tratamientos.' },
      { status: 500 }
    );
  }
}

// POST: Crear un nuevo plan de tratamiento
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pacienteId, nombre, descripcion, costo, pagado, activo } = body;

    if (!nombre || costo === undefined || costo === null) {
      return NextResponse.json(
        { error: 'El nombre del tratamiento y el costo son obligatorios.' },
        { status: 400 }
      );
    }

    const costoNum = parseFloat(costo);
    const pagadoNum = pagado !== undefined ? parseFloat(pagado) : 0.0;

    const nuevoTratamiento = await prisma.tratamiento.create({
      data: {
        pacienteId: pacienteId ? String(pacienteId) : null,
        nombre: String(nombre).trim().toUpperCase(),
        descripcion: descripcion ? String(descripcion).trim().toUpperCase() : null,
        costo: costoNum,
        pagado: pagadoNum,
        activo: activo !== undefined ? Boolean(activo) : true,
      },
      include: {
        paciente: true,
      },
    });

    return NextResponse.json(nuevoTratamiento, { status: 201 });
  } catch (error: unknown) {
    console.error('Error POST /api/tratamientos:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error al registrar el tratamiento.' },
      { status: 500 }
    );
  }
}