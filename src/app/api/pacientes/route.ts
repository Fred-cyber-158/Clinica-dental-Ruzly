import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { noAutorizado, prohibido, usuarioAutenticado } from '@/lib/sesion';
import { validarPaciente } from '@/lib/validar-paciente';

const ROLES_PERSONAL = ['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA'];

export async function GET() {
  try {
    const user = await usuarioAutenticado();
    if (!user) return noAutorizado();

    // El paciente solo puede ver su propio registro
    if (user.rol === 'PACIENTE' && !user.pacienteId) {
      return NextResponse.json([]);
    }

    // ✅ CORRECCIÓN: Manejo correcto de null en pacienteId para TypeScript + Prisma
    const where: Prisma.PacienteWhereInput =
      user.rol === 'PACIENTE' && user.pacienteId
        ? { id: user.pacienteId }
        : {};

    const pacientes = await prisma.paciente.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        ci: true,
        telefono: true,
        email: true,
        edad: true,
        activo: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json(pacientes);
  } catch (error) {
    console.error('[PACIENTES][GET] Error:', error);
    return NextResponse.json(
      { error: 'No se pudo obtener la lista de pacientes.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await usuarioAutenticado();
    if (!user) return noAutorizado();
    if (!ROLES_PERSONAL.includes(user.rol)) return prohibido();

    const cuerpo: unknown = await request.json().catch(() => null);
    if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
      return NextResponse.json(
        { error: 'Los datos enviados no tienen el formato correcto.' },
        { status: 400 }
      );
    }

    const r = validarPaciente(cuerpo as Record<string, unknown>);
    if (!r.ok) {
      return NextResponse.json(
        { error: Object.values(r.errores)[0], errores: r.errores },
        { status: 400 }
      );
    }

    const nuevo = await prisma.paciente.create({
      data: r.data,
      select: {
        id: true,
        nombre: true,
        ci: true,
        telefono: true,
        email: true,
        edad: true,
        activo: true,
        createdAt: true,
      },
    });

    return NextResponse.json(nuevo, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un paciente registrado con ese número de C.I.' },
        { status: 409 }
      );
    }

    console.error('[PACIENTES][POST] Error crítico:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error interno al registrar el paciente.' },
      { status: 500 }
    );
  }
}