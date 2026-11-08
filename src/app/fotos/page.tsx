'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface Paciente {
  id: string;
  nombre: string;
  ci?: string | null;
}

interface Foto {
  id: string;
  url: string;
  descripcion: string | null;
  createdAt: string;
  paciente?: { id: string; nombre: string } | null;
}

const MAX_BYTES = 5 * 1024 * 1024;
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const TIPOS_ETIQUETA = ['ANTES', 'DESPUES', 'RX', 'RADIOGRAFIA', 'OTRO'];
const DESCRIPCION_MAX = 300;

// ✅ MEJORA: Clase reutilizable para mantener la consistencia visual con el resto de la app
const claseInput = (hasError: boolean) =>
  `w-full bg-slate-950/50 border rounded-lg p-2.5 text-xs text-white uppercase focus:outline-none focus:ring-1 transition-all duration-200 placeholder:text-slate-600 ${
    hasError
      ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
      : 'border-slate-800 focus:border-purple-500 focus:ring-purple-500/20 hover:border-slate-700'
  }`;

function errorArchivo(file: File | null): string | null {
  if (!file) return 'Seleccione una imagen desde su equipo.';
  if (!TIPOS_PERMITIDOS.includes(file.type.toLowerCase())) {
    return 'Formato no permitido. Use una imagen JPG, PNG o WEBP.';
  }
  if (file.size === 0) return 'El archivo está vacío. Seleccione otra imagen.';
  if (file.size > MAX_BYTES) return 'La imagen no puede superar los 5 MB.';
  return null;
}

