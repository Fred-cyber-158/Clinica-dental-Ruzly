/**
 * Coercion defensiva de campos provenientes de JSON no confiable.
 * Las rutas de la API nunca deben confiar en el tipo declarado del cuerpo.
 */

/** Devuelve el texto recortado, o null si no es un string o queda vacio. */
export function textoLimpio(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  return limpio.length > 0 ? limpio : null;
}

/** Devuelve un numero finito, o null si el valor no representa un numero. */
export function numeroFinito(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

/** Devuelve un numero finito mayor o igual a cero, o null si no es valido. */
export function montoNoNegativo(valor: unknown): number | null {
  const numero = numeroFinito(valor);
  if (numero === null || numero < 0) return null;
  return numero;
}

/** Normaliza un identificador opcional: string recortado o null. */
export function idOpcional(valor: unknown): string | null {
  return textoLimpio(valor);
}
