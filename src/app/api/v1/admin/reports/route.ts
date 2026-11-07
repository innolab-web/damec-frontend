import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Mock de reportes crudos para desarrollo local o demostración
let IN_MEMORY_MOCK_REPORTS = [
  {
    id: 'rep_demo_001',
    incident_type_id: 1,
    category: 'HUAYCO',
    description: 'Flujo de barro ingresando por la quebrada a la altura del km 35.',
    media_url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80',
    latitude: -11.9342,
    longitude: -76.9854,
    reported_at: '2026-11-04T18:20:00Z',
    status: 'PENDING',
    device_fingerprint: 'dev_84f92a1'
  },
  {
    id: 'rep_demo_002',
    incident_type_id: 2,
    category: 'INUNDACION',
    description: 'Foto borrosa, parece lluvia normal de verano sin desborde.',
    media_url: '',
    latitude: -11.9410,
    longitude: -76.9720,
    reported_at: '2026-11-04T18:22:00Z',
    status: 'DUPLICATE',
    device_fingerprint: 'dev_84f92a1' // Mismo device, posible spam
  },
  {
    id: 'rep_demo_003',
    incident_type_id: 4,
    category: 'DESBORDE',
    description: 'Río Rímac a punto de desbordar muro de contención en Malecón Checa.',
    media_url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=600&q=80',
    latitude: -12.0464,
    longitude: -77.0311,
    reported_at: '2026-11-04T19:05:00Z',
    status: 'VALIDATED',
    device_fingerprint: 'dev_33b811c'
  },
  {
    id: 'rep_demo_004',
    incident_type_id: 5,
    category: 'LLUVIA_INTENSA',
    description: 'Reporte de prueba enviado con texto incoherente asdasdasd.',
    media_url: '',
    latitude: -12.0800,
    longitude: -77.0100,
    reported_at: '2026-11-04T19:30:00Z',
    status: 'PENDING',
    device_fingerprint: 'dev_991fa02'
  }
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');

    if (isSupabaseConfigured) {
      let query = supabase
        .from('citizen_report')
        .select(`
          id,
          description,
          media_url,
          reported_at,
          status,
          device_fingerprint,
          cluster_id,
          geom,
          cat_incident_type (id, code, name)
        `)
        .order('reported_at', { ascending: false })
        .limit(100);

      if (statusFilter && statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (!error && data) {
        return NextResponse.json({ success: true, reports: data });
      }
      console.warn('[Admin API] Error consultando Supabase:', error?.message);
    }

    // Fallback con datos en memoria
    let result = IN_MEMORY_MOCK_REPORTS;
    if (statusFilter && statusFilter !== 'ALL') {
      result = result.filter(r => r.status === statusFilter);
    }

    return NextResponse.json({ success: true, reports: result });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
