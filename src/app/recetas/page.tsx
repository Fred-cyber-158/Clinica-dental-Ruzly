'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Campo, { claseInput } from '@/components/Campo';
import { useToast } from '@/components/Toast';
import { detectarConflictoAlergia } from '@/lib/alergias';
import { fechaHoraBolivia } from '@/lib/formato';
import { useSesion } from '@/lib/sesion-cliente';
import { validarReceta, type CampoReceta } from '@/lib/validar-receta';

interface Paciente {
  id: string;
  nombre: string;
  ci?: string | null;
  alergias?: string | null;
  activo: boolean;
}

interface Receta {
  id: string;
  pacienteNombre: string | null;
  medicamento: string;
  indicaciones: string;
  emitidaPor?: string | null;
  createdAt: string;
  paciente?: Paciente | null;
}

const FORM_VACIO = { pacienteId: '', medicamento: '', indicaciones: '' };

const SUGERIDOS = [
  'AMOXICILINA 500 MG',
  'AMOXICILINA + ÁCIDO CLAVULÁNICO 875/125 MG',
  'CLINDAMICINA 300 MG',
  'METRONIDAZOL 500 MG',
  'AZITROMICINA 500 MG',
  'IBUPROFENO 400 MG',
  'DICLOFENACO 50 MG',
  'KETOROLACO 10 MG',
  'PARACETAMOL 500 MG',
  'NAPROXENO 550 MG',
  'CLORHEXIDINA 0.12% ENJUAGUE',
];

