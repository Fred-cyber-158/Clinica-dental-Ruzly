'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface UsuarioSesion {
  nombre: string;
  username: string;
  rol: 'ADMINISTRADOR' | 'ODONTOLOGO' | 'ODONTO_LOGO' | 'RECEPCIONISTA' | 'PACIENTE';
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let active = true;

    const verificarSesion = async () => {
      const userStored = localStorage.getItem('usuario_activo');
      if (active) {
        if (userStored) {
          try {
            setUsuario(JSON.parse(userStored));
          } catch {
            setUsuario(null);
          }
        } else {
          setUsuario(null);
        }
        setMounted(true);
      }
    };

    verificarSesion();

    return () => {
      active = false;
    };
  }, [pathname]);

  if (!mounted || pathname === '/login' || !usuario) return null;

  // Normalización del rol para soportar 'ODONTO_LOGO' y 'ODONTOLOGO'
  const rolUsuarioNormalizado =
    usuario.rol === 'ODONTO_LOGO' ? 'ODONTOLOGO' : usuario.rol;

  // Menús sin números, ordenados por el flujo clínico de trabajo
  const todosLosLinks = [
    {
      href: '/',
      label: 'Inicio',
      roles: ['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA', 'PACIENTE'],
    },
    {
      href: '/pacientes',
      label: 'Pacientes',
      roles: ['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA'],
    },
    {
      href: '/citas',
      label: 'Citas',
      roles: ['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA', 'PACIENTE'],
    },
    {
      href: '/odontograma',
      label: 'Odontograma',
      roles: ['ADMINISTRADOR', 'ODONTOLOGO'],
    },
    {
      href: '/tratamientos',
      label: 'Tratamiento',
      roles: ['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA', 'PACIENTE'],
    },
    {
      href: '/recetas',
      label: 'Recetas',
      roles: ['ADMINISTRADOR', 'ODONTOLOGO'],
    },
    {
      href: '/cobros',
      label: 'Caja / Cobros',
      roles: ['ADMINISTRADOR', 'RECEPCIONISTA'],
    },
    {
      href: '/usuarios',
      label: 'Usuarios',
      roles: ['ADMINISTRADOR'],
    },
    {
      href: '/reportes',
      label: 'Reportes',
      roles: ['ADMINISTRADOR'],
    },
  ];

  // Filtrar enlaces permitidos para el rol de usuario activo
  const linksPermitidos = todosLosLinks.filter((link) =>
    link.roles.includes(rolUsuarioNormalizado || 'ADMINISTRADOR')
  );

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/90 border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Identidad / Logo */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="relative flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Clínica Dental Ruzly"
              className="h-10 w-auto object-contain group-hover:scale-105 transition-transform"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
                const fallback = document.getElementById('navbar-logo-fallback');
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div
              id="navbar-logo-fallback"
              className="hidden w-10 h-10 rounded-xl bg-linear-to-tr from-blue-600 to-cyan-400 items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform"
            >
              R
            </div>
          </div>

          <span className="font-bold text-lg sm:text-xl tracking-tight text-white group-hover:text-blue-400 transition-colors hidden sm:inline-block">
            DENTAL RUZLY
          </span>
        </Link>

        {/* Menú de Navegación Dinámico Sin Números */}
        <nav className="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-full border border-slate-800/80 overflow-x-auto max-w-full no-scrollbar">
          {linksPermitidos.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Indicador de Rol Activo y Botón Salir */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="hidden lg:inline-block text-[10px] bg-slate-900 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider">
            {usuario.rol}
          </span>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('usuario_activo');
              setUsuario(null);
              router.push('/login');
            }}
            className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold uppercase transition-all shadow-md cursor-pointer"
          >
            Salir
          </button>
        </div>

      </div>
    </header>
  );
}