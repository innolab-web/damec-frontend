'use client';

import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { DamecSeverity } from '@/types/damec-geo';

export interface EditableItem {
  id: string;
  type: 'report' | 'cluster';
  title?: string;
  category: string;
  severity: DamecSeverity;
  status: string;
  description: string;
}

interface EditPublicationModalProps {
  isOpen: boolean;
  item: EditableItem | null;
  onClose: () => void;
  onSave: (id: string, updatedFields: Partial<EditableItem>) => Promise<void>;
}

const CATEGORIES = [
  { id: 'HUAYCO', name: 'Huayco / Deslizamiento' },
  { id: 'INUNDACION', name: 'Inundación' },
  { id: 'CORTE_VIA', name: 'Corte de Vía' },
  { id: 'DESBORDE', name: 'Desborde de Río' },
  { id: 'LLUVIA_INTENSA', name: 'Lluvia Torrencial' }
];

export const EditPublicationModal: React.FC<EditPublicationModalProps> = ({
  isOpen,
  item,
  onClose,
  onSave
}) => {
  const [category, setCategory] = useState<string>('HUAYCO');
  const [severity, setSeverity] = useState<DamecSeverity>('high');
  const [status, setStatus] = useState<string>('VALIDATED');
  const [description, setDescription] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (item) {
      setCategory(item.category || 'HUAYCO');
      setSeverity(item.severity || 'high');
      setStatus(item.status || 'PENDING');
      setDescription(item.description || '');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(item.id, {
        category,
        severity,
        status,
        description
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col font-sans">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Editar Publicación</h3>
            <p className="text-[11px] text-slate-500 font-mono">ID: {item.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Categoría */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5 uppercase tracking-wide text-[10px]">
              Tipo de Evento
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Severidad */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5 uppercase tracking-wide text-[10px]">
              Nivel de Severidad
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'critical', label: 'Crítico', color: 'border-red-300 text-red-700 bg-red-50' },
                { id: 'high', label: 'Alto', color: 'border-orange-300 text-orange-700 bg-orange-50' },
                { id: 'moderate', label: 'Moderado', color: 'border-amber-300 text-amber-700 bg-amber-50' },
                { id: 'low', label: 'Leve', color: 'border-emerald-300 text-emerald-700 bg-emerald-50' }
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSeverity(s.id as DamecSeverity)}
                  className={`py-1.5 px-2 rounded-lg border text-center font-bold text-[11px] transition-all ${
                    severity === s.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Estado de Moderación */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5 uppercase tracking-wide text-[10px]">
              Estado de Moderación
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: 'VALIDATED', label: 'Validado' },
                { id: 'PENDING', label: 'Pendiente' },
                { id: 'DUPLICATE', label: 'Duplicado' },
                { id: 'REJECTED', label: 'Rechazado' }
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatus(st.id)}
                  className={`py-1.5 px-2 rounded-lg border text-center font-semibold text-[11px] transition-all ${
                    status === st.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5 uppercase tracking-wide text-[10px]">
              Descripción / Observación
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-1.5 text-slate-600 hover:text-slate-800 font-semibold rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
