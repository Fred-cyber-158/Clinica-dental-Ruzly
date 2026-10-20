'use client';

import { useState, useEffect, useCallback } from 'react';

interface Paciente {
  id: string;
  nombre: string;
  ci?: string | null;
}

interface FotoClinica {
  id: string;
  url: string;
  descripcion?: string | null;
  pacienteId?: string | null;
  createdAt: string;
  paciente?: Paciente | null;
}

export default function CuadernoDigitalPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [fotos, setFotos] = useState<FotoClinica[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  // Formulario de Registro Fotográfico / Nota Clínica
  const [pacienteId, setPacienteId] = useState('');
  const [url, setUrl] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [piezaDental, setPiezaDental] = useState('');

  const cargarDatos = useCallback(async () => {
    try {
      const [resF, resP] = await Promise.all([
        fetch('/api/fotos'),
        fetch('/api/pacientes'),
      ]);

      if (resF.ok) {
        const dataF = await resF.json();
        setFotos(Array.isArray(dataF) ? dataF : []);
      }
      if (resP.ok) {
        const dataP = await resP.json();
        setPacientes(Array.isArray(dataP) ? dataP : []);
      }
    } catch (err) {
      console.error('Error al cargar cuaderno digital:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (isMounted) {
        await cargarDatos();
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [cargarDatos]);

  const validarFormulario = () => {
    const errors: { [key: string]: string } = {};

    if (!pacienteId) {
      errors.pacienteId = 'Debe seleccionar un paciente.';
    }
    if (!url.trim()) {
      errors.url = 'La URL de la imagen o radiografía es obligatoria.';
    } else if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
      errors.url = 'Ingrese una URL válida (ej: https://... o ruta de imagen).';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    if (!validarFormulario()) {
      setErrorMsg('Por favor, corrija los errores marcados en rojo.');
      return;
    }

    setGuardando(true);

    try {
      const descCompleta = piezaDental.trim() 
        ? `PIEZA #${piezaDental.trim()} - ${descripcion.trim().toUpperCase()}` 
        : descripcion.trim().toUpperCase();

      const res = await fetch('/api/fotos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId,
          url: url.trim(),
          descripcion: descCompleta || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No se pudo registrar la imagen clínica.');
      }

      setPacienteId('');
      setUrl('');
      setDescripcion('');
      setPiezaDental('');
      setFieldErrors({});
      await cargarDatos();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white uppercase">Cuaderno Digital e Imagenología</h1>
        <p className="text-sm text-slate-400">Registro de hallazgos odontológicos y galería de radiografías clínicas.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario Registro de Hallazgo / Foto */}
        <div className="bg-[#0d1527] border border-slate-800 p-6 rounded-xl space-y-4 h-fit">
          <h2 className="text-lg font-semibold text-white uppercase">Agregar Registro Clínico</h2>

          {errorMsg && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm font-medium animate-pulse">
              🚨 {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Paciente *</label>
              <select
                value={pacienteId}
                onChange={(e) => setPacienteId(e.target.value)}
                className={`w-full bg-slate-900 border rounded-lg p-2.5 text-sm text-white focus:outline-none uppercase transition-colors ${
                  fieldErrors.pacienteId ? 'border-red-500 bg-red-500/5' : 'border-slate-700 focus:border-purple-500'
                }`}
              >
                <option value="">-- SELECCIONAR PACIENTE --</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre.toUpperCase()} {p.ci ? `(CI: ${p.ci})` : ''}
                  </option>
                ))}
              </select>
              {fieldErrors.pacienteId && (
                <p className="text-xs text-red-400 mt-1 font-semibold">⚠️ {fieldErrors.pacienteId}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-xs text-slate-400 mb-1">Pieza Nº</label>
                <input
                  type="text"
                  value={piezaDental}
                  onChange={(e) => setPiezaDental(e.target.value)}
                  placeholder="46"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-lg p-2.5 text-sm text-white focus:outline-none uppercase"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-400 mb-1">URL de Imagen / Radiografía *</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://ejemplo.com/foto.jpg"
                  className={`w-full bg-slate-900 border rounded-lg p-2.5 text-sm text-white focus:outline-none transition-colors ${
                    fieldErrors.url ? 'border-red-500 bg-red-500/5' : 'border-slate-700 focus:border-purple-500'
                  }`}
                />
              </div>
            </div>
            {fieldErrors.url && (
              <p className="text-xs text-red-400 mt-1 font-semibold">⚠️ {fieldErrors.url}</p>
            )}

            <div>
              <label className="block text-xs text-slate-400 mb-1">Diagnóstico / Observación</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value.toUpperCase())}
                placeholder="EJ: CARIES PROFUNDA EN CARA OCLUSAL..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-lg p-2.5 text-sm text-white focus:outline-none uppercase"
              />
            </div>

            <button
              type="submit"
              disabled={guardando}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors uppercase"
            >
              {guardando ? 'Guardando...' : 'Guardar Registro'}
            </button>
          </form>
        </div>

        {/* Galería de Registros Clínicos */}
        <div className="lg:col-span-2 bg-[#0d1527] border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white uppercase">Galería e Historial Gráfico ({fotos.length})</h2>

          {loading ? (
            <p className="text-slate-400">Cargando registros clínicos...</p>
          ) : fotos.length === 0 ? (
            <div className="text-center py-12 text-slate-500 uppercase border border-dashed border-slate-800 rounded-lg">
              No hay imágenes ni radiografías registradas.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fotos.map((f, idx) => (
                <div key={f.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span className="font-mono">#{fotos.length - idx}</span>
                    <span className="font-semibold text-purple-400 uppercase">{f.paciente?.nombre || 'PACIENTE GENERAL'}</span>
                  </div>
                  <div className="bg-slate-950 h-40 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.url}
                      alt="Radiografía clínica"
                      className="object-cover w-full h-full hover:scale-105 transition-transform"
                      onError={(e) => {
                        // Fallback si la URL falla
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-300 uppercase font-medium">
                    {f.descripcion || 'SIN DESCRIPCIÓN CLÍNICA'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono text-right">
                    {new Date(f.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}