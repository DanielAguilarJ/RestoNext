"use client";

/**
 * Hourly Heatmap Component
 * Grid visualization of sales by hour and day of week
 */

import { SalesByHourResponse } from "@/lib/api";

interface HourlyHeatmapProps {
    data: SalesByHourResponse | null;
    loading?: boolean;
}

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function HourlyHeatmap({ data, loading }: HourlyHeatmapProps) {
    if (loading) {
        return (
            <div className="w-full h-64 flex items-center justify-center">
                <div className="animate-pulse text-gray-400">Cargando datos...</div>
            </div>
        );
    }

    if (!data || !Array.isArray(data.data) || data.data.length === 0) {
        return (
            <div className="w-full h-64 flex items-center justify-center text-gray-500">
                No hay datos disponibles para mostrar
            </div>
        );
    }

    // Create a grid map for quick lookup
    const salesMap = new Map<string, { sales: number; count: number }>();
    (data.data || []).forEach((item) => {
        if (!item) return;
        const key = `${item.day_of_week}-${item.hour}`;
        salesMap.set(key, { sales: item.total_sales, count: item.order_count });
    });

    // Calculate color intensity based on sales
    const getColorIntensity = (sales: number): string => {
        if (sales === 0 || data.max_sales === 0) return "bg-gray-800";

        const ratio = sales / data.max_sales;

        if (ratio > 0.8) return "bg-purple-500";
        if (ratio > 0.6) return "bg-purple-600/80";
        if (ratio > 0.4) return "bg-purple-700/60";
        if (ratio > 0.2) return "bg-purple-800/40";
        return "bg-purple-900/30";
    };

    return (
        <div className="w-full overflow-x-auto">
            {/* Legend */}
            <div className="flex items-center justify-end gap-2 mb-4">
                <span className="text-xs text-gray-500">Menos</span>
                <div className="flex gap-1">
                    <div className="w-4 h-4 rounded bg-gray-800" />
                    <div className="w-4 h-4 rounded bg-purple-900/30" />
                    <div className="w-4 h-4 rounded bg-purple-800/40" />
                    <div className="w-4 h-4 rounded bg-purple-700/60" />
                    <div className="w-4 h-4 rounded bg-purple-600/80" />
                    <div className="w-4 h-4 rounded bg-purple-500" />
                </div>
                <span className="text-xs text-gray-500">Más</span>
            </div>

            {/* Grid */}
            <div className="min-w-[600px]">
                {/* Hour labels */}
                <div className="flex mb-1">
                    <div className="w-12 flex-shrink-0" />
                    {HOURS.filter((h) => h % 3 === 0).map((hour) => (
                        <div
                            key={hour}
                            className="text-xs text-gray-500 text-center"
                            style={{ width: `${100 / 8}%` }}
                        >
                            {hour.toString().padStart(2, "0")}:00
                        </div>
                    ))}
                </div>

                {/* Day rows */}
                {DAYS.map((day, dayIndex) => (
                    <div key={dayIndex} className="flex items-center gap-1 mb-1">
                        {/* Day label */}
                        <div className="w-12 flex-shrink-0 text-xs text-gray-400 text-right pr-2">
                            {day}
                        </div>

                        {/* Hour cells */}
                        <div className="flex-1 flex gap-px">
                            {HOURS.map((hour) => {
                                const key = `${dayIndex}-${hour}`;
                                const cell = salesMap.get(key);
                                const sales = cell?.sales || 0;
                                const count = cell?.count || 0;

                                return (
                                    <div
                                        key={hour}
                                        className={`
                                            flex-1 h-6 rounded-sm cursor-pointer
                                            ${getColorIntensity(sales)}
                                            hover:ring-2 hover:ring-white/30
                                            transition-all duration-150
                                            group relative
                                        `}
                                        title={`${day} ${hour}:00 - Ventas: $${sales.toLocaleString("es-MX")} (${count} órdenes)`}
                                    >
                                        {/* Tooltip on hover */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                                            <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl whitespace-nowrap">
                                                <p className="text-white font-medium">{day} {hour}:00</p>
                                                <p className="text-emerald-400">${sales.toLocaleString("es-MX")}</p>
                                                <p className="text-gray-400">{count} órdenes</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
