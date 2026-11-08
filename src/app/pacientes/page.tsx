'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/Toast';
import { useSesion } from '@/lib/sesion-cliente';
import { validarPaciente, type CampoPaciente } from '@/lib/validar-paciente';

interface Paciente {
  id: string;
  nombre: string;
  edad: number | null;
  telefono: string | null;
  email: string | null;
  ci: string | null;
  alergias: string | null;
  activo: boolean;
  createdAt: string;
}

const FORM_VACIO = { nombre: '', ci: '', edad: '', telefono: '', email: '', alergias: '' };

const claseInput = (error?: string) =>
  `w-full bg-slate-950/50 border rounded-lg p-2.5 text-xs text-white outline-none transition-all duration-200 placeholder:text-slate-600 ${
    error 
      ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 bg-red-500/5' 
      : 'border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 hover:border-slate-700'
  }`;

function Campo({
  etiqueta,
  requerido,
  error,
  children,
  id,
}: {
  etiqueta: string;
  requerido?: boolean;
  error?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block cursor-pointer">
        <span className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">
          {etiqueta}
          {requerido && <span className="text-red-400 ml-0.5" aria-hidden="true">*</span>}
        </span>
        {children}
      </label>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[11px] text-red-400 font-semibold flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <span aria-hidden="true">⚠️</span> {error}
        </p>
      )}
    </div>
  );
}

