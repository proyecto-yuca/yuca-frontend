import { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import usuariosService from '../../services/usuarios/usuariosService';
import rolesService from '../../services/permisos/rolesService';
import { isApiError } from '../../services/api/ApiError';
import { useAuth } from '../../hooks/useAuth';
import type { Usuario, UsuarioFormData } from '../../types/usuarios.types';
import type { Rol } from '../../types/permisos.types';

const EMPTY_FORM: UsuarioFormData = {
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  rol_id: '',
};

function usuarioToForm(usuario: Usuario): UsuarioFormData {
  return {
    name: usuario.name,
    email: usuario.email,
    password: '',
    password_confirmation: '',
    rol_id: usuario.rol.id,
  };
}

function validateForm(form: UsuarioFormData, isEdit: boolean): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = 'El nombre es requerido';
  if (!form.email.trim()) {
    errors.email = 'El correo es requerido';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Ingresa un correo válido';
  }
  if (!form.rol_id) errors.rol_id = 'Selecciona un rol';
  if (!isEdit) {
    if (!form.password) errors.password = 'La contraseña es requerida';
    else if (form.password.length < 6) errors.password = 'Mínimo 6 caracteres';
    if (!form.password_confirmation) errors.password_confirmation = 'Confirma la contraseña';
    else if (form.password !== form.password_confirmation) errors.password_confirmation = 'Las contraseñas no coinciden';
  }
  return errors;
}

function validatePassword(pw: string, pwConf: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!pw) errors.password = 'La contraseña es requerida';
  else if (pw.length < 6) errors.password = 'Mínimo 6 caracteres';
  if (!pwConf) errors.password_confirmation = 'Confirma la contraseña';
  else if (pw !== pwConf) errors.password_confirmation = 'Las contraseñas no coinciden';
  return errors;
}

// ── RowMenu ───────────────────────────────────────────────────────────────────

interface RowMenuProps {
  usuario: Usuario;
  isSelf: boolean;
  toggling: boolean;
  onEdit: () => void;
  onResetPassword: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

function RowMenu({ usuario, isSelf, toggling, onEdit, onResetPassword, onToggle, onDelete }: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-400"
        aria-label="Acciones"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
          {/* Editar */}
          <button
            type="button"
            onClick={() => { close(); onEdit(); }}
            className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Editar
          </button>

          {/* Restablecer contraseña */}
          <button
            type="button"
            onClick={() => { close(); onResetPassword(); }}
            className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Restablecer contraseña
          </button>

          {/* Desactivar / Activar */}
          <button
            type="button"
            onClick={() => { close(); onToggle(); }}
            disabled={toggling}
            className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm text-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M12 3v2m0 14v2" />
            </svg>
            {usuario.estado ? 'Desactivar' : 'Activar'}
          </button>

          <div className="my-1 border-t border-slate-100" />

          {/* Eliminar */}
          <button
            type="button"
            onClick={() => { close(); onDelete(); }}
            disabled={isSelf}
            className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={isSelf ? 'No puedes eliminar tu propio usuario' : undefined}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingUsuarios() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
      <svg className="h-7 w-7 animate-spin text-forest-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="text-sm">Cargando usuarios…</span>
    </div>
  );
}

interface EmptyStateProps { onAdd: () => void; }

