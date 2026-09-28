import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import type { User } from '../../types/auth.types';
import dashboardService from '../../services/dashboard/dashboardService';
import dashboardStatsService, {
  type ResumenAlertas,
  type ResumenGeneral,
} from '../../services/dashboard/dashboardStatsService';
import { SEVERIDAD_ESTILOS } from '../../lib/eventos';

interface StatCard {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

function buildStats(resumen: ResumenGeneral): StatCard[] {
  return [
    {
      label: 'Fincas registradas',
      value: String(resumen.totalFincas),
      subtext: `${resumen.fincasActivas} activas`,
      iconBg: 'bg-forest-50',
      iconColor: 'text-forest-600',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
    {
      label: 'Cultivos activos',
      value: String(resumen.totalCultivos),
      subtext: `en ${resumen.totalFincas} finca${resumen.totalFincas === 1 ? '' : 's'}`,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V9m0 0c0-4 3-6 6-6-1 3.5-3.5 6-6 6zm0 0C12 5 9 3 6 3c1 3.5 3.5 6 6 6z" />
        </svg>
      ),
    },
    {
      label: 'Sensores activos',
      value: `${resumen.sensoresActivos}/${resumen.totalSensores}`,
      subtext: 'sensores en operación',
      iconBg: 'bg-earth-50',
      iconColor: 'text-earth-600',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      ),
    },
    {
      label: 'Lecturas registradas hoy',
      value: String(resumen.lecturasHoy),
      subtext: new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }),
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18M7 15l4-4 3 3 5-6" />
        </svg>
      ),
    },
  ];
}

interface QuickAction {
  label: string;
  to: string;
  icon: React.ReactNode;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    label: 'Nueva finca',
    to: '/dashboard/fincas',
    color: 'bg-forest-50 text-forest-700 hover:bg-forest-100',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    label: 'Nuevo cultivo',
    to: '/dashboard/cultivos',
    color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V9m0 0c0-4 3-6 6-6-1 3.5-3.5 6-6 6zm0 0C12 5 9 3 6 3c1 3.5 3.5 6 6 6z" />
      </svg>
    ),
  },
  {
    label: 'Nuevo sensor',
    to: '/dashboard/sensores',
    color: 'bg-earth-50 text-earth-700 hover:bg-earth-100',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
      </svg>
    ),
  },
  {
    label: 'Ver lecturas',
    to: '/dashboard/lecturas',
    color: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18M7 15l4-4 3 3 5-6" />
      </svg>
    ),
  },
];

interface AlertasRecientesProps {
  alertas: ResumenAlertas | null;
  loading: boolean;
  onOpen: (fincaId: string, sensorId: string) => void;
}

