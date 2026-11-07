'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { MOCK_DAMEC_GEOJSON } from '@/mocks/incidents.mock';
import { DamecGeoJSON, DamecSeverity, DamecFeature } from '@/types/damec-geo';
import { 
  AlertTriangle, 
  Droplets, 
  Mountain, 
  Waves, 
  CloudRain, 
  AlertOctagon, 
  ShieldCheck, 
  Users, 
  MapPin, 
  Activity,
  PlusCircle,
  Maximize2
} from 'lucide-react';
import { CitizenReportModal } from '@/components/report/CitizenReportModal';
import { PendingQueueIndicator } from '@/components/report/PendingQueueIndicator';
import { SpatialFilterBar, FilterState } from '@/components/filters/SpatialFilterBar';
import { ClusterDetailDrawer } from '@/components/cluster/ClusterDetailDrawer';

// Carga dinámica del mapa para evitar errores de SSR con WebGL
const DamecMap = dynamic(
  () => import('@/components/map/DamecMap').then((mod) => mod.DamecMap),
  { 
    ssr: false, 
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-500 font-medium gap-2">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold">Cargando mapa táctico OpenStreetMap...</span>
      </div>
    ) 
  }
);

export default function Home() {
  const [geoData, setGeoData] = useState<DamecGeoJSON>(MOCK_DAMEC_GEOJSON);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState<boolean>(false);
  const [isLoadingLayers, setIsLoadingLayers] = useState<boolean>(false);

  // Estado de filtros avanzados
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    severity: 'ALL',
    category: 'ALL',
    source: 'ALL',
    minConfidence: 0
  });

  const fetchLayers = useCallback(async () => {
    try {
      setIsLoadingLayers(true);
      const res = await fetch('/api/v1/layers/clusters?min_confidence=0.10');
      if (res.ok) {
        const json: DamecGeoJSON = await res.json();
        if (json && json.features && json.features.length > 0) {
          setGeoData(json);
        }
      }
    } catch (err) {
      console.warn('Error al cargar capas geoespaciales:', err);
    } finally {
      setIsLoadingLayers(false);
    }
  }, []);

  useEffect(() => {
    fetchLayers();
    // Refresco periódico cada 60 segundos
    const interval = setInterval(fetchLayers, 60000);
    return () => clearInterval(interval);
  }, [fetchLayers]);

  // Filtrado reactivo en cliente
  const filteredFeatures = useMemo(() => {
    return geoData.features.filter((f) => {
      const p = f.properties;

      // 1. Filtro por severidad
      if (filters.severity !== 'ALL' && p.severity !== filters.severity) {
        return false;
      }

      // 2. Filtro por categoría
      if (filters.category !== 'ALL' && p.category !== filters.category) {
        return false;
      }

      // 3. Filtro por fuente
      if (filters.source !== 'ALL' && p.source !== filters.source) {
        return false;
      }

      // 4. Filtro por confianza mínima
      if (p.confidenceScore < filters.minConfidence) {
        return false;
      }

      // 5. Búsqueda por texto (distrito, región, título, descripción)
      if (filters.searchQuery.trim() !== '') {
        const q = filters.searchQuery.toLowerCase();
        const textToMatch = `${p.title} ${p.district} ${p.region} ${p.province} ${p.category} ${p.description}`.toLowerCase();
        if (!textToMatch.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [geoData, filters]);

  const filteredGeoJSON: DamecGeoJSON = useMemo(() => {
    return {
      ...geoData,
      features: filteredFeatures
    };
  }, [geoData, filteredFeatures]);

  // Obtener la feature seleccionada para el drawer de detalle
  const selectedFeature: DamecFeature | null = useMemo(() => {
    if (!selectedId) return null;
    return (geoData.features.find((f) => f.properties.id === selectedId) as DamecFeature) || null;
  }, [selectedId, geoData]);

  const handlePointClick = (id: string) => {
    setSelectedId(id);
    // No abre el drawer automáticamente; solo selecciona y muestra la minitarjeta
  };

  const handleOpenDetails = (id: string) => {
    setSelectedId(id);
    setIsDetailDrawerOpen(true);
  };

  const getSeverityBadge = (severity: DamecSeverity) => {
    switch (severity) {
      case 'critical':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-300">CRÍTICO</span>;
      case 'high':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-300">ALTO</span>;
      case 'moderate':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">MODERADO</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">LEVE</span>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'HUAYCO':
        return <Mountain className="w-4 h-4 text-red-700" />;
      case 'INUNDACION':
        return <Droplets className="w-4 h-4 text-blue-700" />;
      case 'CORTE_VIA':
        return <AlertOctagon className="w-4 h-4 text-amber-700" />;
      case 'DESBORDE':
        return <Waves className="w-4 h-4 text-cyan-700" />;
      default:
        return <CloudRain className="w-4 h-4 text-slate-700" />;
    }
  };

  // Cálculo de estadísticas dinámicas basadas en los filtros activos
  const stats = useMemo(() => {
    const totalKm = filteredFeatures.reduce((acc, f) => acc + (f.properties.affectedKm || 0), 0);
    const uniqueDistricts = new Set(filteredFeatures.map((f) => f.properties.ubigeo || f.properties.district)).size;
    const avgConfidence = filteredFeatures.length > 0
      ? Math.round((filteredFeatures.reduce((acc, f) => acc + f.properties.confidenceScore, 0) / filteredFeatures.length) * 100)
      : 0;

    return {
      activeCount: filteredFeatures.length,
      districtsCount: uniqueDistricts,
      affectedKm: Number(totalKm.toFixed(1)),
      avgConfidence
    };
  }, [filteredFeatures]);

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Header institucional DAMEC */}
      <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-6 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight">DAMEC</h1>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">v0.1.0-MVP</span>
            </div>
            <p className="text-xs text-slate-400">Plataforma de Emergencias Climáticas - Fenómeno El Niño</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Indicador de cola local IndexedDB */}
          <PendingQueueIndicator />

          <div className="hidden lg:flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Motor PostGIS Conectado</span>
          </div>

          <button 
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-md shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Reportar Incidente</span>
          </button>
        </div>
      </header>

      {/* Barra de Filtros Espaciales y Operativos */}
      <SpatialFilterBar
        filters={filters}
        onChange={setFilters}
        totalCount={geoData.features.length}
        filteredCount={filteredFeatures.length}
      />

      {/* Barra de Estadísticas Sintéticas / KPIs */}
      <section className="bg-white border-b border-slate-200 px-6 py-2 grid grid-cols-2 sm:grid-cols-4 gap-4 flex-shrink-0 text-sm shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-red-50 text-red-700"><AlertTriangle className="w-4 h-4" /></div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Incidentes Activos</p>
            <p className="text-base font-bold text-slate-900">{stats.activeCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-blue-50 text-blue-700"><MapPin className="w-4 h-4" /></div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Distritos Impactados</p>
            <p className="text-base font-bold text-slate-900">{stats.districtsCount} distritos</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-amber-50 text-amber-700"><AlertOctagon className="w-4 h-4" /></div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Vías Afectadas</p>
            <p className="text-base font-bold text-slate-900">{stats.affectedKm} km</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-emerald-50 text-emerald-700"><ShieldCheck className="w-4 h-4" /></div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Confianza Promedio</p>
            <p className="text-base font-bold text-slate-900">{stats.avgConfidence}%</p>
          </div>
        </div>
      </section>

      {/* Contenido Principal: Feed lateral + Mapa */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Panel lateral: Feed de Incidentes */}
        <aside className="w-full md:w-96 lg:w-[400px] bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-10 shadow-sm">
          <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Feed Operativo
            </span>
            <span className="text-[11px] text-slate-500">
              {filteredFeatures.length} evento(s)
            </span>
          </div>

          {/* Lista de incidentes */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-3 space-y-2">
            {filteredFeatures.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-600">No se encontraron incidentes</p>
                <p className="text-[11px] mt-1">Prueba relajando los filtros de búsqueda o severidad.</p>
              </div>
            ) : (
              filteredFeatures.map((feature) => {
                const item = feature.properties;
                const isSelected = selectedId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handlePointClick(item.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-500 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                        {getCategoryIcon(item.category)}
                        <span>{item.category}</span>
                      </div>
                      {getSeverityBadge(item.severity)}
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900 mb-1 leading-snug">{item.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2 mb-2">{item.description}</p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <span className="flex items-center gap-1 font-medium">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {item.district}, {item.region}
                      </span>
                      <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold">
                        {Math.round(item.confidenceScore * 100)}% Confianza
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-teal-700 font-medium">
                      <span className="flex items-center gap-1">
                        {item.reportsCount ? (
                          <>
                            <Users className="w-3 h-3" />
                            {item.reportsCount} reportes
                          </>
                        ) : (
                          <span>Evento Oficial</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetails(item.id);
                        }}
                        className="text-blue-600 font-bold hover:underline py-0.5 px-1.5 rounded hover:bg-blue-50 transition-colors"
                      >
                        Ver Ficha Completa →
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Mapa interactivo OpenStreetMap / MapLibre GL */}
        <main className="flex-1 relative bg-slate-100">
          <DamecMap
            data={filteredGeoJSON}
            selectedIncidentId={selectedId}
            onPointClick={handlePointClick}
            onOpenDetails={handleOpenDetails}
            className="w-full h-full"
          />
        </main>

        {/* Tarjeta / Drawer de Detalle Completo de Clúster */}
        {isDetailDrawerOpen && selectedFeature && (
          <ClusterDetailDrawer
            feature={selectedFeature}
            onClose={() => setIsDetailDrawerOpen(false)}
            onFocusMap={(coords) => {
              // El centrado lo gestiona la sincronización de selectedIncidentId en DamecMap
              setSelectedId(selectedFeature.properties.id);
            }}
          />
        )}
      </div>

      {/* Modal PWA de Reporte Ciudadano Offline */}
      <CitizenReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onReportCreated={() => {
          setTimeout(fetchLayers, 1500);
        }}
      />
    </div>
  );
}
