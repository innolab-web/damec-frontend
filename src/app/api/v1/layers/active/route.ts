export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { MOCK_DAMEC_GEOJSON } from '@/mocks/incidents.mock';

export async function GET() {
  try {
    let geojsonData = null;

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('get_damec_active_features');
      if (!error && data) {
        geojsonData = data;
      }
    }

    if (!geojsonData) {
      geojsonData = MOCK_DAMEC_GEOJSON;
    }

    return new NextResponse(JSON.stringify(geojsonData), {
      status: 200,
      headers: {
        'Content-Type': 'application/geo+json',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
