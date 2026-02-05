'use client';

/**
 * Table Settings Page
 * Admin interface for configuring the number of tables
 * 
 * Location: /admin/settings/tables
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    TableProperties,
    Plus,
    Minus,
    Save,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    RefreshCw,
    Users,
    Edit3,
    Check,
    X
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://restonext.me/api';

async function getToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
}

interface TableCountResponse {
    previous_count: number;
    requested_count: number;
    final_count: number;
    tables_created: number;
    tables_deleted: number;
    errors: string[] | null;
}

interface TablesResponse {
    tables: Array<{
        id: string;
        number: number;
        capacity: number;
        status: string;
    }>;
    base_url: string;
}

async function fetchTables(): Promise<TablesResponse> {
    const token = await getToken();
    const res = await fetch(`${API_BASE}/admin/tables`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch tables');
    return res.json();
}

async function setTableCount(targetCount: number): Promise<TableCountResponse> {
    const token = await getToken();
    const res = await fetch(`${API_BASE}/admin/tables/set-count`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ target_count: targetCount })
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to set table count');
    }
    return res.json();
}

async function updateTableCapacity(tableId: string, capacity: number): Promise<void> {
    const token = await getToken();
    const res = await fetch(`${API_BASE}/admin/tables/${tableId}`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ capacity })
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to update table');
    }
}

export default function TableSettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [currentCount, setCurrentCount] = useState(0);
    const [targetCount, setTargetCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [tables, setTables] = useState<Array<{ id: string; number: number; capacity: number; status: string }>>([]);
    const [editingTable, setEditingTable] = useState<string | null>(null);
    const [editCapacity, setEditCapacity] = useState(4);
    const [savingCapacity, setSavingCapacity] = useState(false);

    useEffect(() => {
        loadTables();
    }, []);

    const loadTables = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchTables();
            setTables(data.tables.sort((a, b) => a.number - b.number));
            setCurrentCount(data.tables.length);
            setTargetCount(data.tables.length);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error loading tables');
        } finally {
            setLoading(false);
        }
    };

    const handleEditCapacity = (table: { id: string; capacity: number }) => {
        setEditingTable(table.id);
        setEditCapacity(table.capacity);
    };

    const handleSaveCapacity = async (tableId: string) => {
        try {
            setSavingCapacity(true);
            setError(null);
            await updateTableCapacity(tableId, editCapacity);
            setTables(prev => prev.map(t =>
                t.id === tableId ? { ...t, capacity: editCapacity } : t
            ));
            setEditingTable(null);
            setSuccess('Capacidad actualizada');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error updating capacity');
        } finally {
            setSavingCapacity(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingTable(null);
    };

    const handleSave = async () => {
        if (targetCount === currentCount) {
            setSuccess('No hay cambios que guardar');
            setTimeout(() => setSuccess(null), 3000);
            return;
        }

        try {
            setSaving(true);
            setError(null);
            setSuccess(null);
            setWarnings([]);

            const result = await setTableCount(targetCount);

            if (result.errors && result.errors.length > 0) {
                setWarnings(result.errors);
            }

            const message = result.tables_created > 0
                ? `Se crearon ${result.tables_created} mesas nuevas`
                : result.tables_deleted > 0
                    ? `Se eliminaron ${result.tables_deleted} mesas`
                    : 'Configuración actualizada';

            setSuccess(message);
            setCurrentCount(result.final_count);
            setTargetCount(result.final_count);

            setTimeout(() => setSuccess(null), 5000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error saving');
        } finally {
            setSaving(false);
        }
    };

    const increment = () => {
        if (targetCount < 100) setTargetCount(prev => prev + 1);
    };

    const decrement = () => {
        if (targetCount > 1) setTargetCount(prev => prev - 1);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    <p className="text-gray-500">Cargando configuración...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <TableProperties className="w-5 h-5 text-orange-500" />
                                Configuración de Mesas
                            </h1>
                            <p className="text-sm text-gray-500">
                                Configura el número de mesas de tu restaurante
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Main Card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Current Status */}
                    <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-amber-50">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Mesas Actuales</p>
                                <p className="text-4xl font-bold text-gray-900">{currentCount}</p>
                            </div>
                            <button
                                onClick={loadTables}
                                className="p-2 rounded-lg hover:bg-white/50 transition-colors"
                                title="Recargar"
                            >
                                <RefreshCw className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    {/* Counter */}
                    <div className="p-6">
                        <label className="block text-sm font-medium text-gray-700 mb-4">
                            Número de Mesas Deseado
                        </label>

                        <div className="flex items-center justify-center gap-6">
                            <button
                                onClick={decrement}
                                disabled={targetCount <= 1}
                                className="w-14 h-14 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                            >
                                <Minus className="w-6 h-6 text-gray-700" />
                            </button>

                            <div className="flex flex-col items-center">
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={targetCount}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 1;
                                        setTargetCount(Math.max(1, Math.min(100, val)));
                                    }}
                                    className="w-24 text-center text-4xl font-bold text-gray-900 border-2 border-gray-200 rounded-xl py-2 focus:border-orange-500 focus:outline-none"
                                />
                                <span className="text-sm text-gray-500 mt-2">mesas</span>
                            </div>

                            <button
                                onClick={increment}
                                disabled={targetCount >= 100}
                                className="w-14 h-14 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                            >
                                <Plus className="w-6 h-6 text-gray-700" />
                            </button>
                        </div>

                        {/* Slider */}
                        <div className="mt-6">
                            <input
                                type="range"
                                min="1"
                                max="100"
                                value={targetCount}
                                onChange={(e) => setTargetCount(parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                                <span>1</span>
                                <span>50</span>
                                <span>100</span>
                            </div>
                        </div>

                        {/* Change Preview */}
                        {targetCount !== currentCount && (
                            <div className={`mt-6 p-4 rounded-xl ${targetCount > currentCount
                                ? 'bg-emerald-50 border border-emerald-200'
                                : 'bg-amber-50 border border-amber-200'
                                }`}>
                                <p className={`text-sm font-medium ${targetCount > currentCount
                                    ? 'text-emerald-700'
                                    : 'text-amber-700'
                                    }`}>
                                    {targetCount > currentCount
                                        ? `Se agregarán ${targetCount - currentCount} mesas nuevas`
                                        : `Se eliminarán ${currentCount - targetCount} mesas (las más altas)`
                                    }
                                </p>
                                {targetCount < currentCount && (
                                    <p className="text-xs text-amber-600 mt-1">
                                        Solo se pueden eliminar mesas libres sin órdenes activas
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Alerts */}
                    {error && (
                        <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="mx-6 mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-emerald-700">{success}</p>
                        </div>
                    )}

                    {warnings.length > 0 && (
                        <div className="mx-6 mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-amber-700">Advertencias:</p>
                                    <ul className="mt-1 text-sm text-amber-600 list-disc list-inside">
                                        {warnings.map((w, i) => (
                                            <li key={i}>{w}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Save Button */}
                    <div className="p-6 border-t border-gray-100 bg-gray-50">
                        <button
                            onClick={handleSave}
                            disabled={saving || targetCount === currentCount}
                            className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Guardar Cambios
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Tables List */}
                {tables.length > 0 && (
                    <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-cyan-50">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Users className="w-5 h-5 text-teal-500" />
                                Capacidad por Mesa
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Configura el número de personas para cada mesa
                            </p>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {tables.map((table) => (
                                <div
                                    key={table.id}
                                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                                            <span className="font-bold text-teal-700">{table.number}</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">Mesa {table.number}</p>
                                            <p className="text-xs text-gray-500 capitalize">
                                                {table.status === 'free' ? 'Libre' : table.status === 'occupied' ? 'Ocupada' : table.status}
                                            </p>
                                        </div>
                                    </div>

                                    {editingTable === table.id ? (
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                                                <button
                                                    onClick={() => setEditCapacity(prev => Math.max(1, prev - 1))}
                                                    className="w-8 h-8 rounded flex items-center justify-center hover:bg-gray-200 transition-colors"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="20"
                                                    value={editCapacity}
                                                    onChange={(e) => setEditCapacity(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                                                    className="w-12 text-center font-semibold bg-white border border-gray-200 rounded py-1"
                                                />
                                                <button
                                                    onClick={() => setEditCapacity(prev => Math.min(20, prev + 1))}
                                                    className="w-8 h-8 rounded flex items-center justify-center hover:bg-gray-200 transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => handleSaveCapacity(table.id)}
                                                disabled={savingCapacity}
                                                className="w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors disabled:opacity-50"
                                            >
                                                {savingCapacity ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Check className="w-4 h-4" />
                                                )}
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-600 flex items-center justify-center transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1 text-gray-600">
                                                <Users className="w-4 h-4" />
                                                <span className="font-medium">{table.capacity}</span>
                                                <span className="text-xs text-gray-400">personas</span>
                                            </div>
                                            <button
                                                onClick={() => handleEditCapacity(table)}
                                                className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                                                title="Editar capacidad"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Info Card */}
                <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <TableProperties className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-blue-900">Información</h4>
                            <ul className="mt-1 text-sm text-blue-700 list-disc list-inside space-y-1">
                                <li>Las nuevas mesas se crean con capacidad de 4 personas</li>
                                <li>Haz clic en el ícono de editar para cambiar la capacidad</li>
                                <li>Los códigos QR se generan automáticamente</li>
                                <li>Solo se eliminan mesas libres (las de número más alto primero)</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
