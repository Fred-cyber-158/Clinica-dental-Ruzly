import React from 'react';

/**
 * Genera las clases de Tailwind para los inputs según su estado de validación.
 * ✅ Alineado con la estética STYLO.pdf (Glassmorphism sutil y Dark Mode Premium).
 * 
 * @param error - Mensaje de error (si existe, pinta de rojo).
 * @param esValido - Si es true y no hay error, pinta de verde (éxito).
 * @param deshabilitado - Si es true, aplica estilos de deshabilitado.
 * @returns String con las clases de Tailwind concatenadas.
 */
export const claseInput = (error?: string, esValido?: boolean, deshabilitado?: boolean): string => {
  // ✅ Base unificada con el resto de la app (fondo semitransparente para glassmorphism)
  const base = "w-full bg-slate-950/50 border rounded-xl p-3 text-xs text-white outline-none transition-all duration-200 placeholder:text-slate-500";
  
  if (deshabilitado) {
    return `${base} opacity-50 cursor-not-allowed border-slate-800 text-slate-500`;
  }
  
  if (error) {
    return `${base} border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-500/5`;
  }
  
  if (esValido) {
    return `${base} border-emerald-500/50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-emerald-500/5`;
  }
  
  // ✅ Estado normal con hover sutil para mejorar la interactividad (UX Pro Max)
  return `${base} border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`;
};

export interface CampoProps {
  /** Etiqueta que se muestra encima del input */
  etiqueta: string;
  /** Indica si el campo es obligatorio (muestra un asterisco rojo) */
  requerido?: boolean;
  /** Mensaje de error a mostrar debajo del input */
  error?: string;
  /** Texto de ayuda o ejemplo que se muestra junto a la etiqueta */
  ayuda?: string;
  /** El componente input, select o textarea que se renderizará */
  children: React.ReactNode;
  /** ID para vincular el label con el input (accesibilidad) */
  id?: string;
  /** Clases adicionales para el contenedor principal */
  className?: string;
}

export default function Campo({
  etiqueta,
  requerido = false,
  error,
  ayuda,
  children,
  id,
  className = "",
}: CampoProps) {
  // ✅ Generamos un ID único para el mensaje de error para usar con aria-describedby
  const errorId = id ? `${id}-error` : undefined;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Etiqueta y Texto de Ayuda */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-1">
        <label 
          htmlFor={id} 
          className="block text-xs font-semibold text-slate-300 cursor-pointer select-none uppercase tracking-wide"
        >
          {etiqueta}
          {requerido && <span className="text-red-400 ml-0.5" title="Campo obligatorio" aria-hidden="true">*</span>}
        </label>
        
        {/* ✅ Texto de ayuda flexible (sin "Ej:" hardcodeado) */}
        {ayuda && !error && (
          <span className="text-[10px] text-slate-500 italic font-normal normal-case">
            {ayuda}
          </span>
        )}
      </div>

      {/* Contenedor del Input (Children) */}
      <div className="relative">
        {children}
      </div>

      {/* Mensaje de Error con Animación, Icono y Accesibilidad */}
      {error && (
        <p 
          id={errorId}
          role="alert" 
          className="mt-1.5 flex items-start gap-1.5 text-[11px] text-red-400 font-medium animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            fill="currentColor" 
            className="w-3.5 h-3.5 mt-0.5 shrink-0"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}