import type { Finca, FincaFormData, FincaFilters, PaginatedResult } from '../../types/fincas.types';

const mockFincas: Finca[] = [
  {
    id: '1',
    nombre: 'Finca El Paraíso',
    descripcion: 'Terreno con buena irrigación natural, apto para cultivos de yuca y maíz.',
    area: 12.5,
    ubicacion: {
      departamento: 'Cundinamarca',
      municipio: 'Fusagasugá',
      vereda: 'El Jordán',
      coordenadas: '4.3372° N, 74.3641° W',
      direccion: 'Vereda El Jordán, km 3 vía Silvania',
    },
    dueno: {
      nombre: 'Carlos Alberto Ramírez',
      tipoDocumento: 'CC',
      numeroDocumento: '79456123',
      email: 'carlos.ramirez@email.com',
      telefono: '3001234567',
      direccion: 'Calle 12 #45-23, Fusagasugá',
    },
    estado: 'activo',
    fechaRegistro: '2024-03-15',
  },
  {
    id: '2',
    nombre: 'Hacienda La Esperanza',
    descripcion: 'Terreno amplio con acceso vehicular y fuente hídrica cercana.',
    area: 28.3,
    ubicacion: {
      departamento: 'Tolima',
      municipio: 'Ibagué',
      vereda: 'San Bernardo',
      coordenadas: '4.4389° N, 75.2322° W',
      direccion: 'Vereda San Bernardo, finca La Esperanza',
    },
    dueno: {
      nombre: 'María Fernanda Ospina',
      tipoDocumento: 'CC',
      numeroDocumento: '45231789',
      email: 'mfospina@correo.co',
      telefono: '3109876543',
      direccion: 'Carrera 5 #12-40, Ibagué',
    },
    estado: 'activo',
    fechaRegistro: '2024-04-02',
  },
  {
    id: '3',
    nombre: 'Finca Los Cedros',
    descripcion: 'Finca con suelo arcilloso, ideal para tubérculos.',
    area: 7.8,
    ubicacion: {
      departamento: 'Boyacá',
      municipio: 'Tunja',
      vereda: 'Runta',
      coordenadas: '5.5353° N, 73.3678° W',
    },
    dueno: {
      nombre: 'Agropecuaria Andina S.A.S.',
      tipoDocumento: 'NIT',
      numeroDocumento: '900123456-7',
      email: 'info@agroandina.com',
      telefono: '3155554433',
      direccion: 'Av. Colón #27-30, Tunja',
    },
    estado: 'activo',
    fechaRegistro: '2024-05-20',
  },
  {
    id: '4',
    nombre: 'Parcela El Roble',
    descripcion: 'Parcela pequeña, actualmente sin cultivo activo.',
    area: 3.2,
    ubicacion: {
      departamento: 'Santander',
      municipio: 'Bucaramanga',
      vereda: 'Malpaso',
      coordenadas: '7.1193° N, 73.1227° W',
      direccion: 'Vereda Malpaso, sector norte',
    },
    dueno: {
      nombre: 'Jorge Enrique Suárez',
      tipoDocumento: 'CC',
      numeroDocumento: '13857492',
      email: 'jesuarez@gmail.com',
      telefono: '3204445566',
    },
    estado: 'inactivo',
    fechaRegistro: '2023-11-08',
  },
  {
    id: '5',
    nombre: 'Terreno Buena Vista',
    descripcion: 'Alta producción histórica de yuca para exportación.',
    area: 45.0,
    ubicacion: {
      departamento: 'Córdoba',
      municipio: 'Montería',
      vereda: 'Las Palmas',
      coordenadas: '8.7479° N, 75.8814° W',
      direccion: 'Km 15 vía Montería-Cereté, finca Buena Vista',
    },
    dueno: {
      nombre: 'Agroexportar del Caribe Ltda.',
      tipoDocumento: 'NIT',
      numeroDocumento: '812005631-2',
      email: 'operaciones@agrocaribe.co',
      telefono: '6047001122',
      direccion: 'Calle 41 #7-55, Montería',
    },
    estado: 'activo',
    fechaRegistro: '2024-01-10',
  },
  {
    id: '6',
    nombre: 'Finca San Isidro',
    descripcion: 'Lote en zona de ladera con cultivos escalonados.',
    area: 9.1,
    ubicacion: {
      departamento: 'Nariño',
      municipio: 'Pasto',
      vereda: 'La Cocha',
      coordenadas: '1.2136° N, 77.2811° W',
    },
    dueno: {
      nombre: 'Rosa Elvira Chamorro',
      tipoDocumento: 'CC',
      numeroDocumento: '30456812',
      email: 'rchamorro@hotmail.com',
      telefono: '3112223344',
    },
    estado: 'activo',
    fechaRegistro: '2024-06-01',
  },
  {
    id: '7',
    nombre: 'Campo Alegre',
    descripcion: 'Terreno plano con riego por aspersión instalado.',
    area: 18.7,
    ubicacion: {
      departamento: 'Valle del Cauca',
      municipio: 'Palmira',
      vereda: 'Tablones',
      coordenadas: '3.5394° N, 76.3031° W',
      direccion: 'Hacienda Campo Alegre, Palmira',
    },
    dueno: {
      nombre: 'Inversiones Campo Verde S.A.',
      tipoDocumento: 'NIT',
      numeroDocumento: '805018472-1',
      email: 'admin@campoverde.com.co',
      telefono: '6022334455',
      direccion: 'Carrera 28 #40-15, Palmira',
    },
    estado: 'activo',
    fechaRegistro: '2024-02-28',
  },
  {
    id: '8',
    nombre: 'Parcela El Nogal',
    descripcion: 'Suelo degradado, en proceso de recuperación.',
    area: 5.5,
    ubicacion: {
      departamento: 'Caldas',
      municipio: 'Manizales',
      vereda: 'La Enea',
      coordenadas: '5.0703° N, 75.5138° W',
    },
    dueno: {
      nombre: 'Héctor Manuel Ríos',
      tipoDocumento: 'CC',
      numeroDocumento: '8764512',
      email: 'hrios@correo.com',
      telefono: '3016667788',
    },
    estado: 'inactivo',
    fechaRegistro: '2023-09-14',
  },
];

