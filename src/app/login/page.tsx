'use client';

import { useState, useMemo, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { guardarSesion } from '@/lib/sesion-cliente';

type Rol = 'ADMINISTRADOR' | 'ODONTOLOGO' | 'RECEPCIONISTA' | 'PACIENTE';

// Iconos SVG inline optimizados para rendimiento
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);
const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<'LOGIN' | 'REGISTER' | 'RESET'>('LOGIN');
  const [rolSeleccionado, setRolSeleccionado] = useState<Rol | ''>('');

  // Campos Login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Campos Registro
  const [nombre, setNombre] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Campo Reset
  const [resetEmail, setResetEmail] = useState('');

  // Estados de control
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // ✅ Validación estricta sincronizada con el backend
  const validarCampo = (campo: string, valor: string) => {
    switch (campo) {
      case 'nombre':
        if (!valor.trim()) return 'El nombre es obligatorio.';
        if (valor.trim().length < 3) return 'Mínimo 3 caracteres.';
        if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .\-]+$/.test(valor)) return 'Solo letras, espacios y guiones.';
        return '';
      case 'regUsername':
        if (!valor.trim()) return 'El usuario es obligatorio.';
        if (!/^[a-z0-9_]{3,20}$/.test(valor)) return '3-20 caracteres, solo minúsculas, números y _.';
        return '';
      case 'regEmail':
        if (valor && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor)) return 'Formato de correo no válido.';
        return '';
      case 'regPassword':
        if (!valor) return 'La contraseña es obligatoria.';
        if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(valor)) {
          return 'Mín. 8 caracteres, 1 mayúscula, 1 número y 1 carácter especial (@, $, !, etc.).';
        }
        return '';
      case 'regConfirmPassword':
        if (valor !== regPassword) return 'Las contraseñas no coinciden.';
        return '';
      case 'resetEmail':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor)) return 'Formato de correo no válido.';
        return '';
      default:
        return '';
    }
  };

  const handleBlur = (campo: string, valor: string) => {
    setTouched((prev) => ({ ...prev, [campo]: true }));
    const error = validarCampo(campo, valor);
    setErrores((prev) => ({ ...prev, [campo]: error }));
  };

  const esLoginValido = useMemo(() => {
    return rolSeleccionado !== '' && username.trim().length >= 2 && password.trim().length >= 1;
  }, [rolSeleccionado, username, password]);

  const esRegistroValido = useMemo(() => {
    return (
      nombre.trim().length >= 3 &&
      /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .\-]+$/.test(nombre.trim()) &&
      /^[a-z0-9_]{3,20}$/.test(regUsername.trim()) &&
      /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(regPassword) &&
      regPassword === regConfirmPassword &&
      (regEmail === '' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(regEmail))
    );
  }, [nombre, regUsername, regPassword, regConfirmPassword, regEmail]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!esLoginValido) {
      setErrorMsg('Por favor, complete todos los campos obligatorios correctamente.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Credenciales incorrectas.');
      
      // ✅ Verificación de seguridad frontend adicional
      if (data.rol !== rolSeleccionado) {
        throw new Error(`Acceso denegado: Su rol asignado es ${data.rol}, no ${rolSeleccionado}.`);
      }

      guardarSesion({ id: data.id, nombre: data.nombre, username: data.username, email: data.email, rol: data.rol });
      setSuccessMsg(`✅ ¡Bienvenido, ${data.nombre}! Redirigiendo...`);
      
      // Pequeño delay para que el usuario vea el mensaje de éxito
      setTimeout(() => { 
        router.push('/'); 
        router.refresh(); 
      }, 800);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistro = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const nuevosErrores: Record<string, string> = {};
    ['nombre', 'regUsername', 'regEmail', 'regPassword', 'regConfirmPassword'].forEach((campo) => {
      const valor = campo === 'nombre' ? nombre : campo === 'regUsername' ? regUsername : campo === 'regEmail' ? regEmail : campo === 'regPassword' ? regPassword : regConfirmPassword;
      const error = validarCampo(campo, valor);
      if (error) nuevosErrores[campo] = error;
    });

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      setTouched({ nombre: true, regUsername: true, regEmail: true, regPassword: true, regConfirmPassword: true });
      setErrorMsg('Por favor, corrija los errores marcados antes de continuar.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim().toUpperCase(),
          username: regUsername.trim().toLowerCase(),
          password: regPassword.trim(),
          email: regEmail.trim().toLowerCase() || null,
          rol: 'PACIENTE', // ✅ El backend también lo fuerza, pero es bueno enviarlo
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar.');

      setSuccessMsg('✅ ¡Registro exitoso! Su cuenta está PENDIENTE DE APROBACIÓN por el administrador.');
      setNombre(''); setRegUsername(''); setRegPassword(''); setRegConfirmPassword(''); setRegEmail('');
      setTouched({}); setErrores({});
      
      setTimeout(() => { setModo('LOGIN'); setSuccessMsg(null); }, 4000);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const error = validarCampo('resetEmail', resetEmail);
    if (error) {
      setErrores({ resetEmail: error });
      setTouched({ resetEmail: true });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar la solicitud.');

      setSuccessMsg(`✅ Instrucciones enviadas al correo: ${resetEmail}`);
      setResetEmail('');
      setTouched({});
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const cambiarModo = (nuevoModo: 'LOGIN' | 'REGISTER' | 'RESET') => {
    setModo(nuevoModo);
    setErrorMsg(null);
    setSuccessMsg(null);
    setErrores({});
    setTouched({});
  };

  // ✅ Función de clases de input optimizada para accesibilidad y estética Refero
  const getInputClass = (campo: string, tieneValor: boolean) => {
    const base = "w-full bg-slate-950/50 border rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all duration-200 ";
    if (touched[campo] && errores[campo]) return base + "border-red-500/50 focus:border-red-500 focus:ring-red-500/20 bg-red-500/5";
    if (touched[campo] && !errores[campo] && tieneValor) return base + "border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20 bg-emerald-500/5";
    return base + "border-slate-800 focus:border-blue-500 focus:ring-blue-500/20 hover:border-slate-700";
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 font-sans selection:bg-blue-500/30">
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl space-y-6 shadow-2xl shadow-black/50 border border-slate-800/60 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* ✅ LOGO INTEGRADO CON FALLBACK ELEGANTE */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 mx-auto mb-2 relative group">
            {/* Efecto de brillo detrás del logo */}
            <div className="absolute inset-0 bg-linear-to-tr from-blue-600 to-cyan-400 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
            
            <div className="relative w-full h-full rounded-2xl bg-white p-2 shadow-xl flex items-center justify-center overflow-hidden">
              {/* Imagen del logo (se oculta si falla la carga) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/logo.png" 
                alt="Clínica Dental Ruzly" 
                className="w-full h-full object-contain z-10 relative"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {/* Fallback: Muestra la "R" estilizada si la imagen no carga o está cargando */}
              <div className="absolute inset-0 z-0 flex items-center justify-center bg-linear-to-tr from-blue-600 to-cyan-400 text-white font-black text-3xl rounded-xl">
                R
              </div>
            </div>
          </div>
          
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-tight">Clínica Dental Ruzly</h1>
            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider mt-1">Sistema de Gestión Integral</p>
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

        {/* Tabs de Navegación */}
        <div className="flex border-b border-slate-800 text-xs font-bold text-center">
          <button 
            type="button" 
            onClick={() => cambiarModo('LOGIN')} 
            className={`flex-1 pb-3 uppercase tracking-wider transition-all duration-200 cursor-pointer ${modo === 'LOGIN' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Ingresar
          </button>
          <button 
            type="button" 
            onClick={() => cambiarModo('REGISTER')} 
            className={`flex-1 pb-3 uppercase tracking-wider transition-all duration-200 cursor-pointer ${modo === 'REGISTER' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Registrarse
          </button>
        </div>

        {/* ========================================== */}
        {/* MODO 1: INICIAR SESIÓN */}
        {/* ========================================== */}
        {modo === 'LOGIN' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="rol" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Seleccione su Rol <span className="text-red-500">*</span></label>
              <select 
                id="rol"
                value={rolSeleccionado} 
                onChange={(e) => setRolSeleccionado(e.target.value as Rol)} 
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 uppercase cursor-pointer hover:border-slate-700"
              >
                <option value="">-- SELECCIONE UN ROL --</option>
                <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                <option value="ODONTOLOGO">ODONTÓLOGO</option>
                <option value="RECEPCIONISTA">RECEPCIONISTA</option>
                <option value="PACIENTE">PACIENTE</option>
              </select>
            </div>

            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Usuario o Correo <span className="text-red-500">*</span></label>
              <input 
                id="username"
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="mlopez o maria@ruzly.com" 
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-slate-700" 
                autoComplete="username" 
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Contraseña <span className="text-red-500">*</span></label>
                <button type="button" onClick={() => cambiarModo('RESET')} className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline uppercase font-semibold transition-colors cursor-pointer">¿Olvidaste tu contraseña?</button>
              </div>
              <div className="relative">
                <input 
                  id="password"
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 pr-12 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-slate-700" 
                  autoComplete="current-password" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors p-1"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={!esLoginValido || loading} 
              className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider shadow-lg shadow-blue-900/20 transition-all duration-200 cursor-pointer mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Verificando...
                </span>
              ) : 'Ingresar al Sistema'}
            </button>
          </form>
        )}

        {/* ========================================== */}
        {/* MODO 2: REGISTRARSE (Solo Pacientes) */}
        {/* ========================================== */}
        {modo === 'REGISTER' && (
          <form onSubmit={handleRegistro} className="space-y-4">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-300 text-xs font-medium flex items-start gap-2">
              <span className="mt-0.5">ℹ️</span>
              <span>El registro público está habilitado exclusivamente para <strong>PACIENTES</strong>. El personal clínico es registrado directamente por el administrador.</span>
            </div>

            <div>
              <label htmlFor="nombre" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Nombre Completo <span className="text-red-500">*</span></label>
              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .\-]/g, '').toUpperCase())}
                onBlur={(e) => handleBlur('nombre', e.target.value)}
                placeholder="Ej: María Fernanda López"
                maxLength={80}
                aria-invalid={!!(touched.nombre && errores.nombre)}
                aria-describedby={errores.nombre ? "error-nombre" : undefined}
                className={getInputClass('nombre', nombre.length > 0)}
              />
              {touched.nombre && errores.nombre && <p id="error-nombre" className="text-[11px] text-red-400 mt-1.5 font-medium flex items-center gap-1">⚠️ {errores.nombre}</p>}
            </div>

            <div>
              <label htmlFor="regUsername" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Nombre de Usuario <span className="text-red-500">*</span></label>
              <input
                id="regUsername"
                type="text"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value.replace(/[^a-z0-9_]/g, '').toLowerCase())}
                onBlur={(e) => handleBlur('regUsername', e.target.value)}
                placeholder="Ej: mlopez"
                maxLength={20}
                aria-invalid={!!(touched.regUsername && errores.regUsername)}
                aria-describedby={errores.regUsername ? "error-regUsername" : undefined}
                className={getInputClass('regUsername', regUsername.length > 0)}
              />
              {touched.regUsername && errores.regUsername && <p id="error-regUsername" className="text-[11px] text-red-400 mt-1.5 font-medium flex items-center gap-1">️ {errores.regUsername}</p>}
            </div>

            <div>
              <label htmlFor="regEmail" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Correo Electrónico <span className="text-slate-600 font-normal normal-case">(Opcional)</span></label>
              <input
                id="regEmail"
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value.replace(/\s/g, '').toLowerCase())}
                onBlur={(e) => handleBlur('regEmail', e.target.value)}
                placeholder="Ej: maria.lopez@gmail.com"
                maxLength={100}
                aria-invalid={!!(touched.regEmail && errores.regEmail)}
                aria-describedby={errores.regEmail ? "error-regEmail" : undefined}
                className={getInputClass('regEmail', regEmail.length > 0)}
              />
              {touched.regEmail && errores.regEmail && <p id="error-regEmail" className="text-[11px] text-red-400 mt-1.5 font-medium flex items-center gap-1">️ {errores.regEmail}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="regPassword" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Contraseña <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    id="regPassword"
                    type={showRegPassword ? "text" : "password"}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    onBlur={(e) => handleBlur('regPassword', e.target.value)}
                    placeholder="Mín. 8 caracteres"
                    maxLength={100}
                    aria-invalid={!!(touched.regPassword && errores.regPassword)}
                    aria-describedby={errores.regPassword ? "error-regPassword" : undefined}
                    className={`${getInputClass('regPassword', regPassword.length > 0)} pr-10`}
                  />
                  <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors p-1" aria-label="Mostrar contraseña">
                    {showRegPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {touched.regPassword && errores.regPassword && <p id="error-regPassword" className="text-[11px] text-red-400 mt-1.5 font-medium flex items-center gap-1">⚠️ {errores.regPassword}</p>}
              </div>
              <div>
                <label htmlFor="regConfirmPassword" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Confirmar <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    id="regConfirmPassword"
                    type={showRegConfirmPassword ? "text" : "password"}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    onBlur={(e) => handleBlur('regConfirmPassword', e.target.value)}
                    placeholder="Repetir"
                    maxLength={100}
                    aria-invalid={!!(touched.regConfirmPassword && errores.regConfirmPassword)}
                    aria-describedby={errores.regConfirmPassword ? "error-regConfirmPassword" : undefined}
                    className={`${getInputClass('regConfirmPassword', regConfirmPassword.length > 0)} pr-10`}
                  />
                  <button type="button" onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors p-1" aria-label="Mostrar contraseña">
                    {showRegConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {touched.regConfirmPassword && errores.regConfirmPassword && <p id="error-regConfirmPassword" className="text-[11px] text-red-400 mt-1.5 font-medium flex items-center gap-1">⚠️ {errores.regConfirmPassword}</p>}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={!esRegistroValido || loading} 
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider shadow-lg shadow-emerald-900/20 transition-all duration-200 cursor-pointer mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Registrando...
                </span>
              ) : 'Crear Cuenta de Paciente'}
            </button>
          </form>
        )}

        {/* ========================================== */}
        {/* MODO 3: RESTABLECER CONTRASEÑA */}
        {/* ========================================== */}
        {modo === 'RESET' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-sm text-slate-300 leading-relaxed">Ingresa tu correo electrónico registrado para recibir las instrucciones de recuperación de contraseña:</p>
            <div>
              <label htmlFor="resetEmail" className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Correo Electrónico <span className="text-red-500">*</span></label>
              <input
                id="resetEmail"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value.replace(/\s/g, '').toLowerCase())}
                onBlur={(e) => handleBlur('resetEmail', e.target.value)}
                placeholder="Ej: maria.lopez@gmail.com"
                aria-invalid={!!(touched.resetEmail && errores.resetEmail)}
                aria-describedby={errores.resetEmail ? "error-resetEmail" : undefined}
                className={getInputClass('resetEmail', resetEmail.length > 0)}
              />
              {touched.resetEmail && errores.resetEmail && <p id="error-resetEmail" className="text-[11px] text-red-400 mt-1.5 font-medium flex items-center gap-1">️ {errores.resetEmail}</p>}
            </div>
            <button 
              type="submit" 
              disabled={loading || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(resetEmail)} 
              className="w-full bg-purple-600 hover:bg-purple-500 active:scale-[0.98] disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-sm uppercase tracking-wider shadow-lg shadow-purple-900/20 transition-all duration-200 cursor-pointer mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Enviando...
                </span>
              ) : 'Enviar Enlace de Recuperación'}
            </button>
            <button 
              type="button" 
              onClick={() => cambiarModo('LOGIN')} 
              className="w-full text-xs text-slate-400 hover:text-white uppercase font-semibold text-center block cursor-pointer transition-colors py-2 hover:bg-slate-800/50 rounded-lg"
            >
              ← Volver al Inicio de Sesión
            </button>
          </form>
        )}

        {/* Enlace inferior de cambio de modo */}
        <div className="text-center pt-4 border-t border-slate-800/60">
          {modo === 'LOGIN' ? (
            <p className="text-sm text-slate-400">¿No tienes cuenta? <button type="button" onClick={() => cambiarModo('REGISTER')} className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer transition-colors hover:underline">Registrarse como paciente</button></p>
          ) : modo === 'REGISTER' ? (
            <p className="text-sm text-slate-400">¿Ya tienes cuenta? <button type="button" onClick={() => cambiarModo('LOGIN')} className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer transition-colors hover:underline">Iniciar Sesión</button></p>
          ) : null}
        </div>
      </div>
    </div>
  );
}