import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { detectarConflictoAlergia } from '@/lib/alergias';
import { noAutorizado, prohibido, usuarioAutenticado } from '@/lib/sesion';
import { validarReceta } from '@/lib/validar-receta';

export async function GET() {
  try {
    const user = await usuarioAutenticado();
    if (!user) return noAutorizado();
    
    // 🛡️ Los recepcionistas no tienen acceso a prescripciones médicas por privacidad clínica
    if (user.rol === 'RECEPCIONISTA') return prohibido();

    // El paciente solo ve sus propias recetas
    if (user.rol === 'PACIENTE' && !user.pacienteId) {
      return NextResponse.json([]);
    }
    
    const where = user.rol === 'PACIENTE' ? { pacienteId: user.pacienteId } : {};

    // ✅ OPTIMIZACIÓN: Select parcial para optimizar el payload y limitar registros (Mobile-First)
    const recetas = await prisma.receta.findMany({
      where,
      select: {
        id: true,
        pacienteId: true,
        pacienteNombre: true,
        medicamento: true,
        indicaciones: true,
        emitidaPor: true,
        createdAt: true,
        paciente: {
          select: { id: true, nombre: true } // Solo datos necesarios para la UI
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Paginación básica: últimas 100 recetas
    });
    
    return NextResponse.json(recetas);
  } catch (error) {
    console.error('[RECETAS][GET] Error:', error);
    return NextResponse.json(
      { error: 'No se pudo obtener la lista de recetas.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await usuarioAutenticado();
    if (!user) return noAutorizado();
    if (user.rol !== 'ADMINISTRADOR' && user.rol !== 'ODONTOLOGO') {
      return prohibido();
    }

    const cuerpo: unknown = await request.json().catch(() => null);
    if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
      return NextResponse.json(
        { error: 'Los datos enviados no tienen el formato correcto.' },
        { status: 400 }
      );
    }
    const entrada = cuerpo as Record<string, unknown>;

    // Validación estricta del payload (formato y límites de caracteres)
    const r = validarReceta(entrada);
    if (!r.ok) {
      return NextResponse.json(
        { error: Object.values(r.errores)[0], errores: r.errores },
        { status: 400 }
      );
    }

    // Validar existencia y estado del paciente (Fail-Fast)
    const paciente = await prisma.paciente.findUnique({ 
      where: { id: r.data.pacienteId },
      select: { id: true, nombre: true, activo: true, alergias: true }
    });
    
    if (!paciente || !paciente.activo) {
      return NextResponse.json(
        { error: 'El paciente no existe o está dado de baja.' },
        { status: 400 }
      );
    }

    // 🚨 SEGURIDAD CLÍNICA: Detección de conflictos de alergia
    const conflicto = detectarConflictoAlergia(paciente.alergias, r.data.medicamento);
    
    // ✅ MEJORA: Validación estricta de tipo booleano para la confirmación
    const confirmoAlergia = entrada.confirmarAlergia === true;

    if (conflicto && !confirmoAlergia) {
      return NextResponse.json(
        { 
          error: `ALERTA DE ALERGIA: ${conflicto}. El sistema requiere confirmación expresa del profesional para emitir esta receta.`, 
          conflicto: true // Flag para que el frontend muestre el modal/checkbox de confirmación
        },
        { status: 409 }
      );
    }

    // ✅ Trazabilidad: Se registra quién emitió la receta para auditoría clínica
    const nueva = await prisma.receta.create({
      data: {
        pacienteId: paciente.id,
        pacienteNombre: paciente.nombre.toUpperCase(),
        medicamento: r.data.medicamento,
        indicaciones: r.data.indicaciones,
        emitidaPor: user.nombre.toUpperCase(),
      },
      select: {
        id: true,
        pacienteId: true,
        pacienteNombre: true,
        medicamento: true,
        indicaciones: true,
        emitidaPor: true,
        createdAt: true,
        paciente: {
          select: { id: true, nombre: true }
        }
      }
    });
    
    return NextResponse.json(nueva, { status: 201 });
  } catch (error) {
    // Manejo específico de errores de Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'El paciente asociado no fue encontrado.' },
          { status: 404 }
        );
      }
    }
    
    console.error('[RECETAS][POST] Error crítico:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error interno al emitir la receta. Intente más tarde.' },
      { status: 500 }
    );
  }
}