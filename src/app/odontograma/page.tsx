'use client';

import { useState, useEffect } from 'react';

interface Paciente {
  id: string;
  nombre: string;
  ci?: string | null;
  createdAt: string;
}

// Numeración dental FDI (Arcadas Superior e Inferior)
const dientesSuperioresDerecha = ['18', '17', '16', '15', '14', '13', '12', '11'];
const dientesSuperioresIzquierda = ['21', '22', '23', '24', '25', '26', '27', '28'];
const dientesInferioresDerecha = ['48', '47', '46', '45', '44', '43', '42', '41'];
const dientesInferioresIzquierda = ['31', '32', '33', '34', '35', '36', '37', '38'];

export default function OdontogramaPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteId, setPacienteId] = useState<string>('');
  const [piezasSeleccionadas, setPiezasSeleccionadas] = useState<string[]>([]);
  const [hallazgo, setHallazgo] = useState<string>('');
  const [estadoPieza, setEstadoPieza] = useState<string>('DIAGNÓSTICO');
  const [observacion, setObservacion] = useState<string>('');
  
  const [guardando, setGuardando] = useState<boolean>(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function cargarPacientes() {
      try {
        const res = await fetch('/api/pacientes');
        if (res.ok && isMounted) {
          const data = await res.json();
          // Ordenar en orden descendente (más recientes primero)
          const ordenados = Array.isArray(data)
            ? data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            : [];
          setPacientes(ordenados);
        }
      } catch (err) {
        console.error('Error al cargar pacientes:', err);
      }
    }
    cargarPacientes();
    return () => {
      isMounted = false;
    };
  }, []);

  const togglePieza = (numero: string) => {
    setPiezasSeleccionadas((prev) =>
      prev.includes(numero) ? prev.filter((p) => p !== numero) : [...prev, numero]
    );
  };

  const handleGuardarOdontograma = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorGlobal(null);
    setMensajeExito(null);

    if (!pacienteId) {
      setErrorGlobal('Debe seleccionar un paciente.');
      return;
    }
    if (piezasSeleccionadas.length === 0) {
      setErrorGlobal('Debe seleccionar al menos una pieza dental en el odontograma.');
      return;
    }
    if (!hallazgo.trim()) {
      setErrorGlobal('El hallazgo o diagnóstico es obligatorio.');
      return;
    }

    setGuardando(true);

    try {
      for (const pieza of piezasSeleccionadas) {
        const res = await fetch('/api/odontograma', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pacienteId,
            pieza,
            hallazgo: hallazgo.trim().toUpperCase(),
            estado: estadoPieza,
            observacion: observacion.trim().toUpperCase() || null,
          }),
        });

        if (!res.ok) throw new Error(`No se pudo registrar la pieza dental ${pieza}.`);
      }

      setMensajeExito(`¡Odontograma actualizado con éxito para las piezas: [ ${piezasSeleccionadas.join(', ')} ]!`);
      setPiezasSeleccionadas([]);
      setHallazgo('');
      setObservacion('');
      setEstadoPieza('DIAGNÓSTICO');
    } catch (err: unknown) {
      const error = err as Error;
      setErrorGlobal(error.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">Odontograma Clínico Interactivo</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Control por arcada superior e inferior, selección múltiple y seguimiento de nuevos diagnósticos.</p>
        </div>
      </div>

      {errorGlobal && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-xs font-bold uppercase">
          🚨 {errorGlobal}
        </div>
      )}

      {mensajeExito && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-bold uppercase">
          ✅ {mensajeExito}
        </div>
      )}

      {/* Selector de Paciente (Orden Descendente) */}
      <div className="bg-[#0d1527] border border-slate-800 p-6 rounded-2xl space-y-3 shadow-xl">
        <label className="block text-xs text-slate-400 uppercase font-semibold">
          1. Seleccionar Paciente (Recientes / En Proceso / Nuevos Daños) *
        </label>
        <select
          value={pacienteId}
          onChange={(e) => setPacienteId(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-lg p-3 text-xs text-white focus:outline-none uppercase cursor-pointer"
        >
          <option value="">-- SELECCIONAR PACIENTE --</option>
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre.toUpperCase()} {p.ci ? `(CI: ${p.ci})` : ''} — Ingreso: {new Date(p.createdAt).toLocaleDateString()}
            </option>
          ))}
        </select>
      </div>

      {/* Interfaz Gráfica del Odontograma */}
      <div className="bg-[#0d1527] border border-slate-800 p-6 rounded-2xl space-y-8 shadow-xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white uppercase">2. Mapa Dental (Selección de Piezas)</h2>
          <span className="text-xs font-mono text-purple-400 bg-purple-500/10 border border-purple-500/30 px-3 py-1 rounded-full uppercase">
            Piezas Seleccionadas: {piezasSeleccionadas.length > 0 ? piezasSeleccionadas.join(', ') : 'Ninguna'}
          </span>
        </div>

        {/* NOTIFICACIÓN EN TIEMPO REAL */}
        {piezasSeleccionadas.length > 0 && (
          <div className="p-4 bg-purple-600/10 border border-purple-500/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-purple-300 text-xs animate-pulse">
            <span>💡 <strong>Notificación Clínica:</strong> Se registrará el diagnóstico y tratamiento para las piezas: <strong className="text-white underline">{piezasSeleccionadas.join(', ')}</strong></span>
            <button
              type="button"
              onClick={() => setPiezasSeleccionadas([])}
              className="text-[11px] text-slate-400 hover:text-white uppercase font-bold bg-slate-800 px-3 py-1.5 rounded cursor-pointer shrink-0"
            >
              Limpiar Selección
            </button>
          </div>
        )}

        {/* ARCADA SUPERIOR */}
        <div className="space-y-2">
          <p className="text-xs text-slate-400 font-bold uppercase text-center tracking-wider">▲ Maxilar Superior (Derecha e Izquierda) ▲</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            {/* Superior Derecha */}
            <div className="flex flex-wrap justify-center md:justify-end gap-1.5 md:border-r border-slate-800 md:pr-4">
              {dientesSuperioresDerecha.map((num) => {
                const seleccionado = piezasSeleccionadas.includes(num);
                return (
                  <button
                    type="button"
                    key={num}
                    onClick={() => togglePieza(num)}
                    className={`w-12 h-14 rounded-lg font-mono text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                      seleccionado
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 scale-105 border-2 border-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    <span className="text-[10px] text-slate-400">🦷</span>
                    {num}
                  </button>
                );
              })}
            </div>

            {/* Superior Izquierda */}
            <div className="flex flex-wrap justify-center md:justify-start gap-1.5 md:pl-2">
              {dientesSuperioresIzquierda.map((num) => {
                const seleccionado = piezasSeleccionadas.includes(num);
                return (
                  <button
                    type="button"
                    key={num}
                    onClick={() => togglePieza(num)}
                    className={`w-12 h-14 rounded-lg font-mono text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                      seleccionado
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 scale-105 border-2 border-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    <span className="text-[10px] text-slate-400">🦷</span>
                    {num}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ARCADA INFERIOR */}
        <div className="space-y-2 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            {/* Inferior Derecha */}
            <div className="flex flex-wrap justify-center md:justify-end gap-1.5 md:border-r border-slate-800 md:pr-4">
              {dientesInferioresDerecha.map((num) => {
                const seleccionado = piezasSeleccionadas.includes(num);
                return (
                  <button
                    type="button"
                    key={num}
                    onClick={() => togglePieza(num)}
                    className={`w-12 h-14 rounded-lg font-mono text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                      seleccionado
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 scale-105 border-2 border-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    <span className="text-[10px] text-slate-400">🦷</span>
                    {num}
                  </button>
                );
              })}
            </div>

            {/* Inferior Izquierda */}
            <div className="flex flex-wrap justify-center md:justify-start gap-1.5 md:pl-2">
              {dientesInferioresIzquierda.map((num) => {
                const seleccionado = piezasSeleccionadas.includes(num);
                return (
                  <button
                    type="button"
                    key={num}
                    onClick={() => togglePieza(num)}
                    className={`w-12 h-14 rounded-lg font-mono text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                      seleccionado
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 scale-105 border-2 border-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    <span className="text-[10px] text-slate-400">🦷</span>
                    {num}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-slate-400 font-bold uppercase text-center tracking-wider">▼ Maxilar Inferior (Derecha e Izquierda) ▼</p>
        </div>

        {/* Formulario de Diagnóstico y Estado */}
        <form onSubmit={handleGuardarOdontograma} className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-white uppercase">3. Registrar Hallazgo y Estado del Tratamiento</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Hallazgo / Patología *</label>
              <input
                type="text"
                value={hallazgo}
                onChange={(e) => setHallazgo(e.target.value)}
                placeholder="EJ: CARIES PROFUNDA / FRACTURA"
                className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-lg p-2.5 text-xs text-white focus:outline-none uppercase"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Estado de la Pieza</label>
              <select
                value={estadoPieza}
                onChange={(e) => setEstadoPieza(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-lg p-2.5 text-xs text-white focus:outline-none uppercase cursor-pointer"
              >
                <option value="DIAGNÓSTICO">DIAGNÓSTICO (INICIO)</option>
                <option value="EN PROCESO">EN PROCESO</option>
                <option value="TERMINADO">TERMINADO</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Observaciones Opcionales</label>
              <input
                type="text"
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                placeholder="EJ: REQUIERE ENDODONCIA PREVIA"
                className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-lg p-2.5 text-xs text-white focus:outline-none uppercase"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={guardando || piezasSeleccionadas.length === 0}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-3 rounded-lg text-xs uppercase transition-colors shadow-lg cursor-pointer"
          >
            {guardando ? 'Guardando en la Base de Datos...' : 'Guardar Registro en Odontograma'}
          </button>
        </form>
      </div>
    </div>
  );
}