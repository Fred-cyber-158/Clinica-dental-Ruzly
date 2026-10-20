import { numeroFinito, textoLimpio } from '@/lib/campos';

/**
 * Normaliza el cuerpo de POST /api/pacientes.
 *
 * El formulario web envia { nombre, telefono, email } mientras que otros
 * clientes (movil) envian { nombres, apellidos, celular, correo }. Se aceptan
 * ambos formatos para no romper a ningun consumidor.
 */

export interface PacienteInputCrudo {
  nombre?: unknown;
  nombres?: unknown;
  apellidos?: unknown;
  ci?: unknown;
  edad?: unknown;
  telefono?: unknown;
  celular?: unknown;
  email?: unknown;
  correo?: unknown;
  alergias?: unknown;
}

export interface PacienteDataNormalizada {
  nombre: string;
  ci: string | null;
  edad: number | null;
  telefono: string | null;
  email: string | null;
  alergias: string | null;
}

export type ResultadoNormalizacion =
  | { ok: true; data: PacienteDataNormalizada }
  | { ok: false; error: string };

const EDAD_MINIMA = 0;
const EDAD_MAXIMA = 130;

function combinarNombre(
  nombreDirecto: string | null,
  nombres: string | null,
  apellidos: string | null,
): string | null {
  if (nombreDirecto) return nombreDirecto;
  const partes = [nombres, apellidos].filter((parte): parte is string => parte !== null);
  const combinado = partes.join(' ').trim();
  return combinado.length > 0 ? combinado : null;
}

export function normalizarPaciente(cuerpo: PacienteInputCrudo): ResultadoNormalizacion {
  const nombre = combinarNombre(
    textoLimpio(cuerpo.nombre),
    textoLimpio(cuerpo.nombres),
    textoLimpio(cuerpo.apellidos),
  );

  if (!nombre) {
    return { ok: false, error: 'El nombre del paciente es obligatorio' };
  }

  const edad = numeroFinito(cuerpo.edad);
  if (edad !== null && (edad < EDAD_MINIMA || edad > EDAD_MAXIMA)) {
    return { ok: false, error: `La edad debe estar entre ${EDAD_MINIMA} y ${EDAD_MAXIMA} anios` };
  }

  const email = textoLimpio(cuerpo.email) ?? textoLimpio(cuerpo.correo);
  if (email && !email.includes('@')) {
    return { ok: false, error: 'El correo electronico no es valido' };
  }

  return {
    ok: true,
    data: {
      nombre,
      ci: textoLimpio(cuerpo.ci),
      edad,
      telefono: textoLimpio(cuerpo.telefono) ?? textoLimpio(cuerpo.celular),
      email,
      alergias: textoLimpio(cuerpo.alergias),
    },
  };
}
