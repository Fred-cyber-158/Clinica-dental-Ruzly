'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Campo, { claseInput } from '@/components/Campo';
import { useToast } from '@/components/Toast';
import { moneda } from '@/lib/formato';
import { useSesion } from '@/lib/sesion-cliente';
import { leerMonto, METODOS_PAGO, redondear } from '@/lib/validar-cobro';
import { validarTratamiento, type CampoTratamiento } from '@/lib/validar-tratamiento';

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
  activo: boolean;
  pacienteId: string | null;
  paciente?: Paciente | null;
}

const FORM_VACIO = { 
  pacienteId: '', 
  nombre: '', 
  descripcion: '', 
  costo: '', 
  anticipo: '', 
  metodo: 'EFECTIVO' 
};

const SUGERIDOS = [
  'LIMPIEZA DENTAL',
  'EXTRACCIÓN SIMPLE',
  'EXTRACCIÓN DE MUELA DEL JUICIO',
  'RESINA',
  'ENDODONCIA',
  'CORONA DENTAL',
  'BLANQUEAMIENTO',
  'ORTODONCIA',
  'PRÓTESIS DENTAL',
  'IMPLANTE DENTAL',
  'SELLANTES',
];

type Filtro = 'ACTIVOS' | 'CON_SALDO' | 'PAGADOS' | 'INACTIVOS' | 'TODOS';

const limpiarTextoClinico = (texto: string) => 
  texto.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .,0-9]/g, '').toUpperCase();

const manejarInputNumerico = (valor: string) => {
  return valor
    .replace(/[^0-9.,]/g, '')
    .replace(/(,.*),/g, '$1')
    .replace(/(\..*)\./g, '$1');
};

