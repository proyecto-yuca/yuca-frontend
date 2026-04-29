import type {
  LecturaSensor,
  EstadoLectura,
  ResumenSensores,
  SensoresFilters,
  PaginatedSensores,
} from '../../types/sensores.types';

// ── Deterministic pseudo-random based on a seed ──────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ── Sensor configuration per lote ────────────────────────────────────────────

interface SensorConfig {
  baseHumedad: number;
  baseTemp: number;
  variacionHumedad: number;
  variacionTemp: number;
}

const SENSOR_CONFIG: Record<string, SensorConfig> = {
  '1': { baseHumedad: 68, baseTemp: 22, variacionHumedad: 12, variacionTemp: 5 },
  '2': { baseHumedad: 72, baseTemp: 25, variacionHumedad: 15, variacionTemp: 6 },
  '3': { baseHumedad: 55, baseTemp: 15, variacionHumedad: 10, variacionTemp: 7 },
  '4': { baseHumedad: 45, baseTemp: 28, variacionHumedad: 18, variacionTemp: 8 },
  '5': { baseHumedad: 80, baseTemp: 30, variacionHumedad: 10, variacionTemp: 4 },
  '6': { baseHumedad: 70, baseTemp: 18, variacionHumedad: 14, variacionTemp: 6 },
  '7': { baseHumedad: 75, baseTemp: 27, variacionHumedad: 12, variacionTemp: 5 },
  '8': { baseHumedad: 40, baseTemp: 20, variacionHumedad: 20, variacionTemp: 9 },
};

const DEFAULT_CONFIG: SensorConfig = { baseHumedad: 65, baseTemp: 24, variacionHumedad: 15, variacionTemp: 6 };

// ── Generate readings for a lote ─────────────────────────────────────────────

const SENSOR_IDS = ['SHT-3x-A', 'SHT-3x-B', 'DHT-22'];
const READINGS_PER_DAY = 4;
const HOURS = ['06:00', '11:00', '15:00', '20:00'];

function classifyEstado(humedad: number, temperatura: number): EstadoLectura {
  const humBad = humedad < 30 || humedad > 90;
  const tempBad = temperatura < 5 || temperatura > 38;
  const humWarn = humedad < 40 || humedad > 80;
  const tempWarn = temperatura < 10 || temperatura > 33;

  if (humBad || tempBad) return 'critico';
  if (humWarn || tempWarn) return 'alerta';
  return 'normal';
}

function generateReadingsForLote(loteId: string): LecturaSensor[] {
  const config = SENSOR_CONFIG[loteId] ?? DEFAULT_CONFIG;
  const readings: LecturaSensor[] = [];
  const today = new Date();

  // Generate 90 days of readings (most recent first)
  for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
    const d = new Date(today);
    d.setDate(d.getDate() - dayOffset);
    const fechaStr = d.toISOString().split('T')[0];

    for (let r = 0; r < READINGS_PER_DAY; r++) {
      const seed = hashString(`${loteId}-${fechaStr}-${r}`);

      const rH = seededRandom(seed);
      const rT = seededRandom(seed + 1);
      // Occasional spike via a separate random
      const spike = seededRandom(seed + 2) > 0.93;

      let humedad = config.baseHumedad + (rH - 0.5) * config.variacionHumedad * 2;
      let temperatura = config.baseTemp + (rT - 0.5) * config.variacionTemp * 2;

      if (spike) {
        humedad = seededRandom(seed + 3) > 0.5
          ? config.baseHumedad + config.variacionHumedad * 3
          : config.baseHumedad - config.variacionHumedad * 3;
        temperatura += seededRandom(seed + 4) > 0.5 ? 10 : -8;
      }

      humedad = Math.min(100, Math.max(0, Math.round(humedad * 10) / 10));
      temperatura = Math.round(temperatura * 10) / 10;

      const sensorIdx = Math.floor(seededRandom(seed + 5) * SENSOR_IDS.length);

      readings.push({
        id: `${loteId}-${fechaStr}-${r}`,
        loteId,
        fecha: fechaStr,
        horaRegistro: HOURS[r],
        sensorId: SENSOR_IDS[sensorIdx],
        humedad,
        temperatura,
        estado: classifyEstado(humedad, temperatura),
      });
    }
  }

  // Sort desc by fecha + hora
  readings.sort((a, b) => {
    const da = `${a.fecha}T${a.horaRegistro}`;
    const db = `${b.fecha}T${b.horaRegistro}`;
    return db.localeCompare(da);
  });

  return readings;
}

// In-memory cache so we don't regenerate on every call
const cache: Record<string, LecturaSensor[]> = {};

function getReadings(loteId: string): LecturaSensor[] {
  if (!cache[loteId]) {
    cache[loteId] = generateReadingsForLote(loteId);
  }
  return cache[loteId];
}

function buildResumen(data: LecturaSensor[]): ResumenSensores {
  if (data.length === 0) {
    return {
      totalLecturas: 0,
      humedadPromedio: 0,
      temperaturaPromedio: 0,
      humedadMin: 0,
      humedadMax: 0,
      temperaturaMin: 0,
      temperaturaMax: 0,
      alertas: 0,
      criticos: 0,
      ultimaLectura: null,
    };
  }

  const humedades = data.map((d) => d.humedad);
  const temps = data.map((d) => d.temperatura);

  return {
    totalLecturas: data.length,
    humedadPromedio: Math.round((humedades.reduce((a, b) => a + b, 0) / humedades.length) * 10) / 10,
    temperaturaPromedio: Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10,
    humedadMin: Math.min(...humedades),
    humedadMax: Math.max(...humedades),
    temperaturaMin: Math.min(...temps),
    temperaturaMax: Math.max(...temps),
    alertas: data.filter((d) => d.estado === 'alerta').length,
    criticos: data.filter((d) => d.estado === 'critico').length,
    ultimaLectura: data[0] ? `${data[0].fecha} ${data[0].horaRegistro}` : null,
  };
}

// ── Simulated network latency ─────────────────────────────────────────────────

function delay(ms = 600): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Public API ────────────────────────────────────────────────────────────────

const sensoresService = {
  async getLecturasByLote(
    loteId: string,
    filters: SensoresFilters,
    page: number,
    pageSize: number,
  ): Promise<PaginatedSensores> {
    await delay();

    let all = getReadings(loteId);

    // Filter by date range
    if (filters.fechaDesde) {
      all = all.filter((l) => l.fecha >= filters.fechaDesde);
    }
    if (filters.fechaHasta) {
      all = all.filter((l) => l.fecha <= filters.fechaHasta);
    }
    if (filters.estado !== 'todos') {
      all = all.filter((l) => l.estado === filters.estado);
    }

    const resumen = buildResumen(getReadings(loteId)); // resumen always over full set

    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const paged = all.slice(start, start + pageSize);

    return { data: paged, total, page: safePage, pageSize, totalPages, resumen };
  },

  // Simulate a "live" refresh — returns only today's readings
  async getLatestReadings(loteId: string): Promise<LecturaSensor[]> {
    await delay(300);
    const today = new Date().toISOString().split('T')[0];
    return getReadings(loteId).filter((l) => l.fecha === today);
  },
};

export default sensoresService;
