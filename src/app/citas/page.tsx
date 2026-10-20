'use client';

import { useState, useEffect, useMemo } from 'react';

interface Paciente {
  id: string;
  nombre: string;
  ci?: string | null;
  activo: boolean;
}

interface Cita {
  id: string;
  fecha: string;
  hora: string;
  motivo: string | null;
  estado: string;
  pacienteId: string;
  paciente: Paciente;
  createdAt: string;
}

interface UsuarioSesion {
  nombre: string;
  username: string;
  email?: string;
  rol: 'ADMINISTRADOR' | 'ODONTOLOGO' | 'RECEPCIONISTA' | 'PACIENTE';
}

export default function CitasPage() {
  // Inicialización limpia y síncrona desde localStorage
  const [usuario] = useState<UsuarioSesion | null>(() => {
    if (typeof window !== 'undefined') {
      const userStored = localStorage.getItem('usuario_activo');
      if (userStored) {
        try {
          return JSON.parse(userStored);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fecha y hora de emisión actualizada de forma limpia (Lazy State)
  const [fechaHoraEmision, setFechaHoraEmision] = useState<string>(() => {
    const ahora = new Date();
    return `${ahora.toLocaleDateString()} a las ${ahora.toLocaleTimeString()}`;
  });

  // Campos del formulario
  const [pacienteId, setPacienteId] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [motivo, setMotivo] = useState('');
  const [estado, setEstado] = useState('PENDIENTE');

  // Buscador dinámico en tiempo real
  const [busqueda, setBusqueda] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function cargarDatos() {
      try {
        const [resPacientes, resCitas] = await Promise.all([
          fetch('/api/pacientes'),
          fetch('/api/citas'),
        ]);
        if (resPacientes.ok && resCitas.ok && isMounted) {
          const dataPacientes = await resPacientes.json();
          const dataCitas = await resCitas.json();
          
          setPacientes(Array.isArray(dataPacientes) ? dataPacientes.filter((p) => p.activo) : []);
          setCitas(
            Array.isArray(dataCitas)
              ? dataCitas.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              : []
          );
        }
      } catch (err) {
        console.error('Error al cargar datos de citas:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    cargarDatos();

    return () => {
      isMounted = false;
    };
  }, []);

  const rolActual = usuario?.rol || 'PACIENTE';
  const esPaciente = rolActual === 'PACIENTE';

  // Filtro de citas para el rol Paciente
  const citasDelPaciente = useMemo(() => {
    if (!esPaciente || !usuario) return citas;
    return citas.filter((c) => {
      const nombreUsuario = usuario.nombre.toLowerCase();
      const nombrePaciente = c.paciente?.nombre?.toLowerCase() || '';
      return nombrePaciente.includes(nombreUsuario) || nombreUsuario.includes(nombrePaciente);
    });
  }, [citas, esPaciente, usuario]);

  // Validación Enterprise: Hard-blocking del botón de envío
  const esFormularioValido = useMemo(() => {
    return pacienteId !== '' && fecha !== '' && hora !== '';
  }, [pacienteId, fecha, hora]);

  const handleRegistrarCita = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm(null);

    if (!esFormularioValido) {
      setErrorForm('Seleccione un paciente, fecha y hora válidos.');
      return;
    }

    setGuardando(true);

    try {
      const res = await fetch('/api/citas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId,
          fecha,
          hora,
          motivo: motivo.trim().toUpperCase() || 'CONSULTA GENERAL',
          estado,
        }),
      });

      if (!res.ok) throw new Error('No se pudo registrar la cita.');

      setPacienteId('');
      setFecha('');
      setHora('');
      setMotivo('');
      setEstado('PENDIENTE');

      const resCitas = await fetch('/api/citas');
      if (resCitas.ok) {
        const dataCitas = await resCitas.json();
        setCitas(
          Array.isArray(dataCitas)
            ? dataCitas.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            : []
        );
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorForm(error.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarEstado = async (id: string, nuevoEstado: string) => {
    try {
      await fetch(`/api/citas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      setCitas((prev) =>
        prev.map((c) => (c.id === id ? { ...c, estado: nuevoEstado } : c))
      );
    } catch (err) {
      console.error('Error al actualizar estado de cita:', err);
    }
  };

  // Filtrado dinámico en tiempo real
  const listadoObjetivo = esPaciente ? citasDelPaciente : citas;
  const citasFiltradas = useMemo(() => {
    return listadoObjetivo.filter((c) => {
      const nombrePaciente = c.paciente?.nombre || '';
      const mot = c.motivo || '';
      const query = busqueda.toLowerCase();
      return (
        nombrePaciente.toLowerCase().includes(query) ||
        mot.toLowerCase().includes(query) ||
        c.fecha.includes(query)
      );
    });
  }, [listadoObjetivo, busqueda]);

  if (loading) return <div className="p-8 text-slate-400">Cargando módulo de citas...</div>;

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
              REPORTE OFICIAL DE CITAS Y AGENDA MÉDICA
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

      {/* Cabecera y Preimpresión PDF */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4 print:hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">
            {esPaciente ? 'Mis Citas Programadas' : 'Control de Citas'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {esPaciente
              ? 'Consulta el estado de tus consultas odontológicas programadas.'
              : 'Programación de consultas odontológicas, búsqueda dinámica y reportes en PDF.'}
          </p>
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

      <div className={`grid grid-cols-1 ${esPaciente ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-6 print:block`}>
        
        {/* Formulario de Agendamiento (Oculto al Imprimir) */}
        {!esPaciente && (
          <div className="bg-[#0d1527] border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl h-fit print:hidden">
            <h2 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-2">Agendar Cita</h2>

            <form onSubmit={handleRegistrarCita} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Paciente *</label>
                <select
                  value={pacienteId}
                  onChange={(e) => setPacienteId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white uppercase cursor-pointer"
                >
                  <option value="">-- SELECCIONAR PACIENTE --</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.ci ? `(CI: ${p.ci})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Fecha *</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Hora *</label>
                  <input
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Motivo de la Consulta</label>
                <input
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="EJ: REVISIÓN GENERAL / LIMPIEZA"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white uppercase"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Estado Inicial</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white uppercase cursor-pointer"
                >
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="CONFIRMADA">CONFIRMADA</option>
                  <option value="ATENDIDA">ATENDIDA</option>
                  <option value="CANCELADA">CANCELADA</option>
                </select>
              </div>

              {errorForm && <p className="text-xs text-red-400 font-semibold">{errorForm}</p>}

              <button
                type="submit"
                disabled={!esFormularioValido || guardando}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-semibold py-2.5 rounded-lg text-xs uppercase shadow transition-colors cursor-pointer"
              >
                {guardando ? 'Agendando...' : 'Guardar Cita'}
              </button>
            </form>
          </div>
        )}

        {/* Listado con Buscador Dinámico en Tiempo Real */}
        <div className={`${esPaciente ? 'lg:col-span-1' : 'lg:col-span-2'} bg-[#0d1527] border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl print:bg-white print:border-none print:p-0 print:shadow-none`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3 print:hidden">
            <h2 className="text-sm font-bold text-white uppercase">
              {esPaciente ? 'Mis Citas Registradas' : 'Citas Programadas'} ({citasFiltradas.length})
            </h2>

            <div className="w-full sm:w-72">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="🔍 Buscar por motivo o fecha..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white uppercase"
              />
            </div>
          </div>

          {/* TABLA EJECUTIVA PARA IMPRESIÓN (SOLO VISIBLE AL IMPRIMIR) */}
          <div className="hidden print:block">
            <table className="w-full text-left text-xs text-black border-collapse">
              <thead>
                <tr className="border-b-2 border-black bg-gray-100">
                  <th className="py-2 px-1 font-bold uppercase">Paciente</th>
                  <th className="py-2 px-1 font-bold uppercase">Fecha y Hora</th>
                  <th className="py-2 px-1 font-bold uppercase">Motivo</th>
                  <th className="py-2 px-1 font-bold uppercase text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {citasFiltradas.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 px-1 font-bold uppercase">{c.paciente?.nombre || 'PACIENTE GENERAL'}</td>
                    <td className="py-2 px-1 font-mono">{c.fecha} — {c.hora}</td>
                    <td className="py-2 px-1 uppercase">{c.motivo || 'CONSULTA'}</td>
                    <td className="py-2 px-1 font-mono font-bold text-right uppercase">{c.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* VISTA EN PANTALLA */}
          {citasFiltradas.length === 0 ? (
            <p className="text-xs text-slate-500 uppercase py-6 text-center print:hidden">No hay citas registradas con ese criterio.</p>
          ) : (
            <div className="print:hidden space-y-3 max-h-125 overflow-y-auto pr-1">
              {citasFiltradas.map((c) => (
                <div key={c.id} className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-1">
                    {!esPaciente && (
                      <p className="font-bold text-white uppercase text-sm">{c.paciente?.nombre || 'PACIENTE DESCONOCIDO'}</p>
                    )}
                    <p className="text-xs text-slate-300 uppercase font-mono">
                      📅 Fecha: <strong className="text-teal-400">{c.fecha}</strong> — 🕒 Hora: <strong className="text-teal-400">{c.hora}</strong>
                    </p>
                    <p className="text-xs text-slate-400 uppercase">
                      Motivo: <span className="text-slate-200">{c.motivo || 'CONSULTA'}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {esPaciente ? (
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase font-mono ${
                        c.estado === 'CONFIRMADA' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                        c.estado === 'PENDIENTE' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {c.estado}
                      </span>
                    ) : (
                      <select
                        value={c.estado}
                        onChange={(e) => handleCambiarEstado(c.id, e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-[11px] text-white uppercase focus:outline-none font-semibold cursor-pointer"
                      >
                        <option value="PENDIENTE">PENDIENTE</option>
                        <option value="CONFIRMADA">CONFIRMADA</option>
                        <option value="ATENDIDA">ATENDIDA</option>
                        <option value="CANCELADA">CANCELADA</option>
                      </select>
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