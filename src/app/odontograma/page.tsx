'use client';

import React, { useCallback, useEffect, useState, memo } from 'react';
import { useRouter } from 'next/navigation';
import { fechaHoraBolivia } from '@/lib/formato';
import { useSesion } from '@/lib/sesion-cliente';
import { ahoraBolivia } from '@/lib/validar-cita';

interface Paciente {
  id: string;
  nombre: string;
  ci?: string | null;
  edad?: number | null;
  activo?: boolean;
  createdAt: string;
}

interface OdontogramaRegistro {
  id: string;
  pieza: string;
  hallazgo: string;
  estado: string;
  observacion?: string | null;
  createdAt: string;
}

// Numeración dental FDI - Adultos
const dientesAdultosSuperioresDerecha = ['18', '17', '16', '15', '14', '13', '12', '11'];
const dientesAdultosSuperioresIzquierda = ['21', '22', '23', '24', '25', '26', '27', '28'];
const dientesAdultosInferioresDerecha = ['48', '47', '46', '45', '44', '43', '42', '41'];
const dientesAdultosInferioresIzquierda = ['31', '32', '33', '34', '35', '36', '37', '38'];

// Numeración dental FDI - Niños (Menores de 18)
const dientesNinosSuperioresDerecha = ['55', '54', '53', '52', '51'];
const dientesNinosSuperioresIzquierda = ['61', '62', '63', '64', '65'];
const dientesNinosInferioresDerecha = ['85', '84', '83', '82', '81'];
const dientesNinosInferioresIzquierda = ['71', '72', '73', '74', '75'];

const criteriosDiagnostico = [
  { codigo: 'S', label: 'S - SANO' },
  { codigo: 'B1', label: 'B1 - CARIADO' },
  { codigo: 'C2', label: 'C2 - CARIADO Y OBTURADO' },
  { codigo: 'D3', label: 'D3 - OBTURADO SIN CARIES' },
  { codigo: 'E4', label: 'E4 - PERDIDO POR CARIES' },
  { codigo: 'F5', label: 'F5 - PERDIDO POR OTRA RAZÓN' },
  { codigo: 'G6', label: 'G6 - SELLADOR DE FOSAS Y FISURAS' },
  { codigo: 'H8', label: 'H8 - NO ERUPCIONADO' },
  { codigo: 'I10', label: 'I10 - EXTRACCIÓN INDICADA' },
  { codigo: 'T', label: 'T - TRAUMATISMO (FRACTURA)' },
];

const DIVISIONES = [
  { id: 'VES', letra: 'V', titulo: 'Vestibular (V)', pos: 'col-start-2 row-start-1' },
  { id: 'MES', letra: 'M', titulo: 'Mesial (M)', pos: 'col-start-1 row-start-2' },
  { id: 'OCL', letra: 'O', titulo: 'Oclusal / Incisal (O)', pos: 'col-start-2 row-start-2' },
  { id: 'DIS', letra: 'D', titulo: 'Distal (D)', pos: 'col-start-3 row-start-2' },
  { id: 'LIN', letra: 'L', titulo: 'Lingual / Palatina (L)', pos: 'col-start-2 row-start-3' },
];

function obtenerEstructuraRaices(num: string) {
  const n = parseInt(num);
  if ([16, 17, 18, 26, 27, 28, 55, 65].includes(n)) {
    return [{ id: 'RAIZ_M', nombre: 'M' }, { id: 'RAIZ_V', nombre: 'V' }, { id: 'RAIZ_D', nombre: 'D' }];
  }
  if ([36, 37, 38, 46, 47, 48, 75, 85].includes(n)) {
    return [{ id: 'RAIZ_M', nombre: 'M' }, { id: 'RAIZ_D', nombre: 'D' }];
  }
  if ([14, 15, 24, 25].includes(n)) {
    return [{ id: 'RAIZ_V', nombre: 'V' }, { id: 'RAIZ_P', nombre: 'P' }];
  }
  return [{ id: 'RAIZ_1', nombre: 'R' }];
}

const obtenerTodasLasPartesPieza = (num: string) => [
  'VES', 'MES', 'OCL', 'DIS', 'LIN',
  ...obtenerEstructuraRaices(num).map((r) => r.id),
];

