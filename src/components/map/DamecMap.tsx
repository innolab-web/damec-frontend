'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, GeoJSONSource, MapLayerMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DamecGeoJSON, DamecIncidentProperties } from '@/types/damec-geo';
import { Layers } from 'lucide-react';

interface DamecMapProps {
  data: DamecGeoJSON;
  selectedIncidentId?: string | null;
  onPointClick?: (id: string) => void;
  onOpenDetails?: (id: string) => void;
  className?: string;
}

// Configuración del worker local para compatibilidad Next.js/Turbopack y modo offline
if (typeof window !== 'undefined' && maplibregl.config) {
  maplibregl.config.WORKER_URL = '/maplibre-gl-worker.mjs';
}

// Estilo OpenStreetMap (Raster nativo OSM estándar)
const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '© Colaboradores de OpenStreetMap'
    }
  },
  layers: [
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19
    }
  ]
};

// Estilo Táctico Carto Positron
const CARTO_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export const DamecMap: React.FC<DamecMapProps> = ({
  data,
  selectedIncidentId,
  onPointClick,
  onOpenDetails,
  className = 'w-full h-full'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [basemap, setBasemap] = useState<'osm' | 'tactical'>('osm');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#B91C1C'; // Rojo-700 WCAG AAA
      case 'high': return '#C2410C';     // Naranja-700
      case 'moderate': return '#B45309'; // Ámbar-700
      default: return '#047857';         // Verde Esmeralda
    }
  };

  // Mini Tarjeta ajustada con contención estricta para que ninguna etiqueta desborde
  const createMiniCardHTML = (props: DamecIncidentProperties) => {
    const sevColor = getSeverityColor(props.severity);
    const scorePct = Math.round(props.confidenceScore * 100);

    return `
      <div style="box-sizing: border-box; width: 260px; max-width: 260px; padding: 2px 2px; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a;">
        <!-- Cabecera de la minitarjeta con margen para el botón de cierre [X] -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; margin-bottom: 8px; padding-right: 22px; box-sizing: border-box;">
          <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; display: flex; align-items: center; gap: 4px; color: ${sevColor}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;">
            ● ${props.category}
          </span>
          <span style="font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; color: #ffffff; background-color: ${sevColor}; white-space: nowrap; flex-shrink: 0; letter-spacing: 0.03em;">
            ${props.severity.toUpperCase()}
          </span>
        </div>

        <!-- Título -->
        <h4 style="font-size: 12px; font-weight: 700; color: #0f172a; line-height: 1.35; margin: 0 0 4px 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
          ${props.title}
        </h4>

        <!-- Descripción resumida -->
        <p style="font-size: 11px; color: #475569; margin: 0 0 8px 0; line-height: 1.4; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
          ${props.description}
        </p>

        <!-- Bloque de Ubicación y Confianza contenido -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; gap: 6px; box-sizing: border-box;">
          <div style="font-size: 10px; color: #334155; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
            📍 <strong>${props.district}</strong>, ${props.region}
          </div>
          <span style="font-size: 9px; font-weight: 700; font-family: ui-monospace, monospace; background-color: #ffffff; color: #1e293b; padding: 2px 5px; border-radius: 4px; border: 1px solid #cbd5e1; white-space: nowrap; flex-shrink: 0;">
            ${scorePct}% Confianza
          </span>
        </div>

        ${props.reportsCount ? `
          <div style="font-size: 10px; color: #0f766e; font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
            👥 ${props.reportsCount} reportes agregados
          </div>
        ` : ''}

        <!-- Botón táctico: Disparador único para abrir el panel de detalles -->
        <button 
          id="btn-inspect-${props.id}"
          style="width: 100%; box-sizing: border-box; padding: 7px 10px; background-color: #2563eb; color: #ffffff; font-size: 11px; font-weight: 700; border-radius: 6px; border: none; cursor: pointer; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: background-color 0.15s ease;"
          onmouseover="this.style.backgroundColor='#1d4ed8'"
          onmouseout="this.style.backgroundColor='#2563eb'"
        >
          Ver Detalles Completos →
        </button>
      </div>
    `;
  };

  const showPopupForFeature = (props: DamecIncidentProperties, coordinates: [number, number]) => {
    if (!mapRef.current) return;

    if (popupRef.current) {
      popupRef.current.remove();
    }

    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: false,
      offset: 14,
      className: 'damec-tactical-popup'
    })
      .setLngLat(coordinates)
      .setHTML(createMiniCardHTML(props))
      .addTo(mapRef.current);

    popupRef.current = popup;

    // Vincular botón de "Ver detalles completos" como ÚNICO disparador del panel
    setTimeout(() => {
      const btn = document.getElementById(`btn-inspect-${props.id}`);
      if (btn) {
        btn.onclick = (e) => {
          e.stopPropagation();
          if (onOpenDetails) {
            onOpenDetails(props.id);
          }
        };
      }
    }, 60);
  };

  const initLayers = (map: MapLibreMap) => {
    if (map.getSource('damec-incidents')) return;

    // 1. Fuente GeoJSON con clustering
    map.addSource('damec-incidents', {
      type: 'geojson',
      data: data,
      cluster: true,
      clusterMaxZoom: 12,
      clusterRadius: 50
    });

    // 2. Círculos de Clusters
    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'damec-incidents',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#1E293B', 10,
          '#0F172A', 25,
          '#B91C1C'
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20, 10,
          26, 25,
          32
        ],
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#FFFFFF'
      }
    });

    // 3. Conteo del cluster
    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'damec-incidents',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['Open Sans Semibold'],
        'text-size': 12
      },
      paint: {
        'text-color': '#FFFFFF'
      }
    });

    // 4. Puntos individuales con halo y codificación de severidad
    map.addLayer({
      id: 'unclustered-point-halo',
      type: 'circle',
      source: 'damec-incidents',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': [
          'match',
          ['get', 'severity'],
          'critical', 'rgba(185, 28, 28, 0.25)',
          'high', 'rgba(194, 65, 12, 0.25)',
          'moderate', 'rgba(180, 83, 9, 0.25)',
          'rgba(4, 120, 87, 0.25)'
        ],
        'circle-radius': 14
      }
    });

    map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'damec-incidents',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': [
          'match',
          ['get', 'severity'],
          'critical', '#B91C1C',
          'high', '#C2410C',
          'moderate', '#B45309',
          '#047857'
        ],
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#FFFFFF'
      }
    });

    // Zoom al hacer clic sobre clusters
    map.on('click', 'clusters', async (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      const clusterId = features[0]?.properties?.cluster_id;
      const source = map.getSource('damec-incidents') as GeoJSONSource;

      if (clusterId && source) {
        try {
          const zoom = await source.getClusterExpansionZoom(clusterId);
          const geometry = features[0].geometry;
          if (geometry.type === 'Point') {
            map.easeTo({
              center: geometry.coordinates as [number, number],
              zoom: zoom
            });
          }
        } catch (err) {
          console.error('Error al expandir cluster:', err);
        }
      }
    });

    // Clic en punto: SOLAMENTE abre la minitarjeta y selecciona el ID (NO abre el panel lateral)
    map.on('click', 'unclustered-point', (e: MapLayerMouseEvent) => {
      if (!e.features || !e.features[0]) return;
      const feature = e.features[0];
      const props = feature.properties as DamecIncidentProperties;
      const coords = (feature.geometry as any).coordinates as [number, number];

      if (props && coords) {
        showPopupForFeature(props, coords);
        if (onPointClick) {
          onPointClick(props.id);
        }
      }
    });

    map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });
    map.on('mouseenter', 'unclustered-point', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'unclustered-point', () => { map.getCanvas().style.cursor = ''; });
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const currentStyle = basemap === 'osm' ? OSM_STYLE : CARTO_STYLE;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: currentStyle,
      center: [-75.0152, -9.1899],
      zoom: 5.5,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', () => {
      initLayers(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, [basemap]);

  // Actualizar datos de incidentes
  useEffect(() => {
    if (!mapRef.current) return;
    const source = mapRef.current.getSource('damec-incidents') as GeoJSONSource;
    if (source && 'setData' in source) {
      source.setData(data);
    }
  }, [data]);

  // Centrar y abrir mini tarjeta cuando se seleccione un incidente desde el feed lateral
  useEffect(() => {
    if (!mapRef.current || !selectedIncidentId) return;

    const feature = data.features.find((f) => f.properties.id === selectedIncidentId);
    if (feature && feature.geometry.type === 'Point') {
      const coords = feature.geometry.coordinates as [number, number];
      mapRef.current.flyTo({
        center: coords,
        zoom: 12.5,
        essential: true
      });
      showPopupForFeature(feature.properties, coords);
    }
  }, [selectedIncidentId, data]);

  return (
    <div className={`relative ${className}`}>
      {/* Contenedor del mapa */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[400px]" />

      {/* Selector de capa base OpenStreetMap / Táctico */}
      <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-lg p-1 shadow-md flex items-center gap-1 text-xs">
        <div className="px-2 py-1 flex items-center gap-1.5 font-bold text-slate-700 border-r border-slate-200">
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span>Capa Base</span>
        </div>
        <button
          onClick={() => setBasemap('osm')}
          className={`px-2.5 py-1 rounded font-medium transition-all ${
            basemap === 'osm'
              ? 'bg-blue-600 text-white shadow-xs font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          OpenStreetMap
        </button>
        <button
          onClick={() => setBasemap('tactical')}
          className={`px-2.5 py-1 rounded font-medium transition-all ${
            basemap === 'tactical'
              ? 'bg-blue-600 text-white shadow-xs font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Gris Táctico
        </button>
      </div>
    </div>
  );
};
