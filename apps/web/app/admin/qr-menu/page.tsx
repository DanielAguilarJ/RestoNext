'use client';

/**
 * Admin QR Menu Dashboard
 * Self-Service management overview for restaurant owners
 * 
 * Features:
 * - Real-time self-service orders monitor
 * - Table QR code overview with quick actions
 * - Link to full QR management settings
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import {
    QrCode,
    Smartphone,
    ChefHat,
    Bell,
    Clock,
    CheckCircle2,
    ArrowRight,
    Settings,
    RefreshCw,
    Loader2,
    XCircle,
    AlertCircle,
    Users,
    ShoppingBag,
    Eye,
    ExternalLink
} from 'lucide-react';

// API Configuration
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://restonext.me/api';

// Types
interface TableQRInfo {
    id: string;
    number: number;
    capacity: number;
    status: 'free' | 'occupied' | 'bill_requested';
    qr_url: string;
    self_service_enabled: boolean;
}

interface SelfServiceOrder {
    id: string;
    table_number: number;
    items_count: number;
    total: number;
    status: string;
    created_at: string;
}

interface ServiceRequest {
    id: string;
    table_number: number;
    request_type: 'waiter' | 'bill' | 'refill' | 'custom';
    message?: string;
    status: string;
    created_at: string;
}

// API Functions
async function getToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
}

async function fetchTables(): Promise<{ tables: TableQRInfo[]; base_url: string }> {
    const token = await getToken();
    const res = await fetch(`${API_BASE}/admin/tables`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch tables');
    return res.json();
}

// Stats Card Component
function StatCard({
    icon: Icon,
    label,
    value,
    color
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    color: string;
}) {
    return (
        <div className={`bg-white rounded-2xl border border-gray-200 p-5 shadow-sm`}>
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    <p className="text-sm text-gray-500">{label}</p>
                </div>
            </div>
        </div>
    );
}

// Table Card Component
function TableCard({ table, onViewQR }: { table: TableQRInfo; onViewQR: (table: TableQRInfo) => void }) {
    const statusColors = {
        free: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        occupied: 'bg-amber-100 text-amber-700 border-amber-200',
        bill_requested: 'bg-purple-100 text-purple-700 border-purple-200'
    };

    const statusLabels = {
        free: 'Libre',
        occupied: 'Ocupada',
        bill_requested: 'Cuenta'
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold">
                            {table.number}
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Mesa {table.number}</h3>
                            <p className="text-xs text-gray-500">{table.capacity} personas</p>
                        </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusColors[table.status]}`}>
                        {statusLabels[table.status]}
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {table.self_service_enabled ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-600">
                                <CheckCircle2 className="w-3 h-3" />
                                Auto-Servicio
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                                <XCircle className="w-3 h-3" />
                                Deshabilitado
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => onViewQR(table)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                    >
                        <QrCode className="w-3 h-3" />
                        Ver QR
                    </button>
                </div>
            </div>
        </div>
    );
}

// QR Modal Component
function QRModal({
    table,
    onClose
}: {
    table: TableQRInfo | null;
    onClose: () => void;
}) {
    if (!table) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Mesa {table.number}</h3>
                    <p className="text-sm text-gray-500 mb-4">Escanea para ordenar</p>

                    <div className="bg-gray-50 rounded-xl p-4 inline-block mb-4">
                        <QRCodeSVG
                            value={table.qr_url}
                            size={200}
                            level="H"
                            includeMargin={true}
                        />
                    </div>

                    <p className="text-xs text-gray-400 break-all mb-4">{table.qr_url}</p>

                    <div className="flex gap-3">
                        <a
                            href={table.qr_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Probar
                        </a>
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Main Page Component
export default function AdminQRMenuPage() {
    const router = useRouter();
    const [tables, setTables] = useState<TableQRInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTable, setSelectedTable] = useState<TableQRInfo | null>(null);

    // Load tables on mount
    useEffect(() => {
        loadData();
    }, []);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchTables();
            setTables(data.tables || []);
        } catch (err) {
            console.error('Failed to load data:', err);
            setError(err instanceof Error ? err.message : 'Error al cargar datos');
        } finally {
            setLoading(false);
        }
    }, []);

    // Stats calculations
    const stats = {
        totalTables: tables.length,
        selfServiceEnabled: tables.filter(t => t.self_service_enabled).length,
        occupied: tables.filter(t => t.status === 'occupied').length,
        billRequested: tables.filter(t => t.status === 'bill_requested').length
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    <p className="text-gray-500">Cargando...</p>
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
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={loadData}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                    <QrCode className="w-5 h-5 text-white" />
                                </div>
                                Menú QR - Self-Service
                            </h1>
                            <p className="text-gray-500 mt-1">
                                Gestiona el sistema de pedidos desde celular para tus clientes
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={loadData}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Actualizar
                            </button>
                            <Link
                                href="/admin/settings/qr-codes"
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition-colors"
                            >
                                <Settings className="w-4 h-4" />
                                Configurar QR
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        icon={Users}
                        label="Total Mesas"
                        value={stats.totalTables}
                        color="bg-blue-500"
                    />
                    <StatCard
                        icon={Smartphone}
                        label="Auto-Servicio Activo"
                        value={stats.selfServiceEnabled}
                        color="bg-emerald-500"
                    />
                    <StatCard
                        icon={ShoppingBag}
                        label="Mesas Ocupadas"
                        value={stats.occupied}
                        color="bg-amber-500"
                    />
                    <StatCard
                        icon={Bell}
                        label="Cuenta Solicitada"
                        value={stats.billRequested}
                        color="bg-purple-500"
                    />
                </div>

                {/* How it works */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-6 mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-orange-500" />
                        ¿Cómo funciona?
                    </h2>
                    <div className="grid md:grid-cols-4 gap-4">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                            <div>
                                <p className="font-medium text-gray-900">Cliente escanea QR</p>
                                <p className="text-sm text-gray-500">Abre el menú en su celular</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                            <div>
                                <p className="font-medium text-gray-900">Selecciona platillos</p>
                                <p className="text-sm text-gray-500">Agrega al carrito con modificadores</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
                            <div>
                                <p className="font-medium text-gray-900">Confirma pedido</p>
                                <p className="text-sm text-gray-500">El pedido se envía automáticamente</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                                <ChefHat className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">Llega a cocina</p>
                                <p className="text-sm text-gray-500">Aparece en el KDS en tiempo real</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tables Grid */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Mesas con QR</h2>
                        <Link
                            href="/kitchen"
                            className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700"
                        >
                            <ChefHat className="w-4 h-4" />
                            Ver Kitchen Display
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {tables.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">No hay mesas configuradas</h3>
                            <p className="text-gray-500 mt-2 mb-6">
                                Agrega mesas desde el POS o la configuración de QR codes
                            </p>
                            <Link
                                href="/admin/settings/qr-codes"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors"
                            >
                                <Settings className="w-4 h-4" />
                                Configurar Mesas
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {tables.map(table => (
                                <TableCard
                                    key={table.id}
                                    table={table}
                                    onViewQR={setSelectedTable}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Links */}
                <div className="grid md:grid-cols-3 gap-4">
                    <Link
                        href="/kitchen"
                        className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-orange-200 hover:shadow-md transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                                <ChefHat className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">Kitchen Display</p>
                                <p className="text-sm text-gray-500">Ver pedidos en cocina</p>
                            </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                    </Link>

                    <Link
                        href="/pos"
                        className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-orange-200 hover:shadow-md transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                <ShoppingBag className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">Punto de Venta</p>
                                <p className="text-sm text-gray-500">Gestionar pedidos</p>
                            </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </Link>

                    <Link
                        href="/admin/settings/qr-codes"
                        className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-orange-200 hover:shadow-md transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                                <Settings className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">Configurar QR Codes</p>
                                <p className="text-sm text-gray-500">Rotar tokens, imprimir</p>
                            </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
                    </Link>
                </div>
            </div>

            {/* QR Modal */}
            <QRModal table={selectedTable} onClose={() => setSelectedTable(null)} />
        </div>
    );
}
