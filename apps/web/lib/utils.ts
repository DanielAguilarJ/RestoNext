import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Format price in Mexican Pesos
 */
export function formatPrice(price: number): string {
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
    }).format(price);
}

/**
 * Format time elapsed since a date
 */
export function formatTimeElapsed(startTime: Date): string {
    const now = new Date();
    const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);

    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;

    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Get timer status based on elapsed minutes
 */
export function getTimerStatus(minutes: number): "normal" | "warning" | "critical" {
    if (minutes >= 15) return "critical";
    if (minutes >= 10) return "warning";
    return "normal";
}

/**
 * Generate unique ID
 */
export function generateId(): string {
    return Math.random().toString(36).substring(2, 15);
}
