'use client';

import { useMemo, useSyncExternalStore } from 'react';

export const CLAVE_SESION_STORAGE = 'usuario_activo';
export const EVENTO_SESION_ACTUALIZADA = 'sesion-actualizada';

export const ROLES_VALIDOS = [
  'ADMINISTRADOR',
  'ODONTOLOGO',
  'RECEPCIONISTA',
  'PACIENTE',
] as const;

export type RolUsuario = typeof ROLES_VALIDOS[number];

export interface UsuarioSesion {
  id?: string;
  nombre: string;
  username: string;
  rol: RolUsuario;
  email?: string | null;
}

function validarEstructuraSesion(data: unknown): UsuarioSesion | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;

  if (typeof obj.nombre !== 'string' || obj.nombre.trim().length === 0) return null;
  if (typeof obj.username !== 'string' || obj.username.trim().length === 0) return null;
  if (typeof obj.rol !== 'string') return null;

  const rolLimpio = obj.rol.toString().trim().toUpperCase();
  
  // ✅ CORRECCIÓN: Validación estricta. CERO tolerancia a 'ODONTO_LOGO'.
  if (!ROLES_VALIDOS.includes(rolLimpio as RolUsuario)) {
    return null;
  }

  const usuario: UsuarioSesion = {
    nombre: obj.nombre.trim(),
    username: obj.username.trim(),
    rol: rolLimpio as RolUsuario,
  };

  if (typeof obj.id === 'string' && obj.id.trim().length > 0) {
    usuario.id = obj.id.trim();
  }
  if (obj.email === null || (typeof obj.email === 'string' && obj.email.trim().length > 0)) {
    usuario.email = typeof obj.email === 'string' ? obj.email.trim() : null;
  }

  return usuario;
}

function suscribir(cb: () => void): () => void {
  window.addEventListener('storage', cb);
  window.addEventListener(EVENTO_SESION_ACTUALIZADA, cb);
  return () => {
    window.removeEventListener('storage', cb);
    window.removeEventListener(EVENTO_SESION_ACTUALIZADA, cb);
  };
}

function obtenerSesionCruda(): string | null {
  try {
    return localStorage.getItem(CLAVE_SESION_STORAGE);
  } catch {
    return null;
  }
}

function notificarCambioSesion(): void {
  try {
    window.dispatchEvent(new Event(EVENTO_SESION_ACTUALIZADA));
  } catch {
    // Ignorar errores de entorno restringido
  }
}

export function useSesion(): UsuarioSesion | null {
  const guardado = useSyncExternalStore(suscribir, obtenerSesionCruda, () => null);

  return useMemo(() => {
    if (!guardado) return null;
    try {
      const datos = JSON.parse(guardado);
      const usuario = validarEstructuraSesion(datos);
      if (!usuario) {
        localStorage.removeItem(CLAVE_SESION_STORAGE);
        return null;
      }
      return usuario;
    } catch {
      localStorage.removeItem(CLAVE_SESION_STORAGE);
      return null;
    }
  }, [guardado]);
}

export function guardarSesion(usuario: UsuarioSesion): void {
  try {
    const usuarioValido = validarEstructuraSesion(usuario);
    if (!usuarioValido) throw new Error('Datos de usuario inválidos');
    localStorage.setItem(CLAVE_SESION_STORAGE, JSON.stringify(usuarioValido));
    notificarCambioSesion();
  } catch (error) {
    console.error('Error al guardar sesión:', error);
  }
}

export function cerrarSesion(): void {
  try {
    localStorage.removeItem(CLAVE_SESION_STORAGE);
    notificarCambioSesion();
  } catch {
    // Ignorar
  }
}