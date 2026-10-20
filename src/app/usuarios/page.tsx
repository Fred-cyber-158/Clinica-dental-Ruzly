'use client';

import { useState, useEffect } from 'react';

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

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulario nuevo usuario o edición
  const [nombre, setNombre] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState('ODONTO_LOGO');
  
  // Control de estado, edición y notificaciones
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [campoError, setCampoError] = useState<'nombre' | 'username' | 'password' | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function cargarUsuarios() {
      try {
        const res = await fetch('/api/usuarios');
        if (res.ok && isMounted) {
          const data = await res.json();
          setUsuarios(data);
        }
      } catch (err) {
        console.error('Error al cargar usuarios:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    cargarUsuarios();
    return () => {
      isMounted = false;
    };
  }, []);

  const sugerirPassword = (nombreCompleto: string) => {
    const partes = nombreCompleto.trim().split(/\s+/);
    if (partes.length > 0 && partes[0].length >= 2) {
      const primerNombre = partes[0];
      const pri = primerNombre.charAt(0).toUpperCase();
      const ult = primerNombre.charAt(primerNombre.length - 1).toUpperCase();
      return `${pri}123456${ult}`;
    }
    return '';
  };

  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNombre(val);
    if (campoError === 'nombre') setCampoError(null);
    if (!editandoId) {
      const sugerida = sugerirPassword(val);
      if (sugerida && !password) {
        setPassword(sugerida);
      }
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[@\s]/g, '').toLowerCase();
    setUsername(val);
    if (campoError === 'username') setCampoError(null);
  };

  // Cargar datos en el formulario para editar
  const iniciarEdicion = (u: Usuario) => {
    setEditandoId(u.id);
    setNombre(u.nombre);
    setUsername(u.username);
    setPassword(''); // Opcional al editar
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
    setRol('ODONTO_LOGO');
    setErrorMsg(null);
    setCampoError(null);
  };

  const handleGuardarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setCampoError(null);

    if (!nombre.trim()) {
      setCampoError('nombre');
      setErrorMsg('⚠️ Error: Debes ingresar el Nombre Completo.');
      return;
    }

    if (!username.trim() || username.trim().length < 3) {
      setCampoError('username');
      setErrorMsg('⚠️ Error en el usuario: Debe tener al menos 3 caracteres.');
      return;
    }

    if (!editandoId && (!password.trim() || password.trim().length < 6)) {
      setCampoError('password');
      setErrorMsg('⚠️ Error en la contraseña: Debe contener al menos 6 caracteres.');
      return;
    }

    setGuardando(true);
    try {
      const url = editandoId ? `/api/usuarios/${editandoId}` : '/api/usuarios';
      const method = editandoId ? 'PATCH' : 'POST';

      const bodyData: BodyData = {
        nombre: nombre.trim().toUpperCase(),
        username: username.trim().toLowerCase(),
        email: email.trim() ? email.trim().toLowerCase() : null,
        rol,
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
        if (data.error && data.error.includes('usuario')) {
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

      // Recargar listado
      const resList = await fetch('/api/usuarios');
      if (resList.ok) {
        const dataList = await resList.json();
        setUsuarios(dataList);
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      setErrorMsg(errorObj.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleActivo = async (id: string, estadoActual: boolean) => {
    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !estadoActual }),
      });
      if (res.ok) {
        const resList = await fetch('/api/usuarios');
        if (resList.ok) {
          const dataList = await resList.json();
          setUsuarios(dataList);
        }
      }
    } catch (err) {
      console.error('Error al cambiar estado:', err);
    }
  };

  if (loading) return <div className="p-8 text-slate-400">Cargando gestión de usuarios...</div>;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">Gestión de Usuarios y Roles</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 uppercase">Control de accesos para Administradores, Odontólogos, Recepcionistas y Pacientes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario */}
        <div className="bg-[#0d1527] border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 h-fit">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h2 className="text-sm font-bold text-white uppercase">
              {editandoId ? '✏️ Editar Usuario' : 'Registrar Nuevo Usuario'}
            </h2>
            {editandoId && (
              <button
                type="button"
                onClick={cancelarEdicion}
                className="text-[10px] text-red-400 hover:text-red-300 uppercase font-bold underline cursor-pointer"
              >
                Cancelar
              </button>
            )}
          </div>
          
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/40 rounded-xl text-red-400 text-xs font-bold leading-relaxed shadow-md">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/40 rounded-xl text-emerald-400 text-xs font-bold leading-relaxed shadow-md">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleGuardarUsuario} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold">Nombre Completo *</label>
              <input
                type="text"
                value={nombre}
                onChange={handleNombreChange}
                placeholder="EJ: RUZLAN TORRES ROSAS"
                className={`w-full bg-slate-900 border rounded-lg p-2.5 text-xs text-white uppercase transition-colors ${
                  campoError === 'nombre' ? 'border-red-500 bg-red-500/10' : 'border-slate-700 focus:border-blue-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold">Nombre de Usuario (@username) *</label>
              <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                placeholder="EJ: rtorres"
                className={`w-full bg-slate-900 border rounded-lg p-2.5 text-xs text-white lowercase transition-colors ${
                  campoError === 'username' ? 'border-red-500 bg-red-500/10' : 'border-slate-700 focus:border-blue-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold">
                Contraseña {editandoId ? '(Opcional al editar)' : '*'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (campoError === 'password') setCampoError(null);
                }}
                placeholder="••••••••"
                className={`w-full bg-slate-900 border rounded-lg p-2.5 text-xs text-white transition-colors ${
                  campoError === 'password' ? 'border-red-500 bg-red-500/10' : 'border-slate-700 focus:border-blue-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold">Correo Electrónico (Opcional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ruzlan.torres@ruzly.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white lowercase focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold">Rol en el Sistema *</label>
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white uppercase cursor-pointer focus:border-blue-500"
              >
                <option value="ODONTO_LOGO">ODONTÓLOGO ESPECIALISTA</option>
                <option value="RECEPCIONISTA">RECEPCIONISTA Y CAJA</option>
                <option value="PACIENTE">PACIENTE REGISTRADO</option>
                <option value="ADMINISTRADOR">ADMINISTRADOR GENERAL</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={guardando}
              className={`w-full font-bold py-2.5 rounded-lg text-xs uppercase shadow transition-colors cursor-pointer text-white ${
                editandoId ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'
              } disabled:bg-slate-800`}
            >
              {guardando ? 'Guardando...' : editandoId ? 'Actualizar Usuario' : 'Crear Usuario'}
            </button>
          </form>
        </div>

        {/* Listado de Usuarios con Botón de Edición */}
        <div className="lg:col-span-2 bg-[#0d1527] border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white uppercase border-b border-slate-800 pb-2">
            Usuarios Registrados ({usuarios.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase">
                  <th className="pb-3">Nombre</th>
                  <th className="pb-3">Usuario</th>
                  <th className="pb-3">Rol</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/40">
                    <td className="py-3 font-bold text-white uppercase">{u.nombre}</td>
                    <td className="py-3 text-slate-300 font-mono">@{u.username}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold border uppercase bg-blue-500/10 text-blue-400 border-blue-500/30">
                        {u.rol}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                          u.activo
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}
                      >
                        {u.activo ? 'ACTIVO' : 'BAJA'}
                      </span>
                    </td>
                    <td className="py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => iniciarEdicion(u)}
                        className="px-2.5 py-1 rounded text-[10px] font-semibold uppercase border bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30 cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActivo(u.id, u.activo)}
                        className={`px-2.5 py-1 rounded text-[10px] font-semibold uppercase border transition-colors cursor-pointer ${
                          u.activo
                            ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {u.activo ? 'Dar de Baja' : 'Reactivar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}