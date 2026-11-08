// ============================================================================
// UTILIDADES DE VALIDACIÓN ESTRICTA PARA TODOS LOS FORMULARIOS
// ============================================================================
// Este módulo se comparte entre el cliente (React) y el servidor (API Routes)
// para garantizar una única fuente de verdad en las reglas de negocio.

// ✅ Regex de validación estricta
export const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const RE_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .]+$/;
export const RE_NOMBRE_COMPLETO = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .\-]+$/;
export const RE_USERNAME = /^[a-z0-9_]{3,20}$/;
export const RE_CI = /^\d{5,10}(-[0-9A-Za-z]{1,2})?$/;
export const RE_TELEFONO = /^(\+591)?[23467]\d{7}$/;

// ✅ MEJORA DE SEGURIDAD: Alineado con la política de contraseñas fuertes del sistema
// Mínimo 8 caracteres, al menos 1 mayúscula, 1 número y 1 carácter especial
export const RE_PASSWORD = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,100}$/;

export const RE_NUMERO = /^\d+$/;
export const RE_MONTO = /^\d+(\.\d{1,2})?$/;
export const RE_PRESION_ARTERIAL = /^\d{2,3}\/\d{2,3}$/;
export const RE_TEMPERATURA = /^\d{2}(\.\d)?$/;
export const RE_PESO = /^\d{1,3}(\.\d{1,2})?$/;
export const RE_EDAD = /^\d{1,3}$/;

// ✅ Convertir a mayúsculas (excepto email)
export const aMayusculas = (texto: string): string => {
  return texto.toUpperCase();
};

// ✅ Convertir a minúsculas (para email y username)
export const aMinusculas = (texto: string): string => {
  return texto.toLowerCase().replace(/\s/g, '');
};

// ✅ Limpiar caracteres especiales (solo letras, números, espacios y acentos)
export const limpiarTexto = (texto: string): string => {
  return texto.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .\-0-9]/g, '');
};

// ✅ Limpiar solo letras (para nombres)
export const limpiarSoloLetras = (texto: string): string => {
  return texto.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .]/g, '');
};

// ✅ Limpiar solo números
export const limpiarSoloNumeros = (texto: string): string => {
  return texto.replace(/\D/g, '');
};

// ✅ Limpiar username (solo minúsculas, números y guión bajo)
export const limpiarUsername = (texto: string): string => {
  return texto.replace(/[^a-z0-9_]/g, '').toLowerCase();
};

// ✅ Limpiar email (solo caracteres válidos de email)
export const limpiarEmail = (texto: string): string => {
  return texto.replace(/\s/g, '').toLowerCase();
};

// ✅ Limpiar teléfono (solo números y +)
export const limpiarTelefono = (texto: string): string => {
  return texto.replace(/[^0-9+ ]/g, '');
};

// ✅ Limpiar C.I. (solo números, letras y guión)
export const limpiarCI = (texto: string): string => {
  return texto.replace(/[^0-9A-Za-z\-]/g, '').toUpperCase();
};

// ============================================================================
// FUNCIONES DE VALIDACIÓN (Retornan booleano)
// ============================================================================

export const validarEmail = (email: string): boolean => {
  return RE_EMAIL.test(email.trim());
};

export const validarNombre = (nombre: string): boolean => {
  return RE_NOMBRE.test(nombre.trim()) && nombre.trim().length >= 3;
};

export const validarUsername = (username: string): boolean => {
  return RE_USERNAME.test(username.trim());
};

export const validarPassword = (password: string): boolean => {
  return RE_PASSWORD.test(password);
};

export const validarCI = (ci: string): boolean => {
  return RE_CI.test(ci.trim());
};

export const validarTelefono = (telefono: string): boolean => {
  const limpio = telefono.replace(/[\s-]/g, '');
  return RE_TELEFONO.test(limpio);
};

export const validarMonto = (monto: string): boolean => {
  return RE_MONTO.test(monto.trim());
};

export const validarEdad = (edad: string): boolean => {
  if (!edad.trim()) return true; // Opcional
  const n = Number(edad);
  return RE_EDAD.test(edad) && n >= 0 && n <= 120;
};

export const validarPresionArterial = (pa: string): boolean => {
  if (!pa.trim()) return true; // Opcional
  return RE_PRESION_ARTERIAL.test(pa);
};

export const validarTemperatura = (temp: string): boolean => {
  if (!temp.trim()) return true; // Opcional
  const n = Number(temp.replace(',', '.'));
  return RE_TEMPERATURA.test(temp) && n >= 30 && n <= 45;
};

export const validarPeso = (peso: string): boolean => {
  if (!peso.trim()) return true; // Opcional
  const n = Number(peso.replace(',', '.'));
  return RE_PESO.test(peso) && n >= 1 && n <= 300;
};

// ============================================================================
// HELPERS DE REACT PARA MANEJO DE EVENTOS (onChange)
// ============================================================================

export const handleChangeMayusculas = (
  setter: (value: string) => void,
  errorSetter?: (error: string) => void
) => {
  return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const valor = e.target.value;
    const limpio = limpiarTexto(valor).toUpperCase();
    setter(limpio);
    if (errorSetter) errorSetter('');
  };
};

export const handleChangeEmail = (
  setter: (value: string) => void,
  errorSetter?: (error: string) => void
) => {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    const limpio = limpiarEmail(valor);
    setter(limpio);
    if (errorSetter) errorSetter('');
  };
};

export const handleChangeUsername = (
  setter: (value: string) => void,
  errorSetter?: (error: string) => void
) => {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    const limpio = limpiarUsername(valor);
    setter(limpio);
    if (errorSetter) errorSetter('');
  };
};

export const handleChangeTelefono = (
  setter: (value: string) => void,
  errorSetter?: (error: string) => void
) => {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    const limpio = limpiarTelefono(valor);
    setter(limpio);
    if (errorSetter) errorSetter('');
  };
};

export const handleChangeCI = (
  setter: (value: string) => void,
  errorSetter?: (error: string) => void
) => {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    const limpio = limpiarCI(valor);
    setter(limpio);
    if (errorSetter) errorSetter('');
  };
};

export const handleChangeNumero = (
  setter: (value: string) => void,
  maxLength: number = 10,
  errorSetter?: (error: string) => void
) => {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    const limpio = limpiarSoloNumeros(valor).slice(0, maxLength);
    setter(limpio);
    if (errorSetter) errorSetter('');
  };
};

export const handleChangeMonto = (
  setter: (value: string) => void,
  errorSetter?: (error: string) => void
) => {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    // Permite números, un punto o una coma. La validación final la hace validarMonto.
    const limpio = valor.replace(/[^0-9.,]/g, '');
    setter(limpio);
    if (errorSetter) errorSetter('');
  };
};