export default function PacientesPage() {
  const usuario = useSesion();
  const notificar = useToast();
  const router = useRouter();
  
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(FORM_VACIO);
  const [tocados, setTocados] = useState<Partial<Record<CampoPaciente, boolean>>>({});
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [bajaDe, setBajaDe] = useState<{ id: string; nombre: string } | null>(null);
  const [fechaEmision, setFechaEmision] = useState('');

  const rol = usuario?.rol ?? 'PACIENTE';
  const puedeEditar = rol !== 'PACIENTE';

  const sesionVencida = useCallback(() => {
    localStorage.removeItem('usuario_activo');
    window.dispatchEvent(new Event('storage'));
    router.push('/login');
  }, [router]);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/pacientes');
      if (res.status === 401) {
        sesionVencida();
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo cargar la lista de pacientes.');
      setPacientes(Array.isArray(data) ? data : []);
    } catch (e) {
      notificar('error', e instanceof Error ? e.message : 'Error de conexión con el servidor.');
    } finally {
      setCargando(false);
    }
  }, [notificar, sesionVencida]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const validacion = useMemo(() => validarPaciente(form), [form]);
  const errores = validacion.ok ? {} : validacion.errores;
  const ver = (c: CampoPaciente) => (tocados[c] || intento ? errores[c] : undefined);
  const cambiar = (campo: CampoPaciente, valor: string) => setForm((p) => ({ ...p, [campo]: valor }));
  const tocar = (campo: CampoPaciente) => setTocados((p) => ({ ...p, [campo]: true }));

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntento(true);
    
    if (!puedeEditar) {
      notificar('error', 'No tiene permisos para registrar pacientes.');
      return;
    }
    if (!validacion.ok) {
      notificar('error', 'Revise los campos marcados en rojo antes de registrar.');
      return;
    }
    
    setGuardando(true);
    try {
      const res = await fetch('/api/pacientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validacion.data),
      });
      
      if (res.status === 401) {
        sesionVencida();
        return;
      }
      
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo registrar el paciente.');
      
      notificar('exito', `Paciente ${validacion.data.nombre} registrado correctamente.`);
      setForm(FORM_VACIO);
      setTocados({});
      setIntento(false);
      await cargar();
    } catch (err) {
      notificar('error', err instanceof Error ? err.message : 'Error de conexión con el servidor.');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarBaja = async () => {
    if (!bajaDe) return;
    const { id, nombre } = bajaDe;
    setBajaDe(null);
    
    try {
      const res = await fetch(`/api/pacientes/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: false }),
      });
      
      if (res.status === 401) {
        sesionVencida();
        return;
      }
      
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo dar de baja al paciente.');
      
      setPacientes((p) => p.filter((x) => x.id !== id));
      notificar('exito', `${nombre} fue dado de baja correctamente.`);
    } catch (err) {
      notificar('error', err instanceof Error ? err.message : 'Error de conexión con el servidor.');
    }
  };

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return pacientes.filter(
      (p) => p.activo && (!q || p.nombre.toLowerCase().includes(q) || (p.ci ?? '').toLowerCase().includes(q))
    );
  }, [pacientes, busqueda]);

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium animate-pulse">Cargando módulo de pacientes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 print:p-0 print:max-w-none print:px-0">
      
      {/* ✅ MEMBRETE PROFESIONAL DE IMPRESIÓN CON LOGO */}
      <div className="hidden print:flex flex-col items-center border-b-2 border-black pb-4 mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src="/logo.png" 
          alt="Logo Clínica Dental Ruzly" 
          className="h-16 w-auto mb-3 object-contain"
          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
        />
        <h1 className="text-2xl font-black text-black uppercase tracking-widest">CLÍNICA DENTAL RUZLY</h1>
        <p className="text-xs text-gray-700 font-semibold uppercase mt-1">Reporte Oficial de Pacientes Registrados</p>
        <p className="text-[10px] text-gray-600 font-mono mt-0.5">Cochabamba, Bolivia • Gestión Clínica Integral</p>
        
        <div className="w-full flex justify-between mt-4 text-[10px] font-mono text-black border-t border-gray-300 pt-2">
          <p><strong>EMISIÓN:</strong> {fechaEmision || 'No especificada'}</p>
          <p><strong>RESPONSABLE:</strong> {usuario ? `${usuario.nombre} (${rol})` : 'Sistema'}</p>
        </div>
      </div>

      {/* Encabezado visible en pantalla */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4 print:hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">Gestión de Pacientes</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Registro de expedientes, búsqueda en tiempo real, baja lógica y reportes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const ahora = new Date();
            setFechaEmision(`${ahora.toLocaleDateString('es-BO')} a las ${ahora.toLocaleTimeString('es-BO')}`);
            setTimeout(() => window.print(), 100);
          }}
          className="bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-blue-400 border border-blue-500/30 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all duration-200 cursor-pointer shrink-0 flex items-center gap-2"
        >
          <span>📄</span> Reporte PDF
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 print:block">
        {/* Formulario de Registro */}
        {puedeEditar && (
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl h-fit print:hidden backdrop-blur-sm">
            <h2 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-3 tracking-wider">Registrar Nuevo Paciente</h2>
            <form onSubmit={registrar} noValidate className="space-y-4">
              <Campo etiqueta="Nombre completo" requerido error={ver('nombre')} id="nombre">
                <input
                  id="nombre"
                  type="text"
                  value={form.nombre}
                  maxLength={80}
                  autoComplete="off"
                  placeholder="Ej: Carlos Pérez"
                  onChange={(e) => {
                    const limpio = e.target.value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .]/g, '').toUpperCase();
                    cambiar('nombre', limpio);
                  }}
                  onBlur={() => tocar('nombre')}
                  aria-invalid={!!ver('nombre')}
                  aria-describedby={ver('nombre') ? 'nombre-error' : undefined}
                  className={`${claseInput(ver('nombre'))} uppercase`}
                />
              </Campo>
              
              <div className="grid grid-cols-2 gap-3">
                <Campo etiqueta="C.I." requerido error={ver('ci')} id="ci">
                  <input
                    id="ci"
                    type="text"
                    value={form.ci}
                    maxLength={13}
                    autoComplete="off"
                    placeholder="8392104"
                    onChange={(e) => {
                      const limpio = e.target.value.replace(/[^0-9A-Za-z\-]/g, '').toUpperCase();
                      cambiar('ci', limpio);
                    }}
                    onBlur={() => tocar('ci')}
                    aria-invalid={!!ver('ci')}
                    aria-describedby={ver('ci') ? 'ci-error' : undefined}
                    className={claseInput(ver('ci'))}
                  />
                </Campo>
                <Campo etiqueta="Edad" error={ver('edad')} id="edad">
                  <input
                    id="edad"
                    type="text"
                    inputMode="numeric"
                    value={form.edad}
                    maxLength={3}
                    placeholder="35"
                    onChange={(e) => {
                      const limpio = e.target.value.replace(/\D/g, '');
                      cambiar('edad', limpio);
                    }}
                    onBlur={() => tocar('edad')}
                    aria-invalid={!!ver('edad')}
                    aria-describedby={ver('edad') ? 'edad-error' : undefined}
                    className={claseInput(ver('edad'))}
                  />
                </Campo>
              </div>
              
              <Campo etiqueta="Teléfono" error={ver('telefono')} id="telefono">
                <input
                  id="telefono"
                  type="tel"
                  value={form.telefono}
                  maxLength={16}
                  placeholder="Ej: 70012345"
                  onChange={(e) => {
                    const limpio = e.target.value.replace(/[^0-9+ ]/g, '');
                    cambiar('telefono', limpio);
                  }}
                  onBlur={() => tocar('telefono')}
                  aria-invalid={!!ver('telefono')}
                  aria-describedby={ver('telefono') ? 'telefono-error' : undefined}
                  className={claseInput(ver('telefono'))}
                />
              </Campo>
              
              <Campo etiqueta="Correo electrónico" error={ver('email')} id="email">
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  maxLength={100}
                  placeholder="correo@ejemplo.com"
                  onChange={(e) => {
                    const limpio = e.target.value.replace(/\s/g, '').toLowerCase();
                    cambiar('email', limpio);
                  }}
                  onBlur={() => tocar('email')}
                  aria-invalid={!!ver('email')}
                  aria-describedby={ver('email') ? 'email-error' : undefined}
                  className={claseInput(ver('email'))}
                />
              </Campo>
              
              <Campo etiqueta="Alergias o antecedentes" error={ver('alergias')} id="alergias">
                <textarea
                  id="alergias"
                  value={form.alergias}
                  maxLength={200}
                  rows={2}
                  placeholder="Ej: Alérgico a la penicilina"
                  onChange={(e) => {
                    const limpio = e.target.value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .,()\-0-9]/g, '').toUpperCase();
                    cambiar('alergias', limpio);
                  }}
                  onBlur={() => tocar('alergias')}
                  aria-invalid={!!ver('alergias')}
                  aria-describedby={ver('alergias') ? 'alergias-error' : undefined}
                  className={`${claseInput(ver('alergias'))} uppercase resize-none`}
                />
              </Campo>
              
              <button
                type="submit"
                disabled={guardando}
                className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-blue-900/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {guardando ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Registrando...
                  </>
                ) : (
                  <>
                    <span>✅</span> Registrar Paciente
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Listado de Pacientes */}
        <div className={`${puedeEditar ? 'xl:col-span-2' : 'xl:col-span-3'} bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl print:bg-white print:border-none print:p-0 print:shadow-none backdrop-blur-sm`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3 print:hidden">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Pacientes registrados ({filtrados.length})</h2>
            <div className="relative w-full sm:w-72">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs" aria-hidden="true">🔍</span>
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o C.I."
                aria-label="Buscar paciente por nombre o C.I."
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none rounded-lg pl-8 pr-3 py-2.5 text-xs text-white transition-all"
              />
            </div>
          </div>
          
          {/* ✅ TABLA DE IMPRESIÓN ELEGANTE Y PROFESIONAL */}
          <div className="hidden print:block">
            <table className="w-full text-left text-[11px] text-black border-collapse font-sans">
              <thead>
                <tr className="border-b-2 border-black bg-gray-100">
                  <th className="py-3 px-3 uppercase font-bold tracking-wide">Nombre Completo</th>
                  <th className="py-3 px-3 uppercase font-bold tracking-wide">C.I.</th>
                  <th className="py-3 px-3 uppercase font-bold tracking-wide text-center">Edad</th>
                  <th className="py-3 px-3 uppercase font-bold tracking-wide">Teléfono</th>
                  <th className="py-3 px-3 uppercase font-bold tracking-wide">Alergias / Antecedentes</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => (
                  <tr key={p.id} className="border-b border-gray-300 break-inside-avoid">
                    <td className="py-2.5 px-3 font-bold uppercase text-black">{p.nombre}</td>
                    <td className="py-2.5 px-3 font-mono">{p.ci ?? 'S/C.I.'}</td>
                    <td className="py-2.5 px-3 font-mono text-center">{p.edad !== null ? `${p.edad} AÑOS` : '-'}</td>
                    <td className="py-2.5 px-3 font-mono">{p.telefono ?? '-'}</td>
                    <td className="py-2.5 px-3 uppercase text-red-700 font-semibold">{p.alergias ?? 'NINGUNA'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Lista para pantalla */}
          {filtrados.length === 0 ? (
            <div className="text-center py-12 print:hidden animate-in fade-in zoom-in-95 duration-300">
              <p className="text-4xl mb-3 opacity-50">📋</p>
              <p className="text-xs text-slate-500 uppercase font-semibold">
                No se encontraron pacientes activos con ese criterio.
              </p>
            </div>
          ) : (
            <div className="print:hidden space-y-3 max-h-screen overflow-y-auto pr-2 custom-scrollbar">
              {filtrados.map((p) => (
                <div
                  key={p.id}
                  className="bg-slate-950/50 border border-slate-800 hover:border-slate-700 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all duration-200 group"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <p className="font-bold text-white uppercase text-sm truncate">{p.nombre}</p>
                    <p className="text-xs text-slate-400 font-medium flex flex-wrap gap-x-2 gap-y-1">
                      {p.ci ? <span>C.I.: {p.ci}</span> : <span>S/C.I.</span>}
                      {p.edad !== null && <span>• {p.edad} AÑOS</span>}
                      {p.telefono && <span>• 📞 {p.telefono}</span>}
                    </p>
                    {p.alergias && (
                      <p className="text-[11px] text-red-400 font-semibold uppercase flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-md px-2 py-1 w-fit">
                        <span aria-hidden="true">🚨</span> Alergia: {p.alergias}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Link
                      href={`/pacientes/${p.id}`}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold rounded-lg text-[11px] uppercase transition-all duration-200 text-center flex-1 sm:flex-none shadow-lg shadow-blue-900/10"
                    >
                      Expediente
                    </Link>
                    {puedeEditar && (
                      <button
                        type="button"
                        onClick={() => setBajaDe({ id: p.id, nombre: p.nombre })}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 active:scale-[0.98] text-red-400 border border-red-500/30 font-bold rounded-lg text-[11px] uppercase transition-all duration-200 cursor-pointer text-center flex-1 sm:flex-none"
                      >
                        Dar de baja
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ✅ PIE DE PÁGINA DE IMPRESIÓN OFICIAL */}
      <div className="hidden print:flex justify-between items-end pt-16 text-[11px] text-black font-semibold uppercase">
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

      {/* Modal de confirmación de baja */}
      {bajaDe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 print:hidden animate-in fade-in duration-200">
          <div 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="modal-title"
            aria-describedby="modal-desc"
            className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <h3 id="modal-title" className="text-base font-bold text-white flex items-center gap-2">
              <span className="text-amber-400" aria-hidden="true">️</span> ¿Dar de baja al paciente?
            </h3>
            <p id="modal-desc" className="text-sm text-slate-300 leading-relaxed">
              <strong className="text-white uppercase">{bajaDe.nombre}</strong> dejará de aparecer en la lista activa. 
              Su historial clínico se conserva de forma segura en la base de datos.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBajaDe(null)}
                className="px-4 py-2 text-xs font-bold uppercase rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-[0.98] cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarBaja}
                className="px-4 py-2 text-xs font-bold uppercase rounded-lg bg-red-600 text-white hover:bg-red-500 active:scale-[0.98] cursor-pointer transition-all shadow-lg shadow-red-900/20"
              >
                Sí, dar de baja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}