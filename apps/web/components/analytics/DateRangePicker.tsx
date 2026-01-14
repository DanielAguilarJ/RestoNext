"use client";

/**
 * Date Range Picker Component
 * Preset ranges and custom date selection for analytics filters
 */

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";

interface DateRange {
    startDate: Date;
    endDate: Date;
    label: string;
}

interface DateRangePickerProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
}

const PRESET_RANGES: { label: string; getRange: () => { startDate: Date; endDate: Date } }[] = [
    {
        label: "Hoy",
        getRange: () => {
            const today = new Date();
            return { startDate: today, endDate: today };
        },
    },
    {
        label: "Últimos 7 días",
        getRange: () => ({
            startDate: subDays(new Date(), 6),
            endDate: new Date(),
        }),
    },
    {
        label: "Últimos 30 días",
        getRange: () => ({
            startDate: subDays(new Date(), 29),
            endDate: new Date(),
        }),
    },
    {
        label: "Esta semana",
        getRange: () => ({
            startDate: startOfWeek(new Date(), { weekStartsOn: 1 }),
            endDate: endOfWeek(new Date(), { weekStartsOn: 1 }),
        }),
    },
    {
        label: "Este mes",
        getRange: () => ({
            startDate: startOfMonth(new Date()),
            endDate: endOfMonth(new Date()),
        }),
    },
    {
        label: "Mes anterior",
        getRange: () => ({
            startDate: startOfMonth(subMonths(new Date(), 1)),
            endDate: endOfMonth(subMonths(new Date(), 1)),
        }),
    },
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handlePresetSelect = (preset: typeof PRESET_RANGES[0]) => {
        const range = preset.getRange();
        onChange({
            ...range,
            label: preset.label,
        });
        setIsOpen(false);
    };

    const handleCustomDateApply = () => {
        if (customStartDate && customEndDate) {
            onChange({
                startDate: new Date(customStartDate),
                endDate: new Date(customEndDate),
                label: "Personalizado",
            });
            setIsOpen(false);
        }
    };

    const formatDateRange = () => {
        if (value.label !== "Personalizado") {
            return value.label;
        }
        return `${format(value.startDate, "dd MMM", { locale: es })} - ${format(value.endDate, "dd MMM yyyy", { locale: es })}`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl
                    bg-white/5 border border-gray-700
                    hover:bg-white/10 hover:border-purple-500/50
                    transition-all duration-200
                    ${isOpen ? "border-purple-500 ring-2 ring-purple-500/20" : ""}
                `}
            >
                <Calendar className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-white font-medium">{formatDateRange()}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-gray-900/95 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                    {/* Preset ranges */}
                    <div className="p-2 border-b border-gray-800">
                        <p className="text-xs text-gray-500 uppercase tracking-wider px-2 mb-2">
                            Rangos predefinidos
                        </p>
                        <div className="grid grid-cols-2 gap-1">
                            {PRESET_RANGES.map((preset) => (
                                <button
                                    key={preset.label}
                                    onClick={() => handlePresetSelect(preset)}
                                    className={`
                                        px-3 py-2 text-sm rounded-lg text-left
                                        hover:bg-purple-500/20 transition-colors
                                        ${value.label === preset.label
                                            ? "bg-purple-500/30 text-purple-300"
                                            : "text-gray-300"
                                        }
                                    `}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom date range */}
                    <div className="p-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                            Rango personalizado
                        </p>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Desde</label>
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Hasta</label>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                                />
                            </div>
                            <button
                                onClick={handleCustomDateApply}
                                disabled={!customStartDate || !customEndDate}
                                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm font-medium text-white transition-colors"
                            >
                                Aplicar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Default export for convenience
export function getDefaultDateRange(): DateRange {
    return {
        startDate: subDays(new Date(), 29),
        endDate: new Date(),
        label: "Últimos 30 días",
    };
}
