/**
 * Skeleton Loaders System
 * Collection of premium skeleton loading states for perceived performance
 * 
 * Features:
 * - Shimmer effect with gradient animation
 * - Pulsating opacity animation
 * - Maintains exact layout to prevent layout shift
 * - Dark mode support
 */

import { cn } from "@/lib/utils";

// Base Skeleton Component with shimmer effect
interface SkeletonProps {
    className?: string;
    variant?: 'default' | 'circular' | 'text';
}

export function Skeleton({ className, variant = 'default' }: SkeletonProps) {
    return (
        <div
            className={cn(
                "relative overflow-hidden",
                "bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200",
                "dark:from-gray-800 dark:via-gray-700 dark:to-gray-800",
                "animate-shimmer",
                {
                    'rounded-lg': variant === 'default',
                    'rounded-full': variant === 'circular',
                    'rounded h-4': variant === 'text',
                },
                className
            )}
        >
            {/* Shimmer overlay */}
            <div className="absolute inset-0 -translate-x-full animate-shimmer-slide bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/10" />
        </div>
    );
}

// ==========================================
// MENU GRID SKELETON
// ==========================================
interface MenuGridSkeletonProps {
    count?: number;
    columns?: 2 | 3 | 4;
}

export function MenuGridSkeleton({ count = 8, columns = 4 }: MenuGridSkeletonProps) {
    const gridCols = {
        2: 'grid-cols-2',
        3: 'grid-cols-2 sm:grid-cols-3',
        4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
    };

    return (
        <div className="flex-1 p-4 overflow-y-auto">
            <div className={cn("grid gap-4", gridCols[columns])}>
                {[...Array(count)].map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            "glass rounded-2xl p-4 aspect-square min-h-[140px]",
                            "animate-pulse-subtle",
                            "border border-gray-200/50 dark:border-gray-700/30"
                        )}
                        style={{ animationDelay: `${i * 0.1}s` }}
                    >
                        {/* Product Image Skeleton */}
                        <div className="w-16 h-16 mx-auto mb-3">
                            <Skeleton variant="circular" className="w-full h-full" />
                        </div>

                        {/* Product Name Skeleton */}
                        <div className="space-y-2 mb-3">
                            <Skeleton className="h-4 w-3/4 mx-auto" />
                            <Skeleton className="h-4 w-1/2 mx-auto" />
                        </div>

                        {/* Price Skeleton */}
                        <Skeleton className="h-5 w-1/3 mx-auto rounded-full" />

                        {/* Button Skeleton */}
                        <Skeleton className="h-4 w-1/2 mx-auto mt-3 rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ==========================================
// TABLE MAP SKELETON
// ==========================================
interface TableMapSkeletonProps {
    count?: number;
}

export function TableMapSkeleton({ count = 6 }: TableMapSkeletonProps) {
    return (
        <div className="p-4">
            {/* Legend Skeleton */}
            <div className="glass rounded-xl p-4 mb-6 animate-pulse-subtle">
                <Skeleton className="h-3 w-24 mb-3" />
                <div className="flex flex-wrap gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <Skeleton variant="circular" className="w-5 h-5" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Table Grid Skeleton */}
            <div className="grid grid-cols-3 gap-4">
                {[...Array(count)].map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            "aspect-square rounded-2xl p-4",
                            "flex flex-col items-center justify-center",
                            "glass border-2 border-gray-200/50 dark:border-gray-700/30",
                            "animate-pulse-subtle min-h-[100px]"
                        )}
                        style={{ animationDelay: `${i * 0.1}s` }}
                    >
                        {/* Table Number */}
                        <Skeleton className="h-10 w-12 mb-2" />

                        {/* Capacity */}
                        <div className="flex items-center gap-1.5 mt-2">
                            <Skeleton variant="circular" className="w-4 h-4" />
                            <Skeleton className="h-3 w-16" />
                        </div>

                        {/* Status Badge */}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                            <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ==========================================
// CART ITEM SKELETON
// ==========================================
interface CartItemSkeletonProps {
    count?: number;
}

export function CartItemSkeleton({ count = 3 }: CartItemSkeletonProps) {
    return (
        <div className="space-y-3">
            {[...Array(count)].map((_, i) => (
                <div
                    key={i}
                    className={cn(
                        "flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl p-4",
                        "animate-pulse-subtle"
                    )}
                    style={{ animationDelay: `${i * 0.1}s` }}
                >
                    {/* Product Icon */}
                    <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />

                    {/* Product Details */}
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/4" />
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                        <Skeleton variant="circular" className="w-10 h-10" />
                        <Skeleton className="w-6 h-6" />
                        <Skeleton variant="circular" className="w-10 h-10" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ==========================================
// CATEGORY SELECTOR SKELETON
// ==========================================
interface CategorySelectorSkeletonProps {
    count?: number;
}

export function CategorySelectorSkeleton({ count = 5 }: CategorySelectorSkeletonProps) {
    return (
        <div className="glass sticky top-[72px] z-10 border-b border-gray-200/50 dark:border-gray-700/50">
            <div
                className="flex gap-2 p-3 overflow-x-auto scrollbar-hide"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                {[...Array(count)].map((_, i) => (
                    <div
                        key={i}
                        className="animate-pulse-subtle"
                        style={{ animationDelay: `${i * 0.1}s` }}
                    >
                        <Skeleton className="h-12 w-28 rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ==========================================
// ORDER HISTORY SKELETON
// ==========================================
interface OrderHistorySkeletonProps {
    count?: number;
}

export function OrderHistorySkeleton({ count = 5 }: OrderHistorySkeletonProps) {
    return (
        <div className="space-y-4">
            {[...Array(count)].map((_, i) => (
                <div
                    key={i}
                    className={cn(
                        "glass rounded-xl p-4 animate-pulse-subtle",
                        "border border-gray-200/50 dark:border-gray-700/30"
                    )}
                    style={{ animationDelay: `${i * 0.1}s` }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-3">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                    </div>

                    {/* Items */}
                    <div className="space-y-2 mb-3">
                        {[...Array(2)].map((_, j) => (
                            <div key={j} className="flex justify-between">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                        ))}
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-center pt-3 border-t border-gray-200/50 dark:border-gray-700/30">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-5 w-20" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ==========================================
// DASHBOARD CARD SKELETON
// ==========================================
interface DashboardCardSkeletonProps {
    count?: number;
}

export function DashboardCardSkeleton({ count = 4 }: DashboardCardSkeletonProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(count)].map((_, i) => (
                <div
                    key={i}
                    className={cn(
                        "glass rounded-2xl p-6 animate-pulse-subtle",
                        "border border-gray-200/50 dark:border-gray-700/30"
                    )}
                    style={{ animationDelay: `${i * 0.1}s` }}
                >
                    {/* Icon */}
                    <Skeleton variant="circular" className="w-12 h-12 mb-4" />

                    {/* Title */}
                    <Skeleton className="h-4 w-24 mb-2" />

                    {/* Value */}
                    <Skeleton className="h-8 w-32 mb-2" />

                    {/* Trend */}
                    <Skeleton className="h-3 w-20" />
                </div>
            ))}
        </div>
    );
}
