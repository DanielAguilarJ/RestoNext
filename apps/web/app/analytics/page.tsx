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
    AlertCircle
} from "lucide-react";
import {
    analyticsApi,
    KPIResponse,
    SalesComparisonResponse,
    SalesByCategoryResponse,
    SalesByHourResponse,
    TopDishesResponse,
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
    });

    // Data states
    const [kpis, setKpis] = useState<KPIResponse | null>(null);
    const [comparison, setComparison] = useState<SalesComparisonResponse | null>(null);
    const [categories, setCategories] = useState<SalesByCategoryResponse | null>(null);
    const [hourly, setHourly] = useState<SalesByHourResponse | null>(null);
    const [dishes, setDishes] = useState<TopDishesResponse | null>(null);

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
        });

        try {
            // Fetch all data in parallel
            const [kpisData, comparisonData, categoriesData, hourlyData, dishesData] =
                await Promise.all([
                    analyticsApi.getKPIs(dateRange.startDate, dateRange.endDate).catch(() => null),
                    analyticsApi.getSalesComparison().catch(() => null),
                    analyticsApi.getSalesByCategory(dateRange.startDate, dateRange.endDate).catch(() => null),
                    analyticsApi.getSalesByHour(dateRange.startDate, dateRange.endDate).catch(() => null),
                    analyticsApi.getTopDishes(dateRange.startDate, dateRange.endDate, 10).catch(() => null),
                ]);

            setKpis(kpisData);
            setComparison(comparisonData);
            setCategories(categoriesData);
            setHourly(hourlyData);
            setDishes(dishesData);

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
