"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Package, AlertTriangle, CheckCircle, Search,
    ArrowUpDown, Filter, Plus, History, MoreVertical, Settings, ChefHat
} from "lucide-react";
import { inventoryApi, Ingredient } from "../../lib/api";
import { CreateIngredientModal } from "../../components/ui/CreateIngredientModal";
import { AdjustStockModal } from "../../components/ui/AdjustStockModal";

export default function InventoryPage() {
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'low'>('all');
    const [search, setSearch] = useState('');

    // Modal states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isAdjustOpen, setIsAdjustOpen] = useState(false);
    const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);

    useEffect(() => {
        loadInventory();
        // Poll every 30 seconds for updates
        const interval = setInterval(loadInventory, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadInventory = async () => {
        try {
            const data = await inventoryApi.list();
            setIngredients(data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to load inventory:", error);
            setLoading(false);
        }
    };

    const handleAdjustStock = (ingredient: Ingredient) => {
        setSelectedIngredient(ingredient);
        setIsAdjustOpen(true);
    };

    const filteredIngredients = ingredients.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'all' || (filter === 'low' && item.stock_quantity <= item.min_stock_alert);
        return matchesSearch && matchesFilter;
    });

    const lowStockCount = ingredients.filter(i => i.stock_quantity <= i.min_stock_alert).length;

    return (
        <main className="min-h-screen bg-mesh relative overflow-hidden p-6 pb-24">
            <CreateIngredientModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={loadInventory}
            />

            <AdjustStockModal
                isOpen={isAdjustOpen}
                onClose={() => { setIsAdjustOpen(false); setSelectedIngredient(null); }}
                onSuccess={loadInventory}
                ingredient={selectedIngredient}
            />

            {/* Header */}
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                    <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-2 inline-block transition-colors">
                        ← Volver al inicio
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Package className="w-8 h-8 text-teal-600" />
                        Inventario
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Gestión inteligente de insumos y mermas
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="btn-primary flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-teal-500/20 transition-all hover:scale-105"
                    >
                        <Plus className="w-5 h-5" />
                        Nuevo Insumo
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="glass p-5 rounded-2xl flex items-center gap-5 hover:shadow-lg transition-shadow">
                    <div className="w-14 h-14 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600">
                        <Package className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Referencias</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{ingredients.length}</p>
                    </div>
                </div>

                <div
                    className={`glass p-5 rounded-2xl flex items-center gap-5 cursor-pointer transition-all hover:scale-[1.02] ${lowStockCount > 0 ? 'border-red-500/30 bg-red-50/50 dark:bg-red-900/10' : ''}`}
                    onClick={() => setFilter('low')}
                >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${lowStockCount > 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 animate-pulse' : 'bg-green-100 text-green-600 dark:bg-green-900/30'}`}>
                        {lowStockCount > 0 ? <AlertTriangle className="w-7 h-7" /> : <CheckCircle className="w-7 h-7" />}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Atención Requerida</p>
                        <p className={`text-3xl font-bold ${lowStockCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {lowStockCount} items
                        </p>
                    </div>
                </div>

                <div className="glass p-5 rounded-2xl flex items-center gap-5 hover:shadow-lg transition-shadow">
                    <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                        <ArrowUpDown className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Valor Inventario</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                            ${ingredients.reduce((acc, curr) => acc + (curr.stock_quantity * curr.cost_per_unit), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="relative z-10 flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all shadow-sm"
                    />
                </div>

                <div className="flex bg-white/60 dark:bg-gray-800/60 rounded-xl p-1.5 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'all'
                                ? 'bg-white dark:bg-gray-700 text-teal-600 shadow-md transform scale-105'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                            }`}
                    >
                        Todo
                    </button>
                    <button
                        onClick={() => setFilter('low')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${filter === 'low'
                                ? 'bg-white dark:bg-gray-700 text-red-600 shadow-md transform scale-105'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                            }`}
                    >
                        <AlertTriangle className="w-4 h-4" />
                        Faltantes
                    </button>
                </div>
            </div>

            {/* Inventory Grid */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {loading ? (
                    [...Array(8)].map((_, i) => (
                        <div key={i} className="glass p-5 rounded-2xl animate-pulse">
                            <div className="flex justify-between mb-4">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                            </div>
                            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-full mb-4"></div>
                            <div className="flex justify-between">
                                <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            </div>
                        </div>
                    ))
                ) : filteredIngredients.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center glass rounded-3xl border-dashed border-2 border-gray-300">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Package className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No se encontraron insumos</h3>
                        <p className="text-gray-500">
                            {filter === 'low' ? '¡Excelente! No tienes stock bajo.' : 'Agrega tu primer insumo para comenzar.'}
                        </p>
                        {filter !== 'low' && (
                            <button
                                onClick={() => setIsCreateOpen(true)}
                                className="mt-6 text-teal-600 font-medium hover:underline"
                            >
                                Crear Insumo
                            </button>
                        )}
                    </div>
                ) : (
                    filteredIngredients.map((item) => {
                        const isLowStock = item.stock_quantity <= item.min_stock_alert;
                        const percentage = item.min_stock_alert > 0
                            ? Math.min((item.stock_quantity / (item.min_stock_alert * 1.5)) * 100, 100)
                            : 100;

                        return (
                            <div
                                key={item.id}
                                className={`glass p-6 rounded-2xl group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden ${isLowStock ? 'border-red-200 dark:border-red-900/50' : ''}`}
                            >
                                {/* Background gradient hint for low stock */}
                                {isLowStock && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-transparent opacity-50 pointer-events-none" />
                                )}

                                <div className="relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight mb-1">{item.name}</h3>
                                            <p className="text-xs text-gray-500 font-mono tracking-wider">{item.sku || 'SIN SKU'}</p>
                                        </div>
                                        <button className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Main Stock Display */}
                                    <div className="flex items-baseline gap-1 mb-4">
                                        <span className={`text-4xl font-bold tracking-tight ${isLowStock ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                                            {item.stock_quantity.toLocaleString()}
                                        </span>
                                        <span className="text-sm font-medium text-gray-500 uppercase">{item.unit}</span>
                                    </div>

                                    {/* Progress Bar & Indicators */}
                                    <div className="mb-4">
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span className={isLowStock ? 'text-red-600 font-medium' : 'text-gray-500'}>
                                                {isLowStock ? '⚠️ Nivel Crítico' : 'Nivel Óptimo'}
                                            </span>
                                            <span className="text-gray-400">Min: {item.min_stock_alert}</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${isLowStock ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-teal-400 to-teal-600'
                                                    }`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Cross Reasoning Info */}
                                    <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                                        <ChefHat className="w-4 h-4 text-gray-400" />
                                        <span className="text-xs text-gray-600 dark:text-gray-300">
                                            Usado en <strong className="text-gray-900 dark:text-white">{item.usage_count || 0}</strong> platillos
                                        </span>
                                    </div>

                                    {/* Actions Footer */}
                                    <div className="flex items-center gap-2 mt-2 pt-4 border-t border-gray-100 dark:border-gray-700/50">
                                        <button
                                            onClick={() => handleAdjustStock(item)}
                                            className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
                                        >
                                            Ajustar Stock
                                        </button>
                                        <button className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors" title="Ver Historial">
                                            <History className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </main>
    );
}
