'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Campo, { claseInput } from '@/components/Campo';
import { useToast } from '@/components/Toast';
import { fechaBolivia, fechaHoraBolivia, moneda } from '@/lib/formato';
import { useSesion } from '@/lib/sesion-cliente';
import { ahoraBolivia } from '@/lib/validar-cita';
import { leerMonto, METODOS_PAGO, redondear, validarCobro, type CampoCobro, type ErroresCobro } from '@/lib/validar-cobro';

interface Paciente {
  id: string;
  nombre: string;
  ci?: string | null;
  activo: boolean;
}

interface Tratamiento {
  id: string;
  nombre: string;
  costo: number;
  pagado: number;
  activo: boolean;
  pacienteId: string | null;
}

interface Cobro {
  id: string;
  pacienteNombre: string;
  montoTotal: number;
  montoPagado: number;
  saldo: number;
  metodo: string;
  pacienteId: string | null;
  createdAt: string;
}

const FORM_VACIO = { 
  pacienteId: '', 
  nombre: '', 
  tratamientoId: '', 
  montoTotal: '', 
  montoPagado: '', 
  metodo: 'EFECTIVO' 
};

export default function CobrosPage() {
  const usuario = useSesion();
  const notificar = useToast();
  const router = useRouter();
  
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([]);
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [cargando, setCargando] = useState(true);
  
  const [form, setForm] = useState(FORM_VACIO);
  const [tocados, setTocados] = useState<Partial<Record<CampoCobro, boolean>>>({});
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  
  const [busqueda, setBusqueda] = useState('');
  const [filtroMetodo, setFiltroMetodo] = useState('TODOS');
  const [recibo, setRecibo] = useState<Cobro | null>(null);
  const [fechaEmision, setFechaEmision] = useState('');

  const rol = usuario?.rol ?? 'PACIENTE';
  const autorizado = rol === 'ADMINISTRADOR' || rol === 'RECEPCIONISTA';

  const sesionVencida = useCallback(() => {
    localStorage.removeItem('usuario_activo');
    window.dispatchEvent(new Event('storage'));
    router.push('/login');
  }, [router]);

  const cargar = useCallback(async () => {
    try {
      const [rp, rc, rt] = await Promise.all([
        fetch('/api/pacientes'), 
        fetch('/api/cobros'), 
        fetch('/api/tratamientos')
      ]);
      
      if ([rp, rc, rt].some((r) => r.status === 401)) {
        sesionVencida();
        return;
      }
      
      const dp = await rp.json().catch(() => null);
      const dc = await rc.json().catch(() => null);
      const dt = await rt.json().catch(() => null);
      
      if (!rc.ok) throw new Error(dc?.error ?? 'No se pudo cargar el historial de cobros.');
      
      setPacientes(Array.isArray(dp) ? dp.filter((p: Paciente) => p.activo) : []);
      setCobros(Array.isArray(dc) ? dc : []);
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

  useEffect(() => {
    const limpiar = () => setRecibo(null);
    window.addEventListener('afterprint', limpiar);
    return () => window.removeEventListener('afterprint', limpiar);
  }, []);

  const pendientes = useMemo(
    () => tratamientos.filter(
      (t) => t.activo && t.pacienteId === form.pacienteId && form.pacienteId !== '' && redondear(t.costo - t.pagado) > 0
    ),
    [tratamientos, form.pacienteId]
  );

  const tratamientoSel = pendientes.find((t) => t.id === form.tratamientoId) ?? null;
  const saldoTratamiento = tratamientoSel ? redondear(tratamientoSel.costo - tratamientoSel.pagado) : null;
  
  const validacion = useMemo(() => validarCobro(form), [form]);
  
  const errores = useMemo(() => {
    const base: ErroresCobro = validacion.ok ? {} : { ...validacion.errores };
    const pago = leerMonto(form.montoPagado);
    if (saldoTratamiento !== null && pago !== null && pago > saldoTratamiento && !base.montoPagado) {
      base.montoPagado = `El pago supera el saldo pendiente (${moneda(saldoTratamiento)}).`;
    }
    return base;
  }, [validacion, form.montoPagado, saldoTratamiento]);

  const hayErrores = Object.keys(errores).length > 0;
  const ver = (c: CampoCobro) => (tocados[c] || intento ? errores[c] : undefined);
  
  const cambiar = (campo: CampoCobro, valor: string) => setForm((p) => ({ ...p, [campo]: valor }));
  const tocar = (campo: CampoCobro) => setTocados((p) => ({ ...p, [campo]: true }));
  
  const elegirPaciente = (id: string) =>
    setForm((p) => ({ ...p, pacienteId: id, nombre: '', tratamientoId: '', montoTotal: '', montoPagado: '' }));
    
  const elegirTratamiento = (id: string) =>
    setForm((p) => ({ ...p, tratamientoId: id, montoTotal: '', montoPagado: '' }));

  const manejarInputNumerico = (valor: string) => {
    return valor
      .replace(/[^0-9.,]/g, '')
      .replace(/(,.*),/g, '$1')
      .replace(/(\..*)\./g, '$1');
  };

  const totalMostrado = saldoTratamiento ?? leerMonto(form.montoTotal);
  const pagoNum = leerMonto(form.montoPagado);
  const saldoRestante = totalMostrado !== null && pagoNum !== null ? redondear(totalMostrado - pagoNum) : null;

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntento(true);
    
    if (!autorizado) {
      notificar('error', 'No tiene permisos para registrar cobros.');
      return;
    }
    if (hayErrores || !validacion.ok) {
      notificar('error', 'Revise los campos marcados en rojo antes de continuar.');
      return;
    }
    
    setGuardando(true);
    try {
      const res = await fetch('/api/cobros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validacion.data),
      });
      
      if (res.status === 401) {
        sesionVencida();
        return;
      }
      
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo registrar el cobro.');
      
      notificar('exito', `Cobro de ${moneda(validacion.data.montoPagado)} registrado correctamente.`);
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

  const imprimir = (c: Cobro | null) => {
    const a = new Date();
    setFechaEmision(`${a.toLocaleDateString('es-BO')} a las ${a.toLocaleTimeString('es-BO')}`);
    setRecibo(c);
    setTimeout(() => window.print(), 100);
  };

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return cobros.filter(
      (c) =>
        (!q || c.pacienteNombre.toLowerCase().includes(q) || c.metodo.toLowerCase().includes(q)) &&
        (filtroMetodo === 'TODOS' || c.metodo === filtroMetodo)
    );
  }, [cobros, busqueda, filtroMetodo]);

  const resumen = useMemo(() => {
    const hoy = ahoraBolivia().fecha;
    const mes = hoy.slice(0, 7);
    let deHoy = 0;
    let delMes = 0;
    for (const c of cobros) {
      const f = fechaBolivia(c.createdAt);
      if (f === hoy) deHoy += c.montoPagado;
      if (f.startsWith(mes)) delMes += c.montoPagado;
    }
    return { deHoy: redondear(deHoy), delMes: redondear(delMes) };
  }, [cobros]);

  const totalFiltrado = filtrados.reduce((s, c) => s + c.montoPagado, 0);

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium animate-pulse">Cargando módulo de caja y cobros...</p>
      </div>
    );
  }

  if (!autorizado) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 p-4">
        <h1 className="text-2xl font-extrabold text-white uppercase">Acceso Restringido</h1>
        <div className="bg-slate-900/50 border border-amber-500/20 p-8 rounded-2xl text-center space-y-3 backdrop-blur-sm">
          <p className="text-amber-400 text-sm font-bold uppercase flex items-center justify-center gap-2">
            <span>⚠️</span> No cuenta con permisos para este módulo
          </p>
          <p className="text-xs text-slate-400">
            Consulte sus saldos y pagos en la sección de <strong className="text-white">Tratamientos</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 print:p-0 print:max-w-none print:px-0">
      
      {/* ========================================== */}
      {/* VISTA DE IMPRESIÓN: RECIBO INDIVIDUAL CON LOGO */}
      {/* ========================================== */}
      {recibo && (
        <div className="hidden print:block text-black p-8 max-w-md mx-auto font-sans">
          <div className="flex flex-col items-center border-b-2 border-black pb-4 mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/logo.png" 
              alt="Logo Clínica Dental Ruzly" 
              className="h-16 w-auto mb-3 object-contain"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
            <h1 className="text-xl font-black uppercase tracking-widest">CLÍNICA DENTAL RUZLY</h1>
            <p className="text-xs text-gray-600 mt-1">Cochabamba, Bolivia</p>
            <p className="text-sm font-bold mt-3 uppercase">Recibo de Pago N.º {recibo.id.slice(-8).toUpperCase()}</p>
          </div>
          <table className="w-full text-sm">
            <tbody>
              <tr><td className="py-2 font-semibold w-1/2">Fecha y Hora</td><td className="text-right">{fechaHoraBolivia(recibo.createdAt)}</td></tr>
              <tr><td className="py-2 font-semibold">Paciente / Cliente</td><td className="text-right uppercase font-bold">{recibo.pacienteNombre}</td></tr>
              <tr><td className="py-2 font-semibold">Monto Adeudado</td><td className="text-right font-mono">{moneda(recibo.montoTotal)}</td></tr>
              <tr><td className="py-2 font-semibold">Monto Pagado</td><td className="text-right font-mono font-bold text-lg">{moneda(recibo.montoPagado)}</td></tr>
              <tr><td className="py-2 font-semibold">Saldo Pendiente</td><td className="text-right font-mono">{moneda(recibo.saldo)}</td></tr>
              <tr><td className="py-2 font-semibold">Método de Pago</td><td className="text-right uppercase">{recibo.metodo}</td></tr>
              <tr><td className="py-2 font-semibold">Atendido por</td><td className="text-right">{usuario?.nombre ?? 'Sistema'}</td></tr>
            </tbody>
          </table>
          <div className="flex justify-between pt-16 text-xs font-semibold uppercase text-gray-800">
            <div className="border-t border-black pt-2 w-40 text-center">Firma del Cliente</div>
            <div className="border-t border-black pt-2 w-40 text-center">Sello de la Clínica</div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* VISTA DE PANTALLA (UI/UX PREMIUM) */}
      {/* ========================================== */}
      <div className={`space-y-6 ${recibo ? 'print:hidden' : ''}`}>
        
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4 print:hidden">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">Caja y Cobros</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">Registro de pagos, saldos de tratamientos y generación de recibos.</p>
          </div>
          <button
            type="button"
            onClick={() => imprimir(null)}
            className="bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-blue-400 border border-blue-500/30 px-4 py-2.5 rounded-xl text-xs font-bold uppercase cursor-pointer shrink-0 transition-all duration-200 flex items-center gap-2"
          >
            <span>📄</span> Reporte General
          </button>
        </div>

        {/* Resumen de Caja (KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
          {[
            { t: 'Cobrado Hoy', v: moneda(resumen.deHoy), color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20' },
            { t: 'Cobrado este Mes', v: moneda(resumen.delMes), color: 'text-blue-400', bg: 'bg-blue-500/5', border: 'border-blue-500/20' },
            { t: 'Recibos Emitidos', v: String(cobros.length), color: 'text-purple-400', bg: 'bg-purple-500/5', border: 'border-purple-500/20' },
          ].map((k) => (
            <div key={k.t} className={`${k.bg} border ${k.border} rounded-2xl p-5 backdrop-blur-sm transition-all hover:scale-[1.02]`}>
              <p className="text-[11px] uppercase text-slate-400 font-bold tracking-wider">{k.t}</p>
              <p className={`text-2xl font-black ${k.color} mt-2 font-mono`}>{k.v}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 print:block">
          
          {/* Formulario de Registro de Cobro */}
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-5 shadow-xl h-fit print:hidden backdrop-blur-sm">
            <h2 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-3 tracking-wider">Registrar Nuevo Cobro</h2>
            <form onSubmit={registrar} noValidate className="space-y-4">
              <Campo etiqueta="Paciente" error={ver('pacienteId')}>
                <select
                  value={form.pacienteId}
                  onChange={(e) => elegirPaciente(e.target.value)}
                  className={`${claseInput(ver('pacienteId'))} uppercase cursor-pointer`}
                  aria-invalid={!!ver('pacienteId')}
                >
                  <option value="">-- CLIENTE PARTICULAR (SIN PACIENTE) --</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre.toUpperCase()} {p.ci ? `(C.I. ${p.ci})` : ''}
                    </option>
                  ))}
                </select>
              </Campo>
              
              {!form.pacienteId && (
                <Campo etiqueta="Nombre del Cliente" requerido error={ver('nombre')}>
                  <input
                    type="text"
                    value={form.nombre}
                    maxLength={80}
                    placeholder="Ej: JUAN MAMANI"
                    onChange={(e) => cambiar('nombre', e.target.value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .&\-]/g, '').toUpperCase())}
                    onBlur={() => tocar('nombre')}
                    className={`${claseInput(ver('nombre'))} uppercase`}
                    aria-invalid={!!ver('nombre')}
                  />
                </Campo>
              )}
              
              {form.pacienteId && (
                <Campo etiqueta="Aplicar a Tratamiento" error={ver('tratamientoId')}>
                  <select
                    value={form.tratamientoId}
                    onChange={(e) => elegirTratamiento(e.target.value)}
                    className={`${claseInput(ver('tratamientoId'))} uppercase cursor-pointer`}
                    aria-invalid={!!ver('tratamientoId')}
                  >
                    <option value="">{pendientes.length ? '-- COBRO LIBRE (SIN TRATAMIENTO) --' : 'SIN TRATAMIENTOS PENDIENTES'}</option>
                    {pendientes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre.toUpperCase()} (Saldo: {moneda(redondear(t.costo - t.pagado))})
                      </option>
                    ))}
                  </select>
                </Campo>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <Campo etiqueta="Monto Total (Bs.)" requerido error={ver('montoTotal')}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={saldoTratamiento !== null ? saldoTratamiento.toFixed(2) : form.montoTotal}
                    readOnly={saldoTratamiento !== null}
                    placeholder="0.00"
                    onChange={(e) => cambiar('montoTotal', manejarInputNumerico(e.target.value))}
                    onBlur={() => tocar('montoTotal')}
                    className={`${claseInput(ver('montoTotal'))} ${saldoTratamiento !== null ? 'opacity-60 cursor-not-allowed bg-slate-950' : ''}`}
                    aria-invalid={!!ver('montoTotal')}
                  />
                </Campo>
                <Campo etiqueta="Monto a Pagar (Bs.)" requerido error={ver('montoPagado')}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.montoPagado}
                    placeholder="0.00"
                    onChange={(e) => cambiar('montoPagado', manejarInputNumerico(e.target.value))}
                    onBlur={() => tocar('montoPagado')}
                    className={claseInput(ver('montoPagado'))}
                    aria-invalid={!!ver('montoPagado')}
                  />
                </Campo>
              </div>
              
              {totalMostrado !== null && totalMostrado > 0 && (
                <button
                  type="button"
                  onClick={() => cambiar('montoPagado', totalMostrado.toFixed(2))}
                  className="w-full text-center text-[11px] font-bold uppercase text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 py-2 rounded-lg cursor-pointer transition-all duration-200 border border-transparent hover:border-blue-500/20"
                >
                  💳 Pagar el total ({moneda(totalMostrado)})
                </button>
              )}
              
              {saldoRestante !== null && (
                <div
                  className={`text-xs font-semibold rounded-xl p-3 border flex items-start gap-2 ${
                    saldoRestante < 0
                      ? 'text-red-400 border-red-500/30 bg-red-500/10'
                      : saldoRestante === 0
                      ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                      : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                  }`}
                >
                  <span className="mt-0.5">{saldoRestante < 0 ? '⚠️' : saldoRestante === 0 ? '✅' : '⏳'}</span>
                  <span>
                    {saldoRestante < 0
                      ? 'El pago supera el monto total adeudado.'
                      : saldoRestante === 0
                      ? 'El tratamiento queda totalmente pagado.'
                      : `Saldo pendiente después del pago: ${moneda(saldoRestante)}`}
                  </span>
                </div>
              )}
              
              <Campo etiqueta="Método de Pago" error={ver('metodo')}>
                <select
                  value={form.metodo}
                  onChange={(e) => cambiar('metodo', e.target.value)}
                  className={claseInput(ver('metodo'))}
                  aria-invalid={!!ver('metodo')}
                >
                  {METODOS_PAGO.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Campo>
              
              <button
                type="submit"
                disabled={guardando}
                className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-blue-900/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                {guardando ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Procesando...
                  </>
                ) : (
                  '✅ Registrar Cobro'
                )}
              </button>
            </form>
          </div>

          {/* Listado de Cobros */}
          <div className="xl:col-span-2 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl print:bg-white print:border-none print:p-0 print:shadow-none backdrop-blur-sm">
            <div className="flex flex-col lg:flex-row gap-3 border-b border-slate-800 pb-4 print:hidden">
              <h2 className="text-sm font-bold text-white uppercase lg:self-center lg:mr-auto tracking-wider">
                Historial de Movimientos ({filtrados.length})
              </h2>
              <div className="flex gap-2 flex-1 lg:flex-none">
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder=" Buscar cliente o método..."
                  aria-label="Buscar cobro por cliente o método"
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none rounded-xl px-3 py-2.5 text-xs text-white transition-all"
                />
                <select
                  value={filtroMetodo}
                  onChange={(e) => setFiltroMetodo(e.target.value)}
                  aria-label="Filtrar cobros por método de pago"
                  className="bg-slate-950 border border-slate-800 focus:border-blue-500 outline-none rounded-xl px-3 py-2.5 text-xs text-white cursor-pointer"
                >
                  <option value="TODOS">TODOS</option>
                  {METODOS_PAGO.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* ✅ TABLA DE IMPRESIÓN ELEGANTE Y PROFESIONAL CON LOGO */}
            <div className="hidden print:block">
              <div className="flex flex-col items-center border-b-2 border-black pb-4 mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="/logo.png" 
                  alt="Logo Clínica Dental Ruzly" 
                  className="h-16 w-auto mb-3 object-contain"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
                <h1 className="text-2xl font-black text-black uppercase tracking-widest">CLÍNICA DENTAL RUZLY</h1>
                <p className="text-xs text-gray-700 font-semibold uppercase mt-1">Reporte Oficial de Caja y Cobros</p>
                <p className="text-[10px] text-gray-600 font-mono mt-0.5">Cochabamba, Bolivia • Gestión Clínica Integral</p>
                
                <div className="w-full flex justify-between mt-4 text-[10px] font-mono text-black border-t border-gray-300 pt-2">
                  <p><strong>EMISIÓN:</strong> {fechaEmision || 'No especificada'}</p>
                  <p><strong>RESPONSABLE:</strong> {usuario ? `${usuario.nombre} (${rol})` : 'Sistema'}</p>
                </div>
              </div>

              <table className="w-full text-left text-[11px] text-black border-collapse font-sans">
                <thead>
                  <tr className="border-b-2 border-black bg-gray-100">
                    <th className="py-3 px-3 uppercase font-bold tracking-wide">Fecha</th>
                    <th className="py-3 px-3 uppercase font-bold tracking-wide">Cliente</th>
                    <th className="py-3 px-3 uppercase font-bold tracking-wide text-right">Total</th>
                    <th className="py-3 px-3 uppercase font-bold tracking-wide text-right">Pagado</th>
                    <th className="py-3 px-3 uppercase font-bold tracking-wide text-right">Saldo</th>
                    <th className="py-3 px-3 uppercase font-bold tracking-wide text-right">Método</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((c) => (
                    <tr key={c.id} className="border-b border-gray-300 break-inside-avoid">
                      <td className="py-2.5 px-3 font-mono">{fechaHoraBolivia(c.createdAt)}</td>
                      <td className="py-2.5 px-3 font-bold uppercase text-black">{c.pacienteNombre}</td>
                      <td className="py-2.5 px-3 font-mono text-right">{moneda(c.montoTotal)}</td>
                      <td className="py-2.5 px-3 font-mono text-right text-emerald-700 font-semibold">{moneda(c.montoPagado)}</td>
                      <td className="py-2.5 px-3 font-mono text-right text-red-700 font-bold">{moneda(c.saldo)}</td>
                      <td className="py-2.5 px-3 text-right uppercase">{c.metodo}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-black break-inside-avoid">
                    <td colSpan={3} className="py-3 px-3 font-black uppercase text-right text-sm">TOTAL COBRADO EN FILTRO</td>
                    <td className="py-3 px-3 font-mono font-black text-right text-sm text-emerald-700">{moneda(totalFiltrado)}</td>
                    <td colSpan={2} />
                  </tr>
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
            {filtrados.length === 0 ? (
              <div className="text-center py-12 print:hidden animate-in fade-in zoom-in-95 duration-300">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-xs text-slate-500 uppercase font-semibold">No se encontraron cobros con ese criterio.</p>
              </div>
            ) : (
              <div className="print:hidden space-y-3 max-h-screen overflow-y-auto pr-2 custom-scrollbar">
                {filtrados.map((c) => (
                  <div
                    key={c.id}
                    className="bg-slate-950/50 border border-slate-800 hover:border-slate-700 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all duration-200 group"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <p className="font-bold text-white uppercase text-sm truncate">{c.pacienteNombre}</p>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {fechaHoraBolivia(c.createdAt)} • <span className="text-slate-300">{c.metodo}</span>
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono pt-1">
                        <span className="text-slate-500">Total: <span className="text-slate-300">{moneda(c.montoTotal)}</span></span>
                        <span className="text-emerald-500/80 font-semibold">Pagó: {moneda(c.montoPagado)}</span>
                        <span className={c.saldo > 0 ? 'text-amber-400' : 'text-slate-600'}>
                          Saldo: {moneda(c.saldo)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => imprimir(c)}
                      className="px-4 py-2 bg-slate-900 hover:bg-blue-600 hover:text-white text-blue-400 border border-blue-500/30 hover:border-blue-500 font-bold rounded-lg text-[11px] uppercase cursor-pointer shrink-0 transition-all duration-200 flex items-center gap-1.5 group-hover:shadow-lg group-hover:shadow-blue-900/20"
                    >
                      <span>🧾</span> Recibo
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