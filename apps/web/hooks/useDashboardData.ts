"use client";

import { useQuery } from '@tanstack/react-query';
import { useDashboardContext } from '@/app/analytics/DashboardContext';
import {
    analyticsApi,
    KPIResponse,
    SalesComparisonResponse,
    TopDishesResponse,
    SalesByCategoryResponse
} from '@/lib/api';

// ============================================
// Types
// ============================================

export interface DeltaValue {
    value: number;
    previousValue: number;
    delta: number;           // Percentage change
    deltaAbsolute: number;   // Absolute change
    trend: 'up' | 'down' | 'neutral';
    isPositive: boolean;     // For coloring (green/red)
}

export interface KPISummaryData {
    totalSales: DeltaValue;
    averageTicket: DeltaValue;
    totalOrders: DeltaValue;
    foodCostPercentage: DeltaValue;
    busiestHour: number | null;
    busiestDay: string | null;
}

export interface OperationsPulseData {
    liveSales: DeltaValue;
    occupancy: {
        percentage: number;
        activeTables: number;
        totalTables: number;
    };
    kitchenSpeed: {
        averageMinutes: number;
        targetMinutes: number;
        deltaMinutes: number;
    };
    recentSalesData: { value: number }[];
}

// ============================================
// Utility Functions
// ============================================

/**
 * Calculate delta between current and previous values
 * @param current Current period value
 * @param previous Previous period value
 * @param invertPositive If true, a decrease is considered positive (e.g., costs, times)
 */
export function calculateDelta(
    current: number,
    previous: number,
    invertPositive: boolean = false
): DeltaValue {
    const deltaAbsolute = current - previous;
    const delta = previous !== 0
        ? ((current - previous) / previous) * 100
        : current > 0 ? 100 : 0;

    const trend: 'up' | 'down' | 'neutral' =
        delta > 0.5 ? 'up' : delta < -0.5 ? 'down' : 'neutral';

    // Determine if the change is positive (good for business)
    const isPositive = invertPositive
        ? trend === 'down'
        : trend === 'up';

    return {
        value: current,
        previousValue: previous,
        delta: Math.round(delta * 10) / 10,
        deltaAbsolute,
        trend,
        isPositive,
    };
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 1): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

// ============================================
// HOOK: useKPISummary
// ============================================

export function useKPISummary() {
    const { filters, isComparing } = useDashboardContext();
    const { dateRange, comparisonDateRange } = filters;

    // Fetch current period KPIs
    const currentQuery = useQuery({
        queryKey: ['kpis', 'current', dateRange.from.toISOString(), dateRange.to.toISOString()],
        queryFn: () => analyticsApi.getKPIs(dateRange.from, dateRange.to),
        staleTime: 30 * 1000, // 30 seconds
        placeholderData: (previousData) => previousData, // Keep previous data while loading
    });

    // Fetch comparison period KPIs (only if comparing)
    const comparisonQuery = useQuery({
        queryKey: [
            'kpis',
            'comparison',
            comparisonDateRange?.from.toISOString(),
            comparisonDateRange?.to.toISOString()
        ],
        queryFn: () => comparisonDateRange
            ? analyticsApi.getKPIs(comparisonDateRange.from, comparisonDateRange.to)
            : Promise.resolve(null),
        enabled: isComparing && comparisonDateRange !== null,
        staleTime: 30 * 1000,
        placeholderData: (previousData) => previousData,
    });

    // Compute derived data with deltas
    const data: KPISummaryData | null = currentQuery.data ? {
        totalSales: calculateDelta(
            currentQuery.data.total_sales,
            comparisonQuery.data?.total_sales ?? 0
        ),
        averageTicket: calculateDelta(
            currentQuery.data.average_ticket,
            comparisonQuery.data?.average_ticket ?? 0
        ),
        totalOrders: calculateDelta(
            currentQuery.data.total_orders,
            comparisonQuery.data?.total_orders ?? 0
        ),
        foodCostPercentage: calculateDelta(
            currentQuery.data.food_cost_percentage,
            comparisonQuery.data?.food_cost_percentage ?? 0,
            true // Lower food cost is better
        ),
        busiestHour: currentQuery.data.busiest_hour,
        busiestDay: currentQuery.data.busiest_day,
    } : null;

    // Check if this is a "day zero" (new user with no data)
    const isDayZero = currentQuery.data
        ? currentQuery.data.total_sales === 0 && currentQuery.data.total_orders === 0
        : false;

    return {
        data,
        isLoading: currentQuery.isLoading || (isComparing && comparisonQuery.isLoading),
        isFetching: currentQuery.isFetching || comparisonQuery.isFetching,
        error: currentQuery.error || comparisonQuery.error,
        isDayZero,
        refetch: () => {
            currentQuery.refetch();
            if (isComparing) comparisonQuery.refetch();
        },
    };
}

// ============================================
// HOOK: useSalesTrend
// ============================================

export function useSalesTrend() {
    const { filters } = useDashboardContext();
    const { dateRange } = filters;

    const query = useQuery({
        queryKey: ['salesTrend', dateRange.from.toISOString(), dateRange.to.toISOString()],
        queryFn: () => analyticsApi.getSalesComparison(),
        staleTime: 60 * 1000, // 1 minute
        placeholderData: (previousData) => previousData,
    });

    // Transform data for charts
    const chartData = query.data?.current_week.map((day, index) => ({
        name: day.day_name.substring(0, 3),
        date: day.date,
        current: day.total_sales,
        previous: query.data?.previous_week[index]?.total_sales ?? 0,
        orders: day.order_count,
    })) ?? [];

    return {
        data: query.data,
        chartData,
        totalChange: query.data?.change_percentage ?? 0,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        error: query.error,
        refetch: query.refetch,
    };
}

