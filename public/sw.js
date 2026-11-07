/**
 * DAMEC Service Worker: Resiliencia Offline y Sincronización en Segundo Plano
 * Compatible con especificación PWA y Chromium Background Sync API
 */

const CACHE_NAME = 'damec-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/maplibre-gl-worker.mjs',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png'
];

// 1. Instalación y Precaché de activos críticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[DAMEC SW] Precargando activos críticos en caché...');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activación y purga de versiones anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[DAMEC SW] Eliminando caché obsoleta:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Estrategia de Intercepción de Peticiones (Fetch)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // A. Peticiones de API: Network First (prioriza datos frescos del servidor)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Fallback para ping de salud offline
        if (url.pathname === '/api/v1/health') {
          return new Response(JSON.stringify({ status: 'offline' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 503
          });
        }
        return caches.match(event.request);
      })
    );
    return;
  }

  // B. Archivos estáticos pesados (Worker de MapLibre, íconos, chunks): Cache First con fallback a red
  if (
    url.pathname === '/maplibre-gl-worker.mjs' ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/_next/static/')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // C. Navegación HTML: Network First con fallback a la App Shell en caché
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/');
      })
    );
    return;
  }

  // D. Resto de peticiones: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networked = fetch(event.request).then((resp) => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return resp;
      }).catch(() => null);

      return cached || networked;
    })
  );
});

// 4. Background Sync API (Chromium / Android)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-damec-reports') {
    console.log('[DAMEC SW] Background Sync disparado: sincronizando reportes pendientes...');
    event.waitUntil(processBackgroundSyncQueue());
  }
});

// Procesador de la cola IndexedDB en el hilo del Service Worker
async function processBackgroundSyncQueue() {
  try {
    // Abrir IndexedDB directamente desde el Worker
    const db = await openIDB();
    const reports = await getPendingFromStore(db);

    if (!reports || reports.length === 0) return;

    for (const report of reports) {
      try {
        const formData = new FormData();
        formData.append('client_temp_id', report.client_temp_id);
        formData.append('category', report.category);
        formData.append('latitude', report.latitude.toString());
        formData.append('longitude', report.longitude.toString());
        formData.append('description', report.description);
        formData.append('client_timestamp', report.timestamp);
        formData.append('evidence_image', report.image_blob, `${report.client_temp_id}.webp`);

        const res = await fetch('/api/v1/reports', {
          method: 'POST',
          body: formData
        });

        if (res.ok || (res.status >= 400 && res.status < 500)) {
          // Si se insertó con éxito o tuvo error permanente de validación, eliminar de la cola
          await deleteFromStore(db, report.client_temp_id);
        }
      } catch (err) {
        console.warn('[DAMEC SW] Error enviando reporte en background sync:', err);
        throw err; // Lanza error para que el SO reintente en el siguiente ciclo
      }
    }

    // Notificar a las ventanas activas que la sincronización terminó
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({ type: 'DAMEC_SYNC_COMPLETED' });
    });

  } catch (err) {
    console.warn('[DAMEC SW] Fallo en ciclo de Background Sync:', err);
  }
}

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('damec_offline_db', 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getPendingFromStore(db) {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction('reports_queue', 'readonly');
      const store = tx.objectStore('reports_queue');
      const index = store.index('by_status');
      const req = index.getAll('PENDING');
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    } catch (e) {
      resolve([]);
    }
  });
}

function deleteFromStore(db, key) {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction('reports_queue', 'readwrite');
      const store = tx.objectStore('reports_queue');
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (e) {
      resolve();
    }
  });
}
