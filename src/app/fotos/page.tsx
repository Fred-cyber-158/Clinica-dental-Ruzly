'use client';

import { useState, useEffect } from 'react';

interface Foto {
  id: string;
  url: string;
  descripcion: string | null;
  createdAt: string;
  paciente?: { nombre: string };
}

export default function FotosPage() {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [url, setUrl] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function cargarFotos() {
      try {
        const res = await fetch('/api/fotos');
        if (res.ok && isMounted) {
          const data = await res.json();
          setFotos(data);
        }
      } catch (err) {
        console.error('Error al cargar fotos:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    cargarFotos();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    try {
      const res = await fetch('/api/fotos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), descripcion: descripcion.trim() ? descripcion.trim().toUpperCase() : null }),
      });

      if (res.ok) {
        setUrl('');
        setDescripcion('');
        
        // Recargar listado
        const resList = await fetch('/api/fotos');
        if (resList.ok) {
          const dataList = await resList.json();
          setFotos(dataList);
        }
      }
    } catch (err) {
      console.error('Error al registrar fotografía:', err);
    }
  };

  if (loading) return <div className="p-8 text-slate-400">Cargando galería fotográfica...</div>;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-3xl font-extrabold text-white uppercase">Galería y Registro Fotográfico</h1>
        <p className="text-xs text-slate-400 mt-1 uppercase">Historial visual de diagnósticos, evolución y procedimientos clínicos</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario */}
        <div className="bg-[#0d1527] border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-2">Registrar Nueva Imagen</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">URL de la Imagen *</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/uploads/ejemplo.jpg"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Descripción / Detalle</label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="EJ: ANTES - PIEZA 16"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white uppercase"
              />
            </div>

            <button
              type="submit"
              disabled={!url.trim()}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white font-semibold py-2.5 rounded-lg text-xs uppercase shadow transition-colors cursor-pointer"
            >
              Registrar Fotografía
            </button>
          </form>
        </div>

        {/* Listado de Fotos */}
        <div className="lg:col-span-2 bg-[#0d1527] border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-2">Registros Fotográficos ({fotos.length})</h2>

          {fotos.length === 0 ? (
            <p className="text-xs text-slate-500 uppercase">No hay fotografías registradas en el sistema.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-125 overflow-y-auto pr-1">
              {fotos.map((f) => (
                <div key={f.id} className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-2">
                  <div className="h-40 bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={f.descripcion || 'Foto clínica'} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-purple-400 uppercase truncate">{f.descripcion || 'SIN DESCRIPCIÓN'}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{new Date(f.createdAt).toLocaleDateString()}</span>
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