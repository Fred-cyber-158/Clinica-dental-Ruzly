'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CobroItem {
  montoPagado?: number;
}

interface UsuarioSesion {
  nombre: string;
  username: string;
  rol: 'ADMINISTRADOR' | 'ODONTOLOGO' | 'RECEPCIONISTA' | 'PACIENTE';
}

export default function HomePage() {
  const router = useRouter();

  // Inicialización síncrona limpia (Lazy State) sin usar useEffect para el estado principal
  const [usuario] = useState<UsuarioSesion | null>(() => {
    if (typeof window !== 'undefined') {
      const userStored = localStorage.getItem('usuario_activo');
      if (!userStored) {
        return null;
      }
      try {
        const userObj: UsuarioSesion = JSON.parse(userStored);
        if (!userObj || !userObj.rol) {
          localStorage.removeItem('usuario_activo');
          return null;
        }
        return userObj;
      } catch {
        localStorage.removeItem('usuario_activo');
        return null;
      }
    }
    return null;
  });

  const [stats, setStats] = useState({
    pacientes: 0,
    citas: 0,
    cobros: 0,
    tratamientos: 0,
    recetas: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Redirección segura fuera del renderizado si no hay sesión
  useEffect(() => {
    if (!usuario) {
      router.replace('/login');
    }
  }, [usuario, router]);

  // Carga de estadísticas globales
  useEffect(() => {
    if (!usuario) return;

    let active = true;

    Promise.all([
      fetch('/api/pacientes').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/citas').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/cobros').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/tratamientos').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/recetas').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([p, c, cb, t, r]) => {
        if (active) {
          setStats({
            pacientes: Array.isArray(p) ? p.length : 0,
            citas: Array.isArray(c) ? c.length : 0,
            cobros: Array.isArray(cb)
              ? cb.reduce((acc: number, curr: CobroItem) => acc + (curr.montoPagado || 0), 0)
              : 0,
            tratamientos: Array.isArray(t) ? t.length : 0,
            recetas: Array.isArray(r) ? r.length : 0,
          });
        }
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoadingStats(false);
      });

    return () => {
      active = false;
    };
  }, [usuario]);

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
  const modulosPermitidos = todosLosModulos.filter((m) =>
    m.roles.includes(rolActual)
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
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
            onClick={() => {
              localStorage.removeItem('usuario_activo');
              router.replace('/login');
            }}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase transition-all shadow cursor-pointer"
          >
            🔒 Salir
          </button>
        </div>
      </div>

      {/* Grid de Módulos Permitidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modulosPermitidos.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className={`group block p-6 rounded-2xl bg-linear-to-br ${m.color} bg-[#0d1527] border border-slate-800/90 ${m.border} transition-all duration-200 hover:-translate-y-1 shadow-xl`}
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