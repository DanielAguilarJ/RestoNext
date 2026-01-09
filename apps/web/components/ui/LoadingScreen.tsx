"use client";

/**
 * Loading Screen Component - Premium Loading States
 */

import { UtensilsCrossed, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingScreenProps {
    message?: string;
    variant?: "fullscreen" | "inline" | "overlay";
}

export function LoadingScreen({
    message = "Cargando...",
    variant = "fullscreen"
}: LoadingScreenProps) {
    if (variant === "inline") {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{message}</p>
                </div>
            </div>
        );
    }

    if (variant === "overlay") {
        return (
            <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
                <div className="glass rounded-3xl p-8 text-center animate-scale-in">
                    <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-brand-500/30 animate-pulse-glow">
                        <UtensilsCrossed className="w-8 h-8 text-white" />
                    </div>
                    <Loader2 className="w-6 h-6 text-brand-600 animate-spin mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-300 font-medium">{message}</p>
                </div>
            </div>
        );
    }

    // Fullscreen variant
    return (
        <div className="min-h-screen bg-mesh flex items-center justify-center relative overflow-hidden">
            {/* Background orbs */}
            <div className="orb orb-brand w-64 h-64 -top-32 -right-32 animate-float" />
            <div className="orb orb-blue w-48 h-48 bottom-1/4 -left-24 animate-float-delayed" />

            <div className="text-center relative z-10 animate-scale-in">
                <div className="w-24 h-24 bg-gradient-to-br from-brand-500 to-brand-700 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-brand-500/40 animate-pulse-glow">
                    <UtensilsCrossed className="w-12 h-12 text-white" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    RestoNext MX
                </h1>

                <div className="flex items-center justify-center gap-2 mb-6">
                    <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
                    <p className="text-gray-500 dark:text-gray-400">{message}</p>
                </div>

                {/* Loading dots */}
                <div className="flex items-center justify-center gap-2">
                    {[0, 1, 2].map((i) => (
                        <span
                            key={i}
                            className="w-3 h-3 bg-brand-500 rounded-full animate-bounce-soft"
                            style={{ animationDelay: `${i * 0.15}s` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

// Skeleton Components for content loading
interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div className={cn("skeleton rounded-lg", className)} />
    );
}

export function CardSkeleton() {
    return (
        <div className="card-premium p-4 animate-pulse">
            <div className="flex gap-4">
                <Skeleton className="w-20 h-20 rounded-xl" />
                <div className="flex-1">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-3" />
                    <Skeleton className="h-6 w-1/4" />
                </div>
            </div>
        </div>
    );
}

export function TableSkeleton() {
    return (
        <div className="aspect-square rounded-2xl skeleton animate-pulse" />
    );
}

export function MenuItemSkeleton() {
    return (
        <div className="card-premium p-4">
            <Skeleton className="w-16 h-16 rounded-xl mb-3" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-5 w-1/2" />
        </div>
    );
}
