"use client";

/**
 * RestoNext MX - Kitchen/KDS Settings Page
 * Configure time thresholds, audio alerts, and mode (cafeteria/restaurant)
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    ArrowLeft, ChefHat, Clock, Volume2, VolumeX,
    Save, Loader2, CheckCircle, AlertCircle,
    Utensils, Coffee, Bell, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://restonext.me/api';

const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
};

interface KDSConfig {
    mode: "cafeteria" | "restaurant";
    warning_minutes: number;
    critical_minutes: number;
    audio_alerts: boolean;
    shake_animation: boolean;
    auto_complete_when_ready: boolean;
}

export default function KitchenSettingsPage() {
    const [config, setConfig] = useState<KDSConfig>({
        mode: "restaurant",
        warning_minutes: 5,
        critical_minutes: 10,
        audio_alerts: true,
        shake_animation: true,
        auto_complete_when_ready: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
    const [error, setError] = useState<string | null>(null);

    // Load configuration
    const loadConfig = useCallback(async () => {
        try {
            const token = getToken();
            if (!token) {
                window.location.href = '/login';
                return;
            }

            const response = await fetch(`${API_BASE_URL}/kds/config`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setConfig({
                    mode: data.mode || "restaurant",
                    warning_minutes: data.warning_minutes || 5,
                    critical_minutes: data.critical_minutes || 10,
                    audio_alerts: data.audio_alerts !== false,
                    shake_animation: data.shake_animation !== false,
                    auto_complete_when_ready: data.auto_complete_when_ready !== false,
                });
            }
        } catch (err) {
            console.error("Failed to load KDS config:", err);
            setError("Error al cargar la configuración");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    // Save configuration
    const handleSave = async () => {
        setSaving(true);
        setSaveStatus("idle");

        try {
            const token = getToken();
            if (!token) {
                window.location.href = '/login';
                return;
            }

            const response = await fetch(`${API_BASE_URL}/kds/config`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to save configuration');
            }

            setSaveStatus("success");
            setTimeout(() => setSaveStatus("idle"), 3000);
        } catch (err: any) {
            console.error("Failed to save KDS config:", err);
            setError(err.message || "Error al guardar");
            setSaveStatus("error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <ChefHat className="w-12 h-12 text-orange-500" />
                    <p className="text-slate-400">Cargando configuración...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="bg-slate-900/80 border-b border-slate-700/50 backdrop-blur-xl sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/settings"
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                                    <ChefHat className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white">
                                        Cocina / KDS
                                    </h1>
                                    <p className="text-sm text-slate-400">Configuración del sistema de cocina</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={cn(
                                "px-6 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2",
                                "bg-gradient-to-r from-emerald-600 to-teal-600 text-white",
                                "hover:from-emerald-500 hover:to-teal-500 active:scale-95",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : saveStatus === "success" ? (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    ¡Guardado!
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Guardar
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* Error Banner */}
            {error && (
                <div className="max-w-4xl mx-auto px-6 pt-4">
                    <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <span className="text-red-300">{error}</span>
                        <button
                            onClick={() => setError(null)}
                            className="ml-auto text-red-400 hover:text-white"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
                {/* Mode Selection */}
                <section className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
                    <div className="p-6 border-b border-slate-700">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-500" />
                            Modo de Operación
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            Selecciona cómo funciona tu negocio
                        </p>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={() => setConfig(c => ({ ...c, mode: "restaurant" }))}
                            className={cn(
                                "p-6 rounded-xl border-2 transition-all text-left",
                                config.mode === "restaurant"
                                    ? "bg-blue-500/20 border-blue-500"
                                    : "bg-slate-700/30 border-slate-600 hover:border-slate-500"
                            )}
                        >
                            <Utensils className={cn(
                                "w-8 h-8 mb-3",
                                config.mode === "restaurant" ? "text-blue-400" : "text-slate-400"
                            )} />
                            <h3 className="text-lg font-bold text-white">Restaurante</h3>
                            <p className="text-sm text-slate-400 mt-1">
                                Pedidos van directo a cocina. El pago es al final del servicio.
                            </p>
                        </button>

                        <button
                            onClick={() => setConfig(c => ({ ...c, mode: "cafeteria" }))}
                            className={cn(
                                "p-6 rounded-xl border-2 transition-all text-left",
                                config.mode === "cafeteria"
                                    ? "bg-orange-500/20 border-orange-500"
                                    : "bg-slate-700/30 border-slate-600 hover:border-slate-500"
                            )}
                        >
                            <Coffee className={cn(
                                "w-8 h-8 mb-3",
                                config.mode === "cafeteria" ? "text-orange-400" : "text-slate-400"
                            )} />
                            <h3 className="text-lg font-bold text-white">Cafetería</h3>
                            <p className="text-sm text-slate-400 mt-1">
                                Cliente paga primero en caja. Pedido va a cocina después del pago.
                            </p>
                        </button>
                    </div>
                </section>

                {/* Time Thresholds */}
                <section className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
                    <div className="p-6 border-b border-slate-700">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-500" />
                            Tiempos de Alerta
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            Define cuándo mostrar advertencias para pedidos atrasados
                        </p>
                    </div>
                    <div className="p-6 space-y-8">
                        {/* Warning Time */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <label className="text-white font-medium">Tiempo de Advertencia</label>
                                    <p className="text-sm text-slate-400">Pedido cambia a amarillo</p>
                                </div>
                                <span className="text-2xl font-bold text-amber-400">
                                    {config.warning_minutes} min
                                </span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="15"
                                value={config.warning_minutes}
                                onChange={(e) => setConfig(c => ({
                                    ...c,
                                    warning_minutes: parseInt(e.target.value),
                                    // Ensure critical is always higher
                                    critical_minutes: Math.max(c.critical_minutes, parseInt(e.target.value) + 1)
                                }))}
                                className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                                <span>1 min</span>
                                <span>15 min</span>
                            </div>
                        </div>

                        {/* Critical Time */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <label className="text-white font-medium">Tiempo Crítico</label>
                                    <p className="text-sm text-slate-400">Pedido cambia a rojo con alerta</p>
                                </div>
                                <span className="text-2xl font-bold text-red-400">
                                    {config.critical_minutes} min
                                </span>
                            </div>
                            <input
                                type="range"
                                min={config.warning_minutes + 1}
                                max="30"
                                value={config.critical_minutes}
                                onChange={(e) => setConfig(c => ({ ...c, critical_minutes: parseInt(e.target.value) }))}
                                className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                            />
                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                                <span>{config.warning_minutes + 1} min</span>
                                <span>30 min</span>
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="p-4 bg-slate-700/50 rounded-xl">
                            <p className="text-sm text-slate-400 mb-3">Vista previa:</p>
                            <div className="flex items-center gap-4 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                                    <span className="text-slate-300">0 - {config.warning_minutes - 1} min: Normal</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
                                    <span className="text-slate-300">{config.warning_minutes} - {config.critical_minutes - 1} min: Advertencia</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                                    <span className="text-slate-300">{config.critical_minutes}+ min: Crítico</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Alerts Configuration */}
                <section className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
                    <div className="p-6 border-b border-slate-700">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Bell className="w-5 h-5 text-yellow-500" />
                            Alertas
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            Configura notificaciones para pedidos atrasados
                        </p>
                    </div>
                    <div className="p-6 space-y-4">
                        {/* Audio Alerts */}
                        <button
                            onClick={() => setConfig(c => ({ ...c, audio_alerts: !c.audio_alerts }))}
                            className="w-full p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl flex items-center justify-between transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                {config.audio_alerts ? (
                                    <Volume2 className="w-6 h-6 text-emerald-400" />
                                ) : (
                                    <VolumeX className="w-6 h-6 text-slate-400" />
                                )}
                                <div className="text-left">
                                    <p className="text-white font-medium">Alertas de Audio</p>
                                    <p className="text-sm text-slate-400">
                                        Sonido cuando un pedido llega a tiempo crítico
                                    </p>
                                </div>
                            </div>
                            <div className={cn(
                                "w-12 h-6 rounded-full transition-colors relative",
                                config.audio_alerts ? "bg-emerald-500" : "bg-slate-600"
                            )}>
                                <div className={cn(
                                    "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all",
                                    config.audio_alerts ? "left-6" : "left-0.5"
                                )} />
                            </div>
                        </button>

                        {/* Shake Animation */}
                        <button
                            onClick={() => setConfig(c => ({ ...c, shake_animation: !c.shake_animation }))}
                            className="w-full p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl flex items-center justify-between transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-6 h-6 rounded",
                                    config.shake_animation ? "bg-red-500 animate-shake" : "bg-slate-600"
                                )} />
                                <div className="text-left">
                                    <p className="text-white font-medium">Animación de Temblor</p>
                                    <p className="text-sm text-slate-400">
                                        Los pedidos críticos tiemblan para llamar la atención
                                    </p>
                                </div>
                            </div>
                            <div className={cn(
                                "w-12 h-6 rounded-full transition-colors relative",
                                config.shake_animation ? "bg-emerald-500" : "bg-slate-600"
                            )}>
                                <div className={cn(
                                    "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all",
                                    config.shake_animation ? "left-6" : "left-0.5"
                                )} />
                            </div>
                        </button>

                        {/* Auto Complete When Ready */}
                        <button
                            onClick={() => setConfig(c => ({ ...c, auto_complete_when_ready: !c.auto_complete_when_ready }))}
                            className="w-full p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl flex items-center justify-between transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <CheckCircle className={cn(
                                    "w-6 h-6",
                                    config.auto_complete_when_ready ? "text-emerald-500" : "text-slate-600"
                                )} />
                                <div className="text-left">
                                    <p className="text-white font-medium">Auto-completar pedido</p>
                                    <p className="text-sm text-slate-400">
                                        Marcar pedido como listo automáticamente cuando todos los items estén preparados
                                    </p>
                                </div>
                            </div>
                            <div className={cn(
                                "w-12 h-6 rounded-full transition-colors relative",
                                config.auto_complete_when_ready ? "bg-emerald-500" : "bg-slate-600"
                            )}>
                                <div className={cn(
                                    "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all",
                                    config.auto_complete_when_ready ? "left-6" : "left-0.5"
                                )} />
                            </div>
                        </button>
                    </div>
                </section>

                {/* Info Box */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-blue-300 font-medium">Nota sobre alertas de audio</p>
                        <p className="text-sm text-blue-200/70 mt-1">
                            Por políticas del navegador, las alertas de audio solo funcionan después de la primera interacción del usuario con la pantalla de cocina.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
