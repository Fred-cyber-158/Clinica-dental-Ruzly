'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Campo, { claseInput } from '@/components/Campo';
import { useToast } from '@/components/Toast';
import { useSesion } from '@/lib/sesion-cliente';
import { fechaBolivia } from '@/lib/formato';
import { ahoraBolivia, HORARIOS, validarCita, type CampoCita } from '@/lib/validar-cita';

interface Paciente {
  id: string;
  nombre: string;
  ci?: string | null;
  activo: boolean;
}

interface Cita {
  id: string;
  fecha: string;
  hora: string;
  motivo: string | null;
  estado: string;
  pacienteId: string;
  paciente?: Paciente | null;
}

const FORM_VACIO = { pacienteId: '', fecha: '', hora: '', motivo: '', estado: 'PENDIENTE' };

const OPCIONES_POR_ROL: Record<string, string[]> = {
  ADMINISTRADOR: ['PENDIENTE', 'CONFIRMADA', 'ATENDIDA', 'CANCELADA'],
  ODONTOLOGO: ['PENDIENTE', 'CONFIRMADA', 'ATENDIDA', 'CANCELADA'],
  RECEPCIONISTA: ['PENDIENTE', 'CONFIRMADA', 'CANCELADA'],
  PACIENTE: [],
};

const COLOR_ESTADO: Record<string, string> = {
  PENDIENTE: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  CONFIRMADA: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  ATENDIDA: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  CANCELADA: 'bg-red-500/10 text-red-400 border-red-500/30',
};

