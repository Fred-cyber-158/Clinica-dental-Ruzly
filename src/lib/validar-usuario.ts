// src/lib/validar-usuario.ts
// Validaciones compartidas y estrictas para usuarios (Cliente y Servidor)

export type CampoUsuario = 'nombre' | 'username' | 'password' | 'email' | 'rol';
export type ErroresUsuario = Partial<Record<CampoUsuario, string>>;

export interface DatosUsuario {
  nombre: string;
  username: string;
  password?: string;
  email: string | null;
  rol: 'ADMINISTRADOR' | 'ODONTOLOGO' | 'RECEPCIONISTA' | 'PACIENTE';
}

export type ResultadoUsuario =
  | { ok: true; data: DatosUsuario }
  | { ok: false; errores: ErroresUsuario };

// ✅ Constantes exportadas para los componentes UI
export const ROLES_USUARIO = ['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA', 'PACIENTE'] as const;
export type RolUsuario = typeof ROLES_USUARIO[number];

// ✅ Expresiones regulares estrictas para evitar "garabatos"
const RE_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .\-]{3,80}$/;
const RE_USERNAME = /^[a-z0-9_]{3,20}$/;
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// ✅ MEJORA: Alineado con la política de seguridad del registro (8 chars, 1 mayúscula, 1 número, 1 especial)
const RE_PASSWORD = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const ROLES_VALIDOS = ['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA', 'PACIENTE'];

// Función auxiliar para limpiar y normalizar texto
export function limpiarTexto(valor: string): string {
  return typeof valor === 'string' ? valor.trim().toUpperCase() : '';
}

// Función para mensajes de error de contraseña unificados
export function errorDePassword(campo: 'password' | 'confirmPassword'): string {
  return campo === 'password'
    ? 'La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial (ej: @, $, !).'
    : 'Las contraseñas no coinciden.';
}

// Función auxiliar segura para obtener texto de cualquier tipo
const texto = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  return typeof v === 'string' ? v.trim() : String(v).trim();
};

/**
 * Valida los datos de un usuario (para crear o editar).
 * @param c - Objeto con los datos del formulario.
 * @param esEdicion - Si es true, la contraseña es opcional.
 */
export function validarUsuario(c: Record<string, unknown>, esEdicion = false): ResultadoUsuario {
  const errores: ErroresUsuario = {};

  // 1. Validar NOMBRE
  const nombreRaw = texto(c.nombre);
  const nombre = nombreRaw.replace(/\s+/g, ' ').toUpperCase(); // Normaliza espacios múltiples
  
  if (!nombre) {
    errores.nombre = 'El nombre completo es obligatorio.';
  } else if (!RE_NOMBRE.test(nombre)) {
    errores.nombre = 'El nombre debe tener entre 3 y 80 caracteres, usando solo letras, espacios y guiones.';
  }

  // 2. Validar USERNAME
  const usernameRaw = texto(c.username);
  const username = usernameRaw.toLowerCase().replace(/[@\s]/g, ''); // Elimina @ y espacios
  
  if (!username) {
    errores.username = 'El nombre de usuario es obligatorio.';
  } else if (!RE_USERNAME.test(username)) {
    errores.username = 'Usuario no válido: 3-20 caracteres, solo letras minúsculas, números y guión bajo (_).';
  }

  // 3. Validar PASSWORD
  const passwordRaw = texto(c.password);
  
  if (!esEdicion) {
    // Creación: la contraseña es obligatoria y debe ser fuerte
    if (!passwordRaw) {
      errores.password = 'La contraseña es obligatoria.';
    } else if (!RE_PASSWORD.test(passwordRaw)) {
      errores.password = errorDePassword('password');
    } else if (passwordRaw.length > 100) {
      errores.password = 'La contraseña no puede superar los 100 caracteres.';
    }
  } else {
    // Edición: la contraseña es opcional, pero si se proporciona, debe ser fuerte
    if (passwordRaw !== '') {
      if (!RE_PASSWORD.test(passwordRaw)) {
        errores.password = errorDePassword('password');
      } else if (passwordRaw.length > 100) {
        errores.password = 'La contraseña no puede superar los 100 caracteres.';
      }
    }
  }

  // 4. Validar EMAIL (Opcional, pero estricto si se proporciona)
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

  // 5. Validar ROL
  const rolRaw = texto(c.rol);
  const rol = rolRaw.toUpperCase();
  
  if (!rol) {
    errores.rol = 'El rol es obligatorio.';
  } else if (!ROLES_VALIDOS.includes(rol)) {
    errores.rol = 'Rol no válido. Debe ser ADMINISTRADOR, ODONTOLOGO, RECEPCIONISTA o PACIENTE.';
  }

  // 6. Resultado final
  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }

  return {
    ok: true,
    data: {
      nombre,
      username,
      // Solo incluimos la contraseña en los datos si es válida y (es nueva o fue modificada)
      password: (passwordRaw && RE_PASSWORD.test(passwordRaw)) ? passwordRaw : undefined,
      email,
      rol: rol as DatosUsuario['rol'],
    },
  };
}