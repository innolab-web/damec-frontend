export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { MOCK_DAMEC_GEOJSON } from '@/mocks/incidents.mock';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bbox = searchParams.get('bbox'); // minLng,minLat,maxLng,maxLat
    const minConfidence = parseFloat(searchParams.get('min_confidence') || '0.30');
    const incidentType = searchParams.get('type') || null;

    let minLng = -84.0;
    let minLat = -19.0;
    let maxLng = -68.0;
    let maxLat = 1.0;

    if (bbox) {
      const parts = bbox.split(',').map(Number);
      if (parts.length === 4 && !parts.some(isNaN)) {
        [minLng, minLat, maxLng, maxLat] = parts;
      }
    }

    let geojsonData = null;

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('get_clusters_geojson', {
        p_min_lng: minLng,
        p_min_lat: minLat,
        p_max_lng: maxLng,
        p_max_lat: maxLat,
        p_min_confidence: minConfidence,
        p_incident_type: incidentType
      });

      if (!error && data) {
        geojsonData = data;
      } else if (error) {
        console.warn('[API Clusters] Error llamando a RPC get_clusters_geojson:', error.message);
      }
    }

    // Fallback a datos mock filtrados si Supabase no está conectado
    if (!geojsonData) {
      const filtered = MOCK_DAMEC_GEOJSON.features.filter((f) => {
        const meetsConfidence = f.properties.confidenceScore >= minConfidence;
        const meetsType = !incidentType || f.properties.category === incidentType;
        return meetsConfidence && meetsType;
      });

      geojsonData = {
        type: 'FeatureCollection',
        features: filtered
      };
    }

    return new NextResponse(JSON.stringify(geojsonData), {
      status: 200,
      headers: {
        'Content-Type': 'application/geo+json',
        // Directiva de caché agresiva en el borde (Edge Caching) para absorber picos de tráfico
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
