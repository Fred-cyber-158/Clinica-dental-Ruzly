// src/app/api/pacientes/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Obtener todos los pacientes
export async function GET() {
  try {
    const pacientes = await prisma.paciente.findMany({
      include: {
        usuario: {
          select: { nombre: true, apellido: true, correo: true, telefono: true }
        }
      },
      orderBy: { creadoEn: 'desc' }
    });

    return NextResponse.json(pacientes, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Error al obtener pacientes' }, { status: 500 });
  }
}

// POST: Registrar nuevo paciente
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ci, fechaNacimiento, alergias, nombre, apellido, correo, telefono } = body;

    const nuevoPaciente = await prisma.paciente.create({
      data: {
        ci,
        fechaNacimiento: new Date(fechaNacimiento),
        alergias,
        usuario: {
          create: {
            nombre,
            apellido,
            correo,
            telefono,
            rol: 'PACIENTE'
          }
        }
      },
      include: { usuario: true }
    });

    return NextResponse.json(nuevoPaciente, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al registrar paciente' }, { status: 400 });
  }
}