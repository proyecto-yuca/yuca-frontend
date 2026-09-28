import { useCallback, useEffect, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { Tabs } from '../../components/ui/Tabs';
import variablesService, { orderEventosForSubmit } from '../../services/variables/variablesService';
import {
  SEVERIDAD_ESTILOS,
  eventoToForm,
  formatRango,
  mapEventoApiErrors,
  newEventoForm,
  validateEventos,
} from '../../lib/eventos';
import { VariableEventoCard } from './VariableEventoCard';
import dashboardStatsService, {
  type SensorPorVariable,
} from '../../services/dashboard/dashboardStatsService';
import { isApiError } from '../../services/api/ApiError';
import type { Variable, VariableEventoFormData, VariableFormData } from '../../types/variables.types';

const EMPTY_FORM: VariableFormData = {
  nombre: '',
  unidad: '',
  decimales: '1',
  descripcion: '',
  eventos: [],
};

function variableToForm(variable: Variable): VariableFormData {
  return {
    nombre: variable.nombre,
    unidad: variable.unidad,
    decimales: String(variable.decimales),
    descripcion: variable.descripcion ?? '',
    eventos: variable.eventos.map(eventoToForm),
  };
}

function validateForm(form: VariableFormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.nombre.trim()) errors.nombre = 'El nombre es requerido';
  if (!form.unidad.trim()) errors.unidad = 'La unidad es requerida';
  if (!form.decimales.trim()) {
    errors.decimales = 'Los decimales son requeridos';
  } else {
    const d = parseInt(form.decimales, 10);
    if (isNaN(d) || d < 0 || d > 10) errors.decimales = 'Ingresa un valor entre 0 y 10';
  }
  return { ...errors, ...validateEventos(form.eventos) };
}

