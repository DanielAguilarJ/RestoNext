/**
 * Menu Grid Component
 * Premium product grid optimized for touch interfaces
 * 
 * Fat-Finger Optimization:
 * - Minimum 48x48px touch targets (actually 80x80+ for products)
 * - Visual feedback on press (scale + ripple effect)
 * - Generous spacing between items
 * - Clear hover/active states
 * 
 * UX Polish Features:
 * - Skeleton loading states
 * - Framer Motion animations for fluid transitions
 * - Empty state with animated icon
 * - Micro-interactions on add
 */

import { MenuItem } from "../../../../packages/shared/src/index";
import { formatPrice } from "@/lib/utils";
import { Plus, Check, Search } from "lucide-react";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MenuGridSkeleton } from "../ui/Skeletons";
import { EmptyState } from "../ui/EmptyState";
import Image from "next/image";

interface MenuGridProps {
    isLoading: boolean;
    items: MenuItem[];
    onAddItem: (item: MenuItem) => void;
    searchQuery?: string;
}

// Animation variants for staggered entry
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring" as const,
            stiffness: 300,
            damping: 24
        }
    },
    exit: {
        opacity: 0,
        scale: 0.9,
        transition: { duration: 0.2 }
    }
};

// "Added" feedback animation
const addedPulse = {
    scale: [1, 1.08, 1],
    transition: { duration: 0.3 }
};

export function MenuGrid({ isLoading, items, onAddItem, searchQuery = '' }: MenuGridProps) {
    const [pressedItem, setPressedItem] = useState<string | null>(null);
    const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

    const handlePress = useCallback((itemId: string) => {
        setPressedItem(itemId);
    }, []);

    const handleRelease = useCallback(() => {
        setPressedItem(null);
    }, []);

    const handleAddItem = useCallback((item: MenuItem) => {
        // Show added feedback
        setAddedItems(prev => new Set(prev).add(item.$id));

        // Call parent handler
        onAddItem(item);

        // Remove feedback after animation
        setTimeout(() => {
            setAddedItems(prev => {
                const next = new Set(prev);
                next.delete(item.$id);
                return next;
            });
        }, 800);
    }, [onAddItem]);

    // Show skeleton while loading
    if (isLoading) {
        return <MenuGridSkeleton count={8} columns={4} />;
    }

    // Show empty state when no items
    if (items.length === 0) {
        return (
            <div className="flex-1 p-4 overflow-y-auto flex items-center justify-center">
                <AnimatePresence mode="wait">
                    {searchQuery ? (
                        <EmptyState
                            key="search-empty"
                            emoji="🔍"
                            title={`No encontramos "${searchQuery}"`}
                            description="Intenta con otra búsqueda o selecciona una categoría diferente"
                            size="md"
                        />
                    ) : (
                        <EmptyState
                            key="category-empty"
                            emoji="🍽️"
                            title="No hay productos en esta categoría"
                            description="Selecciona otra categoría para ver más opciones"
                            size="md"
                        />
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div className="flex-1 p-4 overflow-y-auto">
            <motion.div
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                key={items.map(i => i.$id).join('-')} // Re-animate when items change
            >
                <AnimatePresence mode="popLayout">
                    {items.map((item) => {
                        const isPressed = pressedItem === item.$id;
                        const isAdded = addedItems.has(item.$id);
                        const hasImage = item.image_url && item.image_url.startsWith('http');

                        return (
                            <motion.button
                                key={item.$id}
                                variants={itemVariants}
                                layout
                                animate={isAdded ? addedPulse : undefined}
                                whileHover={{
                                    y: -4,
                                    transition: { type: "spring", stiffness: 400, damping: 20 }
                                }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleAddItem(item)}
                                onMouseDown={() => handlePress(item.$id)}
                                onMouseUp={handleRelease}
                                onMouseLeave={handleRelease}
                                onTouchStart={() => handlePress(item.$id)}
                                onTouchEnd={handleRelease}
                                className={`
                                    relative group p-3 text-left 
                                    bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm
                                    hover:bg-white dark:hover:bg-gray-800 
                                    rounded-2xl transition-all duration-200 
                                    shadow-sm hover:shadow-md
                                    border border-gray-100 dark:border-gray-700
                                    hover:border-brand-200 dark:hover:border-brand-800
                                    overflow-hidden
                                    touch-manipulation
                                    
                                    /* FAT FINGER OPTIMIZATION */
                                    min-h-[160px]
                                    flex flex-col
                                    
                                    /* Active/Press State */
                                    ${isPressed ? 'bg-brand-50 dark:bg-brand-900/30' : ''}
                                    ${isAdded ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20' : ''}
                                `}
                            >
                                {/* Product Image */}
                                <div className="relative w-full aspect-[4/3] mb-3 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                                    <AnimatePresence mode="wait">
                                        {isAdded ? (
                                            <motion.div
                                                key="check"
                                                className="absolute inset-0 z-10 flex items-center justify-center bg-green-500/20 backdrop-blur-sm"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                            >
                                                <motion.div
                                                    initial={{ scale: 0, rotate: -180 }}
                                                    animate={{ scale: 1, rotate: 0 }}
                                                    transition={{ type: "spring", stiffness: 300 }}
                                                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg"
                                                >
                                                    <Check className="w-6 h-6 text-green-600" strokeWidth={3} />
                                                </motion.div>
                                            </motion.div>
                                        ) : null}
                                    </AnimatePresence>

                                    {hasImage ? (
                                        <Image
                                            src={item.image_url!}
                                            alt={item.name}
                                            fill
                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-4xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                                            {item.image_url || "🥘"}
                                        </div>
                                    )}
                                </div>

                                {/* Product Name */}
                                <div className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 min-h-[40px] text-center">
                                    {item.name}
                                </div>

                                {/* Price */}
                                <motion.div
                                    className={`
                                        text-lg font-bold mt-2 text-center transition-colors
                                        ${isAdded ? 'text-green-600 dark:text-green-400' : 'text-brand-600 dark:text-brand-400'}
                                    `}
                                    animate={isAdded ? { scale: [1, 1.15, 1] } : undefined}
                                    transition={{ duration: 0.3 }}
                                >
                                    {formatPrice(item.price)}
                                </motion.div>

                                {/* "Add" Indicator - Always visible on touch devices */}
                                <div className={`
                                    mt-2 flex items-center justify-center gap-1 
                                    text-xs font-medium
                                    transition-all duration-200
                                    ${isAdded
                                        ? 'text-green-600 dark:text-green-400 opacity-100'
                                        : 'text-brand-600 dark:text-brand-400 opacity-70 group-hover:opacity-100'
                                    }
                                `}>
                                    <AnimatePresence mode="wait">
                                        {isAdded ? (
                                            <motion.div
                                                key="added"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="flex items-center gap-1"
                                            >
                                                <Check className="w-3 h-3" />
                                                <span>Agregado</span>
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="add"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="flex items-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" />
                                                <span>Agregar</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Ripple Effect */}
                                <AnimatePresence>
                                    {isPressed && (
                                        <motion.div
                                            className="absolute inset-0 pointer-events-none"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <motion.div
                                                className="absolute inset-0 bg-brand-500/10 rounded-2xl"
                                                initial={{ scale: 0.8 }}
                                                animate={{ scale: 1 }}
                                                transition={{ duration: 0.15 }}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        );
                    })}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
