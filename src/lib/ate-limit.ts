// src/lib/rate-limit.ts

interface Intento {
  count: number;
  firstAttempt: number;
}

// Almacenamiento en memoria para los intentos (se reinicia al reiniciar el servidor)
// Para producción a gran escala, se recomendaría Redis, pero esto es perfecto para este proyecto.
const intentosMap = new Map<string, Intento>();

/**
 * Verifica y registra un intento de acción (ej: login, registro).
 * @param key Identificador único (ej: 'login:192.168.1.1:usuario')
 * @param maxIntentos Número máximo de intentos permitidos
 * @param ventanaMs Ventana de tiempo en milisegundos (ej: 10 * 60 * 1000 para 10 minutos)
 * @returns true si el intento es permitido, false si se excedió el límite
 */
export function consumirIntento(key: string, maxIntentos: number, ventanaMs: number): boolean {
  const ahora = Date.now();
  const registro = intentosMap.get(key);

  if (!registro) {
    // Primer intento
    intentosMap.set(key, { count: 1, firstAttempt: ahora });
    return true;
  }

  // Si la ventana de tiempo ya expiró, reiniciamos el contador
  if (ahora - registro.firstAttempt > ventanaMs) {
    intentosMap.set(key, { count: 1, firstAttempt: ahora });
    return true;
  }

  // Si aún está dentro de la ventana, verificamos el conteo
  if (registro.count >= maxIntentos) {
    return false; // Bloqueado
  }

  // Permitimos el intento y aumentamos el contador
  registro.count += 1;
  intentosMap.set(key, registro);
  return true;
}

// Limpieza opcional de memoria (ejecutar cada cierto tiempo en producción)
// setInterval(() => {
//   const ahora = Date.now();
//   for (const [key, value] of intentosMap.entries()) {
//     if (ahora - value.firstAttempt > 60 * 60 * 1000) { // Limpiar después de 1 hora
//       intentosMap.delete(key);
//     }
//   }
// }, 10 * 60 * 1000);