export default function CitasPage() {
  const usuario = useSesion();
  const notificar = useToast();
  const router = useRouter();
  
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(FORM_VACIO);
  const [tocados, setTocados] = useState<Partial<Record<CampoCita, boolean>>>({});
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [periodo, setPeriodo] = useState<'TODAS' | 'HOY' | 'PROXIMAS'>('TODAS');
  const [ocupadas, setOcupadas] = useState<{ fecha: string; horas: string[] }>({ fecha: '', horas: [] });
  const [version, setVersion] = useState(0);
  const [cambio, setCambio] = useState<{ id: string; nuevo: string; nombre: string } | null>(null);
  const [fechaEmision, setFechaEmision] = useState('');

  const rol = usuario?.rol ?? 'PACIENTE';
  const esPaciente = rol === 'PACIENTE';
  const opcionesEstado = OPCIONES_POR_ROL[rol] ?? [];
  const hoy = ahoraBolivia();

  const sesionVencida = useCallback(() => {
    localStorage.removeItem('usuario_activo');
    window.dispatchEvent(new Event('storage'));
    router.push('/login');
  }, [router]);

  const cargar = useCallback(async () => {
    try {
      const [rp, rc] = await Promise.all([fetch('/api/pacientes'), fetch('/api/citas')]);
      if (rp.status === 401 || rc.status === 401) {
        sesionVencida();
        return;
      }
      const dp = await rp.json().catch(() => null);
      const dc = await rc.json().catch(() => null);
      if (!rp.ok) throw new Error(dp?.error ?? 'No se pudo cargar los pacientes.');
      if (!rc.ok) throw new Error(dc?.error ?? 'No se pudo cargar las citas.');
      
      setPacientes(Array.isArray(dp) ? dp.filter((p: Paciente) => p.activo) : []);
      setCitas(Array.isArray(dc) ? dc : []);
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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.fecha)) return;
    let vigente = true;
    
    fetch(`/api/citas/ocupadas?fecha=${form.fecha}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (vigente && Array.isArray(d)) setOcupadas({ fecha: form.fecha, horas: d });
      })
      .catch(() => {});
      
    return () => {
      vigente = false;
    };
  }, [form.fecha, version]);

  const horasOcupadas = ocupadas.fecha === form.fecha ? ocupadas.horas : [];
  const pacienteIdEfectivo = esPaciente ? (pacientes[0]?.id ?? '') : form.pacienteId;
  const datosForm = { ...form, pacienteId: pacienteIdEfectivo };
  
  const validacion = useMemo(
    () => validarCita(datosForm, hoy),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, pacienteIdEfectivo, hoy.fecha, hoy.hora]
  );
  
  const errores = validacion.ok ? {} : validacion.errores;
  const ver = (c: CampoCita) => (tocados[c] || intento ? errores[c] : undefined);
  
  const cambiar = (campo: CampoCita, valor: string) =>
    setForm((p) => ({ ...p, [campo]: valor, ...(campo === 'fecha' ? { hora: '' } : {}) }));
    
  const tocar = (campo: CampoCita) => setTocados((p) => ({ ...p, [campo]: true }));

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntento(true);
    
    if (esPaciente && !pacienteIdEfectivo) {
      notificar('error', 'Su usuario no está vinculado a un paciente. Consulte en recepción.');
      return;
    }
    if (!validacion.ok) {
      notificar('error', 'Revise los campos marcados en rojo antes de agendar.');
      return;
    }
    
    setGuardando(true);
    try {
      const res = await fetch('/api/citas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validacion.data),
      });
      
      if (res.status === 401) {
        sesionVencida();
        return;
      }
      
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setVersion((v) => v + 1);
        throw new Error(data?.error ?? 'No se pudo registrar la cita.');
      }
      
      notificar('exito', `Cita agendada para el ${fechaBolivia(validacion.data.fecha)} a las ${validacion.data.hora}.`);
      setForm(FORM_VACIO);
      setTocados({});
      setIntento(false);
      setVersion((v) => v + 1);
      await cargar();
    } catch (err) {
      notificar('error', err instanceof Error ? err.message : 'Error de conexión con el servidor.');
    } finally {
      setGuardando(false);
    }
  };

  const aplicarEstado = async (id: string, nuevo: string) => {
    try {
      const res = await fetch(`/api/citas/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevo }),
      });
      
      if (res.status === 401) {
        sesionVencida();
        return;
      }
      
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo actualizar la cita.');
      
      setCitas((prev) => prev.map((c) => (c.id === id ? { ...c, estado: nuevo } : c)));
      setVersion((v) => v + 1);
      notificar('exito', `La cita pasó a estado ${nuevo}.`);
    } catch (err) {
      notificar('error', err instanceof Error ? err.message : 'Error de conexión con el servidor.');
    }
  };

  const pedirCambio = (c: Cita, nuevo: string) => {
    if (nuevo === c.estado) return;
    if (nuevo === 'CANCELADA' || nuevo === 'ATENDIDA') {
      setCambio({ id: c.id, nuevo, nombre: c.paciente?.nombre ?? 'el paciente' });
    } else {
      void aplicarEstado(c.id, nuevo);
    }
  };

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return citas
      .filter((c) => {
        const coincide =
          !q ||
          (c.paciente?.nombre ?? '').toLowerCase().includes(q) ||
          (c.motivo ?? '').toLowerCase().includes(q) ||
          c.fecha.includes(q);
        const estadoOk = filtroEstado === 'TODOS' || c.estado === filtroEstado;
        const periodoOk =
          periodo === 'TODAS' || (periodo === 'HOY' ? c.fecha === hoy.fecha : c.fecha >= hoy.fecha);
        return coincide && estadoOk && periodoOk;
      })
      .sort((a, b) => {
        const ka = `${a.fecha} ${a.hora}`;
        const kb = `${b.fecha} ${b.hora}`;
        return periodo === 'TODAS' ? kb.localeCompare(ka) : ka.localeCompare(kb);
      });
  }, [citas, busqueda, filtroEstado, periodo, hoy.fecha]);

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium animate-pulse">Cargando agenda de citas...</p>
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
        <p className="text-xs text-gray-700 font-semibold uppercase mt-1">Agenda Oficial de Citas Médicas</p>
        <p className="text-[10px] text-gray-600 font-mono mt-0.5">Cochabamba, Bolivia • Gestión Clínica Integral</p>
        
        <div className="w-full flex justify-between mt-4 text-[10px] font-mono text-black border-t border-gray-300 pt-2">
          <p><strong>EMISIÓN:</strong> {fechaEmision || 'No especificada'}</p>
          <p><strong>RESPONSABLE:</strong> {usuario ? `${usuario.nombre} (${rol})` : 'Sistema'}</p>
        </div>
      </div>

      {/* Encabezado visible en pantalla */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4 print:hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">Agenda de Citas</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Horario de atención: lunes a sábado, {HORARIOS[0]} a 20:00, cada 30 minutos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const a = new Date();
            setFechaEmision(`${a.toLocaleDateString('es-BO')} a las ${a.toLocaleTimeString('es-BO')}`);
            setTimeout(() => window.print(), 100);
          }}
          className="bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-blue-400 border border-blue-500/30 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all duration-200 cursor-pointer shrink-0 flex items-center gap-2"
        >
          <span>📄</span> Reporte PDF
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 print:block">
        {/* Formulario de Agendamiento */}
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl h-fit print:hidden backdrop-blur-sm">
          <h2 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-3 tracking-wider">
            {esPaciente ? 'Solicitar mi cita' : 'Agendar nueva cita'}
          </h2>
          <form onSubmit={registrar} noValidate className="space-y-4">
            {esPaciente ? (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-xs text-blue-300 font-medium">
                  Paciente: <strong className="text-white uppercase">{pacientes[0]?.nombre ?? 'Sin paciente vinculado'}</strong>
                </p>
              </div>
            ) : (
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
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Fecha" requerido error={ver('fecha')}>
                <input
                  type="date"
                  value={form.fecha}
                  min={hoy.fecha}
                  onChange={(e) => cambiar('fecha', e.target.value)}
                  onBlur={() => tocar('fecha')}
                  className={claseInput(ver('fecha'))}
                  aria-invalid={!!ver('fecha')}
                />
              </Campo>
              <Campo etiqueta="Hora" requerido error={ver('hora')}>
                <select
                  value={form.hora}
                  disabled={!form.fecha || !!errores.fecha}
                  onChange={(e) => cambiar('hora', e.target.value)}
                  onBlur={() => tocar('hora')}
                  className={`${claseInput(ver('hora'))} disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
                  aria-invalid={!!ver('hora')}
                >
                  <option value="">{form.fecha ? '-- SELECCIONAR HORA --' : 'ELIJA FECHA'}</option>
                  {HORARIOS.map((h) => {
                    const ocupada = horasOcupadas.includes(h);
                    const pasada = form.fecha === hoy.fecha && h <= hoy.hora;
                    const deshabilitado = ocupada || pasada;
                    
                    return (
                      <option key={h} value={h} disabled={deshabilitado}>
                        {h} {ocupada ? '🔒 (Ocupada)' : pasada ? '⏳ (Pasó)' : ''}
                      </option>
                    );
                  })}
                </select>
              </Campo>
            </div>
            
            <Campo etiqueta="Motivo de la consulta" error={ver('motivo')}>
              <input
                type="text"
                value={form.motivo}
                maxLength={150}
                placeholder="Ej: Limpieza dental, dolor de muela..."
                onChange={(e) => {
                  const limpio = e.target.value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .,0-9]/g, '').toUpperCase();
                  cambiar('motivo', limpio);
                }}
                onBlur={() => tocar('motivo')}
                className={claseInput(ver('motivo'))}
                aria-invalid={!!ver('motivo')}
              />
            </Campo>
            
            {!esPaciente && (
              <Campo etiqueta="Estado inicial" error={ver('estado')}>
                <select
                  value={form.estado}
                  onChange={(e) => cambiar('estado', e.target.value)}
                  className={claseInput(ver('estado'))}
                  aria-invalid={!!ver('estado')}
                >
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="CONFIRMADA">CONFIRMADA</option>
                </select>
              </Campo>
            )}
            
            <button
              type="submit"
              disabled={guardando}
              className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-blue-900/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              {guardando ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Agendando...
                </>
              ) : (
                '✅ Agendar Cita'
              )}
            </button>
          </form>
        </div>

        {/* Listado de Citas */}
        <div className="xl:col-span-2 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl print:bg-white print:border-none print:p-0 print:shadow-none backdrop-blur-sm">
          <div className="space-y-3 border-b border-slate-800 pb-4 print:hidden">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Citas Programadas ({filtradas.length})
            </h2>
            <div className="flex flex-col lg:flex-row gap-3">
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="🔍 Buscar por paciente, motivo o fecha..."
                aria-label="Buscar cita por paciente, motivo o fecha"
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none rounded-xl px-4 py-2.5 text-xs text-white transition-all"
              />
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                aria-label="Filtrar citas por estado"
                className="bg-slate-950 border border-slate-800 focus:border-blue-500 outline-none rounded-xl px-4 py-2.5 text-xs text-white cursor-pointer"
              >
                <option value="TODOS">TODOS LOS ESTADOS</option>
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="CONFIRMADA">CONFIRMADA</option>
                <option value="ATENDIDA">ATENDIDA</option>
                <option value="CANCELADA">CANCELADA</option>
              </select>
            </div>
            <div className="flex gap-2">
              {(['TODAS', 'HOY', 'PROXIMAS'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodo(p)}
                  className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase cursor-pointer border transition-all duration-200 ${
                    periodo === p
                      ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {p === 'PROXIMAS' ? 'Próximas' : p === 'HOY' ? 'Hoy' : 'Todas'}
                </button>
              ))}
            </div>
          </div>

          {/* ✅ TABLA DE IMPRESIÓN ELEGANTE Y PROFESIONAL */}
          <div className="hidden print:block">
            <table className="w-full text-left text-[11px] text-black border-collapse font-sans">
              <thead>
                <tr className="border-b-2 border-black bg-gray-100">
                  <th className="py-3 px-3 uppercase font-bold tracking-wide">Fecha</th>
                  <th className="py-3 px-3 uppercase font-bold tracking-wide">Hora</th>
                  <th className="py-3 px-3 uppercase font-bold tracking-wide">Paciente</th>
                  <th className="py-3 px-3 uppercase font-bold tracking-wide">Motivo de Consulta</th>
                  <th className="py-3 px-3 uppercase font-bold tracking-wide text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((c) => (
                  <tr key={c.id} className="border-b border-gray-300 break-inside-avoid">
                    <td className="py-2.5 px-3 font-mono">{fechaBolivia(c.fecha)}</td>
                    <td className="py-2.5 px-3 font-mono">{c.hora}</td>
                    <td className="py-2.5 px-3 font-bold uppercase text-black">{c.paciente?.nombre ?? 'PACIENTE GENERAL'}</td>
                    <td className="py-2.5 px-3 uppercase">{c.motivo ?? 'Consulta general'}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-right">{c.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Lista para pantalla */}
          {filtradas.length === 0 ? (
            <div className="text-center py-12 print:hidden animate-in fade-in zoom-in-95 duration-300">
              <p className="text-4xl mb-3"></p>
              <p className="text-xs text-slate-500 uppercase font-semibold">No se encontraron citas con ese criterio.</p>
            </div>
          ) : (
            <div className="print:hidden space-y-3 max-h-screen overflow-y-auto pr-2 custom-scrollbar">
              {filtradas.map((c) => {
                const finalizada = c.estado === 'ATENDIDA' || c.estado === 'CANCELADA';
                const puedeCambiar =
                  (rol === 'ADMINISTRADOR' || !finalizada) &&
                  (esPaciente ? !finalizada : opcionesEstado.length > 0);
                  
                return (
                  <div
                    key={c.id}
                    className="bg-slate-950/50 border border-slate-800 hover:border-slate-700 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all duration-200 group animate-in fade-in slide-in-from-bottom-2"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <p className="font-bold text-white uppercase text-sm truncate">
                        {c.paciente?.nombre ?? 'PACIENTE'}
                      </p>
                      <p className="text-xs text-slate-400 font-medium flex items-center gap-2">
                        <span>📅 {fechaBolivia(c.fecha)}</span>
                        <span>•</span>
                        <span>🕒 {c.hora}</span>
                        {c.fecha === hoy.fecha && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase">
                            Hoy
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-500 uppercase truncate">
                        {c.motivo ?? 'Consulta general'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      <span
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border shrink-0 ${COLOR_ESTADO[c.estado] ?? ''}`}
                      >
                        {c.estado}
                      </span>
                      {puedeCambiar &&
                        (esPaciente ? (
                          <button
                            type="button"
                            onClick={() => pedirCambio(c, 'CANCELADA')}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 active:scale-[0.98] text-red-400 border border-red-500/30 font-bold rounded-lg text-[11px] uppercase cursor-pointer transition-all duration-200"
                          >
                            Cancelar
                          </button>
                        ) : (
                          <select
                            value={c.estado}
                            onChange={(e) => pedirCambio(c, e.target.value)}
                            aria-label="Cambiar estado de la cita"
                            className="bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-1.5 text-[11px] text-white cursor-pointer transition-colors"
                          >
                            {opcionesEstado.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        ))}
                    </div>
                  </div>
                );
              })}
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

      {/* Modal de confirmación */}
      {cambio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 print:hidden animate-in fade-in duration-200">
          <div 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="modal-title"
            className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <h3 id="modal-title" className="text-base font-bold text-white flex items-center gap-2">
              <span className="text-amber-400">⚠️</span> 
              {cambio.nuevo === 'CANCELADA' ? '¿Cancelar la cita?' : '¿Marcar la cita como atendida?'}
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Cita de <strong className="text-white uppercase">{cambio.nombre}</strong>.{' '}
              {cambio.nuevo === 'CANCELADA'
                ? 'El horario quedará libre inmediatamente para otros pacientes.'
                : 'Después de esta acción, solo un administrador podrá modificar este registro.'}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCambio(null)}
                className="px-4 py-2 text-xs font-bold uppercase rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-[0.98] cursor-pointer transition-all"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={() => {
                  const { id, nuevo } = cambio;
                  setCambio(null);
                  void aplicarEstado(id, nuevo);
                }}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-lg text-white active:scale-[0.98] cursor-pointer transition-all shadow-lg ${
                  cambio.nuevo === 'CANCELADA' 
                    ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' 
                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}