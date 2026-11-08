'use client';

import React, { useState, useCallback, useMemo } from 'react';

// ============================================================================
// TIPOS Y CONFIGURACIÓN
// ============================================================================

export type TipoValidacion = 
  | 'nombre'           // Solo letras, espacios, tildes, guiones
  | 'username'         // Solo minúsculas, números, guión bajo
  | 'email'            // Formato email válido
  | 'telefono'         // Solo números, espacios, +
  | 'ci'               // Cédula de identidad
  | 'password'         // Contraseña fuerte (8 chars, mayúscula, número, especial)
  | 'numero'           // Solo números
  | 'monto'            // Números con decimales
  | 'texto-libre'      // Texto general (se limpia de caracteres raros)
  | 'sin-validacion';  // Sin validación especial

export interface PropsInputConValidacion {
  // Identificación
  id?: string;
  name?: string;
  
  // Configuración visual
  label: string;
  placeholder?: string;
  ejemplo?: string;           // Texto de ayuda (ej: "María López")
  requerido?: boolean;
  tipo?: TipoValidacion;
  
  // Estado
  valor: string;
  onChange: (valor: string) => void;
  onBlur?: (valor: string) => void;
  
  // Validación externa (opcional, si ya tienes errores del formulario)
  errorExterno?: string;
  
  // Configuración de input
  maxLength?: number;
  disabled?: boolean;
  autoComplete?: string;
  iconoIzquierdo?: React.ReactNode;  // Icono personalizado a la izquierda
  
  // Atributos HTML adicionales
  className?: string;
}

// ============================================================================
// EXPRESIONES REGULARES Y FUNCIONES DE LIMPIEZA
// ============================================================================

const VALIDADORES: Record<TipoValidacion, { regex?: RegExp; limpiar?: (v: string) => string; mensaje?: string }> = {
  'nombre': {
    regex: /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .\-]{3,80}$/,
    limpiar: (v) => v.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .\-]/g, '').toUpperCase(),
    mensaje: 'Solo letras, espacios y guiones (3-80 caracteres)',
  },
  'username': {
    regex: /^[a-z0-9_]{3,20}$/,
    limpiar: (v) => v.replace(/[^a-z0-9_]/g, '').toLowerCase(),
    mensaje: 'Solo minúsculas, números y _ (3-20 caracteres)',
  },
  'email': {
    regex: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    limpiar: (v) => v.replace(/\s/g, '').toLowerCase(),
    mensaje: 'Formato: usuario@dominio.com',
  },
  'telefono': {
    regex: /^(\+591)?[23467]\d{7}$/,
    limpiar: (v) => v.replace(/[^0-9+ ]/g, ''),
    mensaje: 'Ej: 70012345 o +591 70012345',
  },
  'ci': {
    regex: /^\d{5,10}(-[0-9A-Za-z]{1,2})?$/,
    limpiar: (v) => v.replace(/[^0-9A-Za-z\-]/g, '').toUpperCase(),
    mensaje: 'Ej: 8392104 o 8392104-1A',
  },
  'password': {
    // ✅ MEJORA CRÍTICA: Alineado con la política de seguridad fuerte del backend
    regex: /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    mensaje: 'Mín. 8 caracteres, 1 mayúscula, 1 número y 1 carácter especial (@, $, !, etc.)',
  },
  'numero': {
    regex: /^\d+$/,
    limpiar: (v) => v.replace(/\D/g, ''),
    mensaje: 'Solo números',
  },
  'monto': {
    regex: /^\d+(\.\d{1,2})?$/,
    // ✅ MEJORA: Previene múltiples puntos o comas (ej: 1.2.3)
    limpiar: (v) => v.replace(/[^0-9.,]/g, '').replace(/(\..*)\./g, '$1').replace(/(,.*),/g, '$1'),
    mensaje: 'Ej: 150.50',
  },
  'texto-libre': {
    limpiar: (v) => v.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9' .,()\-]/g, '').toUpperCase(),
    mensaje: '',
  },
  'sin-validacion': {},
};

// ============================================================================
// ICONOS SVG
// ============================================================================

