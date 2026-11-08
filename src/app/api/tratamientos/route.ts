import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { noAutorizado, prohibido, usuarioAutenticado } from '@/lib/sesion';
import { redondear } from '@/lib/validar-cobro';
import { validarTratamiento } from '@/lib/validar-tratamiento';

// Clase personalizada para errores de lógica de negocio (Excelente práctica)
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

    // Si es paciente, solo ve sus propios tratamientos
    if (user.rol === 'PACIENTE' && !user.pacienteId) {
      return NextResponse.json([]);
    }
    
    const where = user.rol === 'PACIENTE' ? { pacienteId: user.pacienteId } : {};

    // ✅ MEJORA: Select parcial para optimizar el payload y limitar registros
    const lista = await prisma.tratamiento.findMany({
      where,
      include: { 
        paciente: { 
          select: { id: true, nombre: true, ci: true } // Solo datos necesarios para la UI
        } 
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Paginación básica: últimos 100 tratamientos
    });
    
    return NextResponse.json(lista);
  } catch (error) {
    console.error('[TRATAMIENTOS][GET] Error:', error);
    return NextResponse.json(
      { error: 'No se pudo obtener la lista de tratamientos.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await usuarioAutenticado();
    if (!user) return noAutorizado();
    
    // Los pacientes no pueden crear tratamientos (solo odontólogos/admin/recepción)
    if (user.rol === 'PACIENTE') return prohibido();

    const cuerpo: unknown = await request.json().catch(() => null);
    if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
      return NextResponse.json({ error: 'Los datos enviados no tienen el formato correcto.' }, { status: 400 });
    }

    // Validación estricta del payload
    const r = validarTratamiento(cuerpo as Record<string, unknown>);
    if (!r.ok) {
      return NextResponse.json(
        { error: Object.values(r.errores)[0], errores: r.errores },
        { status: 400 }
      );
    }

    const d = r.data;

    // El anticipo solo lo registran Administrador o Recepcionista
    if (d.anticipo > 0 && user.rol !== 'ADMINISTRADOR' && user.rol !== 'RECEPCIONISTA') {
      return NextResponse.json(
        { error: 'El registro de anticipos está reservado para Recepción o Administración.' },
        { status: 403 }
      );
    }

    // TRANSACCIÓN con COMMIT/ROLLBACK automático y aislamiento Serializable
    const nuevoTratamiento = await prisma.$transaction(
      async (tx) => {
        // 1. Validar existencia y estado del paciente
        const paciente = await tx.paciente.findUnique({ 
          where: { id: d.pacienteId },
          select: { id: true, nombre: true, activo: true }
        });
        
        if (!paciente || !paciente.activo) {
          throw new ErrorNegocio('El paciente no existe o está dado de baja.', 400);
        }

        // 2. Verificar duplicado lógico (mismo paciente, mismo nombre de tratamiento, activo)
        const duplicado = await tx.tratamiento.findFirst({
          where: {
            pacienteId: d.pacienteId,
            nombre: d.nombre,
            activo: true,
          },
          select: { id: true },
        });
        
        if (duplicado) {
          throw new ErrorNegocio('Este paciente ya tiene un plan activo con ese nombre.', 409);
        }

        // 3. Crear el tratamiento
        const t = await tx.tratamiento.create({
          data: {
            pacienteId: d.pacienteId,
            nombre: d.nombre,
            descripcion: d.descripcion || null,
            costo: d.costo,
            pagado: d.anticipo,
          },
          include: { 
            paciente: { select: { id: true, nombre: true } } 
          },
        });

        // 4. Si hay anticipo, registrar el cobro inicial en la misma transacción
        if (d.anticipo > 0) {
          await tx.cobro.create({
            data: {
              pacienteNombre: paciente.nombre.toUpperCase(),
              montoTotal: d.costo,
              montoPagado: d.anticipo,
              saldo: redondear(d.costo - d.anticipo),
              metodo: d.metodo || 'EFECTIVO', // Fallback seguro
              pacienteId: d.pacienteId,
              // ✅ CORRECCIÓN: Se eliminó 'usuarioId' porque no existe en el modelo Cobro del schema.prisma
            },
          });
        }

        return t;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      }
    );

    return NextResponse.json(nuevoTratamiento, { status: 201 });
  } catch (error) {
    // Manejo de errores de negocio personalizados
    if (error instanceof ErrorNegocio) {
      return NextResponse.json({ error: error.message }, { status: error.estado });
    }
    
    // ✅ MEJORA: Manejo específico de errores de Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Ya existe un registro con estos datos únicos.' },
          { status: 409 }
        );
      }
      if (error.code === 'P2034') {
        return NextResponse.json(
          { error: 'Conflicto de concurrencia. Por favor, intente de nuevo.' },
          { status: 409 }
        );
      }
    }
    
    console.error('[TRATAMIENTOS][POST] Error crítico:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error interno al registrar el tratamiento. Intente más tarde.' },
      { status: 500 }
    );
  }
}