export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { runOfficialETL } from '@/lib/etl/orchestrator';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'No autorizado para ejecutar el pipeline ETL oficial.' },
        { status: 401 }
      );
    }

    const client = isSupabaseConfigured ? supabase : undefined;
    const report = await runOfficialETL(client);

    return NextResponse.json({
      success: true,
      report
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error inesperado';
    console.error('[API Cron ETL] Error ejecutando pipeline oficial:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
