// src/lib/formato.ts
// Utilidades de formato compartidas (Zona horaria oficial de Bolivia)

/** Zona horaria oficial de Bolivia */
export const ZONA_HORA_BOLIVIA = 'America/La_Paz';

/**
 * Formatea un valor numérico como moneda boliviana (Bs.).
 * Maneja de forma segura números, strings, null y undefined.
 * También corrige formatos donde el usuario usa comas para decimales.
 * 
 * @param valor - El número o string a formatear
 * @returns String formateado (Ej: "Bs. 1.250,50")
 */
export function moneda(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') {
    return 'Bs. 0,00';
  }

  // Limpiar el string: quitar puntos de miles y reemplazar coma decimal por punto
  // Ej: "1.234,56" -> "1234.56" para que Number() lo parseé correctamente
  const valorLimpio = String(valor).replace(/\./g, '').replace(',', '.');
  const numero = Number(valorLimpio);

  if (Number.isNaN(numero)) {
    return 'Bs. 0,00';
  }

  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numero);
}

/**
 * Convierte una fecha (ISO, Date o timestamp) a formato YYYY-MM-DD en hora de Bolivia.
 * Utiliza 'en-CA' porque es el único locale que garantiza consistentemente el formato YYYY-MM-DD.
 * 
 * @param fechaEntrada - Fecha en string ISO, objeto Date, timestamp o null/undefined
 * @returns String en formato YYYY-MM-DD o '—' si es inválida
 */
export function fechaBolivia(fechaEntrada: string | Date | number | null | undefined): string {
  if (!fechaEntrada) return '—';

  const fecha = new Date(fechaEntrada);
  
  // Validar que la fecha sea real (new Date('invalido') devuelve NaN en getTime)
  if (Number.isNaN(fecha.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORA_BOLIVIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha);
}

/**
 * Convierte una fecha a formato legible: DD/MM/AAAA, HH:MM en hora de Bolivia.
 * 
 * @param fechaEntrada - Fecha en string ISO, objeto Date, timestamp o null/undefined
 * @returns String formateado o '—' si es inválida
 */
export function fechaHoraBolivia(fechaEntrada: string | Date | number | null | undefined): string {
  if (!fechaEntrada) return '—';

  const fecha = new Date(fechaEntrada);
  if (Number.isNaN(fecha.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('es-BO', {
    timeZone: ZONA_HORA_BOLIVIA,
    dateStyle: 'short', // DD/MM/AA
    timeStyle: 'short', // HH:MM
  }).format(fecha);
}

/**
 * Obtiene solo la hora en formato HH:MM (24 horas) en hora de Bolivia.
 * Muy útil para mostrar horarios de citas en listas o tablas.
 * 
 * @param fechaEntrada - Fecha en string ISO, objeto Date, timestamp o null/undefined
 * @returns String en formato HH:MM o '—' si es inválida
 */
export function horaBolivia(fechaEntrada: string | Date | number | null | undefined): string {
  if (!fechaEntrada) return '—';

  const fecha = new Date(fechaEntrada);
  if (Number.isNaN(fecha.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('es-BO', {
    timeZone: ZONA_HORA_BOLIVIA,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false, // Formato 24 horas (ej: 14:30 en lugar de 02:30 p. m.)
  }).format(fecha);
}

/**
 * Capitaliza la primera letra de cada palabra en un string.
 * Útil para mostrar nombres propios de forma elegante si vienen en minúsculas.
 * 
 * @param texto - El texto a capitalizar
 * @returns Texto capitalizado
 */
export function capitalizar(texto: string): string {
  if (!texto || typeof texto !== 'string') return '';
  
  return texto
    .toLowerCase()
    .split(' ')
    .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
}

/**
 * Formatea un número de teléfono boliviano para mejor legibilidad visual.
 * Ej: "70012345" -> "700 12345" 
 * Ej: "+59170012345" -> "+591 700 12345"
 * 
 * @param telefono - El número de teléfono como string
 * @returns Teléfono formateado o '—' si está vacío
 */
export function formatearTelefono(telefono: string | null | undefined): string {
  if (!telefono) return '—';
  
  // Eliminar todo lo que no sea dígito
  const limpio = telefono.replace(/\D/g, '');
  
  // Patrón: +591 seguido de 8 dígitos (total 11)
  if (limpio.startsWith('591') && limpio.length === 11) {
    return `+591 ${limpio.slice(3, 6)} ${limpio.slice(6)}`;
  }
  
  // Patrón: 8 dígitos estándar (celular o fijo)
  if (limpio.length === 8) {
    return `${limpio.slice(0, 3)} ${limpio.slice(3)}`;
  }
  
  // Si no coincide con patrones conocidos, devolver el original limpio de espacios raros
  return telefono.trim();
}