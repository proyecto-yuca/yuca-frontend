import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { Tabs } from '../../components/ui/Tabs';
import cultivosService from '../../services/cultivos/cultivosService';
import fincasService from '../../services/fincas/fincasService';
import sensorService from '../../services/sensores/sensorService';
import { isApiError } from '../../services/api/ApiError';
import type { Cultivo, CultivoFormData } from '../../types/cultivos.types';
import type { Finca } from '../../types/fincas.types';
import type { Sensor } from '../../types/sensor.types';
import { CultivoLocationMap } from './CultivoLocationMap';
import { FincaSelector } from '../../components/selectors/FincaSelector';

const MAX_PUNTOS = 4;

const EMPTY_FORM: CultivoFormData = {
  nombre: '',
  descripcion: '',
  puntosUbicacion: [],
};

function cultivoToForm(cultivo: Cultivo): CultivoFormData {
  return {
    nombre: cultivo.nombre,
    descripcion: cultivo.descripcion ?? '',
    puntosUbicacion: cultivo.puntosUbicacion.map(p => ({
      lat: String(p.lat),
      lng: String(p.lng),
    })),
  };
}

function validateForm(form: CultivoFormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.nombre.trim()) errors.nombre = 'El nombre es requerido';

  form.puntosUbicacion.forEach((p, i) => {
    if (p.lat.trim() && isNaN(parseFloat(p.lat))) errors[`lat_${i}`] = 'Latitud inválida';
    if (p.lng.trim() && isNaN(parseFloat(p.lng))) errors[`lng_${i}`] = 'Longitud inválida';
    if (p.lat.trim() && !p.lng.trim()) errors[`lng_${i}`] = 'Ingresa la longitud';
    if (!p.lat.trim() && p.lng.trim()) errors[`lat_${i}`] = 'Ingresa la latitud';
  });

  const validPoints = form.puntosUbicacion.filter(
    p => p.lat.trim() !== '' && p.lng.trim() !== '',
  );
  if (validPoints.length < 3) {
    errors.puntosUbicacion = 'Debes ingresar al menos 3 puntos de ubicación';
  }

  return errors;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingCultivos() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
      <svg className="h-7 w-7 animate-spin text-forest-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="text-sm">Cargando cultivos…</span>
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19V9m0 0c0-4 3-6 6-6-1 3.5-3.5 6-6 6zm0 0C12 5 9 3 6 3c1 3.5 3.5 6 6 6z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">No hay cultivos registrados</h3>
      <p className="text-sm text-slate-500 mb-5">Agrega el primer cultivo para esta finca.</p>
      <Button size="sm" onClick={onAdd}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 -ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Agregar cultivo
      </Button>
    </div>
  );
}

// ── Resumen tab ────────────────────────────────────────────────────────────────

interface CultivosResumenProps {
  cultivos: Cultivo[];
  sensores: Sensor[];
  loading: boolean;
}

