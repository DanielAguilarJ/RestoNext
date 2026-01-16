'use client';

/**
 * RestoNext MX - Super Admin Dashboard
 * =====================================
 * God-mode dashboard for platform operators.
 * 
 * Features:
 * - Real-time MRR (Monthly Recurring Revenue) metrics
 * - Tenant growth charts
 * - Tenant management with impersonation
 * - Plan distribution visualization
 * - AI usage monitoring (cost tracking)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    TrendingUp,
    Users,
    Building2,
    DollarSign,
    Crown,
    Rocket,
    Eye,
    LogIn,
    RefreshCw,
    Search,
    Filter,
    ChevronDown,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Loader2,
    BarChart3,
    Activity,
    Zap,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
};

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API Error: ${response.status}`);
    }
    return response.json();
}

// Types
interface TenantInfo {
    id: string;
    name: string;
    slug: string;
    plan: string;
    estimated_revenue: number;
    is_active: boolean;
    created_at: string;
}

interface AIUsageInfo {
    tenant_id: string;
    tenant_name: string;
    ai_requests_30d: number;
    estimated_cost_usd: number;
}

interface SaaSStats {
    total_tenants: number;
    active_tenants: number;
    tenants_by_plan: Record<string, number>;
    estimated_mrr: number;
    tenants: TenantInfo[];
    ai_usage: AIUsageInfo[];
}

// Plan configuration
const planConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    starter: { color: '#64748b', icon: <Rocket className="w-4 h-4" /> },
    professional: { color: '#8b5cf6', icon: <Crown className="w-4 h-4" /> },
    enterprise: { color: '#f59e0b', icon: <Building2 className="w-4 h-4" /> },
};

// Mock MRR trend data (would come from API in production)
const generateMRRTrend = (currentMRR: number) => {
    const months = ['Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene'];
    const baseValue = currentMRR * 0.5;
    return months.map((month, idx) => ({
        month,
        mrr: Math.round(baseValue + (currentMRR - baseValue) * (idx / 6) + Math.random() * 2000),
    }));
};

// Mock tenant growth data
const generateTenantGrowth = (total: number) => {
    const months = ['Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene'];
    const baseValue = Math.floor(total * 0.3);
    return months.map((month, idx) => ({
        month,
        tenants: Math.round(baseValue + (total - baseValue) * (idx / 6)),
    }));
};

export default function AdminDashboardPage() {
    const router = useRouter();
    const [stats, setStats] = useState<SaaSStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [planFilter, setPlanFilter] = useState<string>('all');
    const [impersonating, setImpersonating] = useState<string | null>(null);

    // Load stats
    const loadStats = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await apiRequest<SaaSStats>('/admin/saas-stats');
            setStats(data);
        } catch (err: any) {
            console.error('Failed to load stats:', err);
            setError(err.message || 'Error al cargar estadísticas');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    // Handle tenant impersonation
    const handleImpersonate = async (tenantId: string, tenantName: string) => {
        if (!confirm(`¿Iniciar sesión como administrador de "${tenantName}"?\n\nEsto te permitirá ver y operar como si fueras el dueño del restaurante.`)) {
            return;
        }

        try {
            setImpersonating(tenantId);

            // Call impersonation endpoint (would need to be created)
            const response = await apiRequest<{ token: string; redirect_url: string }>(
                `/admin/impersonate/${tenantId}`,
                { method: 'POST' }
            );

            // Store the impersonation token and redirect
            localStorage.setItem('impersonation_token', response.token);
            localStorage.setItem('original_token', getToken() || '');
            localStorage.setItem('access_token', response.token);

            router.push(response.redirect_url || '/');
        } catch (err: any) {
            console.error('Impersonation failed:', err);
            alert('Error al iniciar impersonación: ' + (err.message || 'Error desconocido'));
            setImpersonating(null);
        }
    };

    // Filter tenants
    const filteredTenants = stats?.tenants.filter(tenant => {
        const matchesSearch = tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tenant.slug.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPlan = planFilter === 'all' || tenant.plan === planFilter;
        return matchesSearch && matchesPlan;
    }) || [];

    // Prepare chart data
    const mrrTrend = stats ? generateMRRTrend(stats.estimated_mrr) : [];
    const tenantGrowth = stats ? generateTenantGrowth(stats.total_tenants) : [];
    const planDistribution = stats ? Object.entries(stats.tenants_by_plan).map(([plan, count]) => ({
        name: plan.charAt(0).toUpperCase() + plan.slice(1),
        value: count,
        color: planConfig[plan]?.color || '#64748b',
    })) : [];

    // KPI Card component
    const KPICard = ({
        title, value, subtitle, icon, trend, trendUp
    }: {
        title: string;
        value: string | number;
        subtitle?: string;
        icon: React.ReactNode;
        trend?: string;
        trendUp?: boolean;
    }) => (
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-slate-400 text-sm font-medium">{title}</p>
                    <p className="text-3xl font-bold text-white mt-2">{value}</p>
                    {subtitle && (
                        <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
                    )}
                </div>
                <div className="p-3 bg-slate-700/50 rounded-xl">
                    {icon}
                </div>
            </div>
            {trend && (
                <div className={`flex items-center gap-1 mt-4 text-sm font-medium ${trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {trendUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    <span>{trend}</span>
                    <span className="text-slate-500 ml-1">vs mes anterior</span>
                </div>
            )}
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-300">Cargando dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Error de Acceso</h2>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <button
                        onClick={loadStats}
                        className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-all"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                            <LayoutDashboard className="w-10 h-10 text-violet-400" />
                            Super Admin Dashboard
                        </h1>
                        <p className="text-slate-400 mt-2">
                            Panel de control de RestoNext MX • Modo Dios activado 🔥
                        </p>
                    </div>
                    <button
                        onClick={loadStats}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Actualizar
                    </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <KPICard
                        title="MRR Estimado"
                        value={`$${(stats?.estimated_mrr || 0).toLocaleString()}`}
                        subtitle="MXN / mes"
                        icon={<DollarSign className="w-6 h-6 text-emerald-400" />}
                        trend="+12.5%"
                        trendUp={true}
                    />
                    <KPICard
                        title="Total Tenants"
                        value={stats?.total_tenants || 0}
                        subtitle={`${stats?.active_tenants || 0} activos`}
                        icon={<Building2 className="w-6 h-6 text-violet-400" />}
                        trend="+3"
                        trendUp={true}
                    />
                    <KPICard
                        title="Plan Enterprise"
                        value={stats?.tenants_by_plan.enterprise || 0}
                        subtitle="Clientes premium"
                        icon={<Crown className="w-6 h-6 text-amber-400" />}
                        trend="+2"
                        trendUp={true}
                    />
                    <KPICard
                        title="Tasa de Retención"
                        value="94%"
                        subtitle="Últimos 30 días"
                        icon={<Activity className="w-6 h-6 text-blue-400" />}
                        trend="+1.2%"
                        trendUp={true}
                    />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* MRR Trend Chart */}
                    <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white">Evolución del MRR</h3>
                                <p className="text-slate-400 text-sm">Ingreso recurrente mensual</p>
                            </div>
                            <TrendingUp className="w-6 h-6 text-emerald-400" />
                        </div>
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={mrrTrend}>
                                <defs>
                                    <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="month" stroke="#64748b" />
                                <YAxis
                                    stroke="#64748b"
                                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #475569',
                                        borderRadius: '12px',
                                    }}
                                    labelStyle={{ color: '#94a3b8' }}
                                    formatter={(value: number) => [`$${value.toLocaleString()} MXN`, 'MRR']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="mrr"
                                    stroke="#8b5cf6"
                                    strokeWidth={3}
                                    fill="url(#mrrGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Plan Distribution */}
                    <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white">Distribución de Planes</h3>
                                <p className="text-slate-400 text-sm">Por tipo de suscripción</p>
                            </div>
                            <BarChart3 className="w-6 h-6 text-violet-400" />
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={planDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {planDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #475569',
                                        borderRadius: '12px',
                                    }}
                                    formatter={(value: number) => [value, 'Tenants']}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-4 mt-4">
                            {planDistribution.map((plan) => (
                                <div key={plan.name} className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: plan.color }}
                                    />
                                    <span className="text-slate-400 text-sm">{plan.name}: {plan.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tenants Table */}
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                        <div>
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Users className="w-5 h-5 text-violet-400" />
                                Gestión de Tenants
                            </h3>
                            <p className="text-slate-400 text-sm">
                                {filteredTenants.length} de {stats?.total_tenants || 0} tenants
                            </p>
                        </div>

                        {/* Filters */}
                        <div className="flex gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar tenant..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 w-64"
                                />
                            </div>
                            <select
                                value={planFilter}
                                onChange={(e) => setPlanFilter(e.target.value)}
                                className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-violet-500"
                            >
                                <option value="all">Todos los planes</option>
                                <option value="starter">Starter</option>
                                <option value="professional">Professional</option>
                                <option value="enterprise">Enterprise</option>
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left py-4 px-4 text-slate-400 font-medium">Tenant</th>
                                    <th className="text-left py-4 px-4 text-slate-400 font-medium">Plan</th>
                                    <th className="text-left py-4 px-4 text-slate-400 font-medium">Ingreso</th>
                                    <th className="text-left py-4 px-4 text-slate-400 font-medium">Estado</th>
                                    <th className="text-left py-4 px-4 text-slate-400 font-medium">Creado</th>
                                    <th className="text-right py-4 px-4 text-slate-400 font-medium">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTenants.map((tenant) => (
                                    <tr key={tenant.id} className="border-b border-slate-800 hover:bg-slate-700/30 transition-colors">
                                        <td className="py-4 px-4">
                                            <div>
                                                <p className="text-white font-medium">{tenant.name}</p>
                                                <p className="text-slate-500 text-sm">{tenant.slug}</p>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span
                                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
                                                style={{
                                                    backgroundColor: `${planConfig[tenant.plan]?.color}20`,
                                                    color: planConfig[tenant.plan]?.color,
                                                }}
                                            >
                                                {planConfig[tenant.plan]?.icon}
                                                {tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="text-emerald-400 font-medium">
                                                ${tenant.estimated_revenue.toLocaleString()}
                                            </span>
                                            <span className="text-slate-500 text-sm">/mes</span>
                                        </td>
                                        <td className="py-4 px-4">
                                            {tenant.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 text-emerald-400">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Activo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-red-400">
                                                    <XCircle className="w-4 h-4" />
                                                    Inactivo
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 text-slate-400">
                                            {new Date(tenant.created_at).toLocaleDateString('es-MX', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
                                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                                    title="Ver detalles"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleImpersonate(tenant.id, tenant.name)}
                                                    disabled={impersonating === tenant.id}
                                                    className="p-2 text-violet-400 hover:text-violet-300 hover:bg-violet-500/20 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Iniciar sesión como este usuario"
                                                >
                                                    {impersonating === tenant.id ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <LogIn className="w-5 h-5" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredTenants.length === 0 && (
                        <div className="text-center py-12">
                            <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-400">No se encontraron tenants con los filtros aplicados</p>
                        </div>
                    )}
                </div>

                {/* AI Usage Section (Enterprise Feature) */}
                {stats?.ai_usage && stats.ai_usage.length > 0 && (
                    <div className="mt-8 bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Zap className="w-6 h-6 text-amber-400" />
                            <div>
                                <h3 className="text-lg font-semibold text-white">Uso de IA por Tenant</h3>
                                <p className="text-slate-400 text-sm">Monitoreo de costos de OpenAI/Perplexity</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {stats.ai_usage.map((usage) => (
                                <div key={usage.tenant_id} className="p-4 bg-slate-700/30 rounded-xl">
                                    <p className="text-white font-medium mb-2">{usage.tenant_name}</p>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Requests (30d):</span>
                                        <span className="text-white">{usage.ai_requests_30d.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Costo estimado:</span>
                                        <span className="text-amber-400">${usage.estimated_cost_usd.toFixed(2)} USD</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
