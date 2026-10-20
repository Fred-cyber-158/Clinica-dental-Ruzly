'use client';

import { useState, useEffect, useMemo } from 'react';

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

interface UsuarioActivo {
  nombre: string;
  rol: string;
  username: string;
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

export default function ReportesPage() {
  const [loading, setLoading] = useState(true);
  const [usuario, setUsuario] = useState<UsuarioActivo | null>(null);
  const [fechaHoraEmision, setFechaHoraEmision] = useState('');

  // Listados Generales
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [tratamientos, setTratamientos] = useState<Tratamiento[]>([]);
  const [cobros, setCobros] = useState<Cobro[]>([]);

  // Filtros de Selección para los 10 Reportes
  const [tipoReporte, setTipoReporte] = useState<TipoReporte>('PACIENTES');
  const [pacienteSeleccionadoId, setPacienteSeleccionadoId] = useState<string>('');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    async function cargarDatosReportes() {
      const userStored = typeof window !== 'undefined' ? localStorage.getItem('usuario_activo') : null;
      let userObj: UsuarioActivo | null = null;
      if (userStored) {
        try {
          userObj = JSON.parse(userStored);
        } catch {
          userObj = null;
        }
      }

      const ahora = new Date();
      const emision = `${ahora.toLocaleDateString()} a las ${ahora.toLocaleTimeString()}`;

      try {
        const [resP, resC, resT, resCob] = await Promise.all([
          fetch('/api/pacientes'),
          fetch('/api/citas'),
          fetch('/api/tratamientos'),
          fetch('/api/cobros'),
        ]);

        const listP: Paciente[] = resP.ok ? await resP.json() : [];
        const listC: Cita[] = resC.ok ? await resC.json() : [];
        const listT: Tratamiento[] = resT.ok ? await resT.json() : [];
        const listCob: Cobro[] = resCob.ok ? await resCob.json() : [];

        if (isMounted) {
          setUsuario(userObj);
          setFechaHoraEmision(emision);
          setPacientes(listP);
          setCitas(listC);
          setTratamientos(listT);
          setCobros(listCob);

          if (listP.length > 0) {
            setPacienteSeleccionadoId(listP[0].id);
          }
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

  // Paciente Activo seleccionado para reportes individuales
  const pacienteSeleccionado = useMemo(() => {
    return pacientes.find((p) => p.id === pacienteSeleccionadoId) || null;
  }, [pacientes, pacienteSeleccionadoId]);

  // Filtrado por Rango de Fechas
  const dentroDePeriodo = (fechaIsoODate: string) => {
    if (!fechaIsoODate) return true;
    const fechaObj = new Date(fechaIsoODate);
    if (fechaInicio) {
      const fIni = new Date(fechaInicio);
      if (fechaObj < fIni) return false;
    }
    if (fechaFin) {
      const fFin = new Date(fechaFin);
      fFin.setHours(23, 59, 59, 999);
      if (fechaObj > fFin) return false;
    }
    return true;
  };

  if (loading) {
    return <div className="p-8 text-slate-400">Generando inteligencia de negocios y reportes ejecutivos...</div>;
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 print:p-0 print:m-0 print:max-w-none">
      
      {/* CONTROLES Y FILTROS INTERACTIVOS (OCULTOS AL IMPRIMIR) */}
      <div className="bg-[#0d1527] border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl print:hidden">
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
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase shadow-lg transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span>🖨️</span> Imprimir / Exportar PDF
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Selector de Tipo de Reporte */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-bold uppercase">Seleccionar Reporte *</label>
            <select
              value={tipoReporte}
              onChange={(e) => setTipoReporte(e.target.value as TipoReporte)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white uppercase cursor-pointer focus:border-blue-500"
            >
              <option value="PACIENTES">1. Reporte de Pacientes Registrados</option>
              <option value="CITAS">2. Reporte de Citas Médicas General</option>
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

          {/* Selector de Paciente Específico */}
          {(tipoReporte === 'HISTORIAL_PACIENTE' || tipoReporte === 'ESTADO_CUENTA_PACIENTE') && (
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-bold uppercase">Seleccionar Paciente *</label>
              <select
                value={pacienteSeleccionadoId}
                onChange={(e) => setPacienteSeleccionadoId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white uppercase cursor-pointer focus:border-blue-500"
              >
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} {p.ci ? `(CI: ${p.ci})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro de Fechas */}
          {(tipoReporte === 'CITAS_PERIODO' ||
            tipoReporte === 'INGRESOS_PERIODO' ||
            tipoReporte === 'TRATAMIENTOS_PERIODO') && (
            <div className="grid grid-cols-2 gap-2 col-span-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-bold uppercase">Fecha Desde</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-bold uppercase">Fecha Hasta</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================== */}
      {/* PLANILLA EJECUTIVA DE IMPRESIÓN (ALTA ELEGANCIA CON LOGO Y MEMBRETE) */}
      {/* ========================================================================== */}
      <div className="bg-[#0d1527] border border-slate-800 p-8 rounded-2xl shadow-2xl space-y-6 print:bg-white print:border-none print:shadow-none print:p-0 print:text-black">
        
        {/* ENCABEZADO OFICIAL */}
        <div className="flex justify-between items-center border-b-2 border-blue-600/40 print:border-black pb-4">
          <div className="flex items-center gap-4">
            {/* Logo de la Clínica */}
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
              <h1 className="text-xl sm:text-2xl font-black text-white print:text-black uppercase tracking-wider">
                CLÍNICA DENTAL RUZLY
              </h1>
              <p className="text-[11px] text-slate-400 print:text-gray-700 uppercase font-semibold">
                Sistema Integral de Gestión Odontológica — Cochabamba, Bolivia
              </p>
              <p className="text-[10px] text-slate-500 print:text-gray-600 font-mono">
                Atención Especializada • Registro Clínico • Reportes Oficiales
              </p>
            </div>
          </div>

          <div className="text-right space-y-1 font-mono text-xs">
            <span className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded text-[10px] font-bold uppercase print:border-black print:text-black">
              CÓDIGO PROYECTO: 07
            </span>
            <p className="text-[10px] text-slate-400 print:text-black mt-1">EMISIÓN: {fechaHoraEmision}</p>
            <p className="text-[10px] text-slate-400 print:text-black uppercase">
              RESPONSABLE: <strong>{usuario ? usuario.nombre : 'ADMINISTRADOR GENERAL'}</strong>
            </p>
          </div>
        </div>

        {/* REPORTE 1: PACIENTES REGISTRADOS */}
        {tipoReporte === 'PACIENTES' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-blue-400 print:text-black uppercase border-b border-slate-800 print:border-black pb-1">
              1. Reporte de Pacientes Registrados ({pacientes.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs print:text-black">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 uppercase print:border-black print:text-black">
                    <th className="py-2">Nombre del Paciente</th>
                    <th className="py-2">C.I.</th>
                    <th className="py-2">Teléfono</th>
                    <th className="py-2">Correo Electrónico</th>
                    <th className="py-2 text-right">Fecha Registro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-300">
                  {pacientes.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 font-bold uppercase text-white print:text-black">{p.nombre}</td>
                      <td className="py-2 font-mono">{p.ci || 'S/C.I.'}</td>
                      <td className="py-2 font-mono">{p.telefono || 'S/TELÉFONO'}</td>
                      <td className="py-2 lowercase">{p.email || 'S/CORREO'}</td>
                      <td className="py-2 text-right font-mono">{new Date(p.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORTE 2 Y 3: CITAS MÉDICAS GENERAL Y POR PERÍODO */}
        {(tipoReporte === 'CITAS' || tipoReporte === 'CITAS_PERIODO') && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-blue-400 print:text-black uppercase border-b border-slate-800 print:border-black pb-1">
              {tipoReporte === 'CITAS' ? '2. Reporte General de Citas Médicas' : '3. Reporte de Citas por Período'}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs print:text-black">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 uppercase print:border-black print:text-black">
                    <th className="py-2">Fecha y Hora</th>
                    <th className="py-2">Paciente</th>
                    <th className="py-2">Motivo Consulta</th>
                    <th className="py-2 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-300">
                  {citas
                    .filter((c) => (tipoReporte === 'CITAS_PERIODO' ? dentroDePeriodo(c.createdAt) : true))
                    .map((c) => (
                      <tr key={c.id}>
                        <td className="py-2 font-mono text-teal-400 print:text-black">
                          {c.fecha} — {c.hora}
                        </td>
                        <td className="py-2 font-bold uppercase text-white print:text-black">
                          {c.paciente?.nombre || 'PACIENTE GENERAL'}
                        </td>
                        <td className="py-2 uppercase">{c.motivo || 'CONSULTA GENERAL'}</td>
                        <td className="py-2 text-right font-bold uppercase font-mono">{c.estado}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORTE 4 Y 10: TRATAMIENTOS REALIZADOS Y POR PERÍODO */}
        {(tipoReporte === 'TRATAMIENTOS' || tipoReporte === 'TRATAMIENTOS_PERIODO') && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-blue-400 print:text-black uppercase border-b border-slate-800 print:border-black pb-1">
              {tipoReporte === 'TRATAMIENTOS' ? '4. Reporte de Tratamientos Realizados' : '10. Reporte de Tratamientos por Período'}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs print:text-black">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 uppercase print:border-black print:text-black">
                    <th className="py-2">Procedimiento Dental</th>
                    <th className="py-2">Paciente Asignado</th>
                    <th className="py-2 text-right">Costo (Bs.)</th>
                    <th className="py-2 text-right">Pagado (Bs.)</th>
                    <th className="py-2 text-right">Saldo (Bs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-300">
                  {tratamientos
                    .filter((t) => (tipoReporte === 'TRATAMIENTOS_PERIODO' ? dentroDePeriodo(t.createdAt) : true))
                    .map((t) => {
                      const c = Number(t.costo);
                      const p = Number(t.pagado);
                      return (
                        <tr key={t.id}>
                          <td className="py-2 font-bold text-purple-400 print:text-black uppercase">{t.nombre}</td>
                          <td className="py-2 uppercase text-white print:text-black">{t.paciente?.nombre || 'GENERAL'}</td>
                          <td className="py-2 text-right font-mono">Bs. {c.toFixed(2)}</td>
                          <td className="py-2 text-right font-mono text-emerald-400 print:text-black">Bs. {p.toFixed(2)}</td>
                          <td className="py-2 text-right font-mono text-amber-400 print:text-black">Bs. {(c - p).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORTE 5 Y 8: HISTORIAL CLÍNICO Y ESTADO DE CUENTA INDIVIDUAL */}
        {(tipoReporte === 'HISTORIAL_PACIENTE' || tipoReporte === 'ESTADO_CUENTA_PACIENTE') && pacienteSeleccionado && (
          <div className="space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl print:bg-white print:border-black print:p-2">
              <p className="text-sm font-black text-white print:text-black uppercase">
                PACIENTE: {pacienteSeleccionado.nombre}
              </p>
              <p className="text-xs text-slate-400 print:text-gray-700">
                C.I.: {pacienteSeleccionado.ci || 'S/C.I.'} • Teléfono: {pacienteSeleccionado.telefono || 'S/TELÉFONO'}
              </p>
            </div>

            <h2 className="text-base font-bold text-blue-400 print:text-black uppercase border-b border-slate-800 print:border-black pb-1">
              {tipoReporte === 'HISTORIAL_PACIENTE' ? '5. Reporte de Historial Clínico del Paciente' : '8. Estado de Cuenta del Paciente'}
            </h2>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase text-slate-300 print:text-black">Plan de Tratamientos y Pagos:</p>
              <table className="w-full text-left text-xs print:text-black">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 uppercase print:border-black print:text-black">
                    <th className="py-2">Tratamiento</th>
                    <th className="py-2 text-right">Importe Total</th>
                    <th className="py-2 text-right">Monto Pagado</th>
                    <th className="py-2 text-right">Saldo Pendiente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-300">
                  {tratamientos
                    .filter((t) => t.pacienteId === pacienteSeleccionado.id)
                    .map((t) => {
                      const c = Number(t.costo);
                      const p = Number(t.pagado);
                      return (
                        <tr key={t.id}>
                          <td className="py-2 font-bold uppercase">{t.nombre}</td>
                          <td className="py-2 text-right font-mono">Bs. {c.toFixed(2)}</td>
                          <td className="py-2 text-right font-mono text-emerald-400 print:text-black">Bs. {p.toFixed(2)}</td>
                          <td className="py-2 text-right font-mono text-amber-400 print:text-black">Bs. {(c - p).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs print:text-black">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 uppercase print:border-black print:text-black">
                    <th className="py-2">Fecha</th>
                    <th className="py-2">Paciente / Cliente</th>
                    <th className="py-2">Método</th>
                    <th className="py-2 text-right">Total (Bs.)</th>
                    <th className="py-2 text-right">Pagado (Bs.)</th>
                    <th className="py-2 text-right">Saldo (Bs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-300">
                  {cobros
                    .filter((cb) => {
                      if (tipoReporte === 'CUENTAS_PENDIENTES') return cb.saldo > 0;
                      if (tipoReporte === 'INGRESOS_PERIODO') return dentroDePeriodo(cb.createdAt);
                      return true;
                    })
                    .map((cb) => (
                      <tr key={cb.id}>
                        <td className="py-2 font-mono">{new Date(cb.createdAt).toLocaleDateString()}</td>
                        <td className="py-2 font-bold uppercase text-white print:text-black">
                          {cb.paciente?.nombre || cb.pacienteNombre}
                        </td>
                        <td className="py-2 uppercase font-semibold">{cb.metodo}</td>
                        <td className="py-2 text-right font-mono">Bs. {Number(cb.montoTotal).toFixed(2)}</td>
                        <td className="py-2 text-right font-mono text-emerald-400 print:text-black">
                          Bs. {Number(cb.montoPagado).toFixed(2)}
                        </td>
                        <td className="py-2 text-right font-mono text-amber-400 print:text-black">
                          Bs. {Number(cb.saldo).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PIE DE PÁGINA CON FIRMAS Y SELLO OFICIAL */}
        <div className="pt-12 flex justify-between items-end text-xs print:text-black uppercase font-semibold border-t border-slate-800 print:border-black mt-8">
          <div className="text-center border-t border-slate-700 print:border-black pt-2 w-60">
            Firma: {usuario ? usuario.nombre : 'ADMINISTRADOR GENERAL'}
          </div>
          <div className="text-center border-t border-slate-700 print:border-black pt-2 w-60">
            Sello Oficial — Clínica Dental Ruzly
          </div>
        </div>

      </div>
    </div>
  );
}