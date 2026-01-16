/**
 * Category Selector Component
 * Horizontal scrollable category tabs for POS
 * 
 * Fat-Finger Optimization:
 * - Minimum 48px height touch targets
 * - Generous horizontal padding
 * - Clear active state
 * - Momentum scrolling on touch
 * 
 * Motion Design:
 * - Shared layoutId for sliding background pill
 * - Spring-based animations
 * - Staggered entry animation
 */

import { MenuCategory } from "../../../../packages/shared/src/index";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { CategorySelectorSkeleton } from "../ui/Skeletons";

interface CategorySelectorProps {
    categories: MenuCategory[];
    selectedCategory: string | null;
    onSelectCategory: (categoryId: string) => void;
    isLoading?: boolean;
}

// Stagger animation for buttons
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

const buttonVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
        opacity: 1,
        x: 0,
        transition: {
            type: "spring" as const,
            stiffness: 300,
            damping: 25
        }
    }
};

export function CategorySelector({
    categories,
    selectedCategory,
    onSelectCategory,
    isLoading = false
}: CategorySelectorProps) {

    // Show skeleton while loading
    if (isLoading) {
        return <CategorySelectorSkeleton count={5} />;
    }

    return (
        <div className="glass sticky top-[72px] z-10 border-b border-gray-200/50 dark:border-gray-700/50">
            <motion.div
                className="flex gap-2 p-3 overflow-x-auto scrollbar-hide"
                style={{
                    WebkitOverflowScrolling: 'touch',
                    scrollSnapType: 'x proximity'
                }}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {categories.map((cat) => {
                    const isSelected = selectedCategory === cat.$id;

                    return (
                        <motion.button
                            key={cat.$id}
                            variants={buttonVariants}
                            onClick={() => onSelectCategory(cat.$id)}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className={cn(
                                // Base styles - FAT FINGER FRIENDLY
                                "relative flex items-center gap-2 px-5 py-3 rounded-full whitespace-nowrap",
                                "font-medium transition-colors duration-200",
                                "touch-manipulation",
                                "min-h-[48px]",  // Minimum touch target height
                                "min-w-[80px]",  // Minimum width
                                "scroll-snap-align-start",

                                // Non-selected state
                                !isSelected && [
                                    "text-gray-700 dark:text-gray-300",
                                    "hover:bg-white/50 dark:hover:bg-gray-700/50",
                                    "border border-gray-200/50 dark:border-gray-700/50"
                                ],

                                // Selected state (text only, bg handled by motion.div)
                                isSelected && [
                                    "text-white font-semibold",
                                ]
                            )}
                            style={{ scrollSnapAlign: 'start' }}
                        >
                            {/* Animated Background Pill (Shared Layout) */}
                            {isSelected && (
                                <motion.div
                                    layoutId="category-pill"
                                    className={cn(
                                        "absolute inset-0 rounded-full",
                                        "bg-gradient-to-r from-brand-500 to-brand-600",
                                        "shadow-lg shadow-brand-500/30"
                                    )}
                                    initial={false}
                                    transition={{
                                        type: "spring",
                                        stiffness: 400,
                                        damping: 30
                                    }}
                                />
                            )}

                            {/* Selection Ring Animation */}
                            <AnimatePresence>
                                {isSelected && (
                                    <motion.div
                                        className="absolute inset-0 rounded-full ring-2 ring-brand-300 ring-offset-2"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 1.1 }}
                                        transition={{ duration: 0.2 }}
                                    />
                                )}
                            </AnimatePresence>

                            {/* Content (above background) */}
                            <span className="relative z-10 flex items-center gap-2">
                                {/* Optional Category Icon/Emoji */}
                                {(cat as any).icon && (
                                    <motion.span
                                        className="text-lg"
                                        animate={isSelected ? { scale: [1, 1.2, 1] } : undefined}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {(cat as any).icon}
                                    </motion.span>
                                )}

                                {/* Category Name */}
                                <span className="text-sm sm:text-base">{cat.name}</span>

                                {/* Optional Item Count Badge */}
                                {(cat as any).item_count !== undefined && (cat as any).item_count > 0 && (
                                    <motion.span
                                        className={cn(
                                            "ml-1 px-2 py-0.5 rounded-full text-xs font-bold",
                                            isSelected
                                                ? "bg-white/20 text-white"
                                                : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                                        )}
                                        animate={isSelected ? { scale: [1, 1.1, 1] } : undefined}
                                        transition={{ delay: 0.1, duration: 0.2 }}
                                    >
                                        {(cat as any).item_count}
                                    </motion.span>
                                )}
                            </span>
                        </motion.button>
                    );
                })}

                {/* Spacer for scroll padding */}
                <div className="w-4 flex-shrink-0" aria-hidden="true" />
            </motion.div>
        </div>
    );
}
