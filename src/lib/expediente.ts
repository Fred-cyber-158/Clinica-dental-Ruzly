import type {
  Cita as CitaPrisma,
  Receta as RecetaPrisma,
  Tratamiento as TratamientoPrisma,
} from '@prisma/client';
import type { EntradaHistorial } from '@/types/clinica';

/**
 * Utilidades de agregacion del expediente clinico.
 *
 * Este modulo es SOLO de servidor: trabaja con los tipos de Prisma (fechas
 * como Date). Los tipos de `@/types/clinica` describen el JSON ya serializado
 * que consumen los componentes de cliente (fechas como string ISO).
 */

/** Resumen economico y de agenda de un paciente. */
export interface ResumenExpediente {
  totalCosto: number;
  totalPagado: number;
  saldoPendiente: number;
  citasPendientes: number;
}

export const ESTADO_CITA_PENDIENTE = 'PENDIENTE';

function aFechaValida(valor: string | Date): Date {
  const fecha = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(fecha.getTime()) ? new Date(0) : fecha;
}

/** Combina fecha + hora de una cita; si no es parseable usa createdAt. */
function fechaDeCita(cita: CitaPrisma): Date {
  const combinada = cita.hora ? `${cita.fecha}T${cita.hora}` : cita.fecha;
  const fecha = new Date(combinada);
  return Number.isNaN(fecha.getTime()) ? aFechaValida(cita.createdAt) : fecha;
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Construye la linea de tiempo clinica de un paciente a partir de sus
 * citas, tratamientos y recetas, ordenada de mas reciente a mas antigua.
 */
export function construirHistorial(
  citas: CitaPrisma[],
  tratamientos: TratamientoPrisma[],
  recetas: RecetaPrisma[],
): EntradaHistorial[] {
  const entradas: EntradaHistorial[] = [];

  for (const cita of citas) {
    entradas.push({
      id: `cita-${cita.id}`,
      tipo: 'CITA',
      titulo: `Cita odontologica (${cita.estado})`,
      detalle: cita.motivo,
      fecha: fechaDeCita(cita).toISOString(),
    });
  }

  for (const tratamiento of tratamientos) {
    entradas.push({
      id: `tratamiento-${tratamiento.id}`,
      tipo: 'TRATAMIENTO',
      titulo: tratamiento.nombre,
      detalle: tratamiento.descripcion,
      fecha: aFechaValida(tratamiento.createdAt).toISOString(),
    });
  }

  for (const receta of recetas) {
    entradas.push({
      id: `receta-${receta.id}`,
      tipo: 'RECETA',
      titulo: 'Receta medica emitida',
      detalle: `${receta.medicamento}${receta.indicaciones ? ` - ${receta.indicaciones}` : ''}`,
      fecha: aFechaValida(receta.createdAt).toISOString(),
    });
  }

  return entradas.sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  );
}

/** Totales de costo, pagos y citas pendientes de un paciente. */
export function calcularResumen(
  citas: CitaPrisma[],
  tratamientos: TratamientoPrisma[],
): ResumenExpediente {
  const totalCosto = tratamientos.reduce((total, item) => total + item.costo, 0);
  const totalPagado = tratamientos.reduce((total, item) => total + item.pagado, 0);

  return {
    totalCosto: redondear(totalCosto),
    totalPagado: redondear(totalPagado),
    saldoPendiente: redondear(Math.max(totalCosto - totalPagado, 0)),
    citasPendientes: citas.filter((cita) => cita.estado === ESTADO_CITA_PENDIENTE).length,
  };
}