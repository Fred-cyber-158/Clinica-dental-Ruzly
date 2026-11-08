import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_SESION, verificarToken } from '@/lib/auth';

// Métodos HTTP seguros que no modifican datos
const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Define qué roles pueden acceder a cada página.
 */
function paginaPermitida(pathname: string, rol: string): boolean {
  const es = (...roles: string[]) => roles.includes(rol);

  if (pathname === '/usuarios' || pathname.startsWith('/usuarios/')) return es('ADMINISTRADOR');
  if (pathname === '/reportes' || pathname.startsWith('/reportes/')) return es('ADMINISTRADOR');
  if (pathname === '/cobros' || pathname.startsWith('/cobros/')) return es('ADMINISTRADOR', 'RECEPCIONISTA');
  if (pathname === '/recetas' || pathname.startsWith('/recetas/')) return es('ADMINISTRADOR', 'ODONTOLOGO');
  if (pathname === '/odontograma' || pathname.startsWith('/odontograma/')) return es('ADMINISTRADOR', 'ODONTOLOGO');
  if (pathname === '/cuaderno' || pathname.startsWith('/cuaderno/')) return es('ADMINISTRADOR', 'ODONTOLOGO');
  if (pathname === '/fotos' || pathname.startsWith('/fotos/')) return es('ADMINISTRADOR', 'ODONTOLOGO');
  
  if (pathname === '/pacientes') return es('ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA');
  if (pathname.startsWith('/pacientes/')) return es('ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA', 'PACIENTE');

  return true;
}

/**
 * Verifica que las peticiones mutantes vengan del mismo origen (Anti-CSRF).
 */
function origenPermitido(req: NextRequest): boolean {
  const origen = req.headers.get('origin');
  if (!origen) return true;

  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!host) return false;

  try {
    return new URL(origen).host === host;
  } catch {
    return false;
  }
}

/**
 * Middleware principal de Next.js.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const esApi = pathname.startsWith('/api');
  const esPublica = pathname === '/login' || pathname === '/registro' || pathname.startsWith('/api/auth/');

  // 1. Leer y verificar el token de sesión (AHORA CON AWAIT)
  const sesion = await verificarToken(req.cookies.get(COOKIE_SESION)?.value);

  // 2. Protección CSRF
  if (esApi && !METODOS_SEGUROS.has(req.method) && !origenPermitido(req)) {
    return NextResponse.json({ error: 'Origen de la petición no permitido.' }, { status: 403 });
  }

  // 3. Rutas públicas
  if (esPublica) {
    if (sesion && pathname === '/login') {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // 4. Si no hay sesión válida, redirigir o denegar
  if (!sesion) {
    if (esApi) {
      return NextResponse.json({ error: 'Sesión no válida o vencida. Inicie sesión nuevamente.' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // 5. Protección de páginas por rol (RBAC)
  if (!esApi) {
    const rol = sesion.rol === 'ODONTOLOGO' ? 'ODONTOLOGO' : sesion.rol;
    if (!paginaPermitida(pathname, rol)) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      url.search = '?acceso=denegado';
      return NextResponse.redirect(url);
    }
  }

  // 6. Continuar con la petición
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|uploads/|equipo/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|map|woff|woff2|ttf|txt|pdf)$).*)',
  ],
};