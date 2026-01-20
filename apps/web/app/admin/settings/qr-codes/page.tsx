'use client';

/**
 * QR Code Management Page
 * Admin interface for managing table QR codes, token rotation, and printing
 * 
 * Location: /admin/settings/qr-codes
 */

import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
    RefreshCw,
    Printer,
    Download,
    QrCode,
    Settings2,
    CheckCircle2,
    XCircle,
    Loader2,
    RotateCcw,
    TableProperties,
    Shield
} from 'lucide-react';

// Types
interface TableQRInfo {
    id: string;
    number: number;
    capacity: number;
    status: 'free' | 'occupied' | 'bill_requested';
    qr_secret_token: string;
    qr_token_generated_at: string | null;
    self_service_enabled: boolean;
    qr_url: string;
}

interface TablesResponse {
    tables: TableQRInfo[];
    base_url: string;
}

// API functions
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://whale-app-i6h36.ondigitalocean.app/api';

async function getToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
}

async function fetchTables(): Promise<TablesResponse> {
    const token = await getToken();
    const res = await fetch(`${API_BASE}/admin/tables`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch tables');
    return res.json();
}

async function rotateToken(tableId: string): Promise<{ new_qr_url: string }> {
    const token = await getToken();
    const res = await fetch(`${API_BASE}/admin/tables/${tableId}/rotate-token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to rotate token');
    return res.json();
}

async function toggleSelfService(tableId: string, enabled: boolean): Promise<void> {
    const token = await getToken();
    const res = await fetch(`${API_BASE}/admin/tables/${tableId}/self-service`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled })
    });
    if (!res.ok) throw new Error('Failed to toggle self-service');
}

async function closeSession(tableId: string): Promise<void> {
    const token = await getToken();
    const res = await fetch(`${API_BASE}/admin/tables/${tableId}/close-session`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to close session');
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
    const styles = {
        free: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        occupied: 'bg-amber-100 text-amber-700 border-amber-200',
        bill_requested: 'bg-purple-100 text-purple-700 border-purple-200'
    };

    const labels = {
        free: 'Libre',
        occupied: 'Ocupada',
        bill_requested: 'Cuenta solicitada'
    };

    return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[status as keyof typeof styles] || styles.free}`}>
            {labels[status as keyof typeof labels] || status}
        </span>
    );
}

