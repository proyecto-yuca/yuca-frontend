import { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import sensorService from '../../services/sensores/sensorService';
import fincasService from '../../services/fincas/fincasService';
import cultivosService from '../../services/cultivos/cultivosService';
import variablesService from '../../services/variables/variablesService';
import { isApiError } from '../../services/api/ApiError';
import type { Sensor, SensorFormData } from '../../types/sensor.types';
import type { Finca } from '../../types/fincas.types';
import type { Cultivo } from '../../types/cultivos.types';
import type { Variable } from '../../types/variables.types';

const EMPTY_FORM: SensorFormData = {
  codigo: '',
  nombre: '',
  descripcion: '',
  lat: '',
  lng: '',
  cultivoId: '',
  variableIds: [],
};

function sensorToForm(sensor: Sensor): SensorFormData {
  return {
    codigo: sensor.codigo,
    nombre: sensor.nombre,
    descripcion: sensor.descripcion ?? '',
    lat: sensor.posicion ? String(sensor.posicion.lat) : '',
    lng: sensor.posicion ? String(sensor.posicion.lng) : '',
    cultivoId: sensor.cultivo?.id ?? '',
    variableIds: sensor.variables.map(v => v.id),
  };
}

function validateForm(form: SensorFormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.codigo.trim()) errors.codigo = 'El código es requerido';
  if (!form.nombre.trim()) errors.nombre = 'El nombre es requerido';

  const hasLat = form.lat.trim() !== '';
  const hasLng = form.lng.trim() !== '';

  if (hasLat && isNaN(parseFloat(form.lat))) errors.lat = 'Latitud inválida';
  if (hasLng && isNaN(parseFloat(form.lng))) errors.lng = 'Longitud inválida';
  if (hasLat && !hasLng) errors.lng = 'Ingresa la longitud';
  if (!hasLat && hasLng) errors.lat = 'Ingresa la latitud';

  if (form.variableIds.length === 0) errors.variableIds = 'Selecciona al menos una variable';

  return errors;
}

// ── Finca selector ────────────────────────────────────────────────────────────

interface FincaSelectorProps {
  fincas: Finca[];
  selected: Finca | null;
  loading: boolean;
  onSelect: (finca: Finca) => void;
}

