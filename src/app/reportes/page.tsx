'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSesion } from '@/lib/sesion-cliente';
import { moneda, fechaBolivia } from '@/lib/formato';

interface Paciente {
  id: string;
  nombre: string;
  ci?: string | null;
  telefono?: string | null;
  email?: string | null;
  createdAt: string;
}

interface Cita {
  id: string;
  fecha: string;
  hora: string;
  motivo?: string | null;
  estado: string;
  pacienteId: string;
  paciente?: Paciente;
  createdAt: string;
}

interface Tratamiento {
  id: string;
  nombre: string;
  descripcion?: string | null;
  costo: number;
  pagado: number;
  pacienteId?: string | null;
  paciente?: Paciente;
  createdAt: string;
}

interface Cobro {
  id: string;
  pacienteNombre: string;
  montoTotal: number;
  montoPagado: number;
  saldo: number;
  metodo: string;
  pacienteId?: string | null;
  paciente?: Paciente;
  createdAt: string;
}

type TipoReporte =
  | 'PACIENTES'
  | 'CITAS'
  | 'CITAS_PERIODO'
  | 'TRATAMIENTOS'
  | 'HISTORIAL_PACIENTE'
  | 'COBROS'
  | 'CUENTAS_PENDIENTES'
  | 'ESTADO_CUENTA_PACIENTE'
  | 'INGRESOS_PERIODO'
  | 'TRATAMIENTOS_PERIODO';

