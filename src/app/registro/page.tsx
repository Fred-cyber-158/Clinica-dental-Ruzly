'use client';

import { useState, useMemo, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Rol = 'ADMINISTRADOR' | 'ODONTOLOGO' | 'RECEPCIONISTA' | 'PACIENTE';

const ROLES_INFO: Record<Rol, { icono: string; color: string; descripcion: string }> = {
  ADMINISTRADOR: {
    icono: '👑',
    color: 'border-red-500/50 bg-red-500/10 text-red-400',
    descripcion: 'Control total del sistema, usuarios y reportes',
  },
  ODONTOLOGO: {
    icono: '🦷',
    color: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
    descripcion: 'Odontograma, recetas médicas y atención clínica',
  },
  RECEPCIONISTA: {
    icono: '📋',
    color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
    descripcion: 'Agendamiento de citas, registro y cobros',
  },
  PACIENTE: {
    icono: '🧑',
    color: 'border-purple-500/50 bg-purple-500/10 text-purple-400',
    descripcion: 'Consulta de citas, historial y tratamientos',
  },
};

// Iconos SVG inline optimizados
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);
const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
);

export default function RegistroPage() {
  const router = useRouter();
  
  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState<Rol | ''>('PACIENTE');
  
  // Estados de control
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ✅ Validación estricta sincronizada con el backend
  const esValido = useMemo(() => {
    const passValida = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);
    return (
      nombre.trim().length >= 3 &&
      /^[a-z0-9_]{3,20}$/.test(username) &&
      passValida &&
      password === confirmPassword &&
      rol !== '' &&
      (email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    );
  }, [nombre, username, password, confirmPassword, rol, email]);

  const handleRegistro = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!esValido) {
      setErrorMsg('Por favor, corrija los errores en el formulario antes de continuar.');
      return;
    }

    if (rol === 'ADMINISTRADOR') {
      const confirmacion = window.confirm(
        '⚠️ ATENCIÓN: El rol de ADMINISTRADOR requiere aprobación especial.\n\n' +
        'Su cuenta quedará PENDIENTE hasta que el administrador oficial la revise.\n\n' +
        '¿Desea continuar con la solicitud?'
      );
      if (!confirmacion) return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim().toUpperCase(),
          username: username.trim().toLowerCase(),
          password: password.trim(),
          email: email.trim().toLowerCase() || null,
          rol,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar el registro.');
      }

      setSuccessMsg(
        `✅ ¡Registro exitoso! Su cuenta como ${rol} está PENDIENTE DE APROBACIÓN. Podrá ingresar cuando el administrador la revise.`
      );

      setNombre(''); setUsername(''); setPassword(''); setConfirmPassword(''); setEmail(''); setRol('PACIENTE');

      setTimeout(() => {
        router.push('/login');
      }, 4000);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getInputClass = (hasError: boolean, extra = '') => 
    `w-full bg-slate-950/50 border rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all duration-200 ${
      hasError 
        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' 
        : 'border-slate-800 focus:border-blue-500 focus:ring-blue-500/20 hover:border-slate-700'
    } ${extra}`;

  const passHasError = password !== '' && !/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);
  const confirmHasError = confirmPassword !== '' && password !== confirmPassword;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 font-sans selection:bg-blue-500/30">
      <div className="w-full max-w-xl bg-slate-900/60 backdrop-blur-xl p-6 sm:p-8 rounded-3xl space-y-6 shadow-2xl shadow-black/50 border border-slate-800/60 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* ✅ LOGO INTEGRADO CON FALLBACK ELEGANTE */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 mx-auto mb-2 relative group">
            <div className="absolute inset-0 bg-linear-to-tr from-blue-600 to-cyan-400 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
            <div className="relative w-full h-full rounded-2xl bg-white p-2 shadow-xl flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/logo.png" 
                alt="Clínica Dental Ruzly" 
                className="w-full h-full object-contain z-10 relative"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 z-0 flex items-center justify-center bg-linear-to-tr from-blue-600 to-cyan-400 text-white font-black text-3xl rounded-xl">
                R
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">Clínica Dental Ruzly</h1>
            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider mt-1">Solicitud de Registro de Usuario</p>
          </div>
        </div>

        {/* Notificaciones Globales */}
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium text-center flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
            <span>⚠️</span> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-medium text-center flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
            <span>✅</span> {successMsg}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleRegistro} className="space-y-5">
          
          {/* Selector de Rol */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
              Seleccione el Rol <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(ROLES_INFO) as Rol[]).map((r) => {
                const info = ROLES_INFO[r];
                const seleccionado = rol === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRol(r)}
                    className={`p-3 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer ${
                      seleccionado
                        ? info.color + ' ring-2 ring-offset-2 ring-offset-slate-900 ring-blue-500/50'
                        : 'border-slate-800 bg-slate-950/30 text-slate-400 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                    aria-pressed={seleccionado}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl filter drop-shadow-sm">{info.icono}</span>
                      <div>
                        <p className={`text-xs font-bold uppercase ${seleccionado ? 'text-white' : 'text-slate-300'}`}>{r}</p>
                        <p className="text-[10px] mt-0.5 leading-tight opacity-80">{info.descripcion}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {rol === 'ADMINISTRADOR' && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs font-medium flex items-start gap-2">
              <span className="mt-0.5">⚠️</span>
              <span>Las solicitudes de rol <strong>ADMINISTRADOR</strong> requieren aprobación especial. Su cuenta quedará pendiente hasta ser revisada.</span>
            </div>
          )}

          <div>
            <label htmlFor="nombre" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Nombre Completo <span className="text-red-500">*</span>
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .\-]/g, '').toUpperCase())}
              placeholder="Ej: JUAN PÉREZ GARCÍA"
              maxLength={80}
              className={getInputClass(false)}
              autoComplete="name"
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Nombre de Usuario <span className="text-red-500">*</span>
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9_]/g, '').toLowerCase())}
              placeholder="Ej: jperez"
              maxLength={20}
              className={getInputClass(false)}
              autoComplete="username"
            />
            <p className="text-[10px] text-slate-500 mt-1">Solo letras minúsculas, números y guión bajo (_).</p>
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Correo Electrónico <span className="text-slate-600 font-normal normal-case">(Opcional)</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.replace(/\s/g, '').toLowerCase())}
              placeholder="juan@ejemplo.com"
              maxLength={100}
              className={getInputClass(false)}
              autoComplete="email"
            />
          </div>

          {/* ✅ CONTRASEÑAS CON TOGGLE DE VISIBILIDAD (UX Pro Max) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mín. 8 caracteres"
                  maxLength={100}
                  className={getInputClass(passHasError, 'pr-10')}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors p-1"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Confirmar <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetir contraseña"
                  maxLength={100}
                  className={getInputClass(confirmHasError, 'pr-10')}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors p-1"
                  aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
          </div>

          {confirmHasError && (
            <p className="text-[11px] text-red-400 font-medium flex items-center gap-1 -mt-3 animate-in fade-in slide-in-from-top-1">
              ⚠️ Las contraseñas no coinciden.
            </p>
          )}

          <button
            type="submit"
            disabled={!esValido || loading}
            className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider shadow-lg shadow-blue-900/20 transition-all duration-200 cursor-pointer mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Procesando...
              </span>
            ) : 'Solicitar Registro'}
          </button>
        </form>

        <div className="text-center pt-4 border-t border-slate-800/60">
          <p className="text-sm text-slate-400">
            ¿Ya tienes cuenta?{' '}
            <Link
              href="/login"
              className="text-blue-400 hover:text-blue-300 font-semibold transition-colors hover:underline"
            >
              Iniciar Sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}