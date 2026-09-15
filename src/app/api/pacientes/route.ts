import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Obtener todos los pacientes
export async function GET() {
  try {
    const pacientes = await prisma.paciente.findMany({
      include: { usuario: true },
    });
    return NextResponse.json(pacientes);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener pacientes" }, { status: 500 });
  }
}

// POST: Registrar un nuevo paciente junto con su usuario
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, apellido, correo, telefono, ci, fechaNacimiento, alergias } = body;

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
            rol: "PACIENTE",
          },
        },
      },
      include: { usuario: true },
    });

    return NextResponse.json(nuevoPaciente, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error al registrar paciente" }, { status: 500 });
  }
}