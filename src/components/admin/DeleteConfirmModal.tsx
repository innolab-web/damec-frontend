'use client';

import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  itemType: 'reporte' | 'cluster';
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title,
  itemType,
  onClose,
  onConfirm,
  isDeleting = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-50 text-red-600 flex-shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Eliminar {itemType}</h3>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
              &quot;{title}&quot;
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
          Esta acción retirará la publicación de la cartografía pública y la excluirá del recálculo de clústeres espaciales.
        </p>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            {isDeleting ? 'Eliminando...' : 'Confirmar eliminación'}
          </button>
        </div>
      </div>
    </div>
  );
};
