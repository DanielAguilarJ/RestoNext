"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { startOfDay, endOfDay, subDays, subWeeks, subMonths, subYears, isSameDay } from 'date-fns';

// ============================================
// Types & Interfaces
// ============================================

export type ComparisonMode = 'previous_period' | 'same_period_last_year' | 'none';

export type DatePreset =
    | 'today'
    | 'yesterday'
    | 'last_7_days'
    | 'last_30_days'
    | 'this_month'
    | 'last_month'
    | 'this_quarter'
    | 'custom';

export interface DateRange {
    from: Date;
    to: Date;
}

export interface DashboardFilters {
    dateRange: DateRange;
    comparisonDateRange: DateRange | null;
    comparisonMode: ComparisonMode;
    selectedBranch: string | null;
    datePreset: DatePreset;
}

export interface DashboardContextValue {
    // Current Filters
    filters: DashboardFilters;

    // Actions
    setDateRange: (from: Date, to: Date) => void;
    setDatePreset: (preset: DatePreset) => void;
    setComparisonMode: (mode: ComparisonMode) => void;
    setSelectedBranch: (branchId: string | null) => void;

    // Computed properties
    isComparing: boolean;
    daysDifference: number;
    formattedDateRange: string;
}

// ============================================
// Helper Functions
// ============================================

function getDateRangeFromPreset(preset: DatePreset): DateRange {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    switch (preset) {
        case 'today':
            return { from: todayStart, to: todayEnd };

        case 'yesterday':
            const yesterday = subDays(today, 1);
            return { from: startOfDay(yesterday), to: endOfDay(yesterday) };

        case 'last_7_days':
            return { from: startOfDay(subDays(today, 6)), to: todayEnd };

        case 'last_30_days':
            return { from: startOfDay(subDays(today, 29)), to: todayEnd };

        case 'this_month':
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            return { from: startOfDay(monthStart), to: todayEnd };

        case 'last_month':
            const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
            return { from: startOfDay(lastMonthStart), to: endOfDay(lastMonthEnd) };

        case 'this_quarter':
            const quarter = Math.floor(today.getMonth() / 3);
            const quarterStart = new Date(today.getFullYear(), quarter * 3, 1);
            return { from: startOfDay(quarterStart), to: todayEnd };

        case 'custom':
        default:
            return { from: startOfDay(subDays(today, 6)), to: todayEnd };
    }
}

function getComparisonRange(
    dateRange: DateRange,
    mode: ComparisonMode
): DateRange | null {
    if (mode === 'none') return null;

    const daysDiff = Math.ceil(
        (dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    if (mode === 'previous_period') {
        // Compare with the immediately preceding period
        const compEnd = subDays(dateRange.from, 1);
        const compStart = subDays(compEnd, daysDiff - 1);
        return { from: startOfDay(compStart), to: endOfDay(compEnd) };
    }

    if (mode === 'same_period_last_year') {
        // Compare with same dates last year
        return {
            from: startOfDay(subYears(dateRange.from, 1)),
            to: endOfDay(subYears(dateRange.to, 1)),
        };
    }

    return null;
}

function formatDateRange(range: DateRange): string {
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short'
        });
    };

    if (isSameDay(range.from, range.to)) {
        return formatDate(range.from);
    }

    return `${formatDate(range.from)} - ${formatDate(range.to)}`;
}

// ============================================
// Context
// ============================================

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

// ============================================
// Provider Component
// ============================================

interface DashboardProviderProps {
    children: React.ReactNode;
    defaultPreset?: DatePreset;
    defaultComparisonMode?: ComparisonMode;
}

