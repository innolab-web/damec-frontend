export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    // Verificación opcional de autorización mediante CRON_SECRET o Header
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'No autorizado para ejecutar el pipeline de clustering.' },
        { status: 401 }
      );
    }

    if (!isSupabaseConfigured) {
      return NextResponse.json({
        status: 'simulated',
        message: 'Supabase no está configurado en las variables de entorno. Ejecución simulada con éxito.',
        timestamp: new Date().toISOString()
      });
    }

    // Invocar el procedimiento almacenado en PostGIS
    const { data, error } = await supabase.rpc('process_spatial_clusters');

    if (error) {
      console.error('[Cron Clustering] Error en RPC process_spatial_clusters:', error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'success',
      result: data,
      timestamp: new Date().toISOString()
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error inesperado';
    console.error('[Cron Clustering] Fallo de ejecución:', errorMsg);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}

// Soporte para solicitudes GET desde monitor de cron externo o navegador
export async function GET(req: NextRequest) {
  return POST(req);
}
