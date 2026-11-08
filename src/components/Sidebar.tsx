'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState, useSyncExternalStore, useEffect } from 'react';

type Rol = 'ADMINISTRADOR' | 'ODONTOLOGO' | 'RECEPCIONISTA' | 'PACIENTE';

interface UsuarioSesion {
  nombre: string;
  username: string;
  rol: Rol;
}

const TODOS: Rol[] = ['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA', 'PACIENTE'];

const LINKS = [
  { href: '/', label: 'Inicio', icono: '🏠', roles: TODOS },
  { href: '/pacientes', label: 'Pacientes', icono: '', roles: ['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA'] },
  { href: '/citas', label: 'Citas', icono: '📅', roles: TODOS },
  { href: '/odontograma', label: 'Odontograma', icono: '🦷', roles: ['ADMINISTRADOR', 'ODONTOLOGO'] },
  { href: '/tratamientos', label: 'Tratamientos', icono: '', roles: TODOS },
  { href: '/recetas', label: 'Recetas', icono: '💊', roles: ['ADMINISTRADOR', 'ODONTOLOGO'] },
  { href: '/cobros', label: 'Caja y Cobros', icono: '', roles: ['ADMINISTRADOR', 'RECEPCIONISTA'] },
  { href: '/usuarios', label: 'Usuarios', icono: '', roles: ['ADMINISTRADOR'] },
  { href: '/reportes', label: 'Reportes', icono: '📊', roles: ['ADMINISTRADOR'] },
];

function suscribir(cb: () => void) {
  window.addEventListener('storage', cb);
  return () => window.removeEventListener('storage', cb);
}

const obtenerIniciales = (nombre: string): string => {
  const partes = nombre.trim().split(/\s+/);
  if (partes.length >= 2) {
    return `${partes[0].charAt(0)}${partes[1].charAt(0)}`.toUpperCase();
  }
  return nombre.substring(0, 2).toUpperCase();
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);

  const guardado = useSyncExternalStore(
    suscribir,
    () => localStorage.getItem('usuario_activo'),
    () => null
  );

  const usuario = useMemo<UsuarioSesion | null>(() => {
    if (!guardado) return null;
    try {
      return JSON.parse(guardado) as UsuarioSesion;
    } catch {
      return null;
    }
  }, [guardado]);

  useEffect(() => {
    if (abierto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [abierto]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && abierto) {
        setAbierto(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [abierto]);

  if (pathname === '/login' || !usuario) return null;

  const rol = usuario.rol;
  const permitidos = LINKS.filter((l) => l.roles.includes(rol));

  const salir = async () => {
    if (!confirm('¿Está seguro que desea cerrar sesión?')) {
      return;
    }
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* Si falla la red, igual se limpia la sesión local */
    }
    localStorage.removeItem('usuario_activo');
    window.dispatchEvent(new Event('storage'));
    router.push('/login');
  };

  return (
    <>
      {/* ========================================== */}
      {/* BARRA SUPERIOR MÓVIL */}
      {/* ========================================== */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-4 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
        <button
          type="button"
          aria-label="Abrir menú de navegación"
          aria-expanded={abierto}
          onClick={() => setAbierto(true)}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        
        {/* ✅ LOGO EN BARRA MÓVIL */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/logo.png" 
              alt="Dental Ruzly" 
              className="w-full h-full object-contain relative z-10"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 z-0 flex items-center justify-center bg-linear-to-tr from-blue-600 to-cyan-400 rounded-lg text-white font-black text-xs">
              R
            </div>
          </div>
          <span className="font-bold text-white tracking-tight text-sm hidden sm:block">DENTAL RUZLY</span>
        </div>
        
        <div className="w-10" />
      </div>

      {abierto && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" 
          onClick={() => setAbierto(false)} 
          aria-hidden="true"
        />
      )}

      {/* ========================================== */}
      {/* SIDEBAR PRINCIPAL */}
      {/* ========================================== */}
      <aside
        aria-label="Menú principal de navegación"
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 shrink-0 flex flex-col bg-slate-950 border-r border-slate-800 transition-transform duration-300 ease-in-out ${
          abierto ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* ✅ LOGO INTEGRADO CON FALLBACK */}
        <Link 
          href="/" 
          className="flex items-center gap-3 px-5 py-5 border-b border-slate-800 hover:bg-slate-900/50 transition-colors"
          onClick={() => setAbierto(false)}
        >
          <div className="w-10 h-10 relative group shrink-0">
            <div className="absolute inset-0 bg-linear-to-tr from-blue-600 to-cyan-400 rounded-xl blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
            <div className="relative w-full h-full rounded-xl bg-white p-1.5 shadow-xl flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/logo.png" 
                alt="Clínica Dental Ruzly" 
                className="w-full h-full object-contain z-10 relative"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 z-0 flex items-center justify-center bg-linear-to-tr from-blue-600 to-cyan-400 text-white font-black text-xl rounded-lg">
                R
              </div>
            </div>
          </div>
          <div className="leading-tight min-w-0">
            <p className="font-bold text-white text-sm tracking-tight truncate">DENTAL RUZLY</p>
            <p className="text-[10px] text-cyan-400 uppercase tracking-widest font-semibold">Gestión clínica</p>
          </div>
        </Link>

        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setAbierto(false)}
          className="lg:hidden absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar" aria-label="Navegación principal">
          {permitidos.map((l) => {
            const activo = pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href + '/'));
            
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setAbierto(false)}
                aria-current={activo ? 'page' : undefined}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                  activo
                    ? 'bg-blue-600/10 text-blue-400'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                {activo && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full" />
                )}
                <span className="text-base shrink-0" aria-hidden="true">{l.icono}</span>
                <span className="truncate">{l.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0">
              {obtenerIniciales(usuario.nombre)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{usuario.nombre}</p>
              <span className="inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400 border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 rounded-md">
                {rol}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={salir}
            className="w-full px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 active:scale-[0.98] text-red-400 border border-red-500/30 rounded-xl text-xs font-bold uppercase transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}