// src/lib/validar-login.ts
// Validaciones compartidas y estrictas para el inicio de sesión (Cliente y Servidor)

export type CampoLogin = 'username' | 'password';
export type ErroresLogin = Partial<Record<CampoLogin, string>>;

export interface DatosLogin {
  username: string;
  password: string;
}

export type ResultadoLogin =
  | { ok: true; data: DatosLogin }
  | { ok: false; errores: ErroresLogin };

// Función auxiliar segura para obtener texto de cualquier tipo
const texto = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  return typeof v === 'string' ? v.trim() : String(v).trim();
};

/**
 * Valida los datos básicos de un intento de inicio de sesión.
 * Nota: La validación real de credenciales (hash) se realiza en la API route.
 * Esta función previene envíos basura, vacíos o excesivamente largos (DoS).
 */
export function validarLogin(c: Record<string, unknown>): ResultadoLogin {
  const errores: ErroresLogin = {};

  // 1. Validar USERNAME (puede ser usuario o correo)
  const username = texto(c.username);
  
  if (!username) {
    errores.username = 'El usuario o correo electrónico es obligatorio.';
  } else if (username.length < 2) {
    errores.username = 'El usuario o correo debe tener al menos 2 caracteres.';
  } else if (username.length > 100) {
    errores.username = 'El usuario o correo no puede superar los 100 caracteres.';
  }

  // 2. Validar PASSWORD
  const password = texto(c.password);
  
  if (!password) {
    errores.password = 'La contraseña es obligatoria.';
  } else if (password.length < 6) { 
    // ✅ MEJORA: Evita peticiones inútiles a la API con contraseñas demasiado cortas
    // (Alineado con la política de seguridad de contraseñas del sistema)
    errores.password = 'La contraseña debe tener al menos 6 caracteres.';
  } else if (password.length > 100) {
    errores.password = 'La contraseña no puede superar los 100 caracteres.';
  }

  // 3. Resultado final
  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }

  return {
    ok: true,
    data: {
      username,
      password,
    },
  };
}