// ============================================
// HOOK: useTopItems
// ============================================

export function useTopItems(limit: number = 5) {
    const { filters } = useDashboardContext();
    const { dateRange } = filters;

    const query = useQuery({
        queryKey: ['topItems', dateRange.from.toISOString(), dateRange.to.toISOString(), limit],
        queryFn: () => analyticsApi.getTopDishes(dateRange.from, dateRange.to, limit),
        staleTime: 60 * 1000,
        placeholderData: (previousData) => previousData,
    });

    return {
        data: query.data?.dishes ?? [],
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        error: query.error,
        refetch: query.refetch,
    };
}

// ============================================
// HOOK: useCategorySales
// ============================================

export function useCategorySales() {
    const { filters } = useDashboardContext();
    const { dateRange } = filters;

    const query = useQuery({
        queryKey: ['categorySales', dateRange.from.toISOString(), dateRange.to.toISOString()],
        queryFn: () => analyticsApi.getSalesByCategory(dateRange.from, dateRange.to),
        staleTime: 60 * 1000,
        placeholderData: (previousData) => previousData,
    });

    // Prepare data for pie chart
    const pieData = query.data?.categories.map(cat => ({
        name: cat.category_name,
        value: cat.total_sales,
        percentage: cat.percentage,
        color: cat.color,
    })) ?? [];

    return {
        data: query.data,
        pieData,
        totalSales: query.data?.total_sales ?? 0,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        error: query.error,
        refetch: query.refetch,
    };
}

// ============================================
// HOOK: useOperationsPulse (Real-time dashboard)
// ============================================

export function useOperationsPulse() {
    const { filters } = useDashboardContext();
    const { dateRange } = filters;

    // Fetch current KPIs with shorter stale time for "live" feel
    const kpisQuery = useQuery({
        queryKey: ['operationsPulse', 'kpis', dateRange.from.toISOString(), dateRange.to.toISOString()],
        queryFn: () => analyticsApi.getKPIs(dateRange.from, dateRange.to),
        staleTime: 15 * 1000, // 15 seconds for more "live" data
        refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
        placeholderData: (previousData) => previousData,
    });

    // Fetch sales by hour for sparkline
    const hourlyQuery = useQuery({
        queryKey: ['operationsPulse', 'hourly', dateRange.from.toISOString(), dateRange.to.toISOString()],
        queryFn: () => analyticsApi.getSalesByHour(dateRange.from, dateRange.to),
        staleTime: 30 * 1000,
        placeholderData: (previousData) => previousData,
    });

    // Fetch previous period for comparison
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const previousQuery = useQuery({
        queryKey: ['operationsPulse', 'previous'],
        queryFn: () => analyticsApi.getKPIs(yesterday, yesterday),
        staleTime: 60 * 1000,
        placeholderData: (previousData) => previousData,
    });

    // Build sparkline data from hourly sales
    const sparklineData = hourlyQuery.data?.data
        .slice(-12) // Last 12 hours
        .map(h => ({ value: h.total_sales })) ?? [];

    // Calculate live sales delta
    const liveSales = calculateDelta(
        kpisQuery.data?.total_sales ?? 0,
        previousQuery.data?.total_sales ?? 0
    );

    const data: OperationsPulseData | null = kpisQuery.data ? {
        liveSales,
        occupancy: {
            percentage: 75, // TODO: Connect to real tables API
            activeTables: 18,
            totalTables: 24,
        },
        kitchenSpeed: {
            averageMinutes: 12.5,
            targetMinutes: 15,
            deltaMinutes: -2.5,
        },
        recentSalesData: sparklineData.length > 0 ? sparklineData : [
            { value: 400 }, { value: 600 }, { value: 500 },
            { value: 900 }, { value: 800 }, { value: 1200 }, { value: 1100 }
        ],
    } : null;

    const isDayZero = kpisQuery.data
        ? kpisQuery.data.total_sales === 0 && kpisQuery.data.total_orders === 0
        : false;

    return {
        data,
        isLoading: kpisQuery.isLoading,
        isFetching: kpisQuery.isFetching || hourlyQuery.isFetching,
        error: kpisQuery.error,
        isDayZero,
        refetch: () => {
            kpisQuery.refetch();
            hourlyQuery.refetch();
            previousQuery.refetch();
        },
    };
}

// ============================================
// HOOK: useDashboardHealth
// Combined hook for overall dashboard state
// ============================================

export function useDashboardHealth() {
    const kpis = useKPISummary();
    const trends = useSalesTrend();
    const topItems = useTopItems();

    const isLoading = kpis.isLoading || trends.isLoading || topItems.isLoading;
    const isFetching = kpis.isFetching || trends.isFetching || topItems.isFetching;
    const hasError = !!(kpis.error || trends.error || topItems.error);
    const isDayZero = kpis.isDayZero;

    return {
        isLoading,
        isFetching,
        hasError,
        isDayZero,
        errors: [kpis.error, trends.error, topItems.error].filter(Boolean),
        refetchAll: () => {
            kpis.refetch();
            trends.refetch();
            topItems.refetch();
        },
    };
}
