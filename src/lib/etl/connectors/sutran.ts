import { CanonicalOfficialEvent } from '../types';

/**
 * Conector ETL para el Mapa de Alerta y Transitabilidad Vial de SUTRAN
 * Ingesta interrupciones y restricciones en la Red Vial Nacional asociadas a eventos climáticos.
 */
export async function fetchSutranRoadAlerts(): Promise<CanonicalOfficialEvent[]> {
  const events: CanonicalOfficialEvent[] = [];

  try {
    // SUTRAN expone reportes de transitabilidad vial nacional:
    // http://viajeinforma.sutran.gob.pe/ / APIs de monitoreo GPS
    const mockSutranData = [
      {
        id: 'SUTRAN-VIA-2026-102',
        via: 'Carretera Central (PE-22)',
        tramo: 'Km 38+500 al Km 42+000 (Sector Ricardo Palma - Cupiche)',
        estado: 'TRANSITO_INTERRUMPIDO',
        causa: 'Caída de huayco con lodo y piedras de gran dimensión sobre la calzada.',
        longitudAfectadaKm: 3.5,
        fechaReporte: new Date().toISOString(),
        wkt: 'LINESTRING(-76.6620 -11.9210, -76.6450 -11.9180, -76.6300 -11.9150)'
      },
      {
        id: 'SUTRAN-VIA-2026-103',
        via: 'Panamericana Norte (PE-1N)',
        tramo: 'Km 824+000 (Puente Mórrope)',
        estado: 'TRANSITO_RESTRINGIDO',
        causa: 'Socavamiento de estribo izquierdo de puente por crecida de río. Paso a un solo carril.',
        longitudAfectadaKm: 0.8,
        fechaReporte: new Date().toISOString(),
        wkt: 'POINT(-80.0150 -6.5410)'
      },
      {
        id: 'SUTRAN-VIA-2026-104',
        via: 'Ruta Nacional PE-14A',
        tramo: 'Km 65 (Sector Huarochirí - Ancash)',
        estado: 'TRANSITO_INTERRUMPIDO',
        causa: 'Desprendimiento de plataforma vial hacia el río Santa por lluvias continuas.',
        longitudAfectadaKm: 1.2,
        fechaReporte: new Date().toISOString(),
        wkt: 'POINT(-77.8100 -8.5400)'
      }
    ];

    for (const item of mockSutranData) {
      events.push({
        source: 'OFFICIAL_SUTRAN',
        sourceEventId: item.id,
        category: item.estado === 'TRANSITO_INTERRUMPIDO' ? 'CORTE_VIA' : 'CORTE_VIA',
        title: `Corte de Vía: ${item.via} - ${item.tramo}`,
        description: `Estado: ${item.estado.replace('_', ' ')}. Causa: ${item.causa}`,
        severity: item.estado === 'TRANSITO_INTERRUMPIDO' ? 'critical' : 'high',
        wktGeometry: item.wkt,
        confirmedAt: item.fechaReporte,
        affectedKm: item.longitudAfectadaKm,
        isActive: true,
        metadata: {
          entidad: 'SUTRAN',
          via: item.via,
          estadoTransito: item.estado
        }
      });
    }
  } catch (err) {
    console.warn('[ETL SUTRAN] Error extrayendo datos:', err);
  }

  return events;
}