export function DashboardProvider({
    children,
    defaultPreset = 'last_7_days',
    defaultComparisonMode = 'previous_period',
}: DashboardProviderProps) {
    // Initialize with default preset
    const initialDateRange = getDateRangeFromPreset(defaultPreset);
    const initialComparisonRange = getComparisonRange(initialDateRange, defaultComparisonMode);

    const [filters, setFilters] = useState<DashboardFilters>({
        dateRange: initialDateRange,
        comparisonDateRange: initialComparisonRange,
        comparisonMode: defaultComparisonMode,
        selectedBranch: null,
        datePreset: defaultPreset,
    });

    // Set date range from custom picker
    const setDateRange = useCallback((from: Date, to: Date) => {
        const dateRange = { from: startOfDay(from), to: endOfDay(to) };
        const comparisonRange = getComparisonRange(dateRange, filters.comparisonMode);

        setFilters(prev => ({
            ...prev,
            dateRange,
            comparisonDateRange: comparisonRange,
            datePreset: 'custom',
        }));
    }, [filters.comparisonMode]);

    // Set date range from preset
    const setDatePreset = useCallback((preset: DatePreset) => {
        const dateRange = getDateRangeFromPreset(preset);
        const comparisonRange = getComparisonRange(dateRange, filters.comparisonMode);

        setFilters(prev => ({
            ...prev,
            dateRange,
            comparisonDateRange: comparisonRange,
            datePreset: preset,
        }));
    }, [filters.comparisonMode]);

    // Set comparison mode
    const setComparisonMode = useCallback((mode: ComparisonMode) => {
        const comparisonRange = getComparisonRange(filters.dateRange, mode);

        setFilters(prev => ({
            ...prev,
            comparisonMode: mode,
            comparisonDateRange: comparisonRange,
        }));
    }, [filters.dateRange]);

    // Set selected branch (for multi-location businesses)
    const setSelectedBranch = useCallback((branchId: string | null) => {
        setFilters(prev => ({
            ...prev,
            selectedBranch: branchId,
        }));
    }, []);

    // Computed values
    const contextValue = useMemo<DashboardContextValue>(() => ({
        filters,
        setDateRange,
        setDatePreset,
        setComparisonMode,
        setSelectedBranch,
        isComparing: filters.comparisonMode !== 'none' && filters.comparisonDateRange !== null,
        daysDifference: Math.ceil(
            (filters.dateRange.to.getTime() - filters.dateRange.from.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1,
        formattedDateRange: formatDateRange(filters.dateRange),
    }), [filters, setDateRange, setDatePreset, setComparisonMode, setSelectedBranch]);

    return (
        <DashboardContext.Provider value={contextValue}>
            {children}
        </DashboardContext.Provider>
    );
}

// ============================================
// Hook
// ============================================

export function useDashboardContext(): DashboardContextValue {
    const context = useContext(DashboardContext);
    if (!context) {
        throw new Error('useDashboardContext must be used within a DashboardProvider');
    }
    return context;
}

// ============================================
// Date Range Picker Component
// ============================================

interface DateRangeSelectorProps {
    className?: string;
}

const PRESET_LABELS: Record<DatePreset, string> = {
    today: 'Hoy',
    yesterday: 'Ayer',
    last_7_days: 'Últimos 7 días',
    last_30_days: 'Últimos 30 días',
    this_month: 'Este mes',
    last_month: 'Mes pasado',
    this_quarter: 'Este trimestre',
    custom: 'Personalizado',
};

export function DateRangeSelector({ className }: DateRangeSelectorProps) {
    const { filters, setDatePreset, setComparisonMode, formattedDateRange, isComparing } = useDashboardContext();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-sm hover:border-brand-400 transition-colors"
            >
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {formattedDateRange}
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Panel */}
                    <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden">
                        {/* Presets */}
                        <div className="p-2 border-b border-gray-100 dark:border-zinc-700">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-1">
                                Rango rápido
                            </p>
                            <div className="space-y-1">
                                {(['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month'] as DatePreset[]).map((preset) => (
                                    <button
                                        key={preset}
                                        onClick={() => {
                                            setDatePreset(preset);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${filters.datePreset === preset
                                                ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                                                : 'hover:bg-gray-50 dark:hover:bg-zinc-700'
                                            }`}
                                    >
                                        {PRESET_LABELS[preset]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Comparison Toggle */}
                        <div className="p-3 border-b border-gray-100 dark:border-zinc-700">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                Comparar con
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setComparisonMode('previous_period')}
                                    className={`flex-1 text-xs py-2 px-2 rounded-lg transition-colors ${filters.comparisonMode === 'previous_period'
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                            : 'bg-gray-100 text-gray-600 dark:bg-zinc-700 dark:text-gray-300 hover:bg-gray-200'
                                        }`}
                                >
                                    Periodo anterior
                                </button>
                                <button
                                    onClick={() => setComparisonMode('same_period_last_year')}
                                    className={`flex-1 text-xs py-2 px-2 rounded-lg transition-colors ${filters.comparisonMode === 'same_period_last_year'
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                            : 'bg-gray-100 text-gray-600 dark:bg-zinc-700 dark:text-gray-300 hover:bg-gray-200'
                                        }`}
                                >
                                    Año anterior
                                </button>
                                <button
                                    onClick={() => setComparisonMode('none')}
                                    className={`text-xs py-2 px-2 rounded-lg transition-colors ${filters.comparisonMode === 'none'
                                            ? 'bg-gray-200 text-gray-700 dark:bg-zinc-600'
                                            : 'bg-gray-100 text-gray-600 dark:bg-zinc-700 dark:text-gray-300 hover:bg-gray-200'
                                        }`}
                                >
                                    Sin
                                </button>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="p-3 bg-gray-50 dark:bg-zinc-900/50">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">Comparación:</span>
                                <span className={`font-medium ${isComparing ? 'text-emerald-600' : 'text-gray-400'}`}>
                                    {isComparing ? 'Activa' : 'Desactivada'}
                                </span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
