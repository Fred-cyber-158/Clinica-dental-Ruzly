// Reglas de citas compartidas entre el formulario (cliente) y la API (servidor)
export const ESTADOS_CITA = ['PENDIENTE', 'CONFIRMADA', 'ATENDIDA', 'CANCELADA'] as const;
export type EstadoCita = (typeof ESTADOS_CITA)[number];

// ✅ Configuración del horario de la clínica: Lunes a Sábado, cada 30 minutos
const HORA_APERTURA = 8;
const HORA_CIERRE = 20; // La última cita es a las 19:30

export const HORARIOS: string[] = Array.from(
  { length: (HORA_CIERRE - HORA_APERTURA) * 2 },
  (_, i) => {
    const h = HORA_APERTURA + Math.floor(i / 2);
    return `${String(h).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`;
  }
);

export type CampoCita = 'pacienteId' | 'fecha' | 'hora' | 'motivo' | 'estado';
export type ErroresCita = Partial<Record<CampoCita, string>>;

export interface DatosCita {
  pacienteId: string;
  fecha: string;
  hora: string;
  motivo: string;
  estado: 'PENDIENTE' | 'CONFIRMADA';
}

export type ResultadoCita =
  | { ok: true; data: DatosCita }
  | { ok: false; errores: ErroresCita };

/**
 * Obtiene la fecha y hora actuales en Bolivia (America/La_Paz),
 * garantizando consistencia independientemente de la zona horaria del servidor.
 */
export function ahoraBolivia(): { fecha: string; hora: string } {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  
  const g = (t: string) => partes.find((p) => p.type === t)?.value ?? '00';
  return { fecha: `${g('year')}-${g('month')}-${g('day')}`, hora: `${g('hour')}:${g('minute')}` };
}

/**
 * Valida que un string tenga el formato de fecha real YYYY-MM-DD.
 * Evita fechas inválidas como 2024-02-30.
 */
export function esFechaReal(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const d = new Date(`${fecha}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(fecha);
}

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/**
 * Valida los datos de una cita antes de enviarlos al servidor.
 * Nota: La validación de colisión de horarios (anti-doble reserva) se realiza 
 * en el backend (API Route) mediante transacciones con aislamiento Serializable.
 */
export function validarCita(
  c: Record<string, unknown>,
  ahora: { fecha: string; hora: string } = ahoraBolivia()
): ResultadoCita {
  const errores: ErroresCita = {};

  // 1. Validar Paciente
  const pacienteId = texto(c.pacienteId);
  if (!pacienteId) {
    errores.pacienteId = 'Debe seleccionar un paciente.';
  }

  // 2. Validar Fecha
  const fecha = texto(c.fecha);
  if (!fecha) {
    errores.fecha = 'Debe seleccionar la fecha de la cita.';
  } else if (!esFechaReal(fecha)) {
    errores.fecha = 'El formato de la fecha no es válido.';
  } else {
    // Usamos T12:00:00Z para evitar que el desfase horario cambie el día de la semana
    const fechaObj = new Date(`${fecha}T12:00:00Z`);
    const ahoraObj = new Date(`${ahora.fecha}T12:00:00Z`);
    
    if (fecha < ahora.fecha) {
      errores.fecha = 'No se puede agendar una cita en una fecha pasada.';
    } else if (fechaObj.getUTCDay() === 0) {
      errores.fecha = 'La clínica no atiende los domingos. Por favor, elija otro día.';
    } else {
      // Cálculo preciso de 1 año (365 días) para evitar reservas absurdas a futuro
      const unAnoEnMs = 365 * 24 * 60 * 60 * 1000;
      if (fechaObj.getTime() - ahoraObj.getTime() > unAnoEnMs) {
        errores.fecha = 'La fecha está demasiado lejos. Máximo 1 año a partir de hoy.';
      }
    }
  }

  // 3. Validar Hora
  const hora = texto(c.hora);
  if (!hora) {
    errores.hora = 'Debe seleccionar un horario.';
  } else if (!HORARIOS.includes(hora)) {
    errores.hora = `Horario no válido. Atención de ${HORARIOS[0]} a ${HORARIOS[HORARIOS.length - 1]}, cada 30 minutos.`;
  } else if (!errores.fecha && fecha === ahora.fecha && hora <= ahora.hora) {
    errores.hora = 'Ese horario ya pasó. Por favor, elija una hora posterior.';
  }

  // 4. Validar Motivo (Sanitización defensiva contra caracteres de control)
  const motivo = texto(c.motivo)
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Elimina caracteres de control invisibles
    .replace(/\s+/g, ' ')                  // Colapsa espacios múltiples
    .toUpperCase();
    
  if (motivo.length > 150) {
    errores.motivo = 'El motivo de la consulta no puede superar los 150 caracteres.';
  }

  // 5. Validar Estado Inicial
  const estadoTxt = texto(c.estado).toUpperCase() || 'PENDIENTE';
  if (estadoTxt !== 'PENDIENTE' && estadoTxt !== 'CONFIRMADA') {
    errores.estado = 'Una cita nueva solo puede registrarse como PENDIENTE o CONFIRMADA.';
  }

  // 6. Resultado
  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }

  return {
    ok: true,
    data: {
      pacienteId,
      fecha,
      hora,
      motivo: motivo || 'CONSULTA GENERAL',
      estado: estadoTxt as 'PENDIENTE' | 'CONFIRMADA',
    },
  };
}