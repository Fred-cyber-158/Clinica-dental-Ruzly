import { NextResponse } from 'next/server';
import { COOKIE_SESION } from '@/lib/auth';

export async function POST() {
  try {
    // 1. Crear la respuesta de éxito
    const res = NextResponse.json({ 
      success: true, 
      message: 'Sesión cerrada correctamente.' 
    });

    // 2. Invalidar la cookie de sesión de forma definitiva
    // Se usa maxAge: 0 Y expires: new Date(0) para garantizar la eliminación 
    // en todos los navegadores (incluyendo versiones antiguas).
    res.cookies.set(COOKIE_SESION, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
      path: '/',                                      // Asegura que se borre en toda la ruta
      maxAge: 0,
      expires: new Date(0),                           // Fecha en el pasado para forzar el borrado
    });

    return res;
  } catch (error) {
    console.error('Error crítico al cerrar sesión:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al procesar el cierre de sesión.' },
      { status: 500 }
    );
  }
}