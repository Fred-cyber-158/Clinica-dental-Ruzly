'use client';

import { useState, useEffect, useMemo } from 'react';

interface Paciente {
  id: string;
  nombre: string;
  ci?: string | null;
  activo: boolean;
}

interface Tratamiento {
  id: string;
  nombre: string;
  descripcion: string | null;
  costo: number;
  pagado: number;
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

export default function TratamientosPage() {
  // Inicialización limpia y síncrona de sesión desde localStorage
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
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fecha y hora de emisión actualizada de forma limpia (Lazy State)
  const [fechaHoraEmision, setFechaHoraEmision] = useState<string>(() => {
    const ahora = new Date();
    return `${ahora.toLocaleDateString()} a las ${ahora.toLocaleTimeString()}`;
  });

  // Campos del formulario
  const [pacienteId, setPacienteId] = useState('');
  const [nombreTratamiento, setNombreTratamiento] = useState('');
  const [costoTotal, setCostoTotal] = useState('');
  const [montoInicial, setMontoInicial] = useState('0');
  const [descripcion, setDescripcion] = useState('');

  // Buscador dinámico
  const [busqueda, setBusqueda] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function cargarDatos() {
      try {
        const [resPacientes, resTratamientos] = await Promise.all([
          fetch('/api/pacientes'),
          fetch('/api/tratamientos'),
        ]);
        if (resPacientes.ok && resTratamientos.ok && isMounted) {
          const dataPacientes = await resPacientes.json();
          const dataTratamientos = await resTratamientos.json();

          setPacientes(Array.isArray(dataPacientes) ? dataPacientes.filter((p) => p.activo) : []);
          setTratamientos(
            Array.isArray(dataTratamientos)
              ? dataTratamientos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              : []
          );
        }
      } catch (err) {
        console.error('Error al cargar planes de tratamiento:', err);
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

  // Filtrar tratamientos si el rol activo es PACIENTE
  const tratamientosDelPaciente = useMemo(() => {
    if (!esPaciente || !usuario) return tratamientos;
    return tratamientos.filter((t) => {
      const nombreUsuario = usuario.nombre.toLowerCase();
      const nombrePaciente = t.paciente?.nombre?.toLowerCase() || '';
      return nombrePaciente.includes(nombreUsuario) || nombreUsuario.includes(nombrePaciente);
    });
  }, [tratamientos, esPaciente, usuario]);

  // Validación Enterprise: Hard-blocking de formulario
  const esFormularioValido = useMemo(() => {
    const costoNum = parseFloat(costoTotal);
    return pacienteId !== '' && nombreTratamiento.trim().length >= 3 && !isNaN(costoNum) && costoNum > 0;
  }, [pacienteId, nombreTratamiento, costoTotal]);

  const handleRegistrarTratamiento = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm(null);

    if (!esFormularioValido) {
      setErrorForm('Seleccione un paciente e ingrese un tratamiento y costo válidos.');
      return;
    }

    setGuardando(true);

    try {
      const res = await fetch('/api/tratamientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId,
          nombre: nombreTratamiento.trim().toUpperCase(),
          costo: parseFloat(costoTotal),
          pagado: parseFloat(montoInicial) || 0,
          descripcion: descripcion.trim().toUpperCase() || null,
        }),
      });

      if (!res.ok) throw new Error('No se pudo registrar el plan de tratamiento.');

      setPacienteId('');
      setNombreTratamiento('');
      setCostoTotal('');
      setMontoInicial('0');
      setDescripcion('');

      const resActualizada = await fetch('/api/tratamientos');
      if (resActualizada.ok) {
        const dataTratamientos = await resActualizada.json();
        setTratamientos(
          Array.isArray(dataTratamientos)
            ? dataTratamientos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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
  const listadoObjetivo = esPaciente ? tratamientosDelPaciente : tratamientos;
  const tratamientosFiltrados = useMemo(() => {
    return listadoObjetivo.filter((t) => {
      const nombrePaciente = t.paciente?.nombre || '';
      const nomTratamiento = t.nombre || '';
      const query = busqueda.toLowerCase();
      return (
        nombrePaciente.toLowerCase().includes(query) ||
        nomTratamiento.toLowerCase().includes(query)
      );
    });
  }, [listadoObjetivo, busqueda]);

  if (loading) return <div className="p-8 text-slate-400">Cargando cuaderno digital de tratamientos...</div>;

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
              REPORTE OFICIAL DE PLANES DE TRATAMIENTO Y SALDOS
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
            {esPaciente ? 'Mis Tratamientos y Saldos' : 'Planes de Tratamiento'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {esPaciente
              ? 'Consulta el avance de tus procedimientos dentales y presupuestos asignados.'
              : 'Control clínico y financiero, validación estricta y presupuestos en PDF.'}
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
        
        {/* Formulario de Registro (Oculto al Imprimir) */}
        {!esPaciente && (
          <div className="bg-[#0d1527] border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl h-fit print:hidden">
            <h2 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-2">Registrar Tratamiento</h2>

            <form onSubmit={handleRegistrarTratamiento} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Paciente Asignado *</label>
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

              <div>
                <label className="block text-xs text-slate-400 mb-1">Nombre del Tratamiento *</label>
                <input
                  type="text"
                  value={nombreTratamiento}
                  onChange={(e) => setNombreTratamiento(e.target.value)}
                  placeholder="EJ: ORTODONCIA / ENDODONCIA"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Costo Total (Bs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={costoTotal}
                    onChange={(e) => setCostoTotal(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Monto Inicial Pagado (Bs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={montoInicial}
                    onChange={(e) => setMontoInicial(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Descripción u Observaciones</label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="DETALLES TÉCNICOS..."
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
                {guardando ? 'Guardando...' : 'Guardar Tratamiento'}
              </button>
            </form>
          </div>
        )}

        {/* Listado con Buscador Dinámico */}
        <div className={`${esPaciente ? 'lg:col-span-1' : 'lg:col-span-2'} bg-[#0d1527] border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl print:bg-white print:border-none print:p-0 print:shadow-none`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3 print:hidden">
            <h2 className="text-sm font-bold text-white uppercase">
              {esPaciente ? 'Mis Tratamientos' : 'Planes Registrados'} ({tratamientosFiltrados.length})
            </h2>

            <div className="w-full sm:w-72">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="🔍 Buscar por procedimiento..."
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
                  <th className="py-2 px-1 font-bold uppercase">Tratamiento</th>
                  <th className="py-2 px-1 font-bold uppercase text-right">Costo (Bs.)</th>
                  <th className="py-2 px-1 font-bold uppercase text-right">Pagado (Bs.)</th>
                  <th className="py-2 px-1 font-bold uppercase text-right">Saldo (Bs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {tratamientosFiltrados.map((t) => {
                  const costo = Number(t.costo);
                  const pagado = Number(t.pagado);
                  const saldo = costo - pagado;
                  return (
                    <tr key={t.id}>
                      <td className="py-2 px-1 font-bold uppercase">{t.paciente?.nombre || 'PACIENTE GENERAL'}</td>
                      <td className="py-2 px-1 uppercase">{t.nombre}</td>
                      <td className="py-2 px-1 text-right font-mono">Bs. {costo.toFixed(2)}</td>
                      <td className="py-2 px-1 text-right font-mono font-bold">Bs. {pagado.toFixed(2)}</td>
                      <td className="py-2 px-1 text-right font-mono font-bold">Bs. {saldo.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* VISTA EN PANTALLA */}
          {tratamientosFiltrados.length === 0 ? (
            <p className="text-xs text-slate-500 uppercase py-6 text-center print:hidden">No hay planes de tratamiento registrados con ese criterio.</p>
          ) : (
            <div className="print:hidden space-y-3 max-h-125 overflow-y-auto pr-1">
              {tratamientosFiltrados.map((t) => {
                const costo = Number(t.costo);
                const pagado = Number(t.pagado);
                const saldo = costo - pagado;

                return (
                  <div key={t.id} className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="space-y-1">
                      {!esPaciente && (
                        <p className="font-bold text-white uppercase text-sm">{t.paciente?.nombre || 'PACIENTE DESCONOCIDO'}</p>
                      )}
                      <p className="text-xs text-purple-400 font-bold uppercase">{t.nombre}</p>
                      {t.descripcion && <p className="text-[11px] text-slate-400 uppercase">{t.descripcion}</p>}
                    </div>

                    <div className="text-right font-mono text-xs space-y-0.5">
                      <p className="text-slate-300">Costo: Bs. {costo.toFixed(2)}</p>
                      <p className="text-emerald-400 font-semibold">Pagado: Bs. {pagado.toFixed(2)}</p>
                      <p className="text-amber-400 font-bold">Saldo: Bs. {saldo.toFixed(2)}</p>
                    </div>
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