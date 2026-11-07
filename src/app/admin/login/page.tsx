'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, ArrowLeft, Loader2, KeyRound } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          throw new Error(error.message);
        }
      }

      // Guardar bandera de sesión administrativa en localStorage
      localStorage.setItem('damec_admin_auth', 'true');
      localStorage.setItem('damec_admin_user', email || 'admin@damec.pe');
      router.push('/admin');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al autenticar credenciales.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoAccess = () => {
    localStorage.setItem('damec_admin_auth', 'true');
    localStorage.setItem('damec_admin_user', 'operador@damec.pe');
    router.push('/admin');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Enlace de regreso al mapa público */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al portal público</span>
        </Link>

        {/* Marca y encabezado */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 bg-slate-900 text-white rounded-lg shadow-xs">
            <Shield className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">DAMEC Moderación</h1>
            <p className="text-xs text-slate-500">Panel de Control y Depuración Operativa</p>
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-8">
          <form onSubmit={handleLogin} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Correo Institucional
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analista@indeci.gob.pe"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-bold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando credenciales...</span>
                </>
              ) : (
                <span>Ingresar al Panel</span>
              )}
            </button>
          </form>

          {/* Acceso Rápido para Desarrollo / Pruebas */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleDemoAccess}
              className="w-full py-2 px-3 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              <span>Ingreso Rápido de Prueba (Modo Local)</span>
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Permite validar la edición y eliminación inmediata sin configurar Supabase Auth.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
