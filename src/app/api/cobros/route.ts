import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Obtener todos los registros de cobros
export async function GET() {
  try {
    const cobros = await prisma.cobro.findMany({
      include: {
        paciente: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(cobros, { status: 200 });
  } catch (error: unknown) {
    console.error('Error GET /api/cobros:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error al obtener los registros de cobro.' },
      { status: 500 }
    );
  }
}

// POST: Registrar un nuevo cobro/pago en caja
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pacienteNombre, nombreCliente, montoTotal, montoPagado, metodo, pacienteId } = body;

    // Aceptar tanto pacienteNombre como nombreCliente enviado desde el frontend
    const nombreFinal = pacienteNombre || nombreCliente;

    if (!nombreFinal || montoTotal === undefined || montoPagado === undefined) {
      return NextResponse.json(
        { error: 'El nombre del paciente/cliente, el monto total y el monto pagado son obligatorios.' },
        { status: 400 }
      );
    }

    const total = parseFloat(montoTotal) || 0;
    const pagado = parseFloat(montoPagado) || 0;
    const saldoCalculado = Math.max(0, total - pagado);

    const idPacienteLimpio = pacienteId && String(pacienteId).trim() !== '' ? String(pacienteId) : null;

    let textoNombre = String(nombreFinal).trim().toUpperCase();
    if (idPacienteLimpio && (!textoNombre || textoNombre === '')) {
      const pacienteReg = await prisma.paciente.findUnique({
        where: { id: idPacienteLimpio },
      });
      if (pacienteReg) {
        textoNombre = pacienteReg.nombre.toUpperCase();
      }
    }

    // Crear el registro del cobro en caja
    const nuevoCobro = await prisma.cobro.create({
      data: {
        pacienteNombre: textoNombre,
        montoTotal: total,
        montoPagado: pagado,
        saldo: saldoCalculado,
        metodo: metodo ? String(metodo).toUpperCase() : 'EFECTIVO',
        pacienteId: idPacienteLimpio,
      },
      include: {
        paciente: true,
      },
    });

    return NextResponse.json(nuevoCobro, { status: 201 });
  } catch (error: unknown) {
    console.error('Error POST /api/cobros:', error);
    const errObj = error as { message?: string };

    return NextResponse.json(
      { error: `⚠️ Error de Base de Datos: ${errObj?.message || 'No se pudo procesar el cobro.'}` },
      { status: 500 }
    );
  }
}