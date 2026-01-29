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

import Link from "next/link";
import { Receipt } from "lucide-react";

interface MenuGridProps {
    isLoading: boolean;
    items: MenuItem[];
    onAddItem: (item: MenuItem) => void;
    searchQuery?: string;
    hasCategories?: boolean;
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

export function MenuGrid({ isLoading, items, onAddItem, searchQuery = '', hasCategories = true }: MenuGridProps) {
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
                    ) : !hasCategories ? (
                        <EmptyState
                            key="no-config-empty"
                            icon={Receipt}
                            title="No hay productos configurados"
                            description="Primero debes agregar categorías y productos desde el administrador del menú."
                            size="md"
                            action={
                                <Link
                                    href="/admin/menu"
                                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors inline-block"
                                >
                                    Ir a Configurar Menú
                                </Link>
                            }
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
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 py-4"
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
                                whileHover={{ y: -5, scale: 1.02 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleAddItem(item)}
                                onMouseDown={() => handlePress(item.$id)}
                                onMouseUp={handleRelease}
                                onMouseLeave={handleRelease}
                                onTouchStart={() => handlePress(item.$id)}
                                onTouchEnd={handleRelease}
                                className={`
                                    relative group p-3 text-left 
                                    bg-white/5 backdrop-blur-md
                                    hover:bg-white/10
                                    rounded-3xl transition-all duration-300
                                    border border-white/5 hover:border-brand-500/30
                                    overflow-hidden
                                    touch-manipulation
                                    min-h-[200px] flex flex-col
                                    shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-brand-500/10
                                    ${isPressed ? 'bg-white/15 scale-[0.98]' : ''}
                                    ${isAdded ? 'ring-2 ring-emerald-500 border-transparent bg-emerald-500/10' : ''}
                                `}
                            >
                                {/* Product Image */}
                                <div className="relative w-full aspect-[4/3] mb-4 rounded-2xl overflow-hidden bg-zinc-800/30 border border-white/5 shadow-inner">
                                    <AnimatePresence mode="wait">
                                        {isAdded ? (
                                            <motion.div
                                                key="check"
                                                className="absolute inset-0 z-10 flex items-center justify-center bg-emerald-500/20 backdrop-blur-sm"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                            >
                                                <motion.div
                                                    initial={{ scale: 0, rotate: -180 }}
                                                    animate={{ scale: 1, rotate: 0 }}
                                                    transition={{ type: "spring", stiffness: 300 }}
                                                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20"
                                                >
                                                    <Check className="w-6 h-6 text-emerald-600" strokeWidth={3} />
                                                </motion.div>
                                            </motion.div>
                                        ) : null}
                                    </AnimatePresence>

                                    {hasImage ? (
                                        <Image
                                            src={item.image_url!}
                                            alt={item.name}
                                            fill
                                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 group-hover:from-zinc-800 group-hover:to-zinc-800 transition-colors">
                                            <div className="p-4 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                                                <span className="text-4xl grayscale group-hover:grayscale-0 transition-all duration-300">🥘</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Floating Price Tag */}
                                    <div className="absolute top-2 right-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 shadow-lg">
                                        <span className="text-white font-bold text-sm tracking-wide">
                                            {formatPrice(item.price)}
                                        </span>
                                    </div>
                                </div>

                                {/* Product Info */}
                                <div className="flex-1 flex flex-col justify-between">
                                    <h3 className="font-bold text-base text-zinc-100 leading-tight mb-2 line-clamp-2 group-hover:text-brand-400 transition-colors">
                                        {item.name}
                                    </h3>

                                    {/* Action Bar */}
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-xs font-medium text-zinc-500">
                                            {item.modifier_groups?.length ? "Personalizable" : "Directo"}
                                        </span>

                                        <div className={`
                                            w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                                            ${isAdded
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-zinc-800 text-zinc-400 group-hover:bg-brand-500 group-hover:text-white'
                                            }
                                        `}>
                                            <Plus className={`w-5 h-5 transition-transform duration-300 ${isAdded ? 'rotate-45' : ''}`} />
                                        </div>
                                    </div>
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
                                            <div className="absolute inset-0 bg-brand-500/10" />
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
