'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSesion, cerrarSesion as limpiarSesionLocal } from '@/lib/sesion-cliente';

interface CobroItem {
  montoPagado?: number;
}

export default function HomePage() {
  const router = useRouter();
  
  // ✅ MEJORA ARQUITECTÓNICA: Usar el hook centralizado en lugar de parsear localStorage manualmente
  const usuario = useSesion();

  const [stats, setStats] = useState({
    pacientes: 0,
    citas: 0,
    cobros: 0,
    tratamientos: 0,
    recetas: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [avisoAcceso, setAvisoAcceso] = useState<string | null>(null);

  // 1. Aviso cuando el middleware bloquea el acceso a un módulo sin permiso
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('acceso') === 'denegado') {
      setAvisoAcceso('No tiene permisos para acceder a ese módulo. Se le redirigió al inicio.');
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // 2. Redirección segura si no hay sesión válida
  useEffect(() => {
    if (!usuario) {
      router.replace('/login');
    }
  }, [usuario, router]);

  // 3. Carga de estadísticas globales con manejo de errores de sesión
  useEffect(() => {
    if (!usuario) return;

    let active = true;

    Promise.all([
      fetch('/api/pacientes'),
      fetch('/api/citas'),
      fetch('/api/cobros'),
      fetch('/api/tratamientos'),
      fetch('/api/recetas'),
    ])
      .then(async ([resP, resC, resCb, resT, resR]) => {
        if (!active) return;

        // ✅ MEJORA: Si alguna API devuelve 401, la sesión expiró en el servidor
        if ([resP, resC, resCb, resT, resR].some((r) => r.status === 401)) {
          limpiarSesionLocal();
          router.replace('/login');
          return;
        }

        const p = await resP.json().catch(() => []);
        const c = await resC.json().catch(() => []);
        const cb = await resCb.json().catch(() => []);
        const t = await resT.json().catch(() => []);
        const r = await resR.json().catch(() => []);

        setStats({
          pacientes: Array.isArray(p) ? p.length : 0,
          citas: Array.isArray(c) ? c.length : 0,
          cobros: Array.isArray(cb)
            ? cb.reduce((acc: number, curr: CobroItem) => acc + (curr.montoPagado || 0), 0)
            : 0,
          tratamientos: Array.isArray(t) ? t.length : 0,
          recetas: Array.isArray(r) ? r.length : 0,
        });
      })
      .catch((err) => {
        console.error('Error cargando estadísticas del dashboard:', err);
      })
      .finally(() => {
        if (active) setLoadingStats(false);
      });

    return () => {
      active = false;
    };
  }, [usuario, router]);

  // 4. Función de cierre de sesión completa (Backend + Frontend)
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignorar errores de red, procedemos a limpiar el cliente de todos modos
    }
    limpiarSesionLocal();
    router.replace('/login');
    router.refresh();
  };

  // Pantalla de carga mientras se valida la sesión o redirige
  if (!usuario) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-mono uppercase text-slate-400 tracking-wider">
          Redirigiendo a inicio de sesión seguro...
        </p>
      </div>
    );
  }

  const rolActual = usuario.rol;
  const nombreUsuario = usuario.nombre;

  // Catálogo completo de módulos con permisos RBAC estrictos
  const todosLosModulos = [
    {
      titulo: 'Gestión de Pacientes',
      desc: 'Registro de nuevos expedientes, historial de alergias y datos de contacto.',
      href: '/pacientes',
      badge: loadingStats ? 'Cargando...' : `${stats.pacientes} Registrados`,
      color: 'from-blue-500/20 to-indigo-500/5',
      border: 'hover:border-blue-500/50',
      roles: ['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA'],
    },
    {
      titulo: 'Odontograma Interactivo',
      desc: 'Registro clínico visual de piezas dentales, diagnósticos y tratamientos.',
      href: '/odontograma',
      badge: 'Visualización Clínica',
      color: 'from-cyan-500/20 to-teal-500/5',
      border: 'hover:border-cyan-500/50',
      roles: ['ADMINISTRADOR', 'ODONTOLOGO'],
    },
    {
      titulo: 'Cuaderno Digital e Imágenes',
      desc: 'Hallazgos, radiografías y evolución clínica con archivos reales.',
      href: '/cuaderno',
      badge: 'Registro Clínico',
      color: 'from-violet-500/20 to-purple-500/5',
      border: 'hover:border-violet-500/50',
      roles: ['ADMINISTRADOR', 'ODONTOLOGO'],
    },
    {
      titulo: 'Galería Fotográfica',
      desc: 'Fotografías antes, después y de seguimiento por paciente.',
      href: '/fotos',
      badge: 'Historial Visual',
      color: 'from-fuchsia-500/20 to-pink-500/5',
      border: 'hover:border-fuchsia-500/50',
      roles: ['ADMINISTRADOR', 'ODONTOLOGO'],
    },
    {
      titulo: 'Control de Citas',
      desc: 'Programación de consultas odontológicas y seguimiento de estados.',
      href: '/citas',
      badge: loadingStats ? 'Cargando...' : `${stats.citas} Programadas`,
      color: 'from-teal-500/20 to-emerald-500/5',
      border: 'hover:border-teal-500/50',
      roles: ['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA', 'PACIENTE'],
    },
    {
      titulo: 'Planes de Tratamiento y Saldos',
      desc: 'Seguimiento de procedimientos odontológicos, avances y presupuestos.',
      href: '/tratamientos',
      badge: loadingStats ? 'Cargando...' : `${stats.tratamientos} Registrados`,
      color: 'from-purple-500/20 to-pink-500/5',
      border: 'hover:border-purple-500/50',
      roles: ['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA', 'PACIENTE'],
    },
    {
      titulo: 'Cobros y Caja',
      desc: 'Registro de ingresos por consultas, pagos de tratamientos y recibos.',
      href: '/cobros',
      badge: loadingStats ? 'Cargando...' : `Bs. ${stats.cobros.toFixed(2)} Total`,
      color: 'from-amber-500/20 to-orange-500/5',
      border: 'hover:border-amber-500/50',
      roles: ['ADMINISTRADOR', 'RECEPCIONISTA'],
    },
    {
      titulo: 'Recetas Médicas',
      desc: 'Emisión rápida de prescripciones e indicaciones farmacológicas.',
      href: '/recetas',
      badge: loadingStats ? 'Cargando...' : `${stats.recetas} Emitidas`,
      color: 'from-cyan-500/20 to-blue-500/5',
      border: 'hover:border-cyan-500/50',
      roles: ['ADMINISTRADOR', 'ODONTOLOGO'],
    },
    {
      titulo: 'Contacto e Identidad',
      desc: 'Información institucional, dirección, teléfono, horario y staff de odontólogos.',
      href: '/contacto',
      badge: 'Información Oficial',
      color: 'from-emerald-500/20 to-teal-500/5',
      border: 'hover:border-emerald-500/50',
      roles: ['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA', 'PACIENTE'],
    },
    {
      titulo: 'Gestión de Usuarios',
      desc: 'Administración de cuentas, perfiles de acceso y seguridad del sistema.',
      href: '/usuarios',
      badge: 'Administración Total',
      color: 'from-red-500/20 to-rose-500/5',
      border: 'hover:border-red-500/50',
      roles: ['ADMINISTRADOR'],
    },
    {
      titulo: 'Reportes Gerenciales',
      desc: 'Indicadores KPI, balances financieros y consolidado oficial en PDF.',
      href: '/reportes',
      badge: 'Auditoría e Inteligencia',
      color: 'from-indigo-500/20 to-purple-500/5',
      border: 'hover:border-indigo-500/50',
      roles: ['ADMINISTRADOR'],
    },
  ];

  // Filtrado estricto según el rol
  const modulosPermitidos = todosLosModulos.filter((m) => m.roles.includes(rolActual));

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      {/* Aviso de Acceso Denegado */}
      {avisoAcceso && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 p-4 bg-red-500/10 border border-red-500/40 rounded-xl text-red-300 text-xs font-semibold uppercase animate-in fade-in slide-in-from-top-2"
        >
          <span>⛔ {avisoAcceso}</span>
          <button
            type="button"
            onClick={() => setAvisoAcceso(null)}
            aria-label="Cerrar aviso"
            className="opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Cabecera, Bienvenida y Cierre de Sesión */}
      <div className="border-b border-slate-800 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
            Bienvenido al Sistema
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase mt-1">
            {nombreUsuario}
          </h1>
          <p className="text-slate-400 mt-1 text-xs sm:text-sm font-medium">
            {rolActual === 'PACIENTE'
              ? 'Portal Personal de Consultas, Citas e Historial Dental'
              : 'Sistema Integral de Gestión Clínica y Control Odontológico Digital'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="bg-slate-900 text-teal-400 border border-teal-500/30 px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase font-mono shadow-md">
            ROL: {rolActual}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="bg-red-500/10 hover:bg-red-500/20 active:scale-[0.98] text-red-400 border border-red-500/30 px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase transition-all shadow cursor-pointer flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Salir
          </button>
        </div>
      </div>

      {/* Grid de Módulos Permitidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modulosPermitidos.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className={`group block p-6 rounded-2xl bg-gradient-to-br ${m.color} bg-[#0d1527] border border-slate-800/90 ${m.border} transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl shadow-xl`}
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-900/90 text-teal-400 border border-slate-700/80 font-mono shadow-inner">
                {m.badge}
              </span>
            </div>
            <h2 className="text-lg font-extrabold text-white mb-2 group-hover:text-blue-400 transition-colors uppercase">
              {m.titulo}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">{m.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}