export default function RecetasPage() {
  const usuario = useSesion();
  const notificar = useToast();
  const router = useRouter();
  
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [cargando, setCargando] = useState(true);
  
  const [form, setForm] = useState(FORM_VACIO);
  const [tocados, setTocados] = useState<Partial<Record<CampoReceta, boolean>>>({});
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmaAlergia, setConfirmaAlergia] = useState(false);
  
  const [busqueda, setBusqueda] = useState('');
  const [imprimirUna, setImprimirUna] = useState<Receta | null>(null);
  const [fechaEmision, setFechaEmision] = useState('');

  const rol = usuario?.rol ?? 'PACIENTE';
  const puedeEmitir = rol === 'ADMINISTRADOR' || rol === 'ODONTOLOGO';
  const sinAcceso = rol === 'RECEPCIONISTA';

  const sesionVencida = useCallback(() => {
    localStorage.removeItem('usuario_activo');
    window.dispatchEvent(new Event('storage'));
    router.push('/login');
  }, [router]);

  const cargar = useCallback(async () => {
    try {
      const [rp, rr] = await Promise.all([fetch('/api/pacientes'), fetch('/api/recetas')]);
      if (rp.status === 401 || rr.status === 401) {
        sesionVencida();
        return;
      }
      const dp = await rp.json().catch(() => null);
      const dr = await rr.json().catch(() => null);
      if (rr.status !== 403 && !rr.ok) throw new Error(dr?.error ?? 'No se pudo cargar las recetas.');
      setPacientes(Array.isArray(dp) ? dp.filter((p: Paciente) => p.activo) : []);
      setRecetas(Array.isArray(dr) ? dr : []);
    } catch (e) {
      notificar('error', e instanceof Error ? e.message : 'Error de conexión con el servidor.');
    } finally {
      setCargando(false);
    }
  }, [notificar, sesionVencida]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    const limpiar = () => setImprimirUna(null);
    window.addEventListener('afterprint', limpiar);
    return () => window.removeEventListener('afterprint', limpiar);
  }, []);

  const pacienteSel = pacientes.find((p) => p.id === form.pacienteId) ?? null;
  const conflicto = pacienteSel ? detectarConflictoAlergia(pacienteSel.alergias, form.medicamento) : null;
  
  const validacion = useMemo(() => validarReceta(form), [form]);
  const errores = validacion.ok ? {} : validacion.errores;
  
  const ver = (c: CampoReceta) => (tocados[c] || intento ? errores[c] : undefined);
  
  const cambiar = (campo: CampoReceta, valor: string) => {
    setForm((p) => ({ ...p, [campo]: valor }));
    if (campo !== 'indicaciones') setConfirmaAlergia(false);
  };
  
  const tocar = (campo: CampoReceta) => setTocados((p) => ({ ...p, [campo]: true }));

  const emitir = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntento(true);
    
    if (!puedeEmitir) {
      notificar('error', 'No tiene permisos para emitir recetas.');
      return;
    }
    if (!validacion.ok) {
      notificar('error', 'Revise los campos marcados en rojo antes de emitir la receta.');
      return;
    }
    if (conflicto && !confirmaAlergia) {
      notificar('error', 'Hay una alerta de alergia. Marque la confirmación si ya la revisó.');
      return;
    }
    
    setGuardando(true);
    try {
      const res = await fetch('/api/recetas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validacion.data, confirmarAlergia: confirmaAlergia }),
      });
      
      if (res.status === 401) {
        sesionVencida();
        return;
      }
      
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo emitir la receta.');
      
      notificar('exito', 'Receta emitida correctamente.');
      setForm(FORM_VACIO);
      setTocados({});
      setIntento(false);
      setConfirmaAlergia(false);
      await cargar();
    } catch (err) {
      notificar('error', err instanceof Error ? err.message : 'Error de conexión con el servidor.');
    } finally {
      setGuardando(false);
    }
  };

  const imprimir = (r: Receta | null) => {
    const a = new Date();
    setFechaEmision(`${a.toLocaleDateString('es-BO')} a las ${a.toLocaleTimeString('es-BO')}`);
    setImprimirUna(r);
    setTimeout(() => window.print(), 100);
  };

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return recetas.filter(
      (r) =>
        !q ||
        (r.paciente?.nombre ?? r.pacienteNombre ?? '').toLowerCase().includes(q) ||
        r.medicamento.toLowerCase().includes(q) ||
        r.indicaciones.toLowerCase().includes(q)
    );
  }, [recetas, busqueda]);

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium animate-pulse">Cargando módulo de recetas...</p>
      </div>
    );
  }

  if (sinAcceso) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 p-4">
        <h1 className="text-2xl font-extrabold text-white uppercase">Acceso Restringido</h1>
        <div className="bg-slate-900/50 border border-amber-500/20 p-8 rounded-2xl text-center space-y-3 backdrop-blur-sm">
          <p className="text-amber-400 text-sm font-bold uppercase flex items-center justify-center gap-2">
            <span>⚠️</span> Las recetas son información clínica reservada al personal médico.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 print:p-0 print:max-w-none print:px-0">
      
      {/* ========================================== */}
      {/* VISTA DE IMPRESIÓN: RECETA INDIVIDUAL CON LOGO */}
      {/* ========================================== */}
      {imprimirUna && (
        <div className="hidden print:block text-black p-8 max-w-2xl mx-auto font-sans">
          <div className="flex flex-col items-center border-b-2 border-black pb-4 mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/logo.png" 
              alt="Logo Clínica Dental Ruzly" 
              className="h-16 w-auto mb-3 object-contain"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
            <h1 className="text-2xl font-black uppercase tracking-widest">CLÍNICA DENTAL RUZLY</h1>
            <p className="text-xs text-gray-700 font-semibold uppercase mt-1">Receta Médica Oficial</p>
            <p className="text-[10px] text-gray-600 font-mono mt-0.5">Cochabamba, Bolivia • Gestión Clínica Integral</p>
            <p className="text-sm font-bold mt-4 uppercase border-t border-gray-300 pt-2 w-full text-center">
              N.º {imprimirUna.id.slice(-8).toUpperCase()}
            </p>
          </div>
          
          <div className="text-sm space-y-2 mb-8">
            <p><strong>Paciente:</strong> <span className="uppercase font-semibold">{imprimirUna.paciente?.nombre ?? imprimirUna.pacienteNombre ?? '-'}</span></p>
            {imprimirUna.paciente?.ci && <p><strong>C.I.:</strong> {imprimirUna.paciente.ci}</p>}
            <p><strong>Fecha:</strong> {fechaHoraBolivia(imprimirUna.createdAt)}</p>
          </div>
          
          <p className="text-3xl font-serif font-bold mb-4">Rp/</p>
          <p className="text-lg font-bold uppercase mb-3">{imprimirUna.medicamento}</p>
          <p className="text-base uppercase whitespace-pre-line border-l-4 border-black pl-4 leading-relaxed">
            {imprimirUna.indicaciones}
          </p>
          
          <div className="flex justify-between items-end pt-24 text-xs font-semibold uppercase text-gray-800">
            <div className="text-center border-t border-black pt-2 w-64">
              {imprimirUna.emitidaPor ? `Dr(a). ${imprimirUna.emitidaPor}` : 'Firma del profesional'}
              <br />
              <span className="text-[9px] font-normal normal-case text-gray-600">Odontólogo</span>
            </div>
            <div className="text-center border-t border-black pt-2 w-48">
              Sello Oficial
              <br />
              <span className="text-[9px] font-normal normal-case text-gray-600">Clínica Dental Ruzly</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* VISTA DE PANTALLA (UI/UX PREMIUM) */}
      {/* ========================================== */}
      <div className={`space-y-6 ${imprimirUna ? 'print:hidden' : ''}`}>
        
        {/* Encabezado para impresión (Reporte general) */}
        <div className="hidden print:flex flex-col items-center border-b-2 border-black pb-4 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/logo.png" 
            alt="Logo Clínica Dental Ruzly" 
            className="h-16 w-auto mb-3 object-contain"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
          <h1 className="text-2xl font-black text-black uppercase tracking-widest">CLÍNICA DENTAL RUZLY</h1>
          <p className="text-xs text-gray-700 font-semibold uppercase mt-1">Reporte de Recetas y Prescripciones</p>
          <p className="text-[10px] text-gray-600 font-mono mt-0.5">Cochabamba, Bolivia • Gestión Clínica Integral</p>
          
          <div className="w-full flex justify-between mt-4 text-[10px] font-mono text-black border-t border-gray-300 pt-2">
            <p><strong>EMISIÓN:</strong> {fechaEmision || 'No especificada'}</p>
            <p><strong>RESPONSABLE:</strong> {usuario ? `${usuario.nombre} (${rol})` : 'Sistema'}</p>
          </div>
        </div>

        {/* Encabezado visible en pantalla */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4 print:hidden">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">Recetas Médicas</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">Prescripciones con control de alergias e impresión individual.</p>
          </div>
          {puedeEmitir && (
            <button
              type="button"
              onClick={() => imprimir(null)}
              className="bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-blue-400 border border-blue-500/30 px-4 py-2.5 rounded-xl text-xs font-bold uppercase cursor-pointer shrink-0 transition-all duration-200 flex items-center gap-2"
            >
              <span>📄</span> Reporte PDF
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 print:block">
          {/* Formulario de Emisión */}
          {puedeEmitir && (
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-5 shadow-xl h-fit print:hidden backdrop-blur-sm">
              <h2 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-3 tracking-wider">Emitir Nueva Receta</h2>
              <form onSubmit={emitir} noValidate className="space-y-4">
                <Campo etiqueta="Paciente" requerido error={ver('pacienteId')}>
                  <select
                    value={form.pacienteId}
                    onChange={(e) => cambiar('pacienteId', e.target.value)}
                    onBlur={() => tocar('pacienteId')}
                    className={`${claseInput(ver('pacienteId'))} uppercase cursor-pointer`}
                    aria-invalid={!!ver('pacienteId')}
                  >
                    <option value="">-- SELECCIONAR PACIENTE --</option>
                    {pacientes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre.toUpperCase()} {p.ci ? `(C.I. ${p.ci})` : ''}
                      </option>
                    ))}
                  </select>
                </Campo>
                
                {pacienteSel?.alergias && (
                  <div className="rounded-xl p-3 border border-amber-500/30 bg-amber-500/10 flex items-start gap-2">
                    <span className="text-lg" aria-hidden="true">⚠️</span>
                    <div>
                      <p className="text-xs font-bold text-amber-300 uppercase">Alergias Registradas</p>
                      <p className="text-xs text-amber-200/80 mt-0.5 uppercase">{pacienteSel.alergias}</p>
                    </div>
                  </div>
                )}
                
                <Campo etiqueta="Medicamento y concentración" requerido error={ver('medicamento')}>
                  <input
                    type="text"
                    list="medicamentos-sugeridos"
                    value={form.medicamento}
                    maxLength={100}
                    placeholder="Ej: IBUPROFENO 400 MG"
                    onChange={(e) => {
                      const limpio = e.target.value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9' .,%()/+-]/g, '').toUpperCase();
                      cambiar('medicamento', limpio);
                    }}
                    onBlur={() => tocar('medicamento')}
                    className={`${claseInput(ver('medicamento'))} uppercase`}
                    aria-invalid={!!ver('medicamento')}
                  />
                  <datalist id="medicamentos-sugeridos">
                    {SUGERIDOS.map((s) => <option key={s} value={s} />)}
                  </datalist>
                </Campo>
                
                {conflicto && (
                  <div className="rounded-xl p-4 border border-red-500/30 bg-red-500/10 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-start gap-3">
                      <span className="text-xl" aria-hidden="true">⛔</span>
                      <div>
                        <p className="text-sm font-bold text-red-300 uppercase">Alerta de Alergia Detectada</p>
                        <p className="text-xs text-red-200/80 mt-1">{conflicto}</p>
                      </div>
                    </div>
                    <label className="flex items-start gap-3 p-3 bg-red-950/30 rounded-lg border border-red-500/20 cursor-pointer group hover:bg-red-950/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={confirmaAlergia}
                        onChange={(e) => setConfirmaAlergia(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-red-400 text-red-600 focus:ring-red-500/50 bg-slate-900"
                      />
                      <span className="text-xs text-red-200 font-medium leading-relaxed group-hover:text-white transition-colors">
                        He revisado el historial del paciente y confirmo que es seguro emitir esta receta a pesar de la alerta.
                      </span>
                    </label>
                  </div>
                )}
                
                <Campo etiqueta="Indicaciones (dosis, frecuencia y duración)" requerido error={ver('indicaciones')}>
                  <textarea
                    value={form.indicaciones}
                    maxLength={500}
                    rows={3}
                    placeholder="Ej: 1 TABLETA CADA 8 HORAS POR 5 DÍAS, DESPUÉS DE LAS COMIDAS"
                    onChange={(e) => {
                      const limpio = e.target.value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9' .,%()/+\-\n]/g, '').toUpperCase();
                      cambiar('indicaciones', limpio);
                    }}
                    onBlur={() => tocar('indicaciones')}
                    className={`${claseInput(ver('indicaciones'))} uppercase resize-none`}
                    aria-invalid={!!ver('indicaciones')}
                  />
                </Campo>
                
                <button
                  type="submit"
                  disabled={guardando}
                  className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-blue-900/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                >
                  {guardando ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Emitiendo...
                    </>
                  ) : (
                    <>
                      <span>✅</span> Emitir Receta
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Listado de Recetas */}
          <div className={`${puedeEmitir ? 'xl:col-span-2' : 'xl:col-span-3'} bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl print:bg-white print:border-none print:p-0 print:shadow-none backdrop-blur-sm`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4 print:hidden">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Recetas emitidas ({filtradas.length})</h2>
              <div className="relative w-full sm:w-72">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs" aria-hidden="true">🔍</span>
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar paciente o medicamento..."
                  aria-label="Buscar receta por paciente o medicamento"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none rounded-lg pl-8 pr-3 py-2.5 text-xs text-white transition-all"
                />
              </div>
            </div>
            
            {/* ✅ TABLA DE IMPRESIÓN ELEGANTE Y PROFESIONAL */}
            <div className="hidden print:block">
              <table className="w-full text-left text-[11px] text-black border-collapse font-sans">
                <thead>
                  <tr className="border-b-2 border-black bg-gray-100">
                    <th className="py-3 px-3 uppercase font-bold tracking-wide">Fecha</th>
                    <th className="py-3 px-3 uppercase font-bold tracking-wide">Paciente</th>
                    <th className="py-3 px-3 uppercase font-bold tracking-wide">Medicamento</th>
                    <th className="py-3 px-3 uppercase font-bold tracking-wide">Indicaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((r) => (
                    <tr key={r.id} className="border-b border-gray-300 break-inside-avoid">
                      <td className="py-2.5 px-3 font-mono">{fechaHoraBolivia(r.createdAt)}</td>
                      <td className="py-2.5 px-3 font-bold uppercase text-black">{r.paciente?.nombre ?? r.pacienteNombre ?? 'PACIENTE GENERAL'}</td>
                      <td className="py-2.5 px-3 uppercase font-semibold">{r.medicamento}</td>
                      <td className="py-2.5 px-3 uppercase whitespace-pre-line">{r.indicaciones}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-end pt-16 text-[11px] text-black font-semibold uppercase mt-8">
                <div className="text-center border-t border-black pt-2 w-60">
                  Firma: {usuario?.nombre ?? '_______________'}
                  <br />
                  <span className="text-[9px] font-normal normal-case text-gray-600">Responsable de la emisión</span>
                </div>
                <div className="text-center border-t border-black pt-2 w-60">
                  Sello Oficial
                  <br />
                  <span className="text-[9px] font-normal normal-case text-gray-600">Clínica Dental Ruzly</span>
                </div>
              </div>
            </div>
            
            {/* Lista para pantalla */}
            {filtradas.length === 0 ? (
              <div className="text-center py-12 print:hidden animate-in fade-in zoom-in-95 duration-300">
                <p className="text-4xl mb-3 opacity-50"></p>
                <p className="text-xs text-slate-500 uppercase font-semibold">No se encontraron recetas con ese criterio.</p>
              </div>
            ) : (
              <div className="print:hidden space-y-3 max-h-screen overflow-y-auto pr-2 custom-scrollbar">
                {filtradas.map((r) => (
                  <div
                    key={r.id}
                    className="bg-slate-950/50 border border-slate-800 hover:border-slate-700 p-4 rounded-xl flex flex-col sm:flex-row justify-between gap-4 transition-all duration-200 group"
                  >
                    <div className="space-y-2 min-w-0 flex-1">
                      <p className="font-bold text-white uppercase text-sm truncate">{r.paciente?.nombre ?? r.pacienteNombre ?? 'PACIENTE'}</p>
                      <p className="text-xs text-blue-400 font-semibold uppercase flex items-center gap-1.5">
                        <span aria-hidden="true">💊</span> {r.medicamento}
                      </p>
                      <p className="text-xs text-slate-300 uppercase leading-relaxed whitespace-pre-line">{r.indicaciones}</p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {fechaHoraBolivia(r.createdAt)}
                        {r.emitidaPor ? ` • Dr(a). ${r.emitidaPor}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => imprimir(r)}
                      className="self-start sm:self-center px-4 py-2 bg-slate-900 hover:bg-blue-600 hover:text-white text-blue-400 border border-blue-500/30 hover:border-blue-500 font-bold rounded-lg text-[11px] uppercase cursor-pointer shrink-0 transition-all duration-200 flex items-center gap-1.5 group-hover:shadow-lg group-hover:shadow-blue-900/20 active:scale-[0.98]"
                    >
                      <span aria-hidden="true">🖨️</span> Imprimir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}