function CultivosResumen({ cultivos, sensores, loading }: CultivosResumenProps) {
  const stats = useMemo(() => {
    const conSensores = cultivos.filter((c) =>
      sensores.some((s) => s.cultivo?.id === c.id),
    ).length;
    return {
      total: cultivos.length,
      conSensores,
      sinSensores: cultivos.length - conSensores,
    };
  }, [cultivos, sensores]);

  const sensoresPorCultivo = useMemo(
    () =>
      cultivos
        .map((c) => ({
          nombre: c.nombre,
          cantidad: sensores.filter((s) => s.cultivo?.id === c.id).length,
        }))
        .sort((a, b) => b.cantidad - a.cantidad),
    [cultivos, sensores],
  );

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

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total cultivos', value: stats.total, color: 'text-forest-700' },
          { label: 'Con sensores', value: stats.conSensores, color: 'text-emerald-700' },
          { label: 'Sin sensores', value: stats.sinSensores, color: 'text-slate-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`mt-1 text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Sensores por cultivo</h3>
        {sensoresPorCultivo.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No hay cultivos registrados en esta finca.</p>
        ) : (
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sensoresPorCultivo} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
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

export function CultivosPage() {
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [selectedFinca, setSelectedFinca] = useState<Finca | null>(null);
  const [loadingFincas, setLoadingFincas] = useState(true);

  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [loadingCultivos, setLoadingCultivos] = useState(false);
  const [cultivosError, setCultivosError] = useState<string | null>(null);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Cultivo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Cultivo | null>(null);

  const [form, setForm] = useState<CultivoFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Resumen tab
  const [view, setView] = useState<'listado' | 'resumen'>('listado');
  const [sensoresResumen, setSensoresResumen] = useState<Sensor[]>([]);
  const [loadingResumen, setLoadingResumen] = useState(false);

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

  // ── Load cultivos when selected finca changes ───────────────────────────────

  const fetchCultivos = useCallback(async (fincaId: string) => {
    setLoadingCultivos(true);
    setCultivosError(null);
    try {
      const data = await cultivosService.getAll(fincaId);
      setCultivos(data);
    } catch (err) {
      setCultivosError(isApiError(err) ? err.message : 'Error al cargar los cultivos.');
    } finally {
      setLoadingCultivos(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedFinca) return;
    fetchCultivos(selectedFinca.id);
  }, [selectedFinca, fetchCultivos]);

  // ── Load sensores for the Resumen tab ───────────────────────────────────────

  useEffect(() => {
    if (view !== 'resumen' || !selectedFinca) return;
    let cancelled = false;
    setLoadingResumen(true);
    sensorService
      .getAll(selectedFinca.id)
      .then((data) => { if (!cancelled) setSensoresResumen(data); })
      .catch(() => { if (!cancelled) setSensoresResumen([]); })
      .finally(() => { if (!cancelled) setLoadingResumen(false); });
    return () => { cancelled = true; };
  }, [view, selectedFinca]);

  // ── Toast ───────────────────────────────────────────────────────────────────

  const showToast = (type: 'success' | 'error', message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  // ── Form helpers ────────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalError(null);
    setCreateOpen(true);
  };

  const openEdit = (cultivo: Cultivo) => {
    setForm(cultivoToForm(cultivo));
    setFormErrors({});
    setModalError(null);
    setEditTarget(cultivo);
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

  const addPoint = () => {
    if (form.puntosUbicacion.length >= MAX_PUNTOS) return;
    setForm(prev => ({ ...prev, puntosUbicacion: [...prev.puntosUbicacion, { lat: '', lng: '' }] }));
  };

  const addPointAt = (lat: number, lng: number) => {
    if (form.puntosUbicacion.length >= MAX_PUNTOS) return;
    setForm(prev => ({
      ...prev,
      puntosUbicacion: [...prev.puntosUbicacion, { lat: String(lat), lng: String(lng) }],
    }));
  };

  const removePoint = (index: number) => {
    setForm(prev => ({
      ...prev,
      puntosUbicacion: prev.puntosUbicacion.filter((_, i) => i !== index),
    }));
  };

  const updatePoint = (index: number, field: 'lat' | 'lng', value: string) => {
    setForm(prev => ({
      ...prev,
      puntosUbicacion: prev.puntosUbicacion.map((p, i) =>
        i === index ? { ...p, [field]: value } : p,
      ),
    }));
  };

  const movePoint = (index: number, lat: number, lng: number) => {
    setForm(prev => ({
      ...prev,
      puntosUbicacion: prev.puntosUbicacion.map((p, i) =>
        i === index ? { lat: String(lat), lng: String(lng) } : p,
      ),
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
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setSubmitting(true);
    try {
      const created = await cultivosService.create(selectedFinca.id, form);
      setCultivos(prev => [created, ...prev]);
      closeCreate();
      showToast('success', 'Cultivo creado exitosamente.');
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
      const updated = await cultivosService.update(selectedFinca.id, editTarget.id, form);
      setCultivos(prev => prev.map(c => (c.id === updated.id ? updated : c)));
      closeEdit();
      showToast('success', 'Cultivo actualizado exitosamente.');
    } catch (err) {
      applyApiErrors(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedFinca || !deleteTarget) return;
    setDeleting(true);
    try {
      await cultivosService.delete(selectedFinca.id, deleteTarget.id);
      setCultivos(prev => prev.filter(c => c.id !== deleteTarget.id));
      closeDelete();
      showToast('success', 'Cultivo eliminado.');
    } catch (err) {
      setModalError(isApiError(err) ? err.message : 'Error al eliminar el cultivo.');
    } finally {
      setDeleting(false);
    }
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
        placeholder="Ej: Yuca ICA Costeña"
      />
      <Input
        label="Descripción"
        value={form.descripcion}
        onChange={e => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
        placeholder="Describe la variedad, condiciones de cultivo…"
      />

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-700">
            Puntos de ubicación{' '}
            <span className="text-xs font-normal text-slate-400">(mín. 3, máx. 4)</span>
          </label>
          {form.puntosUbicacion.length < MAX_PUNTOS && (
            <button
              type="button"
              onClick={addPoint}
              className="flex items-center gap-1 text-xs font-medium text-forest-600 hover:text-forest-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar punto
            </button>
          )}
        </div>

        {formErrors.puntosUbicacion && (
          <p className="mb-2 text-xs text-red-500">{formErrors.puntosUbicacion}</p>
        )}

        <div className="mb-3">
          <CultivoLocationMap
            points={form.puntosUbicacion}
            maxPoints={MAX_PUNTOS}
            onAddPoint={addPointAt}
            onMovePoint={movePoint}
            onRemovePoint={removePoint}
          />
        </div>

        {form.puntosUbicacion.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 py-3 text-center text-xs text-slate-400">
            Sin puntos de ubicación
          </p>
        ) : (
          <div className="space-y-2">
            {form.puntosUbicacion.map((punto, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Latitud"
                    value={punto.lat}
                    onChange={e => updatePoint(i, 'lat', e.target.value)}
                    error={formErrors[`lat_${i}`]}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="Longitud"
                    value={punto.lng}
                    onChange={e => updatePoint(i, 'lng', e.target.value)}
                    error={formErrors[`lng_${i}`]}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePoint(i)}
                  className="mt-2 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  aria-label="Eliminar punto"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  const showContent = !loadingFincas && fincas.length > 0;

  return (
    <DashboardLayout pageTitle="Cultivos">
      <div>
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900">Cultivos</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Gestiona los cultivos por finca
            </p>
          </div>
          {showContent && selectedFinca && (
            <Button size="sm" onClick={openCreate}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 -ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar cultivo
            </Button>
          )}
        </div>

        {/* Finca selector row */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-sm font-medium text-slate-600 shrink-0">Finca:</span>
          <FincaSelector
            fincas={fincas}
            selected={selectedFinca}
            loading={loadingFincas}
            onSelect={finca => {
              setSelectedFinca(finca);
              setCultivos([]);
              setCultivosError(null);
            }}
          />
        </div>

        {/* Toast */}
        {toast && (
          <div className="mb-4">
            <Alert variant={toast.type === 'success' ? 'success' : 'error'}>
              {toast.message}
            </Alert>
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
        {showContent && view === 'resumen' && (
          <CultivosResumen cultivos={cultivos} sensores={sensoresResumen} loading={loadingResumen} />
        )}

        {/* Cultivos area */}
        {showContent && view === 'listado' && (
          <>
            {/* Loading cultivos */}
            {loadingCultivos && <LoadingCultivos />}

            {/* Error */}
            {!loadingCultivos && cultivosError && (
              <Alert variant="error">{cultivosError}</Alert>
            )}

            {/* Empty state */}
            {!loadingCultivos && !cultivosError && cultivos.length === 0 && (
              <EmptyState onAdd={openCreate} />
            )}

            {/* Table */}
            {!loadingCultivos && !cultivosError && cultivos.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Nombre
                        </th>
                        <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Descripción
                        </th>
                        <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Puntos de ubicación
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
                      {cultivos.map(cultivo => (
                        <tr key={cultivo.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3.5">
                            <span className="text-sm font-medium text-slate-900">{cultivo.nombre}</span>
                          </td>
                          <td className="hidden sm:table-cell px-4 py-3.5 max-w-[200px]">
                            <span className="text-sm text-slate-500 line-clamp-2">
                              {cultivo.descripcion || <span className="text-slate-300">—</span>}
                            </span>
                          </td>
                          <td className="hidden md:table-cell px-4 py-3.5">
                            {cultivo.puntosUbicacion.length === 0 ? (
                              <span className="text-xs text-slate-300">Sin puntos</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-earth-50 px-2.5 py-0.5 text-xs font-medium text-earth-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {cultivo.puntosUbicacion.length}{' '}
                                {cultivo.puntosUbicacion.length === 1 ? 'punto' : 'puntos'}
                              </span>
                            )}
                          </td>
                          <td className="hidden lg:table-cell px-4 py-3.5">
                            <span className="text-sm text-slate-500">
                              {new Date(cultivo.createdAt).toLocaleDateString('es-CO', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEdit(cultivo)}
                                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => setDeleteTarget(cultivo)}
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
                    {cultivos.length} {cultivos.length === 1 ? 'cultivo' : 'cultivos'} en total
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
          title="Agregar cultivo"
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
          title="Editar cultivo"
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

        {/* Delete confirmation modal */}
        <Modal
          open={!!deleteTarget}
          onClose={closeDelete}
          title="Eliminar cultivo"
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
              ¿Estás seguro de que deseas eliminar el cultivo{' '}
              <span className="font-semibold text-slate-900">"{deleteTarget?.nombre}"</span>?
              Esta acción no se puede deshacer.
            </p>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
