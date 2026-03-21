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
  color: string;
}

const stats: StatCard[] = [
  {
    label: 'Usuarios activos',
    value: '2,847',
    change: '+12.5%',
    positive: true,
    color: 'bg-indigo-50 text-indigo-600',
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
    color: 'bg-green-50 text-green-600',
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
    color: 'bg-amber-50 text-amber-600',
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
    color: 'bg-violet-50 text-violet-600',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

const recentActivity = [
  { id: 1, user: 'María López', action: 'Se registró en la plataforma', time: 'Hace 5 min', avatar: 'M' },
  { id: 2, user: 'Carlos Ruiz', action: 'Actualizó su perfil', time: 'Hace 12 min', avatar: 'C' },
  { id: 3, user: 'Ana Torres', action: 'Completó su primer pedido', time: 'Hace 28 min', avatar: 'A' },
  { id: 4, user: 'Luis Moreno', action: 'Cambió su contraseña', time: 'Hace 1 h', avatar: 'L' },
  { id: 5, user: 'Sofia Jiménez', action: 'Se suscribió al plan Pro', time: 'Hace 2 h', avatar: 'S' },
];

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Hola, {displayUser?.name?.split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Aquí tienes un resumen de la actividad reciente.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.color}`}>
                  {stat.icon}
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className={`mt-1 text-xs font-medium ${stat.positive ? 'text-green-600' : 'text-red-500'}`}>
                  {stat.change} vs mes anterior
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-900">Actividad reciente</h2>
              <button className="text-xs text-indigo-600 hover:underline font-medium">Ver todo</button>
            </div>
            <ul className="divide-y divide-slate-50">
              {recentActivity.map((item) => (
                <li key={item.id} className="flex items-center gap-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold">
                    {item.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.user}</p>
                    <p className="text-xs text-slate-500 truncate">{item.action}</p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{item.time}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-5">Tu perfil</h2>
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white text-2xl font-bold">
                {displayUser?.name?.charAt(0).toUpperCase() ?? 'U'}
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-900">{displayUser?.name}</p>
                <p className="text-sm text-slate-500">{displayUser?.email}</p>
                <span className="mt-2 inline-block rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-medium text-indigo-700 capitalize">
                  {displayUser?.role ?? 'Usuario'}
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-2">
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
                <span className="text-xs text-slate-500">Estado</span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Activo
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
