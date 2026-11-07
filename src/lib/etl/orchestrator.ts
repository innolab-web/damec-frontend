import { fetchSenamhiAlerts } from './connectors/senamhi';
import { fetchSutranRoadAlerts } from './connectors/sutran';
import { fetchIndeciEmergencies } from './connectors/indeci';
import { CanonicalOfficialEvent, ETLSyncResult } from './types';

export interface OrchestrationReport {
  timestamp: string;
  totalExtracted: number;
  totalIngested: number;
  resultsBySource: ETLSyncResult[];
  status: 'completed' | 'partial' | 'failed';
}

/**
 * Orquestador Principal de Ingesta Oficial para DAMEC
 * Extrae, normaliza e inserta eventos de SENAMHI, SUTRAN e INDECI en PostGIS.
 */
export async function runOfficialETL(supabaseClient?: any): Promise<OrchestrationReport> {
  const startTime = new Date().toISOString();
  console.log(`[DAMEC ETL] Iniciando ciclo de ingesta oficial: ${startTime}`);

  // 1. Extracción concurrente de las 3 fuentes oficiales del Estado peruano
  const [senamhiRes, sutranRes, indeciRes] = await Promise.allSettled([
    fetchSenamhiAlerts(),
    fetchSutranRoadAlerts(),
    fetchIndeciEmergencies()
  ]);

  const senamhiEvents = senamhiRes.status === 'fulfilled' ? senamhiRes.value : [];
  const sutranEvents = sutranRes.status === 'fulfilled' ? sutranRes.value : [];
  const indeciEvents = indeciRes.status === 'fulfilled' ? indeciRes.value : [];

  const allEvents: CanonicalOfficialEvent[] = [
    ...senamhiEvents,
    ...sutranEvents,
    ...indeciEvents
  ];

  console.log(`[DAMEC ETL] Extraídos: SENAMHI (${senamhiEvents.length}), SUTRAN (${sutranEvents.length}), INDECI (${indeciEvents.length}). Total: ${allEvents.length}`);

  const resultsBySource: ETLSyncResult[] = [
    {
      source: 'OFFICIAL_SENAMHI',
      extractedCount: senamhiEvents.length,
      insertedCount: 0,
      updatedCount: 0,
      errorsCount: senamhiRes.status === 'rejected' ? 1 : 0,
      timestamp: startTime
    },
    {
      source: 'OFFICIAL_SUTRAN',
      extractedCount: sutranEvents.length,
      insertedCount: 0,
      updatedCount: 0,
      errorsCount: sutranRes.status === 'rejected' ? 1 : 0,
      timestamp: startTime
    },
    {
      source: 'OFFICIAL_SINPAD',
      extractedCount: indeciEvents.length,
      insertedCount: 0,
      updatedCount: 0,
      errorsCount: indeciRes.status === 'rejected' ? 1 : 0,
      timestamp: startTime
    }
  ];

  let totalIngested = 0;

  // 2. Inserción / Upsert en PostGIS si el cliente Supabase está presente
  if (supabaseClient) {
    try {
      // Obtener tipos de incidente para mapear IDs
      const { data: types } = await supabaseClient
        .from('cat_incident_type')
        .select('id, code');

      const typeMap = new Map<string, number>();
      if (types) {
        types.forEach((t: { id: number; code: string }) => typeMap.set(t.code, t.id));
      }

      for (const ev of allEvents) {
        const typeId = typeMap.get(ev.category) || 1;

        // Inserción en official_event
        const { error: insertErr } = await supabaseClient
          .from('official_event')
          .upsert({
            code_sinpad: ev.codeSinpad || ev.sourceEventId,
            source: ev.source,
            incident_type_id: typeId,
            title: ev.title,
            description: ev.description,
            severity: ev.severity,
            geom: ev.wktGeometry, // PostGIS acepta WKT directamente
            confirmed_at: ev.confirmedAt,
            is_active: ev.isActive
          }, {
            onConflict: 'code_sinpad'
          });

        if (!insertErr) {
          totalIngested++;
          const target = resultsBySource.find((r) => r.source === ev.source);
          if (target) target.insertedCount++;
        } else {
          console.warn(`[DAMEC ETL] Error insertando evento ${ev.sourceEventId}:`, insertErr.message);
          const target = resultsBySource.find((r) => r.source === ev.source);
          if (target) target.errorsCount++;
        }
      }

      // 3. Ejecutar conciliación cruzada con clusters ciudadanos (recalibrar scores)
      await supabaseClient.rpc('process_spatial_clusters').catch((rpcErr: any) => {
        console.warn('[DAMEC ETL] Aviso al recalibrar clusters:', rpcErr?.message);
      });

    } catch (dbErr) {
      console.error('[DAMEC ETL] Error de conexión a base de datos:', dbErr);
    }
  } else {
    // Modo simulación / sin credenciales activas
    totalIngested = allEvents.length;
    resultsBySource.forEach((r) => {
      r.insertedCount = r.extractedCount;
    });
  }

  return {
    timestamp: new Date().toISOString(),
    totalExtracted: allEvents.length,
    totalIngested,
    resultsBySource,
    status: totalIngested > 0 ? 'completed' : 'failed'
  };
}
