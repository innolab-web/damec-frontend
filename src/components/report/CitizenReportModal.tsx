'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Camera, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Mountain, 
  Droplets, 
  AlertOctagon, 
  Waves, 
  CloudRain, 
  Loader2,
  HardDrive
} from 'lucide-react';
import { compressImageToWebP, CompressionResult } from '@/utils/imageCompressor';
import { enqueueReport } from '@/utils/storageQueue';
import { syncEngine } from '@/services/syncEngine';

interface CitizenReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportCreated?: () => void;
}

const INCIDENT_CATEGORIES = [
  { id: 'HUAYCO', name: 'Huayco / Deslizamiento', icon: Mountain, severity: 'critical' },
  { id: 'INUNDACION', name: 'Inundación', icon: Droplets, severity: 'high' },
  { id: 'CORTE_VIA', name: 'Corte de Vía', icon: AlertOctagon, severity: 'critical' },
  { id: 'DESBORDE', name: 'Desborde de Río', icon: Waves, severity: 'critical' },
  { id: 'LLUVIA_INTENSA', name: 'Lluvia Torrencial', icon: CloudRain, severity: 'moderate' },
];

export const CitizenReportModal: React.FC<CitizenReportModalProps> = ({
  isOpen,
  onClose,
  onReportCreated
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('HUAYCO');
  const [description, setDescription] = useState<string>('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'locating' | 'success' | 'error'>('idle');
  const [locationError, setLocationError] = useState<string>('');
  
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [compressionError, setCompressionError] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitFeedback, setSubmitFeedback] = useState<{
    type: 'online_success' | 'offline_saved' | 'error';
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Solicitar ubicación GPS automáticamente al abrir
  useEffect(() => {
    if (isOpen && !location) {
      handleGetLocation();
    }
    if (!isOpen) {
      // Limpiar estado al cerrar
      setSubmitFeedback(null);
    }
  }, [isOpen]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationError('Tu navegador no soporta geolocalización.');
      return;
    }

    setLocationStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6))
        });
        setLocationStatus('success');
      },
      (err) => {
        console.warn('GPS error:', err.message);
        setLocationStatus('error');
        setLocationError('No se pudo obtener GPS. Puedes reportar con coordenadas de contingencia.');
        // Coordenadas de contingencia por defecto (Centro de Lima)
        setLocation({ lat: -12.0464, lng: -77.0428 });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setCompressionError('');
    try {
      const result = await compressImageToWebP(file, 1280, 0.75);
      setCompressionResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al comprimir la imagen.';
      setCompressionError(msg);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) {
      alert('Se requiere una coordenada para situar el incidente.');
      return;
    }

    setIsSubmitting(true);
    setSubmitFeedback(null);

    try {
      // 1. Crear blob de imagen o blob vacío si no tomó foto
      let finalBlob = compressionResult?.blob;
      if (!finalBlob) {
        finalBlob = new Blob(['empty_placeholder'], { type: 'text/plain' });
      }

      // 2. Encolar en IndexedDB siempre como salvaguarda
      const queuedItem = await enqueueReport({
        category: selectedCategory,
        latitude: location.lat,
        longitude: location.lng,
        description,
        image_blob: finalBlob,
        image_preview: compressionResult?.dataUrl
      });

      // 3. Evaluar sincronización inmediata si hay red
      const isOnline = syncEngine ? await syncEngine.checkRealConnectivity() : navigator.onLine;

      if (isOnline && syncEngine) {
        await syncEngine.triggerSync();
        setSubmitFeedback({
          type: 'online_success',
          message: '¡Reporte enviado y verificado exitosamente por el servidor!'
        });
      } else {
        setSubmitFeedback({
          type: 'offline_saved',
          message: 'Reporte guardado en tu teléfono de forma segura. Se enviará automáticamente apenas regrese la señal.'
        });
      }

      if (onReportCreated) onReportCreated();

      setTimeout(() => {
        onClose();
        // Reset form
        setCompressionResult(null);
        setDescription('');
        setSubmitFeedback(null);
      }, 2500);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fallo inesperado al procesar reporte.';
      setSubmitFeedback({
        type: 'error',
        message: msg
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-red-600 rounded-md">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 id="modal-title" className="text-sm font-bold tracking-tight">Reporte Ciudadano de Incidente</h2>
              <p className="text-[11px] text-slate-300">DAMEC • Modo Offline-First Resiliente</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {submitFeedback && (
            <div className={`p-4 rounded-lg flex items-start gap-3 text-xs font-medium border ${
              submitFeedback.type === 'online_success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : submitFeedback.type === 'offline_saved'
                ? 'bg-blue-50 text-blue-900 border-blue-300'
                : 'bg-red-50 text-red-900 border-red-300'
            }`}>
              {submitFeedback.type === 'online_success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
              {submitFeedback.type === 'offline_saved' && <HardDrive className="w-5 h-5 text-blue-600 flex-shrink-0" />}
              {submitFeedback.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
              <div>
                <p className="font-bold">{submitFeedback.type === 'offline_saved' ? 'Guardado Local en Dispositivo' : 'Estado del Reporte'}</p>
                <p>{submitFeedback.message}</p>
              </div>
            </div>
          )}

          {/* 1. Categoría de Incidente */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              1. Tipo de Incidente (Taxonomía INDECI)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {INCIDENT_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                      isSelected 
                        ? 'border-blue-600 bg-blue-50/80 text-blue-900 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                    <span className="text-[11px] font-semibold leading-tight">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Captura y Compresión en Cliente */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              2. Evidencia Fotográfica (Compresión WebP &lt; 150 KB)
            </label>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden" 
            />

            {!compressionResult ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition-all text-center"
              >
                {isCompressing ? (
                  <div className="flex flex-col items-center gap-2 text-slate-600">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="text-xs font-medium">Comprimiendo y optimizando foto...</span>
                  </div>
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-xs font-semibold text-slate-800">Tomar foto o subir evidencia</span>
                    <span className="text-[11px] text-slate-500 mt-0.5">Se optimiza automáticamente para no saturar la red 2G/3G</span>
                  </>
                )}
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex items-center gap-4">
                <img 
                  src={compressionResult.dataUrl} 
                  alt="Previsualización comprimida" 
                  className="w-20 h-20 object-cover rounded-md border border-slate-300 flex-shrink-0"
                />
                <div className="flex-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-700 mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Optimizada en WebP</span>
                  </div>
                  <p className="text-slate-600">
                    Peso final: <strong className="text-slate-900">{Math.round(compressionResult.compressedSizeBytes / 1024)} KB</strong>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Ahorro de datos: {Math.round((1 - compressionResult.compressedSizeBytes / compressionResult.originalSizeBytes) * 100)}%
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCompressionResult(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="mt-1.5 text-[11px] text-red-600 font-semibold hover:underline"
                  >
                    Cambiar fotografía
                  </button>
                </div>
              </div>
            )}
            {compressionError && (
              <p className="text-xs text-red-600 mt-1">{compressionError}</p>
            )}
          </div>

          {/* 3. Geolocalización */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                3. Coordenadas GPS
              </label>
              <button 
                type="button" 
                onClick={handleGetLocation} 
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-medium"
              >
                <MapPin className="w-3 h-3" />
                Actualizar GPS
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between">
              {locationStatus === 'locating' ? (
                <div className="flex items-center gap-2 text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Obteniendo precisión satelital...</span>
                </div>
              ) : location ? (
                <div>
                  <span className="font-mono text-slate-800 font-semibold">
                    Lat: {location.lat}, Lng: {location.lng}
                  </span>
                  <p className="text-[11px] text-emerald-600 font-medium">GPS capturado y sellado</p>
                </div>
              ) : (
                <span className="text-slate-500">Sin coordenadas detectadas</span>
              )}
            </div>
            {locationError && (
              <p className="text-[11px] text-amber-700 mt-1">{locationError}</p>
            )}
          </div>

          {/* 4. Descripción breve */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              4. Descripción / Observación (Opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Caudal desbordado a 50 metros del puente peatonal, paso vehicular cerrado..."
              rows={2}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-900"
            />
          </div>

          {/* Botón de Envío */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isCompressing || !location}
              className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando e Ingestando...</span>
                </>
              ) : (
                <span>Confirmar y Enviar Reporte</span>
              )}
            </button>
            <p className="text-[11px] text-slate-500 text-center mt-2">
              Protección offline: Si no hay señal en este momento, el reporte se almacenará en IndexedDB.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
