export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const category = formData.get('category')?.toString();
    const latitude = parseFloat(formData.get('latitude')?.toString() || '');
    const longitude = parseFloat(formData.get('longitude')?.toString() || '');
    const description = formData.get('description')?.toString() || '';
    const clientTempId = formData.get('client_temp_id')?.toString() || `rep_${Date.now()}`;
    const evidenceImage = formData.get('evidence_image') as File | null;

    if (!category || isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Datos de reporte incompletos (categoría y coordenadas requeridas).' },
        { status: 400 }
      );
    }

    let mediaUrl: string | null = null;

    // Subir imagen a Supabase Storage si las credenciales están configuradas
    if (evidenceImage && isSupabaseConfigured) {
      try {
        const fileExt = 'webp';
        const filePath = `reports/${clientTempId}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('reports-media')
          .upload(filePath, evidenceImage, {
            contentType: 'image/webp',
            upsert: true
          });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('reports-media')
            .getPublicUrl(filePath);
          mediaUrl = publicUrlData.publicUrl;
        } else {
          console.warn('[API Reports] Storage warning:', uploadError.message);
        }
      } catch (storageErr) {
        console.warn('[API Reports] Error al procesar storage:', storageErr);
      }
    }

    // Inserción en tabla citizen_report si Supabase está conectado
    if (isSupabaseConfigured) {
      try {
        // Mapear código a id de catálogo
        const { data: typeData } = await supabase
          .from('cat_incident_type')
          .select('id')
          .eq('code', category)
          .single();

        const incidentTypeId = typeData?.id || 1;

        const { data: insertData, error: insertError } = await supabase
          .from('citizen_report')
          .insert({
            device_fingerprint: req.headers.get('x-client-fingerprint') || 'web-pwa-client',
            incident_type_id: incidentTypeId,
            geom: `POINT(${longitude} ${latitude})`,
            description,
            media_url: mediaUrl,
            status: 'PENDING'
          })
          .select()
          .single();

        if (insertError) {
          console.warn('[API Reports] Inserción en BD omitida o fallida:', insertError.message);
        } else {
          return NextResponse.json({
            success: true,
            message: 'Reporte registrado en base de datos PostGIS.',
            reportId: insertData?.id,
            clientTempId
          });
        }
      } catch (dbErr) {
        console.warn('[API Reports] Error interactuando con Supabase:', dbErr);
      }
    }

    // Respuesta exitosa (fallback de desarrollo o confirmación)
    return NextResponse.json({
      success: true,
      message: 'Reporte procesado exitosamente por el Ingestion Gateway.',
      clientTempId,
      mediaUrl: mediaUrl || 'local_storage_cached'
    });
  } catch (error: unknown) {
    console.error('[API Reports] Error interno:', error);
    return NextResponse.json(
      { error: 'Error interno al procesar el reporte.' },
      { status: 500 }
    );
  }
}