let data: Finca[] = [...mockFincas];
let nextId = mockFincas.length + 1;

function simulateDelay(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateId(): string {
  return String(nextId++);
}

const fincasService = {
  async getAll(
    filters: FincaFilters,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<Finca>> {
    await simulateDelay();

    let filtered = data.filter((lote) => {
      const matchesSearch =
        !filters.search ||
        lote.nombre.toLowerCase().includes(filters.search.toLowerCase()) ||
        lote.dueno.nombre.toLowerCase().includes(filters.search.toLowerCase()) ||
        lote.ubicacion.municipio.toLowerCase().includes(filters.search.toLowerCase()) ||
        lote.ubicacion.departamento.toLowerCase().includes(filters.search.toLowerCase());

      const matchesEstado =
        filters.estado === 'todos' || lote.estado === filters.estado;

      return matchesSearch && matchesEstado;
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    return { data: paged, total, page: safePage, pageSize, totalPages };
  },

  async getById(id: string): Promise<Finca | null> {
    await simulateDelay(150);
    return data.find((l) => l.id === id) ?? null;
  },

  async create(formData: FincaFormData): Promise<Finca> {
    await simulateDelay();
    const newFinca: Finca = {
      id: generateId(),
      nombre: formData.nombre,
      descripcion: formData.descripcion || undefined,
      area: parseFloat(formData.area),
      ubicacion: {
        departamento: formData.ubicacion.departamento,
        municipio: formData.ubicacion.municipio,
        vereda: formData.ubicacion.vereda || undefined,
        coordenadas: formData.ubicacion.coordenadas || undefined,
        direccion: formData.ubicacion.direccion || undefined,
      },
      dueno: {
        nombre: formData.dueno.nombre,
        tipoDocumento: formData.dueno.tipoDocumento,
        numeroDocumento: formData.dueno.numeroDocumento,
        email: formData.dueno.email,
        telefono: formData.dueno.telefono,
        direccion: formData.dueno.direccion || undefined,
      },
      estado: 'activo',
      fechaRegistro: new Date().toISOString().split('T')[0],
    };
    data = [newFinca, ...data];
    return newFinca;
  },

  async update(id: string, formData: FincaFormData): Promise<Finca> {
    await simulateDelay();
    const index = data.findIndex((l) => l.id === id);
    if (index === -1) throw new Error('Finca no encontrada');

    const updated: Finca = {
      ...data[index],
      nombre: formData.nombre,
      descripcion: formData.descripcion || undefined,
      area: parseFloat(formData.area),
      ubicacion: {
        departamento: formData.ubicacion.departamento,
        municipio: formData.ubicacion.municipio,
        vereda: formData.ubicacion.vereda || undefined,
        coordenadas: formData.ubicacion.coordenadas || undefined,
        direccion: formData.ubicacion.direccion || undefined,
      },
      dueno: {
        nombre: formData.dueno.nombre,
        tipoDocumento: formData.dueno.tipoDocumento,
        numeroDocumento: formData.dueno.numeroDocumento,
        email: formData.dueno.email,
        telefono: formData.dueno.telefono,
        direccion: formData.dueno.direccion || undefined,
      },
    };

    data = data.map((l) => (l.id === id ? updated : l));
    return updated;
  },

  async toggleEstado(id: string): Promise<Finca> {
    await simulateDelay(200);
    const index = data.findIndex((l) => l.id === id);
    if (index === -1) throw new Error('Finca no encontrada');

    const updated: Finca = {
      ...data[index],
      estado: data[index].estado === 'activo' ? 'inactivo' : 'activo',
    };
    data = data.map((l) => (l.id === id ? updated : l));
    return updated;
  },
};

export default fincasService;
