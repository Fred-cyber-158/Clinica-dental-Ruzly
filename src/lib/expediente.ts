import type {
  Cita as CitaPrisma,
  Receta as RecetaPrisma,
  Tratamiento as TratamientoPrisma,
} from '@prisma/client';
import type { EntradaHistorial } from '@/types/clinica';

/**
 * Utilidades de agregación del expediente clínico.
 *
 * Este módulo es SOLO de servidor: trabaja con los tipos de Prisma (fechas
 * como Date). Los tipos de `@/types/clinica` describen el JSON ya serializado
 * que consumen los componentes de cliente (fechas como string ISO).
 */

/** Resumen económico y de agenda de un paciente. */
export interface ResumenExpediente {
  totalCosto: number;
  totalPagado: number;
  saldoPendiente: number;
  citasPendientes: number;
}

export const ESTADO_CITA_PENDIENTE = 'PENDIENTE';

/**
 * Convierte un valor a fecha válida.
 * Si el valor no es parseable, retorna fecha epoch (1970-01-01) para evitar crashes.
 */
function aFechaValida(valor: string | Date): Date {
  const fecha = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(fecha.getTime()) ? new Date(0) : fecha;
}

/**
 * Combina fecha + hora de una cita.
 * Si no es parseable, usa createdAt como fallback seguro.
 */
function fechaDeCita(cita: CitaPrisma): Date {
  const combinada = cita.hora ? `${cita.fecha}T${cita.hora}` : cita.fecha;
  const fecha = new Date(combinada);
  return Number.isNaN(fecha.getTime()) ? aFechaValida(cita.createdAt) : fecha;
}

/** 
 * Redondea un número a 2 decimales de forma segura. 
 * Evita errores de punto flotante de JavaScript (ej: 0.1 + 0.2).
 */
export function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Construye la línea de tiempo clínica de un paciente a partir de sus
 * citas, tratamientos y recetas, ordenada de más reciente a más antigua.
 */
export function construirHistorial(
  citas: CitaPrisma[],
  tratamientos: TratamientoPrisma[],
  recetas: RecetaPrisma[],
): EntradaHistorial[] {
  const entradas: EntradaHistorial[] = [];

  // Agregar citas
  for (const cita of citas) {
    entradas.push({
      id: `cita-${cita.id}`,
      tipo: 'CITA',
      titulo: `Cita odontológica (${cita.estado})`,
      detalle: cita.motivo ?? 'Sin motivo registrado',
      fecha: fechaDeCita(cita).toISOString(),
    });
  }

  // Agregar tratamientos
  for (const tratamiento of tratamientos) {
    entradas.push({
      id: `tratamiento-${tratamiento.id}`,
      tipo: 'TRATAMIENTO',
      titulo: tratamiento.nombre,
      detalle: tratamiento.descripcion ?? 'Sin descripción',
      fecha: aFechaValida(tratamiento.createdAt).toISOString(),
    });
  }

  // Agregar recetas
  for (const receta of recetas) {
    entradas.push({
      id: `receta-${receta.id}`,
      tipo: 'RECETA',
      titulo: 'Receta médica emitida',
      detalle: `${receta.medicamento}${receta.indicaciones ? ` - ${receta.indicaciones}` : ''}`,
      fecha: aFechaValida(receta.createdAt).toISOString(),
    });
  }

  // Ordenar de más reciente a más antigua (Descendente)
  return entradas.sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  );
}

/**
 * Calcula totales de costo, pagos y citas pendientes de un paciente.
 */
export function calcularResumen(
  citas: CitaPrisma[],
  tratamientos: TratamientoPrisma[],
): ResumenExpediente {
  // ✅ MEJORA: Redondear en cada paso de la acumulación para evitar errores de precisión de float
  const totalCosto = tratamientos.reduce(
    (total, item) => redondear(total + (item.costo || 0)), 
    0
  );
  
  const totalPagado = tratamientos.reduce(
    (total, item) => redondear(total + (item.pagado || 0)), 
    0
  );

  return {
    totalCosto,
    totalPagado,
    // Math.max asegura que el saldo nunca sea negativo por anomalías de datos
    saldoPendiente: redondear(Math.max(totalCosto - totalPagado, 0)),
    citasPendientes: citas.filter((cita) => cita.estado === ESTADO_CITA_PENDIENTE).length,
  };
}