// Table Card component
function TableCard({
    table,
    onRotate,
    onToggle,
    onCloseSession,
    onPrint,
    isRotating,
    restaurantName
}: {
    table: TableQRInfo;
    onRotate: (id: string) => void;
    onToggle: (id: string, enabled: boolean) => void;
    onCloseSession: (id: string) => void;
    onPrint: (table: TableQRInfo) => void;
    isRotating: boolean;
    restaurantName: string;
}) {
    const [showQR, setShowQR] = useState(false);

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-lg">
                        {table.number}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Mesa {table.number}</h3>
                        <p className="text-sm text-gray-500">{table.capacity} personas</p>
                    </div>
                </div>
                <StatusBadge status={table.status} />
            </div>

            {/* QR Preview */}
            <div
                className="p-4 bg-gray-50 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setShowQR(!showQR)}
            >
                {showQR ? (
                    <div className="p-4 bg-white rounded-xl shadow-inner">
                        <QRCodeSVG
                            value={table.qr_url}
                            size={160}
                            level="H"
                            includeMargin={true}
                        />
                        <p className="text-center text-xs text-gray-500 mt-2">
                            {table.qr_url.slice(0, 40)}...
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 py-4">
                        <QrCode className="w-12 h-12 text-gray-400" />
                        <span className="text-sm text-gray-500">Click para ver QR</span>
                    </div>
                )}
            </div>

            {/* Self-Service Toggle */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TableProperties className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">Auto-Servicio</span>
                </div>
                <button
                    onClick={() => onToggle(table.id, !table.self_service_enabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${table.self_service_enabled
                            ? 'bg-emerald-500'
                            : 'bg-gray-300'
                        }`}
                >
                    <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${table.self_service_enabled ? 'left-7' : 'left-1'
                            }`}
                    />
                </button>
            </div>

            {/* Token Info */}
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
                <p className="text-xs text-gray-500">
                    Token: <span className="font-mono">{table.qr_secret_token.slice(0, 8)}...</span>
                </p>
                {table.qr_token_generated_at && (
                    <p className="text-xs text-gray-400">
                        Generado: {new Date(table.qr_token_generated_at).toLocaleDateString('es-MX')}
                    </p>
                )}
            </div>

            {/* Actions */}
            <div className="p-3 border-t border-gray-100 grid grid-cols-3 gap-2">
                <button
                    onClick={() => onRotate(table.id)}
                    disabled={isRotating}
                    className="flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                    title="Rotar Token"
                >
                    {isRotating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <RefreshCw className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Rotar</span>
                </button>

                <button
                    onClick={() => onPrint(table)}
                    className="flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    title="Imprimir"
                >
                    <Printer className="w-4 h-4" />
                    <span className="hidden sm:inline">Imprimir</span>
                </button>

                {table.status !== 'free' && (
                    <button
                        onClick={() => onCloseSession(table.id)}
                        className="flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-colors"
                        title="Cerrar Mesa"
                    >
                        <XCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Cerrar</span>
                    </button>
                )}
            </div>
        </div>
    );
}

// Printable QR Card component
function PrintableQRCard({ table, restaurantName }: { table: TableQRInfo; restaurantName: string }) {
    return (
        <div className="print-card" style={{
            width: '300px',
            padding: '24px',
            backgroundColor: 'white',
            borderRadius: '16px',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
            <div style={{
                marginBottom: '16px',
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#1f2937'
            }}>
                {restaurantName}
            </div>

            <div style={{
                display: 'inline-block',
                padding: '16px',
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '2px solid #e5e7eb'
            }}>
                <QRCodeSVG
                    value={table.qr_url}
                    size={180}
                    level="H"
                    includeMargin={false}
                />
            </div>

            <div style={{
                marginTop: '16px',
                padding: '12px 20px',
                backgroundColor: '#f97316',
                color: 'white',
                borderRadius: '12px',
                fontSize: '24px',
                fontWeight: 'bold'
            }}>
                Mesa {table.number}
            </div>

            <div style={{
                marginTop: '12px',
                fontSize: '14px',
                color: '#6b7280'
            }}>
                Escanea para ordenar desde tu celular
            </div>

            <div style={{
                marginTop: '8px',
                fontSize: '11px',
                color: '#9ca3af'
            }}>
                Powered by RestoNext
            </div>
        </div>
    );
}

// Main Page Component
export default function QRCodesPage() {
    const [tables, setTables] = useState<TableQRInfo[]>([]);
    const [baseUrl, setBaseUrl] = useState('');
    const [restaurantName, setRestaurantName] = useState('RestoNext');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rotatingId, setRotatingId] = useState<string | null>(null);
    const [selectedForPrint, setSelectedForPrint] = useState<TableQRInfo | null>(null);
    const printRef = useRef<HTMLDivElement>(null);

    // Fetch tables on mount
    useEffect(() => {
        loadTables();
    }, []);

    const loadTables = async () => {
        try {
            setLoading(true);
            const data = await fetchTables();
            setTables(data.tables);
            setBaseUrl(data.base_url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error loading tables');
        } finally {
            setLoading(false);
        }
    };

    const handleRotateToken = async (tableId: string) => {
        try {
            setRotatingId(tableId);
            const result = await rotateToken(tableId);

            // Update table in state with new QR URL
            setTables(prev => prev.map(t =>
                t.id === tableId
                    ? { ...t, qr_url: result.new_qr_url, qr_token_generated_at: new Date().toISOString() }
                    : t
            ));
        } catch (err) {
            alert('Error al rotar token: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setRotatingId(null);
        }
    };

    const handleToggleSelfService = async (tableId: string, enabled: boolean) => {
        try {
            await toggleSelfService(tableId, enabled);
            setTables(prev => prev.map(t =>
                t.id === tableId ? { ...t, self_service_enabled: enabled } : t
            ));
        } catch (err) {
            alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };

    const handleCloseSession = async (tableId: string) => {
        if (!confirm('¿Estás seguro de cerrar esta mesa? Se marcará como pagada y se rotará el token.')) {
            return;
        }

        try {
            await closeSession(tableId);
            await loadTables(); // Reload to get updated status
        } catch (err) {
            alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };

    const handlePrint = (table: TableQRInfo) => {
        setSelectedForPrint(table);
        setTimeout(() => {
            window.print();
        }, 100);
    };

    const handleBulkRotate = async () => {
        if (!confirm('¿Rotar TODOS los tokens? Los QR actuales dejarán de funcionar.')) {
            return;
        }

        try {
            setLoading(true);
            const token = await getToken();
            const res = await fetch(`${API_BASE}/admin/tables/bulk-rotate-tokens`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Bulk rotation failed');
            await loadTables();
            alert('Todos los tokens han sido rotados');
        } catch (err) {
            alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    <p className="text-gray-500">Cargando mesas...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-red-700 mb-2">Error</h2>
                    <p className="text-red-600">{error}</p>
                    <button
                        onClick={loadTables}
                        className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-container, .print-container * {
                        visibility: visible;
                    }
                    .print-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        display: flex;
                        justify-content: center;
                        padding-top: 20mm;
                    }
                }
            `}</style>

            {/* Print Container (hidden on screen) */}
            {selectedForPrint && (
                <div className="print-container hidden print:block" ref={printRef}>
                    <PrintableQRCard
                        table={selectedForPrint}
                        restaurantName={restaurantName}
                    />
                </div>
            )}

            {/* Main Content */}
            <div className="min-h-screen bg-gray-50 print:hidden">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                                        <QrCode className="w-5 h-5 text-white" />
                                    </div>
                                    Gestión de QR Codes
                                </h1>
                                <p className="text-gray-500 mt-1">
                                    Administra los códigos QR de tus mesas para auto-servicio
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleBulkRotate}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    <Shield className="w-4 h-4" />
                                    Rotar Todos
                                </button>

                                <button
                                    onClick={loadTables}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition-colors"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Actualizar
                                </button>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4 mt-6">
                            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                                <div className="text-2xl font-bold text-emerald-600">
                                    {tables.filter(t => t.status === 'free').length}
                                </div>
                                <div className="text-sm text-emerald-600">Mesas Libres</div>
                            </div>
                            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                                <div className="text-2xl font-bold text-amber-600">
                                    {tables.filter(t => t.status === 'occupied').length}
                                </div>
                                <div className="text-sm text-amber-600">Ocupadas</div>
                            </div>
                            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                                <div className="text-2xl font-bold text-purple-600">
                                    {tables.filter(t => t.self_service_enabled).length}
                                </div>
                                <div className="text-sm text-purple-600">Auto-Servicio Activo</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tables Grid */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {tables.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                            <TableProperties className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">No hay mesas configuradas</h3>
                            <p className="text-gray-500 mt-2">
                                Agrega mesas desde el POS para generar códigos QR
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {tables.map(table => (
                                <TableCard
                                    key={table.id}
                                    table={table}
                                    onRotate={handleRotateToken}
                                    onToggle={handleToggleSelfService}
                                    onCloseSession={handleCloseSession}
                                    onPrint={handlePrint}
                                    isRotating={rotatingId === table.id}
                                    restaurantName={restaurantName}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Security Note */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                        <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-blue-900">Seguridad de Tokens</h4>
                            <p className="text-sm text-blue-700 mt-1">
                                Los tokens se rotan automáticamente cuando se cierra una mesa.
                                Esto invalida el QR anterior, evitando que clientes anteriores
                                accedan a la mesa. Rota manualmente si sospechas de acceso no autorizado.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
