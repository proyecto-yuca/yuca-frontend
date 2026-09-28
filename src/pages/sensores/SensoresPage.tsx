import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { Tabs } from '../../components/ui/Tabs';
import sensorService from '../../services/sensores/sensorService';
import fincasService from '../../services/fincas/fincasService';
import cultivosService from '../../services/cultivos/cultivosService';
import variablesService from '../../services/variables/variablesService';
import { isApiError } from '../../services/api/ApiError';
import type { Sensor, SensorFormData } from '../../types/sensor.types';
import type { Finca } from '../../types/fincas.types';
import type { Cultivo } from '../../types/cultivos.types';
import type { Variable } from '../../types/variables.types';
import { SensorLocationMap } from './SensorLocationMap';
import { isPointInPolygon, orderPolygonPoints } from '../../lib/mapGeometry';
import { FincaSelector } from '../../components/selectors/FincaSelector';

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

function validateForm(form: SensorFormData, cultivos: Cultivo[]): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.codigo.trim()) errors.codigo = 'El código es requerido';
  if (!form.nombre.trim()) errors.nombre = 'El nombre es requerido';

  const hasLat = form.lat.trim() !== '';
  const hasLng = form.lng.trim() !== '';

  if (hasLat && isNaN(parseFloat(form.lat))) errors.lat = 'Latitud inválida';
  if (hasLng && isNaN(parseFloat(form.lng))) errors.lng = 'Longitud inválida';
  if (hasLat && !hasLng) errors.lng = 'Ingresa la longitud';
  if (!hasLat && hasLng) errors.lat = 'Ingresa la latitud';

  if (hasLat && hasLng && !errors.lat && !errors.lng && form.cultivoId) {
    const cultivo = cultivos.find(c => c.id === form.cultivoId);
    const polygon = orderPolygonPoints(cultivo?.puntosUbicacion ?? []);
    if (polygon.length >= 3) {
      const point = { lat: parseFloat(form.lat), lng: parseFloat(form.lng) };
      if (!isPointInPolygon(point, polygon)) {
        errors.posicion = 'El sensor debe ubicarse dentro del área del cultivo seleccionado.';
      }
    }
  }

  if (form.variableIds.length === 0) errors.variableIds = 'Selecciona al menos una variable';

  return errors;
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

// ── Resumen tab ────────────────────────────────────────────────────────────────

interface SensoresResumenProps {
  sensores: Sensor[];
}

function SensoresResumen({ sensores }: SensoresResumenProps) {
  const stats = useMemo(() => {
    const activos = sensores.filter((s) => s.activo).length;
    const sinCultivo = sensores.filter((s) => !s.cultivo).length;
    return { total: sensores.length, activos, inactivos: sensores.length - activos, sinCultivo };
  }, [sensores]);

  const porVariable = useMemo(() => {
    const counts = new Map<string, number>();
    sensores.forEach((s) => {
      s.variables.forEach((v) => counts.set(v.nombre, (counts.get(v.nombre) ?? 0) + 1));
    });
    return Array.from(counts.entries())
      .map(([variable, cantidad]) => ({ variable, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [sensores]);

  const porMes = useMemo(() => {
    const counts = new Map<string, number>();
    sensores.forEach((s) => {
      const key = s.createdAt.slice(0, 7);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, cantidad]) => ({
        mes: new Date(`${key}-01T00:00:00`).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }),
        cantidad,
      }));
  }, [sensores]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total sensores', value: stats.total, color: 'text-forest-700' },
          { label: 'Activos', value: stats.activos, color: 'text-emerald-700' },
          { label: 'Inactivos', value: stats.inactivos, color: 'text-slate-600' },
          { label: 'Sin cultivo', value: stats.sinCultivo, color: 'text-earth-700' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`mt-1 text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Sensores por variable</h3>
        {porVariable.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No hay variables asignadas a sensores de esta finca.</p>
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

      <div className="rounded-xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Sensores instalados por mes</h3>
        {porMes.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No hay datos suficientes.</p>
        ) : (
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={porMes} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="cantidad" name="Sensores" stroke="#2E632B" fill="#2E632B" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
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
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Resumen tab
  const [view, setView] = useState<'listado' | 'resumen'>('listado');

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
    setModalError(null);
    setCreateOpen(true);
  };

  const openEdit = (sensor: Sensor) => {
    setForm(sensorToForm(sensor));
    setFormErrors({});
    setModalError(null);
    setEditTarget(sensor);
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
      setModalError(isApiError(err) ? err.message : 'Ocurrió un error inesperado.');
    }
  };

  const handleCreate = async () => {
    if (!selectedFinca) return;
    const errors = validateForm(form, cultivos);
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
    const errors = validateForm(form, cultivos);
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
      closeDelete();
      showToast('success', 'Sensor eliminado.');
    } catch (err) {
      setModalError(isApiError(err) ? err.message : 'Error al eliminar el sensor.');
    } finally {
      setDeleting(false);
    }
  };

  // ── Form UI ─────────────────────────────────────────────────────────────────

  const renderForm = () => (
    <div className="space-y-4">
      {modalError && <Alert variant="error">{modalError}</Alert>}
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

      <div>
        <p className="mb-1.5 block text-sm font-medium text-slate-700">
          Posición{' '}
          <span className="text-xs font-normal text-slate-400">(opcional)</span>
        </p>
        {formErrors.posicion && (
          <p className="mb-1.5 text-xs text-red-500">{formErrors.posicion}</p>
        )}
        <div className="mb-3">
          <SensorLocationMap
            lat={form.lat}
            lng={form.lng}
            cultivoPoints={cultivos.find(c => c.id === form.cultivoId)?.puntosUbicacion}
            fincaPoints={selectedFinca?.puntosUbicacion}
            onSetPoint={(lat, lng) => setForm(prev => ({ ...prev, lat: String(lat), lng: String(lng) }))}
            onClearPoint={() => setForm(prev => ({ ...prev, lat: '', lng: '' }))}
          />
        </div>

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

        {/* Tabs */}
        {showContent && (
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
        {showContent && view === 'resumen' && !loadingSensores && (
          <SensoresResumen sensores={sensores} />
        )}

        {/* Sensores area */}
        {showContent && view === 'listado' && (
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
          onClose={closeDelete}
          title="Eliminar sensor"
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
              ¿Estás seguro de que deseas eliminar el sensor{' '}
              <span className="font-semibold text-slate-900">"{deleteTarget?.nombre}"</span>?
              Esta acción no se puede deshacer.
            </p>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
