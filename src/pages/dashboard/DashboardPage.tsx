import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import type { User } from '../../types/auth.types';
import dashboardService from '../../services/dashboard/dashboardService';

interface StatCard {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

const stats: StatCard[] = [
  {
    label: 'Usuarios activos',
    value: '2,847',
    change: '+12.5%',
    positive: true,
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: 'Ingresos del mes',
    value: '$48,294',
    change: '+8.2%',
    positive: true,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Nuevos registros',
    value: '342',
    change: '-3.1%',
    positive: false,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
  {
    label: 'Tasa de retención',
    value: '94.3%',
    change: '+1.8%',
    positive: true,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

const recentActivity = [
  { id: 1, name: 'María López', action: 'Se registró en la plataforma', time: 'Hace 5 min', initials: 'ML', color: 'bg-indigo-100 text-indigo-700' },
  { id: 2, name: 'Carlos Ruiz', action: 'Actualizó su perfil', time: 'Hace 12 min', initials: 'CR', color: 'bg-emerald-100 text-emerald-700' },
  { id: 3, name: 'Ana Torres', action: 'Completó su primer pedido', time: 'Hace 28 min', initials: 'AT', color: 'bg-violet-100 text-violet-700' },
  { id: 4, name: 'Luis Moreno', action: 'Cambió su contraseña', time: 'Hace 1 h', initials: 'LM', color: 'bg-amber-100 text-amber-700' },
  { id: 5, name: 'Sofía Jiménez', action: 'Se suscribió al plan Pro', time: 'Hace 2 h', initials: 'SJ', color: 'bg-rose-100 text-rose-700' },
];

const quickActions = [
  {
    label: 'Nuevo usuario',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
    color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
  },
  {
    label: 'Ver reportes',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  },
  {
    label: 'Configuración',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  },
  {
    label: 'Exportar datos',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
    color: 'bg-violet-50 text-violet-700 hover:bg-violet-100',
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

export function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);

  useEffect(() => {
    dashboardService
      .getProfile()
      .then(setProfile)
      .catch(() => {});
  }, []);

  const displayUser = profile ?? user;
  const firstName = displayUser?.name?.split(' ')[0] ?? 'Usuario';
  const today = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Sistema operativo
            </span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
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
                <div className="mt-1 flex items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-3 w-3 ${stat.positive ? 'text-emerald-500' : 'text-red-400'}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d={
                        stat.positive
                          ? 'M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z'
                          : 'M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z'
                      }
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className={`text-xs font-medium ${stat.positive ? 'text-emerald-600' : 'text-red-500'}`}>
                    {stat.change} vs mes anterior
                  </p>
                </div>
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
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-medium transition-colors duration-150 ${action.color}`}
              >
                {action.icon}
                <span className="truncate">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bottom grid: activity + profile */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">

          {/* Activity feed */}
          <div className="lg:col-span-2 rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-slate-50">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Actividad reciente</h2>
                <p className="text-xs text-slate-400 mt-0.5">Últimas acciones en la plataforma</p>
              </div>
              <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline transition-colors">
                Ver todo
              </button>
            </div>
            <ul className="divide-y divide-slate-50">
              {recentActivity.map((item) => (
                <li key={item.id} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${item.color}`}>
                    {item.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                    <p className="text-xs text-slate-500 truncate">{item.action}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-400 whitespace-nowrap">{item.time}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Profile card */}
          <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="px-4 sm:px-5 py-4 border-b border-slate-50">
              <h2 className="text-sm font-semibold text-slate-900">Mi perfil</h2>
            </div>

            <div className="px-4 sm:px-5 py-5">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white text-2xl font-bold ring-4 ring-indigo-50">
                    {displayUser?.name?.charAt(0).toUpperCase() ?? 'U'}
                  </div>
                  <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{displayUser?.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 break-all">{displayUser?.email}</p>
                  <span className="mt-2 inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 capitalize ring-1 ring-indigo-200/60">
                    {displayUser?.role ?? 'Usuario'}
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                  <span className="text-xs text-slate-500">Miembro desde</span>
                  <span className="text-xs font-medium text-slate-700">
                    {displayUser?.createdAt
                      ? new Date(displayUser.createdAt).toLocaleDateString('es-CO', {
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
                  <span className="text-xs text-slate-500">Plan actual</span>
                  <span className="text-xs font-medium text-indigo-700">Pro</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
