'use client';

import { useState, useEffect, useCallback } from 'react';
import { claseInput } from '@/components/Campo';

interface Usuario {
  id: string;
  nombre: string;
  username: string;
  email: string | null;
  rol: string;
  activo: boolean;
  createdAt: string;
}

interface BodyData {
  nombre: string;
  username: string;
  email: string | null;
  rol: string;
  password?: string;
}

// ✅ MEJORA CRÍTICA: Regex de contraseña fuerte alineada con el backend
const RE_PASSWORD = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState('ODONTOLOGO');
  const [mostrarPassword, setMostrarPassword] = useState(false);

  // Estados de control
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [campoError, setCampoError] = useState<'nombre' | 'username' | 'password' | 'email' | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const cargarUsuarios = useCallback(async () => {
    try {
      const res = await fetch('/api/usuarios');
      if (res.ok) {
        const data = await res.json();
        setUsuarios(Array.isArray(data) ? data : []);
      } else {
        setErrorMsg('No se pudo cargar la lista de usuarios.');
      }
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      setErrorMsg('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      cargarUsuarios();
    }
    return () => {
      isMounted = false;
    };
  }, [cargarUsuarios]);

  // ✅ MEJORA: Genera una contraseña que SÍ cumple con la política de seguridad del backend
  const sugerirPassword = (nombreCompleto: string) => {
    const partes = nombreCompleto.trim().split(/\s+/);
    if (partes.length > 0 && partes[0].length >= 3) {
      const prefijo = partes[0].substring(0, 3).toUpperCase();
      return `${prefijo}2024!`; // Ej: "RUZ2024!" (8 chars, mayúscula, número, especial)
    }
    return 'Ruzly2024!';
  };

  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const limpio = e.target.value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .]/g, '').toUpperCase();
    setNombre(limpio);
    if (campoError === 'nombre') setCampoError(null);
    
    if (!editandoId && limpio.length >= 3 && !password) {
      setPassword(sugerirPassword(limpio));
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const limpio = e.target.value.replace(/[^a-z0-9_]/g, '').toLowerCase();
    setUsername(limpio);
    if (campoError === 'username') setCampoError(null);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const limpio = e.target.value.replace(/\s/g, '').toLowerCase();
    setEmail(limpio);
    if (campoError === 'email') setCampoError(null);
  };

  const iniciarEdicion = (u: Usuario) => {
    setEditandoId(u.id);
    setNombre(u.nombre);
    setUsername(u.username);
    setPassword('');
    setEmail(u.email || '');
    setRol(u.rol);
    setErrorMsg(null);
    setSuccessMsg(null);
    setCampoError(null);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setNombre('');
    setUsername('');
    setPassword('');
    setEmail('');
    setRol('ODONTOLOGO');
    setErrorMsg(null);
    setSuccessMsg(null);
    setCampoError(null);
  };

  const handleGuardarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setCampoError(null);

    if (!nombre.trim() || nombre.trim().length < 3) {
      setCampoError('nombre');
      setErrorMsg('⚠️ El nombre completo debe tener al menos 3 caracteres.');
      return;
    }
    if (!username.trim() || username.trim().length < 3) {
      setCampoError('username');
      setErrorMsg('⚠️ El nombre de usuario debe tener al menos 3 caracteres (solo minúsculas, números y _).');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setCampoError('email');
      setErrorMsg('⚠️ El formato del correo electrónico no es válido.');
      return;
    }
    // ✅ VALIDACIÓN DE CONTRASEÑA FUERTE ALINEADA CON EL BACKEND
    if (!editandoId && (!password.trim() || !RE_PASSWORD.test(password))) {
      setCampoError('password');
      setErrorMsg('⚠️ La contraseña debe tener al menos 8 caracteres, 1 mayúscula, 1 número y 1 carácter especial (@, $, !, etc.).');
      return;
    }

    setGuardando(true);
    try {
      const url = editandoId ? `/api/usuarios/${editandoId}` : '/api/usuarios';
      const method = editandoId ? 'PATCH' : 'POST';
      
      const bodyData: BodyData = {
        nombre: nombre.trim(),
        username: username.trim(),
        email: email.trim() || null,
        rol: rol,
      };
      
      if (password.trim()) {
        bodyData.password = password.trim();
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();
      
      if (!res.ok) {
        if (data.error && data.error.toLowerCase().includes('usuario')) {
          setCampoError('username');
        }
        throw new Error(data.error || 'Ocurrió un fallo al procesar en la base de datos.');
      }

      setSuccessMsg(
        editandoId
          ? `✅ ¡Usuario "${data.nombre}" actualizado correctamente!`
          : `✅ ¡Usuario "${data.nombre}" (@${data.username}) registrado exitosamente!`
      );

      cancelarEdicion();
      await cargarUsuarios();
      
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setErrorMsg(errorObj.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleActivo = async (id: string, estadoActual: boolean) => {
    const accion = estadoActual ? 'dar de baja' : 'reactivar';
    if (!confirm(`¿Está seguro de que desea ${accion} a este usuario?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !estadoActual }),
      });
      
      if (res.ok) {
        await cargarUsuarios();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || `No se pudo ${accion} el usuario.`);
      }
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      setErrorMsg('Error de conexión al cambiar el estado.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium animate-pulse">Cargando gestión de usuarios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Encabezado */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">
          Gestión de Usuarios y Roles
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 uppercase">
          Control de accesos para Administradores, Odontólogos, Recepcionistas y Pacientes
        </p>
      </div>

      {/* Notificaciones Globales */}
      {errorMsg && (
        <div role="alert" className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs font-bold leading-relaxed shadow-md flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>⚠️</span> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div role="status" className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-bold leading-relaxed shadow-md flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>✅</span> {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ========================================== */}
        {/* FORMULARIO DE CREACIÓN / EDICIÓN */}
        {/* ========================================== */}
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 h-fit backdrop-blur-sm">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              {editandoId ? '✏️ Editar Usuario' : '➕ Registrar Nuevo Usuario'}
            </h2>
            {editandoId && (
              <button
                type="button"
                onClick={cancelarEdicion}
                className="text-[10px] text-red-400 hover:text-red-300 uppercase font-bold underline cursor-pointer transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>

          <form onSubmit={handleGuardarUsuario} className="space-y-4" noValidate>
            {/* NOMBRE */}
            <div>
              <label htmlFor="nombre" className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">
                Nombre Completo <span className="text-red-400">*</span>
              </label>
              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={handleNombreChange}
                placeholder="EJ: RUZLAN TORRES ROSAS"
                maxLength={80}
                aria-invalid={!!campoError}
                className={claseInput(campoError === 'nombre')}
              />
              {campoError === 'nombre' && (
                <p className="text-[10px] text-red-400 mt-1.5 font-semibold flex items-center gap-1">
                  <span>⚠️</span> Solo letras y espacios.
                </p>
              )}
            </div>

            {/* USERNAME */}
            <div>
              <label htmlFor="username" className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">
                Nombre de Usuario <span className="text-red-400">*</span>
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={handleUsernameChange}
                placeholder="EJ: rtorres"
                maxLength={20}
                aria-invalid={!!campoError}
                className={claseInput(campoError === 'username')}
              />
              {campoError === 'username' && (
                <p className="text-[10px] text-red-400 mt-1.5 font-semibold flex items-center gap-1">
                  <span>⚠️</span> Mín. 3 caracteres, solo minúsculas, números y _.
                </p>
              )}
            </div>

            {/* CONTRASEÑA */}
            <div>
              <label htmlFor="password" className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">
                Contraseña {editandoId ? '(Dejar en blanco para no cambiar)' : <span className="text-red-400">*</span>}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (campoError === 'password') setCampoError(null);
                  }}
                  placeholder="••••••••"
                  maxLength={100}
                  aria-invalid={!!campoError}
                  className={`${claseInput(campoError === 'password')} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors p-1"
                  aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {mostrarPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {/* ✅ MEJORA UX: Texto de ayuda para la política de contraseñas */}
              {!editandoId && (
                <p className="text-[10px] text-slate-500 mt-1.5 flex items-start gap-1">
                  <span>ℹ️</span> Mínimo 8 caracteres, 1 mayúscula, 1 número y 1 carácter especial (@, $, !, etc.).
                </p>
              )}
              {campoError === 'password' && (
                <p className="text-[10px] text-red-400 mt-1.5 font-semibold flex items-center gap-1">
                  <span>⚠️</span> La contraseña no cumple con los requisitos de seguridad.
                </p>
              )}
            </div>

            {/* EMAIL */}
            <div>
              <label htmlFor="email" className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">
                Correo Electrónico <span className="text-slate-600 font-normal normal-case">(Opcional)</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="ruzlan.torres@ruzly.com"
                maxLength={100}
                aria-invalid={!!campoError}
                className={claseInput(campoError === 'email')}
              />
              {campoError === 'email' && (
                <p className="text-[10px] text-red-400 mt-1.5 font-semibold flex items-center gap-1">
                  <span>⚠️</span> Formato de correo no válido.
                </p>
              )}
            </div>

            {/* ROL */}
            <div>
              <label htmlFor="rol" className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">
                Rol en el Sistema <span className="text-red-400">*</span>
              </label>
              <select
                id="rol"
                value={rol}
                onChange={(e) => setRol(e.target.value)}
                className={`${claseInput(false)} cursor-pointer`}
              >
                <option value="ADMINISTRADOR">ADMINISTRADOR GENERAL</option>
                <option value="ODONTOLOGO">ODONTÓLOGO ESPECIALISTA</option>
                <option value="RECEPCIONISTA">RECEPCIONISTA Y CAJA</option>
                <option value="PACIENTE">PACIENTE REGISTRADO</option>
              </select>
            </div>

            {/* BOTÓN DE ACCIÓN */}
            <button
              type="submit"
              disabled={guardando}
              className={`w-full font-bold py-3 rounded-xl text-xs uppercase shadow-lg transition-all duration-200 cursor-pointer text-white mt-2 flex items-center justify-center gap-2 active:scale-[0.98] ${
                editandoId 
                  ? 'bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500' 
                  : 'bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500'
              } disabled:cursor-not-allowed`}
            >
              {guardando ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Procesando...
                </>
              ) : editandoId ? 'Actualizar Usuario' : 'Crear Usuario'}
            </button>
          </form>
        </div>

        {/* ========================================== */}
        {/* LISTADO DE USUARIOS */}
        {/* ========================================== */}
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-3 tracking-wider">
            Usuarios Registrados ({usuarios.length})
          </h2>

          {usuarios.length === 0 ? (
            <div className="text-center py-12 text-slate-500 uppercase text-xs font-semibold border border-dashed border-slate-800 rounded-xl flex flex-col items-center gap-3">
              <span className="text-3xl opacity-50">👥</span>
              No hay usuarios registrados en el sistema.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-950 text-slate-400 uppercase">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Nombre</th>
                    <th className="py-3 px-4 font-semibold">Usuario</th>
                    <th className="py-3 px-4 font-semibold">Rol</th>
                    <th className="py-3 px-4 font-semibold">Estado</th>
                    <th className="py-3 px-4 text-right font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/30">
                  {usuarios.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-white uppercase">{u.nombre}</td>
                      <td className="py-3 px-4 text-slate-300 font-mono">@{u.username}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold border uppercase ${
                          u.rol === 'ADMINISTRADOR' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                          u.rol === 'ODONTOLOGO' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                          u.rol === 'RECEPCIONISTA' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                          'bg-purple-500/10 text-purple-400 border-purple-500/30'
                        }`}>
                          {u.rol}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold border uppercase ${
                          u.activo
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}>
                          {u.activo ? 'ACTIVO' : 'BAJA'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => iniciarEdicion(u)}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase border bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30 cursor-pointer transition-all active:scale-[0.98]"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActivo(u.id, u.activo)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase border transition-all active:scale-[0.98] cursor-pointer ${
                              u.activo
                                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {u.activo ? 'Dar de Baja' : 'Reactivar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}