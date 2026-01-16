/**
 * Empty State Component
 * Reusable component for displaying friendly empty states
 * 
 * Features:
 * - Accepts any Lucide icon
 * - Customizable title and description
 * - Optional action button
 * - Animated entrance
 * - Dark mode support
 */

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, Package } from "lucide-react";
import { motion } from "framer-motion";

interface EmptyStateProps {
    /** Lucide icon component */
    icon?: LucideIcon;
    /** Main title text */
    title: string;
    /** Description or subtitle */
    description?: string;
    /** Optional action button */
    action?: ReactNode;
    /** Additional CSS classes */
    className?: string;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Optional decoration emoji */
    emoji?: string;
}

export function EmptyState({
    icon: Icon = Package,
    title,
    description,
    action,
    className,
    size = 'md',
    emoji,
}: EmptyStateProps) {
    const sizeStyles = {
        sm: {
            container: 'py-8',
            icon: 'w-12 h-12',
            iconBox: 'w-16 h-16',
            title: 'text-base',
            description: 'text-sm',
            emoji: 'text-4xl',
        },
        md: {
            container: 'py-12',
            icon: 'w-16 h-16',
            iconBox: 'w-24 h-24',
            title: 'text-lg',
            description: 'text-sm',
            emoji: 'text-6xl',
        },
        lg: {
            container: 'py-16',
            icon: 'w-20 h-20',
            iconBox: 'w-28 h-28',
            title: 'text-xl',
            description: 'text-base',
            emoji: 'text-8xl',
        },
    };

    const styles = sizeStyles[size];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94]
            }}
            className={cn(
                "flex flex-col items-center justify-center text-center",
                styles.container,
                className
            )}
        >
            {/* Icon Container with Floating Animation */}
            <motion.div
                animate={{
                    y: [0, -8, 0],
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className={cn(
                    "relative mb-6",
                    styles.iconBox,
                    "rounded-2xl",
                    "bg-gradient-to-br from-gray-100 to-gray-200",
                    "dark:from-gray-800 dark:to-gray-700",
                    "flex items-center justify-center",
                    "shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50"
                )}
            >
                {emoji ? (
                    <motion.span
                        className={styles.emoji}
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        {emoji}
                    </motion.span>
                ) : (
                    <Icon className={cn(
                        styles.icon,
                        "text-gray-400 dark:text-gray-500"
                    )} />
                )}

                {/* Decorative Rings */}
                <motion.div
                    className="absolute inset-0 rounded-2xl border-2 border-gray-200/50 dark:border-gray-700/50"
                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
            </motion.div>

            {/* Title */}
            <motion.h3
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className={cn(
                    "font-semibold text-gray-700 dark:text-gray-200",
                    "mb-2",
                    styles.title
                )}
            >
                {title}
            </motion.h3>

            {/* Description */}
            {description && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className={cn(
                        "text-gray-500 dark:text-gray-400",
                        "max-w-sm",
                        styles.description
                    )}
                >
                    {description}
                </motion.p>
            )}

            {/* Action Button */}
            {action && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-6"
                >
                    {action}
                </motion.div>
            )}
        </motion.div>
    );
}

// ==========================================
// PRESET EMPTY STATES
// ==========================================

export function EmptyCart({ onAction }: { onAction?: () => void }) {
    return (
        <EmptyState
            emoji="🛒"
            title="Carrito vacío"
            description="Empieza una orden seleccionando productos del menú"
            size="md"
        />
    );
}

export function EmptySearch({ query }: { query?: string }) {
    return (
        <EmptyState
            emoji="🔍"
            title={query ? `No encontramos "${query}"` : "Sin resultados"}
            description="Intenta con otra búsqueda o selecciona una categoría diferente"
            size="md"
        />
    );
}

export function EmptyCategory() {
    return (
        <EmptyState
            emoji="🍽️"
            title="No hay productos en esta categoría"
            description="Selecciona otra categoría para ver más opciones"
            size="md"
        />
    );
}

export function EmptyOrders() {
    return (
        <EmptyState
            emoji="📋"
            title="Sin órdenes aún"
            description="Las órdenes aparecerán aquí cuando los clientes hagan pedidos"
            size="md"
        />
    );
}

export function EmptyTables() {
    return (
        <EmptyState
            emoji="🪑"
            title="No hay mesas configuradas"
            description="Agrega mesas desde el panel de administración"
            size="md"
        />
    );
}

export function NoTableSelected() {
    return (
        <EmptyState
            emoji="👆"
            title="Selecciona una mesa"
            description="Toca una mesa en el mapa para comenzar a tomar la orden"
            size="lg"
        />
    );
}
