import { NextResponse } from 'next/server';

/** Codigos de estado usados por la API. */
export const HTTP_OK = 200;
export const HTTP_CREADO = 201;
export const HTTP_BAD_REQUEST = 400;
export const HTTP_NO_ENCONTRADO = 404;
export const HTTP_ERROR_SERVIDOR = 500;

/** Respuesta de error uniforme: siempre { error: string }. */
export function respuestaError(estado: number, mensaje: string): NextResponse {
  return NextResponse.json({ error: mensaje }, { status: estado });
}

export type ResultadoCuerpo<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

/**
 * Lee el cuerpo de la peticion garantizando que sea un objeto JSON.
 * Devuelve una respuesta 400 lista para retornar cuando el cuerpo es invalido.
 */
export async function leerCuerpoJson<T extends object>(
  request: Request,
): Promise<ResultadoCuerpo<T>> {
  let crudo: unknown;

  try {
    crudo = await request.json();
  } catch {
    return {
      ok: false,
      response: respuestaError(HTTP_BAD_REQUEST, 'El cuerpo de la solicitud no es un JSON valido'),
    };
  }

  if (!crudo || typeof crudo !== 'object' || Array.isArray(crudo)) {
    return {
      ok: false,
      response: respuestaError(HTTP_BAD_REQUEST, 'El cuerpo de la solicitud debe ser un objeto JSON'),
    };
  }

  return { ok: true, data: crudo as T };
}
