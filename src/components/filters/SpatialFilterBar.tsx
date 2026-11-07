'use client';

import React from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  RotateCcw, 
  ShieldAlert, 
  Filter
} from 'lucide-react';
import { DamecSeverity, DamecSourceType, DamecIncidentCategory } from '@/types/damec-geo';

export interface FilterState {
  searchQuery: string;
  severity: DamecSeverity | 'ALL';
  category: DamecIncidentCategory | 'ALL';
  source: DamecSourceType | 'ALL';
  minConfidence: number;
}

interface SpatialFilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  totalCount: number;
  filteredCount: number;
}

export const SpatialFilterBar: React.FC<SpatialFilterBarProps> = ({
  filters,
  onChange,
  totalCount,
  filteredCount
}) => {
  const isFiltered = 
    filters.searchQuery !== '' || 
    filters.severity !== 'ALL' || 
    filters.category !== 'ALL' || 
    filters.source !== 'ALL' || 
    filters.minConfidence > 0;

  const handleReset = () => {
    onChange({
      searchQuery: '',
      severity: 'ALL',
      category: 'ALL',
      source: 'ALL',
      minConfidence: 0
    });
  };

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-3 space-y-3 font-sans">
      {/* Fila superior: Búsqueda rápida + Umbral de confianza + Reset */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Input de Búsqueda */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
            placeholder="Buscar por distrito, región o palabra clave (ej. Chosica, Piura)..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400 transition-all"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onChange({ ...filters, searchQuery: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Controles de Fuente y Confianza */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {/* Selector de Fuente */}
          <select
            value={filters.source}
            onChange={(e) => onChange({ ...filters, source: e.target.value as any })}
            className="bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-2.5 rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">Todas las Fuentes</option>
            <option value="OFFICIAL_SINPAD">Oficial SINPAD</option>
            <option value="OFFICIAL_SENAMHI">Oficial SENAMHI</option>
            <option value="CITIZEN_CLUSTER">Comunitarios Validados</option>
          </select>

          {/* Selector de Confianza Mínima */}
          <select
            value={filters.minConfidence}
            onChange={(e) => onChange({ ...filters, minConfidence: parseFloat(e.target.value) })}
            className="bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-2.5 rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="0">Toda Confianza (≥ 0%)</option>
            <option value="0.5">Confianza Moderada (≥ 50%)</option>
            <option value="0.8">Alta Certeza (≥ 80%)</option>
          </select>

          {/* Botón de Limpiar Filtros */}
          {isFiltered && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-[11px] text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1.5 rounded-md font-semibold transition-all whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* Fila inferior: Chips de Severidad y Categoría */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
        {/* Severidad */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Severidad:
          </span>
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'critical', label: 'Crítico', bg: 'hover:bg-red-50 text-red-700 border-red-200' },
            { id: 'high', label: 'Alto', bg: 'hover:bg-orange-50 text-orange-700 border-orange-200' },
            { id: 'moderate', label: 'Moderado', bg: 'hover:bg-amber-50 text-amber-700 border-amber-200' },
            { id: 'low', label: 'Leve', bg: 'hover:bg-emerald-50 text-emerald-700 border-emerald-200' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => onChange({ ...filters, severity: s.id as any })}
              className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium transition-all border ${
                filters.severity === s.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Categoría */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            Categoría:
          </span>
          {[
            { id: 'ALL', label: 'Todas' },
            { id: 'HUAYCO', label: 'Huayco' },
            { id: 'INUNDACION', label: 'Inundación' },
            { id: 'CORTE_VIA', label: 'Corte Vía' },
            { id: 'DESBORDE', label: 'Desborde' },
            { id: 'LLUVIA_INTENSA', label: 'Lluvia' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => onChange({ ...filters, category: cat.id as any })}
              className={`text-[11px] px-2.5 py-0.5 rounded-md font-medium transition-all ${
                filters.category === cat.id
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Conteo de resultados */}
        <span className="text-[11px] text-slate-500 font-medium">
          Mostrando <strong>{filteredCount}</strong> de {totalCount} eventos
        </span>
      </div>
    </div>
  );
};
