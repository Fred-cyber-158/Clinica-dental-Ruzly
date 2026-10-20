'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface Paciente {
  id: string;
  nombre: string;
  edad: number | null;
  telefono: string | null;
  email: string | null;
  ci: string | null;
  alergias: string | null;
  activo: boolean;
  createdAt: string;
}

interface UsuarioSesion {
  nombre: string;
  username: string;
  rol: 'ADMINISTRADOR' | 'ODONTOLOGO' | 'RECEPCIONISTA' | 'PACIENTE';
}

export default function PacientesPage() {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Inicialización limpia de la fecha y hora sin usar setState síncrono en useEffect
  const [fechaHoraEmision, setFechaHoraEmision] = useState<string>(() => {
    const ahora = new Date();
    return `${ahora.toLocaleDateString()} a las ${ahora.toLocaleTimeString()}`;
  });

  // Campos del formulario
  const [nombre, setNombre] = useState('');
  const [ci, setCi] = useState('');
  const [edad, setEdad] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [alergias, setAlergias] = useState('');

  // Buscador dinámico en tiempo real
  const [busqueda, setBusqueda] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function cargarDatosIniciales() {
      try {
        const userStored = localStorage.getItem('usuario_activo');
        if (userStored && isMounted) {
          setUsuario(JSON.parse(userStored));
        }

        const res = await fetch('/api/pacientes');
        if (res.ok && isMounted) {
          const data = await res.json();
          const ordenados = Array.isArray(data)
            ? data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            : [];
          setPacientes(ordenados);
        }
      } catch (err) {
        console.error('Error al cargar datos:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    cargarDatosIniciales();
    return () => {
      isMounted = false;
    };
  }, []);

  const rolActual = usuario?.rol || 'PACIENTE';
  const esPaciente = rolActual === 'PACIENTE';

  // Validación Enterprise: Hard-blocking del botón
  const esFormularioValido = useMemo(() => {
    return nombre.trim().length >= 3 && ci.trim().length >= 4;
  }, [nombre, ci]);

  const handleRegistrarPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm(null);

    if (esPaciente) {
      setErrorForm('No cuentas con permisos para registrar pacientes.');
      return;
    }

    if (!esFormularioValido) {
      setErrorForm('Complete los campos obligatorios correctamente.');
      return;
    }

    setGuardando(true);

    try {
      const res = await fetch('/api/pacientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim().toUpperCase(),
          ci: ci.trim(),
          edad: edad ? parseInt(edad) : null,
          telefono: telefono.trim() || null,
          email: email.trim().toLowerCase() || null,
          alergias: alergias.trim().toUpperCase() || null,
        }),
      });

      if (!res.ok) throw new Error('No se pudo registrar el paciente.');

      setNombre('');
      setCi('');
      setEdad('');
      setTelefono('');
      setEmail('');
      setAlergias('');

      const resActualizada = await fetch('/api/pacientes');
      if (resActualizada.ok) {
        const data = await resActualizada.json();
        const ordenados = Array.isArray(data)
          ? data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          : [];
        setPacientes(ordenados);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorForm(error.message);
    } finally {
      setGuardando(false);
    }
  };

  // Borrado Lógico (Desactivar paciente)
  const handleBorradoLogico = async (id: string, nombrePaciente: string) => {
    if (esPaciente) return;
    if (!confirm(`¿Está seguro de dar de baja (borrado lógico) al paciente ${nombrePaciente}?`)) return;

    try {
      await fetch(`/api/pacientes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: false }),
      });

      setPacientes((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Error al realizar borrado lógico:', err);
    }
  };

  // Filtrado dinámico en tiempo real según la búsqueda
  const pacientesFiltrados = useMemo(() => {
    return pacientes.filter(
      (p) =>
        p.activo &&
        (p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
          (p.ci && p.ci.toLowerCase().includes(busqueda.toLowerCase())))
    );
  }, [pacientes, busqueda]);

  if (loading) return <div className="p-8 text-slate-400">Cargando módulo de pacientes...</div>;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 print:p-0 print:max-w-none print:space-y-4">
      
      {/* ========================================================================== */}
      {/* MEMBRETE OFICIAL Y LOGO (SOLO VISIBLE AL IMPRIMIR) */}
      {/* ========================================================================== */}
      <div className="hidden print:flex justify-between items-center border-b-2 border-black pb-4 mb-6">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Logo Clínica Dental Ruzly"
            className="h-16 w-auto object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <h1 className="text-2xl font-black text-black uppercase tracking-wider">
              CLÍNICA DENTAL RUZLY
            </h1>
            <p className="text-xs text-gray-700 font-semibold uppercase">
              REPORTE OFICIAL DE PACIENTES REGISTRADOS
            </p>
            <p className="text-[10px] text-gray-600 font-mono">
              Cochabamba, Bolivia • Código de Proyecto: 07
            </p>
          </div>
        </div>

        <div className="text-right font-mono text-xs text-black">
          <p><strong>EMISIÓN:</strong> {fechaHoraEmision}</p>
          <p><strong>RESPONSABLE:</strong> {usuario ? `${usuario.nombre} (${usuario.rol})` : 'ADMINISTRADOR GENERAL'}</p>
        </div>
      </div>

      {/* Cabecera y Preimpresión PDF (En pantalla) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4 print:hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">Gestión de Pacientes</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Registro de expedientes, búsqueda dinámica en tiempo real, borrado lógico y reportes.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            const ahora = new Date();
            setFechaHoraEmision(`${ahora.toLocaleDateString()} a las ${ahora.toLocaleTimeString()}`);
            window.print();
          }}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all shadow-lg cursor-pointer shrink-0"
        >
          <span>📄 Preimpresión PDF / Reporte</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block">
        {/* Formulario de Registro (Oculto para Pacientes y al Imprimir) */}
        {!esPaciente && (
          <div className="bg-[#0d1527] border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl h-fit print:hidden">
            <h2 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-2">Registrar Paciente</h2>

            <form onSubmit={handleRegistrarPaciente} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="EJ: CARLOS PÉREZ"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">C.I. *</label>
                  <input
                    type="text"
                    value={ci}
                    onChange={(e) => setCi(e.target.value)}
                    placeholder="EJ: 8392104"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Edad</label>
                  <input
                    type="number"
                    value={edad}
                    onChange={(e) => setEdad(e.target.value)}
                    placeholder="35"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+591 70000000"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white lowercase"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Alergias o Antecedentes</label>
                <textarea
                  value={alergias}
                  onChange={(e) => setAlergias(e.target.value)}
                  placeholder="EJ: ALÉRGICO A LA PENICILINA"
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white uppercase"
                />
              </div>

              {errorForm && <p className="text-xs text-red-400 font-semibold">{errorForm}</p>}

              <button
                type="submit"
                disabled={!esFormularioValido || guardando}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-semibold py-2.5 rounded-lg text-xs uppercase shadow transition-colors cursor-pointer"
              >
                {guardando ? 'Registrando...' : 'Registrar Paciente'}
              </button>
            </form>
          </div>
        )}

        {/* Listado con Buscador Dinámico */}
        <div className={`${esPaciente ? 'lg:col-span-3' : 'lg:col-span-2'} bg-[#0d1527] border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl print:bg-white print:border-none print:p-0 print:shadow-none`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3 print:hidden">
            <h2 className="text-sm font-bold text-white uppercase">
              Pacientes Registrados ({pacientesFiltrados.length})
            </h2>

            {/* Buscador Dinámico */}
            <div className="w-full sm:w-72">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="🔍 Buscar por nombre o C.I...."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white uppercase"
              />
            </div>
          </div>

          {/* TABLA EJECUTIVA PARA IMPRESIÓN (SOLO VISIBLE AL IMPRIMIR) */}
          <div className="hidden print:block">
            <table className="w-full text-left text-xs text-black border-collapse">
              <thead>
                <tr className="border-b-2 border-black bg-gray-100">
                  <th className="py-2 px-1 font-bold uppercase">Nombre Completo</th>
                  <th className="py-2 px-1 font-bold uppercase">C.I.</th>
                  <th className="py-2 px-1 font-bold uppercase">Edad</th>
                  <th className="py-2 px-1 font-bold uppercase">Teléfono</th>
                  <th className="py-2 px-1 font-bold uppercase">Alergias / Antecedentes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {pacientesFiltrados.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 px-1 font-bold uppercase">{p.nombre}</td>
                    <td className="py-2 px-1 font-mono">{p.ci || 'S/C.I.'}</td>
                    <td className="py-2 px-1 font-mono">{p.edad ? `${p.edad} AÑOS` : '-'}</td>
                    <td className="py-2 px-1 font-mono">{p.telefono || '-'}</td>
                    <td className="py-2 px-1 uppercase">{p.alergias || 'NINGUNA'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* VISTA EN PANTALLA (TARJETAS) */}
          {pacientesFiltrados.length === 0 ? (
            <p className="text-xs text-slate-500 uppercase py-6 text-center print:hidden">No se encontraron pacientes activos con ese criterio de búsqueda.</p>
          ) : (
            <div className="print:hidden space-y-3 max-h-125 overflow-y-auto pr-1">
              {pacientesFiltrados.map((p) => (
                <div key={p.id} className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-1">
                    <p className="font-bold text-white uppercase text-sm">{p.nombre}</p>
                    <p className="text-xs text-slate-400">
                      {p.ci ? `C.I.: ${p.ci}` : 'S/C.I.'} {p.edad ? `• ${p.edad} AÑOS` : ''} {p.telefono ? `• 📞 ${p.telefono}` : ''}
                    </p>
                    {p.alergias && (
                      <p className="text-[11px] text-red-400 font-semibold uppercase">🚨 Alergia: {p.alergias}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Link
                      href={`/pacientes/${p.id}`}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs uppercase transition-colors shadow cursor-pointer"
                    >
                      Expediente
                    </Link>
                    {!esPaciente && (
                      <button
                        type="button"
                        onClick={() => handleBorradoLogico(p.id, p.nombre)}
                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold rounded-lg text-xs uppercase transition-colors cursor-pointer"
                      >
                        Dar de Baja
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================== */}
      {/* SECCIÓN DE FIRMAS Y SELLO OFICIAL (SOLO VISIBLE AL IMPRIMIR) */}
      {/* ========================================================================== */}
      <div className="hidden print:flex justify-between items-end pt-16 text-xs text-black font-semibold uppercase">
        <div className="text-center border-t border-black pt-2 w-60">
          Firma: {usuario ? usuario.nombre : 'ADMINISTRADOR GENERAL'}
        </div>
        <div className="text-center border-t border-black pt-2 w-60">
          Sello Oficial — Clínica Dental Ruzly
        </div>
      </div>

    </div>
  );
}