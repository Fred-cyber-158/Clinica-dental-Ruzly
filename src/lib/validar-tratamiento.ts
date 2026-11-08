// Reglas de tratamientos compartidas entre el formulario (cliente) y la API (servidor)
import { leerMonto, METODOS_PAGO, MONTO_MAXIMO } from '@/lib/validar-cobro';

export type CampoTratamiento = 'pacienteId' | 'nombre' | 'descripcion' | 'costo' | 'anticipo' | 'metodo';
export type ErroresTratamiento = Partial<Record<CampoTratamiento, string>>;

export interface DatosTratamiento {
  pacienteId: string;
  nombre: string;
  descripcion: string | null;
  costo: number;
  anticipo: number;
  metodo: string;
}

export type ResultadoTratamiento =
  | { ok: true; data: DatosTratamiento }
  | { ok: false; errores: ErroresTratamiento };

const RE_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9' .,()\/+-]+$/;

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function validarTratamiento(c: Record<string, unknown>): ResultadoTratamiento {
  const errores: ErroresTratamiento = {};

  // 1. Validación de Paciente
  const pacienteId = texto(c.pacienteId);
  if (!pacienteId) {
    errores.pacienteId = 'Seleccione un paciente.';
  }

  // 2. Validación de Nombre del Tratamiento
  const nombre = texto(c.nombre).replace(/\s+/g, ' ').toUpperCase();
  if (nombre.length < 3) {
    errores.nombre = 'Escriba el nombre del tratamiento (mínimo 3 caracteres).';
  } else if (nombre.length > 100) {
    errores.nombre = 'El nombre no puede superar 100 caracteres.';
  } else if (!RE_NOMBRE.test(nombre)) {
    errores.nombre = 'El nombre contiene caracteres no permitidos.';
  }

  // 3. Validación de Descripción (Opcional, con sanitización defensiva)
  const descripcionTxt = texto(c.descripcion)
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
    
  if (descripcionTxt.length > 300) {
    errores.descripcion = 'La descripción no puede superar 300 caracteres.';
  }

  // 4. Validación de Costo
  const costo = leerMonto(c.costo);
  if (costo === null || costo <= 0) {
    errores.costo = 'Ingrese un costo mayor a 0 (máximo 2 decimales).';
  } else if (costo > MONTO_MAXIMO) {
    errores.costo = `El costo no puede superar Bs. ${MONTO_MAXIMO.toLocaleString('es-BO')}.`;
  }

  // 5. Validación de Anticipo
  const anticipoTxt = texto(c.anticipo ?? c.pagado);
  let anticipo = 0;
  
  if (anticipoTxt !== '') {
    const a = leerMonto(anticipoTxt);
    if (a === null) {
      errores.anticipo = 'El anticipo no es un monto válido (máximo 2 decimales).';
    } else if (costo !== null && a > costo) {
      errores.anticipo = 'El anticipo no puede superar el costo total del tratamiento.';
    } else {
      anticipo = a;
    }
  }

  // 6. Validación de Método de Pago
  const metodo = texto(c.metodo).toUpperCase() || 'EFECTIVO';
  if (anticipo > 0 && !(METODOS_PAGO as readonly string[]).includes(metodo)) {
    errores.metodo = 'Método de pago no válido para el anticipo.';
  }

  // 7. Retorno de resultados
  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }

  // ✅ CORRECCIÓN: Usamos 'costo!' para decirle a TypeScript que definitivamente es number
  return {
    ok: true,
    data: { 
      pacienteId, 
      nombre, 
      descripcion: descripcionTxt || null, 
      costo: costo!,  // ✅ Non-null assertion: Ya validamos que no es null ni <= 0
      anticipo, 
      metodo 
    },
  };
}