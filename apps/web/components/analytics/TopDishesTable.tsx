"use client";

/**
 * Top Dishes Table Component
 * Sortable table showing most profitable dishes
 */

import { useState } from "react";
import { TopDishesResponse, TopDishData } from "@/lib/api";
import { ChevronUp, ChevronDown, TrendingUp, TrendingDown } from "lucide-react";

interface TopDishesTableProps {
    data: TopDishesResponse | null;
    loading?: boolean;
}

type SortKey = "revenue" | "profit" | "profit_margin" | "sales_count";
type SortOrder = "asc" | "desc";

export function TopDishesTable({ data, loading }: TopDishesTableProps) {
    const [sortKey, setSortKey] = useState<SortKey>("profit");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

    if (loading) {
        return (
            <div className="w-full h-64 flex items-center justify-center">
                <div className="animate-pulse text-gray-400">Cargando datos...</div>
            </div>
        );
    }

    if (!data || data.dishes.length === 0) {
        return (
            <div className="w-full h-64 flex items-center justify-center text-gray-500">
                No hay datos disponibles para mostrar
            </div>
        );
    }

    // Sort dishes
    const sortedDishes = [...data.dishes].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        const modifier = sortOrder === "asc" ? 1 : -1;
        return (aVal - bVal) * modifier;
    });

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortOrder("desc");
        }
    };

    const SortIcon = ({ column }: { column: SortKey }) => {
        if (sortKey !== column) {
            return <ChevronUp className="w-4 h-4 text-gray-600" />;
        }
        return sortOrder === "desc" ? (
            <ChevronDown className="w-4 h-4 text-purple-400" />
        ) : (
            <ChevronUp className="w-4 h-4 text-purple-400" />
        );
    };

    const getMarginColor = (margin: number) => {
        if (margin >= 60) return "text-emerald-400";
        if (margin >= 40) return "text-cyan-400";
        if (margin >= 25) return "text-amber-400";
        return "text-rose-400";
    };

    return (
        <div className="w-full overflow-hidden rounded-2xl glass border border-white/10 shadow-2xl">
            <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-black/80 backdrop-blur-md">
                        <tr className="border-b border-white/10">
                            <th className="text-left py-4 px-6 text-gray-400 font-medium">#</th>
                            <th className="text-left py-4 px-6 text-gray-400 font-medium">Platillo</th>
                            <th className="text-left py-4 px-6 text-gray-400 font-medium hidden md:table-cell">Categoría</th>
                            <th
                                className="text-right py-4 px-6 text-gray-400 font-medium cursor-pointer hover:text-white transition-colors"
                                onClick={() => handleSort("sales_count")}
                            >
                                <div className="flex items-center justify-end gap-2 group">
                                    Vendidos
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity"><SortIcon column="sales_count" /></span>
                                </div>
                            </th>
                            <th
                                className="text-right py-4 px-6 text-gray-400 font-medium cursor-pointer hover:text-white transition-colors"
                                onClick={() => handleSort("revenue")}
                            >
                                <div className="flex items-center justify-end gap-2 group">
                                    Ingresos
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity"><SortIcon column="revenue" /></span>
                                </div>
                            </th>
                            <th
                                className="text-right py-4 px-6 text-gray-400 font-medium cursor-pointer hover:text-white hidden lg:table-cell transition-colors"
                                onClick={() => handleSort("profit")}
                            >
                                <div className="flex items-center justify-end gap-2 group">
                                    Utilidad
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity"><SortIcon column="profit" /></span>
                                </div>
                            </th>
                            <th
                                className="text-right py-4 px-6 text-gray-400 font-medium cursor-pointer hover:text-white transition-colors"
                                onClick={() => handleSort("profit_margin")}
                            >
                                <div className="flex items-center justify-end gap-2 group">
                                    Margen
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity"><SortIcon column="profit_margin" /></span>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {sortedDishes.map((dish, index) => (
                            <tr
                                key={dish.id}
                                className="hover:bg-white/5 transition-colors group"
                            >
                                <td className="py-4 px-6 text-gray-500 font-medium group-hover:text-white transition-colors">
                                    {index + 1}
                                </td>
                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-lg">🍽️</div>
                                        <span className="text-white font-medium group-hover:text-brand-400 transition-colors">{dish.name}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-6 text-gray-400 hidden md:table-cell">
                                    <span className="px-2 py-1 rounded-md bg-white/5 text-xs border border-white/10">
                                        {dish.category_name}
                                    </span>
                                </td>
                                <td className="py-4 px-6 text-right text-gray-300">
                                    {dish.sales_count.toLocaleString("es-MX")}
                                </td>
                                <td className="py-4 px-6 text-right font-medium text-emerald-400">
                                    ${dish.revenue.toLocaleString("es-MX")}
                                </td>
                                <td className="py-4 px-6 text-right text-cyan-400 hidden lg:table-cell">
                                    ${dish.profit.toLocaleString("es-MX")}
                                </td>
                                <td className="py-4 px-6 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {dish.profit_margin >= 50 ? (
                                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                                        ) : dish.profit_margin < 25 ? (
                                            <TrendingDown className="w-4 h-4 text-rose-500" />
                                        ) : null}
                                        <span className={`font-bold ${getMarginColor(dish.profit_margin)}`}>
                                            {dish.profit_margin.toFixed(1)}%
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
