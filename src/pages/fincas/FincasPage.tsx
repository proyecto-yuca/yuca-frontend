import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import fincasService from '../../services/fincas/fincasService';
import type {
  Finca,
  FincaFormData,
  FincaFilters,
  TipoDocumento,
} from '../../types/fincas.types';

const PAGE_SIZE = 6;

const DEPARTAMENTOS = [
  'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá',
  'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó',
  'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira',
  'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo',
  'Quindío', 'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre',
  'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada',
];

const TIPOS_DOCUMENTO: { value: TipoDocumento; label: string }[] = [
  { value: 'CC', label: 'Cédula de Ciudadanía (CC)' },
  { value: 'NIT', label: 'NIT' },
  { value: 'CE', label: 'Cédula de Extranjería (CE)' },
  { value: 'PP', label: 'Pasaporte (PP)' },
];

const EMPTY_FORM: FincaFormData = {
  nombre: '',
  descripcion: '',
  area: '',
  ubicacion: {
    departamento: '',
    municipio: '',
    vereda: '',
    coordenadas: '',
    direccion: '',
  },
  dueno: {
    nombre: '',
    tipoDocumento: 'CC',
    numeroDocumento: '',
    email: '',
    telefono: '',
    direccion: '',
  },
};

function validateForm(form: FincaFormData): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {};
  if (!form.nombre.trim()) errors.nombre = 'El nombre es requerido';
  if (!form.area || isNaN(Number(form.area)) || Number(form.area) <= 0)
    errors.area = 'El área debe ser un número mayor a 0';
  if (!form.ubicacion.departamento) errors['ubicacion.departamento'] = 'Selecciona un departamento';
  if (!form.ubicacion.municipio.trim()) errors['ubicacion.municipio'] = 'El municipio es requerido';
  if (!form.dueno.nombre.trim()) errors['dueno.nombre'] = 'El nombre del dueño es requerido';
  if (!form.dueno.numeroDocumento.trim()) errors['dueno.numeroDocumento'] = 'El número de documento es requerido';
  if (!form.dueno.email.trim()) {
    errors['dueno.email'] = 'El email es requerido';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.dueno.email)) {
    errors['dueno.email'] = 'El email no es válido';
  }
  if (!form.dueno.telefono.trim()) errors['dueno.telefono'] = 'El teléfono es requerido';
  return errors;
}

