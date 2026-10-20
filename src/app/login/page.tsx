'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface RolPerfil {
  id: string;
  nombrePerfil: string;
  rol: 'ADMINISTRADOR' | 'ODONTOLOGO' | 'RECEPCIONISTA' | 'PACIENTE';
  emailAsociado: string;
  avatar: string;
  descripcion: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<'LOGIN' | 'REGISTER' | 'RESET'>('LOGIN');

  // Campos de Formulario
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rolSeleccionado, setRolSeleccionado] = useState<RolPerfil | null>(null);

  // Estados de control y alertas
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modales
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  // Perfiles / Roles del Sistema
  const perfilesDisponibles: RolPerfil[] = [
    {
      id: 'admin',
      nombrePerfil: 'ADMINISTRADOR GENERAL',
      rol: 'ADMINISTRADOR',
      emailAsociado: 'admin@ruzly.com',
      avatar: 'A',
      descripcion: 'Control total del sistema, usuarios, precios y reportes gerenciales',
    },
    {
      id: 'odontologo',
      nombrePerfil: 'ODONTÓLOGO ESPECIALISTA',
      rol: 'ODONTOLOGO',
      emailAsociado: 'odontologo@ruzly.com',
      avatar: 'O',
      descripcion: 'Odontograma interactivo, cuaderno digital y recetario médico',
    },
    {
      id: 'recepcion',
      nombrePerfil: 'RECEPCIÓN Y CAJA',
      rol: 'RECEPCIONISTA',
      emailAsociado: 'recepcion@ruzly.com',
      avatar: 'R',
      descripcion: 'Agendamiento de citas, registro de pacientes y cobros en caja',
    },
    {
      id: 'paciente',
      nombrePerfil: 'PACIENTE REGISTRADO',
      rol: 'PACIENTE',
      emailAsociado: 'finconflr@gmail.com',
      avatar: 'P',
      descripcion: 'Consulta personal de citas programadas e historial de pagos',
    },
  ];

  const esEmailValido = (correo: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());
  };

  const esLoginValido = useMemo(() => {
    return email.trim().length >= 3 && password.trim().length >= 1;
  }, [email, password]);

  const esRegistroValido = useMemo(() => {
    return (
      nombre.trim().length >= 3 &&
      esEmailValido(email) &&
      password.trim().length >= 6 &&
      password === confirmPassword
    );
  }, [nombre, email, password, confirmPassword]);

  // Validar y procesar el inicio de sesión
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!esLoginValido) {
      setErrorMsg('Por favor, ingrese un correo y contraseña válidos.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: email.trim().toLowerCase(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Credenciales incorrectas. Verifique su correo o contraseña.');
      }

      const usuarioSesion = {
        ...data,
        rol: rolSeleccionado ? rolSeleccionado.rol : data.rol,
      };

      localStorage.setItem('usuario_activo', JSON.stringify(usuarioSesion));
      setSuccessMsg(`¡Bienvenido ${usuarioSesion.nombre}! ROL: ${usuarioSesion.rol}. Redirigiendo...`);

      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 800);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Selección de Perfil / Rol
  const seleccionarPerfilRol = (perfil: RolPerfil) => {
    setShowRolesModal(false);
    setRolSeleccionado(perfil);
    setEmail(perfil.emailAsociado);
    setErrorMsg(null);
    setSuccessMsg(`Perfil seleccionado: ${perfil.nombrePerfil}. Ingrese su contraseña.`);
  };

  // Login Inmediato por Google
  const seleccionarCuentaGoogle = (correoGoogle: string) => {
    setShowGoogleModal(false);
    setLoading(true);

    setTimeout(() => {
      const rolFinal = rolSeleccionado ? rolSeleccionado.rol : 'ADMINISTRADOR';
      const nombreFinal = rolSeleccionado ? rolSeleccionado.nombrePerfil : 'FREDDY LEDEZMA ROSAS';

      const usuarioGoogle = {
        nombre: nombreFinal,
        username: correoGoogle,
        email: correoGoogle,
        rol: rolFinal,
      };

      localStorage.setItem('usuario_activo', JSON.stringify(usuarioGoogle));
      setSuccessMsg(`¡Sesión iniciada con Google (${correoGoogle})! ROL: ${rolFinal}. Redirigiendo...`);

      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 800);
    }, 400);
  };

  // Restablecer Contraseña
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!esEmailValido(email)) {
      setErrorMsg('Ingrese un correo electrónico válido.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar la solicitud.');

      setSuccessMsg(`✅ Instrucciones enviadas al correo: ${email}`);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 font-sans relative">
      <div className="w-full max-w-md bg-[#0d1527] p-8 rounded-2xl space-y-6 shadow-2xl border border-slate-800">
        
        {/* Logo de la Clínica Dental Ruzly */}
        <div className="text-center space-y-2">
          <div className="flex justify-center items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/logo.png" 
              alt="Logo Clínica Dental Ruzly" 
              className="h-16 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
                const fallback = document.getElementById('login-logo-fallback');
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div 
              id="login-logo-fallback" 
              className="hidden w-12 h-12 rounded-xl bg-linear-to-tr from-blue-600 to-cyan-400 mx-auto items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-500/20"
            >
              R
            </div>
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight mt-1">CLÍNICA DENTAL RUZLY</h1>
          <p className="text-xs text-slate-400 uppercase font-semibold">Acceso al Sistema de Gestión Integral</p>
        </div>

        {/* Tabs Navegación */}
        <div className="flex border-b border-slate-800 text-xs font-bold text-center">
          <button
            type="button"
            onClick={() => { setModo('LOGIN'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 pb-2 uppercase transition-colors cursor-pointer ${
              modo === 'LOGIN' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Ingresar
          </button>
          <button
            type="button"
            onClick={() => { setModo('REGISTER'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 pb-2 uppercase transition-colors cursor-pointer ${
              modo === 'REGISTER' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Notificaciones de Alertas en Pantalla */}
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold text-center uppercase">
            ⚠️ {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold text-center uppercase">
            {successMsg}
          </div>
        )}

        {/* SELECCIÓN DE PERFIL Y GOOGLE */}
        {modo !== 'RESET' && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowRolesModal(true)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold py-2.5 rounded-xl text-xs uppercase cursor-pointer transition-all shadow-md"
            >
              🔑 {rolSeleccionado ? `Perfil: ${rolSeleccionado.nombrePerfil}` : '1. Seleccionar Perfil / Rol de Acceso'}
            </button>

            <button
              type="button"
              onClick={() => setShowGoogleModal(true)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-semibold py-2.5 rounded-xl text-xs uppercase cursor-pointer shadow transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Continuar con Google
            </button>

            <div className="flex items-center gap-2 my-2">
              <div className="flex-1 border-t border-slate-800"></div>
              <span className="text-[10px] text-slate-500 uppercase">o con tu correo y contraseña</span>
              <div className="flex-1 border-t border-slate-800"></div>
            </div>
          </div>
        )}

        {/* MODO 1: INICIAR SESIÓN (FORMULARIO MANUAL) */}
        {modo === 'LOGIN' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold">Correo Electrónico *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="finconflr@gmail.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 lowercase"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-slate-400 font-semibold">Contraseña *</label>
                <button
                  type="button"
                  onClick={() => { setModo('RESET'); setErrorMsg(null); setSuccessMsg(null); }}
                  className="text-[10px] text-blue-400 hover:underline uppercase cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={!esLoginValido || loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs uppercase shadow-lg transition-colors cursor-pointer"
            >
              {loading ? 'Verificando Acceso...' : 'Ingresar al Sistema'}
            </button>
          </form>
        )}

        {/* MODO 2: REGISTRARSE */}
        {modo === 'REGISTER' && (
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold">Nombre Completo *</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="EJ: CARLOS PÉREZ"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white uppercase"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold">Correo Electrónico *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu_correo@gmail.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white lowercase"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold">Contraseña (Mín. 6 caracteres) *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold">Confirmar Contraseña *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white"
              />
            </div>

            <button
              type="submit"
              disabled={!esRegistroValido || loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs uppercase shadow-lg transition-colors cursor-pointer"
            >
              {loading ? 'Creando cuenta...' : 'Crear Mi Cuenta'}
            </button>
          </form>
        )}

        {/* MODO 3: RESTABLECER CONTRASEÑA */}
        {modo === 'RESET' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-xs text-slate-300">
              Ingresa tu correo electrónico registrado para enviarte las instrucciones de recuperación:
            </p>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold">Correo Electrónico *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="finconflr@gmail.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white lowercase"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !esEmailValido(email)}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl text-xs uppercase cursor-pointer"
            >
              {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
            </button>

            <button
              type="button"
              onClick={() => { setModo('LOGIN'); setErrorMsg(null); setSuccessMsg(null); }}
              className="w-full text-xs text-slate-400 hover:text-white uppercase font-semibold text-center block cursor-pointer"
            >
              ← Volver al Inicio de Sesión
            </button>
          </form>
        )}

      </div>

      {/* MODAL 1: SELECCIÓN DE PERFIL / ROL */}
      {showRolesModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-sm space-y-4 text-white shadow-2xl">
            <div className="text-center">
              <h2 className="text-sm font-bold uppercase text-blue-400">Selecciona tu Rol de Acceso</h2>
              <p className="text-xs text-slate-400 mt-1">Elige el perfil operativo con el que ingresarás al sistema</p>
            </div>

            <div className="space-y-2.5">
              {perfilesDisponibles.map((perfil) => (
                <button
                  key={perfil.id}
                  onClick={() => seleccionarPerfilRol(perfil)}
                  className="w-full flex items-start gap-3 p-3 bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 rounded-xl text-left cursor-pointer transition-all hover:border-blue-500/50 group"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-600 group-hover:bg-blue-500 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                    {perfil.avatar}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-white group-hover:text-blue-300">{perfil.nombrePerfil}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{perfil.descripcion}</p>
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowRolesModal(false)}
              className="w-full text-center text-xs text-slate-400 hover:text-white pt-2 cursor-pointer uppercase font-semibold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: VINCULACIÓN Y ACCESO CON GOOGLE */}
      {showGoogleModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-sm space-y-4 text-white shadow-2xl">
            <div className="text-center">
              <h2 className="text-sm font-bold uppercase text-white">Continuar con Google</h2>
              <p className="text-xs text-slate-400 mt-1">Selecciona la cuenta para ingresar inmediatamente</p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => seleccionarCuentaGoogle('admin@ruzly.com')}
                className="w-full p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-left cursor-pointer transition-colors border border-slate-700/50"
              >
                <p className="text-xs font-bold uppercase">Cuenta Principal Clínica</p>
                <p className="text-[10px] text-slate-400">admin@ruzly.com</p>
              </button>

              <button
                type="button"
                onClick={() => seleccionarCuentaGoogle('finconflr@gmail.com')}
                className="w-full p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-left cursor-pointer transition-colors border border-slate-700/50"
              >
                <p className="text-xs font-bold uppercase">Cuenta Personal</p>
                <p className="text-[10px] text-slate-400">finconflr@gmail.com</p>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowGoogleModal(false)}
              className="w-full text-center text-xs text-slate-400 hover:text-white pt-2 cursor-pointer uppercase font-semibold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}