const IconoExito = () => (
  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const IconoError = () => (
  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const IconoOjo = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const IconoOjoOff = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function InputConValidacion({
  id,
  name,
  label,
  placeholder,
  ejemplo,
  requerido = false,
  tipo = 'texto-libre',
  valor,
  onChange,
  onBlur,
  errorExterno,
  maxLength,
  disabled = false,
  autoComplete,
  iconoIzquierdo,
  className = '',
}: PropsInputConValidacion) {
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [tocado, setTocado] = useState(false);
  const [focus, setFocus] = useState(false);

  const validador = VALIDADORES[tipo];

  // ============================================================================
  // LÓGICA DE VALIDACIÓN
  // ============================================================================

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let nuevoValor = e.target.value;
      
      if (validador.limpiar) {
        nuevoValor = validador.limpiar(nuevoValor);
      }
      
      if (maxLength && nuevoValor.length > maxLength) {
        nuevoValor = nuevoValor.slice(0, maxLength);
      }
      
      onChange(nuevoValor);
    },
    [onChange, validador, maxLength]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setTocado(true);
      setFocus(false);
      onBlur?.(e.target.value);
    },
    [onBlur]
  );

  const handleFocus = useCallback(() => {
    setFocus(true);
  }, []);

  const hayError = useMemo(() => {
    if (errorExterno) return true;
    if (!tocado) return false;
    if (requerido && !valor.trim()) return true;
    if (validador.regex && valor && !validador.regex.test(valor)) return true;
    return false;
  }, [errorExterno, tocado, requerido, valor, validador]);

  const esValido = useMemo(() => {
    if (hayError) return false;
    if (!tocado) return false;
    if (!valor.trim()) return false;
    if (validador.regex && !validador.regex.test(valor)) return false;
    return true;
  }, [hayError, tocado, valor, validador]);

  const mensajeError = useMemo(() => {
    if (errorExterno) return errorExterno;
    if (!tocado) return '';
    if (requerido && !valor.trim()) return `${label} es obligatorio`;
    if (validador.regex && valor && !validador.regex.test(valor)) return validador.mensaje || 'Formato no válido';
    return '';
  }, [errorExterno, tocado, requerido, valor, label, validador]);

  // ============================================================================
  // CLASES CSS DINÁMICAS
  // ============================================================================

  const clasesInput = useMemo(() => {
    const base = `w-full bg-slate-900 border rounded-xl text-xs text-white outline-none transition-all duration-200 placeholder:text-slate-500 ${className}`;
    
    if (disabled) {
      return `${base} opacity-50 cursor-not-allowed border-slate-700 text-slate-400`;
    }
    
    if (hayError) {
      return `${base} border-red-500 focus:border-red-400 focus:ring-2 focus:ring-red-500/20 bg-red-500/5 hover:border-red-400`;
    }
    
    if (esValido) {
      return `${base} border-emerald-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 bg-emerald-500/5 hover:border-emerald-400`;
    }
    
    if (focus) {
      return `${base} border-blue-500 focus:ring-2 focus:ring-blue-500/20`;
    }
    
    // ✅ MEJORA: Añadido hover para mejor affordance pre-focus
    return `${base} border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 hover:border-slate-600`;
  }, [hayError, esValido, focus, disabled, className]);

  // ============================================================================
  // RENDERIZADO
  // ============================================================================

  return (
    <div className="space-y-1.5">
      {/* Etiqueta y Texto de Ayuda */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-1">
        <label 
          htmlFor={id} 
          className="block text-xs font-semibold text-slate-300 cursor-pointer select-none"
        >
          {label}
          {requerido && (
            <span className="text-red-400 ml-0.5" aria-label="campo obligatorio" title="Campo obligatorio">
              *
            </span>
          )}
        </label>
        
        {/* ✅ MEJORA: El texto de ayuda se atenúa si hay error, pero no desaparece, 
            para que el usuario pueda consultar el formato esperado mientras corrige */}
        {ejemplo && (
          <span className={`text-[10px] italic transition-colors duration-200 ${hayError ? 'text-slate-600' : 'text-slate-500'}`}>
            Ej: {ejemplo}
          </span>
        )}
      </div>

      {/* Contenedor del Input con Iconos */}
      <div className="relative">
        {iconoIzquierdo && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {iconoIzquierdo}
          </div>
        )}

        <input
          id={id}
          name={name}
          type={tipo === 'password' && !mostrarPassword ? 'password' : 'text'}
          value={valor}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder || ejemplo}
          maxLength={maxLength}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`${clasesInput} ${iconoIzquierdo ? 'pl-10' : 'pl-3'} ${
            (tipo === 'password' || esValido || hayError) ? 'pr-10' : 'pr-3'
          } py-3`}
          aria-invalid={hayError}
          aria-describedby={hayError ? `${id}-error` : undefined}
        />

        {/* Icono derecho: Éxito, Error o Toggle Password */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          {tipo === 'password' && valor.length > 0 && (
            <button
              type="button"
              onClick={() => setMostrarPassword(!mostrarPassword)}
              className="pointer-events-auto text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
              aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              tabIndex={-1}
            >
              {mostrarPassword ? <IconoOjoOff /> : <IconoOjo />}
            </button>
          )}
          
          {tipo !== 'password' && esValido && (
            <div className="pointer-events-none animate-in fade-in zoom-in duration-200">
              <IconoExito />
            </div>
          )}
          
          {hayError && (
            <div className="pointer-events-none animate-in fade-in zoom-in duration-200">
              <IconoError />
            </div>
          )}
        </div>
      </div>

      {/* Mensaje de Error */}
      {hayError && mensajeError && (
        <p 
          id={`${id}-error`}
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
          <span>{mensajeError}</span>
        </p>
      )}
    </div>
  );
}