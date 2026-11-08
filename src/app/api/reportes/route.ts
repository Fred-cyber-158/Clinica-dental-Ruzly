import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { noAutorizado, prohibido, usuarioAutenticado } from '@/lib/sesion';

/**
 * Endpoint consolidado para reportes globales.
 * Devuelve los datos necesarios para generar los reportes del sistema.
 * 
 * Parámetros de consulta opcionales:
 * - fechaInicio: YYYY-MM-DD
 * - fechaFin: YYYY-MM-DD
 * - pacienteId: UUID (para reportes individuales)
 */
export async function GET(request: Request) {
  try {
    const user = await usuarioAutenticado();
    if (!user) return noAutorizado();

    // 🛡️ SEGURIDAD: Los reportes globales son exclusivos para Administrador y Recepcionista.
    if (user.rol === 'PACIENTE' || user.rol === 'ODONTOLOGO') {
      return prohibido();
    }

    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const pacienteId = searchParams.get('pacienteId');

    // ✅ VALIDACIÓN: Formato de fecha estricto (YYYY-MM-DD)
    const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
    if (fechaInicio && !RE_FECHA.test(fechaInicio)) {
      return NextResponse.json({ error: 'Formato de fecha de inicio inválido. Use YYYY-MM-DD.' }, { status: 400 });
    }
    if (fechaFin && !RE_FECHA.test(fechaFin)) {
      return NextResponse.json({ error: 'Formato de fecha de fin inválido. Use YYYY-MM-DD.' }, { status: 400 });
    }
    if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
      return NextResponse.json({ error: 'La fecha de inicio no puede ser posterior a la fecha de fin.' }, { status: 400 });
    }

    const filtroPaciente = pacienteId ? { pacienteId } : {};

    // 🛠️ CORRECCIÓN CRÍTICA DE ZONA HORARIA:
    // Las citas se filtran por 'fecha' (string YYYY-MM-DD), la comparación lexicográfica de Prisma funciona perfecto.
    const filtroFechaCitas = (fechaInicio || fechaFin) ? {
      fecha: {
        ...(fechaInicio && { gte: fechaInicio }),
        ...(fechaFin && { lte: fechaFin }),
      }
    } : {};

    // ✅ CORRECCIÓN: Usamos el offset de Bolivia (-04:00) para garantizar que el reporte 
    // capture el día completo, sin importar la zona horaria del servidor (Vercel, Render, etc.).
    const filtroFechaMovimientos = (fechaInicio || fechaFin) ? {
      createdAt: {
        ...(fechaInicio && { gte: new Date(`${fechaInicio}T00:00:00-04:00`) }),
        ...(fechaFin && { lte: new Date(`${fechaFin}T23:59:59.999-04:00`) }),
      }
    } : {};

    // Ejecutar consultas en paralelo para máxima eficiencia (Lectura concurrente)
    const [pacientes, citas, tratamientos, cobros] = await Promise.all([
      // 1. Pacientes activos
      prisma.paciente.findMany({
        where: { activo: true, ...filtroPaciente },
        select: {
          id: true,
          nombre: true,
          ci: true,
          telefono: true,
          email: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),

      // 2. Citas (Filtradas por fecha de atención)
      prisma.cita.findMany({
        where: {
          ...filtroPaciente,
          ...filtroFechaCitas,
        },
        select: {
          id: true,
          fecha: true,
          hora: true,
          motivo: true,
          estado: true,
          createdAt: true,
          paciente: { select: { id: true, nombre: true, ci: true } },
        },
        orderBy: [{ fecha: 'desc' }, { hora: 'desc' }],
        take: 1000,
      }),

      // 3. Tratamientos (Filtrados por fecha de creación del plan)
      prisma.tratamiento.findMany({
        where: {
          ...filtroPaciente,
          ...filtroFechaMovimientos,
        },
        select: {
          id: true,
          nombre: true,
          costo: true,
          pagado: true,
          activo: true,
          createdAt: true,
          paciente: { select: { id: true, nombre: true, ci: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),

      // 4. Cobros (Filtrados por fecha del movimiento financiero)
      prisma.cobro.findMany({
        where: {
          ...filtroPaciente,
          ...filtroFechaMovimientos,
        },
        select: {
          id: true,
          montoTotal: true,
          montoPagado: true,
          saldo: true,
          metodo: true,
          createdAt: true,
          paciente: { select: { id: true, nombre: true, ci: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
    ]);

    // Cálculos financieros rápidos para el metadata
    const ingresoTotal = cobros.reduce((sum, cobro) => sum + Number(cobro.montoPagado), 0);
    const saldoPendiente = cobros.reduce((sum, cobro) => sum + Number(cobro.saldo), 0);

    // Retornar datos consolidados
    return NextResponse.json({
      success: true,
      data: {
        pacientes,
        citas,
        tratamientos,
        cobros,
      },
      metadata: {
        totalPacientes: pacientes.length,
        totalCitas: citas.length,
        totalTratamientos: tratamientos.length,
        totalCobros: cobros.length,
        resumenFinanciero: {
          ingresoTotal: Number(ingresoTotal.toFixed(2)),
          saldoPendiente: Number(saldoPendiente.toFixed(2)),
        },
        fechaConsulta: new Date().toISOString(),
        filtros: {
          fechaInicio: fechaInicio || null,
          fechaFin: fechaFin || null,
          pacienteId: pacienteId || null,
        },
      },
    });
  } catch (error) {
    console.error('[REPORTES][GET] Error crítico:', error);
    return NextResponse.json(
      { error: 'No se pudo obtener los datos para los reportes.' },
      { status: 500 }
    );
  }
}