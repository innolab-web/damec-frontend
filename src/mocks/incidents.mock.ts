import { DamecGeoJSON } from '@/types/damec-geo';

export const MOCK_DAMEC_GEOJSON: DamecGeoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [-76.9854, -11.9342] // Chosica / Rímac
      },
      properties: {
        id: 'INC-2026-001',
        codeSinpad: 'SINPAD-004821',
        category: 'HUAYCO',
        title: 'Huayco activo en Quebrada Carossio',
        description: 'Flujo de detritos interrumpe Carretera Central km 34. Maquinaria pesada requerida.',
        severity: 'critical',
        source: 'OFFICIAL_SINPAD',
        ubigeo: '150119',
        region: 'Lima',
        province: 'Lima',
        district: 'Lurigancho-Chosica',
        confirmedAt: '2026-11-03T19:30:00Z',
        updatedAt: '2026-11-03T21:15:00Z',
        confidenceScore: 0.98,
        affectedKm: 2.4,
        isActive: true
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [-77.0311, -12.0464] // Cercado de Lima / Rímac
      },
      properties: {
        id: 'INC-2026-002',
        category: 'DESBORDE',
        title: 'Incremento de caudal crítico en Puente Piedra Liza',
        description: 'Río Rímac supera umbral naranja. Reportes ciudadanos coincidentes con aforo COEN.',
        severity: 'high',
        source: 'CITIZEN_CLUSTER',
        ubigeo: '150101',
        region: 'Lima',
        province: 'Lima',
        district: 'Lima',
        confirmedAt: '2026-11-03T20:10:00Z',
        updatedAt: '2026-11-03T21:40:00Z',
        confidenceScore: 0.82,
        reportsCount: 14,
        isActive: true
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [-80.6328, -5.1945] // Piura
      },
      properties: {
        id: 'INC-2026-003',
        category: 'INUNDACION',
        title: 'Inundación en el Bajo Piura (Catacaos)',
        description: 'Filtración y desborde en tramo Curumuy. Evacuación preventiva en curso.',
        severity: 'critical',
        source: 'OFFICIAL_SINPAD',
        ubigeo: '200105',
        region: 'Piura',
        province: 'Piura',
        district: 'Catacaos',
        confirmedAt: '2026-11-03T18:00:00Z',
        updatedAt: '2026-11-03T22:00:00Z',
        confidenceScore: 0.95,
        affectedKm: 5.8,
        isActive: true
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [-79.0300, -8.1117] // Trujillo / El Porvenir
      },
      properties: {
        id: 'INC-2026-004',
        category: 'LLUVIA_INTENSA',
        title: 'Lluvias torrenciales continuas en Quebrada San Ildefonso',
        description: 'Acumulación pluvial de 35mm en 3 horas. Alerta preventiva activada.',
        severity: 'moderate',
        source: 'OFFICIAL_SENAMHI',
        ubigeo: '130103',
        region: 'La Libertad',
        province: 'Trujillo',
        district: 'El Porvenir',
        confirmedAt: '2026-11-03T16:45:00Z',
        updatedAt: '2026-11-03T20:30:00Z',
        confidenceScore: 0.88,
        isActive: true
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [-76.6450, -11.9180] // Sector Ricardo Palma / Carretera Central
      },
      properties: {
        id: 'INC-2026-005',
        category: 'CORTE_VIA',
        title: 'SUTRAN Alerta: Tránsito Interrumpido Carretera Central Km 38-42',
        description: 'Caída de huayco con lodo y piedras sobre la calzada. Maquinaria de concesionaria Deviandes en camino.',
        severity: 'critical',
        source: 'OFFICIAL_SUTRAN',
        ubigeo: '150119',
        region: 'Lima',
        province: 'Lima',
        district: 'Lurigancho-Chosica',
        confirmedAt: '2026-11-03T21:00:00Z',
        updatedAt: '2026-11-03T22:30:00Z',
        confidenceScore: 1.00,
        affectedKm: 3.5,
        isActive: true
      }
    }
  ]
};
