'use client';

import React from 'react';
import { 
  X, 
  MapPin, 
  ShieldCheck, 
  Users, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Share2, 
  CheckCircle2, 
  Mountain, 
  Droplets, 
  AlertOctagon, 
  Waves, 
  CloudRain,
  ExternalLink,
  Compass
} from 'lucide-react';
import { DamecFeature, DamecSeverity } from '@/types/damec-geo';

interface ClusterDetailDrawerProps {
  feature: DamecFeature | null;
  onClose: () => void;
  onFocusMap?: (coords: [number, number]) => void;
}

export const ClusterDetailDrawer: React.FC<ClusterDetailDrawerProps> = ({
  feature,
  onClose,
  onFocusMap
}) => {
  if (!feature) return null;

  const { properties, geometry } = feature;
  const isPoint = geometry.type === 'Point';
  const coords = isPoint ? (geometry.coordinates as [number, number]) : null;

  const getSeverityBadge = (severity: DamecSeverity) => {
    switch (severity) {
      case 'critical':
        return <span className="px-2.5 py-1 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-300">CRÍTICO</span>;
      case 'high':
        return <span className="px-2.5 py-1 rounded text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300">ALTO</span>;
      case 'moderate':
        return <span className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">MODERADO</span>;
      default:
        return <span className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">LEVE</span>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'HUAYCO': return <Mountain className="w-5 h-5 text-red-700" />;
      case 'INUNDACION': return <Droplets className="w-5 h-5 text-blue-700" />;
      case 'CORTE_VIA': return <AlertOctagon className="w-5 h-5 text-amber-700" />;
      case 'DESBORDE': return <Waves className="w-5 h-5 text-cyan-700" />;
      default: return <CloudRain className="w-5 h-5 text-slate-700" />;
    }
  };

  const confidencePct = Math.round(properties.confidenceScore * 100);

  const handleShare = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://damec.pages.dev';
    const shareUrl = `${origin}/?incident=${encodeURIComponent(properties.id)}`;
    const shareTitle = `[DAMEC ALERTA] ${properties.title}`;
    const shareText = `🚨 ${properties.title} - ${properties.district}, ${properties.region}. Severidad: ${properties.severity.toUpperCase()} (${confidencePct}% confianza). Ver en mapa táctico:`;

    // 1. Soporte nativo para Web Share API en Android / iOS
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `${shareText}\n${shareUrl}`,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    // 2. Fallback estándar al portapapeles
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        alert('✅ Enlace oficial de la alerta copiado al portapapeles.');
      } catch {
        prompt('Copia el enlace del incidente:', shareUrl);
      }
    } else {
      prompt('Copia el enlace del incidente:', shareUrl);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[460px] bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200 text-slate-900 font-sans">
      {/* Cabecera */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-900 text-white flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-800 rounded-lg">
            {getCategoryIcon(properties.category)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase">
                {properties.source}
              </span>
              {properties.codeSinpad && (
                <span className="text-[10px] bg-blue-900/80 text-blue-300 px-1.5 py-0.5 rounded border border-blue-700 font-mono">
                  {properties.codeSinpad}
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-white leading-tight">
              {properties.category}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getSeverityBadge(properties.severity)}
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
            aria-label="Cerrar panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Contenido desplazable */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Título y descripción */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 leading-snug mb-2">
            {properties.title}
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-200/80 rounded-lg p-3.5">
            {properties.description}
          </p>
        </div>

        {/* Nivel de Confianza Bayesiano */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Score de Confianza Algorítmico
            </span>
            <span className="text-sm font-mono font-extrabold text-slate-900">
              {confidencePct}%
            </span>
          </div>

          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                confidencePct >= 80 ? 'bg-emerald-600' : confidencePct >= 60 ? 'bg-blue-600' : 'bg-amber-500'
              }`}
              style={{ width: `${confidencePct}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Validación ST-DBSCAN</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span>Cruce Oficial INDECI</span>
            </div>
          </div>
        </div>

        {/* Ubicación Territorial */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-red-600" />
            Ubicación Geográfica
          </h4>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <p className="text-[11px] text-slate-400 font-medium">Distrito / Provincia</p>
              <p className="font-bold text-slate-900">{properties.district}</p>
              <p className="text-slate-600">{properties.province}</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <p className="text-[11px] text-slate-400 font-medium">Región / Ubigeo</p>
              <p className="font-bold text-slate-900">{properties.region}</p>
              <p className="font-mono text-slate-600">Ubigeo: {properties.ubigeo}</p>
            </div>
          </div>

          {coords && (
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-slate-500" />
                <span className="font-mono text-slate-700 font-semibold">
                  {coords[1].toFixed(5)}, {coords[0].toFixed(5)}
                </span>
              </div>
              {onFocusMap && (
                <button
                  onClick={() => onFocusMap(coords)}
                  className="text-blue-600 hover:text-blue-800 font-bold text-[11px] hover:underline"
                >
                  Centrar Mapa
                </button>
              )}
            </div>
          )}
        </div>

        {/* Métricas de Impacto */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Impacto Operativo
          </h4>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {properties.affectedKm !== undefined && (
              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-lg">
                <p className="text-[11px] text-amber-800 font-semibold">Vía Afectada</p>
                <p className="text-lg font-bold text-amber-950">{properties.affectedKm} km</p>
              </div>
            )}
            {properties.reportsCount !== undefined && (
              <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-lg">
                <p className="text-[11px] text-blue-800 font-semibold">Reportes Agregados</p>
                <p className="text-lg font-bold text-blue-950">{properties.reportsCount} reportes</p>
              </div>
            )}
          </div>
        </div>

        {/* Trazabilidad Temporal */}
        <div className="border-t border-slate-100 pt-4 space-y-2 text-xs text-slate-500">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Primer Reporte Confirmado:
            </span>
            <span className="font-mono text-slate-700 font-medium">
              {new Date(properties.confirmedAt).toLocaleString('es-PE')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Última Sincronización:
            </span>
            <span className="font-mono text-slate-700 font-medium">
              {new Date(properties.updatedAt).toLocaleString('es-PE')}
            </span>
          </div>
        </div>
      </div>

      {/* Pie de Panel con Acciones */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={handleShare}
          className="flex-1 py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-all"
        >
          <Share2 className="w-4 h-4" />
          <span>Compartir Alerta</span>
        </button>

        {coords && onFocusMap && (
          <button
            onClick={() => {
              onFocusMap(coords);
              onClose();
            }}
            className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <MapPin className="w-4 h-4" />
            <span>Ver en Mapa OSM</span>
          </button>
        )}
      </div>
    </div>
  );
};
