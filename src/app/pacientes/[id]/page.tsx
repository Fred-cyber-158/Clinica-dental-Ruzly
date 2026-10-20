'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface Cita {
  id: string;
  fecha: string;
  hora: string;
  motivo?: string | null;
  estado: string;
}

interface Tratamiento {
  id: string;
  nombre: string;
  descripcion?: string | null;
  costo: number;
  pagado: number;
}

interface Receta {
  id: string;
  medicamento: string;
  indicaciones: string;
  createdAt: string;
}

interface Cobro {
  id: string;
  montoTotal: number;
  montoPagado: number;
  saldo: number;
  metodo: string;
}

interface FotoClinica {
  id: string;
  url: string;
  descripcion: string | null;
  createdAt: string;
}

interface OdontogramaRegistro {
  id: string;
  pieza: string;
  hallazgo: string;
  estado: string;
  observacion?: string | null;
  createdAt: string;
}

interface PacienteDetalle {
  id: string;
  nombre: string;
  edad: number | null;
  telefono: string | null;
  email: string | null;
  ci: string | null;
  alergias: string | null;
  citas?: Cita[];
  tratamientos?: Tratamiento[];
  recetas?: Receta[];
  cobros?: Cobro[];
  fotos?: FotoClinica[];
  odontogramas?: OdontogramaRegistro[];
  createdAt: string;
}

