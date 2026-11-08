// Reglas de recetas compartidas entre el formulario (cliente) y la API (servidor)
export type CampoReceta = 'pacienteId' | 'medicamento' | 'indicaciones';
export type ErroresReceta = Partial<Record<CampoReceta, string>>;

export interface DatosReceta {
  pacienteId: string;
  medicamento: string;
  indicaciones: string;
}

export type ResultadoReceta =
  | { ok: true; data: DatosReceta }
  | { ok: false; errores: ErroresReceta };

// ✅ Regex blindada: permite letras, números, espacios y símbolos médicos comunes (%, (), /, +, -)
// El guion '-' está escapado al final para evitar advertencias de linters estrictos.
const RE_MEDICAMENTO = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9' .,%()\/+\-]+$/;

/**
 * Función auxiliar segura para convertir cualquier valor a string limpio.
 */
const texto = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/**
 * Valida los datos de una receta médica antes de procesarla.
 * Garantiza que el medicamento y las indicaciones cumplan con los estándares clínicos.
 * ⚠️ NOTA: La validación de conflictos con alergias del paciente se realiza 
 * en el componente UI (alerta en tiempo real) y se revalida en la API Route.
 */
export function validarReceta(c: Record<string, unknown>): ResultadoReceta {
  const errores: ErroresReceta = {};

  // 1. Validación de Paciente
  const pacienteId = texto(c.pacienteId);
  if (!pacienteId) {
    errores.pacienteId = 'Debe seleccionar un paciente.';
  }

  // 2. Validación de Medicamento
  const medicamentoRaw = texto(c.medicamento);
  const medicamento = medicamentoRaw.replace(/\s+/g, ' ').toUpperCase();
  
  if (medicamento.length < 3) {
    errores.medicamento = 'Escriba el medicamento con su concentración (mínimo 3 caracteres).';
  } else if (medicamento.length > 100) {
    errores.medicamento = 'El nombre del medicamento no puede superar los 100 caracteres.';
  } else if (!RE_MEDICAMENTO.test(medicamento)) {
    errores.medicamento = 'El medicamento contiene caracteres no permitidos.';
  }

  // 3. Validación de Indicaciones
  const indicacionesRaw = texto(c.indicaciones);
  // ✅ MEJORA: Normaliza saltos de línea de Windows (\r\n) a Unix (\n) 
  // y colapsa espacios/tabulaciones, preservando la estructura multilinea.
  const indicaciones = indicacionesRaw
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .toUpperCase();
  
  if (indicaciones.length < 5) {
    errores.indicaciones = 'Indique dosis, frecuencia y duración (mínimo 5 caracteres).';
  } else if (indicaciones.length > 500) {
    errores.indicaciones = 'Las indicaciones no pueden superar los 500 caracteres.';
  }

  // 4. Resultado
  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }

  return { 
    ok: true, 
    data: { 
      pacienteId, 
      medicamento, 
      indicaciones 
    } 
  };
}