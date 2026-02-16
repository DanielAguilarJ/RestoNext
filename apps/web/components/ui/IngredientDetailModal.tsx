"use client";

import { useEffect, useState } from "react";
import {
    X, Package, TrendingUp, ChefHat, Loader2,
    AlertTriangle, ArrowUpRight, ArrowDownRight, Minus,
    BarChart3, Link2, Brain
} from "lucide-react";
import {
    inventoryApi, Ingredient,
    LinkedProductsResponse, LinkedProductItem,
    ForecastResponse, ForecastPrediction
} from "../../lib/api";

type Tab = "info" | "products" | "forecast";

interface IngredientDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    ingredient: Ingredient | null;
}

export function IngredientDetailModal({ isOpen, onClose, ingredient }: IngredientDetailModalProps) {
    const [activeTab, setActiveTab] = useState<Tab>("info");
    const [linkedProducts, setLinkedProducts] = useState<LinkedProductsResponse | null>(null);
    const [forecast, setForecast] = useState<ForecastResponse | null>(null);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [loadingForecast, setLoadingForecast] = useState(false);
    const [errorProducts, setErrorProducts] = useState<string | null>(null);
    const [errorForecast, setErrorForecast] = useState<string | null>(null);

    // Reset when modal opens/closes or ingredient changes
    useEffect(() => {
        if (isOpen && ingredient) {
            setActiveTab("info");
            setLinkedProducts(null);
            setForecast(null);
            setErrorProducts(null);
            setErrorForecast(null);
        }
    }, [isOpen, ingredient?.id]);

    // Load data when tab changes
    useEffect(() => {
        if (!ingredient || !isOpen) return;

        if (activeTab === "products" && !linkedProducts && !loadingProducts) {
            loadLinkedProducts();
        }
        if (activeTab === "forecast" && !forecast && !loadingForecast) {
            loadForecast();
        }
    }, [activeTab, ingredient, isOpen]);

    const loadLinkedProducts = async () => {
        if (!ingredient) return;
        setLoadingProducts(true);
        setErrorProducts(null);
        try {
            const data = await inventoryApi.getLinkedProducts(ingredient.id);
            setLinkedProducts(data);
        } catch (err: any) {
            setErrorProducts(err.message || "Error al cargar productos vinculados");
        } finally {
            setLoadingProducts(false);
        }
    };

    const loadForecast = async () => {
        if (!ingredient) return;
        setLoadingForecast(true);
        setErrorForecast(null);
        try {
            const data = await inventoryApi.getForecast(ingredient.id, 7);
            setForecast(data);
        } catch (err: any) {
            setErrorForecast(err.message || "Error al cargar predicciones");
        } finally {
            setLoadingForecast(false);
        }
    };

    if (!isOpen || !ingredient) return null;

    const isLowStock = ingredient.stock_quantity <= ingredient.min_stock_alert;
    const percentage = ingredient.min_stock_alert > 0
        ? Math.min((ingredient.stock_quantity / (ingredient.min_stock_alert * 1.5)) * 100, 100)
        : 100;

    const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
        { key: "info", label: "Información", icon: <Package className="w-4 h-4" /> },
        { key: "products", label: "Platillos", icon: <ChefHat className="w-4 h-4" /> },
        { key: "forecast", label: "Predicción IA", icon: <Brain className="w-4 h-4" /> },
    ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in border border-gray-200 dark:border-gray-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative px-6 pt-6 pb-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg ${isLowStock
                                    ? 'bg-gradient-to-br from-red-400 to-red-600'
                                    : 'bg-gradient-to-br from-teal-400 to-teal-600'
                                }`}>
                                📦
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {ingredient.name}
                                </h2>
                                <p className="text-sm text-gray-500 font-mono">
                                    {ingredient.sku || "SIN SKU"}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Status Badge */}
                    <div className="mt-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold gap-1.5 ${isLowStock
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            }`}>
                            {isLowStock ? <AlertTriangle className="w-3 h-3" /> : null}
                            {isLowStock ? 'Stock Bajo' : 'Stock Óptimo'}
                        </span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-6">
                    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab.key
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                {tab.icon}
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {activeTab === "info" && <InfoTab ingredient={ingredient} isLowStock={isLowStock} percentage={percentage} />}
                    {activeTab === "products" && (
                        <ProductsTab
                            loading={loadingProducts}
                            error={errorProducts}
                            data={linkedProducts}
                        />
                    )}
                    {activeTab === "forecast" && (
                        <ForecastTab
                            loading={loadingForecast}
                            error={errorForecast}
                            data={forecast}
                            ingredient={ingredient}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

/* ================================
   Info Tab
   ================================ */
function InfoTab({ ingredient, isLowStock, percentage }: {
    ingredient: Ingredient;
    isLowStock: boolean;
    percentage: number;
}) {
    const totalValue = ingredient.stock_quantity * ingredient.cost_per_unit;

    return (
        <div className="space-y-5">
            {/* Stock Level */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5">
                <div className="flex items-baseline gap-2 mb-3">
                    <span className={`text-5xl font-bold tracking-tight ${isLowStock ? 'text-red-600' : 'text-gray-900 dark:text-white'
                        }`}>
                        {ingredient.stock_quantity.toLocaleString()}
                    </span>
                    <span className="text-lg font-medium text-gray-500 uppercase">
                        {ingredient.unit}
                    </span>
                </div>
                <div className="mb-2">
                    <div className="flex justify-between text-xs mb-1.5">
                        <span className={isLowStock ? 'text-red-600 font-medium' : 'text-gray-500'}>
                            {isLowStock ? '⚠️ Nivel Crítico' : 'Nivel Óptimo'}
                        </span>
                        <span className="text-gray-400">
                            Mín: {ingredient.min_stock_alert} {ingredient.unit}
                        </span>
                    </div>
                    <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${isLowStock
                                    ? 'bg-gradient-to-r from-red-400 to-red-600'
                                    : 'bg-gradient-to-r from-teal-400 to-teal-600'
                                }`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Costo Unitario</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                        ${ingredient.cost_per_unit.toFixed(2)}
                    </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Valor Total en Stock</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                        ${totalValue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Platillos Vinculados</p>
                    <div className="flex items-center gap-2">
                        <ChefHat className="w-5 h-5 text-teal-500" />
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                            {ingredient.usage_count || 0}
                        </p>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Estado</p>
                    <p className={`text-xl font-bold ${ingredient.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                        {ingredient.is_active ? 'Activo' : 'Inactivo'}
                    </p>
                </div>
            </div>
        </div>
    );
}

/* ================================
   Products Tab
   ================================ */
function ProductsTab({ loading, error, data }: {
    loading: boolean;
    error: string | null;
    data: LinkedProductsResponse | null;
}) {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin mb-3" />
                <p className="text-gray-500 text-sm">Cargando platillos vinculados...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle className="w-8 h-8 text-red-400 mb-3" />
                <p className="text-red-600 font-medium">{error}</p>
                <p className="text-gray-500 text-sm mt-1">Intenta de nuevo más tarde</p>
            </div>
        );
    }

    if (!data || data.linked_products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Link2 className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Sin Platillos Vinculados
                </h4>
                <p className="text-sm text-gray-500 max-w-sm">
                    Este insumo aún no está vinculado a ningún platillo del menú. Asígnalo como ingrediente en la receta de un platillo.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    Platillos que usan este insumo
                </h4>
                <span className="bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {data.total_products}
                </span>
            </div>

            {data.linked_products.map((product) => (
                <div
                    key={product.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center text-white shadow-sm">
                            🍽️
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{product.name}</p>
                            {product.category_name && (
                                <p className="text-xs text-gray-500">{product.category_name}</p>
                            )}
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-gray-900 dark:text-white">
                            {product.recipe_quantity}
                        </p>
                        <p className="text-xs text-gray-500">{product.recipe_unit}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ================================
   Forecast Tab
   ================================ */
function ForecastTab({ loading, error, data, ingredient }: {
    loading: boolean;
    error: string | null;
    data: ForecastResponse | null;
    ingredient: Ingredient;
}) {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <div className="relative mb-4">
                    <Brain className="w-10 h-10 text-purple-500 animate-pulse" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-400 rounded-full animate-ping" />
                </div>
                <p className="text-gray-500 text-sm font-medium">Analizando datos con IA...</p>
                <p className="text-gray-400 text-xs mt-1">Facebook Prophet + Datos Históricos</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle className="w-8 h-8 text-red-400 mb-3" />
                <p className="text-red-600 font-medium">{error}</p>
                <p className="text-gray-500 text-sm mt-1">
                    El servicio de IA podría no estar disponible
                </p>
            </div>
        );
    }

    if (!data || !data.predictions || data.predictions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="w-8 h-8 text-gray-400 mb-3" />
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Sin datos suficientes
                </h4>
                <p className="text-sm text-gray-500 max-w-sm">
                    Se necesitan al menos 14 días de historial de transacciones para generar predicciones precisas.
                </p>
            </div>
        );
    }

    const predictions = data.predictions;
    const totalDemand = predictions.reduce((sum, p) => sum + p.predicted_demand, 0);
    const maxDemand = Math.max(...predictions.map(p => p.predicted_demand));
    const avgDemand = totalDemand / predictions.length;

    // Calculate if current stock covers the forecasted demand
    const daysOfStock = totalDemand > 0
        ? Math.floor(ingredient.stock_quantity / (totalDemand / predictions.length))
        : 999;
    const stockCoversForecast = ingredient.stock_quantity >= totalDemand;

    return (
        <div className="space-y-5">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center">
                    <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">Demanda Total</p>
                    <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                        {totalDemand.toFixed(1)}
                    </p>
                    <p className="text-xs text-purple-500">{ingredient.unit}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Promedio/Día</p>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                        {avgDemand.toFixed(1)}
                    </p>
                    <p className="text-xs text-blue-500">{ingredient.unit}</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${stockCoversForecast
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : 'bg-red-50 dark:bg-red-900/20'
                    }`}>
                    <p className={`text-xs mb-1 ${stockCoversForecast
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>Cobertura</p>
                    <p className={`text-xl font-bold ${stockCoversForecast
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-red-700 dark:text-red-300'
                        }`}>
                        {daysOfStock > 30 ? '30+' : daysOfStock}
                    </p>
                    <p className={`text-xs ${stockCoversForecast
                            ? 'text-green-500'
                            : 'text-red-500'
                        }`}>días</p>
                </div>
            </div>

            {/* Alert if stock doesn't cover */}
            {!stockCoversForecast && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-red-700 dark:text-red-300 text-sm">
                            Stock insuficiente para los próximos 7 días
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            Necesitas aproximadamente <strong>{(totalDemand - ingredient.stock_quantity).toFixed(1)} {ingredient.unit}</strong> adicionales para cubrir la demanda estimada.
                        </p>
                    </div>
                </div>
            )}

            {/* Daily Forecast Chart */}
            <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Predicción por Día
                </h4>
                <div className="space-y-2">
                    {predictions.map((pred, i) => {
                        const barWidth = maxDemand > 0 ? (pred.predicted_demand / maxDemand) * 100 : 0;
                        const date = new Date(pred.date);
                        const dayName = date.toLocaleDateString('es-MX', { weekday: 'short' });
                        const dayDate = date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                        return (
                            <div key={i} className="flex items-center gap-3 group">
                                <div className="w-20 text-right flex-shrink-0">
                                    <p className={`text-xs font-semibold ${isWeekend ? 'text-purple-600 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300'
                                        }`}>
                                        {dayName}
                                    </p>
                                    <p className="text-[10px] text-gray-400">{dayDate}</p>
                                </div>
                                <div className="flex-1 h-7 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden relative">
                                    <div
                                        className={`h-full rounded-lg transition-all duration-700 ease-out ${isWeekend
                                                ? 'bg-gradient-to-r from-purple-400 to-purple-600'
                                                : 'bg-gradient-to-r from-teal-400 to-teal-600'
                                            }`}
                                        style={{
                                            width: `${barWidth}%`,
                                            transitionDelay: `${i * 80}ms`,
                                        }}
                                    />
                                    {/* Confidence range overlay */}
                                    <div className="absolute inset-y-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center px-2">
                                        <span className="text-[10px] text-white font-medium drop-shadow-sm">
                                            {pred.lower_bound.toFixed(1)} – {pred.upper_bound.toFixed(1)}
                                        </span>
                                    </div>
                                </div>
                                <div className="w-16 text-right flex-shrink-0">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                        {pred.predicted_demand.toFixed(1)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Model Info */}
            <div className="flex items-center gap-2 text-xs text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                <Brain className="w-3 h-3" />
                <span>Modelo: Facebook Prophet • Ajuste México • {data.model_metrics?.data_points || '—'} registros</span>
            </div>
        </div>
    );
}
