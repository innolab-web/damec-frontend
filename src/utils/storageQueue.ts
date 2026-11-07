/**
 * Capa de Persistencia Offline en IndexedDB para DAMEC
 * Garantiza la cola local de reportes ciudadanos ante conectividad degradada (2G/3G / intermitente).
 */

export interface QueuedReport {
  client_temp_id: string;
  category: string;
  incident_type_id?: number;
  latitude: number;
  longitude: number;
  description: string;
  image_blob: Blob;
  image_preview?: string;
  sync_status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  retry_count: number;
  timestamp: string;
  device_fingerprint?: string;
  error_message?: string;
}

const DB_NAME = 'damec_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'reports_queue';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('IndexedDB no está disponible en entorno de servidor.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'client_temp_id' });
        store.createIndex('by_status', 'sync_status', { unique: false });
        store.createIndex('by_timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Encola un reporte en IndexedDB con estado inicial 'PENDING'
 */
export async function enqueueReport(
  reportData: Omit<QueuedReport, 'client_temp_id' | 'sync_status' | 'retry_count' | 'timestamp'>
): Promise<QueuedReport> {
  const db = await openDB();
  const tempId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const record: QueuedReport = {
    ...reportData,
    client_temp_id: tempId,
    sync_status: 'PENDING',
    retry_count: 0,
    timestamp: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(record);

    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Obtiene todos los reportes pendientes de sincronización
 */
export async function getPendingReports(): Promise<QueuedReport[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('by_status');
    const request = index.getAll('PENDING');

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Obtiene todos los reportes almacenados en la cola local (incluye fallidos o en proceso)
 */
export async function getAllQueuedReports(): Promise<QueuedReport[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Actualiza el estado de un reporte en la cola
 */
export async function updateReportStatus(
  tempId: string,
  status: QueuedReport['sync_status'],
  errorMessage?: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(tempId);

    getReq.onsuccess = () => {
      const record = getReq.result as QueuedReport;
      if (!record) return resolve();

      record.sync_status = status;
      if (status === 'FAILED') {
        record.retry_count = (record.retry_count || 0) + 1;
        record.error_message = errorMessage;
      }
      const putReq = store.put(record);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Elimina un reporte de la cola tras confirmarse su subida exitosa
 */
export async function removeProcessedReport(tempId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(tempId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
