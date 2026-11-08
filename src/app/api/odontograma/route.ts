import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { noAutorizado, prohibido, usuarioAutenticado } from '@/lib/sesion';
import { describirPieza, validarOdontograma } from '@/lib/validar-odontograma';

export async function GET(request: Request) {
  try {
    const user = await usuarioAutenticado();
    if (!user) return noAutorizado();
    
    // 🛡️ Los recepcionistas no tienen acceso al historial clínico detallado del odontograma
    if (user.rol === 'RECEPCIONISTA') return prohibido();

    const pedido = new URL(request.url).searchParams.get('pacienteId');
    let pacienteId: string | undefined = pedido ?? undefined;

    // El paciente solo puede ver su propio odontograma
    if (user.rol === 'PACIENTE') {
      if (!user.pacienteId) return NextResponse.json([]);
      pacienteId = user.pacienteId;
    }

    // ✅ OPTIMIZACIÓN: Select parcial para optimizar el payload y la velocidad de renderizado
    const registros = await prisma.odontograma.findMany({
      where: pacienteId ? { pacienteId } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        pieza: true,
        hallazgo: true,
        estado: true,
        observacion: true,
        createdAt: true,
        paciente: {
          select: { id: true, nombre: true } // Solo traemos lo que la UI necesita mostrar
        },
      },
    });
    
    return NextResponse.json(registros);
  } catch (error) {
    console.error('[ODONTOGRAMA][GET] Error:', error);
    return NextResponse.json(
      { error: 'No se pudo obtener el historial del odontograma.' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await usuarioAutenticado();
    if (!user) return noAutorizado();
    if (user.rol !== 'ADMINISTRADOR' && user.rol !== 'ODONTOLOGO') return prohibido();

    const cuerpo: unknown = await request.json().catch(() => null);
    if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
      return NextResponse.json({ error: 'Los datos enviados no tienen el formato correcto.' }, { status: 400 });
    }
    
    const entrada = { ...(cuerpo as Record<string, unknown>) };

    // 🔄 Compatibilidad: formato anterior de una sola pieza ("Pieza 16 [Partes/Caras: OCL, MES]")
    if (!Array.isArray(entrada.piezas) && typeof entrada.pieza === 'string') {
      const m = entrada.pieza.match(/(\d{2})\s*\[.*?:\s*(.*?)\]/);
      if (m) {
        entrada.piezas = [{ pieza: m[1], partes: m[2].split(',').map((s) => s.trim().toUpperCase()) }];
      }
    }

    const r = validarOdontograma(entrada);
    if (!r.ok) {
      return NextResponse.json({ error: r.error }, { status: 400 });
    }
    
    const d = r.data;

    // Validación de existencia del paciente (Fail-Fast)
    const paciente = await prisma.paciente.findUnique({ 
      where: { id: d.pacienteId }, 
      select: { id: true, activo: true } 
    });
    
    if (!paciente || !paciente.activo) {
      return NextResponse.json({ error: 'El paciente no existe o está dado de baja.' }, { status: 400 });
    }

    // ✅ TRANSACCIÓN ATÓMICA: Garantiza "Todo o Nada" (Commit/Rollback)
    const registros = await prisma.$transaction(
      async (tx) => {
        // ✅ MEJORA DE RENDIMIENTO: Promise.all ejecuta las creaciones en paralelo dentro de la misma transacción
        const promesas = d.piezas.map(async (p) => {
          return tx.odontograma.create({
            data: {
              pacienteId: d.pacienteId,
              pieza: describirPieza(p),
              hallazgo: d.hallazgo,
              estado: d.estado,
              observacion: d.observacion,
            },
            select: { id: true, pieza: true } // Optimizamos la respuesta de la transacción
          });
        });
        
        return Promise.all(promesas);
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // Blindado contra condiciones de carrera
      }
    );

    return NextResponse.json(
      { 
        success: true,
        message: `Se registraron ${registros.length} pieza(s) dental(es) correctamente.`,
        registros 
      }, 
      { status: 201 }
    );
  } catch (error) {
    // Manejo específico de errores de Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'El paciente asociado no fue encontrado.' }, { status: 404 });
      }
    }
    
    console.error('[ODONTOGRAMA][POST] Error crítico:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error interno al guardar el registro clínico. Intente nuevamente.' }, 
      { status: 500 }
    );
  }
}