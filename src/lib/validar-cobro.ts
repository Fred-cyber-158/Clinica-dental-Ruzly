// Reglas de cobros compartidas entre el formulario (cliente) y la API (servidor)
export const METODOS_PAGO = ['EFECTIVO', 'TRANSFERENCIA', 'QR', 'TARJETA'] as const;
export const MONTO_MAXIMO = 1_000_000;

export type CampoCobro = 'pacienteId' | 'nombre' | 'tratamientoId' | 'montoTotal' | 'montoPagado' | 'metodo';
export type ErroresCobro = Partial<Record<CampoCobro, string>>;

export interface DatosCobro {
  pacienteId: string | null;
  nombre: string;
  tratamientoId: string | null;
  montoTotal: number | null;
  montoPagado: number;
  metodo: string;
}

export type ResultadoCobro =
  | { ok: true; data: DatosCobro }
  | { ok: false; errores: ErroresCobro };

const RE_MONTO = /^\d+(\.\d{1,2})?$/;
const RE_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9' .&\-]+$/;

export const redondear = (n: number) => Math.round(n * 100) / 100;

export function leerMonto(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  
  let t = typeof v === 'number' ? String(v) : String(v).trim();
  if (!t) return null;

  if (t.includes(',')) {
    t = t.replace(/\./g, '').replace(',', '.');
  } else {
    const partes = t.split('.');
    if (partes.length > 2) {
      t = partes.slice(0, -1).join('') + '.' + partes[partes.length - 1];
    }
  }
  
  if (!RE_MONTO.test(t)) return null;
  
  const n = Number(t);
  return Number.isFinite(n) ? redondear(n) : null;
}

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function validarCobro(c: Record<string, unknown>): ResultadoCobro {
  const errores: ErroresCobro = {};

  const pacienteId = texto(c.pacienteId) || null;
  const tratamientoId = texto(c.tratamientoId) || null;
  
  if (pacienteId && pacienteId.length < 20) {
    errores.pacienteId = 'El identificador del paciente no es válido.';
  }
  
  if (tratamientoId) {
    if (!pacienteId) {
      errores.tratamientoId = 'Seleccione primero el paciente.';
    } else if (tratamientoId.length < 20) {
      errores.tratamientoId = 'El identificador del tratamiento no es válido.';
    }
  }

  const nombre = texto(c.nombre ?? c.nombreCliente ?? c.pacienteNombre).replace(/\s+/g, ' ').toUpperCase();
  
  if (!pacienteId) {
    if (nombre.length < 3) errores.nombre = 'Escriba el nombre del cliente (mínimo 3 caracteres).';
    else if (nombre.length > 80) errores.nombre = 'El nombre no puede superar 80 caracteres.';
    else if (!RE_NOMBRE.test(nombre)) errores.nombre = 'El nombre contiene caracteres no permitidos.';
  }

  let montoTotal: number | null = null;
  
  if (!tratamientoId) {
    montoTotal = leerMonto(c.montoTotal);
    if (montoTotal === null || montoTotal <= 0) {
      errores.montoTotal = 'Ingrese un monto total mayor a 0 (máximo 2 decimales).';
      montoTotal = null;
    } else if (montoTotal > MONTO_MAXIMO) {
      errores.montoTotal = `El monto no puede superar Bs. ${MONTO_MAXIMO.toLocaleString('es-BO')}.`;
    }
  }

  const montoPagado = leerMonto(c.montoPagado);
  
  if (montoPagado === null) {
    errores.montoPagado = 'Ingrese el monto pagado (máximo 2 decimales).';
  } else if (montoPagado <= 0) {
    errores.montoPagado = 'El pago debe ser mayor a 0.';
  } else if (montoPagado > MONTO_MAXIMO) {
    errores.montoPagado = 'El pago supera el máximo permitido.';
  } else if (montoTotal !== null && montoPagado > montoTotal) {
    errores.montoPagado = 'El pago no puede superar el monto total adeudado.';
  }

  const metodo = texto(c.metodo).toUpperCase() || 'EFECTIVO';
  if (!(METODOS_PAGO as readonly string[]).includes(metodo)) {
    errores.metodo = 'Método de pago no válido.';
  }

  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }

  // ✅ CORRECCIÓN: Usamos 'montoPagado!' porque ya validamos que no es null
  return {
    ok: true,
    data: { 
      pacienteId, 
      nombre, 
      tratamientoId, 
      montoTotal, 
      montoPagado: montoPagado!,  // ✅ Non-null assertion
      metodo 
    },
  };
}