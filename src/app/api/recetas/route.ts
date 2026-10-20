import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Obtener todas las recetas médicas con sus datos de paciente relacional
export async function GET() {
  try {
    const recetas = await prisma.receta.findMany({
      include: {
        paciente: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(recetas, { status: 200 });
  } catch (error: unknown) {
    console.error('Error GET /api/recetas:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error al obtener la lista de recetas.' },
      { status: 500 }
    );
  }
}

// POST: Registrar nueva receta médica
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pacienteId, pacienteNombre, medicamento, indicaciones } = body;

    // Validación de campos obligatorios
    if (!medicamento || !indicaciones) {
      return NextResponse.json(
        { error: 'El medicamento y las indicaciones son obligatorios.' },
        { status: 400 }
      );
    }

    const medLimpio = String(medicamento).trim().toUpperCase();
    const indLimpia = String(indicaciones).trim().toUpperCase();
    const nombreLimpio = pacienteNombre ? String(pacienteNombre).trim().toUpperCase() : null;

    const nuevaReceta = await prisma.receta.create({
      data: {
        pacienteId: pacienteId ? String(pacienteId) : null,
        pacienteNombre: nombreLimpio,
        medicamento: medLimpio,
        indicaciones: indLimpia,
      },
      include: {
        paciente: true,
      },
    });

    return NextResponse.json(nuevaReceta, { status: 201 });
  } catch (error: unknown) {
    console.error('Error POST /api/recetas:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error al registrar la receta médica.' },
      { status: 500 }
    );
  }
}