function EventosChips({ variable }: { variable: Variable }) {
  if (variable.eventos.length === 0) {
    return <span className="text-xs text-slate-300">Sin eventos</span>;
  }
  return (
    <div className="flex flex-col items-start gap-1">
      {variable.eventos.map(e => {
        const estilo = SEVERIDAD_ESTILOS[e.severidad];
        return (
          <span
            key={e.id}
            title={e.notificaciones.email ? `Correo a: ${e.notificaciones.emails.join(', ')}` : 'Sin correo'}
            className={[
              'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium',
              estilo.badge,
              e.activo ? '' : 'opacity-50 line-through',
            ].join(' ')}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${estilo.dot}`} />
            {e.nombre}
            <span className="font-normal opacity-80">{formatRango(e.rango.min, e.rango.max, variable.unidad)}</span>
            {e.notificaciones.email && (
              <span className="inline-flex items-center gap-0.5 font-normal opacity-80">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {e.notificaciones.emails.length}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingVariables() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
      <svg className="h-7 w-7 animate-spin text-forest-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="text-sm">Cargando variables…</span>
    </div>
  );
}

interface EmptyStateProps {
  onAdd: () => void;
}

function EmptyState({ onAdd }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-50">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-forest-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">No hay variables registradas</h3>
      <p className="text-sm text-slate-500 mb-5">Agrega la primera variable de medición.</p>
      <Button size="sm" onClick={onAdd}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 -ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Agregar variable
      </Button>
    </div>
  );
}

// ── Resumen tab ────────────────────────────────────────────────────────────────

interface VariablesResumenProps {
  totalVariables: number;
  porVariable: SensorPorVariable[];
  loading: boolean;
}

function VariablesResumen({ totalVariables, porVariable, loading }: VariablesResumenProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
        <svg className="h-7 w-7 animate-spin text-forest-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm">Cargando resumen…</span>
      </div>
    );
  }

  const conSensores = porVariable.reduce((sum, v) => sum + v.cantidad, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: 'Total variables', value: totalVariables, color: 'text-forest-700' },
          { label: 'Variables en uso', value: porVariable.length, color: 'text-emerald-700' },
          { label: 'Sensores asignados (todas las fincas)', value: conSensores, color: 'text-earth-700' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`mt-1 text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Sensores por variable (todas las fincas)</h3>
        {porVariable.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Ninguna variable está asignada a sensores todavía.</p>
        ) : (
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porVariable} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="variable" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="cantidad" name="Sensores" fill="#2E632B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function VariablesPage() {
  const [variables, setVariables] = useState<Variable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Variable | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Variable | null>(null);

  const [form, setForm] = useState<VariableFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Resumen tab
  const [view, setView] = useState<'listado' | 'resumen'>('listado');
  const [porVariable, setPorVariable] = useState<SensorPorVariable[]>([]);
  const [loadingResumen, setLoadingResumen] = useState(false);
  const [resumenLoaded, setResumenLoaded] = useState(false);

  // ── Load variables ──────────────────────────────────────────────────────────

  const fetchVariables = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await variablesService.getAll();
      setVariables(data);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Error al cargar las variables.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    variablesService.getAll()
      .then(data => { if (!cancelled) setVariables(data); })
      .catch(err => { if (!cancelled) setError(isApiError(err) ? err.message : 'Error al cargar las variables.'); })
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

  // ── Load global "sensores por variable" for the Resumen tab (lazy, once) ────

  useEffect(() => {
    if (view !== 'resumen' || resumenLoaded) return;
    setLoadingResumen(true);
    dashboardStatsService
      .getSensoresPorVariableGlobal()
      .then((data) => {
        setPorVariable(data);
        setResumenLoaded(true);
      })
      .catch(() => {})
      .finally(() => setLoadingResumen(false));
  }, [view, resumenLoaded]);

  // ── Form helpers ────────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalError(null);
    setCreateOpen(true);
  };

  const openEdit = (variable: Variable) => {
    setForm(variableToForm(variable));
    setFormErrors({});
    setModalError(null);
    setEditTarget(variable);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalError(null);
  };

  const closeEdit = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalError(null);
  };

  const closeDelete = () => {
    setDeleteTarget(null);
    setModalError(null);
  };

  // ── Submit handlers ─────────────────────────────────────────────────────────

  const applyApiErrors = (err: unknown) => {
    if (isApiError(err) && err.fieldErrors) {
      showErrors(mapEventoApiErrors(err.fieldErrors, orderEventosForSubmit(form.eventos)));
    } else {
      setModalError(isApiError(err) ? err.message : 'Ocurrió un error inesperado.');
    }
  };

  // Los eventos con error pueden quedar fuera de la vista dentro del modal.
  const showErrors = (errors: Record<string, string>) => {
    setFormErrors(errors);
    requestAnimationFrame(() => {
      document.querySelector('[data-has-error="true"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  };

  const handleCreate = async () => {
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) { showErrors(errors); return; }
    setSubmitting(true);
    try {
      const created = await variablesService.create(form);
      setVariables(prev => [created, ...prev]);
      closeCreate();
      showToast('success', 'Variable creada exitosamente.');
    } catch (err) {
      applyApiErrors(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) { showErrors(errors); return; }
    setSubmitting(true);
    try {
      const updated = await variablesService.update(editTarget.id, form);
      setVariables(prev => prev.map(v => (v.id === updated.id ? updated : v)));
      closeEdit();
      showToast('success', 'Variable actualizada exitosamente.');
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
      await variablesService.delete(deleteTarget.id);
      setVariables(prev => prev.filter(v => v.id !== deleteTarget.id));
      closeDelete();
      showToast('success', 'Variable eliminada.');
    } catch (err) {
      setModalError(isApiError(err) ? err.message : 'Error al eliminar la variable.');
    } finally {
      setDeleting(false);
    }
  };

  // ── Eventos ─────────────────────────────────────────────────────────────────

  const eventosVisibles = form.eventos.filter(e => !e.eliminado);

  const addEvento = () => {
    setForm(prev => ({ ...prev, eventos: [...prev.eventos, newEventoForm()] }));
  };

  const updateEvento = (evento: VariableEventoFormData) => {
    setForm(prev => ({ ...prev, eventos: prev.eventos.map(e => (e.key === evento.key ? evento : e)) }));
  };

  // Los existentes se marcan para `_destroy`; los nuevos simplemente se quitan.
  const removeEvento = (evento: VariableEventoFormData) => {
    setForm(prev => ({
      ...prev,
      eventos: evento.id
        ? prev.eventos.map(e => (e.key === evento.key ? { ...e, eliminado: true } : e))
        : prev.eventos.filter(e => e.key !== evento.key),
    }));
  };

  // ── Form UI ─────────────────────────────────────────────────────────────────

  const renderForm = () => (
    <div className="space-y-4">
      {modalError && <Alert variant="error">{modalError}</Alert>}
      <Input
        label="Nombre *"
        value={form.nombre}
        onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
        error={formErrors.nombre}
        placeholder="Ej: Humedad"
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Unidad *"
          value={form.unidad}
          onChange={e => setForm(prev => ({ ...prev, unidad: e.target.value }))}
          error={formErrors.unidad}
          placeholder="Ej: %"
        />
        <Input
          label="Decimales *"
          type="number"
          min="0"
          max="10"
          value={form.decimales}
          onChange={e => setForm(prev => ({ ...prev, decimales: e.target.value }))}
          error={formErrors.decimales}
          placeholder="Ej: 1"
        />
      </div>
      <Input
        label="Descripción"
        value={form.descripcion}
        onChange={e => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
        placeholder="Describe la variable de medición…"
      />

      <div className="border-t border-slate-100 pt-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Eventos de tolerancia</h3>
            <p className="text-xs text-slate-500">
              Define uno o varios rangos permitidos. Cuando una lectura sale de un rango se registra una alerta y, si lo activas, se envía un correo.
            </p>
          </div>
          <button
            type="button"
            onClick={addEvento}
            className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-forest-600 hover:bg-forest-50 hover:text-forest-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar evento
          </button>
        </div>

        {formErrors.eventos && <p className="mb-2 text-xs text-red-500">{formErrors.eventos}</p>}

        {eventosVisibles.length === 0 ? (
          <button
            type="button"
            onClick={addEvento}
            className="w-full rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center transition-colors hover:border-forest-300 hover:bg-forest-50/40"
          >
            <p className="text-sm font-medium text-slate-600">Esta variable no tiene eventos</p>
            <p className="mt-0.5 text-xs text-slate-400">Sus lecturas no se marcarán como fuera de rango. Clic para agregar uno.</p>
          </button>
        ) : (
          <div className="space-y-2.5">
            {eventosVisibles.map(evento => (
              <VariableEventoCard
                key={evento.key}
                evento={evento}
                unidad={form.unidad}
                errors={formErrors}
                defaultOpen={!evento.id}
                onChange={updateEvento}
                onRemove={() => removeEvento(evento)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout pageTitle="Variables">
      <div>
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900">Variables</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Gestiona las variables de medición de sensores
            </p>
          </div>
          {!loading && !error && (
            <Button size="sm" onClick={openCreate}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 -ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar variable
            </Button>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className="mb-4">
            <Alert variant={toast.type === 'success' ? 'success' : 'error'}>
              {toast.message}
            </Alert>
          </div>
        )}

        {/* Loading */}
        {loading && <LoadingVariables />}

        {/* Error */}
        {!loading && error && (
          <div className="space-y-3">
            <Alert variant="error">{error}</Alert>
            <Button variant="ghost" size="sm" onClick={fetchVariables}>Reintentar</Button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && variables.length === 0 && (
          <EmptyState onAdd={openCreate} />
        )}

        {/* Tabs */}
        {!loading && !error && variables.length > 0 && (
          <div className="mb-5">
            <Tabs
              tabs={[
                { value: 'listado', label: 'Listado' },
                { value: 'resumen', label: 'Resumen' },
              ]}
              active={view}
              onChange={setView}
            />
          </div>
        )}

        {/* Resumen */}
        {!loading && !error && variables.length > 0 && view === 'resumen' && (
          <VariablesResumen totalVariables={variables.length} porVariable={porVariable} loading={loadingResumen} />
        )}

        {/* Table */}
        {!loading && !error && variables.length > 0 && view === 'listado' && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Nombre
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Unidad
                    </th>
                    <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Decimales
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Eventos
                    </th>
                    <th className="hidden 2xl:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Descripción
                    </th>
                    <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Registrado
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {variables.map(variable => (
                    <tr key={variable.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-medium text-slate-900">{variable.nombre}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-full bg-forest-50 px-2.5 py-0.5 text-xs font-medium text-forest-700">
                          {variable.unidad}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3.5">
                        <span className="text-sm text-slate-500">{variable.decimales}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <EventosChips variable={variable} />
                      </td>
                      <td className="hidden 2xl:table-cell px-4 py-3.5 max-w-[200px]">
                        <span className="text-sm text-slate-500 line-clamp-2">
                          {variable.descripcion || <span className="text-slate-300">—</span>}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3.5">
                        <span className="text-sm text-slate-500">
                          {new Date(variable.createdAt).toLocaleDateString('es-CO', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(variable)}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setDeleteTarget(variable)}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                          >
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
                {variables.length} {variables.length === 1 ? 'variable' : 'variables'} en total
              </p>
            </div>
          </div>
        )}

        {/* Create modal */}
        <Modal
          open={createOpen}
          onClose={closeCreate}
          title="Agregar variable"
          size="lg"
          footer={
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={closeCreate} disabled={submitting}>Cancelar</Button>
              <Button onClick={handleCreate} isLoading={submitting}>Guardar</Button>
            </div>
          }
        >
          {renderForm()}
        </Modal>

        {/* Edit modal */}
        <Modal
          open={!!editTarget}
          onClose={closeEdit}
          title="Editar variable"
          size="lg"
          footer={
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={closeEdit} disabled={submitting}>Cancelar</Button>
              <Button onClick={handleUpdate} isLoading={submitting}>Guardar cambios</Button>
            </div>
          }
        >
          {renderForm()}
        </Modal>

        {/* Delete confirmation modal */}
        <Modal
          open={!!deleteTarget}
          onClose={closeDelete}
          title="Eliminar variable"
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={closeDelete} disabled={deleting}>Cancelar</Button>
              <Button variant="danger" onClick={handleDelete} isLoading={deleting}>Eliminar</Button>
            </div>
          }
        >
          <div className="space-y-3">
            {modalError && <Alert variant="error">{modalError}</Alert>}
            <p className="text-sm text-slate-600">
              ¿Estás seguro de que deseas eliminar la variable{' '}
              <span className="font-semibold text-slate-900">"{deleteTarget?.nombre}"</span>?
              Esta acción no se puede deshacer.
            </p>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
