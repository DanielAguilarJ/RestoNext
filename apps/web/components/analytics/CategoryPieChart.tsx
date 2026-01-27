"use client";

/**
 * Category Pie Chart Component
 * Pie chart showing sales distribution by menu category
 */

import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { SalesByCategoryResponse } from "@/lib/api";

interface CategoryPieChartProps {
    data: SalesByCategoryResponse | null;
    loading?: boolean;
}

export function CategoryPieChart({ data, loading }: CategoryPieChartProps) {
    if (loading) {
        return (
            <div className="w-full h-80 flex items-center justify-center">
                <div className="animate-pulse text-gray-400">Cargando datos...</div>
            </div>
        );
    }

    if (!data || !Array.isArray(data.categories) || data.categories.length === 0) {
        return (
            <div className="w-full h-80 flex items-center justify-center text-gray-500">
                No hay datos disponibles para mostrar
            </div>
        );
    }

    // Transform data for chart
    const chartData = (data.categories || []).map((category) => ({
        name: category?.category_name || 'Desconocido',
        value: category?.total_sales || 0,
        percentage: category?.percentage || 0,
        color: category?.color || '#999',
    }));

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-gray-900/95 border border-gray-700 rounded-lg p-3 shadow-xl">
                    <p className="text-white font-medium mb-1">{data.name}</p>
                    <p className="text-gray-300 text-sm">
                        Ventas: <span className="font-bold text-emerald-400">
                            ${data.value.toLocaleString("es-MX")}
                        </span>
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                        {data.percentage.toFixed(1)}% del total
                    </p>
                </div>
            );
        }
        return null;
    };

    // Custom legend
    const CustomLegend = ({ payload }: any) => {
        return (
            <div className="flex flex-wrap justify-center gap-3 mt-4">
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-xs text-gray-400">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={800}
                    >
                        {chartData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.color}
                                stroke="rgba(0,0,0,0.2)"
                                strokeWidth={2}
                            />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend content={<CustomLegend />} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
