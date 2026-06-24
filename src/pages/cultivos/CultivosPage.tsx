import { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import cultivosService from '../../services/cultivos/cultivosService';
import fincasService from '../../services/fincas/fincasService';
import { isApiError } from '../../services/api/ApiError';
import type { Cultivo, CultivoFormData } from '../../types/cultivos.types';
import type { Finca } from '../../types/fincas.types';

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

// ── Searchable finca selector ─────────────────────────────────────────────────

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

  const handleSelect = (finca: Finca) => {
    onSelect(finca);
    setOpen(false);
    setSearch('');
  };

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
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-full min-w-[260px] rounded-xl border border-slate-200 bg-white shadow-lg">
          {/* Search */}
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

          {/* List */}
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
                  onClick={() => handleSelect(finca)}
                  className={[
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    selected?.id === finca.id
                      ? 'bg-forest-50 text-forest-700 font-medium'
                      : 'text-slate-700 hover:bg-slate-50',
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
    if (form.puntosUbicacion.length >= 4) return;
    setForm(prev => ({ ...prev, puntosUbicacion: [...prev.puntosUbicacion, { lat: '', lng: '' }] }));
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
          {form.puntosUbicacion.length < 4 && (
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

        {/* Cultivos area */}
        {showContent && (
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
