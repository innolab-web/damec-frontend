'use client';

import React, { useEffect, useState } from 'react';
import { HardDrive, RefreshCw, CheckCircle2 } from 'lucide-react';
import { syncEngine } from '@/services/syncEngine';
import { getAllQueuedReports, QueuedReport } from '@/utils/storageQueue';

export const PendingQueueIndicator: React.FC = () => {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showDrawer, setShowDrawer] = useState<boolean>(false);
  const [queuedItems, setQueuedItems] = useState<QueuedReport[]>([]);

  useEffect(() => {
    if (!syncEngine) return;

    const unsubscribe = syncEngine.subscribe((count, syncing) => {
      setPendingCount(count);
      setIsSyncing(syncing);
      if (showDrawer) {
        refreshItems();
      }
    });

    return () => unsubscribe();
  }, [showDrawer]);

  const refreshItems = async () => {
    const items = await getAllQueuedReports();
    setQueuedItems(items);
  };

  const handleManualSync = async () => {
    if (syncEngine) {
      setIsSyncing(true);
      await syncEngine.triggerSync();
      await refreshItems();
      setIsSyncing(false);
    }
  };

  const toggleDrawer = async () => {
    if (!showDrawer) {
      await refreshItems();
    }
    setShowDrawer(!showDrawer);
  };

  if (pendingCount === 0 && !showDrawer) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={toggleDrawer}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
          pendingCount > 0
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 animate-pulse'
            : 'bg-slate-800 text-slate-300 border-slate-700'
        }`}
        title="Bandeja de salida de reportes locales en cola"
      >
        <HardDrive className="w-3.5 h-3.5" />
        <span>Cola Local: {pendingCount}</span>
        {isSyncing && <RefreshCw className="w-3 h-3 animate-spin text-amber-300 ml-0.5" />}
      </button>

      {/* Panel flotante de detalles de la cola */}
      {showDrawer && (
        <div className="absolute right-0 top-10 w-80 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-4 text-slate-900 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-bold text-slate-800">Bandeja de Salida (IndexedDB)</h4>
              <p className="text-[10px] text-slate-500">{queuedItems.length} reporte(s) en memoria local</p>
            </div>
            <button
              onClick={handleManualSync}
              disabled={isSyncing || queuedItems.length === 0}
              className="flex items-center gap-1 text-[11px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium px-2.5 py-1 rounded shadow-sm transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sincronizar</span>
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 my-2 space-y-1">
            {queuedItems.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-4">No hay reportes encolados</p>
            ) : (
              queuedItems.map((item) => (
                <div key={item.client_temp_id} className="py-2 text-xs">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-blue-700">{item.category}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      item.sync_status === 'SYNCED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.sync_status === 'FAILED'
                        ? 'bg-red-100 text-red-800'
                        : item.sync_status === 'SYNCING'
                        ? 'bg-blue-100 text-blue-800 animate-pulse'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.sync_status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 truncate mt-0.5">
                    {item.description || 'Sin descripción adicional'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(item.timestamp).toLocaleTimeString()} • Reintentos: {item.retry_count}
                  </p>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => setShowDrawer(false)}
            className="w-full text-center text-[11px] text-slate-500 hover:text-slate-800 pt-2 border-t border-slate-100"
          >
            Cerrar panel
          </button>
        </div>
      )}
    </div>
  );
};
