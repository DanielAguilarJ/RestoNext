/**
 * Category Selector Component
 * Horizontal scrollable category tabs for POS
 * 
 * Fat-Finger Optimization:
 * - Minimum 44px height touch targets
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
import { motion } from "framer-motion";
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
        <div className="sticky top-0 z-20 py-3 bg-zinc-950/70 backdrop-blur-xl border-b border-white/5">
            <motion.div
                className="flex gap-3 px-4 overflow-x-auto scrollbar-hide items-center h-14"
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
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={cn(
                                // Base styles
                                "relative flex items-center gap-2 px-5 py-3 rounded-xl transition-all duration-300",
                                "min-h-[48px] border backdrop-blur-md",
                                "select-none outline-none focus:ring-2 focus:ring-brand-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950",

                                // Selected state
                                isSelected
                                    ? "border-brand-500/30 text-white shadow-lg shadow-brand-500/20"
                                    : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:border-white/10 hover:text-white"
                            )}
                            style={{ scrollSnapAlign: 'start' }}
                        >
                            {/* Animated Background Pill */}
                            {isSelected && (
                                <motion.div
                                    layoutId="category-pill"
                                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-600/90 to-brand-500/90 border border-brand-400/50"
                                    initial={false}
                                    transition={{
                                        type: "spring",
                                        stiffness: 400,
                                        damping: 30
                                    }}
                                />
                            )}

                            {/* Content (above background) */}
                            <span className="relative z-10 flex items-center gap-2">
                                {/* Optional Category Icon/Emoji */}
                                {(cat as any).icon && (
                                    <span className="text-lg leading-none">
                                        {(cat as any).icon}
                                    </span>
                                )}

                                {/* Category Name */}
                                <span className="text-sm font-bold tracking-wide whitespace-nowrap">
                                    {cat.name}
                                </span>
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
