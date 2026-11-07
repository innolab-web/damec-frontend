export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { status, description, category, incident_type_id } = body;

    if (isSupabaseConfigured) {
      const updatePayload: Record<string, any> = {};
      if (status) updatePayload.status = status;
      if (description !== undefined) updatePayload.description = description;
      if (incident_type_id) updatePayload.incident_type_id = incident_type_id;

      const { data, error } = await supabase
        .from('citizen_report')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, report: data });
    }

    // Mock exitoso para desarrollo
    return NextResponse.json({
      success: true,
      message: 'Reporte actualizado en entorno de desarrollo.',
      id,
      updated: body
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (isSupabaseConfigured) {
      // Opción A: Eliminación física
      const { error } = await supabase
        .from('citizen_report')
        .delete()
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: 'Reporte eliminado permanentemente.' });
    }

    // Mock exitoso
    return NextResponse.json({
      success: true,
      message: `Reporte ${id} eliminado exitosamente (modo desarrollo).`
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
