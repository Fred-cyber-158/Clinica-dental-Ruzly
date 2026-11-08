// Reglas del odontograma compartidas entre el formulario (cliente) y la API (servidor)
const PIEZAS_PERMANENTES = [
  ...[11, 12, 13, 14, 15, 16, 17, 18],
  ...[21, 22, 23, 24, 25, 26, 27, 28],
  ...[31, 32, 33, 34, 35, 36, 37, 38],
  ...[41, 42, 43, 44, 45, 46, 47, 48],
];
const PIEZAS_TEMPORALES = [
  ...[51, 52, 53, 54, 55],
  ...[61, 62, 63, 64, 65],
  ...[71, 72, 73, 74, 75],
  ...[81, 82, 83, 84, 85],
];
export const PIEZAS_FDI = new Set([...PIEZAS_PERMANENTES, ...PIEZAS_TEMPORALES].map(String));

export const PARTES_VALIDAS = new Set([
  'VES', 'MES', 'OCL', 'DIS', 'LIN', 'RAIZ_M', 'RAIZ_V', 'RAIZ_D', 'RAIZ_P', 'RAIZ_1',
]);
export const ESTADOS_ODONTOGRAMA = ['DIAGNÓSTICO', 'EN PROCESO', 'TERMINADO'] as const;

// Límite de la observación clínica (notas SOAP + signos vitales + referencias)
export const MAX_OBSERVACION = 3000;

export interface PiezaSeleccionada {
  pieza: string;
  partes: string[];
}

export interface DatosOdontograma {
  pacienteId: string;
  piezas: PiezaSeleccionada[];
  hallazgo: string;
  estado: string;
  observacion: string | null;
}

export type ResultadoOdontograma =
  | { ok: true; data: DatosOdontograma }
  | { ok: false; error: string };

const texto = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** Texto que se guarda en la columna "pieza" (mismo formato que usa el historial). */
export const describirPieza = (p: PiezaSeleccionada): string =>
  `PIEZA ${p.pieza} [PARTES/CARAS: ${p.partes.join(', ')}]`;

export function validarOdontograma(c: Record<string, unknown>): ResultadoOdontograma {
  const pacienteId = texto(c.pacienteId);
  if (!pacienteId) return { ok: false, error: 'Seleccione un paciente.' };

  if (!Array.isArray(c.piezas) || c.piezas.length === 0) {
    return { ok: false, error: 'Seleccione al menos una pieza dental en el mapa.' };
  }
  if (c.piezas.length > 32) return { ok: false, error: 'Se enviaron demasiadas piezas.' };

  const vistas = new Set<string>();
  const piezas: PiezaSeleccionada[] = [];
  
  for (const item of c.piezas as unknown[]) {
    const o = (item ?? {}) as Record<string, unknown>;
    const pieza = texto(o.pieza);
    
    if (!PIEZAS_FDI.has(pieza)) {
      return { ok: false, error: `La pieza "${pieza || '?'}" no existe en la numeración FDI.` };
    }
    if (vistas.has(pieza)) return { ok: false, error: `La pieza ${pieza} está repetida.` };
    vistas.add(pieza);

    const partes = Array.isArray(o.partes) ? (o.partes as unknown[]).map(texto) : [];
    if (partes.length === 0) {
      return { ok: false, error: `Seleccione al menos una cara o raíz de la pieza ${pieza}.` };
    }
    if (partes.some((p) => !PARTES_VALIDAS.has(p))) {
      return { ok: false, error: `La pieza ${pieza} tiene una cara o raíz no válida.` };
    }
    piezas.push({ pieza, partes: [...new Set(partes)] });
  }

  const hallazgo = texto(c.hallazgo).replace(/\s+/g, ' ').toUpperCase();
  if (hallazgo.length < 2) return { ok: false, error: 'El criterio de diagnóstico o hallazgo es obligatorio.' };
  if (hallazgo.length > 150) return { ok: false, error: 'El hallazgo no puede superar 150 caracteres.' };

  const estado = texto(c.estado).toUpperCase() || 'DIAGNÓSTICO';
  if (!(ESTADOS_ODONTOGRAMA as readonly string[]).includes(estado)) {
    return { ok: false, error: 'Estado no válido. Use DIAGNÓSTICO, EN PROCESO o TERMINADO.' };
  }

  // ✅ MEJORA: Normalización robusta de la observación (elimina saltos de línea múltiples y caracteres de control)
  const observacionRaw = texto(c.observacion).toUpperCase();
  const observacion = observacionRaw.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  
  if (observacion.length > MAX_OBSERVACION) {
    return { ok: false, error: `La observación clínica supera los ${MAX_OBSERVACION} caracteres.` };
  }

  return {
    ok: true,
    data: { pacienteId, piezas, hallazgo, estado, observacion: observacion || null },
  };
}