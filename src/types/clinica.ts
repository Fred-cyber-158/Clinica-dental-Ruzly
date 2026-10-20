/**
 * Tipos compartidos del dominio clinico.
 * Deben reflejar exactamente la forma en que las rutas de /api responden.
 */

export interface Paciente {
  id: string;
  nombre: string;
  edad: number | null;
  telefono: string | null;
  email: string | null;
  ci: string | null;
  alergias: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Cita {
  id: string;
  fecha: string;
  hora: string;
  motivo: string | null;
  estado: string;
  pacienteId: string;
  paciente?: Pick<Paciente, 'id' | 'nombre'>;
  createdAt: string;
}

export interface Tratamiento {
  id: string;
  nombre: string;
  descripcion: string | null;
  costo: number;
  pagado: number;
  pacienteId: string | null;
  paciente?: Pick<Paciente, 'id' | 'nombre'> | null;
  createdAt: string;
}

export interface Receta {
  id: string;
  medicamentos: string;
  indicaciones: string | null;
  pacienteId: string;
  paciente?: Pick<Paciente, 'id' | 'nombre'>;
  createdAt: string;
}

export interface FotoClinica {
  id: string;
  url: string;
  descripcion: string | null;
  pacienteId: string | null;
  paciente?: Pick<Paciente, 'id' | 'nombre'> | null;
  createdAt: string;
}

export interface Cobro {
  id: string;
  pacienteNombre: string;
  montoTotal: number;
  montoPagado: number;
  saldo: number;
  metodo: string;
  createdAt: string;
}

/** Evento unificado del historial clinico de un paciente. */
export interface EntradaHistorial {
  id: string;
  tipo: 'CITA' | 'TRATAMIENTO' | 'RECETA';
  titulo: string;
  detalle: string | null;
  fecha: string;
}

/** Respuesta de GET /api/pacientes/[id]. */
export interface PacienteDetalle {
  paciente: Paciente;
  historial: EntradaHistorial[];
  citas: Cita[];
  tratamientos: Tratamiento[];
  recetas: Receta[];
  fotos: FotoClinica[];
  resumen: {
    totalCosto: number;
    totalPagado: number;
    saldoPendiente: number;
    citasPendientes: number;
  };
}

/** Envoltura estandar de error devuelta por la API. */
export interface ApiError {
  error: string;
}
