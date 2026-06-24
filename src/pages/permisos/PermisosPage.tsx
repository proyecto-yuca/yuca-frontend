import { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import rolesService from '../../services/permisos/rolesService';
import permisosService from '../../services/permisos/permisosService';
import { isApiError } from '../../services/api/ApiError';
import type { Rol, RolFormData, Modulo, PermisoModulo } from '../../types/permisos.types';

type CellPermisos = { ver: boolean; crear: boolean; editar: boolean; eliminar: boolean };
type MatrixState = Record<string, Record<string, CellPermisos>>;

const EMPTY_FORM: RolFormData = { identificador: '', nombre: '', descripcion: '' };

function validateForm(form: RolFormData, isEdit: boolean): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!isEdit) {
    if (!form.identificador.trim()) errors.identificador = 'El identificador es requerido';
    else if (!/^[a-z][a-z0-9_]*$/.test(form.identificador)) errors.identificador = 'Solo minúsculas, números y guión bajo';
  }
  if (!form.nombre.trim()) errors.nombre = 'El nombre es requerido';
  return errors;
}

// ── PermisoBtn ────────────────────────────────────────────────────────────────

interface PermisoBtnProps {
  active: boolean;
  label: string;
  onClick: () => void;
}

function PermisoBtn({ active, label, onClick }: PermisoBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold transition-colors',
        active
          ? 'bg-forest-600 text-white shadow-sm'
          : 'bg-white text-slate-400 ring-1 ring-slate-200 hover:text-slate-600 hover:ring-slate-300',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function PermisosPage() {
  const [activeTab, setActiveTab] = useState<'roles' | 'permisos'>('roles');

  // Shared
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Roles state
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Rol | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Rol | null>(null);
  const [form, setForm] = useState<RolFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Permisos state
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [matrix, setMatrix] = useState<MatrixState>({});
  const [originalMatrix, setOriginalMatrix] = useState<MatrixState>({});
  const [loadingPermisos, setLoadingPermisos] = useState(false);
  const [permisosError, setPermisosError] = useState<string | null>(null);
  const [savingRolId, setSavingRolId] = useState<string | null>(null);

  // ── Load roles on mount ─────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    setLoadingRoles(true);
    rolesService.getAll()
      .then(data => { if (!cancelled) setRoles(data); })
      .catch(err => { if (!cancelled) setRolesError(isApiError(err) ? err.message : 'Error al cargar los roles.'); })
      .finally(() => { if (!cancelled) setLoadingRoles(false); });
    return () => { cancelled = true; };
  }, []);

  // ── Load permisos when tab is active ───────────────────────────────────────

  const loadPermisos = useCallback(async () => {
    if (roles.length === 0) return;
    setLoadingPermisos(true);
    setPermisosError(null);
    try {
      const [modulosData, allPermisos] = await Promise.all([
        permisosService.getModulos(),
        Promise.all(roles.map(r => permisosService.getPermisosByRol(r.id))),
      ]);
      setModulos(modulosData);

      const newMatrix: MatrixState = {};
      roles.forEach((rol, i) => {
        newMatrix[rol.id] = {};
        allPermisos[i].forEach((p: PermisoModulo) => {
          newMatrix[rol.id][p.moduloId] = {
            ver: p.ver,
            crear: p.crear,
            editar: p.editar,
            eliminar: p.eliminar,
          };
        });
      });
      setMatrix(newMatrix);
      setOriginalMatrix(JSON.parse(JSON.stringify(newMatrix)));
    } catch (err) {
      setPermisosError(isApiError(err) ? err.message : 'Error al cargar los permisos.');
    } finally {
      setLoadingPermisos(false);
    }
  }, [roles]);

  useEffect(() => {
    if (activeTab === 'permisos' && roles.length > 0 && modulos.length === 0) {
      loadPermisos();
    }
  }, [activeTab, roles, modulos.length, loadPermisos]);

  // ── Toast ───────────────────────────────────────────────────────────────────

  const showToast = (type: 'success' | 'error', message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // ── Roles handlers ──────────────────────────────────────────────────────────

  const openCreate = () => { setForm(EMPTY_FORM); setFormErrors({}); setCreateOpen(true); };
  const closeCreate = () => { setCreateOpen(false); setForm(EMPTY_FORM); setFormErrors({}); };

  const openEdit = (rol: Rol) => {
    setForm({ identificador: rol.identificador, nombre: rol.nombre, descripcion: rol.descripcion ?? '' });
    setFormErrors({});
    setEditTarget(rol);
  };
  const closeEdit = () => { setEditTarget(null); setForm(EMPTY_FORM); setFormErrors({}); };

  const applyApiErrors = (err: unknown) => {
    if (isApiError(err) && err.fieldErrors) {
      const mapped: Record<string, string> = {};
      Object.entries(err.fieldErrors).forEach(([key, msgs]) => { mapped[key] = msgs[0]; });
      setFormErrors(mapped);
    } else {
      showToast('error', isApiError(err) ? err.message : 'Ocurrió un error inesperado.');
    }
  };

  const handleCreate = async () => {
    const errors = validateForm(form, false);
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setSubmitting(true);
    try {
      const created = await rolesService.create(form);
      setRoles(prev => [...prev, created]);
      closeCreate();
      showToast('success', 'Rol creado exitosamente.');
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
      const updated = await rolesService.update(editTarget.id, form);
      setRoles(prev => prev.map(r => (r.id === updated.id ? updated : r)));
      closeEdit();
      showToast('success', 'Rol actualizado exitosamente.');
    } catch (err) {
      applyApiErrors(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await rolesService.delete(deleteTarget.id);
      setRoles(prev => prev.filter(r => r.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast('success', 'Rol eliminado.');
    } catch (err) {
      showToast('error', isApiError(err) ? err.message : 'No se puede eliminar este rol.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  // ── Permisos handlers ───────────────────────────────────────────────────────

  const togglePermiso = (rolId: string, moduloId: string, campo: keyof CellPermisos) => {
    setMatrix(prev => ({
      ...prev,
      [rolId]: {
        ...prev[rolId],
        [moduloId]: {
          ...prev[rolId][moduloId],
          [campo]: !prev[rolId][moduloId][campo],
        },
      },
    }));
  };

  const isRolDirty = (rolId: string): boolean => {
    const orig = originalMatrix[rolId];
    const curr = matrix[rolId];
    if (!orig || !curr) return false;
    return JSON.stringify(orig) !== JSON.stringify(curr);
  };

  const hasTotalAccess = (rolId: string): boolean =>
    Object.values(matrix[rolId] ?? {}).length > 0 &&
    Object.values(matrix[rolId] ?? {}).every(p => p.ver && p.crear && p.editar && p.eliminar);

  const saveRolPermisos = async (rolId: string) => {
    setSavingRolId(rolId);
    try {
      const permisos = Object.entries(matrix[rolId]).map(([moduloId, p]) => ({
        modulo_id: moduloId,
        ver: p.ver,
        crear: p.crear,
        editar: p.editar,
        eliminar: p.eliminar,
      }));
      await permisosService.updatePermisos(rolId, permisos);
      setOriginalMatrix(prev => ({ ...prev, [rolId]: JSON.parse(JSON.stringify(matrix[rolId])) }));
      showToast('success', 'Permisos guardados correctamente.');
    } catch (err) {
      showToast('error', isApiError(err) ? err.message : 'Error al guardar los permisos.');
    } finally {
      setSavingRolId(null);
    }
  };

  // ── Forms ───────────────────────────────────────────────────────────────────

  const renderCreateForm = () => (
    <div className="space-y-4">
      <Input
        label="Identificador *"
        value={form.identificador}
        onChange={e => setForm(prev => ({ ...prev, identificador: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
        error={formErrors.identificador}
        placeholder="Ej: supervisor"
      />
      <Input
        label="Nombre *"
        value={form.nombre}
        onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
        error={formErrors.nombre}
        placeholder="Ej: Supervisor"
      />
      <Input
        label="Descripción"
        value={form.descripcion}
        onChange={e => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
        placeholder="Describe las responsabilidades de este rol…"
      />
    </div>
  );

  const renderEditForm = () => (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Identificador</label>
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-500">
          {editTarget?.identificador}
        </p>
      </div>
      <Input
        label="Nombre *"
        value={form.nombre}
        onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
        error={formErrors.nombre}
        placeholder="Ej: Supervisor"
      />
      <Input
        label="Descripción"
        value={form.descripcion}
        onChange={e => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
        placeholder="Describe las responsabilidades de este rol…"
      />
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout pageTitle="Permisos">
      <div>
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Permisos</h2>
          <p className="text-sm text-slate-500 mt-0.5">Gestiona los roles y permisos de acceso al sistema</p>
        </div>

        {/* Toast */}
        {toast && (
          <div className="mb-4">
            <Alert variant={toast.type === 'success' ? 'success' : 'error'}>{toast.message}</Alert>
          </div>
        )}

        {/* Tab navigation */}
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 w-fit mb-6">
          {(['roles', 'permisos'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              ].join(' ')}
            >
              {tab === 'roles' ? 'Tipos de usuario' : 'Permisos por módulo'}
            </button>
          ))}
        </div>

        {/* ── Tab: Roles ──────────────────────────────────────────────────────── */}
        {activeTab === 'roles' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-900">Tipos de usuario</h3>
                <p className="text-sm text-slate-500">Crea, edita y elimina los roles disponibles en el sistema.</p>
              </div>
              {!loadingRoles && !rolesError && (
                <Button size="sm" onClick={openCreate}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 -ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Nuevo tipo
                </Button>
              )}
            </div>

            {loadingRoles && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <svg className="h-7 w-7 animate-spin text-forest-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm">Cargando roles…</span>
              </div>
            )}

            {!loadingRoles && rolesError && <Alert variant="error">{rolesError}</Alert>}

            {!loadingRoles && !rolesError && roles.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Identificador</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Nombre</th>
                        <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Descripción</th>
                        <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Usuarios</th>
                        <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Origen</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {roles.map(rol => (
                        <tr key={rol.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-xs text-slate-500">{rol.identificador}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-sm font-medium text-slate-900">{rol.nombre}</span>
                          </td>
                          <td className="hidden sm:table-cell px-4 py-3.5 max-w-[220px]">
                            <span className="text-sm text-slate-500 line-clamp-1">
                              {rol.descripcion || <span className="text-slate-300">—</span>}
                            </span>
                          </td>
                          <td className="hidden md:table-cell px-4 py-3.5">
                            <span className="text-sm text-slate-600">{rol.usuarios}</span>
                          </td>
                          <td className="hidden lg:table-cell px-4 py-3.5">
                            {rol.sistema && (
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                                Sistema
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEdit(rol)}
                                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                Editar
                              </button>
                              <button
                                onClick={() => setDeleteTarget(rol)}
                                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
                  <p className="text-xs text-slate-400">
                    {roles.length} {roles.length === 1 ? 'rol' : 'roles'} en total
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Permisos ────────────────────────────────────────────────────── */}
        {activeTab === 'permisos' && (
          <div>
            <div className="mb-5">
              <h3 className="text-base font-semibold text-slate-900">Permisos por módulo</h3>
              <p className="text-sm text-slate-500">Marca qué puede hacer cada tipo de usuario en cada módulo. El administrador siempre tiene acceso total.</p>
            </div>

            {loadingPermisos && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <svg className="h-7 w-7 animate-spin text-forest-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm">Cargando permisos…</span>
              </div>
            )}

            {!loadingPermisos && permisosError && (
              <div className="space-y-3">
                <Alert variant="error">{permisosError}</Alert>
                <Button variant="ghost" size="sm" onClick={loadPermisos}>Reintentar</Button>
              </div>
            )}

            {!loadingPermisos && !permisosError && modulos.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 min-w-[180px]">
                          Tipo de usuario
                        </th>
                        {modulos.map(m => (
                          <th key={m.id} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400 min-w-[80px]">
                            {m.nombre}
                          </th>
                        ))}
                        <th className="px-4 py-3 min-w-[100px]" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {roles.map(rol => {
                        const dirty = isRolDirty(rol.id);
                        const total = hasTotalAccess(rol.id);
                        return (
                          <tr key={rol.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-4 py-4">
                              <p className="text-sm font-semibold text-slate-900">{rol.nombre}</p>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {rol.sistema && (
                                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 ring-1 ring-amber-200">
                                    Sistema
                                  </span>
                                )}
                                {total && (
                                  <span className="inline-flex items-center rounded-full bg-forest-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest-600 ring-1 ring-forest-200">
                                    Total
                                  </span>
                                )}
                              </div>
                            </td>
                            {modulos.map(m => {
                              const perms = matrix[rol.id]?.[m.id];
                              if (!perms) return <td key={m.id} className="px-3 py-4" />;
                              return (
                                <td key={m.id} className="px-3 py-4">
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="flex gap-1">
                                      <PermisoBtn active={perms.ver} label="V" onClick={() => togglePermiso(rol.id, m.id, 'ver')} />
                                      <PermisoBtn active={perms.crear} label="C" onClick={() => togglePermiso(rol.id, m.id, 'crear')} />
                                    </div>
                                    <div className="flex gap-1">
                                      <PermisoBtn active={perms.editar} label="E" onClick={() => togglePermiso(rol.id, m.id, 'editar')} />
                                      <PermisoBtn active={perms.eliminar} label="D" onClick={() => togglePermiso(rol.id, m.id, 'eliminar')} />
                                    </div>
                                  </div>
                                </td>
                              );
                            })}
                            <td className="px-4 py-4 text-right">
                              {dirty && (
                                <Button
                                  size="sm"
                                  onClick={() => saveRolPermisos(rol.id)}
                                  isLoading={savingRolId === rol.id}
                                >
                                  Guardar
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                  <p className="text-xs text-slate-400">
                    <span className="font-semibold text-slate-500">V</span> Ver ·{' '}
                    <span className="font-semibold text-slate-500">C</span> Crear ·{' '}
                    <span className="font-semibold text-slate-500">E</span> Editar ·{' '}
                    <span className="font-semibold text-slate-500">D</span> Eliminar
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create modal */}
        <Modal
          open={createOpen}
          onClose={closeCreate}
          title="Nuevo tipo de usuario"
          size="md"
          footer={
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={closeCreate} disabled={submitting}>Cancelar</Button>
              <Button onClick={handleCreate} isLoading={submitting}>Guardar</Button>
            </div>
          }
        >
          {renderCreateForm()}
        </Modal>

        {/* Edit modal */}
        <Modal
          open={!!editTarget}
          onClose={closeEdit}
          title="Editar tipo de usuario"
          size="md"
          footer={
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={closeEdit} disabled={submitting}>Cancelar</Button>
              <Button onClick={handleUpdate} isLoading={submitting}>Guardar cambios</Button>
            </div>
          }
        >
          {renderEditForm()}
        </Modal>

        {/* Delete modal */}
        <Modal
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Eliminar tipo de usuario"
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button>
              <Button variant="danger" onClick={handleDelete} isLoading={deleting}>Eliminar</Button>
            </div>
          }
        >
          <p className="text-sm text-slate-600">
            ¿Estás seguro de que deseas eliminar el rol{' '}
            <span className="font-semibold text-slate-900">"{deleteTarget?.nombre}"</span>?
            {deleteTarget?.sistema && (
              <span className="mt-2 block rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Este es un rol de sistema y es posible que no pueda eliminarse.
              </span>
            )}
          </p>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
