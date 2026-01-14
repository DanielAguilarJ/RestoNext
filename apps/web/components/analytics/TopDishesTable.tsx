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
        <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-800">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                            #
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                            Platillo
                        </th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium hidden md:table-cell">
                            Categoría
                        </th>
                        <th
                            className="text-right py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-white"
                            onClick={() => handleSort("sales_count")}
                        >
                            <div className="flex items-center justify-end gap-1">
                                Vendidos
                                <SortIcon column="sales_count" />
                            </div>
                        </th>
                        <th
                            className="text-right py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-white"
                            onClick={() => handleSort("revenue")}
                        >
                            <div className="flex items-center justify-end gap-1">
                                Ingresos
                                <SortIcon column="revenue" />
                            </div>
                        </th>
                        <th
                            className="text-right py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-white hidden lg:table-cell"
                            onClick={() => handleSort("profit")}
                        >
                            <div className="flex items-center justify-end gap-1">
                                Utilidad
                                <SortIcon column="profit" />
                            </div>
                        </th>
                        <th
                            className="text-right py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-white"
                            onClick={() => handleSort("profit_margin")}
                        >
                            <div className="flex items-center justify-end gap-1">
                                Margen
                                <SortIcon column="profit_margin" />
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {sortedDishes.map((dish, index) => (
                        <tr
                            key={dish.id}
                            className="border-b border-gray-800/50 hover:bg-white/5 transition-colors"
                        >
                            <td className="py-3 px-4 text-gray-500 font-medium">
                                {index + 1}
                            </td>
                            <td className="py-3 px-4">
                                <span className="text-white font-medium">{dish.name}</span>
                            </td>
                            <td className="py-3 px-4 text-gray-400 hidden md:table-cell">
                                {dish.category_name}
                            </td>
                            <td className="py-3 px-4 text-right text-gray-300">
                                {dish.sales_count.toLocaleString("es-MX")}
                            </td>
                            <td className="py-3 px-4 text-right text-emerald-400 font-medium">
                                ${dish.revenue.toLocaleString("es-MX")}
                            </td>
                            <td className="py-3 px-4 text-right text-cyan-400 hidden lg:table-cell">
                                ${dish.profit.toLocaleString("es-MX")}
                            </td>
                            <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                    {dish.profit_margin >= 50 ? (
                                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                                    ) : dish.profit_margin < 25 ? (
                                        <TrendingDown className="w-4 h-4 text-rose-400" />
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
    );
}
