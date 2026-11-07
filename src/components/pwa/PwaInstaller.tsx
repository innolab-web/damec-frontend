'use client';

import React, { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstaller: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showBanner, setShowBanner] = useState<boolean>(false);

  useEffect(() => {
    // 1. Registro del Service Worker
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[DAMEC PWA] Service Worker registrado con alcance:', registration.scope);

            // Registro opcional de Background Sync si el navegador lo soporta (Chromium)
            if ('sync' in registration) {
              (registration as any).sync.register('sync-damec-reports').catch((e: any) => {
                console.log('[DAMEC PWA] Background Sync no disponible en este contexto:', e.message);
              });
            }
          })
          .catch((err) => {
            console.warn('[DAMEC PWA] Fallo al registrar Service Worker:', err);
          });
      });

      // Escuchar mensajes de sincronización completada desde el Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'DAMEC_SYNC_COMPLETED') {
          console.log('[DAMEC PWA] Sincronización en segundo plano completada.');
        }
      });
    }

    // 2. Captura del evento de instalación PWA
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Detectar si ya está corriendo en modo standalone (instalado)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      setShowBanner(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      console.log('[DAMEC PWA] El usuario aceptó la instalación.');
      setIsInstalled(true);
      setShowBanner(false);
    }
    setInstallPrompt(null);
  };

  if (!showBanner || isInstalled) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 max-w-sm bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 p-3.5 flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center flex-shrink-0 shadow-sm">
          <Smartphone className="w-5 h-5 text-white" />
        </div>
        <div>
          <h4 className="text-xs font-bold leading-tight">Instalar DAMEC</h4>
          <p className="text-[11px] text-slate-300 leading-tight mt-0.5">
            Acceso rápido y reportes offline sin cobertura
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={handleInstallClick}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar</span>
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
          aria-label="Cerrar banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
