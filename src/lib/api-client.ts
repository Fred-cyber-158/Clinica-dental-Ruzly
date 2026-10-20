import type {
  Cita,
  Cobro,
  FotoClinica,
  Paciente,
  PacienteDetalle,
  Receta,
  Tratamiento,
} from '@/types/clinica';

/** Error de API con el mensaje que devolvio el servidor y su codigo HTTP. */
export class ApiError extends Error {
  readonly estado: number;

  constructor(mensaje: string, estado: number) {
    super(mensaje);
    this.name = 'ApiError';
    this.estado = estado;
  }
}

export interface NuevoPaciente {
  nombre: string;
  ci?: string;
  edad?: string | number;
  telefono?: string;
  email?: string;
  alergias?: string;
}

export interface NuevaCita {
  pacienteId: string;
  fecha: string;
  hora: string;
  motivo?: string;
}

export interface NuevoTratamiento {
  pacienteId: string;
  descripcion: string;
  costo: string | number;
  montoPagado?: string | number;
}

export interface NuevaReceta {
  pacienteId: string;
  medicamentos: string;
  indicaciones?: string;
}

export interface NuevoCobro {
  pacienteId: string;
  montoTotal: string | number;
  montoPagado: string | number;
  metodo: string;
}

export interface NuevaFoto {
  url: string;
  descripcion?: string;
  pacienteId?: string;
}

const CABECERAS_JSON: HeadersInit = { 'Content-Type': 'application/json' };

function extraerMensaje(valor: unknown): string | null {
  if (!valor || typeof valor !== 'object' || !('error' in valor)) return null;
  const posible = (valor as { error?: unknown }).error;
  return typeof posible === 'string' && posible.trim().length > 0 ? posible : null;
}

/** Realiza la peticion y lanza ApiError con el mensaje del servidor si falla. */
async function pedir<T>(url: string, opciones?: RequestInit): Promise<T> {
  const respuesta = await fetch(url, opciones);

  if (!respuesta.ok) {
    const detalle: unknown = await respuesta.json().catch(() => null);
    throw new ApiError(
      extraerMensaje(detalle) ?? `La operacion fallo (codigo ${respuesta.status})`,
      respuesta.status,
    );
  }

  return (await respuesta.json()) as T;
}

function publicar<T>(url: string, cuerpo: unknown): Promise<T> {
  return pedir<T>(url, {
    method: 'POST',
    headers: CABECERAS_JSON,
    body: JSON.stringify(cuerpo),
  });
}

/** Mensaje legible para cualquier error capturado en un componente. */
export function mensajeDeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Ocurrio un error inesperado.';
}

export function obtenerPacientes(): Promise<Paciente[]> {
  return pedir<Paciente[]>('/api/pacientes');
}

export function crearPaciente(datos: NuevoPaciente): Promise<Paciente> {
  return publicar<Paciente>('/api/pacientes', datos);
}

export function obtenerPacienteDetalle(id: string): Promise<PacienteDetalle> {
  return pedir<PacienteDetalle>(`/api/pacientes/${encodeURIComponent(id)}`);
}

export function obtenerCitas(): Promise<Cita[]> {
  return pedir<Cita[]>('/api/citas');
}

export function crearCita(datos: NuevaCita): Promise<Cita> {
  return publicar<Cita>('/api/citas', datos);
}

export function obtenerTratamientos(): Promise<Tratamiento[]> {
  return pedir<Tratamiento[]>('/api/tratamientos');
}

export function crearTratamiento(datos: NuevoTratamiento): Promise<Tratamiento> {
  return publicar<Tratamiento>('/api/tratamientos', datos);
}

export function obtenerRecetas(): Promise<Receta[]> {
  return pedir<Receta[]>('/api/recetas');
}

export function crearReceta(datos: NuevaReceta): Promise<Receta> {
  return publicar<Receta>('/api/recetas', datos);
}

export function obtenerCobros(): Promise<Cobro[]> {
  return pedir<Cobro[]>('/api/cobros');
}

export function crearCobro(datos: NuevoCobro): Promise<Cobro> {
  return publicar<Cobro>('/api/cobros', datos);
}

export function obtenerFotos(): Promise<FotoClinica[]> {
  return pedir<FotoClinica[]>('/api/fotos');
}

export function crearFoto(datos: NuevaFoto): Promise<FotoClinica> {
  return publicar<FotoClinica>('/api/fotos', datos);
}
