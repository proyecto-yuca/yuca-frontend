import fincasService from '../fincas/fincasService';
import cultivosService from '../cultivos/cultivosService';
import sensorService from '../sensores/sensorService';
import lecturasService from '../lecturas/lecturasService';
import type { Finca } from '../../types/fincas.types';
import type { Sensor } from '../../types/sensor.types';
import type { Lectura } from '../../types/lecturas.types';

export interface LecturaConFinca extends Lectura {
  fincaId: string;
  fincaNombre: string;
}

export interface ResumenGeneral {
  totalFincas: number;
  fincasActivas: number;
  totalCultivos: number;
  totalSensores: number;
  sensoresActivos: number;
  lecturasHoy: number;
  ultimasLecturas: LecturaConFinca[];
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function ultimosNDias(n: number): string[] {
  const fechas: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    fechas.push(d.toISOString().slice(0, 10));
  }
  return fechas;
}

async function getAllFincas(): Promise<Finca[]> {
  const result = await fincasService.getAll({ search: '', estado: 'todos' }, 1, 1000);
  return result.data;
}

function ordenarPorFechaDesc<T extends { fecha: string; horaRegistro: string }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    `${b.fecha}T${b.horaRegistro}`.localeCompare(`${a.fecha}T${a.horaRegistro}`),
  );
}

// Agrega las últimas lecturas de un conjunto de sensores de una finca.
// Hace una llamada por sensor (la API no expone un endpoint agregado por finca).
async function getUltimasLecturasSensores(
  fincaId: string,
  fincaNombre: string,
  sensores: Sensor[],
  limitPerSensor = 5,
): Promise<LecturaConFinca[]> {
  const resultados = await Promise.all(
    sensores.map((sensor) =>
      lecturasService.getAll(fincaId, sensor.id, {}, 1, limitPerSensor).catch(() => null),
    ),
  );
  const lecturas = resultados
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .flatMap((r) => r.data)
    .map((l) => ({ ...l, fincaId, fincaNombre }));
  return ordenarPorFechaDesc(lecturas);
}

async function contarLecturasHoy(fincaId: string, sensores: Sensor[]): Promise<number> {
  const fecha = hoy();
  const totales = await Promise.all(
    sensores.map((sensor) =>
      lecturasService
        .getAll(fincaId, sensor.id, { fechaDesde: fecha, fechaHasta: fecha }, 1, 1)
        .then((r) => r.total)
        .catch(() => 0),
    ),
  );
  return totales.reduce((sum, n) => sum + n, 0);
}

export interface LecturasPorDia {
  fecha: string;
  cantidad: number;
}

// Cuenta lecturas por día en los últimos `dias` días para una finca, sumando sobre todos sus sensores.
async function getLecturasPorDia(
  fincaId: string,
  sensores: Sensor[],
  dias = 7,
): Promise<LecturasPorDia[]> {
  const fechas = ultimosNDias(dias);
  const desde = fechas[0];
  const hasta = fechas[fechas.length - 1];

  const resultados = await Promise.all(
    sensores.map((sensor) =>
      lecturasService
        .getAll(fincaId, sensor.id, { fechaDesde: desde, fechaHasta: hasta }, 1, 500)
        .catch(() => null),
    ),
  );

  const counts = new Map<string, number>(fechas.map((f) => [f, 0]));
  resultados
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .flatMap((r) => r.data)
    .forEach((l) => {
      if (counts.has(l.fecha)) counts.set(l.fecha, (counts.get(l.fecha) ?? 0) + 1);
    });

  return fechas.map((fecha) => ({ fecha, cantidad: counts.get(fecha) ?? 0 }));
}

export interface SensorPorVariable {
  variable: string;
  cantidad: number;
}

// Cuenta sensores por variable a nivel global (todas las fincas del usuario).
async function getSensoresPorVariableGlobal(): Promise<SensorPorVariable[]> {
  const fincas = await getAllFincas();
  const sensoresPorFinca = await Promise.all(
    fincas.map((f) => sensorService.getAll(f.id).catch(() => [])),
  );
  const counts = new Map<string, number>();
  sensoresPorFinca.flat().forEach((sensor) => {
    sensor.variables.forEach((v) => counts.set(v.nombre, (counts.get(v.nombre) ?? 0) + 1));
  });
  return Array.from(counts.entries())
    .map(([variable, cantidad]) => ({ variable, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

async function getResumenGeneral(limitUltimasLecturas = 8): Promise<ResumenGeneral> {
  const fincas = await getAllFincas();

  const porFinca = await Promise.all(
    fincas.map(async (finca) => {
      const [cultivos, sensores] = await Promise.all([
        cultivosService.getAll(finca.id).catch(() => []),
        sensorService.getAll(finca.id).catch(() => []),
      ]);
      return { finca, cultivos, sensores };
    }),
  );

  const totalCultivos = porFinca.reduce((sum, f) => sum + f.cultivos.length, 0);
  const totalSensores = porFinca.reduce((sum, f) => sum + f.sensores.length, 0);
  const sensoresActivos = porFinca.reduce(
    (sum, f) => sum + f.sensores.filter((s) => s.activo).length,
    0,
  );

  const lecturasHoyPorFinca = await Promise.all(
    porFinca.map((f) => contarLecturasHoy(f.finca.id, f.sensores)),
  );
  const lecturasHoy = lecturasHoyPorFinca.reduce((sum, n) => sum + n, 0);

  const ultimasPorFinca = await Promise.all(
    porFinca.map((f) =>
      getUltimasLecturasSensores(f.finca.id, f.finca.nombre, f.sensores, 3),
    ),
  );
  const ultimasLecturas = ordenarPorFechaDesc(ultimasPorFinca.flat()).slice(
    0,
    limitUltimasLecturas,
  );

  return {
    totalFincas: fincas.length,
    fincasActivas: fincas.filter((f) => f.estado === 'activo').length,
    totalCultivos,
    totalSensores,
    sensoresActivos,
    lecturasHoy,
    ultimasLecturas,
  };
}

const dashboardStatsService = {
  getAllFincas,
  getUltimasLecturasSensores,
  contarLecturasHoy,
  getLecturasPorDia,
  getSensoresPorVariableGlobal,
  getResumenGeneral,
};

export default dashboardStatsService;
