"use client";

/**
 * Analytics Dashboard Page
 * Business Intelligence dashboard for restaurant owners
 * Real Data Integration
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    DollarSign,
    ShoppingCart,
    TrendingUp,
    Utensils,
    Clock,
    PieChart as PieChartIcon,
    BarChart3,
    RefreshCw,
    Sparkles,
    AlertCircle,
    ChefHat,
    CreditCard,
    Activity,
    Layers,
    Timer,
    Wallet,
    Users,
} from "lucide-react";
import {
    analyticsApi,
    KPIResponse,
    SalesComparisonResponse,
    SalesByCategoryResponse,
    SalesByHourResponse,
    TopDishesResponse,
    KitchenPerformanceResponse,
    LiveOperationsResponse,
    PaymentAnalyticsResponse,
    OrderSourceResponse,
} from "@/lib/api";
import { KPICard } from "@/components/analytics/KPICard";
import { SalesTrendChart } from "@/components/analytics/SalesTrendChart";
import { CategoryPieChart } from "@/components/analytics/CategoryPieChart";
import { HourlyHeatmap } from "@/components/analytics/HourlyHeatmap";
import { TopDishesTable } from "@/components/analytics/TopDishesTable";
import { DateRangePicker, getDefaultDateRange } from "@/components/analytics/DateRangePicker";
import { AiForecastWidget } from "@/components/analytics/AiForecastWidget";
import { AiProcurementWidget } from "@/components/dashboard/AiProcurementWidget";
import { DashboardProvider } from "@/app/analytics/DashboardContext";

interface DateRange {
    startDate: Date;
    endDate: Date;
    label: string;
}

export default function AnalyticsPage() {
    // State for date range
    const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());

    // Loading states
    const [loading, setLoading] = useState({
        kpis: true,
        comparison: true,
        categories: true,
        hourly: true,
        dishes: true,
        kitchen: true,
        liveOps: true,
        payments: true,
        sources: true,
    });

    // Data states
    const [kpis, setKpis] = useState<KPIResponse | null>(null);
    const [comparison, setComparison] = useState<SalesComparisonResponse | null>(null);
    const [categories, setCategories] = useState<SalesByCategoryResponse | null>(null);
    const [hourly, setHourly] = useState<SalesByHourResponse | null>(null);
    const [dishes, setDishes] = useState<TopDishesResponse | null>(null);
    const [kitchen, setKitchen] = useState<KitchenPerformanceResponse | null>(null);
    const [liveOps, setLiveOps] = useState<LiveOperationsResponse | null>(null);
    const [payments, setPayments] = useState<PaymentAnalyticsResponse | null>(null);
    const [sources, setSources] = useState<OrderSourceResponse | null>(null);

    // Error state
    const [error, setError] = useState<string | null>(null);

    // Fetch all data
    const fetchData = async () => {
        setError(null);
        setLoading({
            kpis: true,
            comparison: true,
            categories: true,
            hourly: true,
            dishes: true,
            kitchen: true,
            liveOps: true,
            payments: true,
            sources: true,
        });

        try {
            // Fetch all data in parallel - original + new endpoints
            const [
                kpisData, comparisonData, categoriesData, hourlyData, dishesData,
                kitchenData, liveOpsData, paymentsData, sourcesData,
            ] = await Promise.all([
                    analyticsApi.getKPIs(dateRange.startDate, dateRange.endDate).catch(() => null),
                    analyticsApi.getSalesComparison().catch(() => null),
                    analyticsApi.getSalesByCategory(dateRange.startDate, dateRange.endDate).catch(() => null),
                    analyticsApi.getSalesByHour(dateRange.startDate, dateRange.endDate).catch(() => null),
                    analyticsApi.getTopDishes(dateRange.startDate, dateRange.endDate, 10).catch(() => null),
                    analyticsApi.getKitchenPerformance(dateRange.startDate, dateRange.endDate).catch(() => null),
                    analyticsApi.getOperationsPulse().catch(() => null),
                    analyticsApi.getPaymentAnalytics(dateRange.startDate, dateRange.endDate).catch(() => null),
                    analyticsApi.getOrderSources(dateRange.startDate, dateRange.endDate).catch(() => null),
                ]);

            setKpis(kpisData);
            setComparison(comparisonData);
            setCategories(categoriesData);
            setHourly(hourlyData);
            setDishes(dishesData);
            setKitchen(kitchenData);
            setLiveOps(liveOpsData);
            setPayments(paymentsData);
            setSources(sourcesData);

        } catch (err) {
            console.error("Error fetching analytics:", err);
            setError(err instanceof Error ? err.message : "Error al cargar datos de analíticas");
        } finally {
            setLoading({
                kpis: false,
                comparison: false,
                categories: false,
                hourly: false,
                dishes: false,
                kitchen: false,
                liveOps: false,
                payments: false,
                sources: false,
            });
        }
    };

    // Fetch data when date range changes
    useEffect(() => {
        fetchData();
    }, [dateRange]);

    // Format currency
    const formatCurrency = (value: number) => {
        if (value >= 1000000) {
            return `$${(value / 1000000).toFixed(1)}M`;
        }
        if (value >= 1000) {
            return `$${(value / 1000).toFixed(1)}K`;
        }
        return `$${value.toFixed(0)}`;
    };

    // Format hour
    const formatHour = (hour: number | null) => {
        if (hour === null) return "N/A";
        return `${hour.toString().padStart(2, "0")}:00`;
    };

    const hasData = kpis && (kpis.total_sales > 0 || kpis.total_orders > 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
            {/* Animated background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
            </div>

            <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard"
                            className="p-2 rounded-xl bg-white/5 border border-gray-800 hover:bg-white/10 hover:border-purple-500/50 transition-all"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-400" />
                        </Link>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white">
                                Dashboard de Inteligencia de Negocio
                            </h1>
                            <p className="text-gray-400 text-sm mt-1">
                                Análisis de ventas y rendimiento del restaurante
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchData}
                            className="p-2 rounded-xl bg-white/5 border border-gray-700 hover:bg-white/10 transition-all"
                            title="Actualizar datos"
                        >
                            <RefreshCw className="w-5 h-5 text-gray-400" />
                        </button>
                        <DateRangePicker value={dateRange} onChange={setDateRange} />
                    </div>
                </div>

                {/* Error message */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                        {error}
                    </div>
                )}

                {/* Empty State / No Data */}
                {!loading.kpis && !hasData && !error && (
                    <div className="mb-8 p-12 text-center rounded-3xl bg-white/5 border border-gray-800/50 border-dashed">
                        <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <BarChart3 className="w-10 h-10 text-gray-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Aún no hay datos suficientes</h2>
                        <p className="text-gray-400 max-w-md mx-auto mb-8">
                            Tus métricas aparecerán aquí en tiempo real una vez que comiences a procesar ventas en el sistema.
                        </p>
                        <Link
                            href="/pos"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-all"
                        >
                            <DollarSign className="w-5 h-5" />
                            Ir a Punto de Venta
                        </Link>
                    </div>
                )}

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <KPICard
                        title="Venta Total"
                        value={loading.kpis ? "..." : formatCurrency(kpis?.total_sales || 0)}
                        subtitle={`${kpis?.total_orders || 0} órdenes`}
                        icon={<DollarSign className="w-6 h-6" />}
                        color="emerald"
                        trend={comparison?.change_percentage && comparison.change_percentage > 0 ? "up" : comparison?.change_percentage && comparison.change_percentage < 0 ? "down" : "neutral"}
                        trendValue={comparison?.change_percentage ? `${comparison.change_percentage.toFixed(1)}%` : undefined}
                    />
                    <KPICard
                        title="Ticket Promedio"
                        value={loading.kpis ? "..." : formatCurrency(kpis?.average_ticket || 0)}
                        subtitle="Por orden"
                        icon={<ShoppingCart className="w-6 h-6" />}
                        color="purple"
                    />
                    <KPICard
                        title="Costo de Alimentos"
                        value={loading.kpis ? "..." : `${(kpis?.food_cost_percentage || 0).toFixed(1)}%`}
                        subtitle="Benchmark: 28-35%"
                        icon={<Utensils className="w-6 h-6" />}
                        color={
                            kpis?.food_cost_percentage && kpis.food_cost_percentage <= 35
                                ? "cyan"
                                : kpis?.food_cost_percentage && kpis.food_cost_percentage <= 40
                                    ? "amber"
                                    : "rose"
                        }
                        trend={
                            kpis?.food_cost_percentage && kpis.food_cost_percentage <= 35
                                ? "up"
                                : kpis?.food_cost_percentage && kpis.food_cost_percentage > 40
                                    ? "down"
                                    : "neutral"
                        }
                    />
                    <KPICard
                        title="Hora Pico"
                        value={loading.kpis ? "..." : formatHour(kpis?.busiest_hour ?? null)}
                        subtitle={kpis?.busiest_day ? `Día más activo: ${kpis.busiest_day}` : undefined}
                        icon={<Clock className="w-6 h-6" />}
                        color="amber"
                    />
                </div>

                {/* AI Predictions Section */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-purple-500/20">
                            <Sparkles className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">
                                Predicciones con IA
                            </h3>
                            <p className="text-xs text-gray-500">
                                Análisis predictivo powered by Prophet + Perplexity AI
                            </p>
                        </div>
                    </div>
                    <DashboardProvider>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <AiForecastWidget className="bg-white/5 border border-gray-800 backdrop-blur-xl" />
                            <AiProcurementWidget className="bg-white/5 border border-gray-800 backdrop-blur-xl" />
                        </div>
                    </DashboardProvider>
                </div>

                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Sales Trend Chart */}
                    <div className="rounded-2xl bg-white/5 border border-gray-800 backdrop-blur-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-purple-500/20">
                                <TrendingUp className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">
                                    Tendencia de Ventas
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Esta semana vs. Semana anterior
                                </p>
                            </div>
                        </div>
                        <SalesTrendChart data={comparison} loading={loading.comparison} />
                    </div>

                    {/* Category Pie Chart */}
                    <div className="rounded-2xl bg-white/5 border border-gray-800 backdrop-blur-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-cyan-500/20">
                                <PieChartIcon className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">
                                    Ventas por Categoría
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Distribución de ingresos
                                </p>
                            </div>
                        </div>
                        <CategoryPieChart data={categories} loading={loading.categories} />
                    </div>
                </div>

                {/* Hourly Heatmap */}
                <div className="rounded-2xl bg-white/5 border border-gray-800 backdrop-blur-xl p-6 mb-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-amber-500/20">
                            <BarChart3 className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">
                                Mapa de Calor por Hora
                            </h3>
                            <p className="text-xs text-gray-500">
                                Identifica las horas pico de tu restaurante
                            </p>
                        </div>
                    </div>
                    <HourlyHeatmap data={hourly} loading={loading.hourly} />
                </div>

                {/* ============================================ */}
                {/* Live Operations Pulse */}
                {/* ============================================ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {/* Table Occupancy */}
                    <div className="rounded-2xl bg-white/5 border border-gray-800 backdrop-blur-xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 rounded-lg bg-blue-500/20">
                                <Users className="w-4 h-4 text-blue-400" />
                            </div>
                            <span className="text-sm font-medium text-gray-400">Ocupación</span>
                        </div>
                        {loading.liveOps ? (
                            <div className="h-12 bg-white/5 rounded animate-pulse" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-white">
                                    {liveOps?.occupancy.percentage ?? 0}%
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {liveOps?.occupancy.occupied_tables ?? 0} / {liveOps?.occupancy.total_tables ?? 0} mesas
                                </div>
                                <div className="w-full bg-gray-800 rounded-full h-2 mt-2">
                                    <div
                                        className="bg-blue-500 h-2 rounded-full transition-all duration-700"
                                        style={{ width: `${liveOps?.occupancy.percentage ?? 0}%` }}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Active Orders */}
                    <div className="rounded-2xl bg-white/5 border border-gray-800 backdrop-blur-xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 rounded-lg bg-amber-500/20">
                                <Activity className="w-4 h-4 text-amber-400" />
                            </div>
                            <span className="text-sm font-medium text-gray-400">Órdenes Activas</span>
                        </div>
                        {loading.liveOps ? (
                            <div className="h-12 bg-white/5 rounded animate-pulse" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-white">
                                    {liveOps?.total_active_orders ?? 0}
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {liveOps?.active_orders && Object.entries(liveOps.active_orders).map(([status, count]) => (
                                        <span
                                            key={status}
                                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                                status === 'IN_PROGRESS' ? 'bg-amber-500/20 text-amber-400' :
                                                status === 'READY' ? 'bg-green-500/20 text-green-400' :
                                                status === 'OPEN' ? 'bg-blue-500/20 text-blue-400' :
                                                'bg-purple-500/20 text-purple-400'
                                            }`}
                                        >
                                            {status === 'IN_PROGRESS' ? 'En proceso' :
                                             status === 'READY' ? 'Listas' :
                                             status === 'OPEN' ? 'Abiertas' :
                                             status === 'PENDING_PAYMENT' ? 'Por cobrar' : status}: {count}
                                        </span>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Kitchen Queue */}
                    <div className="rounded-2xl bg-white/5 border border-gray-800 backdrop-blur-xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 rounded-lg bg-orange-500/20">
                                <ChefHat className="w-4 h-4 text-orange-400" />
                            </div>
                            <span className="text-sm font-medium text-gray-400">Cola de Cocina</span>
                        </div>
                        {loading.liveOps ? (
                            <div className="h-12 bg-white/5 rounded animate-pulse" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-white">
                                    {liveOps?.kitchen_queue ?? 0}
                                    <span className="text-sm font-normal text-gray-500 ml-1">items</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Tiempo promedio hoy: {liveOps?.avg_prep_minutes_today ?? 0} min
                                </div>
                            </>
                        )}
                    </div>

                    {/* Today's Sales Live */}
                    <div className="rounded-2xl bg-white/5 border border-gray-800 backdrop-blur-xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 rounded-lg bg-emerald-500/20">
                                <DollarSign className="w-4 h-4 text-emerald-400" />
                            </div>
                            <span className="text-sm font-medium text-gray-400">Ventas Hoy</span>
                            <span className="ml-auto flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                        </div>
                        {loading.liveOps ? (
                            <div className="h-12 bg-white/5 rounded animate-pulse" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-white">
                                    {formatCurrency(liveOps?.today.sales ?? 0)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {liveOps?.today.orders ?? 0} órdenes completadas
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* ============================================ */}
                {/* Kitchen Performance + Payment Analytics */}
                {/* ============================================ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Kitchen Performance */}
                    <div className="rounded-2xl bg-white/5 border border-gray-800 backdrop-blur-xl p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 rounded-lg bg-orange-500/20">
                                <Timer className="w-5 h-5 text-orange-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">
                                    Rendimiento de Cocina
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Métricas del KDS (Kitchen Display System)
                                </p>
                            </div>
                        </div>
                        {loading.kitchen ? (
                            <div className="space-y-3">
                                <div className="h-16 bg-white/5 rounded animate-pulse" />
                                <div className="h-16 bg-white/5 rounded animate-pulse" />
                            </div>
                        ) : kitchen ? (
                            <div className="space-y-4">
                                {/* Prep Time Metrics */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="text-center p-3 rounded-xl bg-white/5">
                                        <div className={`text-xl font-bold ${
                                            kitchen.avg_prep_minutes <= 15 ? 'text-emerald-400' :
                                            kitchen.avg_prep_minutes <= 25 ? 'text-amber-400' : 'text-rose-400'
                                        }`}>
                                            {kitchen.avg_prep_minutes}
                                            <span className="text-xs font-normal text-gray-500"> min</span>
                                        </div>
                                        <div className="text-[10px] text-gray-500 mt-1">Promedio</div>
                                    </div>
                                    <div className="text-center p-3 rounded-xl bg-white/5">
                                        <div className="text-xl font-bold text-cyan-400">
                                            {kitchen.median_prep_minutes}
                                            <span className="text-xs font-normal text-gray-500"> min</span>
                                        </div>
                                        <div className="text-[10px] text-gray-500 mt-1">Mediana</div>
                                    </div>
                                    <div className="text-center p-3 rounded-xl bg-white/5">
                                        <div className="text-xl font-bold text-purple-400">
                                            {kitchen.p95_prep_minutes}
                                            <span className="text-xs font-normal text-gray-500"> min</span>
                                        </div>
                                        <div className="text-[10px] text-gray-500 mt-1">P95</div>
                                    </div>
                                </div>

                                {/* Throughput */}
                                <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                                    <span className="text-sm text-gray-400">Rendimiento</span>
                                    <span className="text-sm font-semibold text-white">
                                        {kitchen.items_per_hour} items/hora
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                                    <span className="text-sm text-gray-400">Órdenes completadas</span>
                                    <span className="text-sm font-semibold text-white">
                                        {kitchen.orders_completed}
                                    </span>
                                </div>

                                {/* Station Breakdown */}
                                {Object.keys(kitchen.station_breakdown).length > 0 && (
                                    <div>
                                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                                            Por Estación
                                        </div>
                                        <div className="flex gap-2">
                                            {Object.entries(kitchen.station_breakdown).map(([station, data]) => (
                                                <div key={station} className="flex-1 p-2 rounded-lg bg-white/5 text-center">
                                                    <div className="text-xs text-gray-400 capitalize">{station || 'cocina'}</div>
                                                    <div className="text-sm font-semibold text-white">{data.total_quantity}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Bottleneck Alert */}
                                {kitchen.bottleneck.slow_orders > 0 && (
                                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-rose-400" />
                                            <span className="text-xs font-medium text-rose-400">
                                                {kitchen.bottleneck.slow_orders} órdenes lentas ({kitchen.bottleneck.percentage}%)
                                            </span>
                                        </div>
                                        <div className="text-xs text-rose-400/70 mt-1">
                                            Promedio: {kitchen.bottleneck.avg_slow_minutes} min (&gt;20 min)
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 py-8">Sin datos de cocina</div>
                        )}
                    </div>

                    {/* Payment Analytics */}
                    <div className="rounded-2xl bg-white/5 border border-gray-800 backdrop-blur-xl p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 rounded-lg bg-green-500/20">
                                <Wallet className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">
                                    Análisis de Pagos
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Métodos de pago, propinas y turnos de caja
                                </p>
                            </div>
                        </div>
                        {loading.payments ? (
                            <div className="space-y-3">
                                <div className="h-16 bg-white/5 rounded animate-pulse" />
                                <div className="h-16 bg-white/5 rounded animate-pulse" />
                            </div>
                        ) : payments ? (
                            <div className="space-y-4">
                                {/* Revenue + Tips */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-xl bg-white/5 text-center">
                                        <div className="text-xl font-bold text-emerald-400">
                                            {formatCurrency(payments.total_revenue)}
                                        </div>
                                        <div className="text-[10px] text-gray-500 mt-1">Ingresos Totales</div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-white/5 text-center">
                                        <div className="text-xl font-bold text-cyan-400">
                                            {formatCurrency(payments.total_tips)}
                                        </div>
                                        <div className="text-[10px] text-gray-500 mt-1">
                                            Propinas ({payments.tip_percentage}%)
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Methods */}
                                <div>
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                                        Métodos de Pago
                                    </div>
                                    <div className="space-y-2">
                                        {Object.entries(payments.payment_methods).map(([method, data]) => {
                                            const label = method === 'CASH' ? 'Efectivo' :
                                                method === 'CARD' ? 'Tarjeta' :
                                                method === 'TRANSFER' ? 'Transferencia' : method;
                                            const color = method === 'CASH' ? 'emerald' :
                                                method === 'CARD' ? 'blue' :
                                                method === 'TRANSFER' ? 'purple' : 'gray';

                                            return (
                                                <div key={method} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                                                    <div className={`w-2 h-2 rounded-full bg-${color}-400`} />
                                                    <span className="text-sm text-gray-300 flex-1">{label}</span>
                                                    <span className="text-sm font-medium text-white">
                                                        {formatCurrency(data.amount)}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {data.percentage}%
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Shift Summary */}
                                {payments.shifts.total_shifts > 0 && (
                                    <div className="p-3 rounded-xl bg-white/5">
                                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                                            Resumen de Turnos
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Turnos:</span>
                                                <span className="text-white font-medium">{payments.shifts.total_shifts}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Duración prom:</span>
                                                <span className="text-white font-medium">{payments.shifts.avg_shift_hours}h</span>
                                            </div>
                                            {payments.shifts.total_discrepancy !== 0 && (
                                                <div className="flex justify-between col-span-2">
                                                    <span className="text-gray-400">Diferencia total:</span>
                                                    <span className={`font-medium ${
                                                        payments.shifts.total_discrepancy === 0 ? 'text-green-400' : 'text-rose-400'
                                                    }`}>
                                                        {formatCurrency(payments.shifts.total_discrepancy)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 py-8">Sin datos de pagos</div>
                        )}
                    </div>
                </div>

                {/* ============================================ */}
                {/* Order Sources */}
                {/* ============================================ */}
                {sources && sources.sources.length > 0 && (
                    <div className="rounded-2xl bg-white/5 border border-gray-800 backdrop-blur-xl p-6 mb-8">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 rounded-lg bg-indigo-500/20">
                                <Layers className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">
                                    Canales de Venta
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Distribución de órdenes por canal (POS, Autoservicio, Delivery)
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {sources.sources.map((source) => {
                                const label = source.source === 'POS' ? 'Punto de Venta' :
                                    source.source === 'SELF_SERVICE' ? 'Autoservicio' :
                                    source.source === 'DELIVERY_APP' ? 'Delivery' :
                                    source.source === 'KIOSK' ? 'Kiosco' :
                                    source.source ?? 'Otro';
                                const color = source.source === 'POS' ? 'emerald' :
                                    source.source === 'SELF_SERVICE' ? 'blue' :
                                    source.source === 'DELIVERY_APP' ? 'purple' :
                                    source.source === 'KIOSK' ? 'amber' : 'gray';

                                return (
                                    <div key={source.source ?? 'other'} className="p-4 rounded-xl bg-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={`w-2 h-2 rounded-full bg-${color}-400`} />
                                            <span className="text-sm font-medium text-gray-300">{label}</span>
                                        </div>
                                        <div className="text-xl font-bold text-white">{formatCurrency(source.total_sales)}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {source.order_count} órdenes · Ticket prom: {formatCurrency(source.avg_ticket)}
                                        </div>
                                        <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2">
                                            <div
                                                className={`bg-${color}-500 h-1.5 rounded-full`}
                                                style={{ width: `${source.percentage}%` }}
                                            />
                                        </div>
                                        <div className="text-right text-[10px] text-gray-600 mt-0.5">
                                            {source.percentage}%
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Top Dishes Table */}
                <div className="rounded-2xl bg-white/5 border border-gray-800 backdrop-blur-xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-emerald-500/20">
                            <Utensils className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">
                                Top 10 Platillos Más Rentables
                            </h3>
                            <p className="text-xs text-gray-500">
                                Ordenados por utilidad (Precio - Costo de Insumos)
                            </p>
                        </div>
                    </div>
                    <TopDishesTable data={dishes} loading={loading.dishes} />
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-xs text-gray-600">
                    Datos actualizados hasta {new Date().toLocaleDateString("es-MX", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </div>
            </div>
        </div>
    );
}