function EmptyState({ onAdd }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-50">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-forest-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">No hay usuarios registrados</h3>
      <p className="text-sm text-slate-500 mb-5">Crea el primer usuario del sistema.</p>
      <Button size="sm" onClick={onAdd}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 -ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Crear usuario
      </Button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function UsuariosPage() {
  const { user: authUser } = useAuth();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<Rol[]>([]);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create / Edit
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Usuario | null>(null);
  const [form, setForm] = useState<UsuarioFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Password reset
  const [passwordTarget, setPasswordTarget] = useState<Usuario | null>(null);
  const [pwForm, setPwForm] = useState({ password: '', password_confirmation: '' });
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwModalError, setPwModalError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  // Toggle
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Usuario | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);

  // ── Load on mount ───────────────────────────────────────────────────────────

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usuariosService.getAll();
      setUsuarios(data);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Error al cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([usuariosService.getAll(), rolesService.getAll()])
      .then(([users, rols]) => {
        if (cancelled) return;
        setUsuarios(users);
        setRoles(rols);
      })
      .catch(err => { if (!cancelled) setError(isApiError(err) ? err.message : 'Error al cargar los usuarios.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // ── Toast ───────────────────────────────────────────────────────────────────

  const showToast = (type: 'success' | 'error', message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // ── Create / Edit helpers ───────────────────────────────────────────────────

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, rol_id: roles[0]?.id ?? '' });
    setFormErrors({});
    setModalError(null);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalError(null);
  };

  const openEdit = (usuario: Usuario) => {
    setForm(usuarioToForm(usuario));
    setFormErrors({});
    setModalError(null);
    setEditTarget(usuario);
  };

  const closeEdit = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalError(null);
  };

  const applyApiErrors = (err: unknown) => {
    if (isApiError(err) && err.fieldErrors) {
      const mapped: Record<string, string> = {};
      Object.entries(err.fieldErrors).forEach(([k, msgs]) => { mapped[k] = msgs[0]; });
      setFormErrors(mapped);
    } else {
      setModalError(isApiError(err) ? err.message : 'Ocurrió un error inesperado.');
    }
  };

  const handleCreate = async () => {
    const errors = validateForm(form, false);
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setSubmitting(true);
    try {
      const created = await usuariosService.create(form);
      setUsuarios(prev => [created, ...prev]);
      closeCreate();
      showToast('success', 'Usuario creado exitosamente.');
    } catch (err) {
      applyApiErrors(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    const errors = validateForm(form, true);
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setSubmitting(true);
    try {
      const updated = await usuariosService.update(editTarget.id, form);
      setUsuarios(prev => prev.map(u => (u.id === updated.id ? updated : u)));
      closeEdit();
      showToast('success', 'Usuario actualizado exitosamente.');
    } catch (err) {
      applyApiErrors(err);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Password reset ──────────────────────────────────────────────────────────

  const openResetPassword = (usuario: Usuario) => {
    setPwForm({ password: '', password_confirmation: '' });
    setPwErrors({});
    setPwModalError(null);
    setPasswordTarget(usuario);
  };

  const closeResetPassword = () => {
    setPasswordTarget(null);
    setPwForm({ password: '', password_confirmation: '' });
    setPwErrors({});
    setPwModalError(null);
  };

  const handleResetPassword = async () => {
    if (!passwordTarget) return;
    const errors = validatePassword(pwForm.password, pwForm.password_confirmation);
    if (Object.keys(errors).length > 0) { setPwErrors(errors); return; }
    setResetting(true);
    try {
      await usuariosService.changePassword(passwordTarget.id, pwForm.password, pwForm.password_confirmation);
      closeResetPassword();
      showToast('success', 'Contraseña actualizada exitosamente.');
    } catch (err) {
      if (isApiError(err) && err.fieldErrors) {
        const mapped: Record<string, string> = {};
        Object.entries(err.fieldErrors).forEach(([k, msgs]) => { mapped[k] = msgs[0]; });
        setPwErrors(mapped);
      } else {
        setPwModalError(isApiError(err) ? err.message : 'Ocurrió un error inesperado.');
      }
    } finally {
      setResetting(false);
    }
  };

  // ── Search
  const [search, setSearch] = useState('');
  const filtered = usuarios.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Toggle ──────────────────────────────────────────────────────────────────

  const handleToggle = async (usuario: Usuario) => {
    setTogglingId(usuario.id);
    try {
      const updated = await usuariosService.toggle(usuario.id);
      setUsuarios(prev => prev.map(u => (u.id === updated.id ? updated : u)));
    } catch (err) {
      showToast('error', isApiError(err) ? err.message : 'Error al cambiar el estado del usuario.');
    } finally {
      setTogglingId(null);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────

  const closeDelete = () => {
    setDeleteTarget(null);
    setDeleteModalError(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await usuariosService.delete(deleteTarget.id);
      setUsuarios(prev => prev.filter(u => u.id !== deleteTarget.id));
      closeDelete();
      showToast('success', 'Usuario eliminado.');
    } catch (err) {
      setDeleteModalError(isApiError(err) ? err.message : 'Error al eliminar el usuario.');
    } finally {
      setDeleting(false);
    }
  };

  // ── Form UI ─────────────────────────────────────────────────────────────────

  const isEdit = !!editTarget;

  const renderForm = () => (
    <div className="space-y-4">
      {modalError && <Alert variant="error">{modalError}</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Nombre completo *"
          value={form.name}
          onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
          error={formErrors.name}
          placeholder="Ej: Juan Pérez"
        />
        <Input
          label="Correo electrónico *"
          type="email"
          value={form.email}
          onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
          error={formErrors.email}
          placeholder="correo@ejemplo.com"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Rol <span className="text-red-500">*</span>
        </label>
        <select
          value={form.rol_id}
          onChange={e => setForm(prev => ({ ...prev, rol_id: e.target.value }))}
          className={[
            'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-forest-400',
            formErrors.rol_id ? 'border-red-400' : 'border-slate-200',
          ].join(' ')}
        >
          <option value="">Selecciona un rol…</option>
          {roles.map(r => (
            <option key={r.id} value={r.id}>{r.nombre}</option>
          ))}
        </select>
        {formErrors.rol_id && (
          <p className="mt-1 text-xs text-red-500">{formErrors.rol_id}</p>
        )}
      </div>

      {/* Password only shown in create */}
      {!isEdit && (
        <div className="border-t border-slate-100 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Contraseña</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Contraseña *"
              type="password"
              value={form.password}
              onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
              error={formErrors.password}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
            <Input
              label="Confirmar contraseña *"
              type="password"
              value={form.password_confirmation}
              onChange={e => setForm(prev => ({ ...prev, password_confirmation: e.target.value }))}
              error={formErrors.password_confirmation}
              placeholder="Repite la contraseña"
              autoComplete="new-password"
            />
          </div>
        </div>
      )}
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout pageTitle="Usuarios">
      <div>
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900">Usuarios</h2>
            <p className="text-sm text-slate-500 mt-0.5">Gestiona los usuarios y sus roles de acceso</p>
          </div>
          {!loading && !error && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nombre…"
                  className="rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm text-slate-700 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-forest-400 w-48 sm:w-60"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <Button size="sm" onClick={openCreate}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 -ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear usuario
              </Button>
            </div>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className="mb-4">
            <Alert variant={toast.type === 'success' ? 'success' : 'error'}>{toast.message}</Alert>
          </div>
        )}

        {loading && <LoadingUsuarios />}

        {!loading && error && (
          <div className="space-y-3">
            <Alert variant="error">{error}</Alert>
            <Button variant="ghost" size="sm" onClick={fetchUsuarios}>Reintentar</Button>
          </div>
        )}

        {!loading && !error && usuarios.length === 0 && <EmptyState onAdd={openCreate} />}

        {/* Table */}
        {!loading && !error && usuarios.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Usuario</th>
                    <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Correo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Rol</th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Estado</th>
                    <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Registrado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                        No se encontraron usuarios con "{search}"
                      </td>
                    </tr>
                  ) : filtered.map(usuario => {
                    const isSelf = String(authUser?.id) === usuario.id;
                    return (
                      <tr key={usuario.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={[
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                              usuario.estado ? 'bg-forest-100 text-forest-700' : 'bg-slate-100 text-slate-400',
                            ].join(' ')}>
                              {usuario.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {usuario.name}
                                {isSelf && (
                                  <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                                    Tú
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-slate-400 truncate sm:hidden">{usuario.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3.5">
                          <span className="text-sm text-slate-600">{usuario.email}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center rounded-full bg-forest-50 px-2.5 py-0.5 text-xs font-medium text-forest-700">
                            {usuario.rol.nombre}
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-4 py-3.5">
                          <span className={[
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1',
                            usuario.estado
                              ? 'bg-forest-50 text-forest-700 ring-forest-200'
                              : 'bg-slate-100 text-slate-500 ring-slate-200',
                          ].join(' ')}>
                            <span className={[
                              'h-1.5 w-1.5 rounded-full',
                              usuario.estado ? 'bg-forest-500' : 'bg-slate-400',
                            ].join(' ')} />
                            {usuario.estado ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="hidden lg:table-cell px-4 py-3.5">
                          <span className="text-sm text-slate-500">
                            {new Date(usuario.createdAt).toLocaleDateString('es-CO', {
                              year: 'numeric', month: 'short', day: 'numeric',
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <RowMenu
                            usuario={usuario}
                            isSelf={isSelf}
                            toggling={togglingId === usuario.id}
                            onEdit={() => openEdit(usuario)}
                            onResetPassword={() => openResetPassword(usuario)}
                            onToggle={() => handleToggle(usuario)}
                            onDelete={() => setDeleteTarget(usuario)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-400">
                {search
                  ? `${filtered.length} de ${usuarios.length} ${usuarios.length === 1 ? 'usuario' : 'usuarios'}`
                  : `${usuarios.length} ${usuarios.length === 1 ? 'usuario' : 'usuarios'} en total`}
              </p>
            </div>
          </div>
        )}

        {/* Create modal */}
        <Modal
          open={createOpen}
          onClose={closeCreate}
          title="Crear usuario"
          size="md"
          footer={
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={closeCreate} disabled={submitting}>Cancelar</Button>
              <Button onClick={handleCreate} isLoading={submitting}>Crear usuario</Button>
            </div>
          }
        >
          {renderForm()}
        </Modal>

        {/* Edit modal */}
        <Modal
          open={!!editTarget}
          onClose={closeEdit}
          title="Editar usuario"
          size="md"
          footer={
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={closeEdit} disabled={submitting}>Cancelar</Button>
              <Button onClick={handleUpdate} isLoading={submitting}>Guardar cambios</Button>
            </div>
          }
        >
          {renderForm()}
        </Modal>

        {/* Reset password modal */}
        <Modal
          open={!!passwordTarget}
          onClose={closeResetPassword}
          title="Restablecer contraseña"
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={closeResetPassword} disabled={resetting}>Cancelar</Button>
              <Button onClick={handleResetPassword} isLoading={resetting}>Actualizar contraseña</Button>
            </div>
          }
        >
          <div className="space-y-4">
            {pwModalError && <Alert variant="error">{pwModalError}</Alert>}
            <p className="text-sm text-slate-500">
              Estableciendo nueva contraseña para{' '}
              <span className="font-semibold text-slate-700">{passwordTarget?.name}</span>.
            </p>
            <Input
              label="Nueva contraseña *"
              type="password"
              value={pwForm.password}
              onChange={e => setPwForm(prev => ({ ...prev, password: e.target.value }))}
              error={pwErrors.password}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
            <Input
              label="Confirmar contraseña *"
              type="password"
              value={pwForm.password_confirmation}
              onChange={e => setPwForm(prev => ({ ...prev, password_confirmation: e.target.value }))}
              error={pwErrors.password_confirmation}
              placeholder="Repite la contraseña"
              autoComplete="new-password"
            />
          </div>
        </Modal>

        {/* Delete modal */}
        <Modal
          open={!!deleteTarget}
          onClose={closeDelete}
          title="Eliminar usuario"
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={closeDelete} disabled={deleting}>Cancelar</Button>
              <Button variant="danger" onClick={handleDelete} isLoading={deleting}>Eliminar</Button>
            </div>
          }
        >
          <div className="space-y-3">
            {deleteModalError && <Alert variant="error">{deleteModalError}</Alert>}
            <p className="text-sm text-slate-600">
              ¿Estás seguro de que deseas eliminar al usuario{' '}
              <span className="font-semibold text-slate-900">"{deleteTarget?.name}"</span>?
              Esta acción no se puede deshacer.
            </p>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
