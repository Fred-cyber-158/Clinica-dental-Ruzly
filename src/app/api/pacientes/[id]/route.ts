import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { noAutorizado, prohibido, usuarioAutenticado } from '@/lib/sesion';

type Ctx = { params: Promise<{ id: string }> };
const ROLES_PERSONAL = ['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA'];

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await usuarioAutenticado();
    if (!user) return noAutorizado();

    const { id } = await params;
    // El paciente solo puede abrir su propio expediente
    if (user.rol === 'PACIENTE' && user.pacienteId !== id) return prohibido();

    // ✅ MEJORA: Select parcial para optimizar el payload y la velocidad de carga
    const paciente = await prisma.paciente.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        edad: true,
        telefono: true,
        email: true,
        ci: true,
        alergias: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
        citas: { 
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            fecha: true,
            hora: true,
            motivo: true,
            estado: true,
            createdAt: true,
          }
        },
        tratamientos: { 
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            costo: true,
            pagado: true,
            activo: true,
            createdAt: true,
          }
        },
        recetas: { 
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            medicamento: true,
            indicaciones: true,
            createdAt: true,
          }
        },
        cobros: { 
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            montoTotal: true,
            montoPagado: true,
            saldo: true,
            metodo: true,
            createdAt: true,
          }
        },
        fotos: { 
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            url: true,
            descripcion: true,
            createdAt: true,
          }
        },
        odontogramas: { 
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            pieza: true,
            hallazgo: true,
            estado: true,
            observacion: true,
            createdAt: true,
          }
        },
      },
    });
    
    if (!paciente) return NextResponse.json({ error: 'Paciente no encontrado.' }, { status: 404 });
    return NextResponse.json(paciente);
  } catch (error) {
    console.error('Error GET /api/pacientes/[id]:', error);
    return NextResponse.json({ error: 'No se pudo obtener el expediente.' }, { status: 500 });
  }
}

// Baja o reactivacion logica del paciente
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const user = await usuarioAutenticado();
    if (!user) return noAutorizado();
    if (!ROLES_PERSONAL.includes(user.rol)) return prohibido();

    const { id } = await params;
    
    // ✅ MEJORA: Validar existencia del paciente ANTES de procesar el body
    const existe = await prisma.paciente.findUnique({ 
      where: { id }, 
      select: { id: true, activo: true } 
    });
    if (!existe) return NextResponse.json({ error: 'Paciente no encontrado.' }, { status: 404 });

    const cuerpo = (await request.json().catch(() => null)) as { activo?: unknown } | null;
    if (!cuerpo || typeof cuerpo.activo !== 'boolean') {
      return NextResponse.json({ error: 'Indique si el paciente queda activo (true o false).' }, { status: 400 });
    }

    // Evitar operación redundante (ya está en el estado solicitado)
    if (existe.activo === cuerpo.activo) {
      return NextResponse.json({ 
        ...existe, 
        mensaje: `El paciente ya está ${cuerpo.activo ? 'activo' : 'inactivo'}.` 
      });
    }

    const actualizado = await prisma.paciente.update({ 
      where: { id }, 
      data: { activo: cuerpo.activo },
      select: { id: true, nombre: true, activo: true } // Solo devolvemos lo necesario
    });
    
    return NextResponse.json(actualizado);
  } catch (error) {
    console.error('Error PATCH /api/pacientes/[id]:', error);
    return NextResponse.json({ error: 'No se pudo actualizar el estado del paciente.' }, { status: 500 });
  }
}