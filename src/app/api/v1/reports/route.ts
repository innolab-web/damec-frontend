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
    let storageErrorMsg: string | null = null;

    // 1. Subir imagen a Supabase Storage si se envió una evidencia real
    const hasValidImage = evidenceImage && evidenceImage.size > 50 && evidenceImage.type.startsWith('image/');

    if (hasValidImage && isSupabaseConfigured) {
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
          storageErrorMsg = uploadError.message;
          console.warn('[API Reports] Storage warning:', uploadError.message);
        }
      } catch (storageErr: any) {
        storageErrorMsg = storageErr?.message || 'Error de almacenamiento';
        console.warn('[API Reports] Error al procesar storage:', storageErr);
      }
    }

    // 2. Inserción en tabla citizen_report con formato PostGIS EWKT (SRID 4326)
    if (isSupabaseConfigured) {
      try {
        // Mapear código a id de catálogo
        const { data: typeData } = await supabase
          .from('cat_incident_type')
          .select('id')
          .eq('code', category)
          .single();

        const incidentTypeId = typeData?.id || 1;

        // Inserción en PostGIS usando EWKT explícito SRID=4326
        const { data: insertData, error: insertError } = await supabase
          .from('citizen_report')
          .insert({
            device_fingerprint: req.headers.get('x-client-fingerprint') || 'web-pwa-client',
            incident_type_id: incidentTypeId,
            geom: `SRID=4326;POINT(${longitude} ${latitude})`,
            description,
            media_url: mediaUrl,
            status: 'PENDING'
          })
          .select('id, incident_type_id, description, status, reported_at');

        if (insertError) {
          console.error('[API Reports] Error en inserción Supabase:', insertError.message);
          return NextResponse.json({
            success: false,
            error: `Error en base de datos: ${insertError.message}`,
            details: insertError,
            storageError: storageErrorMsg
          }, { status: 400 });
        }

        // 3. Procesamiento en tiempo real: Disparar el clustering para reflejar el evento en el mapa
        try {
          await supabase.rpc('process_spatial_clusters');
        } catch (clusterErr) {
          console.warn('[API Reports] Clustering automático diferido:', clusterErr);
        }

        return NextResponse.json({
          success: true,
          message: 'Reporte registrado en base de datos PostGIS y procesado en el clúster.',
          reportId: insertData?.[0]?.id,
          clientTempId,
          mediaUrl
        });

      } catch (dbErr: any) {
        console.error('[API Reports] Error interactuando con Supabase:', dbErr);
        return NextResponse.json({
          success: false,
          error: dbErr?.message || 'Error interactuando con Supabase'
        }, { status: 500 });
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
