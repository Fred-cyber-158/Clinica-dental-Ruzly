// src/lib/validar-usuario.ts
export type CampoUsuario = 'nombre' | 'username' | 'password' | 'email' | 'rol' | 'pacienteId';
export type ErroresUsuario = Partial<Record<CampoUsuario, string>>;

export interface DatosUsuario {
  nombre: string;
  username: string;
  password?: string;
  email: string | null;
  rol: 'ADMINISTRADOR' | 'ODONTOLOGO' | 'RECEPCIONISTA' | 'PACIENTE';
  pacienteId?: string | null; // ✅ AÑADIDO
}

export type ResultadoUsuario =
  | { ok: true; data: DatosUsuario }
  | { ok: false; errores: ErroresUsuario };

export const ROLES_USUARIO = ['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA', 'PACIENTE'] as const;
export type RolUsuario = typeof ROLES_USUARIO[number];

const RE_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .\-]{3,80}$/;
const RE_USERNAME = /^[a-z0-9_]{3,20}$/;
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RE_PASSWORD = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const ROLES_VALIDOS = ['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA', 'PACIENTE'];

export function limpiarTexto(valor: string): string {
  return typeof valor === 'string' ? valor.trim().toUpperCase() : '';
}

export function errorDePassword(campo: 'password' | 'confirmPassword'): string {
  return campo === 'password'
    ? 'La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial (ej: @, $, !).'
    : 'Las contraseñas no coinciden.';
}

const texto = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  return typeof v === 'string' ? v.trim() : String(v).trim();
};

export function validarUsuario(c: Record<string, unknown>, esEdicion = false): ResultadoUsuario {
  const errores: ErroresUsuario = {};

  const nombreRaw = texto(c.nombre);
  const nombre = nombreRaw.replace(/\s+/g, ' ').toUpperCase();
  
  if (!nombre) {
    errores.nombre = 'El nombre completo es obligatorio.';
  } else if (!RE_NOMBRE.test(nombre)) {
    errores.nombre = 'El nombre debe tener entre 3 y 80 caracteres, usando solo letras, espacios y guiones.';
  }

  const usernameRaw = texto(c.username);
  const username = usernameRaw.toLowerCase().replace(/[@\s]/g, '');
  
  if (!username) {
    errores.username = 'El nombre de usuario es obligatorio.';
  } else if (!RE_USERNAME.test(username)) {
    errores.username = 'Usuario no válido: 3-20 caracteres, solo letras minúsculas, números y guión bajo (_).';
  }

  const passwordRaw = texto(c.password);
  
  if (!esEdicion) {
    if (!passwordRaw) {
      errores.password = 'La contraseña es obligatoria.';
    } else if (!RE_PASSWORD.test(passwordRaw)) {
      errores.password = errorDePassword('password');
    } else if (passwordRaw.length > 100) {
      errores.password = 'La contraseña no puede superar los 100 caracteres.';
    }
  } else {
    if (passwordRaw !== '') {
      if (!RE_PASSWORD.test(passwordRaw)) {
        errores.password = errorDePassword('password');
      } else if (passwordRaw.length > 100) {
        errores.password = 'La contraseña no puede superar los 100 caracteres.';
      }
    }
  }

  const emailRaw = texto(c.email);
  const emailTxt = emailRaw.toLowerCase();
  let email: string | null = null;
  
  if (emailTxt !== '') {
    if (emailTxt.length > 100) {
      errores.email = 'El correo electrónico no puede superar los 100 caracteres.';
    } else if (!RE_EMAIL.test(emailTxt)) {
      errores.email = 'Correo no válido. Ejemplo: nombre.apellido@correo.com.';
    } else {
      email = emailTxt;
    }
  }

  const rolRaw = texto(c.rol);
  const rol = rolRaw.toUpperCase();
  
  if (!rol) {
    errores.rol = 'El rol es obligatorio.';
  } else if (!ROLES_VALIDOS.includes(rol)) {
    errores.rol = 'Rol no válido. Debe ser ADMINISTRADOR, ODONTOLOGO, RECEPCIONISTA o PACIENTE.';
  }

  // ✅ VALIDACIÓN DE PACIENTE_ID
  const pacienteIdRaw = texto(c.pacienteId ?? '');
  let pacienteId: string | null | undefined = undefined;
  
  if (pacienteIdRaw !== '') {
    if (rol === 'PACIENTE' && !pacienteIdRaw) {
      errores.pacienteId = 'El paciente es obligatorio para usuarios con rol PACIENTE.';
    } else if (pacienteIdRaw.length < 20) {
      errores.pacienteId = 'El identificador del paciente no es válido.';
    } else {
      pacienteId = pacienteIdRaw;
    }
  } else if (rol === 'PACIENTE') {
    errores.pacienteId = 'El paciente es obligatorio para usuarios con rol PACIENTE.';
  }

  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }

  return {
    ok: true,
    data: {
      nombre,
      username,
      password: (passwordRaw && RE_PASSWORD.test(passwordRaw)) ? passwordRaw : undefined,
      email,
      rol: rol as DatosUsuario['rol'],
      pacienteId, // ✅ AÑADIDO
    },
  };
}