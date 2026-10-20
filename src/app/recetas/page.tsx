'use client';

import { useState, useEffect, useMemo } from 'react';

interface Paciente {
  id: string;
  nombre: string;
  ci?: string | null;
  activo: boolean;
}

interface Receta {
  id: string;
  medicamento: string;
  indicaciones: string;
  pacienteId?: string | null;
  nombrePaciente?: string | null;
  paciente?: Paciente | null;
  createdAt: string;
}

interface UsuarioSesion {
  nombre: string;
  username: string;
  email?: string;
  rol: 'ADMINISTRADOR' | 'ODONTOLOGO' | 'RECEPCIONISTA' | 'PACIENTE';
}

export default function RecetasPage() {
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
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fecha y hora de emisión actualizada para el reporte impreso
  const [fechaHoraEmision, setFechaHoraEmision] = useState<string>(() => {
    const ahora = new Date();
    return `${ahora.toLocaleDateString()} a las ${ahora.toLocaleTimeString()}`;
  });

  // Campos del formulario
  const [pacienteId, setPacienteId] = useState('');
  const [nombrePaciente, setNombrePaciente] = useState('');
  const [medicamento, setMedicamento] = useState('');
  const [indicaciones, setIndicaciones] = useState('');

  // Buscador dinámico en tiempo real
  const [busqueda, setBusqueda] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function cargarDatos() {
      try {
        const [resPacientes, resRecetas] = await Promise.all([
          fetch('/api/pacientes'),
          fetch('/api/recetas'),
        ]);
        if (resPacientes.ok && resRecetas.ok && isMounted) {
          const dataPacientes = await resPacientes.json();
          const dataRecetas = await resRecetas.json();

          setPacientes(Array.isArray(dataPacientes) ? dataPacientes.filter((p) => p.activo) : []);
          setRecetas(
            Array.isArray(dataRecetas)
              ? dataRecetas.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              : []
          );
        }
      } catch (err) {
        console.error('Error al cargar recetas médicas:', err);
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
  const esPersonalMedico = rolActual === 'ADMINISTRADOR' || rolActual === 'ODONTOLOGO';

  // Sincronización automática de paciente seleccionado
  const handleSeleccionarPaciente = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setPacienteId(id);
    if (id) {
      const p = pacientes.find((item) => item.id === id);
      if (p) setNombrePaciente(p.nombre);
    } else {
      setNombrePaciente('');
    }
  };

  // Validación Enterprise: Hard-blocking de formulario
  const esFormularioValido = useMemo(() => {
    return (
      nombrePaciente.trim().length >= 3 &&
      medicamento.trim().length >= 3 &&
      indicaciones.trim().length >= 5
    );
  }, [nombrePaciente, medicamento, indicaciones]);

  const handleEmitirReceta = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm(null);

    if (!esPersonalMedico) {
      setErrorForm('No cuentas con permisos para emitir recetas médicas.');
      return;
    }

    if (!esFormularioValido) {
      setErrorForm('Complete el nombre del paciente, medicamento e indicaciones válidas.');
      return;
    }

    setGuardando(true);

    try {
      const res = await fetch('/api/recetas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: pacienteId || null,
          nombrePaciente: nombrePaciente.trim().toUpperCase(),
          medicamento: medicamento.trim().toUpperCase(),
          indicaciones: indicaciones.trim().toUpperCase(),
        }),
      });

      if (!res.ok) throw new Error('No se pudo emitir la receta médica.');

      setPacienteId('');
      setNombrePaciente('');
      setMedicamento('');
      setIndicaciones('');

      const resActualizada = await fetch('/api/recetas');
      if (resActualizada.ok) {
        const dataRecetas = await resActualizada.json();
        setRecetas(
          Array.isArray(dataRecetas)
            ? dataRecetas.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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

  // Filtrado dinámico en tiempo real
  const recetasFiltradas = useMemo(() => {
    return recetas.filter((r) => {
      const paciente = r.paciente?.nombre || r.nombrePaciente || '';
      const query = busqueda.toLowerCase();
      return (
        paciente.toLowerCase().includes(query) ||
        r.medicamento.toLowerCase().includes(query) ||
        r.indicaciones.toLowerCase().includes(query)
      );
    });
  }, [recetas, busqueda]);

  if (loading) return <div className="p-8 text-slate-400">Cargando módulo de recetas médicas...</div>;

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
              REPORTE OFICIAL DE RECETAS Y PRESCRIPCIONES MÉDICAS
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">Recetas Médicas</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Emisión de prescripciones, posología, búsqueda en tiempo real e impresión PDF.</p>
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

      <div className={`grid grid-cols-1 ${esPersonalMedico ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6 print:block`}>
        {/* Formulario con Hard-Blocking (Exclusivo Administrador / Odontólogo) */}
        {esPersonalMedico && (
          <div className="bg-[#0d1527] border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl h-fit print:hidden">
            <h2 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-2">Emitir Nueva Receta</h2>

            <form onSubmit={handleEmitirReceta} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Paciente Registrado</label>
                <select
                  value={pacienteId}
                  onChange={handleSeleccionarPaciente}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white uppercase cursor-pointer"
                >
                  <option value="">-- SELECCIONAR O ESCRIBIR ABAJO --</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.ci ? `(CI: ${p.ci})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Nombre del Paciente *</label>
                <input
                  type="text"
                  value={nombrePaciente}
                  onChange={(e) => setNombrePaciente(e.target.value)}
                  placeholder="NOMBRE DEL PACIENTE"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white uppercase"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Medicamento / Prescripción *</label>
                <input
                  type="text"
                  value={medicamento}
                  onChange={(e) => setMedicamento(e.target.value)}
                  placeholder="EJ: AMOXICILINA 500MG / IBUPROFENO 600MG"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white uppercase"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Indicaciones / Posología *</label>
                <textarea
                  value={indicaciones}
                  onChange={(e) => setIndicaciones(e.target.value)}
                  placeholder="EJ: TOMAR 1 TABLETA CADA 8 HORAS POR 7 DÍAS DESPUÉS DE LAS COMIDAS."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white uppercase"
                />
              </div>

              {errorForm && <p className="text-xs text-red-400 font-semibold">{errorForm}</p>}

              <button
                type="submit"
                disabled={!esFormularioValido || guardando}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-semibold py-2.5 rounded-lg text-xs uppercase shadow transition-colors cursor-pointer"
              >
                {guardando ? 'Emitiendo...' : 'Emitir Receta'}
              </button>
            </form>
          </div>
        )}

        {/* Listado con Buscador Dinámico */}
        <div className={`${esPersonalMedico ? 'lg:col-span-2' : 'lg:col-span-1'} bg-[#0d1527] border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl print:bg-white print:border-none print:p-0 print:shadow-none`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3 print:hidden">
            <h2 className="text-sm font-bold text-white uppercase">
              Recetas Emitidas ({recetasFiltradas.length})
            </h2>

            <div className="w-full sm:w-72">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="🔍 Buscar por paciente o medicamento..."
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
                  <th className="py-2 px-1 font-bold uppercase">Medicamento / Prescripción</th>
                  <th className="py-2 px-1 font-bold uppercase">Indicaciones y Posología</th>
                  <th className="py-2 px-1 font-bold uppercase text-right">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {recetasFiltradas.map((r) => {
                  const clienteNombre = r.paciente?.nombre || r.nombrePaciente || 'PACIENTE GENERAL';
                  const fechaE = new Date(r.createdAt).toLocaleDateString();
                  return (
                    <tr key={r.id}>
                      <td className="py-2 px-1 font-bold uppercase">{clienteNombre}</td>
                      <td className="py-2 px-1 uppercase text-purple-800 font-semibold">{r.medicamento}</td>
                      <td className="py-2 px-1 uppercase">{r.indicaciones}</td>
                      <td className="py-2 px-1 text-right font-mono">{fechaE}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* VISTA EN PANTALLA */}
          {recetasFiltradas.length === 0 ? (
            <p className="text-xs text-slate-500 uppercase py-6 text-center print:hidden">No hay recetas emitidas con ese criterio de búsqueda.</p>
          ) : (
            <div className="print:hidden space-y-3 max-h-125 overflow-y-auto pr-1">
              {recetasFiltradas.map((r) => {
                const clienteNombre = r.paciente?.nombre || r.nombrePaciente || 'PACIENTE GENERAL';
                const fechaE = new Date(r.createdAt).toLocaleDateString();

                return (
                  <div key={r.id} className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white uppercase text-sm">{clienteNombre}</p>
                        <span className="text-[10px] text-slate-400 font-mono">({fechaE})</span>
                      </div>
                      <p className="text-xs text-purple-400 font-bold uppercase">💊 {r.medicamento}</p>
                      <p className="text-xs text-slate-300 uppercase">📋 {r.indicaciones}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const ahora = new Date();
                        setFechaHoraEmision(`${ahora.toLocaleDateString()} a las ${ahora.toLocaleTimeString()}`);
                        window.print();
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer shrink-0"
                    >
                      Imprimir Receta
                    </button>
                  </div>
                );
              })}
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