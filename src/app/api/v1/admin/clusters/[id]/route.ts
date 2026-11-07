import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { severity, is_active, status } = body;

    if (isSupabaseConfigured) {
      const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
      if (severity) updatePayload.severity = severity;
      if (is_active !== undefined) updatePayload.is_active = is_active;
      if (status) updatePayload.status = status;

      const { data, error } = await supabase
        .from('incident_cluster')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, cluster: data });
    }

    return NextResponse.json({
      success: true,
      message: 'Clúster actualizado con éxito.',
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
      // Desactivación lógica para no romper trazabilidad histórica
      const { error } = await supabase
        .from('incident_cluster')
        .update({ is_active: false, status: 'RESOLVED', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: 'Clúster desactivado y retirado del mapa público.' });
    }

    return NextResponse.json({
      success: true,
      message: `Clúster ${id} desactivado correctamente.`
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