export default function FotosPage() {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteId, setPacienteId] = useState('');
  const [tipo, setTipo] = useState('ANTES');
  const [descripcion, setDescripcion] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [filtroPaciente, setFiltroPaciente] = useState('');

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);

  const cargarDatos = useCallback(async () => {
    try {
      const [resFotos, resPacientes] = await Promise.all([
        fetch('/api/fotos'),
        fetch('/api/pacientes'),
      ]);
      if (resFotos.ok) {
        const data = await resFotos.json();
        setFotos(Array.isArray(data) ? data : []);
      }
      if (resPacientes.ok) {
        const data = await resPacientes.json();
        setPacientes(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error al cargar la galería:', error);
      setErrorMsg('No se pudo cargar la galería. Revise su conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    return () => {
      if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
    };
  }, [vistaPrevia]);

  const seleccionarArchivo = (file: File | null) => {
    setErrorMsg(null);
    setExitoMsg(null);
    const problema = errorArchivo(file);
    if (problema) {
      setArchivo(null);
      setVistaPrevia(null);
      if (inputArchivo.current) inputArchivo.current.value = '';
      setErrorMsg(problema);
      return;
    }
    setArchivo(file);
    if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
    setVistaPrevia(file ? URL.createObjectURL(file) : null);
  };

  const formularioValido = useMemo(() => {
    return (
      Boolean(pacienteId) &&
      Boolean(archivo) &&
      !errorArchivo(archivo) &&
      descripcion.trim().length <= DESCRIPCION_MAX
    );
  }, [pacienteId, archivo, descripcion]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setExitoMsg(null);

    if (!pacienteId) {
      setErrorMsg('Debe seleccionar un paciente.');
      return;
    }
    const problema = errorArchivo(archivo);
    if (problema) {
      setErrorMsg(problema);
      return;
    }
    if (descripcion.trim().length > DESCRIPCION_MAX) {
      setErrorMsg(`La descripción no puede superar ${DESCRIPCION_MAX} caracteres.`);
      return;
    }

    setGuardando(true);
    try {
      const formData = new FormData();
      formData.append('pacienteId', pacienteId);
      formData.append('tipo', tipo);
      formData.append('descripcion', descripcion.trim().toUpperCase());
      formData.append('file', archivo as File);

      const res = await fetch('/api/fotos', { method: 'POST', body: formData });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? 'No se pudo registrar la fotografía clínica.');
      }

      setExitoMsg('Fotografía registrada correctamente en el expediente del paciente.');
      setPacienteId('');
      setTipo('ANTES');
      setDescripcion('');
      setArchivo(null);
      if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
      setVistaPrevia(null);
      if (inputArchivo.current) inputArchivo.current.value = '';
      await cargarDatos();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Error de conexión con el servidor.');
    } finally {
      setGuardando(false);
    }
  };

  const fotosVisibles = filtroPaciente
    ? fotos.filter((f) => f.paciente?.id === filtroPaciente)
    : fotos;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium animate-pulse">Cargando galería fotográfica...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">Galería y Registro Fotográfico</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 uppercase">
          Historial visual de diagnósticos, evolución y procedimientos clínicos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario */}
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 h-fit backdrop-blur-sm">
          <h2 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-3 tracking-wider">
            Registrar Nueva Imagen
          </h2>

          {errorMsg && (
            <div role="alert" className="p-3 bg-red-500/10 border border-red-500/40 rounded-xl text-red-300 text-xs font-semibold uppercase flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <span>🚨</span> {errorMsg}
            </div>
          )}
          {exitoMsg && (
            <div role="status" className="p-3 bg-emerald-500/10 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-semibold uppercase flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <span>✅</span> {exitoMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="paciente" className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">
                Paciente <span className="text-red-400">*</span>
              </label>
              <select
                id="paciente"
                value={pacienteId}
                onChange={(e) => setPacienteId(e.target.value)}
                className={claseInput(!pacienteId && !!errorMsg)}
                aria-invalid={!pacienteId && !!errorMsg}
              >
                <option value="">-- SELECCIONAR PACIENTE --</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre.toUpperCase()}
                    {p.ci ? ` (CI: ${p.ci})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="tipo" className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">
                Tipo de imagen <span className="text-red-400">*</span>
              </label>
              <select
                id="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className={claseInput(false)}
              >
                {TIPOS_ETIQUETA.map((t) => (
                  <option key={t} value={t}>
                    {t === 'DESPUES' ? 'DESPUÉS' : t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="archivo" className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">
                Imagen (JPG, PNG o WEBP, máx. 5 MB) <span className="text-red-400">*</span>
              </label>
              <input
                ref={inputArchivo}
                id="archivo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => seleccionarArchivo(e.target.files?.[0] ?? null)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-300 file:mr-2 file:py-1.5 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-purple-600 file:text-white cursor-pointer hover:border-slate-700 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500/20 transition-all duration-200"
              />
              {archivo && (
                <p className="text-[10px] text-emerald-400 mt-1.5 font-mono flex items-center gap-1">
                  <span></span> {archivo.name} · {(archivo.size / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </div>

            {vistaPrevia && (
              <div className="h-40 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={vistaPrevia} alt="Vista previa de la imagen" className="h-full w-full object-cover" />
              </div>
            )}

            <div>
              <label htmlFor="descripcion" className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">
                Descripción / Detalle
              </label>
              <input
                id="descripcion"
                type="text"
                value={descripcion}
                maxLength={DESCRIPCION_MAX}
                onChange={(e) => setDescripcion(e.target.value.toUpperCase())}
                placeholder="EJ: PIEZA 16 - CARA OCLUSAL"
                className={claseInput(false)}
              />
              <p className="text-[10px] text-slate-500 text-right mt-1 font-mono">
                {descripcion.length}/{DESCRIPCION_MAX}
              </p>
            </div>

            <button
              type="submit"
              disabled={!formularioValido || guardando}
              className="w-full bg-purple-600 hover:bg-purple-500 active:scale-[0.98] disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-purple-900/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              {guardando ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Subiendo imagen...
                </>
              ) : (
                <>
                  <span>📷</span> Registrar Fotografía
                </>
              )}
            </button>
          </form>
        </div>

        {/* Listado de Fotos */}
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Registros Fotográficos ({fotosVisibles.length})
            </h2>
            <select
              value={filtroPaciente}
              onChange={(e) => setFiltroPaciente(e.target.value)}
              aria-label="Filtrar fotos por paciente"
              className="bg-slate-950/50 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 outline-none rounded-lg p-2 text-[11px] text-white uppercase sm:max-w-56 cursor-pointer transition-all duration-200 hover:border-slate-700"
            >
              <option value="">Todos los pacientes</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {fotosVisibles.length === 0 ? (
            <div className="text-center py-12 animate-in fade-in zoom-in-95 duration-300">
              <p className="text-4xl mb-3 opacity-50">🖼️</p>
              <p className="text-xs text-slate-500 uppercase font-semibold">
                No hay fotografías registradas para esta selección.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-screen overflow-y-auto pr-2 custom-scrollbar">
              {fotosVisibles.map((f) => (
                <div 
                  key={f.id} 
                  className="bg-slate-950/50 border border-slate-800 hover:border-purple-500/30 p-3 rounded-xl space-y-3 transition-all duration-200 group hover:shadow-lg hover:shadow-purple-900/10"
                >
                  <div className="h-40 bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center border border-slate-800/50 group-hover:border-purple-500/20 transition-colors">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={f.descripcion || 'Foto clínica'} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="flex justify-between items-start gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-purple-400 uppercase truncate group-hover:text-purple-300 transition-colors">
                        {f.descripcion || 'SIN DESCRIPCIÓN'}
                      </p>
                      <p className="text-[10px] text-slate-400 uppercase truncate mt-0.5">
                        {f.paciente?.nombre ?? 'PACIENTE NO VINCULADO'}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0 bg-slate-900 px-1.5 py-0.5 rounded">
                      {new Date(f.createdAt).toLocaleDateString()}
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