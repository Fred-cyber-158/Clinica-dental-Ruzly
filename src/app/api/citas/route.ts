import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { noAutorizado, usuarioAutenticado } from '@/lib/sesion';
import { validarCita } from '@/lib/validar-cita';

export async function GET() {
  try {
    const user = await usuarioAutenticado();
    if (!user) return noAutorizado();

    // El paciente solo ve sus propias citas
    if (user.rol === 'PACIENTE' && !user.pacienteId) {
      return NextResponse.json([]);
    }
    
    // ✅ CORRECCIÓN: Tipado explícito para evitar errores de TypeScript
    const where: Prisma.CitaWhereInput = user.rol === 'PACIENTE' 
      ? { pacienteId: user.pacienteId! } 
      : {};

    // ✅ MEJORA: Select parcial para optimizar el payload y limitar registros
    const citas = await prisma.cita.findMany({
      where,
      include: { 
        paciente: { 
          select: { id: true, nombre: true, ci: true } // Solo datos necesarios para la UI
        } 
      },
      orderBy: [{ fecha: 'desc' }, { hora: 'desc' }],
      take: 100, // Paginación básica: últimas 100 citas para rendimiento móvil
    });
    
    return NextResponse.json(citas);
  } catch (error) {
    console.error('[CITAS][GET] Error:', error);
    return NextResponse.json(
      { error: 'No se pudo obtener la lista de citas.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await usuarioAutenticado();
    if (!user) return noAutorizado();

    const cuerpo: unknown = await request.json().catch(() => null);
    if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
      return NextResponse.json({ error: 'Los datos enviados no tienen el formato correcto.' }, { status: 400 });
    }
    
    const entrada = { ...(cuerpo as Record<string, unknown>) };

    // Un paciente solo puede pedir citas para sí mismo y siempre quedan PENDIENTES
    if (user.rol === 'PACIENTE') {
      if (!user.pacienteId) {
        return NextResponse.json({ error: 'Su usuario no está vinculado a un paciente.' }, { status: 403 });
      }
      entrada.pacienteId = user.pacienteId;
      entrada.estado = 'PENDIENTE';
    }

    // Validación estricta del payload
    const r = validarCita(entrada);
    if (!r.ok) {
      return NextResponse.json({ error: Object.values(r.errores)[0], errores: r.errores }, { status: 400 });
    }

    // Validar existencia y estado del paciente
    const paciente = await prisma.paciente.findUnique({
      where: { id: r.data.pacienteId },
      select: { id: true, activo: true },
    });
    
    if (!paciente || !paciente.activo) {
      return NextResponse.json({ error: 'El paciente no existe o está dado de baja.' }, { status: 400 });
    }

    // ✅ Evita dobles reservas en el mismo horario (Protección anti-colisión)
    const nueva = await prisma.$transaction(
      async (tx) => {
        const ocupada = await tx.cita.findFirst({
          where: { 
            fecha: r.data.fecha, 
            hora: r.data.hora, 
            estado: { not: 'CANCELADA' } 
          },
          select: { id: true },
        });
        
        if (ocupada) return null; // Horario ocupado, la transacción retornará null
        
        return tx.cita.create({ 
          data: r.data, 
          include: { 
            paciente: { select: { id: true, nombre: true, ci: true } } 
          } 
        });
      },
      { 
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable 
      }
    );

    if (!nueva) {
      return NextResponse.json(
        { error: `El horario ${r.data.hora} del ${r.data.fecha} ya está ocupado. Por favor, elija otro.` }, 
        { status: 409 }
      );
    }
    
    return NextResponse.json(nueva, { status: 201 });
  } catch (error) {
    // ✅ Manejo específico de errores de concurrencia de Prisma (Rollback por serialización)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return NextResponse.json(
        { error: 'Conflicto de concurrencia: Ese horario acaba de ser tomado por otro usuario. Elija otro.' }, 
        { status: 409 }
      );
    }
    
    console.error('[CITAS][POST] Error crítico:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error interno al registrar la cita. Intente más tarde.' }, 
      { status: 500 }
    );
  }
}