function fincaToForm(finca: Finca): FincaFormData {
  return {
    nombre: finca.nombre,
    descripcion: finca.descripcion ?? '',
    area: String(finca.area),
    ubicacion: {
      departamento: finca.ubicacion.departamento,
      municipio: finca.ubicacion.municipio,
      vereda: finca.ubicacion.vereda ?? '',
      coordenadas: finca.ubicacion.coordenadas ?? '',
      direccion: finca.ubicacion.direccion ?? '',
    },
    dueno: {
      nombre: finca.dueno.nombre,
      tipoDocumento: finca.dueno.tipoDocumento,
      numeroDocumento: finca.dueno.numeroDocumento,
      email: finca.dueno.email,
      telefono: finca.dueno.telefono,
      direccion: finca.dueno.direccion ?? '',
    },
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface EstadoBadgeProps {
  estado: Finca['estado'];
}
function EstadoBadge({ estado }: EstadoBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        estado === 'activo'
          ? 'bg-forest-50 text-forest-700 ring-1 ring-forest-200'
          : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
      ].join(' ')}
    >
      <span
        className={[
          'h-1.5 w-1.5 rounded-full',
          estado === 'activo' ? 'bg-forest-500' : 'bg-slate-400',
        ].join(' ')}
      />
      {estado === 'activo' ? 'Activo' : 'Inactivo'}
    </span>
  );
}

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (p: number) => void;
}
function Pagination({ page, totalPages, total, pageSize, onPageChange }: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pages: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
      <p className="text-xs text-slate-500">
        Mostrando <span className="font-medium text-slate-700">{from}–{to}</span> de{' '}
        <span className="font-medium text-slate-700">{total}</span> lotes
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Página anterior"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="flex h-8 w-8 items-center justify-center text-xs text-slate-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={[
                'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors',
                p === page
                  ? 'bg-forest-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100',
              ].join(' ')}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Página siguiente"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Lote Form ─────────────────────────────────────────────────────────────────

interface LoteFormProps {
  form: FincaFormData;
  errors: Partial<Record<string, string>>;
  onChange: (form: FincaFormData) => void;
}
function LoteForm({ form, errors, onChange }: LoteFormProps) {
  const set = (path: string, value: string) => {
    const keys = path.split('.');
    if (keys.length === 1) {
      onChange({ ...form, [keys[0]]: value });
    } else if (keys[0] === 'ubicacion') {
      onChange({ ...form, ubicacion: { ...form.ubicacion, [keys[1]]: value } });
    } else if (keys[0] === 'dueno') {
      onChange({ ...form, dueno: { ...form.dueno, [keys[1]]: value } });
    }
  };

  return (
    <div className="space-y-6">
      {/* Información del lote */}
      <section>
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-forest-700 mb-3">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-forest-100 text-forest-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </span>
          Información de la Finca
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              id="nombre"
              label="Nombre de la finca *"
              placeholder="Ej: Hacienda La Esperanza"
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              error={errors.nombre}
            />
          </div>
          <Input
            id="area"
            label="Área (hectáreas) *"
            type="number"
            placeholder="Ej: 12.5"
            min="0.1"
            step="0.1"
            value={form.area}
            onChange={(e) => set('area', e.target.value)}
            error={errors.area}
          />
          <div className="sm:col-span-1">
            <Input
              id="descripcion"
              label="Descripción"
              placeholder="Descripción breve de la finca"
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Ubicación */}
      <section>
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-earth-700 mb-3">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-earth-100 text-earth-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </span>
          Ubicación
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            id="departamento"
            label="Departamento *"
            placeholder="Selecciona un departamento"
            value={form.ubicacion.departamento}
            onChange={(e) => set('ubicacion.departamento', e.target.value)}
            error={errors['ubicacion.departamento']}
            options={DEPARTAMENTOS.map((d) => ({ value: d, label: d }))}
          />
          <Input
            id="municipio"
            label="Municipio *"
            placeholder="Ej: Fusagasugá"
            value={form.ubicacion.municipio}
            onChange={(e) => set('ubicacion.municipio', e.target.value)}
            error={errors['ubicacion.municipio']}
          />
          <Input
            id="vereda"
            label="Vereda"
            placeholder="Ej: El Jordán"
            value={form.ubicacion.vereda}
            onChange={(e) => set('ubicacion.vereda', e.target.value)}
          />
          <Input
            id="coordenadas"
            label="Coordenadas GPS"
            placeholder="Ej: 4.3372° N, 74.3641° W"
            value={form.ubicacion.coordenadas}
            onChange={(e) => set('ubicacion.coordenadas', e.target.value)}
          />
          <div className="sm:col-span-2">
            <Input
              id="ubicacion-direccion"
              label="Dirección de referencia"
              placeholder="Ej: Km 3 vía Silvania"
              value={form.ubicacion.direccion}
              onChange={(e) => set('ubicacion.direccion', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Dueño */}
      <section>
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-600 mb-3">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </span>
          Dueño e Información de Contacto
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              id="dueno-nombre"
              label="Nombre o razón social *"
              placeholder="Ej: Carlos Ramírez o Agroexportar S.A.S."
              value={form.dueno.nombre}
              onChange={(e) => set('dueno.nombre', e.target.value)}
              error={errors['dueno.nombre']}
            />
          </div>
          <Select
            id="tipo-documento"
            label="Tipo de documento *"
            value={form.dueno.tipoDocumento}
            onChange={(e) => set('dueno.tipoDocumento', e.target.value)}
            options={TIPOS_DOCUMENTO}
          />
          <Input
            id="numero-documento"
            label="Número de documento *"
            placeholder="Ej: 79456123"
            value={form.dueno.numeroDocumento}
            onChange={(e) => set('dueno.numeroDocumento', e.target.value)}
            error={errors['dueno.numeroDocumento']}
          />
          <Input
            id="dueno-email"
            label="Correo electrónico *"
            type="email"
            placeholder="correo@ejemplo.com"
            value={form.dueno.email}
            onChange={(e) => set('dueno.email', e.target.value)}
            error={errors['dueno.email']}
          />
          <Input
            id="dueno-telefono"
            label="Teléfono / Celular *"
            type="tel"
            placeholder="Ej: 3001234567"
            value={form.dueno.telefono}
            onChange={(e) => set('dueno.telefono', e.target.value)}
            error={errors['dueno.telefono']}
          />
          <div className="sm:col-span-2">
            <Input
              id="dueno-direccion"
              label="Dirección del dueño"
              placeholder="Ej: Calle 12 #45-23, Bogotá"
              value={form.dueno.direccion}
              onChange={(e) => set('dueno.direccion', e.target.value)}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function FincasPage() {
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FincaFilters>({ search: '', estado: 'todos' });

  // Modal states
  const [formModal, setFormModal] = useState<'closed' | 'create' | 'edit'>('closed');
  const [detailModal, setDetailModal] = useState<Finca | null>(null);
  const [confirmModal, setConfirmModal] = useState<Finca | null>(null);
  const [editingFinca, setEditingFinca] = useState<Finca | null>(null);

  // Form state
  const [form, setForm] = useState<FincaFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<string, string>>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Toggle state loading
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchLotes = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fincasService.getAll(filters, page, PAGE_SIZE);
      setFincas(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      if (result.page !== page) setPage(result.page);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchLotes();
  }, [fetchLotes]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.estado]);

  // ── Form handlers ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingFinca(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormError('');
    setFormModal('create');
  };

  const openEdit = (finca: Finca) => {
    setEditingFinca(lote);
    setForm(fincaToForm(finca));
    setFormErrors({});
    setFormError('');
    setFormModal('edit');
  };

  const closeFormModal = () => {
    setFormModal('closed');
    setEditingFinca(null);
  };

  const handleFormSubmit = async () => {
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setFormError('');
    setFormLoading(true);
    try {
      if (formModal === 'create') {
        await fincasService.create(form);
        showToast('Finca creada exitosamente');
      } else if (editingFinca) {
        await fincasService.update(editingFinca.id, form);
        showToast('Finca actualizada exitosamente');
      }
      closeFormModal();
      fetchLotes();
    } catch {
      setFormError('Ocurrió un error. Por favor intenta de nuevo.');
    } finally {
      setFormLoading(false);
    }
  };

  // ── Toggle estado ─────────────────────────────────────────────────────────

  const handleToggleEstado = async (finca: Finca) => {
    setConfirmModal(null);
    setTogglingId(finca.id);
    try {
      await fincasService.toggleEstado(finca.id);
      const action = finca.estado === 'activo' ? 'inactivada' : 'activada';
      showToast(`Finca ${action} exitosamente`);
      fetchLotes();
    } catch {
      showToast('No se pudo cambiar el estado de la finca', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout pageTitle="Gestión de Fincas">
      <div className="space-y-5 max-w-7xl mx-auto">

        {/* Toast */}
        {toast && (
          <div className={[
            'fixed top-5 right-5 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg text-sm font-medium',
            toast.type === 'success'
              ? 'bg-forest-600 text-white'
              : 'bg-red-600 text-white',
          ].join(' ')}>
            {toast.type === 'success' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Gestión de Fincas</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Administra las fincas, sus ubicaciones y propietarios
            </p>
          </div>
          <Button onClick={openCreate} size="md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva finca
          </Button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total fincas', value: total, icon: '🗺️', color: 'bg-forest-50 text-forest-700' },
            { label: 'Activos', value: fincas.filter((l) => l.estado === 'activo').length, icon: '✅', color: 'bg-emerald-50 text-emerald-700' },
            { label: 'Inactivos', value: fincas.filter((l) => l.estado === 'inactivo').length, icon: '⏸️', color: 'bg-slate-100 text-slate-600' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border border-slate-100 bg-white p-3 sm:p-4 shadow-sm flex items-center gap-3`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base ${s.color}`}>{s.icon}</span>
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="text-lg font-bold text-slate-900">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Input
              id="search"
              placeholder="Buscar por nombre, dueño, municipio o departamento…"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              leftIcon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
          <div className="sm:w-44">
            <Select
              id="filter-estado"
              value={filters.estado}
              onChange={(e) =>
                setFilters((f) => ({ ...f, estado: e.target.value as FincaFilters['estado'] }))
              }
              options={[
                { value: 'todos', label: 'Todos los estados' },
                { value: 'activo', label: 'Activos' },
                { value: 'inactivo', label: 'Inactivos' },
              ]}
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Finca</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">Ubicación</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hidden lg:table-cell">Dueño</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 hidden sm:table-cell">Área (ha)</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3.5">
                        <div className="h-4 w-36 rounded bg-slate-100 mb-1" />
                        <div className="h-3 w-24 rounded bg-slate-100" />
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell"><div className="h-4 w-28 rounded bg-slate-100" /></td>
                      <td className="px-4 py-3.5 hidden lg:table-cell"><div className="h-4 w-32 rounded bg-slate-100" /></td>
                      <td className="px-4 py-3.5 hidden sm:table-cell"><div className="h-4 w-12 rounded bg-slate-100 ml-auto" /></td>
                      <td className="px-4 py-3.5"><div className="h-5 w-16 rounded-full bg-slate-100 mx-auto" /></td>
                      <td className="px-4 py-3.5"><div className="h-7 w-20 rounded bg-slate-100 ml-auto" /></td>
                    </tr>
                  ))
                ) : fincas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <span className="text-4xl">🌿</span>
                        <p className="text-sm font-medium text-slate-600">No se encontraron fincas</p>
                        <p className="text-xs text-slate-400">Prueba con otros filtros o crea una nueva finca</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  fincas.map((finca) => (
                    <tr
                      key={finca.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-900 leading-tight">{finca.nombre}</p>
                        {finca.descripcion && (
                          <p className="mt-0.5 text-xs text-slate-400 truncate max-w-[180px]">{finca.descripcion}</p>
                        )}
                        <p className="mt-0.5 text-[10px] text-slate-300 md:hidden">
                          {finca.ubicacion.municipio}, {finca.ubicacion.departamento}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <p className="text-slate-700 leading-tight">
                          {finca.ubicacion.municipio}
                        </p>
                        <p className="text-xs text-slate-400">{finca.ubicacion.departamento}</p>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <p className="text-slate-700 leading-tight truncate max-w-[160px]">
                          {finca.dueno.nombre}
                        </p>
                        <p className="text-xs text-slate-400">{finca.dueno.telefono}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                        <span className="font-semibold text-slate-800">{finca.area.toLocaleString('es-CO')}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <EstadoBadge estado={finca.estado} />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/dashboard/fincas/${finca.id}/sensores`}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="Ver sensores"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                            </svg>
                          </Link>
                          <button
                            onClick={() => setDetailModal(finca)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-forest-50 hover:text-forest-600 transition-colors"
                            title="Ver detalle"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openEdit(finca)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-earth-50 hover:text-earth-600 transition-colors"
                            title="Editar"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setConfirmModal(finca)}
                            disabled={togglingId === finca.id}
                            className={[
                              'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                              finca.estado === 'activo'
                                ? 'text-slate-400 hover:bg-red-50 hover:text-red-500'
                                : 'text-slate-400 hover:bg-forest-50 hover:text-forest-600',
                              togglingId === finca.id ? 'opacity-50 cursor-not-allowed' : '',
                            ].join(' ')}
                            title={finca.estado === 'activo' ? 'Inactivar' : 'Activar'}
                          >
                            {togglingId === finca.id ? (
                              <svg className="h-3.5 w-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : finca.estado === 'activo' ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && fincas.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-3">
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Create / Edit Modal ───────────────────────────────────────────── */}
      <Modal
        open={formModal !== 'closed'}
        onClose={closeFormModal}
        title={formModal === 'create' ? 'Nueva finca' : `Editar finca — ${editingFinca?.nombre}`}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={closeFormModal} disabled={formLoading}>
              Cancelar
            </Button>
            <Button onClick={handleFormSubmit} isLoading={formLoading}>
              {formModal === 'create' ? 'Crear finca' : 'Guardar cambios'}
            </Button>
          </>
        }
      >
        {formError && (
          <Alert variant="error" className="mb-4">
            {formError}
          </Alert>
        )}
        <LoteForm form={form} errors={formErrors} onChange={setForm} />
      </Modal>

      {/* ── Detail Modal ─────────────────────────────────────────────────── */}
      <Modal
        open={!!detailModal}
        onClose={() => setDetailModal(null)}
        title="Detalle de la finca"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDetailModal(null)}>
              Cerrar
            </Button>
            {detailModal && (
              <Button
                onClick={() => {
                  openEdit(detailModal);
                  setDetailModal(null);
                }}
              >
                Editar finca
              </Button>
            )}
          </>
        }
      >
        {detailModal && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{detailModal.nombre}</h3>
                {detailModal.descripcion && (
                  <p className="mt-1 text-sm text-slate-500">{detailModal.descripcion}</p>
                )}
              </div>
              <EstadoBadge estado={detailModal.estado} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Lote info */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-forest-600">Finca</p>
                <dl className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-slate-500">Área</dt>
                    <dd className="text-sm font-semibold text-slate-800">{detailModal.area.toLocaleString('es-CO')} ha</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-slate-500">Fecha registro</dt>
                    <dd className="text-sm text-slate-700">
                      {new Date(detailModal.fechaRegistro + 'T00:00:00').toLocaleDateString('es-CO', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Ubicación */}
              <div className="rounded-xl border border-earth-100 bg-earth-50/30 p-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-earth-600">Ubicación</p>
                <dl className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-slate-500">Departamento</dt>
                    <dd className="text-sm text-slate-700">{detailModal.ubicacion.departamento}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-slate-500">Municipio</dt>
                    <dd className="text-sm text-slate-700">{detailModal.ubicacion.municipio}</dd>
                  </div>
                  {detailModal.ubicacion.vereda && (
                    <div className="flex items-center justify-between">
                      <dt className="text-xs text-slate-500">Vereda</dt>
                      <dd className="text-sm text-slate-700">{detailModal.ubicacion.vereda}</dd>
                    </div>
                  )}
                  {detailModal.ubicacion.coordenadas && (
                    <div className="flex items-start justify-between gap-2">
                      <dt className="text-xs text-slate-500 shrink-0">Coordenadas</dt>
                      <dd className="text-xs text-slate-600 text-right">{detailModal.ubicacion.coordenadas}</dd>
                    </div>
                  )}
                  {detailModal.ubicacion.direccion && (
                    <div className="flex items-start justify-between gap-2">
                      <dt className="text-xs text-slate-500 shrink-0">Dirección</dt>
                      <dd className="text-xs text-slate-600 text-right">{detailModal.ubicacion.direccion}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Dueño */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 sm:col-span-2">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Dueño e Información de Contacto</p>
                <div className="grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-slate-500">Nombre</dt>
                    <dd className="text-sm font-medium text-slate-800">{detailModal.dueno.nombre}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-slate-500">Documento</dt>
                    <dd className="text-sm text-slate-700">{detailModal.dueno.tipoDocumento} {detailModal.dueno.numeroDocumento}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-slate-500">Email</dt>
                    <dd className="text-sm text-slate-700">{detailModal.dueno.email}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-slate-500">Teléfono</dt>
                    <dd className="text-sm text-slate-700">{detailModal.dueno.telefono}</dd>
                  </div>
                  {detailModal.dueno.direccion && (
                    <div className="flex items-start justify-between gap-2 sm:col-span-2">
                      <dt className="text-xs text-slate-500 shrink-0">Dirección dueño</dt>
                      <dd className="text-sm text-slate-700 text-right">{detailModal.dueno.direccion}</dd>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Confirm Toggle Modal ─────────────────────────────────────────── */}
      <Modal
        open={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={confirmModal?.estado === 'activo' ? 'Inactivar finca' : 'Activar finca'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmModal(null)}>
              Cancelar
            </Button>
            <Button
              variant={confirmModal?.estado === 'activo' ? 'danger' : 'primary'}
              onClick={() => confirmModal && handleToggleEstado(confirmModal)}
            >
              {confirmModal?.estado === 'activo' ? 'Sí, inactivar' : 'Sí, activar'}
            </Button>
          </>
        }
      >
        {confirmModal && (
          <div className="py-2">
            <p className="text-sm text-slate-600">
              {confirmModal.estado === 'activo' ? (
                <>
                  ¿Estás seguro que deseas <span className="font-semibold text-red-600">inactivar</span> la finca{' '}
                  <span className="font-semibold text-slate-900">"{confirmModal.nombre}"</span>?
                  La finca dejará de estar disponible en operaciones activas.
                </>
              ) : (
                <>
                  ¿Estás seguro que deseas <span className="font-semibold text-forest-600">activar</span> la finca{' '}
                  <span className="font-semibold text-slate-900">"{confirmModal.nombre}"</span>?
                </>
              )}
            </p>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