const limpiarTextoClinico = (texto: string) => texto.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .,0-9]/g, '').toUpperCase();

// ============================================================================
// COMPONENTE MEMOIZADO: Pieza Dental (Mejora drástica de rendimiento)
// ============================================================================
interface PiezaDentalProps {
  num: string;
  esSuperior: boolean;
  partesSeleccionadas: string[];
  esActivaModal: boolean;
  onToggleParte: (pieza: string, parte: string) => void;
  onActivarModal: (num: string) => void;
}

const PiezaDental = memo(({ num, esSuperior, partesSeleccionadas, esActivaModal, onToggleParte, onActivarModal }: PiezaDentalProps) => {
  const raices = obtenerEstructuraRaices(num);
  const estaSeleccionada = partesSeleccionadas.length > 0;

  return (
    <div className="flex flex-col items-center">
      {esSuperior && (
        <div className="flex justify-center items-center gap-1 mb-1">
          {raices.map((raiz) => {
            const seleccionada = partesSeleccionadas.includes(raiz.id);
            return (
              <button
                key={raiz.id}
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleParte(num, raiz.id); }}
                aria-label={`Seleccionar raíz ${raiz.nombre} de la pieza ${num}`}
                title={`Raíz ${raiz.nombre} de la pieza ${num}`}
                className={`w-7 h-10 cursor-pointer transition-all duration-200 border border-dashed border-slate-500 flex items-center justify-center rounded-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1 focus:ring-offset-slate-900 ${
                  seleccionada ? 'bg-purple-600 border-white text-white shadow-md' : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span className="text-[9px] font-extrabold">{raiz.nombre}</span>
              </button>
            );
          })}
        </div>
      )}
      
      <button
        type="button"
        onClick={() => onActivarModal(num)}
        aria-label={`Configurar divisiones de la pieza dental ${num}`}
        title={`Pieza Dental ${num} - Click para configurar divisiones`}
        className={`relative w-20 h-20 bg-slate-900 border-2 cursor-pointer transition-all duration-200 rounded-lg select-none flex flex-col p-1 shadow-md focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-900 ${
          esActivaModal
            ? 'border-purple-400 ring-4 ring-purple-500/50 scale-105 shadow-purple-500/50'
            : estaSeleccionada
            ? 'border-emerald-400 bg-emerald-950/40'
            : 'border-slate-700 hover:border-slate-500'
        }`}
      >
        <div className="flex items-center justify-center gap-1.5 px-1 bg-slate-950/90 rounded-sm py-0.5 mb-0.5 border border-slate-800 text-white">
          <span className="text-xs" aria-hidden="true">🦷</span>
          <span className="text-xs font-extrabold font-mono tracking-wide text-amber-300">{num}</span>
        </div>
        <div className="grid grid-cols-3 grid-rows-3 flex-1 gap-0.5 bg-slate-950 p-1 rounded-sm border border-slate-800">
          {DIVISIONES.map((d) => {
            const isSelected = partesSeleccionadas.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleParte(num, d.id); }}
                aria-label={`Cara ${d.titulo} de la pieza ${num}`}
                title={d.titulo}
                className={`${d.pos} rounded-sm transition-all duration-200 flex items-center justify-center text-[9px] font-extrabold focus:outline-none focus:ring-1 focus:ring-inset focus:ring-white/50 ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-inner'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {d.letra}
              </button>
            );
          })}
        </div>
      </button>

      {!esSuperior && (
        <div className="flex justify-center items-center gap-1 mt-1">
          {raices.map((raiz) => {
            const seleccionada = partesSeleccionadas.includes(raiz.id);
            return (
              <button
                key={raiz.id}
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleParte(num, raiz.id); }}
                aria-label={`Seleccionar raíz ${raiz.nombre} de la pieza ${num}`}
                title={`Raíz ${raiz.nombre} de la pieza ${num}`}
                className={`w-7 h-10 cursor-pointer transition-all duration-200 border border-dashed border-slate-500 flex items-center justify-center rounded-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1 focus:ring-offset-slate-900 ${
                  seleccionada ? 'bg-purple-600 border-white text-white shadow-md' : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span className="text-[9px] font-extrabold">{raiz.nombre}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

PiezaDental.displayName = 'PiezaDental';

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function OdontogramaPage() {
  const router = useRouter();
  const usuario = useSesion();
  
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteId, setPacienteId] = useState<string>('');
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<Paciente | null>(null);
  const [piezasSeleccionadas, setPiezasSeleccionadas] = useState<{ [pieza: string]: string[] }>({});
  const [piezaActivaModal, setPiezaActivaModal] = useState<string | null>(null);
  const [hallazgo, setHallazgo] = useState<string>('');
  const [estadoPieza, setEstadoPieza] = useState<string>('DIAGNÓSTICO');
  const [historialOdontograma, setHistorialOdontograma] = useState<OdontogramaRegistro[]>([]);
  
  const [fechaAtencion, setFechaAtencion] = useState<string>(() => ahoraBolivia().fecha);
  const [horaAtencion, setHoraAtencion] = useState<string>('');
  const [edadForm, setEdadForm] = useState<string>('');
  const [presionArterial, setPresionArterial] = useState<string>('');
  const [temperatura, setTemperatura] = useState<string>('');
  const [peso, setPeso] = useState<string>('');
  
  const [subjetivo, setSubjetivo] = useState<string>('');
  const [objetivo, setObjetivo] = useState<string>('');
  const [analisis, setAnalisis] = useState<string>('');
  const [planAccion, setPlanAccion] = useState<string>('');
  const [motivoConsulta, setMotivoConsulta] = useState<string>('');
  const [interconsulta, setInterconsulta] = useState<string>('');
  const [referencia, setReferencia] = useState<string>('');
  const [contrarref, setContrarref] = useState<string>('');
  
  const [guardando, setGuardando] = useState<boolean>(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  const rol = usuario?.rol ?? 'PACIENTE';
  const puedeRegistrar = rol === 'ADMINISTRADOR' || rol === 'ODONTOLOGO';

  const sesionVencida = useCallback(() => {
    localStorage.removeItem('usuario_activo');
    window.dispatchEvent(new Event('storage'));
    router.push('/login');
  }, [router]);

  useEffect(() => {
    let isMounted = true;
    async function cargarPacientes() {
      try {
        const res = await fetch('/api/pacientes');
        if (res.status === 401) {
          sesionVencida();
          return;
        }
        if (res.ok && isMounted) {
          const data = await res.json();
          const ordenados = Array.isArray(data)
            ? data
              .filter((p: Paciente) => p.activo !== false)
              .sort((a: Paciente, b: Paciente) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            : [];
          setPacientes(ordenados);
        }
      } catch (err) {
        console.error('Error al cargar pacientes:', err);
      }
    }
    cargarPacientes();
    return () => { isMounted = false; };
  }, [sesionVencida]);

  useEffect(() => {
    let vigente = true;
    async function cargarHistorialPaciente() {
      if (!pacienteId) {
        setHistorialOdontograma([]);
        return;
      }
      try {
        const res = await fetch(`/api/odontograma?pacienteId=${encodeURIComponent(pacienteId)}`);
        if (res.ok && vigente) {
          const data = await res.json();
          setHistorialOdontograma(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Error al cargar historial del odontograma:', err);
      }
    }
    cargarHistorialPaciente();
    return () => { vigente = false; };
  }, [pacienteId]);

  const handleCambioPaciente = (id: string) => {
    setPacienteId(id);
    setPiezasSeleccionadas({});
    setPiezaActivaModal(null);
    const encontrado = pacientes.find((p) => p.id === id);
    setPacienteSeleccionado(encontrado || null);
    setEdadForm(encontrado?.edad != null ? String(encontrado.edad) : '');
  };

  const menor =
    pacienteSeleccionado?.edad !== null &&
    pacienteSeleccionado?.edad !== undefined &&
    pacienteSeleccionado.edad < 18;

  const togglePartePieza = (pieza: string, parte: string) => {
    setPiezasSeleccionadas((prev) => {
      const partesActuales = prev[pieza] || [];
      const nuevasPartes = partesActuales.includes(parte)
        ? partesActuales.filter((p) => p !== parte)
        : [...partesActuales, parte];
      if (nuevasPartes.length === 0) {
        const copia = { ...prev };
        delete copia[pieza];
        return copia;
      }
      return { ...prev, [pieza]: nuevasPartes };
    });
  };

  const seleccionarPiezaEntera = (num: string) => {
    setPiezasSeleccionadas((prev) => ({ ...prev, [num]: obtenerTodasLasPartesPieza(num) }));
  };

  const handleGuardarOdontograma = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorGlobal(null);
    setMensajeExito(null);
    
    if (!puedeRegistrar) {
      setErrorGlobal('No tiene permisos para registrar en el odontograma.');
      return;
    }
    if (!pacienteId) {
      setErrorGlobal('Debe seleccionar un paciente.');
      return;
    }
    const piezasKeys = Object.keys(piezasSeleccionadas);
    if (piezasKeys.length === 0) {
      setErrorGlobal('Debe seleccionar al menos una pieza dental y sus divisiones en el mapa.');
      return;
    }
    if (!hallazgo.trim()) {
      setErrorGlobal('El criterio de diagnóstico o hallazgo es obligatorio.');
      return;
    }
    
    const edad = edadForm.trim();
    if (edad && (!/^\d{1,3}$/.test(edad) || Number(edad) > 120)) {
      setErrorGlobal('Edad no válida. Debe estar entre 0 y 120 años.');
      return;
    }
    const pa = presionArterial.trim();
    if (pa && !/^\d{2,3}\/\d{2,3}$/.test(pa)) {
      setErrorGlobal('Presión arterial no válida. Ejemplo: 120/80.');
      return;
    }
    const temp = temperatura.trim().replace(',', '.');
    if (temp && (!/^\d{2}(\.\d)?$/.test(temp) || Number(temp) < 30 || Number(temp) > 45)) {
      setErrorGlobal('Temperatura no válida. Debe estar entre 30 y 45 °C.');
      return;
    }
    const kg = peso.trim().replace(',', '.');
    if (kg && (!/^\d{1,3}(\.\d{1,2})?$/.test(kg) || Number(kg) < 1 || Number(kg) > 300)) {
      setErrorGlobal('Peso no válido. Debe estar entre 1 y 300 kg.');
      return;
    }
    
    // ✅ MEJORA: Fallback 'N/A' para signos vitales vacíos, evitando renderizados como "PA()"
    const partesObs = [
      `MOTIVO: ${motivoConsulta.trim() || 'N/A'}`,
      `FECHA: ${fechaAtencion}${horaAtencion ? ` ${horaAtencion}` : ''}`,
      `EDAD: ${edad || 'N/A'}`,
      `SOAP: S(${subjetivo.trim() || 'N/A'}) O(${objetivo.trim() || 'N/A'}) A(${analisis.trim() || 'N/A'}) P(${planAccion.trim() || 'N/A'})`,
      `VIVOS: PA(${pa || 'N/A'}) T(${temp || 'N/A'}°C) P(${kg || 'N/A'}kg)`,
    ];
    if (interconsulta.trim()) partesObs.push(`INTERCONSULTA: ${interconsulta.trim()}`);
    if (referencia.trim()) partesObs.push(`REFERENCIA: ${referencia.trim()}`);
    if (contrarref.trim()) partesObs.push(`CONTRARREFERENCIA: ${contrarref.trim()}`);
    
    const observacion = partesObs.join(' | ').toUpperCase();
    if (observacion.length > 3000) {
      setErrorGlobal('El registro clínico es demasiado largo. Reduzca el texto de las notas SOAP.');
      return;
    }
    
    setGuardando(true);
    try {
      const res = await fetch('/api/odontograma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId,
          piezas: piezasKeys.map((k) => ({ pieza: k, partes: piezasSeleccionadas[k] })),
          hallazgo: hallazgo.trim().toUpperCase(),
          estado: estadoPieza,
          observacion,
        }),
      });
      if (res.status === 401) {
        sesionVencida();
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo guardar el registro clínico.');
      
      setMensajeExito(`Registro clínico guardado con éxito para las piezas: [ ${piezasKeys.join(', ')} ].`);
      
      const resHist = await fetch(`/api/odontograma?pacienteId=${encodeURIComponent(pacienteId)}`);
      if (resHist.ok) {
        const dataHist = await resHist.json();
        setHistorialOdontograma(Array.isArray(dataHist) ? dataHist : []);
      }
      
      setPiezasSeleccionadas({});
      setPiezaActivaModal(null);
      setHallazgo('');
      setSubjetivo('');
      setObjetivo('');
      setAnalisis('');
      setPlanAccion('');
      setInterconsulta('');
      setReferencia('');
      setContrarref('');
    } catch (err: unknown) {
      setErrorGlobal(err instanceof Error ? err.message : 'Error de conexión con el servidor.');
    } finally {
      setGuardando(false);
    }
  };

  if (usuario && !puedeRegistrar) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 p-4">
        <h1 className="text-2xl font-extrabold text-white uppercase">Acceso restringido</h1>
        <div className="bg-slate-900/50 border border-amber-500/20 p-8 rounded-2xl text-center backdrop-blur-sm">
          <p className="text-amber-400 text-sm font-bold uppercase flex items-center justify-center gap-2">
            <span>⚠️</span> El odontograma es información clínica reservada al personal médico.
          </p>
        </div>
      </div>
    );
  }

  const claseInput = 'w-full bg-slate-950/50 border border-slate-800 rounded-lg p-2.5 text-xs text-white uppercase focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all duration-200 placeholder:text-slate-600';
  const claseArea = 'w-full bg-slate-950/50 border border-slate-800 rounded-lg p-2.5 text-xs text-white uppercase focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all duration-200 placeholder:text-slate-600 resize-none';

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">Odontograma Clínico e Historial Ruzly</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Esquema con raíces anatómicas exactas, opción de pieza entera y alta visibilidad.</p>
        </div>
      </div>
      
      {errorGlobal && (
        <div role="alert" className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs font-bold uppercase flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
          <span className="text-lg">🚨</span> {errorGlobal}
        </div>
      )}
      {mensajeExito && (
        <div role="status" className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-bold uppercase flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
          <span className="text-lg">✅</span> {mensajeExito}
        </div>
      )}
      
      {/* 1. Seleccionar Paciente */}
      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-3 shadow-xl backdrop-blur-sm">
        <label htmlFor="paciente-select" className="block text-xs text-slate-400 uppercase font-semibold">
          1. Seleccionar Paciente (Detección Automática Adulto / Pediátrico) *
        </label>
        <select
          id="paciente-select"
          value={pacienteId}
          onChange={(e) => handleCambioPaciente(e.target.value)}
          className="w-full bg-slate-950/50 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 rounded-lg p-3 text-xs text-white focus:outline-none uppercase cursor-pointer transition-all duration-200"
          aria-required="true"
        >
          <option value="">-- SELECCIONAR PACIENTE --</option>
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre.toUpperCase()} {p.ci ? `(CI: ${p.ci})` : ''} {p.edad ? `— Edad: ${p.edad} años` : ''}
            </option>
          ))}
        </select>
        {pacienteSeleccionado && (
          <div className="text-xs font-mono text-purple-300 pt-1 flex items-center gap-2">
            <span>ℹ️</span> Paciente: <strong className="text-white">{pacienteSeleccionado.nombre.toUpperCase()}</strong> —{' '}
            <span className={`px-2 py-0.5 rounded font-bold ${menor ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
              {menor ? '👶 ODONTOGRAMA PEDIÁTRICO (< 18 AÑOS)' : '🦷 ODONTOGRAMA DE ADULTOS (18+ AÑOS)'}
            </span>
          </div>
        )}
      </div>

      {/* Criterios de Diagnóstico */}
      <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl space-y-3 shadow-xl backdrop-blur-sm">
        <h3 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
          <span>📋</span> Criterios de Diagnóstico (Clínica Ruzly)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-[11px] text-slate-400">
          {criteriosDiagnostico.map((c) => (
            <div key={c.codigo} className="bg-slate-950/50 border border-slate-800 p-2.5 rounded-lg hover:border-slate-700 transition-colors">
              <strong className="text-purple-400 block mb-0.5">{c.codigo}</strong> 
              <span className="text-slate-300">{c.label.split(' - ')[1]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Mapa Dental */}
      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white uppercase">
            2. Mapa Dental ({menor ? 'Pediátrico Menores de 18' : 'Adultos 18+'}) - Raíces y Selección por Pieza
          </h2>
          <span className="text-xs font-mono text-purple-400 bg-purple-500/10 border border-purple-500/30 px-3 py-1.5 rounded-full uppercase">
            Piezas Seleccionadas: {Object.keys(piezasSeleccionadas).length > 0 ? Object.keys(piezasSeleccionadas).join(', ') : 'Ninguna'}
          </span>
        </div>
        
        <div className="space-y-2">
          <p className="text-xs text-slate-400 font-bold uppercase text-center">▲ Maxilar Superior (Raíces en Punta Arriba) ▲</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-950/50 border border-slate-800 rounded-xl overflow-x-auto">
            <div className="flex flex-wrap justify-center md:justify-end gap-3 md:border-r border-slate-800 md:pr-4">
              {(menor ? dientesNinosSuperioresDerecha : dientesAdultosSuperioresDerecha).map((num) => (
                <PiezaDental
                  key={num}
                  num={num}
                  esSuperior={true}
                  partesSeleccionadas={piezasSeleccionadas[num] || []}
                  esActivaModal={piezaActivaModal === num}
                  onToggleParte={togglePartePieza}
                  onActivarModal={setPiezaActivaModal}
                />
              ))}
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 md:pl-2">
              {(menor ? dientesNinosSuperioresIzquierda : dientesAdultosSuperioresIzquierda).map((num) => (
                <PiezaDental
                  key={num}
                  num={num}
                  esSuperior={true}
                  partesSeleccionadas={piezasSeleccionadas[num] || []}
                  esActivaModal={piezaActivaModal === num}
                  onToggleParte={togglePartePieza}
                  onActivarModal={setPiezaActivaModal}
                />
              ))}
            </div>
          </div>
        </div>
        
        <div className="space-y-2 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-950/50 border border-slate-800 rounded-xl overflow-x-auto">
            <div className="flex flex-wrap justify-center md:justify-end gap-3 md:border-r border-slate-800 md:pr-4">
              {(menor ? dientesNinosInferioresDerecha : dientesAdultosInferioresDerecha).map((num) => (
                <PiezaDental
                  key={num}
                  num={num}
                  esSuperior={false}
                  partesSeleccionadas={piezasSeleccionadas[num] || []}
                  esActivaModal={piezaActivaModal === num}
                  onToggleParte={togglePartePieza}
                  onActivarModal={setPiezaActivaModal}
                />
              ))}
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 md:pl-2">
              {(menor ? dientesNinosInferioresIzquierda : dientesAdultosInferioresIzquierda).map((num) => (
                <PiezaDental
                  key={num}
                  num={num}
                  esSuperior={false}
                  partesSeleccionadas={piezasSeleccionadas[num] || []}
                  esActivaModal={piezaActivaModal === num}
                  onToggleParte={togglePartePieza}
                  onActivarModal={setPiezaActivaModal}
                />
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-400 font-bold uppercase text-center">▼ Maxilar Inferior (Raíces en Punta Abajo) ▼</p>
        </div>
        
        {piezaActivaModal && (
          <div className="p-4 bg-purple-900/20 border border-purple-500/40 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
            <span className="text-xs font-bold text-purple-300 uppercase text-center sm:text-left">
              Pieza Activa [{piezaActivaModal}]: Haga clic en sus divisiones o elija tratar toda la pieza entera.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => seleccionarPiezaEntera(piezaActivaModal)}
                className="text-[11px] bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white px-4 py-2 rounded-lg uppercase font-bold cursor-pointer shadow-lg shadow-emerald-900/20 transition-all duration-200"
              >
                ⚡ Seleccionar Pieza Entera
              </button>
              <button
                type="button"
                onClick={() => {
                  setPiezasSeleccionadas((prev) => {
                    const copia = { ...prev };
                    delete copia[piezaActivaModal];
                    return copia;
                  });
                  setPiezaActivaModal(null);
                }}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-white px-4 py-2 rounded-lg uppercase font-bold cursor-pointer transition-all duration-200"
              >
                Limpiar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Formulario Clínico Detallado */}
      <form onSubmit={handleGuardarOdontograma} className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-xl backdrop-blur-sm">
        <h3 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-3">
          3. Registro Clínico y Evolución (Datos del Documento Físico)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          <div>
            <label htmlFor="fecha" className="block text-[11px] text-slate-400 mb-1.5">Fecha</label>
            <input id="fecha" type="date" value={fechaAtencion} onChange={(e) => setFechaAtencion(e.target.value)} className={claseInput} />
          </div>
          <div>
            <label htmlFor="hora" className="block text-[11px] text-slate-400 mb-1.5">Hora</label>
            <input id="hora" type="time" value={horaAtencion} onChange={(e) => setHoraAtencion(e.target.value)} className={claseInput} />
          </div>
          <div>
            <label htmlFor="edad" className="block text-[11px] text-slate-400 mb-1.5">Edad</label>
            <input
              id="edad"
              type="text"
              inputMode="numeric"
              maxLength={3}
              value={edadForm}
              onChange={(e) => setEdadForm(e.target.value.replace(/\D/g, ''))}
              placeholder="Años"
              className={claseInput}
            />
          </div>
          <div>
            <label htmlFor="pa" className="block text-[11px] text-slate-400 mb-1.5">P.A. (mmHg)</label>
            <input
              id="pa"
              type="text"
              maxLength={7}
              value={presionArterial}
              onChange={(e) => setPresionArterial(e.target.value.replace(/[^0-9/]/g, ''))}
              placeholder="120/80"
              className={claseInput}
            />
          </div>
          <div>
            <label htmlFor="temp" className="block text-[11px] text-slate-400 mb-1.5">Temp. (°C)</label>
            <input
              id="temp"
              type="text"
              inputMode="decimal"
              maxLength={4}
              value={temperatura}
              onChange={(e) => setTemperatura(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder="36.5"
              className={claseInput}
            />
          </div>
          <div>
            <label htmlFor="peso" className="block text-[11px] text-slate-400 mb-1.5">Peso (Kg)</label>
            <input
              id="peso"
              type="text"
              inputMode="decimal"
              maxLength={6}
              value={peso}
              onChange={(e) => setPeso(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder="70"
              className={claseInput}
            />
          </div>
          <div>
            <label htmlFor="estado" className="block text-[11px] text-slate-400 mb-1.5">Estado Pieza</label>
            <select
              id="estado"
              value={estadoPieza}
              onChange={(e) => setEstadoPieza(e.target.value)}
              className={`${claseInput} cursor-pointer`}
            >
              <option value="DIAGNÓSTICO">DIAGNÓSTICO</option>
              <option value="EN PROCESO">EN PROCESO</option>
              <option value="TERMINADO">TERMINADO</option>
            </select>
          </div>
        </div>
        
        <div>
          <label htmlFor="motivo" className="block text-xs text-slate-400 mb-1.5 font-semibold">Motivo de Consulta *</label>
          <input
            id="motivo"
            type="text"
            maxLength={150}
            value={motivoConsulta}
            onChange={(e) => setMotivoConsulta(limpiarTextoClinico(e.target.value))}
            placeholder="EJ: DOLOR DENTAL PIEZA 46 / CONTROL GENERAL"
            className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-2.5 text-xs text-white uppercase focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all duration-200"
            required
            aria-required="true"
          />
        </div>
        
        <div>
          <label htmlFor="hallazgo" className="block text-xs text-slate-400 mb-1.5 font-semibold">Hallazgo / Criterio de Diagnóstico Oficial *</label>
          <select
            id="hallazgo"
            value={hallazgo}
            onChange={(e) => setHallazgo(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-2.5 text-xs text-white uppercase cursor-pointer focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all duration-200"
            required
            aria-required="true"
          >
            <option value="">-- SELECCIONAR HALLAZGO --</option>
            {criteriosDiagnostico.map((c) => (
              <option key={c.codigo} value={c.label}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="subjetivo" className="block text-xs text-slate-400 mb-1.5">Subjetivo (S)</label>
            <textarea 
              id="subjetivo"
              rows={3} 
              maxLength={400} 
              value={subjetivo} 
              onChange={(e) => setSubjetivo(limpiarTextoClinico(e.target.value))} 
              placeholder="SÍNTOMAS REFERIDOS POR EL PACIENTE..." 
              className={claseArea} 
            />
          </div>
          <div>
            <label htmlFor="objetivo" className="block text-xs text-slate-400 mb-1.5">Objetivo (O)</label>
            <textarea 
              id="objetivo"
              rows={3} 
              maxLength={400} 
              value={objetivo} 
              onChange={(e) => setObjetivo(limpiarTextoClinico(e.target.value))} 
              placeholder="HALLAZGOS CLÍNICOS OBSERVADOS EN EL EXAMEN FÍSICO..." 
              className={claseArea} 
            />
          </div>
          <div>
            <label htmlFor="analisis" className="block text-xs text-slate-400 mb-1.5">Análisis (A)</label>
            <textarea 
              id="analisis"
              rows={3} 
              maxLength={400} 
              value={analisis} 
              onChange={(e) => setAnalisis(limpiarTextoClinico(e.target.value))} 
              placeholder="DIAGNÓSTICO PRESUNTIVO O DEFINITIVO..." 
              className={claseArea} 
            />
          </div>
          <div>
            <label htmlFor="plan" className="block text-xs text-slate-400 mb-1.5">Plan de Acción (P)</label>
            <textarea 
              id="plan"
              rows={3} 
              maxLength={400} 
              value={planAccion} 
              onChange={(e) => setPlanAccion(limpiarTextoClinico(e.target.value))} 
              placeholder="TRATAMIENTO, MEDICACIÓN Y PRESCRIPCIÓN..." 
              className={claseArea} 
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="interconsulta" className="block text-xs text-slate-400 mb-1.5">Interconsulta</label>
            <input 
              id="interconsulta"
              type="text" 
              maxLength={100} 
              value={interconsulta} 
              onChange={(e) => setInterconsulta(limpiarTextoClinico(e.target.value))} 
              placeholder="ESPECIALIDAD / PROFESIONAL" 
              className={claseArea} 
            />
          </div>
          <div>
            <label htmlFor="referencia" className="block text-xs text-slate-400 mb-1.5">Referencia</label>
            <input 
              id="referencia"
              type="text" 
              maxLength={100} 
              value={referencia} 
              onChange={(e) => setReferencia(limpiarTextoClinico(e.target.value))} 
              placeholder="CENTRO DE REFERENCIA" 
              className={claseArea} 
            />
          </div>
          <div>
            <label htmlFor="contrarref" className="block text-xs text-slate-400 mb-1.5">Contrarreferencia</label>
            <input 
              id="contrarref"
              type="text" 
              maxLength={100} 
              value={contrarref} 
              onChange={(e) => setContrarref(limpiarTextoClinico(e.target.value))} 
              placeholder="DETALLE DE CONTRARREFERENCIA" 
              className={claseArea} 
            />
          </div>
        </div>
        
        <button
          type="submit"
          disabled={guardando || Object.keys(piezasSeleccionadas).length === 0}
          className="w-full bg-purple-600 hover:bg-purple-500 active:scale-[0.98] disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-purple-900/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
        >
          {guardando ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              Guardando en la Base de Datos...
            </>
          ) : (
            <>
              <span>💾</span> Guardar Odontograma e Historial Clínico Ruzly
            </>
          )}
        </button>
      </form>

      {/* 4. Historial de Registros del Paciente */}
      {pacienteId && (
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl backdrop-blur-sm">
          <h3 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-3">4. Historial de Odontogramas Registrados para el Paciente</h3>
          {historialOdontograma.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-xs text-slate-500 uppercase font-semibold">No existen registros previos para este paciente.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase">
                  <tr>
                    <th className="p-3 font-semibold">Fecha</th>
                    <th className="p-3 font-semibold">Pieza / Caras</th>
                    <th className="p-3 font-semibold">Hallazgo</th>
                    <th className="p-3 font-semibold">Estado</th>
                    <th className="p-3 font-semibold">Observación / SOAP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/30">
                  {historialOdontograma.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/50 transition-colors align-top">
                      <td className="p-3 font-mono whitespace-nowrap">{fechaHoraBolivia(item.createdAt)}</td>
                      <td className="p-3 font-bold text-purple-400">{item.pieza}</td>
                      <td className="p-3">{item.hallazgo}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold border uppercase ${
                          item.estado === 'TERMINADO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                          item.estado === 'EN PROCESO' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                          'bg-purple-500/10 text-purple-300 border-purple-500/30'
                        }`}>
                          {item.estado}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 max-w-md truncate" title={item.observacion || ''}>{item.observacion || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}