function FincaSelector({ fincas, selected, loading, onSelect }: FincaSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const filtered = fincas.filter(f =>
    f.nombre.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        disabled={loading}
        className={[
          'flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-forest-400',
          open ? 'border-forest-400' : 'border-slate-200 hover:border-slate-300',
          loading ? 'cursor-not-allowed opacity-60' : '',
        ].join(' ')}
        style={{ minWidth: '240px' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <span className={['flex-1 text-left truncate', selected ? 'text-slate-900 font-medium' : 'text-slate-400'].join(' ')}>
          {loading ? 'Cargando fincas…' : selected ? selected.nombre : 'Seleccionar finca…'}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={['h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150', open ? 'rotate-180' : ''].join(' ')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-full min-w-[260px] rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar finca…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-forest-400"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="py-3 text-center text-xs text-slate-400">
                {fincas.length === 0 ? 'No tienes fincas registradas' : 'Sin resultados'}
              </p>
            ) : (
              filtered.map(finca => (
                <button
                  key={finca.id}
                  type="button"
                  onClick={() => { onSelect(finca); setOpen(false); setSearch(''); }}
                  className={[
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    selected?.id === finca.id ? 'bg-forest-50 text-forest-700 font-medium' : 'text-slate-700 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {selected?.id === finca.id && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0 text-forest-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  <span className={['truncate', selected?.id !== finca.id ? 'ml-5' : ''].join(' ')}>
                    {finca.nombre}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingSensores() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
      <svg className="h-7 w-7 animate-spin text-forest-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="text-sm">Cargando sensores…</span>
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">No hay sensores registrados</h3>
      <p className="text-sm text-slate-500 mb-5">Agrega el primer sensor para esta finca.</p>
      <Button size="sm" onClick={onAdd}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 -ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Agregar sensor
      </Button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function SensoresPage() {
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [selectedFinca, setSelectedFinca] = useState<Finca | null>(null);
  const [loadingFincas, setLoadingFincas] = useState(true);

  const [sensores, setSensores] = useState<Sensor[]>([]);
  const [loadingSensores, setLoadingSensores] = useState(false);
  const [sensoresError, setSensoresError] = useState<string | null>(null);

  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Sensor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Sensor | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [form, setForm] = useState<SensorFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Load fincas on mount ────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    setLoadingFincas(true);
    fincasService
      .getAll({ search: '', estado: 'todos' }, 1, 100)
      .then(result => {
        if (cancelled) return;
        setFincas(result.data);
        if (result.data.length > 0) setSelectedFinca(result.data[0]);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingFincas(false); });
    return () => { cancelled = true; };
  }, []);

  // ── Load variables once ─────────────────────────────────────────────────────

  useEffect(() => {
    variablesService.getAll().then(setVariables).catch(() => {});
  }, []);

  // ── Load sensores & cultivos when finca changes ─────────────────────────────

  const fetchSensores = useCallback(async (fincaId: string) => {
    setLoadingSensores(true);
    setSensoresError(null);
    try {
      const data = await sensorService.getAll(fincaId);
      setSensores(data);
    } catch (err) {
      setSensoresError(isApiError(err) ? err.message : 'Error al cargar los sensores.');
    } finally {
      setLoadingSensores(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedFinca) return;
    fetchSensores(selectedFinca.id);
    cultivosService.getAll(selectedFinca.id).then(setCultivos).catch(() => setCultivos([]));
  }, [selectedFinca, fetchSensores]);

  // ── Toast ───────────────────────────────────────────────────────────────────

  const showToast = (type: 'success' | 'error', message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // ── Form helpers ────────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setCreateOpen(true);
  };

  const openEdit = (sensor: Sensor) => {
    setForm(sensorToForm(sensor));
    setFormErrors({});
    setEditTarget(sensor);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setForm(EMPTY_FORM);
    setFormErrors({});
  };

  const closeEdit = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
  };

  const toggleVariable = (id: string) => {
    setForm(prev => ({
      ...prev,
      variableIds: prev.variableIds.includes(id)
        ? prev.variableIds.filter(v => v !== id)
        : [...prev.variableIds, id],
    }));
  };

  // ── Submit handlers ─────────────────────────────────────────────────────────

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
    if (!selectedFinca) return;
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setSubmitting(true);
    try {
      const created = await sensorService.create(selectedFinca.id, form);
      setSensores(prev => [created, ...prev]);
      closeCreate();
      showToast('success', 'Sensor creado exitosamente.');
    } catch (err) {
      applyApiErrors(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedFinca || !editTarget) return;
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setSubmitting(true);
    try {
      const updated = await sensorService.update(selectedFinca.id, editTarget.id, form);
      setSensores(prev => prev.map(s => (s.id === updated.id ? updated : s)));
      closeEdit();
      showToast('success', 'Sensor actualizado exitosamente.');
    } catch (err) {
      applyApiErrors(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (sensor: Sensor) => {
    if (!selectedFinca) return;
    setTogglingId(sensor.id);
    try {
      const updated = await sensorService.toggle(selectedFinca.id, sensor.id);
      setSensores(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    } catch (err) {
      showToast('error', isApiError(err) ? err.message : 'Error al cambiar el estado del sensor.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedFinca || !deleteTarget) return;
    setDeleting(true);
    try {
      await sensorService.delete(selectedFinca.id, deleteTarget.id);
      setSensores(prev => prev.filter(s => s.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast('success', 'Sensor eliminado.');
    } catch (err) {
      showToast('error', isApiError(err) ? err.message : 'Error al eliminar el sensor.');
    } finally {
      setDeleting(false);
    }
  };

  // ── Form UI ─────────────────────────────────────────────────────────────────

  const renderForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Código *"
          value={form.codigo}
          onChange={e => setForm(prev => ({ ...prev, codigo: e.target.value }))}
          error={formErrors.codigo}
          placeholder="Ej: SHT-3x-A"
        />
        <Input
          label="Nombre *"
          value={form.nombre}
          onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
          error={formErrors.nombre}
          placeholder="Ej: Sensor Humedad Norte"
        />
      </div>

      <Input
        label="Descripción"
        value={form.descripcion}
        onChange={e => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
        placeholder="Describe la ubicación o función del sensor…"
      />

      <div>
        <p className="mb-1.5 block text-sm font-medium text-slate-700">
          Posición{' '}
          <span className="text-xs font-normal text-slate-400">(opcional)</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Latitud"
            value={form.lat}
            onChange={e => setForm(prev => ({ ...prev, lat: e.target.value }))}
            error={formErrors.lat}
          />
          <Input
            placeholder="Longitud"
            value={form.lng}
            onChange={e => setForm(prev => ({ ...prev, lng: e.target.value }))}
            error={formErrors.lng}
          />
        </div>
      </div>

      {/* Cultivo selector */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Cultivo{' '}
          <span className="text-xs font-normal text-slate-400">(opcional)</span>
        </label>
        <select
          value={form.cultivoId}
          onChange={e => setForm(prev => ({ ...prev, cultivoId: e.target.value }))}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-forest-400"
        >
          <option value="">Sin cultivo asignado</option>
          {cultivos.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      {/* Variables multi-select */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Variables <span className="text-red-500">*</span>
        </label>
        {formErrors.variableIds && (
          <p className="mb-1.5 text-xs text-red-500">{formErrors.variableIds}</p>
        )}
        {variables.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 py-3 text-center text-xs text-slate-400">
            No hay variables registradas
          </p>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2 space-y-1 max-h-40 overflow-y-auto">
            {variables.map(v => (
              <label
                key={v.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white transition-colors"
              >
                <input
                  type="checkbox"
                  checked={form.variableIds.includes(v.id)}
                  onChange={() => toggleVariable(v.id)}
                  className="h-4 w-4 rounded border-slate-300 text-forest-600 focus:ring-forest-400"
                />
                <span className="flex-1 text-sm text-slate-700">{v.nombre}</span>
                <span className="rounded-full bg-forest-50 px-2 py-0.5 text-xs font-medium text-forest-700">
                  {v.unidad}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  const showContent = !loadingFincas && fincas.length > 0;

  return (
    <DashboardLayout pageTitle="Sensores">
      <div>
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900">Sensores</h2>
            <p className="text-sm text-slate-500 mt-0.5">Gestiona los sensores por finca</p>
          </div>
          {showContent && selectedFinca && (
            <Button size="sm" onClick={openCreate}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 -ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar sensor
            </Button>
          )}
        </div>

        {/* Finca selector */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-sm font-medium text-slate-600 shrink-0">Finca:</span>
          <FincaSelector
            fincas={fincas}
            selected={selectedFinca}
            loading={loadingFincas}
            onSelect={finca => {
              setSelectedFinca(finca);
              setSensores([]);
              setSensoresError(null);
            }}
          />
        </div>

        {/* Toast */}
        {toast && (
          <div className="mb-4">
            <Alert variant={toast.type === 'success' ? 'success' : 'error'}>{toast.message}</Alert>
          </div>
        )}

        {/* No fincas */}
        {!loadingFincas && fincas.length === 0 && (
          <div className="rounded-xl border border-slate-100 bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              No tienes fincas registradas.{' '}
              <a href="/dashboard/fincas" className="text-forest-600 font-medium hover:underline">
                Crea una finca primero.
              </a>
            </p>
          </div>
        )}

        {/* Sensores area */}
        {showContent && (
          <>
            {loadingSensores && <LoadingSensores />}

            {!loadingSensores && sensoresError && (
              <Alert variant="error">{sensoresError}</Alert>
            )}

            {!loadingSensores && !sensoresError && sensores.length === 0 && (
              <EmptyState onAdd={openCreate} />
            )}

            {!loadingSensores && !sensoresError && sensores.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Sensor</th>
                        <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Cultivo</th>
                        <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Variables</th>
                        <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Posición</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">Estado</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {sensores.map(sensor => (
                        <tr key={sensor.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3.5">
                            <p className="text-sm font-medium text-slate-900">{sensor.nombre}</p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">{sensor.codigo}</p>
                          </td>
                          <td className="hidden sm:table-cell px-4 py-3.5">
                            {sensor.cultivo ? (
                              <span className="text-sm text-slate-600">{sensor.cultivo.nombre}</span>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                          <td className="hidden md:table-cell px-4 py-3.5">
                            {sensor.variables.length === 0 ? (
                              <span className="text-xs text-slate-300">Sin variables</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {sensor.variables.map(v => (
                                  <span key={v.id} className="inline-flex items-center rounded-full bg-forest-50 px-2 py-0.5 text-xs font-medium text-forest-700">
                                    {v.nombre} <span className="ml-1 text-forest-400">({v.unidad})</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="hidden lg:table-cell px-4 py-3.5">
                            {sensor.posicion ? (
                              <span className="text-xs text-slate-500 font-mono">
                                {sensor.posicion.lat.toFixed(4)}, {sensor.posicion.lng.toFixed(4)}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <button
                              onClick={() => handleToggle(sensor)}
                              disabled={togglingId === sensor.id}
                              className={[
                                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors',
                                sensor.activo
                                  ? 'bg-forest-50 text-forest-700 ring-forest-200 hover:bg-forest-100'
                                  : 'bg-slate-100 text-slate-500 ring-slate-200 hover:bg-slate-200',
                                togglingId === sensor.id ? 'opacity-50 cursor-not-allowed' : '',
                              ].join(' ')}
                            >
                              <span className={[
                                'h-1.5 w-1.5 rounded-full',
                                sensor.activo ? 'bg-forest-500' : 'bg-slate-400',
                              ].join(' ')} />
                              {sensor.activo ? 'Activo' : 'Inactivo'}
                            </button>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEdit(sensor)}
                                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => setDeleteTarget(sensor)}
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
                    {sensores.length} {sensores.length === 1 ? 'sensor' : 'sensores'} en total
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Create modal */}
        <Modal
          open={createOpen}
          onClose={closeCreate}
          title="Agregar sensor"
          size="md"
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
          title="Editar sensor"
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

        {/* Delete modal */}
        <Modal
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Eliminar sensor"
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button>
              <Button variant="danger" onClick={handleDelete} isLoading={deleting}>Eliminar</Button>
            </div>
          }
        >
          <p className="text-sm text-slate-600">
            ¿Estás seguro de que deseas eliminar el sensor{' '}
            <span className="font-semibold text-slate-900">"{deleteTarget?.nombre}"</span>?
            Esta acción no se puede deshacer.
          </p>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
