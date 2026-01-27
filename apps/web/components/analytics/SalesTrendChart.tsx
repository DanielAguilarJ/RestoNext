"use client";

/**
 * Sales Trend Chart Component
 * Line chart comparing current vs previous week sales
 */

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { SalesComparisonResponse } from "@/lib/api";

interface SalesTrendChartProps {
    data: SalesComparisonResponse | null;
    loading?: boolean;
}

export function SalesTrendChart({ data, loading }: SalesTrendChartProps) {
    if (loading) {
        return (
            <div className="w-full h-80 flex items-center justify-center">
                <div className="animate-pulse text-gray-400">Cargando datos...</div>
            </div>
        );
    }

    if (!data || !Array.isArray(data.current_week) || data.current_week.length === 0) {
        return (
            <div className="w-full h-80 flex items-center justify-center text-gray-500">
                No hay datos disponibles para mostrar
            </div>
        );
    }

    // Merge current and previous week data for chart
    const chartData = (data.current_week || []).map((current, index) => {
        const prevWeek = Array.isArray(data.previous_week) ? data.previous_week : [];
        return {
            day: current?.day_name || '',
            current: current?.total_sales || 0,
            previous: prevWeek[index]?.total_sales || 0,
        };
    });

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-900/95 border border-gray-700 rounded-lg p-3 shadow-xl">
                    <p className="text-gray-300 font-medium mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name === "current" ? "Esta semana" : "Semana anterior"}:{" "}
                            <span className="font-bold">
                                ${entry.value.toLocaleString("es-MX")}
                            </span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis
                        dataKey="day"
                        stroke="#9CA3AF"
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: "#4B5563" }}
                    />
                    <YAxis
                        stroke="#9CA3AF"
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: "#4B5563" }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        formatter={(value) =>
                            value === "current" ? "Esta semana" : "Semana anterior"
                        }
                        wrapperStyle={{ color: "#9CA3AF" }}
                    />
                    <Line
                        type="monotone"
                        dataKey="current"
                        stroke="#8B5CF6"
                        strokeWidth={3}
                        dot={{ fill: "#8B5CF6", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="previous"
                        stroke="#06B6D4"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: "#06B6D4", strokeWidth: 2, r: 3 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