function AlertasRecientes({ alertas, loading, onOpen }: AlertasRecientesProps) {
  const hayCriticas = (alertas?.criticasHoy ?? 0) > 0;
  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col gap-2 px-4 sm:px-5 py-4 border-b border-slate-50 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${hayCriticas ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Alertas recientes</h2>
            <p className="text-xs text-slate-400 mt-0.5">Lecturas fuera de los rangos configurados en Variables</p>
          </div>
        </div>
        {!loading && alertas && (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {alertas.hoy} hoy
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${hayCriticas ? SEVERIDAD_ESTILOS.critico.badge : 'bg-slate-50 text-slate-400'}`}>
              {alertas.criticasHoy} {alertas.criticasHoy === 1 ? 'crítica' : 'críticas'}
            </span>
          </div>
        )}
      </div>
      {loading ? (
        <div className="px-4 sm:px-5 py-8 text-center text-sm text-slate-400">Cargando…</div>
      ) : !alertas || alertas.ultimas.length === 0 ? (
        <div className="px-4 sm:px-5 py-8 text-center">
          <p className="text-sm font-medium text-slate-600">Todo en rango</p>
          <p className="text-xs text-slate-400">No hay lecturas fuera de rango registradas.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-50">
          {alertas.ultimas.map((a) => {
            const estilo = SEVERIDAD_ESTILOS[a.severidad];
            return (
              <li key={`${a.fincaId}-${a.id}`}>
                <button
                  type="button"
                  onClick={() => onOpen(a.fincaId, a.sensor.id)}
                  className="flex w-full items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 text-left hover:bg-slate-50/60 transition-colors"
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${estilo.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {a.evento.nombre}
                      <span className="font-normal text-slate-400"> · {a.sensor.nombre}</span>
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {a.cultivo?.nombre ?? 'Sin cultivo'} — {a.fincaNombre}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold whitespace-nowrap" style={{ color: estilo.hex }}>
                    {a.tipo === 'alto' ? '▲' : '▼'} {a.valor} <span className="text-xs font-normal text-slate-400">{a.variable.unidad}</span>
                  </span>
                  <span className="hidden sm:block shrink-0 text-[11px] text-slate-400 whitespace-nowrap">
                    {a.fecha} {a.horaRegistro}
                  </span>
                  <span
                    className="shrink-0 text-slate-400"
                    title={a.envio.enviadoAt ? `Correo enviado a ${a.envio.emails.join(', ')}` : 'Sin correo enviado'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${a.envio.enviadoAt ? 'text-forest-600' : 'text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function StatCardSkeleton() {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm animate-pulse">
      <div className="flex items-start justify-between gap-2">
        <div className="h-3 w-20 rounded bg-slate-100" />
        <div className="h-9 w-9 rounded-lg bg-slate-100" />
      </div>
      <div className="mt-3">
        <div className="h-6 w-12 rounded bg-slate-100" />
        <div className="mt-2 h-3 w-24 rounded bg-slate-100" />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<User | null>(null);
  const [resumen, setResumen] = useState<ResumenGeneral | null>(null);
  const [loadingResumen, setLoadingResumen] = useState(true);
  const [resumenError, setResumenError] = useState<string | null>(null);

  useEffect(() => {
    dashboardService
      .getProfile()
      .then(setProfile)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingResumen(true);
    setResumenError(null);
    dashboardStatsService
      .getResumenGeneral(8)
      .then((data) => {
        if (cancelled) return;
        setResumen(data);
      })
      .catch(() => {
        if (cancelled) return;
        setResumenError('No se pudo cargar el resumen. Intenta de nuevo más tarde.');
      })
      .finally(() => {
        if (!cancelled) setLoadingResumen(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayUser = profile ?? user;
  const firstName = displayUser?.name?.split(' ')[0] ?? 'Usuario';
  const today = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const stats = resumen ? buildStats(resumen) : [];

  return (
    <DashboardLayout pageTitle="Inicio">
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* Welcome banner */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
              {getGreeting()}, {firstName} 👋
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 capitalize">{today}</p>
          </div>
          <div className="flex items-center gap-2 mt-3 sm:mt-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1 text-xs font-medium text-forest-700 ring-1 ring-forest-200">
              <span className="h-1.5 w-1.5 rounded-full bg-forest-500" />
              Sistema operativo
            </span>
          </div>
        </div>

        {resumenError && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {resumenError}
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {loadingResumen
            ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
            : stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col justify-between rounded-xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs sm:text-sm font-medium text-slate-500 leading-tight">{stat.label}</p>
                    <span className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg ${stat.iconBg} ${stat.iconColor}`}>
                      {stat.icon}
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-xl sm:text-2xl font-bold text-slate-900">{stat.value}</p>
                    <p className="mt-1 text-xs font-medium text-slate-400">{stat.subtext}</p>
                  </div>
                </div>
              ))}
        </div>

        {/* Quick actions */}
        <div className="rounded-xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Acciones rápidas</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.to)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-medium transition-colors duration-150 ${action.color}`}
              >
                {action.icon}
                <span className="truncate">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        <AlertasRecientes
          alertas={resumen?.alertas ?? null}
          loading={loadingResumen}
          onOpen={(fincaId, sensorId) => navigate(`/dashboard/lecturas?finca=${fincaId}&sensor=${sensorId}`)}
        />

        {/* Bottom grid: activity + profile */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">

          {/* Activity feed */}
          <div className="lg:col-span-2 rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-slate-50">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Últimas lecturas</h2>
                <p className="text-xs text-slate-400 mt-0.5">Registros más recientes de tus sensores</p>
              </div>
              <button
                onClick={() => navigate('/dashboard/lecturas')}
                className="text-xs font-medium text-forest-600 hover:text-forest-700 hover:underline transition-colors"
              >
                Ver todo
              </button>
            </div>
            {loadingResumen ? (
              <div className="px-4 sm:px-5 py-8 text-center text-sm text-slate-400">Cargando…</div>
            ) : !resumen || resumen.ultimasLecturas.length === 0 ? (
              <div className="px-4 sm:px-5 py-8 text-center text-sm text-slate-400">
                Aún no hay lecturas registradas.
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {resumen.ultimasLecturas.map((lectura) => (
                  <li key={`${lectura.sensor.id}-${lectura.id}`} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-100 text-forest-700 text-xs font-bold">
                      {lectura.variable.unidad.slice(0, 2).toUpperCase() || '—'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {lectura.sensor.nombre} · {lectura.variable.nombre}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {lectura.valor} {lectura.variable.unidad} — {lectura.fincaNombre}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-slate-400 whitespace-nowrap">
                      {lectura.fecha} {lectura.horaRegistro}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Profile card */}
          <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="px-4 sm:px-5 py-4 border-b border-slate-50">
              <h2 className="text-sm font-semibold text-slate-900">Mi perfil</h2>
            </div>

            <div className="px-4 sm:px-5 py-5">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-forest-600 text-white text-2xl font-bold ring-4 ring-forest-50">
                    {displayUser?.name?.charAt(0).toUpperCase() ?? 'U'}
                  </div>
                  <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{displayUser?.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 break-all">{displayUser?.email}</p>
                  <span className="mt-2 inline-block rounded-full bg-forest-50 px-2.5 py-0.5 text-xs font-medium text-forest-700 ring-1 ring-forest-200/60">
                    {displayUser?.rol?.nombre ?? 'Usuario'}
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                  <span className="text-xs text-slate-500">Miembro desde</span>
                  <span className="text-xs font-medium text-slate-700">
                    {displayUser?.created_at
                      ? new Date(displayUser.created_at).toLocaleDateString('es-CO', {
                          year: 'numeric',
                          month: 'short',
                        })
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                  <span className="text-xs text-slate-500">Estado de cuenta</span>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Activa
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                  <span className="text-xs text-slate-500">Fincas a cargo</span>
                  <span className="text-xs font-medium text-earth-600">{resumen?.totalFincas ?? '—'}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
