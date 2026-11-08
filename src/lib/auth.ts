import { Rol } from '@prisma/client';
import crypto from 'crypto';

export const COOKIE_SESION = 'ruzly_sesion';
export const HORAS_SESION = 12;

/**
 * Obtiene el secreto de autenticación desde las variables de entorno.
 * ✅ CORRECCIÓN CRÍTICA: Se elimina el fallback inseguro. Si no existe, la app debe fallar.
 */
function obtenerSecreto(): string {
  const secreto = process.env.AUTH_SECRET;
  
  if (!secreto) {
    throw new Error('[AUTH] FATAL: AUTH_SECRET no está configurado en las variables de entorno (.env)');
  }
  
  if (secreto.length < 32) {
    console.warn('[AUTH] ADVERTENCIA: AUTH_SECRET debe tener al menos 32 caracteres para máxima seguridad contra ataques de fuerza bruta.');
  }
  
  return secreto;
}

/**
 * Convierte un ArrayBuffer a formato base64url de forma segura en cualquier entorno (Node.js / Edge).
 * ✅ MEJORA: Evita "Maximum call stack size exceeded" que puede ocurrir con el spread operator (...) en algunos runtimes.
 */
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Crea una firma HMAC-SHA256 usando la Web Crypto API (Compatible con Edge y Node.js).
 */
async function crearFirma(datos: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(obtenerSecreto());
  const dataToSign = encoder.encode(datos);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, dataToSign);
  return arrayBufferToBase64Url(signature);
}

/**
 * Comparación segura en tiempo constante para prevenir Timing Attacks.
 * Compara cada byte sin salir temprano si hay una diferencia, evitando que un atacante 
 * mida el tiempo de respuesta para adivinar la firma correcta.
 */
function comparacionSegura(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let resultado = 0;
  for (let i = 0; i < a.length; i++) {
    resultado |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return resultado === 0;
}

/**
 * Genera un token de sesión seguro firmado criptográficamente.
 */
export async function crearToken(userId: string, rol: Rol): Promise<string> {
  if (!userId || userId.trim().length === 0) {
    throw new Error('El ID de usuario no puede estar vacío');
  }

  const payload = JSON.stringify({
    id: userId,
    rol,
    exp: Date.now() + HORAS_SESION * 3600 * 1000
  });

  const firma = await crearFirma(payload);
  return `${payload}.${firma}`;
}

/**
 * Verifica la validez, integridad y expiración del token.
 * @returns El payload decodificado si es válido, o null si está manipulado o expirado.
 */
export async function verificarToken(token?: string): Promise<{ id: string; rol: Rol } | null> {
  if (!token || token.trim().length === 0) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadStr, firma] = parts;
  if (!payloadStr || !firma) return null;

  try {
    // 1. Verificar firma con comparación segura contra Timing Attacks
    const expectedFirma = await crearFirma(payloadStr);
    if (!comparacionSegura(expectedFirma, firma)) {
      return null;
    }

    // 2. Parsear y validar estructura del payload
    const payload = JSON.parse(payloadStr);
    if (!payload.id || !payload.rol || !payload.exp) {
      return null;
    }
    
    // 3. Verificar expiración (previene reutilización de tokens antiguos)
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) {
      return null;
    }
    
    // 4. Validar que el rol sea estrictamente uno de los permitidos por Prisma
    const rolesValidos: readonly Rol[] = ['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA', 'PACIENTE'] as const;
    if (!rolesValidos.includes(payload.rol)) {
      return null;
    }

    return { id: payload.id, rol: payload.rol as Rol };
  } catch {
    // ✅ CORRECCIÓN DEFINITIVA: Optional catch binding (ES2019+) - Sin variable
    return null;
  }
}

/**
 * Crea una huella hash del password para tokens de recuperación.
 * Esto permite verificar si el token fue generado antes o después del último cambio de password.
 */
export function huellaReset(passwordHash: string): string {
  return crypto.createHash('sha256').update(passwordHash).digest('hex');
}

/**
 * Crea un token de recuperación de contraseña.
 * @param userId - ID del usuario
 * @param passwordHash - Hash actual del password (para invalidar el token si cambia la contraseña)
 * @returns Token de recuperación con expiración de 15 minutos
 */
export function crearTokenReset(userId: string, passwordHash: string): string {
  const payload = JSON.stringify({
    id: userId,
    h: huellaReset(passwordHash), // Huella del password actual
    exp: Date.now() + 15 * 60 * 1000 // 15 minutos
  });
  
  const firma = crypto.createHmac('sha256', obtenerSecreto())
    .update(payload)
    .digest('base64url');
  
  return `${payload}.${firma}`;
}

/**
 * Lee y valida un token de recuperación de contraseña.
 * @param token - Token a validar
 * @returns Datos del token o null si es inválido/expirado
 */
export function leerTokenReset(token: string): { id: string; h: string } | null {
  if (!token || token.trim().length === 0) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadStr, firma] = parts;
  if (!payloadStr || !firma) return null;

  try {
    // Verificar firma con comparación segura
    const expectedFirma = crypto.createHmac('sha256', obtenerSecreto())
      .update(payloadStr)
      .digest('base64url');
    
    if (!comparacionSegura(expectedFirma, firma)) {
      return null;
    }

    const payload = JSON.parse(payloadStr);

    // Validar estructura
    if (!payload.id || !payload.h || !payload.exp) {
      return null;
    }

    // Verificar expiración
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) {
      return null;
    }

    return { id: payload.id, h: payload.h };
  } catch {
    // ✅ CORRECCIÓN DEFINITIVA: Optional catch binding (ES2019+) - Sin variable
    return null;
  }
}