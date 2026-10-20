'use client';

import { useState, useEffect, useMemo } from 'react';

interface Paciente {
  id: string;
  nombre: string;
  ci?: string | null;
  activo: boolean;
}

interface Cobro {
  id: string;
  montoTotal: number;
  montoPagado: number;
  metodo: string;
  pacienteId?: string | null;
  nombreCliente?: string | null;
  paciente?: Paciente | null;
  createdAt: string;
}

interface UsuarioSesion {
  nombre: string;
  username: string;
  rol: 'ADMINISTRADOR' | 'ODONTOLOGO' | 'RECEPCIONISTA' | 'PACIENTE';
}

export default function CobrosPage() {
  // Inicialización limpia y síncrona de sesión desde localStorage
  const [usuario] = useState<UsuarioSesion | null>(() => {
    if (typeof window !== 'undefined') {
      const userStored = localStorage.getItem('usuario_activo');
      if (userStored) {
        try {
          return JSON.parse(userStored);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fecha y hora de emisión actualizada de forma limpia (Lazy State)
  const [fechaHoraEmision, setFechaHoraEmision] = useState<string>(() => {
    const ahora = new Date();
    return `${ahora.toLocaleDateString()} a las ${ahora.toLocaleTimeString()}`;
  });

  // Campos del formulario
  const [pacienteId, setPacienteId] = useState('');
  const [nombreCliente, setNombreCliente] = useState('');
  const [montoTotal, setMontoTotal] = useState('');
  const [montoPagado, setMontoPagado] = useState('');
  const [metodo, setMetodo] = useState('EFECTIVO');

  // Buscador dinámico en tiempo real
  const [busqueda, setBusqueda] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function cargarDatos() {
      try {
        const [resPacientes, resCobros] = await Promise.all([
          fetch('/api/pacientes'),
          fetch('/api/cobros'),
        ]);
        if (resPacientes.ok && resCobros.ok && isMounted) {
          const dataPacientes = await resPacientes.json();
          const dataCobros = await resCobros.json();

          setPacientes(Array.isArray(dataPacientes) ? dataPacientes.filter((p) => p.activo) : []);
          setCobros(
            Array.isArray(dataCobros)
              ? dataCobros.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              : []
          );
        }
      } catch (err) {
        console.error('Error al cargar comprobantes de cobro:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    cargarDatos();
    return () => {
      isMounted = false;
    };
  }, []);

  const rolActual = usuario?.rol || 'PACIENTE';
  const esPaciente = rolActual === 'PACIENTE';

  // Sincronización automática de nombre si se selecciona un paciente
  const handleSeleccionarPaciente = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setPacienteId(id);
    if (id) {
      const p = pacientes.find((item) => item.id === id);
      if (p) setNombreCliente(p.nombre);
    } else {
      setNombreCliente('');
    }
  };

  // Validación Enterprise: Hard-blocking del botón
  const esFormularioValido = useMemo(() => {
    const totalNum = parseFloat(montoTotal);
    const pagadoNum = parseFloat(montoPagado);
    const tieneNombre = nombreCliente.trim().length >= 3;
    return tieneNombre && !isNaN(totalNum) && totalNum > 0 && !isNaN(pagadoNum) && pagadoNum >= 0;
  }, [nombreCliente, montoTotal, montoPagado]);

  const handleRegistrarCobro = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm(null);

    if (!esFormularioValido) {
      setErrorForm('Ingrese un cliente/paciente válido y montos superiores a 0.');
      return;
    }

    setGuardando(true);

    try {
      const res = await fetch('/api/cobros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: pacienteId || null,
          nombreCliente: nombreCliente.trim().toUpperCase(),
          montoTotal: parseFloat(montoTotal),
          montoPagado: parseFloat(montoPagado),
          metodo,
        }),
      });

      if (!res.ok) throw new Error('No se pudo guardar el comprobante de cobro.');

      setPacienteId('');
      setNombreCliente('');
      setMontoTotal('');
      setMontoPagado('');
      setMetodo('EFECTIVO');

      const resActualizada = await fetch('/api/cobros');
      if (resActualizada.ok) {
        const dataCobros = await resActualizada.json();
        setCobros(
          Array.isArray(dataCobros)
            ? dataCobros.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            : []
        );
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorForm(error.message);
    } finally {
      setGuardando(false);
    }
  };

  // Filtrado dinámico en tiempo real
  const cobrosFiltrados = useMemo(() => {
    return cobros.filter((c) => {
      const cliente = c.paciente?.nombre || c.nombreCliente || '';
      const query = busqueda.toLowerCase();
      return (
        cliente.toLowerCase().includes(query) ||
        c.metodo.toLowerCase().includes(query)
      );
    });
  }, [cobros, busqueda]);

  if (loading) return <div className="p-8 text-slate-400">Cargando módulo de caja y cobros...</div>;

  // Restricción estricta de acceso para el rol Paciente
  if (esPaciente) {
    return (
      <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-slate-800 pb-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">Acceso Restringido</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">El módulo de caja y cobros generales es de uso exclusivo administrativo.</p>
        </div>
        <div className="bg-[#0d1527] border border-slate-800 p-8 rounded-2xl text-center space-y-4 shadow-xl">
          <p className="text-amber-400 text-sm font-bold uppercase">⚠️ No cuentas con permisos para acceder a este módulo.</p>
          <p className="text-xs text-slate-400">Puedes consultar el estado de tus saldos y pagos directamente desde la sección de <strong className="text-white">Planes de Tratamiento</strong>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 print:p-0 print:max-w-none print:space-y-4">
      
      {/* ========================================================================== */}
      {/* MEMBRETE OFICIAL Y LOGO (SOLO VISIBLE AL IMPRIMIR) */}
      {/* ========================================================================== */}
      <div className="hidden print:flex justify-between items-center border-b-2 border-black pb-4 mb-6">
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
            <h1 className="text-2xl font-black text-black uppercase tracking-wider">
              CLÍNICA DENTAL RUZLY
            </h1>
            <p className="text-xs text-gray-700 font-semibold uppercase">
              REPORTE OFICIAL DE COMPROBANTES DE COBRO Y ARQUEO DE CAJA
            </p>
            <p className="text-[10px] text-gray-600 font-mono">
              Cochabamba, Bolivia • Código de Proyecto: 07
            </p>
          </div>
        </div>

        <div className="text-right font-mono text-xs text-black">
          <p><strong>EMISIÓN:</strong> {fechaHoraEmision}</p>
          <p><strong>RESPONSABLE:</strong> {usuario ? `${usuario.nombre} (${usuario.rol})` : 'ADMINISTRADOR GENERAL'}</p>
        </div>
      </div>

      {/* Cabecera y Preimpresión PDF */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4 print:hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">Gestión de Cobros y Caja</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Control de ingresos por consultas, recibos, validación estricta y comprobantes en PDF.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            const ahora = new Date();
            setFechaHoraEmision(`${ahora.toLocaleDateString()} a las ${ahora.toLocaleTimeString()}`);
            window.print();
          }}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all shadow-lg cursor-pointer shrink-0"
        >
          <span>📄 Preimpresión PDF / Reporte</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block">
        {/* Formulario de Registro (Oculto al Imprimir) */}
        <div className="bg-[#0d1527] border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl h-fit print:hidden">
          <h2 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-2">Nuevo Comprobante de Cobro</h2>

          <form onSubmit={handleRegistrarCobro} className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Seleccionar Paciente (Opcional)</label>
              <select
                value={pacienteId}
                onChange={handleSeleccionarPaciente}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white uppercase cursor-pointer"
              >
                <option value="">-- PACIENTE REGISTRADO --</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} {p.ci ? `(CI: ${p.ci})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Nombre del Paciente / Cliente *</label>
              <input
                type="text"
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value)}
                placeholder="NOMBRE COMPLETO DEL PACIENTE"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Monto Total (Bs.) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={montoTotal}
                  onChange={(e) => setMontoTotal(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Monto Pagado (Bs.) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={montoPagado}
                  onChange={(e) => setMontoPagado(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Método de Pago</label>
              <select
                value={metodo}
                onChange={(e) => setMetodo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white uppercase cursor-pointer"
              >
                <option value="EFECTIVO">EFECTIVO</option>
                <option value="TRANSFERENCIA">TRANSFERENCIA QR / BANCARIA</option>
                <option value="TARJETA">TARJETA DÉBITO / CRÉDITO</option>
              </select>
            </div>

            {errorForm && <p className="text-xs text-red-400 font-semibold">{errorForm}</p>}

            <button
              type="submit"
              disabled={!esFormularioValido || guardando}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-semibold py-2.5 rounded-lg text-xs uppercase shadow transition-colors cursor-pointer"
            >
              {guardando ? 'Guardando...' : 'Guardar Cobro'}
            </button>
          </form>
        </div>

        {/* Listado con Buscador Dinámico */}
        <div className="lg:col-span-2 bg-[#0d1527] border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl print:bg-white print:border-none print:p-0 print:shadow-none">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3 print:hidden">
            <h2 className="text-sm font-bold text-white uppercase">
              Comprobantes Emitidos ({cobrosFiltrados.length})
            </h2>

            <div className="w-full sm:w-72">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="🔍 Buscar por cliente o método..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white uppercase"
              />
            </div>
          </div>

          {/* TABLA EJECUTIVA PARA IMPRESIÓN (SOLO VISIBLE AL IMPRIMIR) */}
          <div className="hidden print:block">
            <table className="w-full text-left text-xs text-black border-collapse">
              <thead>
                <tr className="border-b-2 border-black bg-gray-100">
                  <th className="py-2 px-1 font-bold uppercase">Cliente / Paciente</th>
                  <th className="py-2 px-1 font-bold uppercase">Método de Pago</th>
                  <th className="py-2 px-1 font-bold uppercase text-right">Monto Total (Bs.)</th>
                  <th className="py-2 px-1 font-bold uppercase text-right">Monto Pagado (Bs.)</th>
                  <th className="py-2 px-1 font-bold uppercase text-right">Saldo Pendiente (Bs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {cobrosFiltrados.map((c) => {
                  const total = Number(c.montoTotal);
                  const pagado = Number(c.montoPagado);
                  const saldo = total - pagado;
                  const clienteNombre = c.paciente?.nombre || c.nombreCliente || 'CLIENTE GENERAL';
                  return (
                    <tr key={c.id}>
                      <td className="py-2 px-1 font-bold uppercase">{clienteNombre}</td>
                      <td className="py-2 px-1 uppercase">{c.metodo}</td>
                      <td className="py-2 px-1 text-right font-mono">Bs. {total.toFixed(2)}</td>
                      <td className="py-2 px-1 text-right font-mono font-bold">Bs. {pagado.toFixed(2)}</td>
                      <td className="py-2 px-1 text-right font-mono font-bold">Bs. {saldo.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* VISTA EN PANTALLA */}
          {cobrosFiltrados.length === 0 ? (
            <p className="text-xs text-slate-500 uppercase py-6 text-center print:hidden">No hay registros de cobro con ese criterio.</p>
          ) : (
            <div className="print:hidden space-y-3 max-h-125 overflow-y-auto pr-1">
              {cobrosFiltrados.map((c) => {
                const total = Number(c.montoTotal);
                const pagado = Number(c.montoPagado);
                const saldo = total - pagado;
                const clienteNombre = c.paciente?.nombre || c.nombreCliente || 'CLIENTE GENERAL';

                return (
                  <div key={c.id} className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="space-y-1">
                      <p className="font-bold text-white uppercase text-sm">{clienteNombre}</p>
                      <p className="text-xs text-purple-400 font-bold uppercase">Método: {c.metodo}</p>
                    </div>

                    <div className="text-right font-mono text-xs space-y-0.5">
                      <p className="text-slate-300">Total: Bs. {total.toFixed(2)}</p>
                      <p className="text-emerald-400 font-semibold">Pagado: Bs. {pagado.toFixed(2)}</p>
                      <p className="text-amber-400 font-bold">Saldo: Bs. {saldo.toFixed(2)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================== */}
      {/* SECCIÓN DE FIRMAS Y SELLO OFICIAL (SOLO VISIBLE AL IMPRIMIR) */}
      {/* ========================================================================== */}
      <div className="hidden print:flex justify-between items-end pt-16 text-xs text-black font-semibold uppercase">
        <div className="text-center border-t border-black pt-2 w-60">
          Firma: {usuario ? usuario.nombre : 'ADMINISTRADOR GENERAL'}
        </div>
        <div className="text-center border-t border-black pt-2 w-60">
          Sello Oficial — Clínica Dental Ruzly
        </div>
      </div>

    </div>
  );
}