import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const pacientes = await prisma.paciente.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        citas: true,
        tratamientos: true,
        recetas: true,
        fotos: true,
        cobros: true,
        odontogramas: true,
      },
    });
    return NextResponse.json(pacientes);
  } catch {
    return NextResponse.json({ error: 'Error al obtener pacientes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, edad, telefono, email, ci, alergias } = body;

    if (!nombre) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }

    const nuevoPaciente = await prisma.paciente.create({
      data: {
        nombre: nombre.trim().toUpperCase(),
        edad: edad ? parseInt(edad) : null,
        telefono: telefono ? telefono.trim() : null,
        email: email ? email.trim().toLowerCase() : null,
        ci: ci ? ci.trim() : null,
        alergias: alergias ? alergias.trim().toUpperCase() : null,
      },
    });

    return NextResponse.json(nuevoPaciente, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear el paciente' }, { status: 500 });
  }
}