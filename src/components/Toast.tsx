'use client';

import { createContext, useCallback, useContext, useEffect, useState, useRef } from 'react';

// ============================================================================
// TIPOS Y CONFIGURACIÓN
// ============================================================================

export type TipoNotificacion = 'exito' | 'error' | 'info' | 'advertencia';

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  mensaje: string;
  duracion?: number; // Duración personalizada en ms (default: 5000)
}

// Contexto para usar el toast desde cualquier componente
const ToastContext = createContext<((tipo: TipoNotificacion, mensaje: string, duracion?: number) => void) | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser usado dentro de un ToastProvider');
  }
  return context;
};

// Configuración de estilos por tipo
const CONFIG_NOTIFICACION: Record<TipoNotificacion, {
  bg: string;
  border: string;
  texto: string;
  icono: React.ReactNode;
}> = {
  exito: {
    bg: 'bg-emerald-950/95',
    border: 'border-emerald-500/50',
    texto: 'text-emerald-100',
    icono: (
      <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  error: {
    bg: 'bg-red-950/95',
    border: 'border-red-500/50',
    texto: 'text-red-100',
    icono: (
      <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  info: {
    bg: 'bg-blue-950/95',
    border: 'border-blue-500/50',
    texto: 'text-blue-100',
    icono: (
      <svg className="w-5 h-5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  advertencia: {
    bg: 'bg-amber-950/95',
    border: 'border-amber-500/50',
    texto: 'text-amber-100',
    icono: (
      <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
};

// ============================================================================
// COMPONENTE DE NOTIFICACIÓN INDIVIDUAL
// ============================================================================

function NotificacionItem({ 
  notificacion, 
  onClose 
}: { 
  notificacion: Notificacion; 
  onClose: (id: string) => void;
}) {
  const [progreso, setProgreso] = useState(100);
  const duracion = notificacion.duracion || 5000;
  const config = CONFIG_NOTIFICACION[notificacion.tipo];
  
  const isPaused = useRef(false);
  const rafId = useRef<number | null>(null);
  const startTime = useRef<number>(0);

  useEffect(() => {
    startTime.current = Date.now();

    const animate = () => {
      if (isPaused.current) {
        rafId.current = requestAnimationFrame(animate);
        return;
      }

      const elapsed = Date.now() - startTime.current;
      const remaining = Math.max(0, 100 - (elapsed / duracion) * 100);

      setProgreso(remaining);

      if (remaining <= 0) {
        onClose(notificacion.id);
      } else {
        rafId.current = requestAnimationFrame(animate);
      }
    };

    rafId.current = requestAnimationFrame(animate);

    // Fallback de seguridad en caso de que la pestaña esté en segundo plano y RAF se ralentice
    const timeoutId = setTimeout(() => {
      onClose(notificacion.id);
    }, duracion + 100);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      clearTimeout(timeoutId);
    };
  }, [duracion, notificacion.id, onClose]);

  const handleMouseEnter = () => {
    isPaused.current = true;
  };

  const handleMouseLeave = () => {
    isPaused.current = false;
    const elapsed = Date.now() - startTime.current;
    startTime.current = Date.now() - elapsed;
  };

  return (
    <div
      role={notificacion.tipo === 'error' ? 'alert' : 'status'}
      aria-live={notificacion.tipo === 'error' ? 'assertive' : 'polite'}
      className={`
        relative overflow-hidden
        flex items-start gap-3 
        border rounded-xl 
        px-4 py-3.5 
        shadow-2xl backdrop-blur-md
        transform transition-all ease-out
        hover:scale-[1.02] hover:shadow-2xl
        animate-in slide-in-from-right-full fade-in duration-300
        will-change-transform
        ${config.bg} ${config.border} ${config.texto}
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Icono */}
      <div className="shrink-0 mt-0.5">
        {config.icono}
      </div>

      {/* Mensaje */}
      <p className="flex-1 text-sm font-medium leading-relaxed pr-8 wrap-break-word">
        {notificacion.mensaje}
      </p>

      {/* Botón cerrar */}
      <button
        type="button"
        onClick={() => onClose(notificacion.id)}
        aria-label="Cerrar notificación"
        className="absolute top-2 right-2 p-1.5 rounded-lg 
                   opacity-60 hover:opacity-100 
                   hover:bg-white/10 transition-all duration-200
                   focus:outline-none focus:ring-2 focus:ring-white/30"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Barra de progreso */}
      <div 
        className="absolute bottom-0 left-0 h-1 bg-white/40 transition-none"
        style={{ width: `${progreso}%` }}
      />
    </div>
  );
}

// ============================================================================
// PROVEEDOR DEL CONTEXTO
// ============================================================================

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const maxNotificaciones = 4;

  const cerrarNotificacion = useCallback((id: string) => {
    setNotificaciones((prev) => 
      prev.filter((n) => n.id !== id)
    );
  }, []);

  const notificar = useCallback(
    (tipo: TipoNotificacion, mensaje: string, duracion?: number) => {
      // ✅ MEJORA: Sintaxis más limpia y segura para UUID
      const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      
      setNotificaciones((prev) => {
        if (prev.length >= maxNotificaciones) {
          const [, ...rest] = prev;
          return [...rest, { id, tipo, mensaje, duracion }];
        }
        return [...prev, { id, tipo, mensaje, duracion }];
      });
    },
    []
  );

  return (
    <ToastContext.Provider value={notificar}>
      {children}
      
      {/* Contenedor de notificaciones */}
      <div 
        aria-live="polite"
        aria-atomic="false"
        className="fixed top-4 right-4 z-100 flex flex-col gap-3 
                   w-[calc(100%-2rem)] sm:w-96 max-w-sm
                   print:hidden pointer-events-none"
      >
        <div className="flex flex-col gap-3 pointer-events-auto">
          {notificaciones.map((notificacion) => (
            <NotificacionItem
              key={notificacion.id}
              notificacion={notificacion}
              onClose={cerrarNotificacion}
            />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}