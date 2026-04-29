import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import sensoresService from '../../services/sensores/sensoresService';
import fincasService from '../../services/fincas/fincasService';
import type { LecturaSensor, SensoresFilters, ResumenSensores } from '../../types/sensores.types';
import type { Finca } from '../../types/fincas.types';

const PAGE_SIZE = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFecha(fecha: string): string {
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-CO', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getDefaultDateRange() {
  const today = new Date();
  const hace30 = new Date(today);
  hace30.setDate(today.getDate() - 29);
  return {
    fechaDesde: hace30.toISOString().split('T')[0],
    fechaHasta: today.toISOString().split('T')[0],
  };
}

// ── Badge components ──────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: LecturaSensor['estado'] }) {
  const styles = {
    normal: 'bg-forest-50 text-forest-700 ring-forest-200',
    alerta: 'bg-amber-50 text-amber-700 ring-amber-200',
    critico: 'bg-red-50 text-red-700 ring-red-200',
  };
  const dot = {
    normal: 'bg-forest-500',
    alerta: 'bg-amber-500',
    critico: 'bg-red-500 animate-pulse',
  };
  const labels = { normal: 'Normal', alerta: 'Alerta', critico: 'Crítico' };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${styles[estado]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot[estado]}`} />
      {labels[estado]}
    </span>
  );
}

function HumedadBar({ value }: { value: number }) {
  const color =
    value < 30 || value > 90
      ? 'bg-red-500'
      : value < 40 || value > 80
        ? 'bg-amber-400'
        : 'bg-forest-500';

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className="text-sm font-medium text-slate-700 tabular-nums w-12">
        {value}%
      </span>
    </div>
  );
}

function TempChip({ value }: { value: number }) {
  const isCold = value < 10;
  const isHot = value > 33;
  const isVeryHot = value > 38;
  const isVeryCold = value < 5;

  const color =
    isVeryCold || isVeryHot
      ? 'text-red-600 font-bold'
      : isCold || isHot
        ? 'text-amber-600 font-semibold'
        : 'text-slate-700 font-medium';

  return (
    <span className={`tabular-nums ${color}`}>
      {value} °C
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  alert?: boolean;
}
function StatCard({ label, value, sub, icon, iconBg, iconColor, alert }: StatCardProps) {
  return (
    <div className={`flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm ${alert ? 'border-red-200' : 'border-slate-100'}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-500 leading-tight">{label}</p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
          {icon}
        </span>
      </div>
      <div>
        <p className={`text-xl font-bold ${alert ? 'text-red-600' : 'text-slate-900'}`}>{value}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

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
        <span className="font-medium text-slate-700">{total}</span> lecturas
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e-${i}`} className="flex h-8 w-8 items-center justify-center text-xs text-slate-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={[
                'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors',
                p === page ? 'bg-forest-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100',
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
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function FincaSensoresPage() {
  const { fincaId } = useParams<{ fincaId: string }>();

  const [finca, setFinca] = useState<Finca | null>(null);
  const [lecturas, setLecturas] = useState<LecturaSensor[]>([]);
  const [resumen, setResumen] = useState<ResumenSensores | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const defaults = getDefaultDateRange();
  const [filters, setFilters] = useState<SensoresFilters>({
    fechaDesde: defaults.fechaDesde,
    fechaHasta: defaults.fechaHasta,
    estado: 'todos',
  });

  // Auto-refresh interval ref
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load finca info once
  useEffect(() => {
    if (!fincaId) return;
    fincasService.getById(fincaId).then(setFinca).catch(() => {});
  }, [fincaId]);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!fincaId) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const result = await sensoresService.getLecturasByFinca(fincaId, filters, page, PAGE_SIZE);
        setLecturas(result.data);
        setTotal(result.total);
        setTotalPages(result.totalPages);
        setResumen(result.resumen);
        if (result.page !== page) setPage(result.page);
        setLastRefresh(new Date());
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fincaId, filters, page],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [filters.fechaDesde, filters.fechaHasta, filters.estado]);

  // Auto-refresh every 60 seconds to simulate live sensor data
  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      fetchData(true);
    }, 60_000);
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [fetchData]);

  const handleManualRefresh = () => fetchData(true);

  const timeSinceRefresh = Math.floor((Date.now() - lastRefresh.getTime()) / 1000);
  const refreshLabel =
    timeSinceRefresh < 60
      ? `Hace ${timeSinceRefresh}s`
      : `Hace ${Math.floor(timeSinceRefresh / 60)} min`;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout pageTitle={`Sensores — ${finca?.nombre ?? '…'}`}>
      <div className="space-y-5 max-w-7xl mx-auto">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-slate-500">
          <Link to="/dashboard" className="hover:text-forest-600 transition-colors">Inicio</Link>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link to="/dashboard/fincas" className="hover:text-forest-600 transition-colors">Lotes</Link>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-700 font-medium truncate max-w-[200px]">
            {finca?.nombre ?? 'Cargando…'}
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-400">Sensores</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-forest-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Sensores — {finca ? finca.nombre : <span className="inline-block h-5 w-40 animate-pulse rounded bg-slate-200 align-middle" />}
                </h1>
                <p className="text-sm text-slate-500">
                  {finca
                    ? `${finca.ubicacion.municipio}, ${finca.ubicacion.departamento} · ${finca.area} ha`
                    : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Live indicator + refresh */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1.5 text-xs font-medium text-forest-700 ring-1 ring-forest-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-forest-500" />
              </span>
              En línea
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
              title="Actualizar datos"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? 'Actualizando…' : `Actualizar · ${refreshLabel}`}
            </button>
          </div>
        </div>

        {/* Stats cards */}
        {resumen && !loading && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label="Humedad promedio"
              value={`${resumen.humedadPromedio}%`}
              sub={`Rango: ${resumen.humedadMin}% – ${resumen.humedadMax}%`}
              iconBg="bg-blue-50"
              iconColor="text-blue-500"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
            />
            <StatCard
              label="Temperatura promedio"
              value={`${resumen.temperaturaPromedio} °C`}
              sub={`Rango: ${resumen.temperaturaMin} – ${resumen.temperaturaMax} °C`}
              iconBg="bg-orange-50"
              iconColor="text-orange-500"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
            />
            <StatCard
              label="Alertas (período)"
              value={String(resumen.alertas)}
              sub="Lecturas en rango de alerta"
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              alert={resumen.alertas > 0}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
            <StatCard
              label="Críticos (período)"
              value={String(resumen.criticos)}
              sub="Lecturas en estado crítico"
              iconBg="bg-red-50"
              iconColor="text-red-500"
              alert={resumen.criticos > 0}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              id="fechaDesde"
              label="Desde"
              type="date"
              value={filters.fechaDesde}
              max={filters.fechaHasta}
              onChange={(e) => setFilters((f) => ({ ...f, fechaDesde: e.target.value }))}
              className="w-auto"
            />
            <Input
              id="fechaHasta"
              label="Hasta"
              type="date"
              value={filters.fechaHasta}
              min={filters.fechaDesde}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setFilters((f) => ({ ...f, fechaHasta: e.target.value }))}
              className="w-auto"
            />
            <div className="w-40">
              <Select
                id="filter-estado"
                label="Estado"
                value={filters.estado}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    estado: e.target.value as SensoresFilters['estado'],
                  }))
                }
                options={[
                  { value: 'todos', label: 'Todos' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'alerta', label: 'Alerta' },
                  { value: 'critico', label: 'Crítico' },
                ]}
              />
            </div>
          </div>

          <div className="flex gap-2 sm:ml-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const d = getDefaultDateRange();
                setFilters({ fechaDesde: d.fechaDesde, fechaHasta: d.fechaHasta, estado: 'todos' });
              }}
            >
              Últimos 30 días
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setFilters((f) => ({ ...f, fechaDesde: today, fechaHasta: today }));
              }}
            >
              Solo hoy
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          {/* Table info bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              <p className="text-xs font-semibold text-slate-600">
                Lecturas de sensores IoT
              </p>
              {refreshing && (
                <span className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2 py-0.5 text-[10px] font-medium text-forest-600 ring-1 ring-forest-200">
                  <svg className="h-2.5 w-2.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sincronizando
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Actualizado: {lastRefresh.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hidden sm:table-cell">Hora</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">Sensor ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Humedad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Temperatura</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3.5"><div className="h-4 w-28 rounded bg-slate-100" /></td>
                      <td className="px-4 py-3.5 hidden sm:table-cell"><div className="h-4 w-12 rounded bg-slate-100" /></td>
                      <td className="px-4 py-3.5 hidden md:table-cell"><div className="h-4 w-20 rounded bg-slate-100" /></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-slate-100" />
                          <div className="h-4 w-10 rounded bg-slate-100" />
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><div className="h-4 w-14 rounded bg-slate-100" /></td>
                      <td className="px-4 py-3.5"><div className="h-5 w-16 rounded-full bg-slate-100 mx-auto" /></td>
                    </tr>
                  ))
                ) : lecturas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <span className="text-4xl">📡</span>
                        <p className="text-sm font-medium text-slate-600">Sin lecturas en este período</p>
                        <p className="text-xs text-slate-400">Ajusta el rango de fechas o el filtro de estado</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  lecturas.map((lectura) => (
                    <tr
                      key={lectura.id}
                      className={[
                        'hover:bg-slate-50/60 transition-colors',
                        lectura.estado === 'critico' ? 'bg-red-50/30' : '',
                        lectura.estado === 'alerta' ? 'bg-amber-50/20' : '',
                      ].join(' ')}
                    >
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-800 leading-tight whitespace-nowrap">
                          {formatFecha(lectura.fecha)}
                        </p>
                        <p className="text-xs text-slate-400 sm:hidden">{lectura.horaRegistro}</p>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600">
                          {lectura.horaRegistro}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-forest-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                          </svg>
                          {lectura.sensorId}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <HumedadBar value={lectura.humedad} />
                      </td>
                      <td className="px-4 py-3.5">
                        <TempChip value={lectura.temperatura} />
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <EstadoBadge estado={lectura.estado} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && lecturas.length > 0 && (
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

        {/* Threshold reference */}
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Referencia de umbrales</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">💧 Humedad relativa</p>
              <div className="space-y-1.5">
                {[
                  { label: 'Normal', range: '40% – 80%', color: 'bg-forest-500' },
                  { label: 'Alerta', range: '30–40% o 80–90%', color: 'bg-amber-400' },
                  { label: 'Crítico', range: '< 30% o > 90%', color: 'bg-red-500' },
                ].map((t) => (
                  <div key={t.label} className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${t.color}`} />
                    <span className="text-xs text-slate-600 font-medium w-14">{t.label}</span>
                    <span className="text-xs text-slate-400">{t.range}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">🌡️ Temperatura</p>
              <div className="space-y-1.5">
                {[
                  { label: 'Normal', range: '10 °C – 33 °C', color: 'bg-forest-500' },
                  { label: 'Alerta', range: '5–10 °C o 33–38 °C', color: 'bg-amber-400' },
                  { label: 'Crítico', range: '< 5 °C o > 38 °C', color: 'bg-red-500' },
                ].map((t) => (
                  <div key={t.label} className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${t.color}`} />
                    <span className="text-xs text-slate-600 font-medium w-14">{t.label}</span>
                    <span className="text-xs text-slate-400">{t.range}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
