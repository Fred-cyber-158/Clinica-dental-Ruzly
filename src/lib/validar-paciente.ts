// Validación compartida: la usan el formulario (cliente) y la API (servidor)
export type CampoPaciente = 'nombre' | 'ci' | 'edad' | 'telefono' | 'email' | 'alergias';
export type ErroresPaciente = Partial<Record<CampoPaciente, string>>;

export interface DatosPaciente {
  nombre: string;
  ci: string;
  edad: number | null;
  telefono: string | null;
  email: string | null;
  alergias: string | null;
}

export type ResultadoPaciente =
  | { ok: true; data: DatosPaciente }
  | { ok: false; errores: ErroresPaciente };

// ✅ Expresiones regulares estrictas para evitar "garabatos"
const RE_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .\-]{3,80}$/;
const RE_CI = /^\d{5,10}(-[0-9A-Za-z]{1,2})?$/;
const RE_TELEFONO = /^(\+591)?[23467]\d{7}$/;
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Función auxiliar segura para convertir cualquier valor a string limpio
const texto = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  return typeof v === 'string' ? v.trim() : String(v).trim();
};

export function validarPaciente(c: Record<string, unknown>): ResultadoPaciente {
  const errores: ErroresPaciente = {};

  // 1. Validación de NOMBRE
  const nombreRaw = texto(c.nombre);
  const nombre = nombreRaw.replace(/\s+/g, ' ').toUpperCase(); // Normaliza espacios múltiples
  
  if (!nombre) {
    errores.nombre = 'El nombre completo es obligatorio.';
  } else if (!RE_NOMBRE.test(nombre)) {
    errores.nombre = 'El nombre debe tener entre 3 y 80 caracteres, usando solo letras, espacios y guiones.';
  }

  // 2. Validación de C.I.
  const ciRaw = texto(c.ci);
  const ci = ciRaw.replace(/\s+/g, '').toUpperCase(); // Elimina espacios internos
  
  if (!ci) {
    errores.ci = 'El C.I. es obligatorio.';
  } else if (!RE_CI.test(ci)) {
    errores.ci = 'C.I. no válido. Ejemplos correctos: 8392104 o 8392104-1A.';
  }

  // 3. Validación de EDAD (Opcional, pero si se pone, debe ser válida)
  const edadTxt = texto(c.edad);
  let edad: number | null = null;
  
  if (edadTxt !== '') {
    if (!/^\d{1,3}$/.test(edadTxt)) {
      errores.edad = 'La edad debe ser un número entero.';
    } else {
      const edadNum = parseInt(edadTxt, 10);
      if (edadNum < 0 || edadNum > 120) {
        errores.edad = 'La edad debe estar entre 0 y 120 años.';
      } else {
        edad = edadNum;
      }
    }
  }

  // 4. Validación de TELÉFONO (Opcional)
  const telRaw = texto(c.telefono);
  const telTxt = telRaw.replace(/[\s\-]/g, ''); // Elimina espacios y guiones
  let telefono: string | null = null; // ✅ CORRECCIÓN: Variable declarada correctamente
  
  if (telTxt !== '') {
    if (!RE_TELEFONO.test(telTxt)) {
      errores.telefono = 'Teléfono no válido. Ejemplos: 70012345 o +591 70012345.';
    } else {
      telefono = telTxt;
    }
  }

  // 5. Validación de EMAIL (Opcional)
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

  // 6. Validación de ALERGIAS (Opcional)
  const alergiasRaw = texto(c.alergias);
  // ✅ MEJORA UX: Sanitización automática en lugar de rechazo. 
  // Limpia caracteres extraños para mantener consistencia clínica sin frustrar al usuario.
  const alergiasTxt = alergiasRaw.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9' .,()\-]/g, '').toUpperCase();
  let alergias: string | null = null;
  
  if (alergiasTxt !== '') {
    if (alergiasTxt.length > 200) {
      errores.alergias = 'El campo de alergias no puede superar los 200 caracteres.';
    } else {
      alergias = alergiasTxt;
    }
  }

  // 7. Resultado final
  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }

  return { 
    ok: true, 
    data: { 
      nombre, 
      ci, 
      edad, 
      telefono, 
      email, 
      alergias 
    } 
  };
}