const EmptyState = ({ mensaje }: { mensaje: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
    <span className="text-4xl mb-3 opacity-50">📊</span>
    <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">{mensaje}</p>
  </div>
);

export default function ReportesPage() {
  const usuario = useSesion();
  const [loading, setLoading] = useState(true);
  const [fechaHoraEmision, setFechaHoraEmision] = useState('');

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([]);
  const [cobros, setCobros] = useState<Cobro[]>([]);

  const [tipoReporte, setTipoReporte] = useState<TipoReporte>('PACIENTES');
  const [pacienteSeleccionadoId, setPacienteSeleccionadoId] = useState<string>('');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    async function cargarDatosReportes() {
      const ahora = new Date();
      setFechaHoraEmision(
        `${ahora.toLocaleDateString('es-BO')} a las ${ahora.toLocaleTimeString('es-BO')}`
      );

      try {
        const [resP, resC, resT, resCob] = await Promise.all([
          fetch('/api/pacientes'),
          fetch('/api/citas'),
          fetch('/api/tratamientos'),
          fetch('/api/cobros'),
        ]);

        if (isMounted) {
          setPacientes(resP.ok ? await resP.json() : []);
          setCitas(resC.ok ? await resC.json() : []);
          setTratamientos(resT.ok ? await resT.json() : []);
          setCobros(resCob.ok ? await resCob.json() : []);
        }
      } catch (err) {
        console.error('Error cargando reportes:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    cargarDatosReportes();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (pacientes.length > 0 && !pacienteSeleccionadoId) {
      setPacienteSeleccionadoId(pacientes[0].id);
    }
  }, [pacientes, pacienteSeleccionadoId]);

  const pacienteSeleccionado = useMemo(() => {
    return pacientes.find((p) => p.id === pacienteSeleccionadoId) || null;
  }, [pacientes, pacienteSeleccionadoId]);

  // ✅ CORRECCIÓN: Envolver dentroDePeriodo en useCallback
  const dentroDePeriodo = useCallback((fechaIso: string) => {
    if (!fechaIso) return true;
    const fechaStr = fechaIso.split('T')[0];
    if (fechaInicio && fechaStr < fechaInicio) return false;
    if (fechaFin && fechaStr > fechaFin) return false;
    return true;
  }, [fechaInicio, fechaFin]);

  const totalFinanciero = useMemo(() => {
    return cobros
      .filter((cb) => {
        if (tipoReporte === 'CUENTAS_PENDIENTES') return cb.saldo > 0;
        if (tipoReporte === 'INGRESOS_PERIODO') return dentroDePeriodo(cb.createdAt);
        return true;
      })
      .reduce((sum, cb) => sum + cb.montoPagado, 0);
  }, [cobros, tipoReporte, dentroDePeriodo]);

  // ✅ Título dinámico para el membrete de impresión
  const tituloReporteImpresion = useMemo(() => {
    const titulos: Record<TipoReporte, string> = {
      PACIENTES: 'Reporte de Pacientes Registrados',
      CITAS: 'Reporte General de Citas Médicas',
      CITAS_PERIODO: 'Reporte de Citas por Período',
      TRATAMIENTOS: 'Reporte de Tratamientos Realizados',
      HISTORIAL_PACIENTE: 'Historial Clínico del Paciente',
      COBROS: 'Reporte de Cobros Realizados',
      CUENTAS_PENDIENTES: 'Reporte de Cuentas Pendientes (Saldos)',
      ESTADO_CUENTA_PACIENTE: 'Estado de Cuenta Individual de Paciente',
      INGRESOS_PERIODO: 'Reporte de Ingresos por Período',
      TRATAMIENTOS_PERIODO: 'Reporte de Tratamientos por Período',
    };
    return titulos[tipoReporte];
  }, [tipoReporte]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium animate-pulse">
          Generando inteligencia de negocios y reportes ejecutivos...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 print:p-0 print:m-0 print:max-w-none">
      
      {/* ========================================================================== */}
      {/* CONTROLES Y FILTROS INTERACTIVOS (OCULTOS AL IMPRIMIR) */}
      {/* ========================================================================== */}
      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-5 shadow-xl backdrop-blur-sm print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight">
              Módulo de Reportes Oficiales
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Seleccione uno de los 10 reportes del sistema y filtre según el criterio requerido.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase shadow-lg shadow-blue-900/20 transition-all duration-200 flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span>🖨️</span> Imprimir / Exportar PDF
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="tipoReporte" className="block text-xs text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
              Seleccionar Reporte *
            </label>
            <select
              id="tipoReporte"
              value={tipoReporte}
              onChange={(e) => setTipoReporte(e.target.value as TipoReporte)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white uppercase cursor-pointer focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
            >
              <option value="PACIENTES">1. Reporte de Pacientes Registrados</option>
              <option value="CITAS">2. Reporte General de Citas Médicas</option>
              <option value="CITAS_PERIODO">3. Reporte de Citas por Período</option>
              <option value="TRATAMIENTOS">4. Reporte de Tratamientos Realizados</option>
              <option value="HISTORIAL_PACIENTE">5. Reporte de Historial Clínico del Paciente</option>
              <option value="COBROS">6. Reporte de Cobros Realizados</option>
              <option value="CUENTAS_PENDIENTES">7. Reporte de Cuentas Pendientes (Saldos)</option>
              <option value="ESTADO_CUENTA_PACIENTE">8. Estado de Cuenta Individual de Paciente</option>
              <option value="INGRESOS_PERIODO">9. Reporte de Ingresos por Período</option>
              <option value="TRATAMIENTOS_PERIODO">10. Reporte de Tratamientos por Período</option>
            </select>
          </div>

          {(tipoReporte === 'HISTORIAL_PACIENTE' || tipoReporte === 'ESTADO_CUENTA_PACIENTE') && (
            <div>
              <label htmlFor="pacienteReporte" className="block text-xs text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                Seleccionar Paciente *
              </label>
              <select
                id="pacienteReporte"
                value={pacienteSeleccionadoId}
                onChange={(e) => setPacienteSeleccionadoId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white uppercase cursor-pointer focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
              >
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} {p.ci ? `(CI: ${p.ci})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(tipoReporte === 'CITAS_PERIODO' ||
            tipoReporte === 'INGRESOS_PERIODO' ||
            tipoReporte === 'TRATAMIENTOS_PERIODO') && (
            <div className="grid grid-cols-2 gap-3 md:col-span-2">
              <div>
                <label htmlFor="fechaInicio" className="block text-xs text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                  Fecha Desde
                </label>
                <input
                  id="fechaInicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div>
                <label htmlFor="fechaFin" className="block text-xs text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                  Fecha Hasta
                </label>
                <input
                  id="fechaFin"
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================== */}
      {/* PLANILLA EJECUTIVA DE IMPRESIÓN (ALTA ELEGANCIA CON LOGO Y MEMBRETE) */}
      {/* ========================================================================== */}
      <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl shadow-2xl space-y-6 print:bg-white print:border-none print:shadow-none print:p-0 print:text-black">
        
        {/* ✅ ENCABEZADO OFICIAL DINÁMICO CON LOGO */}
        <div className="hidden print:flex flex-col items-center border-b-2 border-black pb-4 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/logo.png" 
            alt="Logo Clínica Dental Ruzly" 
            className="h-16 w-auto mb-3 object-contain"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
          <h1 className="text-2xl font-black text-black uppercase tracking-widest">CLÍNICA DENTAL RUZLY</h1>
          <p className="text-xs text-gray-700 font-semibold uppercase mt-1">{tituloReporteImpresion}</p>
          <p className="text-[10px] text-gray-600 font-mono mt-0.5">Cochabamba, Bolivia • Gestión Clínica Integral</p>
          
          <div className="w-full flex justify-between mt-4 text-[10px] font-mono text-black border-t border-gray-300 pt-2">
            <p><strong>EMISIÓN:</strong> {fechaHoraEmision || 'No especificada'}</p>
            <p><strong>RESPONSABLE:</strong> {usuario ? `${usuario.nombre} (${usuario.rol})` : 'Sistema'}</p>
          </div>
        </div>

        {/* Encabezado visible solo en pantalla */}
        <div className="print:hidden flex justify-between items-center border-b border-blue-600/40 pb-5">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Logo Clínica Dental Ruzly"
              className="h-16 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">
                CLÍNICA DENTAL RUZLY
              </h1>
              <p className="text-[11px] text-slate-400 uppercase font-semibold">
                Sistema Integral de Gestión Odontológica
              </p>
            </div>
          </div>
        </div>

        {/* REPORTE 1: PACIENTES REGISTRADOS */}
        {tipoReporte === 'PACIENTES' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-blue-400 print:text-black uppercase border-b border-slate-800 print:border-black pb-1">
              1. Reporte de Pacientes Registrados ({pacientes.length})
            </h2>
            {pacientes.length === 0 ? (
              <EmptyState mensaje="No hay pacientes registrados en el sistema." />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800 print:border-black">
                <table className="w-full text-left text-[11px] print:text-black font-sans">
                  <thead className="bg-slate-950 print:bg-gray-100">
                    <tr className="text-slate-400 uppercase print:text-black">
                      <th className="py-3 px-3 font-bold tracking-wide">Nombre del Paciente</th>
                      <th className="py-3 px-3 font-bold tracking-wide">C.I.</th>
                      <th className="py-3 px-3 font-bold tracking-wide">Teléfono</th>
                      <th className="py-3 px-3 font-bold tracking-wide">Correo Electrónico</th>
                      <th className="py-3 px-3 font-bold tracking-wide text-right">Fecha Registro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 print:divide-gray-300 bg-slate-900/50 print:bg-white">
                    {pacientes.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/50 print:hover:bg-transparent transition-colors break-inside-avoid">
                        <td className="py-2.5 px-3 font-bold uppercase text-white print:text-black">{p.nombre}</td>
                        <td className="py-2.5 px-3 font-mono">{p.ci || 'S/C.I.'}</td>
                        <td className="py-2.5 px-3 font-mono">{p.telefono || 'S/TELÉFONO'}</td>
                        <td className="py-2.5 px-3 lowercase">{p.email || 'S/CORREO'}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{fechaBolivia(p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* REPORTE 2 Y 3: CITAS MÉDICAS GENERAL Y POR PERÍODO */}
        {(tipoReporte === 'CITAS' || tipoReporte === 'CITAS_PERIODO') && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-blue-400 print:text-black uppercase border-b border-slate-800 print:border-black pb-1">
              {tipoReporte === 'CITAS' ? '2. Reporte General de Citas Médicas' : '3. Reporte de Citas por Período'}
            </h2>
            {citas.filter((c) => (tipoReporte === 'CITAS_PERIODO' ? dentroDePeriodo(c.createdAt) : true)).length === 0 ? (
              <EmptyState mensaje="No se encontraron citas para los criterios seleccionados." />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800 print:border-black">
                <table className="w-full text-left text-[11px] print:text-black font-sans">
                  <thead className="bg-slate-950 print:bg-gray-100">
                    <tr className="text-slate-400 uppercase print:text-black">
                      <th className="py-3 px-3 font-bold tracking-wide">Fecha y Hora</th>
                      <th className="py-3 px-3 font-bold tracking-wide">Paciente</th>
                      <th className="py-3 px-3 font-bold tracking-wide">Motivo Consulta</th>
                      <th className="py-3 px-3 font-bold tracking-wide text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 print:divide-gray-300 bg-slate-900/50 print:bg-white">
                    {citas
                      .filter((c) => (tipoReporte === 'CITAS_PERIODO' ? dentroDePeriodo(c.createdAt) : true))
                      .map((c) => (
                        <tr key={c.id} className="hover:bg-slate-800/50 print:hover:bg-transparent transition-colors break-inside-avoid">
                          <td className="py-2.5 px-3 font-mono text-teal-400 print:text-black">
                            {c.fecha} — {c.hora}
                          </td>
                          <td className="py-2.5 px-3 font-bold uppercase text-white print:text-black">
                            {c.paciente?.nombre || 'PACIENTE GENERAL'}
                          </td>
                          <td className="py-2.5 px-3 uppercase">{c.motivo || 'CONSULTA GENERAL'}</td>
                          <td className="py-2.5 px-3 text-right font-bold uppercase font-mono">{c.estado}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* REPORTE 4 Y 10: TRATAMIENTOS REALIZADOS Y POR PERÍODO */}
        {(tipoReporte === 'TRATAMIENTOS' || tipoReporte === 'TRATAMIENTOS_PERIODO') && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-blue-400 print:text-black uppercase border-b border-slate-800 print:border-black pb-1">
              {tipoReporte === 'TRATAMIENTOS' ? '4. Reporte de Tratamientos Realizados' : '10. Reporte de Tratamientos por Período'}
            </h2>
            {tratamientos.filter((t) => (tipoReporte === 'TRATAMIENTOS_PERIODO' ? dentroDePeriodo(t.createdAt) : true)).length === 0 ? (
              <EmptyState mensaje="No se encontraron tratamientos para los criterios seleccionados." />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800 print:border-black">
                <table className="w-full text-left text-[11px] print:text-black font-sans">
                  <thead className="bg-slate-950 print:bg-gray-100">
                    <tr className="text-slate-400 uppercase print:text-black">
                      <th className="py-3 px-3 font-bold tracking-wide">Procedimiento Dental</th>
                      <th className="py-3 px-3 font-bold tracking-wide">Paciente Asignado</th>
                      <th className="py-3 px-3 font-bold tracking-wide text-right">Costo</th>
                      <th className="py-3 px-3 font-bold tracking-wide text-right">Pagado</th>
                      <th className="py-3 px-3 font-bold tracking-wide text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 print:divide-gray-300 bg-slate-900/50 print:bg-white">
                    {tratamientos
                      .filter((t) => (tipoReporte === 'TRATAMIENTOS_PERIODO' ? dentroDePeriodo(t.createdAt) : true))
                      .map((t) => (
                        <tr key={t.id} className="hover:bg-slate-800/50 print:hover:bg-transparent transition-colors break-inside-avoid">
                          <td className="py-2.5 px-3 font-bold text-purple-400 print:text-black uppercase">{t.nombre}</td>
                          <td className="py-2.5 px-3 uppercase text-white print:text-black">{t.paciente?.nombre || 'GENERAL'}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{moneda(t.costo)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-400 print:text-black">{moneda(t.pagado)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-amber-400 print:text-black">{moneda(t.costo - t.pagado)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* REPORTE 5 Y 8: HISTORIAL CLÍNICO Y ESTADO DE CUENTA INDIVIDUAL */}
        {(tipoReporte === 'HISTORIAL_PACIENTE' || tipoReporte === 'ESTADO_CUENTA_PACIENTE') && pacienteSeleccionado && (
          <div className="space-y-4">
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl print:bg-gray-50 print:border-black break-inside-avoid">
              <p className="text-sm font-black text-white print:text-black uppercase">
                PACIENTE: {pacienteSeleccionado.nombre}
              </p>
              <p className="text-xs text-slate-400 print:text-gray-700 mt-1">
                C.I.: {pacienteSeleccionado.ci || 'S/C.I.'} • Teléfono: {pacienteSeleccionado.telefono || 'S/TELÉFONO'}
              </p>
            </div>

            <h2 className="text-base font-bold text-blue-400 print:text-black uppercase border-b border-slate-800 print:border-black pb-1">
              {tipoReporte === 'HISTORIAL_PACIENTE' ? '5. Reporte de Historial Clínico del Paciente' : '8. Estado de Cuenta del Paciente'}
            </h2>

            {tratamientos.filter((t) => t.pacienteId === pacienteSeleccionado.id).length === 0 ? (
              <EmptyState mensaje="Este paciente no tiene tratamientos registrados." />
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-slate-300 print:text-black">Plan de Tratamientos y Pagos:</p>
                <div className="overflow-x-auto rounded-xl border border-slate-800 print:border-black">
                  <table className="w-full text-left text-[11px] print:text-black font-sans">
                    <thead className="bg-slate-950 print:bg-gray-100">
                      <tr className="text-slate-400 uppercase print:text-black">
                        <th className="py-3 px-3 font-bold tracking-wide">Tratamiento</th>
                        <th className="py-3 px-3 font-bold tracking-wide text-right">Importe Total</th>
                        <th className="py-3 px-3 font-bold tracking-wide text-right">Monto Pagado</th>
                        <th className="py-3 px-3 font-bold tracking-wide text-right">Saldo Pendiente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 print:divide-gray-300 bg-slate-900/50 print:bg-white">
                      {tratamientos
                        .filter((t) => t.pacienteId === pacienteSeleccionado.id)
                        .map((t) => (
                          <tr key={t.id} className="hover:bg-slate-800/50 print:hover:bg-transparent transition-colors break-inside-avoid">
                            <td className="py-2.5 px-3 font-bold uppercase">{t.nombre}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{moneda(t.costo)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-400 print:text-black">{moneda(t.pagado)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-amber-400 print:text-black">{moneda(t.costo - t.pagado)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* REPORTE 6, 7 Y 9: COBROS, CUENTAS PENDIENTES E INGRESOS POR PERÍODO */}
        {(tipoReporte === 'COBROS' || tipoReporte === 'CUENTAS_PENDIENTES' || tipoReporte === 'INGRESOS_PERIODO') && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-blue-400 print:text-black uppercase border-b border-slate-800 print:border-black pb-1">
              {tipoReporte === 'COBROS'
                ? '6. Reporte de Cobros Realizados'
                : tipoReporte === 'CUENTAS_PENDIENTES'
                ? '7. Reporte de Cuentas Pendientes (Saldos)'
                : '9. Reporte de Ingresos por Período'}
            </h2>
            
            {cobros.filter((cb) => {
              if (tipoReporte === 'CUENTAS_PENDIENTES') return cb.saldo > 0;
              if (tipoReporte === 'INGRESOS_PERIODO') return dentroDePeriodo(cb.createdAt);
              return true;
            }).length === 0 ? (
              <EmptyState mensaje="No se encontraron registros financieros para los criterios seleccionados." />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800 print:border-black">
                <table className="w-full text-left text-[11px] print:text-black font-sans">
                  <thead className="bg-slate-950 print:bg-gray-100">
                    <tr className="text-slate-400 uppercase print:text-black">
                      <th className="py-3 px-3 font-bold tracking-wide">Fecha</th>
                      <th className="py-3 px-3 font-bold tracking-wide">Paciente / Cliente</th>
                      <th className="py-3 px-3 font-bold tracking-wide">Método</th>
                      <th className="py-3 px-3 font-bold tracking-wide text-right">Total</th>
                      <th className="py-3 px-3 font-bold tracking-wide text-right">Pagado</th>
                      <th className="py-3 px-3 font-bold tracking-wide text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 print:divide-gray-300 bg-slate-900/50 print:bg-white">
                    {cobros
                      .filter((cb) => {
                        if (tipoReporte === 'CUENTAS_PENDIENTES') return cb.saldo > 0;
                        if (tipoReporte === 'INGRESOS_PERIODO') return dentroDePeriodo(cb.createdAt);
                        return true;
                      })
                      .map((cb) => (
                        <tr key={cb.id} className="hover:bg-slate-800/50 print:hover:bg-transparent transition-colors break-inside-avoid">
                          <td className="py-2.5 px-3 font-mono">{fechaBolivia(cb.createdAt)}</td>
                          <td className="py-2.5 px-3 font-bold uppercase text-white print:text-black">
                            {cb.paciente?.nombre || cb.pacienteNombre}
                          </td>
                          <td className="py-2.5 px-3 uppercase font-semibold">{cb.metodo}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{moneda(cb.montoTotal)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-400 print:text-black">{moneda(cb.montoPagado)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-amber-400 print:text-black">{moneda(cb.saldo)}</td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot className="bg-slate-950 print:bg-gray-100 border-t-2 border-slate-700 print:border-black break-inside-avoid">
                    <tr>
                      <td colSpan={4} className="py-3 px-3 text-right font-black uppercase text-white print:text-black text-sm">
                        Total {tipoReporte === 'CUENTAS_PENDIENTES' ? 'Pendiente' : 'Cobrado'}
                      </td>
                      <td className="py-3 px-3 text-right font-black font-mono text-emerald-400 print:text-black text-sm">
                        {moneda(totalFinanciero)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ✅ PIE DE PÁGINA CON FIRMAS Y SELLO OFICIAL */}
        <div className="pt-16 flex justify-between items-end text-[11px] print:text-black font-semibold uppercase mt-12 break-inside-avoid">
          <div className="text-center border-t border-slate-700 print:border-black pt-2 w-60">
            Firma: {usuario?.nombre || 'ADMINISTRADOR GENERAL'}
            <br />
            <span className="text-[9px] font-normal normal-case text-gray-600 print:text-gray-600">Responsable de la emisión</span>
          </div>
          <div className="text-center border-t border-slate-700 print:border-black pt-2 w-60">
            Sello Oficial
            <br />
            <span className="text-[9px] font-normal normal-case text-gray-600 print:text-gray-600">Clínica Dental Ruzly</span>
          </div>
        </div>

      </div>
    </div>
  );
}