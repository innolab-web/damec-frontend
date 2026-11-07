'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Shield, 
  LogOut, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Mountain, 
  Droplets, 
  AlertOctagon, 
  Waves, 
  CloudRain,
  Eye,
  X
} from 'lucide-react';
import { DeleteConfirmModal } from '@/components/admin/DeleteConfirmModal';
import { EditPublicationModal, EditableItem } from '@/components/admin/EditPublicationModal';
import { MOCK_DAMEC_GEOJSON } from '@/mocks/incidents.mock';

interface CitizenReportItem {
  id: string;
  incident_type_id?: number;
  category: string;
  description: string;
  media_url?: string;
  latitude: number;
  longitude: number;
  reported_at: string;
  status: 'PENDING' | 'VALIDATED' | 'DUPLICATE' | 'REJECTED';
  device_fingerprint?: string;
}

export default function AdminModerationPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'reports' | 'clusters'>('reports');
  
  // Datos
  const [reports, setReports] = useState<CitizenReportItem[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modales
  const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string; type: 'reporte' | 'cluster' } | null>(null);
  const [itemToEdit, setItemToEdit] = useState<EditableItem | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Verificación de sesión
  useEffect(() => {
    const isAuth = localStorage.getItem('damec_admin_auth');
    const user = localStorage.getItem('damec_admin_user');
    if (isAuth !== 'true') {
      router.push('/admin/login');
    } else {
      setAdminUser(user || 'admin@damec.pe');
    }
  }, [router]);

  // Carga de reportes
  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/admin/reports');
      if (res.ok) {
        const json = await res.json();
        if (json.reports) {
          setReports(json.reports);
        }
      }
    } catch (err) {
      console.warn('Error cargando reportes:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carga de clusters
  const loadClusters = useCallback(() => {
    const items = MOCK_DAMEC_GEOJSON.features.map(f => ({
      id: f.properties.id,
      title: f.properties.title,
      category: f.properties.category,
      severity: f.properties.severity,
      description: f.properties.description,
      district: f.properties.district,
      region: f.properties.region,
      confidenceScore: f.properties.confidenceScore,
      reportsCount: f.properties.reportsCount || 1,
      isActive: f.properties.isActive
    }));
    setClusters(items);
  }, []);

  useEffect(() => {
    loadReports();
    loadClusters();
  }, [loadReports, loadClusters]);

  const handleLogout = () => {
    localStorage.removeItem('damec_admin_auth');
    localStorage.removeItem('damec_admin_user');
    router.push('/admin/login');
  };

  // Acción: Confirmar Eliminación
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === 'reporte') {
        const res = await fetch(`/api/v1/admin/reports/${itemToDelete.id}`, { method: 'DELETE' });
        if (res.ok) {
          setReports(prev => prev.filter(r => r.id !== itemToDelete.id));
        }
      } else {
        const res = await fetch(`/api/v1/admin/clusters/${itemToDelete.id}`, { method: 'DELETE' });
        if (res.ok) {
          setClusters(prev => prev.filter(c => c.id !== itemToDelete.id));
        }
      }
    } catch (err) {
      console.error('Error al eliminar:', err);
    } finally {
      setItemToDelete(null);
    }
  };

  // Acción: Guardar Edición
  const handleSaveEdit = async (id: string, fields: Partial<EditableItem>) => {
    if (!itemToEdit) return;

    if (itemToEdit.type === 'report') {
      await fetch(`/api/v1/admin/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      setReports(prev => prev.map(r => r.id === id ? { ...r, ...fields } as any : r));
    } else {
      await fetch(`/api/v1/admin/clusters/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      setClusters(prev => prev.map(c => c.id === id ? { ...c, ...fields } as any : c));
    }
  };

  // Filtrado de reportes
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchText = q === '' || r.description?.toLowerCase().includes(q) || r.category?.toLowerCase().includes(q);
      return matchStatus && matchText;
    });
  }, [reports, statusFilter, searchQuery]);

  // Filtrado de clusters
  const filteredClusters = useMemo(() => {
    return clusters.filter(c => {
      const q = searchQuery.toLowerCase().trim();
      return q === '' || c.title?.toLowerCase().includes(q) || c.district?.toLowerCase().includes(q);
    });
  }, [clusters, searchQuery]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'HUAYCO': return <Mountain className="w-3.5 h-3.5 text-red-600" />;
      case 'INUNDACION': return <Droplets className="w-3.5 h-3.5 text-blue-600" />;
      case 'CORTE_VIA': return <AlertOctagon className="w-3.5 h-3.5 text-amber-600" />;
      case 'DESBORDE': return <Waves className="w-3.5 h-3.5 text-cyan-600" />;
      default: return <CloudRain className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VALIDATED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">VALIDADO</span>;
      case 'DUPLICATE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">DUPLICADO</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">RECHAZADO</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">PENDIENTE</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Barra de navegación minimalista */}
      <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center">
            <Shield className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-900 tracking-tight">DAMEC</h1>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-500">Moderación y Depuración</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="hidden sm:inline-block font-mono text-slate-500 text-[11px]">
            {adminUser}
          </span>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 font-medium transition-colors"
          >
            <span>Ver Mapa Público</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-slate-500 hover:text-red-600 font-medium transition-colors cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Cuerpo principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Controles y pestañas superiores */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          {/* Pestañas minimalistas */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Reportes Ciudadanos ({reports.length})
            </button>
            <button
              onClick={() => setActiveTab('clusters')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'clusters'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Clústeres Públicos ({clusters.length})
            </button>
          </div>

          {/* Buscador y filtros rápidos */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por texto o tipo..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {activeTab === 'reports' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="PENDING">Pendientes</option>
                <option value="VALIDATED">Validados</option>
                <option value="DUPLICATE">Duplicados</option>
                <option value="REJECTED">Rechazados</option>
              </select>
            )}

            <button
              onClick={activeTab === 'reports' ? loadReports : loadClusters}
              className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              title="Refrescar datos"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tab 1: Tabla de Reportes Ciudadanos */}
        {activeTab === 'reports' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                    <th className="py-3 px-4">Evidencia</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Descripción</th>
                    <th className="py-3 px-4">Dispositivo</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No hay reportes que coincidan con los filtros.
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Evidencia fotográfica */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {r.media_url ? (
                            <button
                              onClick={() => setPreviewImage(r.media_url || null)}
                              className="relative group w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center cursor-pointer"
                            >
                              <img src={r.media_url} alt="Evidencia" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="w-3.5 h-3.5 text-white" />
                              </div>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono italic">Sin foto</span>
                          )}
                        </td>

                        {/* Categoría */}
                        <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-900">
                          <span className="flex items-center gap-1.5">
                            {getCategoryIcon(r.category)}
                            <span>{r.category}</span>
                          </span>
                        </td>

                        {/* Descripción */}
                        <td className="py-3 px-4 max-w-xs">
                          <p className="text-slate-600 line-clamp-2 leading-relaxed">
                            {r.description || 'Sin descripción ingresada'}
                          </p>
                        </td>

                        {/* Huella de dispositivo */}
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[10px] text-slate-500">
                          {r.device_fingerprint || 'anónimo'}
                        </td>

                        {/* Fecha */}
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                          {new Date(r.reported_at).toLocaleString('es-PE', {
                            dateStyle: 'short',
                            timeStyle: 'short'
                          })}
                        </td>

                        {/* Estado */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getStatusBadge(r.status)}
                        </td>

                        {/* Acciones */}
                        <td className="py-3 px-4 whitespace-nowrap text-right space-x-1.5">
                          <button
                            onClick={() => setItemToEdit({
                              id: r.id,
                              type: 'report',
                              category: r.category,
                              severity: 'high',
                              status: r.status,
                              description: r.description
                            })}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="Editar publicación"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setItemToDelete({
                              id: r.id,
                              title: `${r.category}: ${r.description?.slice(0, 40) || 'Sin texto'}`,
                              type: 'reporte'
                            })}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Eliminar publicación"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Tabla de Clústeres Públicos */}
        {activeTab === 'clusters' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                    <th className="py-3 px-4">Clúster / Título</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Ubicación</th>
                    <th className="py-3 px-4">Severidad</th>
                    <th className="py-3 px-4">Confianza</th>
                    <th className="py-3 px-4">Reportes</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClusters.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No hay clústeres que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredClusters.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 max-w-xs font-semibold text-slate-900">
                          {c.title}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-700">
                          <span className="flex items-center gap-1.5">
                            {getCategoryIcon(c.category)}
                            <span>{c.category}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                          {c.district}, {c.region}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            c.severity === 'critical'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-orange-50 text-orange-700 border border-orange-200'
                          }`}>
                            {c.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-mono font-semibold text-slate-700">
                          {Math.round(c.confidenceScore * 100)}%
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                          {c.reportsCount} reportes
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-right space-x-1.5">
                          <button
                            onClick={() => setItemToEdit({
                              id: c.id,
                              type: 'cluster',
                              title: c.title,
                              category: c.category,
                              severity: c.severity,
                              status: 'VALIDATED',
                              description: c.description
                            })}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="Editar clúster"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setItemToDelete({
                              id: c.id,
                              title: c.title,
                              type: 'cluster'
                            })}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Desactivar o eliminar clúster"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal de confirmación de eliminación */}
      <DeleteConfirmModal
        isOpen={Boolean(itemToDelete)}
        title={itemToDelete?.title || ''}
        itemType={itemToDelete?.type || 'reporte'}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Modal de edición de publicación */}
      <EditPublicationModal
        isOpen={Boolean(itemToEdit)}
        item={itemToEdit}
        onClose={() => setItemToEdit(null)}
        onSave={handleSaveEdit}
      />

      {/* Visor de imagen en tamaño completo */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs cursor-pointer animate-in fade-in"
        >
          <div className="relative max-w-2xl max-h-[85vh] overflow-hidden rounded-xl bg-black">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-1.5 bg-black/60 text-white rounded-full hover:bg-black transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={previewImage} alt="Evidencia ampliada" className="w-full h-auto max-h-[80vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
