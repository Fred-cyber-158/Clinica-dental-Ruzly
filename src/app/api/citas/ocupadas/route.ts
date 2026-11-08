import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { noAutorizado, usuarioAutenticado } from '@/lib/sesion';
import { esFechaReal } from '@/lib/validar-cita';

/**
 * Devuelve solo las horas ocupadas de un día específico.
 * ✅ Optimizado para rendimiento y privacidad: no expone datos del paciente.
 */
export async function GET(request: Request) {
  try {
    const user = await usuarioAutenticado();
    if (!user) return noAutorizado();

    const fecha = new URL(request.url).searchParams.get('fecha') ?? '';
    
    if (!esFechaReal(fecha)) {
      return NextResponse.json({ error: 'Fecha no válida.' }, { status: 400 });
    }

    // ✅ Consulta ultra-ligera: solo necesitamos saber qué horas están bloqueadas.
    // Excluimos 'CANCELADA' para que esos horarios vuelvan a estar disponibles.
    const citas = await prisma.cita.findMany({
      where: { 
        fecha, 
        estado: { not: 'CANCELADA' } 
      },
      select: { hora: true },
    });

    // Mapeamos a un array simple de strings: ["08:00", "08:30", ...]
    const horasOcupadas: string[] = citas.map((c) => c.hora);
    
    return NextResponse.json(horasOcupadas);
  } catch (error) {
    console.error('[CITAS][OCUPADAS][GET] Error:', error);
    return NextResponse.json(
      { error: 'No se pudo consultar la disponibilidad.' }, 
      { status: 500 }
    );
  }
}