export default function TratamientosPage() {
  const usuario = useSesion();
  const notificar = useToast();
  const router = useRouter();
  
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([]);
  const [cargando, setCargando] = useState(true);
  
  const [form, setForm] = useState(FORM_VACIO);
  const [tocados, setTocados] = useState<Partial<Record<CampoTratamiento, boolean>>>({});
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('ACTIVOS');
  const [cambio, setCambio] = useState<Tratamiento | null>(null);
  const [desactivando, setDesactivando] = useState(false);
  const [fechaEmision, setFechaEmision] = useState('');

  const rol = usuario?.rol ?? 'PACIENTE';
  const puedeCrear = rol !== 'PACIENTE';
  const puedeAnticipo = rol === 'ADMINISTRADOR' || rol === 'RECEPCIONISTA';
  const puedeCobrar = puedeAnticipo;
  const puedeDesactivar = rol === 'ADMINISTRADOR' || rol === 'ODONTOLOGO';

  const sesionVencida = useCallback(() => {
    localStorage.removeItem('usuario_activo');
    window.dispatchEvent(new Event('storage'));
    router.push('/login');
  }, [router]);

  const cargar = useCallback(async () => {
    try {
      const [rp, rt] = await Promise.all([fetch('/api/pacientes'), fetch('/api/tratamientos')]);
      if (rp.status === 401 || rt.status === 401) {
        sesionVencida();
        return;
      }
      const dp = await rp.json().catch(() => null);
      const dt = await rt.json().catch(() => null);
      if (!rt.ok) throw new Error(dt?.error ?? 'No se pudo cargar los tratamientos.');
      
      setPacientes(Array.isArray(dp) ? dp.filter((p: Paciente) => p.activo) : []);
      setTratamientos(Array.isArray(dt) ? dt : []);
    } catch (e) {
      notificar('error', e instanceof Error ? e.message : 'Error de conexión con el servidor.');
    } finally {
      setCargando(false);
    }
  }, [notificar, sesionVencida]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const datos = useMemo(() => (puedeAnticipo ? form : { ...form, anticipo: '' }), [form, puedeAnticipo]);
  const validacion = useMemo(() => validarTratamiento(datos), [datos]);
  const errores = validacion.ok ? {} : validacion.errores;
  
  const ver = (c: CampoTratamiento) => (tocados[c] || intento ? errores[c] : undefined);
  const cambiar = (campo: CampoTratamiento, valor: string) => setForm((p) => ({ ...p, [campo]: valor }));
  const tocar = (campo: CampoTratamiento) => setTocados((p) => ({ ...p, [campo]: true }));
  
  const costoNum = leerMonto(form.costo);
  const anticipoNum = leerMonto(form.anticipo) ?? 0;
  const saldoInicial = costoNum !== null ? redondear(costoNum - anticipoNum) : null;

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntento(true);
    
    if (!puedeCrear) {
      notificar('error', 'No tiene permisos para registrar tratamientos.');
      return;
    }
    if (!validacion.ok) {
      notificar('error', 'Revise los campos marcados en rojo antes de registrar el plan.');
      return;
    }
    
    setGuardando(true);
    try {
      const res = await fetch('/api/tratamientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validacion.data),
      });
      
      if (res.status === 401) {
        sesionVencida();
        return;
      }
      
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo registrar el plan de tratamiento.');
      
      notificar(
        'exito',
        validacion.data.anticipo > 0
          ? `Plan registrado. Anticipo de ${moneda(validacion.data.anticipo)} asentado en caja.`
          : 'Plan de tratamiento registrado correctamente.'
      );
      
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

  const cambiarActivo = async (t: Tratamiento, activo: boolean) => {
    setDesactivando(true);
    try {
      const res = await fetch(`/api/tratamientos/${encodeURIComponent(t.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo }),
      });
      
      if (res.status === 401) {
        sesionVencida();
        return;
      }
      
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo actualizar el plan.');
      
      setTratamientos((prev) => prev.map((x) => (x.id === t.id ? { ...x, activo } : x)));
      notificar('exito', activo ? 'Plan reactivado correctamente.' : 'Plan desactivado correctamente.');
      setCambio(null);
    } catch (err) {
      notificar('error', err instanceof Error ? err.message : 'Error de conexión con el servidor.');
    } finally {
      setDesactivando(false);
    }
  };

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return tratamientos.filter((t) => {
      const saldo = redondear(t.costo - t.pagado);
      const coincide = !q || t.nombre.toLowerCase().includes(q) || (t.paciente?.nombre ?? '').toLowerCase().includes(q);
      const okFiltro =
        filtro === 'TODOS' ||
        (filtro === 'ACTIVOS' && t.activo) ||
        (filtro === 'INACTIVOS' && !t.activo) ||
        (filtro === 'CON_SALDO' && t.activo && saldo > 0) ||
        (filtro === 'PAGADOS' && t.activo && saldo <= 0);
      return coincide && okFiltro;
    });
  }, [tratamientos, busqueda, filtro]);

  const resumen = useMemo(() => {
    const act = tratamientos.filter((t) => t.activo);
    const presupuesto = act.reduce((s, t) => s + t.costo, 0);
    const cobrado = act.reduce((s, t) => s + t.pagado, 0);
    return { 
      presupuesto: redondear(presupuesto), 
      cobrado: redondear(cobrado), 
      saldo: redondear(presupuesto - cobrado) 
    };
  }, [tratamientos]);

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium animate-pulse">Cargando planes de tratamiento...</p>
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
        <p className="text-xs text-gray-700 font-semibold uppercase mt-1">Reporte de Planes de Tratamiento y Saldos</p>
        <p className="text-[10px] text-gray-600 font-mono mt-0.5">Cochabamba, Bolivia • Gestión Clínica Integral</p>
        
        <div className="w-full flex justify-between mt-4 text-[10px] font-mono text-black border-t border-gray-300 pt-2">
          <p><strong>EMISIÓN:</strong> {fechaEmision || 'No especificada'}</p>
          <p><strong>RESPONSABLE:</strong> {usuario ? `${usuario.nombre} (${rol})` : 'Sistema'}</p>
        </div>
      </div>

      {/* Encabezado visible en pantalla */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4 print:hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">Planes de Tratamiento</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Presupuestos, avance de pagos y saldos por paciente.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            const a = new Date();
            setFechaEmision(`${a.toLocaleDateString('es-BO')} a las ${a.toLocaleTimeString('es-BO')}`);
            setTimeout(() => window.print(), 100);
          }}
          className="bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-blue-400 border border-blue-500/30 px-4 py-2.5 rounded-xl text-xs font-bold uppercase cursor-pointer shrink-0 transition-all duration-200 flex items-center gap-2"
        >
          <span>📄</span> Reporte PDF
        </button>
      </div>

      {/* Resumen de Caja (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
        {[
          { t: 'Presupuestado', v: moneda(resumen.presupuesto), color: 'text-white', bg: 'bg-slate-800/50', border: 'border-slate-700' },
          { t: 'Cobrado', v: moneda(resumen.cobrado), color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20' },
          { t: 'Saldo por cobrar', v: moneda(resumen.saldo), color: 'text-amber-400', bg: 'bg-amber-500/5', border: 'border-amber-500/20' },
        ].map((k) => (
          <div key={k.t} className={`${k.bg} border ${k.border} rounded-2xl p-5 backdrop-blur-sm transition-all hover:scale-[1.02]`}>
            <p className="text-[11px] uppercase text-slate-400 font-bold tracking-wider">{k.t}</p>
            <p className={`text-2xl font-black ${k.color} mt-2 font-mono`}>{k.v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 print:block">
        {/* Formulario de Registro */}
        {puedeCrear && (
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-5 shadow-xl h-fit print:hidden backdrop-blur-sm">
            <h2 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-3 tracking-wider">Nuevo Plan de Tratamiento</h2>
            <form onSubmit={registrar} noValidate className="space-y-4">
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
              
              <Campo etiqueta="Tratamiento" requerido error={ver('nombre')}>
                <input
                  type="text"
                  list="tratamientos-sugeridos"
                  value={form.nombre}
                  maxLength={100}
                  placeholder="Ej: ENDODONCIA PIEZA 16"
                  onChange={(e) => cambiar('nombre', limpiarTextoClinico(e.target.value))}
                  onBlur={() => tocar('nombre')}
                  className={`${claseInput(ver('nombre'))} uppercase`}
                  aria-invalid={!!ver('nombre')}
                  aria-autocomplete="list"
                />
                <datalist id="tratamientos-sugeridos">
                  {SUGERIDOS.map((s) => <option key={s} value={s} />)}
                </datalist>
              </Campo>
              
              <Campo etiqueta="Descripción" error={ver('descripcion')}>
                <textarea
                  value={form.descripcion}
                  maxLength={300}
                  rows={2}
                  placeholder="DETALLE DEL PROCEDIMIENTO"
                  onChange={(e) => cambiar('descripcion', limpiarTextoClinico(e.target.value))}
                  onBlur={() => tocar('descripcion')}
                  className={`${claseInput(ver('descripcion'))} uppercase resize-none`}
                  aria-invalid={!!ver('descripcion')}
                />
              </Campo>
              
              <div className="grid grid-cols-2 gap-3">
                <Campo etiqueta="Costo total (Bs.)" requerido error={ver('costo')}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.costo}
                    placeholder="0.00"
                    onChange={(e) => cambiar('costo', manejarInputNumerico(e.target.value))}
                    onBlur={() => tocar('costo')}
                    className={claseInput(ver('costo'))}
                    aria-invalid={!!ver('costo')}
                  />
                </Campo>
                {puedeAnticipo && (
                  <Campo etiqueta="Anticipo (Bs.)" error={ver('anticipo')}>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.anticipo}
                      placeholder="0.00"
                      onChange={(e) => cambiar('anticipo', manejarInputNumerico(e.target.value))}
                      onBlur={() => tocar('anticipo')}
                      className={claseInput(ver('anticipo'))}
                      aria-invalid={!!ver('anticipo')}
                    />
                  </Campo>
                )}
              </div>
              
              {puedeAnticipo && anticipoNum > 0 && (
                <Campo etiqueta="Método del anticipo" error={ver('metodo')}>
                  <select
                    value={form.metodo}
                    onChange={(e) => cambiar('metodo', e.target.value)}
                    className={claseInput(ver('metodo'))}
                    aria-invalid={!!ver('metodo')}
                  >
                    {METODOS_PAGO.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Campo>
              )}
              
              {saldoInicial !== null && costoNum !== null && costoNum > 0 && (
                <div className={`text-xs font-semibold rounded-xl p-3 border flex items-start gap-2 ${
                  saldoInicial === 0 
                    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' 
                    : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                }`}>
                  <span className="mt-0.5">{saldoInicial === 0 ? '✅' : '⏳'}</span>
                  <span>
                    {saldoInicial === 0 
                      ? 'El tratamiento queda totalmente pagado con este anticipo.' 
                      : `Saldo inicial pendiente: ${moneda(saldoInicial)}`}
                  </span>
                </div>
              )}
              
              {!puedeAnticipo && (
                <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span>ℹ️</span> Los anticipos y pagos se registran en Caja por Recepción o Administración.
                </p>
              )}
              
              <button
                type="submit"
                disabled={guardando}
                className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-blue-900/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                {guardando ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Registrando...
                  </>
                ) : (
                  '✅ Registrar Plan'
                )}
              </button>
            </form>
          </div>
        )}

        {/* Listado de Tratamientos */}
        <div className={`${puedeCrear ? 'xl:col-span-2' : 'xl:col-span-3'} bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl print:bg-white print:border-none print:p-0 print:shadow-none backdrop-blur-sm`}>
          <div className="flex flex-col lg:flex-row gap-3 border-b border-slate-800 pb-4 print:hidden">
            <h2 className="text-sm font-bold text-white uppercase lg:self-center lg:mr-auto tracking-wider">
              Planes ({filtrados.length})
            </h2>
            <div className="flex gap-2 flex-1 lg:flex-none">
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder=" Paciente o tratamiento..."
                aria-label="Buscar tratamiento o paciente"
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none rounded-xl px-3 py-2.5 text-xs text-white transition-all"
              />
              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value as Filtro)}
                aria-label="Filtrar planes por estado"
                className="bg-slate-950 border border-slate-800 focus:border-blue-500 outline-none rounded-xl px-3 py-2.5 text-xs text-white cursor-pointer"
              >
                <option value="ACTIVOS">ACTIVOS</option>
                <option value="CON_SALDO">CON SALDO</option>
                <option value="PAGADOS">PAGADOS</option>
                <option value="INACTIVOS">INACTIVOS</option>
                <option value="TODOS">TODOS</option>
              </select>
            </div>
          </div>

          {/* ✅ TABLA DE IMPRESIÓN ELEGANTE Y PROFESIONAL */}
          <div className="hidden print:block">
            <table className="w-full text-left text-[11px] text-black border-collapse font-sans">
              <thead>
                <tr className="border-b-2 border-black bg-gray-100">
                  <th className="py-3 px-3 uppercase font-bold tracking-wide">Paciente</th>
                  <th className="py-3 px-3 uppercase font-bold tracking-wide">Tratamiento</th>
                  <th className="py-3 px-3 uppercase font-bold tracking-wide text-right">Costo Total</th>
                  <th className="py-3 px-3 uppercase font-bold tracking-wide text-right">Monto Pagado</th>
                  <th className="py-3 px-3 uppercase font-bold tracking-wide text-right">Saldo Pendiente</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((t) => (
                  <tr key={t.id} className="border-b border-gray-300 break-inside-avoid">
                    <td className="py-2.5 px-3 font-bold uppercase text-black">{t.paciente?.nombre ?? 'PACIENTE GENERAL'}</td>
                    <td className="py-2.5 px-3 uppercase">{t.nombre}</td>
                    <td className="py-2.5 px-3 font-mono text-right">{moneda(t.costo)}</td>
                    <td className="py-2.5 px-3 font-mono text-right text-emerald-700 font-semibold">{moneda(t.pagado)}</td>
                    <td className="py-2.5 px-3 font-mono text-right text-red-700 font-bold">{moneda(redondear(t.costo - t.pagado))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Resumen financiero en la impresión */}
            <div className="mt-6 flex justify-end">
              <div className="text-right">
                <p className="text-xs text-gray-600 uppercase">Total Presupuestado (Activos)</p>
                <p className="text-xl font-black text-black">{moneda(resumen.presupuesto)}</p>
                <p className="text-xs text-gray-600 uppercase mt-2">Total Cobrado</p>
                <p className="text-xl font-black text-emerald-700">{moneda(resumen.cobrado)}</p>
                <p className="text-xs text-gray-600 uppercase mt-2">Saldo Total Pendiente</p>
                <p className="text-xl font-black text-red-700">{moneda(resumen.saldo)}</p>
              </div>
            </div>

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
          {filtrados.length === 0 ? (
            <div className="text-center py-12 print:hidden animate-in fade-in zoom-in-95 duration-300">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-xs text-slate-500 uppercase font-semibold">No se encontraron planes con ese criterio.</p>
            </div>
          ) : (
            <div className="print:hidden space-y-3 max-h-screen overflow-y-auto pr-2 custom-scrollbar">
              {filtrados.map((t) => {
                const saldo = redondear(t.costo - t.pagado);
                const avance = t.costo > 0 ? Math.min(100, Math.round((t.pagado / t.costo) * 100)) : 0;
                const pagado = saldo <= 0;
                
                return (
                  <div
                    key={t.id}
                    className={`bg-slate-950/50 border border-slate-800 hover:border-slate-700 p-4 rounded-xl space-y-3 transition-all duration-200 group ${!t.activo ? 'opacity-60' : ''}`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white uppercase text-sm truncate">{t.nombre}</p>
                        <p className="text-xs text-slate-400 uppercase font-medium">{t.paciente?.nombre ?? 'SIN PACIENTE'}</p>
                        {t.descripcion && (
                          <p className="text-[11px] text-slate-500 uppercase mt-1 line-clamp-2">{t.descripcion}</p>
                        )}
                      </div>
                      <span
                        className={`self-start px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border shrink-0 ${
                          !t.activo
                            ? 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                            : pagado
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {!t.activo ? 'Inactivo' : pagado ? 'Pagado' : 'Con saldo'}
                      </span>
                    </div>
                    
                    <div>
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ease-out ${pagado ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                          style={{ width: `${avance}%` }} 
                        />
                      </div>
                      <div className="text-xs font-mono mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        <span className="text-slate-500">Costo: <span className="text-slate-300">{moneda(t.costo)}</span></span>
                        <span className="text-emerald-500/80 font-semibold">Pagado: {moneda(t.pagado)} ({avance}%)</span>
                        <span className={saldo > 0 ? 'text-amber-400 font-semibold' : 'text-slate-600'}>
                          Saldo: {moneda(saldo)}
                        </span>
                      </div>
                    </div>
                    
                    {(puedeCobrar || puedeDesactivar) && (
                      <div className="flex gap-2 justify-end pt-1 border-t border-slate-800/50">
                        {puedeCobrar && t.activo && saldo > 0 && (
                          <Link
                            href="/cobros"
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold rounded-lg text-[11px] uppercase transition-all duration-200 flex items-center gap-1.5"
                          >
                            <span>💳</span> Cobrar
                          </Link>
                        )}
                        {puedeDesactivar && (
                          <button
                            type="button"
                            onClick={() => (t.activo ? setCambio(t) : void cambiarActivo(t, true))}
                            className={`px-3 py-1.5 font-bold rounded-lg text-[11px] uppercase cursor-pointer transition-all duration-200 flex items-center gap-1.5 ${
                              t.activo 
                                ? 'bg-slate-800 hover:bg-red-900/30 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/30' 
                                : 'bg-emerald-900/20 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            <span>{t.activo ? '' : '✅'}</span>
                            {t.activo ? 'Desactivar' : 'Reactivar'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
              <span className="text-amber-400">⚠️</span> ¿Desactivar este plan?
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              El plan <strong className="text-white uppercase">{cambio.nombre}</strong> dejará de contar en los saldos pendientes.
              {cambio.pagado > 0 && ` Los ${moneda(cambio.pagado)} ya cobrados se conservan en el historial de caja.`}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCambio(null)}
                disabled={desactivando}
                className="px-4 py-2 text-xs font-bold uppercase rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-[0.98] disabled:opacity-50 cursor-pointer transition-all"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={() => cambiarActivo(cambio, false)}
                disabled={desactivando}
                className="px-4 py-2 text-xs font-bold uppercase rounded-lg bg-red-600 text-white hover:bg-red-500 active:scale-[0.98] disabled:bg-red-800 disabled:cursor-not-allowed cursor-pointer transition-all shadow-lg shadow-red-900/20 flex items-center gap-2"
              >
                {desactivando ? (
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  'Sí, desactivar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}