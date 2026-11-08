'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSesion, guardarSesion } from '@/lib/sesion-cliente';
import { useToast } from '@/components/Toast';

// ✅ Alineado con la política de seguridad fuerte del backend
const RE_PASSWORD = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Iconos SVG inline optimizados
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);
const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
);

// Clase reutilizable para consistencia visual
const claseInput = (hasError: boolean) =>
  `w-full bg-slate-950/50 border rounded-lg p-2.5 text-xs text-white uppercase focus:outline-none focus:ring-1 transition-all duration-200 placeholder:text-slate-600 ${
    hasError
      ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
      : 'border-slate-800 focus:border-blue-500 focus:ring-blue-500/20 hover:border-slate-700'
  }`;

export default function PerfilPage() {
  const usuario = useSesion();
  const router = useRouter();
  const notificar = useToast();

  // ✅ CORRECCIÓN: Todos los hooks deben ir PRIMERO, antes de cualquier return condicional
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [email, setEmail] = useState(usuario?.email ?? '');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorPass, setErrorPass] = useState('');

  // ✅ Redirección segura mediante useEffect
  useEffect(() => {
    if (!usuario) {
      router.replace('/login');
    }
  }, [usuario, router]);

  // ✅ Actualizar estado cuando cambia el usuario
  useEffect(() => {
    if (usuario) {
      setNombre(usuario.nombre);
      setEmail(usuario.email ?? '');
    }
  }, [usuario]);

  // ✅ Ahora sí podemos hacer el return temprano después de los hooks
  if (!usuario) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium animate-pulse">Verificando sesión...</p>
      </div>
    );
  }

  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const limpio = e.target.value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .\-]/g, '').toUpperCase();
    setNombre(limpio);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const limpio = e.target.value.replace(/\s/g, '').toLowerCase();
    setEmail(limpio);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorPass('');
    setGuardando(true);

    if (passwordNueva) {
      if (passwordNueva !== confirmarPassword) {
        setErrorPass('Las contraseñas nuevas no coinciden.');
        setGuardando(false);
        return;
      }
      if (!RE_PASSWORD.test(passwordNueva)) {
        setErrorPass('La contraseña debe tener al menos 8 caracteres, 1 mayúscula, 1 número y 1 carácter especial (@, $, !, etc.).');
        setGuardando(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/usuarios/${usuario.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          email: email || null,
          password: passwordNueva || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar el perfil.');

      guardarSesion({
        ...usuario,
        nombre: data.nombre,
        email: data.email,
      });

      notificar('exito', 'Perfil actualizado correctamente.');
      setPasswordNueva('');
      setConfirmarPassword('');
      setErrorPass('');
    } catch (err: unknown) {
      const error = err as Error;
      notificar('error', error.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-3xl mx-auto px-4 sm:px-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">
          Mi Perfil
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Actualiza tu información personal y credenciales de acceso
        </p>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-6 sm:p-8 rounded-2xl space-y-6 shadow-2xl shadow-black/20">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
          <div className="w-16 h-16 rounded-full bg-linear-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-500/20 shrink-0">
            {usuario.nombre.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-white uppercase truncate">{usuario.nombre}</p>
            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-blue-400 border border-blue-500/30 bg-slate-950/50 px-2 py-0.5 rounded-md">
              {usuario.rol}
            </span>
            <p className="text-xs text-slate-400 mt-1 font-mono">@{usuario.username}</p>
          </div>
        </div>

        <form onSubmit={handleGuardar} className="space-y-5" noValidate>
          <div>
            <label htmlFor="nombre" className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">
              Nombre Completo <span className="text-red-400">*</span>
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={handleNombreChange}
              className={claseInput(false)}
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">
              Correo Electrónico <span className="text-slate-600 font-normal normal-case">(Opcional)</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              className={`${claseInput(false)} lowercase`}
            />
          </div>

          <div className="pt-6 border-t border-slate-800">
            <h3 className="text-sm font-bold text-white uppercase mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Cambiar Contraseña
            </h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="passwordNueva" className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    id="passwordNueva"
                    type={mostrarPassword ? 'text' : 'password'}
                    value={passwordNueva}
                    onChange={(e) => {
                      setPasswordNueva(e.target.value);
                      setErrorPass('');
                    }}
                    placeholder="Dejar en blanco para mantener la actual"
                    className={`${claseInput(!!errorPass)} lowercase pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPassword(!mostrarPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors p-1"
                    aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {mostrarPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {!passwordNueva && (
                  <p className="text-[10px] text-slate-500 mt-1.5 flex items-start gap-1">
                    <span>ℹ️</span> Mínimo 8 caracteres, 1 mayúscula, 1 número y 1 carácter especial (@, $, !, etc.).
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="confirmarPassword" className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  id="confirmarPassword"
                  type={mostrarPassword ? 'text' : 'password'}
                  value={confirmarPassword}
                  onChange={(e) => {
                    setConfirmarPassword(e.target.value);
                    setErrorPass('');
                  }}
                  placeholder="Repite la nueva contraseña"
                  className={`${claseInput(!!errorPass)} lowercase`}
                />
              </div>

              {errorPass && (
                <p className="text-xs text-red-400 font-semibold flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                  <span>⚠️</span> {errorPass}
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={guardando || Boolean(passwordNueva && passwordNueva !== confirmarPassword)}
            className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-blue-900/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {guardando ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Guardando cambios...
              </>
            ) : (
              '💾 Guardar Cambios'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}