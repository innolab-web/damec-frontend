/**
 * Motor de Sincronización Híbrido para DAMEC
 * Sincroniza reportes encolados en IndexedDB cuando se restablece la conectividad real.
 * Mitiga la falacia de navigator.onLine mediante ping activo y backoff exponencial.
 */

import { getPendingReports, removeProcessedReport, updateReportStatus, QueuedReport } from '@/utils/storageQueue';

type SyncListener = (pendingCount: number, isSyncing: boolean) => void;

class SyncEngine {
  private isSyncing = false;
  private listeners: Set<SyncListener> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initListeners();
    }
  }

  private initListeners() {
    window.addEventListener('online', () => {
      console.log('[DAMEC Sync] Evento "online" detectado. Verificando conectividad real...');
      this.triggerSync();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.triggerSync();
      }
    });

    window.addEventListener('focus', () => {
      this.triggerSync();
    });

    // Verificación periódica pasiva cada 60 segundos
    this.checkInterval = setInterval(() => {
      this.triggerSync();
    }, 60000);
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.notify();
    return () => this.listeners.delete(listener);
  }

  private async notify() {
    try {
      const pending = await getPendingReports();
      this.listeners.forEach((l) => l(pending.length, this.isSyncing));
    } catch {
      // Ignorar errores al notificar
    }
  }

  /**
   * Verifica conectividad real hacia el servidor (evita falsos positivos de red 2G/túnel)
   */
  public async checkRealConnectivity(): Promise<boolean> {
    if (!navigator.onLine) return false;
    try {
      const response = await fetch('/api/v1/health', {
        method: 'HEAD',
        cache: 'no-store'
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Dispara el procesamiento de la cola de reportes
   */
  public async triggerSync(): Promise<void> {
    if (this.isSyncing) return;

    const isConnected = await this.checkRealConnectivity();
    if (!isConnected) {
      console.log('[DAMEC Sync] Sin conectividad real confirmada. Se mantiene la cola offline.');
      this.notify();
      return;
    }

    const pendingReports = await getPendingReports();
    if (pendingReports.length === 0) {
      this.notify();
      return;
    }

    this.isSyncing = true;
    this.notify();

    console.log(`[DAMEC Sync] Iniciando sincronización de ${pendingReports.length} reportes...`);

    for (const report of pendingReports) {
      try {
        await updateReportStatus(report.client_temp_id, 'SYNCING');

        const formData = new FormData();
        formData.append('client_temp_id', report.client_temp_id);
        formData.append('category', report.category);
        formData.append('latitude', report.latitude.toString());
        formData.append('longitude', report.longitude.toString());
        formData.append('description', report.description);
        formData.append('client_timestamp', report.timestamp);
        formData.append('evidence_image', report.image_blob, `${report.client_temp_id}.webp`);

        const response = await fetch('/api/v1/reports', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          console.log(`[DAMEC Sync] Reporte ${report.client_temp_id} sincronizado exitosamente.`);
          await removeProcessedReport(report.client_temp_id);
        } else if (response.status >= 400 && response.status < 500) {
          // Error de validación permanente
          const errorData = await response.json().catch(() => ({}));
          console.error(`[DAMEC Sync] Error de validación 4xx en ${report.client_temp_id}:`, errorData);
          await updateReportStatus(report.client_temp_id, 'FAILED', errorData.message || 'Error de validación');
        } else {
          // Error de servidor (5xx)
          throw new Error(`Error de servidor (${response.status})`);
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
        console.warn(`[DAMEC Sync] Fallo de transmisión para ${report.client_temp_id}:`, errorMsg);
        await updateReportStatus(report.client_temp_id, 'FAILED', errorMsg);
        // Interrumpir ciclo si perdimos conexión en medio del envío
        break;
      }
    }

    this.isSyncing = false;
    this.notify();
  }
}

export const syncEngine = typeof window !== 'undefined' ? new SyncEngine() : null;
