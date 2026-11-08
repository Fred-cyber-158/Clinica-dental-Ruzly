// src/types/clinica.ts
// Tipos compartidos del dominio clínico

export interface Paciente {
  id: string;
  nombre: string;
  edad: number | null;
  telefono: string | null;
  email: string | null;
  ci: string | null;
  alergias: string | null;
  activo: boolean;
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
  activo: boolean;
  pacienteId: string | null;
  paciente?: Pick<Paciente, 'id' | 'nombre'> | null;
  createdAt: string;
}

export interface Receta {
  id: string;
  medicamento: string;  // ✅ Singular, como en la BD
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
  pacienteId: string | null;
  paciente?: Pick<Paciente, 'id' | 'nombre'> | null;
  createdAt: string;
}

export interface Odontograma {
  id: string;
  pieza: string;
  hallazgo: string;
  estado: string;
  observacion: string | null;
  pacienteId: string;
  paciente?: Pick<Paciente, 'id' | 'nombre'>;
  createdAt: string;
}

export interface Usuario {
  id: string;
  username: string;
  nombre: string;
  email: string | null;
  rol: 'ADMINISTRADOR' | 'ODONTOLOGO' | 'RECEPCIONISTA' | 'PACIENTE';
  activo: boolean;
  pacienteId: string | null;
  createdAt: string;
}

/** Evento unificado del historial clínico de un paciente. */
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

/** Envoltura estándar de error devuelta por la API. */
export interface ApiError {
  error: string;
}