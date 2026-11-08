import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { noAutorizado, prohibido, usuarioAutenticado } from '@/lib/sesion';
import { redondear, validarCobro } from '@/lib/validar-cobro';

// Clase personalizada para errores de lógica de negocio
class ErrorNegocio extends Error {
  estado: number;
  constructor(mensaje: string, estado: number) {
    super(mensaje);
    this.name = 'ErrorNegocio';
    this.estado = estado;
  }
}

export async function GET() {
  try {
    const user = await usuarioAutenticado();
    if (!user) return noAutorizado();

    if (user.rol === 'PACIENTE' && !user.pacienteId) {
      return NextResponse.json([]);
    }
    
    const where = user.rol === 'PACIENTE' ? { pacienteId: user.pacienteId } : {};

    const cobros = await prisma.cobro.findMany({
      where,
      include: { 
        paciente: { select: { id: true, nombre: true, ci: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(cobros);
  } catch (error) {
    console.error('[COBROS][GET] Error:', error);
    return NextResponse.json(
      { error: 'No se pudo obtener el registro de cobros.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await usuarioAutenticado();
    if (!user) return noAutorizado();
    
    if (user.rol !== 'ADMINISTRADOR' && user.rol !== 'RECEPCIONISTA') {
      return prohibido();
    }

    const cuerpo: unknown = await request.json().catch(() => null);
    if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
      return NextResponse.json({ error: 'Los datos enviados no tienen el formato correcto.' }, { status: 400 });
    }

    const r = validarCobro(cuerpo as Record<string, unknown>);
    if (!r.ok) {
      return NextResponse.json(
        { error: Object.values(r.errores)[0], errores: r.errores },
        { status: 400 }
      );
    }

    const d = r.data;

    const resultado = await prisma.$transaction(
      async (tx) => {
        let nombrePaciente = d.nombre;
        let total = d.montoTotal ?? 0;
        let nuevoSaldo = 0;
        let tratamientoActualizado = null;
        
        if (d.pacienteId) {
          const p = await tx.paciente.findUnique({ 
            where: { id: d.pacienteId },
            select: { nombre: true, activo: true }
          });
          if (!p || !p.activo) {
            throw new ErrorNegocio('El paciente no existe o está dado de baja.', 400);
          }
          nombrePaciente = p.nombre.toUpperCase();
        }

        if (d.tratamientoId) {
          const t = await tx.tratamiento.findUnique({ 
            where: { id: d.tratamientoId },
            select: { id: true, costo: true, pagado: true, pacienteId: true, activo: true }
          });
          
          if (!t || !t.activo || t.pacienteId !== d.pacienteId) {
            throw new ErrorNegocio('El tratamiento no corresponde a este paciente o está inactivo.', 400);
          }
          
          const saldoPrevio = redondear(t.costo - t.pagado);
          
          if (saldoPrevio <= 0) {
            throw new ErrorNegocio('Ese tratamiento ya está pagado completamente.', 409);
          }
          
          if (d.montoPagado > saldoPrevio) {
            throw new ErrorNegocio(
              `El pago (Bs. ${d.montoPagado.toFixed(2)}) supera el saldo pendiente (Bs. ${saldoPrevio.toFixed(2)}).`,
              400
            );
          }

          // ✅ MEJORA FINANCIERA: El 'total' del cobro refleja el costo real del tratamiento
          total = t.costo;
          // ✅ MEJORA FINANCIERA: El 'saldo' refleja lo que aún debe el paciente después de este pago
          nuevoSaldo = redondear(saldoPrevio - d.montoPagado);

          tratamientoActualizado = await tx.tratamiento.update({
            where: { id: t.id },
            data: { pagado: redondear(t.pagado + d.montoPagado) },
            select: { id: true, costo: true, pagado: true }
          });
        } else {
          // Para cobros libres (sin tratamiento vinculado)
          nuevoSaldo = redondear(total - d.montoPagado);
        }

        const nuevoCobro = await tx.cobro.create({
          data: {
            pacienteNombre: nombrePaciente,
            montoTotal: total,
            montoPagado: d.montoPagado,
            saldo: nuevoSaldo,
            metodo: d.metodo,
            pacienteId: d.pacienteId,
          },
          include: { 
            paciente: { select: { id: true, nombre: true } } 
          },
        });

        return { cobro: nuevoCobro, tratamientoActualizado };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      }
    );

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    if (error instanceof ErrorNegocio) {
      return NextResponse.json({ error: error.message }, { status: error.estado });
    }
    
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return NextResponse.json(
        { error: 'Conflicto de concurrencia: Otro cobro se registró al mismo tiempo. Por favor, actualice e intente de nuevo.' },
        { status: 409 }
      );
    }
    
    console.error('[COBROS][POST] Error crítico:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error interno al registrar el cobro. Intente más tarde.' },
      { status: 500 }
    );
  }
}