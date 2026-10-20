'use client';

import { useState, useEffect } from 'react';

// Interfaces de tipos de datos
interface Paciente {
  id: string;
  nombre: string;
}

interface Cobro {
  id: string;
  pacienteId: string;
  pacienteNombre?: string;
  monto: number;
  concepto: string;
  metodoPago: 'efectivo' | 'tarjeta' | 'transferencia';
  estado: 'pendiente' | 'completado' | 'anulado';
  fecha: string;
}

export default function CajaPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Estados para formulario de registro
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<string>('');
  const [monto, setMonto] = useState<string>('');
  const [concepto, setConcepto] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo');

  // Función asíncrona reútilizable para recargar datos manualmente tras operaciones de escritura (POST, PUT, DELETE)
  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resPacientes, resCobros] = await Promise.all([
        fetch('/api/pacientes'),
        fetch('/api/cobros'),
      ]);

      if (resPacientes.ok) setPacientes(await resPacientes.json());
      if (resCobros.ok) setCobros(await resCobros.json());
    } catch (error) {
      console.error('Error al cargar datos de caja:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial al montar el componente (cumple estrictamente las reglas de React Hooks / ESLint)
  useEffect(() => {
    let isMounted = true;

    Promise.all([fetch('/api/pacientes'), fetch('/api/cobros')])
      .then(async ([resPacientes, resCobros]) => {
        const pacientesData = resPacientes.ok ? await resPacientes.json() : [];
        const cobrosData = resCobros.ok ? await resCobros.json() : [];

        if (isMounted) {
          setPacientes(pacientesData);
          setCobros(cobrosData);
        }
      })
      .catch((error) => {
        console.error('Error al inicializar datos de caja:', error);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Manejador para registrar un nuevo cobro
  const handleRegistrarCobro = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pacienteSeleccionado || !monto || !concepto) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      const res = await fetch('/api/cobros', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pacienteId: pacienteSeleccionado,
          monto: parseFloat(monto),
          concepto,
          metodoPago,
        }),
      });

      if (res.ok) {
        // Limpiar campos del formulario
        setPacienteSeleccionado('');
        setMonto('');
        setConcepto('');
        setMetodoPago('efectivo');
        // Recargar datos actualizados
        await cargarDatos();
      } else {
        alert('Error al registrar el cobro');
      }
    } catch (error) {
      console.error('Error al registrar cobro:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Módulo de Caja y Facturación</h1>

      {/* Formulario de registro */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Registrar Nuevo Cobro</h2>
        <form onSubmit={handleRegistrarCobro} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paciente</label>
            <select
              value={pacienteSeleccionado}
              onChange={(e) => setPacienteSeleccionado(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Seleccione un paciente</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
            <input
              type="number"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej. Consulta Médica"
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value as 'efectivo' | 'tarjeta' | 'transferencia')}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500"
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>

          <div className="md:col-span-2 lg:col-span-4 flex justify-end mt-2">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              Registrar Transacción
            </button>
          </div>
        </form>
      </div>

      {/* Historial de Transacciones */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Historial de Transacciones</h2>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Cargando transacciones...</div>
        ) : cobros.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No hay registros de cobros registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-sm font-semibold text-gray-600 bg-gray-50">
                  <th className="p-3">ID</th>
                  <th className="p-3">Paciente</th>
                  <th className="p-3">Concepto</th>
                  <th className="p-3">Método</th>
                  <th className="p-3">Monto</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {cobros.map((cobro) => (
                  <tr key={cobro.id} className="hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs">{cobro.id}</td>
                    <td className="p-3">{cobro.pacienteNombre || cobro.pacienteId}</td>
                    <td className="p-3">{cobro.concepto}</td>
                    <td className="p-3 capitalize">{cobro.metodoPago}</td>
                    <td className="p-3 font-semibold text-gray-800">${cobro.monto.toFixed(2)}</td>
                    <td className="p-3 text-gray-500">{new Date(cobro.fecha).toLocaleDateString()}</td>
                    <td className="p-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          cobro.estado === 'completado'
                            ? 'bg-green-100 text-green-700'
                            : cobro.estado === 'pendiente'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {cobro.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}