export default function ExpedientePacientePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [paciente, setPaciente] = useState<PacienteDetalle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Formulario de Fotos Clínicas
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null);
  const [tipoFoto, setTipoFoto] = useState('ANTES');
  const [detalleFoto, setDetalleFoto] = useState('');
  const [guardandoFoto, setGuardandoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function cargarPaciente() {
      try {
        const res = await fetch(`/api/pacientes/${id}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setPaciente(data);
        }
      } catch (err) {
        console.error('Error al cargar expediente:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    cargarPaciente();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleGuardarFoto = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorFoto(null);

    if (!archivoFoto) {
      setErrorFoto('Debe seleccionar una fotografía desde su equipo.');
      return;
    }

    setGuardandoFoto(true);

    try {
      const formData = new FormData();
      formData.append('pacienteId', id);
      formData.append('tipo', tipoFoto);
      formData.append('detalle', detalleFoto.trim().toUpperCase());
      formData.append('file', archivoFoto);

      const res = await fetch('/api/fotos', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('No se pudo subir la fotografía clínica.');

      setArchivoFoto(null);
      setDetalleFoto('');

      // Recargar datos actualizados
      const resActualizada = await fetch(`/api/pacientes/${id}`);
      if (resActualizada.ok) {
        const dataActualizada = await resActualizada.json();
        setPaciente(dataActualizada);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorFoto(error.message);
    } finally {
      setGuardandoFoto(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-400">Cargando expediente clínico integral...</div>;
  if (!paciente) return <div className="p-8 text-white">Paciente no encontrado.</div>;

  const citas = paciente.citas || [];
  const tratamientos = paciente.tratamientos || [];
  const recetas = paciente.recetas || [];
  const cobros = paciente.cobros || [];
  const fotos = paciente.fotos || [];
  const odontogramas = paciente.odontogramas || [];

  // Lógica para determinar el estado general del tratamiento del paciente
  let estadoTratamiento = 'INICIO';
  let badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/30';

  if (tratamientos.length > 0) {
    const totalCosto = tratamientos.reduce((acc, t) => acc + Number(t.costo), 0);
    const totalPagado = tratamientos.reduce((acc, t) => acc + Number(t.pagado), 0);
    
    if (totalPagado >= totalCosto && totalCosto > 0) {
      estadoTratamiento = 'TERMINADO';
      badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    } else {
      estadoTratamiento = 'EN PROCESO';
      badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Cabecera del Expediente y Estado General */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-4">
        <div>
          <Link href="/pacientes" className="text-xs text-purple-400 hover:underline uppercase font-semibold">
            ← Volver al Listado de Pacientes
          </Link>
          <h1 className="text-3xl font-extrabold text-white uppercase mt-1">Expediente: {paciente.nombre}</h1>
          <p className="text-sm text-slate-400 mt-1">
            {paciente.ci ? `C.I.: ${paciente.ci}` : 'S/C.I.'} 
            {paciente.edad ? ` • ${paciente.edad} AÑOS` : ''} 
            {paciente.telefono ? ` • 📞 ${paciente.telefono}` : ''}
            {paciente.email ? ` • ✉️ ${paciente.email}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="block text-[10px] text-slate-400 uppercase">Estado General</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase inline-block mt-0.5 ${badgeColor}`}>
              {estadoTratamiento}
            </span>
          </div>
        </div>
      </div>

      {/* Alergias o Antecedentes Médicos */}
      {paciente.alergias && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
          🚨 <strong className="uppercase">Alergias y Antecedentes Médicos:</strong> {paciente.alergias}
        </div>
      )}

      {/* Grid Superior: Odontograma y Historial Fotográfico */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Odontograma Registrado */}
        <div className="bg-[#0d1527] border border-slate-800 p-5 rounded-xl space-y-3 shadow-lg">
          <h2 className="text-base font-bold text-white uppercase border-b border-slate-800 pb-2">
            🦷 Hallazgos en Odontograma ({odontogramas.length})
          </h2>
          {odontogramas.length === 0 ? (
            <p className="text-xs text-slate-500 uppercase">Sin piezas dentales registradas en odontograma.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {odontogramas.map((o) => (
                <div key={o.id} className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white uppercase">Pieza Nº {o.pieza} - {o.hallazgo}</p>
                    <p className="text-slate-400 mt-0.5 uppercase">
                      {o.observacion ? `Obs: ${o.observacion}` : ''}
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono">{new Date(o.createdAt).toLocaleDateString()}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border uppercase ${
                    o.estado === 'TERMINADO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                    o.estado === 'EN PROCESO' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                    'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  }`}>
                    {o.estado}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historial Fotográfico */}
        <div className="bg-[#0d1527] border border-slate-800 p-5 rounded-xl space-y-3 shadow-lg">
          <h2 className="text-base font-bold text-white uppercase border-b border-slate-800 pb-2">
            📷 Historial Fotográfico ({fotos.length})
          </h2>
          {fotos.length === 0 ? (
            <p className="text-xs text-slate-500 uppercase">Sin registros fotográficos.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {fotos.map((f) => (
                <div key={f.id} className="bg-slate-900 p-2 rounded border border-slate-800 space-y-1">
                  <div className="h-24 bg-slate-950 rounded overflow-hidden flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={f.descripcion || 'Foto'} className="h-full w-full object-cover" />
                  </div>
                  <p className="text-[10px] font-semibold text-purple-400 truncate uppercase">{f.descripcion}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Formulario rápido para subir foto desde el expediente */}
      <div className="bg-[#0d1527] border border-slate-800 p-5 rounded-xl space-y-3 shadow-lg">
        <h3 className="text-sm font-bold text-white uppercase">Subir Fotografía Clínica (Antes / Después / Seguimiento)</h3>
        <form onSubmit={handleGuardarFoto} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Tipo de Imagen *</label>
            <select
              value={tipoFoto}
              onChange={(e) => setTipoFoto(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none uppercase"
            >
              <option value="ANTES">ANTES</option>
              <option value="DESPUÉS">DESPUÉS</option>
              <option value="SEGUIMIENTO">SEGUIMIENTO</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Archivo *</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setArchivoFoto(e.target.files?.[0] || null)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1 text-xs text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-purple-600 file:text-white cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Detalle / Pieza</label>
            <input
              type="text"
              value={detalleFoto}
              onChange={(e) => setDetalleFoto(e.target.value)}
              placeholder="EJ: PIEZA 16"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white uppercase"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={guardandoFoto || !archivoFoto}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white font-semibold py-2 rounded-lg text-xs uppercase shadow"
            >
              {guardandoFoto ? 'Subiendo...' : 'Subir Foto'}
            </button>
          </div>
        </form>
        {errorFoto && <p className="text-xs text-red-400 font-semibold">{errorFoto}</p>}
      </div>

      {/* Grid de Secciones Clínicas (Citas, Tratamientos, Recetas, Cobros) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Citas */}
        <div className="bg-[#0d1527] border border-slate-800 p-5 rounded-xl space-y-3">
          <h2 className="text-base font-bold text-white uppercase border-b border-slate-800 pb-2">Citas Programadas ({citas.length})</h2>
          {citas.length === 0 ? (
            <p className="text-xs text-slate-500 uppercase">Sin citas registradas.</p>
          ) : (
            <div className="space-y-2">
              {citas.map((c) => (
                <div key={c.id} className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white uppercase">{c.motivo || 'CONSULTA'}</p>
                    <p className="text-slate-400 font-mono mt-0.5">{c.fecha} - {c.hora}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase">
                    {c.estado}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tratamientos */}
        <div className="bg-[#0d1527] border border-slate-800 p-5 rounded-xl space-y-3">
          <h2 className="text-base font-bold text-white uppercase border-b border-slate-800 pb-2">Planes de Tratamiento ({tratamientos.length})</h2>
          {tratamientos.length === 0 ? (
            <p className="text-xs text-slate-500 uppercase">Sin tratamientos registrados.</p>
          ) : (
            <div className="space-y-2">
              {tratamientos.map((t) => (
                <div key={t.id} className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white uppercase">{t.nombre}</p>
                    <p className="text-slate-400 mt-0.5 font-mono">Costo: Bs. {Number(t.costo).toFixed(2)} | Pagado: Bs. {Number(t.pagado).toFixed(2)}</p>
                  </div>
                  <span className="font-mono font-semibold text-amber-400">
                    Saldo: Bs. {(Number(t.costo) - Number(t.pagado)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recetas */}
        <div className="bg-[#0d1527] border border-slate-800 p-5 rounded-xl space-y-3">
          <h2 className="text-base font-bold text-white uppercase border-b border-slate-800 pb-2">Recetas Médicas ({recetas.length})</h2>
          {recetas.length === 0 ? (
            <p className="text-xs text-slate-500 uppercase">Sin recetas emitidas.</p>
          ) : (
            <div className="space-y-2">
              {recetas.map((r) => (
                <div key={r.id} className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
                  <p className="font-bold text-purple-400 uppercase">💊 {r.medicamento}</p>
                  <p className="text-slate-300 uppercase">{r.indicaciones}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cobros */}
        <div className="bg-[#0d1527] border border-slate-800 p-5 rounded-xl space-y-3">
          <h2 className="text-base font-bold text-white uppercase border-b border-slate-800 pb-2">Historial de Cobros ({cobros.length})</h2>
          {cobros.length === 0 ? (
            <p className="text-xs text-slate-500 uppercase">Sin cobros registrados.</p>
          ) : (
            <div className="space-y-2">
              {cobros.map((cb) => (
                <div key={cb.id} className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white uppercase">{cb.metodo}</p>
                    <p className="text-slate-400 font-mono mt-0.5">Total: Bs. {Number(cb.montoTotal).toFixed(2)} | Pagado: Bs. {Number(cb.montoPagado).toFixed(2)}</p>
                  </div>
                  <span className="font-mono font-semibold text-emerald-400">
                    Saldo: Bs. {Number(cb.saldo).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}