// src/lib/campos.ts
// Utilidades de validación y limpieza de campos compartidas (Caja de herramientas segura)

/**
 * Limpia un texto eliminando espacios al inicio/final.
 * ✅ PRESERVA acentos y caracteres válidos del español (ñ, tildes).
 */
export function limpiarTexto(valor: unknown): string {
  if (typeof valor !== 'string') return '';
  return valor.trim();
}

/**
 * Normaliza un texto para usarse como identificador, slug o username.
 * ✅ Elimina acentos, convierte a minúsculas y reemplaza espacios con guiones.
 */
export function normalizarSlug(valor: unknown): string {
  if (typeof valor !== 'string') return '';
  return valor
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
    .toLowerCase()
    .replace(/\s+/g, '-'); // Reemplaza espacios con guiones
}

/**
 * Valida que un email tenga formato correcto.
 */
export function validarEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return re.test(limpiarTexto(email).toLowerCase());
}

/**
 * Valida un teléfono boliviano (fijo o celular).
 */
export function validarTelefono(telefono: string): boolean {
  const limpio = telefono.replace(/[\s-]/g, '');
  const re = /^(\+591)?[23467]\d{7}$/;
  return re.test(limpio);
}

/**
 * Convierte un valor a número finito, o devuelve null si no es válido.
 */
export function numeroFinito(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Convierte un valor a monto no negativo (para precios, pagos, etc.).
 */
export function montoNoNegativo(valor: unknown): number | null {
  const numero = numeroFinito(valor);
  if (numero === null || numero < 0) return null;
  return Math.round(numero * 100) / 100; // Redondea a 2 decimales
}

/**
 * Normaliza un identificador opcional (devuelve string o null).
 */
export function idOpcional(valor: unknown): string | null {
  const limpio = limpiarTexto(valor);
  return limpio.length > 0 ? limpio : null;
}

/**
 * Valida que un C.I. boliviano tenga formato correcto.
 */
export function validarCI(ci: string): boolean {
  const limpio = limpiarTexto(ci).toUpperCase();
  const re = /^\d{5,10}(-[0-9A-Za-z]{1,2})?$/;
  return re.test(limpio);
}

/**
 * Valida que un nombre solo contenga letras, espacios, apóstrofes y guiones.
 * ✅ PRESERVA acentos y ñ.
 */
export function validarNombre(nombre: string): boolean {
  const re = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .\-]{3,80}$/;
  return re.test(limpiarTexto(nombre));
}

/**
 * Trunca un texto a una longitud máxima de forma segura.
 */
export function truncar(texto: string, max: number): string {
  if (!texto || typeof texto !== 'string') return '';
  if (texto.length <= max) return texto;
  return texto.slice(0, max).trim() + '...';
}