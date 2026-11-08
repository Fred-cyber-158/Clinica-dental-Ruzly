'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSesion } from '@/lib/sesion-cliente';

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
  const router = useRouter();
  
  // ✅ MEJORA ARQUITECTÓNICA: Usar el hook centralizado en lugar de localStorage manual
  const usuario = useSesion();
  const puedeSubir = usuario?.rol === 'ADMINISTRADOR' || usuario?.rol === 'ODONTOLOGO';

  const [paciente, setPaciente] = useState<PacienteDetalle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Formulario de Fotos Clínicas
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null);
  const [tipoFoto, setTipoFoto] = useState('ANTES');
  const [detalleFoto, setDetalleFoto] = useState('');
  const [guardandoFoto, setGuardandoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [exitoFoto, setExitoFoto] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function cargarPaciente() {
      try {
        const res = await fetch(`/api/pacientes/${id}`);
        
        // ✅ MEJORA: Manejo seguro de sesión expirada
        if (res.status === 401) {
          router.replace('/login');
          return;
        }

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
  }, [id, router]);

  const handleGuardarFoto = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorFoto(null);
    setExitoFoto(null);

    if (!archivoFoto) {
      setErrorFoto('Debe seleccionar una fotografía desde su equipo.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivoFoto.type.toLowerCase())) {
      setErrorFoto('Formato no permitido. Use JPG, PNG o WEBP.');
      return;
    }
    if (archivoFoto.size > 5 * 1024 * 1024) {
      setErrorFoto('La imagen no puede superar los 5 MB.');
      return;
    }
    if (detalleFoto.trim().length > 300) {
      setErrorFoto('El detalle no puede superar 300 caracteres.');
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

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? 'No se pudo subir la fotografía clínica.');
      }

      setExitoFoto('Fotografía subida correctamente al historial.');
      setArchivoFoto(null);
      setDetalleFoto('');

      // Recargar datos actualizados
      const resActualizada = await fetch(`/api/pacientes/${id}`);
      if (resActualizada.ok) {
        const dataActualizada = await resActualizada.json();
        setPaciente(dataActualizada);
      }
    } catch (err: unknown) {
      setErrorFoto(err instanceof Error ? err.message : 'Error de conexión al subir la foto.');
    } finally {
      setGuardandoFoto(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium animate-pulse">Cargando expediente clínico integral...</p>
      </div>
    );
  }

  if (!paciente) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-4xl">📂</p>
        <p className="text-slate-400 text-sm font-medium">Expediente no encontrado o acceso denegado.</p>
        <Link href="/pacientes" className="text-blue-400 hover:underline text-xs uppercase font-bold">
          ← Volver al listado
        </Link>
      </div>
    );
  }

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
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Cabecera del Expediente y Estado General */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
        <div>
          <Link href="/pacientes" className="text-xs text-purple-400 hover:text-purple-300 hover:underline uppercase font-semibold transition-colors flex items-center gap-1">
            ← Volver al Listado de Pacientes
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight mt-2">
            Expediente: {paciente.nombre}
          </h1>
          <p className="text-sm text-slate-400 mt-2 flex flex-wrap gap-x-3 gap-y-1 font-medium">
            {paciente.ci ? <span>C.I.: {paciente.ci}</span> : <span>S/C.I.</span>}
            {paciente.edad && <span>• {paciente.edad} AÑOS</span>}
            {paciente.telefono && <span>• 📞 {paciente.telefono}</span>}
            {paciente.email && <span>• ✉️ {paciente.email}</span>}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="block text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Estado General</span>
            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border uppercase inline-block mt-1 shadow-sm ${badgeColor}`}>
              {estadoTratamiento}
            </span>
          </div>
        </div>
      </div>

      {/* Alergias o Antecedentes Médicos */}
      {paciente.alergias && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <span className="text-xl mt-0.5">🚨</span>
          <div>
            <strong className="uppercase block mb-1 text-red-200">Alergias y Antecedentes Médicos:</strong>
            <span className="font-medium">{paciente.alergias}</span>
          </div>
        </div>
      )}

      {/* Grid Superior: Odontograma y Historial Fotográfico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Odontograma Registrado */}
        <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/60 p-5 rounded-2xl space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-3 tracking-wider flex items-center gap-2">
            🦷 Hallazgos en Odontograma <span className="text-slate-500 font-normal">({odontogramas.length})</span>
          </h2>
          {odontogramas.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p className="text-3xl mb-2 opacity-50">🦷</p>
              <p className="text-xs uppercase font-semibold">Sin piezas dentales registradas aún.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
              {odontogramas.map((o) => (
                <div key={o.id} className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 text-xs flex justify-between items-start gap-3 hover:border-slate-700 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white uppercase truncate">Pieza Nº {o.pieza} <span className="text-slate-400 font-normal">- {o.hallazgo}</span></p>
                    {o.observacion && <p className="text-slate-400 mt-1 uppercase italic">Obs: {o.observacion}</p>}
                    <p className="text-[10px] text-slate-500 font-mono mt-2">
                      {new Date(o.createdAt).toLocaleDateString('es-BO')}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold border uppercase shrink-0 ${
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
        <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/60 p-5 rounded-2xl space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-3 tracking-wider flex items-center gap-2">
            📷 Historial Fotográfico <span className="text-slate-500 font-normal">({fotos.length})</span>
          </h2>
          {fotos.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p className="text-3xl mb-2 opacity-50">📷</p>
              <p className="text-xs uppercase font-semibold">Sin registros fotográficos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
              {fotos.map((f) => (
                <div key={f.id} className="bg-slate-950/50 p-2 rounded-xl border border-slate-800 space-y-2 hover:border-slate-700 transition-colors group">
                  <div className="aspect-square bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={f.descripcion || 'Foto clínica'} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-purple-400 truncate uppercase">{f.descripcion || 'Sin descripción'}</p>
                    <p className="text-[9px] text-slate-500 font-mono">
                      {new Date(f.createdAt).toLocaleDateString('es-BO')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Formulario rápido para subir foto desde el expediente */}
      {puedeSubir && (
        <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/60 p-5 rounded-2xl space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            📤 Subir Fotografía Clínica
          </h3>
          <form onSubmit={handleGuardarFoto} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end" noValidate>
            <div className="md:col-span-2">
              <label htmlFor="tipoFoto" className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase">Tipo *</label>
              <select
                id="tipoFoto"
                value={tipoFoto}
                onChange={(e) => setTipoFoto(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 uppercase transition-all cursor-pointer"
              >
                <option value="ANTES">ANTES</option>
                <option value="DESPUES">DESPUÉS</option>
                <option value="RX">RADIOGRAFÍA</option>
                <option value="OTRO">SEGUIMIENTO / OTRO</option>
              </select>
            </div>
            
            <div className="md:col-span-4">
              <label htmlFor="archivoFoto" className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase">Archivo (Máx. 5MB) *</label>
              <input
                id="archivoFoto"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  setErrorFoto(null);
                  setExitoFoto(null);
                  setArchivoFoto(e.target.files?.[0] || null);
                }}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-purple-600 file:text-white file:cursor-pointer file:uppercase hover:file:bg-purple-500 cursor-pointer transition-all"
              />
            </div>
            
            <div className="md:col-span-4">
              <label htmlFor="detalleFoto" className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase">Detalle / Pieza</label>
              <input
                id="detalleFoto"
                type="text"
                value={detalleFoto}
                maxLength={300}
                onChange={(e) => setDetalleFoto(e.target.value.toUpperCase().slice(0, 300))}
                placeholder="EJ: PIEZA 16, CARA OCL"
                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-2.5 text-xs text-white uppercase placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
              />
            </div>
            
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={guardandoFoto || !archivoFoto}
                className="w-full bg-purple-600 hover:bg-purple-500 active:scale-[0.98] disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg text-xs uppercase shadow-lg shadow-purple-900/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                {guardandoFoto ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Subiendo...
                  </>
                ) : (
                  'Subir Foto'
                )}
              </button>
            </div>
          </form>
          {errorFoto && <p role="alert" className="text-xs text-red-400 font-semibold uppercase flex items-center gap-1.5">🚨 {errorFoto}</p>}
          {exitoFoto && <p role="status" className="text-xs text-emerald-400 font-semibold uppercase flex items-center gap-1.5">✅ {exitoFoto}</p>}
        </div>
      )}

      {/* Grid de Secciones Clínicas (Citas, Tratamientos, Recetas, Cobros) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Citas */}
        <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/60 p-5 rounded-2xl space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-3 tracking-wider">Citas Programadas ({citas.length})</h2>
          {citas.length === 0 ? (
            <p className="text-xs text-slate-500 uppercase text-center py-4">Sin citas registradas.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {citas.map((c) => (
                <div key={c.id} className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 text-xs flex justify-between items-center hover:border-slate-700 transition-colors">
                  <div>
                    <p className="font-bold text-white uppercase">{c.motivo || 'CONSULTA GENERAL'}</p>
                    <p className="text-slate-400 font-mono mt-1 flex items-center gap-2">
                      <span>📅 {c.fecha}</span>
                      <span className="text-slate-600">|</span>
                      <span>🕒 {c.hora}</span>
                    </p>
                </div>
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase shrink-0 bg-purple-500/10 text-purple-400 border-purple-500/20">
                    {c.estado}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tratamientos */}
        <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/60 p-5 rounded-2xl space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-3 tracking-wider">Planes de Tratamiento ({tratamientos.length})</h2>
          {tratamientos.length === 0 ? (
            <p className="text-xs text-slate-500 uppercase text-center py-4">Sin tratamientos registrados.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {tratamientos.map((t) => (
                <div key={t.id} className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 text-xs flex justify-between items-center hover:border-slate-700 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white uppercase truncate">{t.nombre}</p>
                    <p className="text-slate-400 mt-1 font-mono">
                      Costo: <span className="text-slate-200">Bs. {Number(t.costo).toFixed(2)}</span> | Pagado: <span className="text-emerald-400">Bs. {Number(t.pagado).toFixed(2)}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className="block text-[10px] text-slate-500 uppercase">Saldo Pendiente</span>
                    <span className="font-mono font-bold text-amber-400">
                      Bs. {(Number(t.costo) - Number(t.pagado)).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recetas */}
        <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/60 p-5 rounded-2xl space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-3 tracking-wider">Recetas Médicas ({recetas.length})</h2>
          {recetas.length === 0 ? (
            <p className="text-xs text-slate-500 uppercase text-center py-4">Sin recetas emitidas.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {recetas.map((r) => (
                <div key={r.id} className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5 hover:border-slate-700 transition-colors">
                  <p className="font-bold text-purple-400 uppercase flex items-center gap-2">
                    <span>💊</span> {r.medicamento}
                  </p>
                  <p className="text-slate-300 uppercase leading-relaxed pl-6">{r.indicaciones}</p>
                  <p className="text-[10px] text-slate-500 font-mono pt-1">
                    Emitida: {new Date(r.createdAt).toLocaleDateString('es-BO')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cobros */}
        <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/60 p-5 rounded-2xl space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-3 tracking-wider">Historial de Cobros ({cobros.length})</h2>
          {cobros.length === 0 ? (
            <p className="text-xs text-slate-500 uppercase text-center py-4">Sin cobros registrados.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {cobros.map((cb) => (
                <div key={cb.id} className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 text-xs flex justify-between items-center hover:border-slate-700 transition-colors">
                  <div>
                    <p className="font-bold text-white uppercase flex items-center gap-2">
                      <span>💳</span> {cb.metodo}
                    </p>
                    <p className="text-slate-400 font-mono mt-1">
                      Total: <span className="text-slate-200">Bs. {Number(cb.montoTotal).toFixed(2)}</span> | Pagado: <span className="text-emerald-400">Bs. {Number(cb.montoPagado).toFixed(2)}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className="block text-[10px] text-slate-500 uppercase">Saldo</span>
                    <span className="font-mono font-bold text-emerald-400">
                      Bs. {Number(cb.saldo).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}