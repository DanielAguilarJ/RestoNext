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
        <div className="sticky top-[72px] z-10 py-3 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
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
                                "relative flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300",
                                "min-h-[40px] border",
                                "select-none outline-none",

                                // Selected state
                                isSelected
                                    ? "border-brand-500/50 text-white shadow-[0_0_15px_rgba(234,88,12,0.3)]"
                                    : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700 hover:text-white"
                            )}
                            style={{ scrollSnapAlign: 'start' }}
                        >
                            {/* Animated Background Pill */}
                            {isSelected && (
                                <motion.div
                                    layoutId="category-pill"
                                    className="absolute inset-0 rounded-full bg-gradient-to-r from-brand-600 to-brand-500"
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
