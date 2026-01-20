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
        <div className="sticky top-[72px] z-10 py-2 bg-gray-50/95 dark:bg-black/95 backdrop-blur-sm supports-[backdrop-filter]:bg-gray-50/80 dark:supports-[backdrop-filter]:bg-black/80">
            <motion.div
                className="flex gap-3 px-4 overflow-x-auto scrollbar-hide items-center h-16"
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
                                "relative flex items-center gap-2 px-6 py-2.5 rounded-full transition-all duration-200",
                                "min-h-[44px]",
                                "select-none outline-none focus-visible:ring-2 focus-visible:ring-gray-400",

                                // Non-selected state
                                !isSelected && [
                                    "bg-gray-100 dark:bg-gray-800",
                                    "hover:bg-gray-200 dark:hover:bg-gray-700",
                                    "active:scale-95"
                                ]
                            )}
                            style={{ scrollSnapAlign: 'start' }}
                        >
                            {/* Animated Background Pill */}
                            {isSelected && (
                                <motion.div
                                    layoutId="category-pill"
                                    className={cn(
                                        "absolute inset-0 rounded-full",
                                        "bg-gray-900 dark:bg-white",
                                        "shadow-sm"
                                    )}
                                    initial={false}
                                    transition={{
                                        type: "spring",
                                        stiffness: 400,
                                        damping: 30
                                    }}
                                />
                            )}

                            {/* Content (above background) */}
                            <span className={cn(
                                "relative z-10 flex items-center gap-2",
                                isSelected ? "text-white dark:text-gray-900" : "text-gray-600 dark:text-gray-400"
                            )}>
                                {/* Optional Category Icon/Emoji */}
                                {(cat as any).icon && (
                                    <span className="text-lg">
                                        {(cat as any).icon}
                                    </span>
                                )}

                                {/* Category Name */}
                                <span className={cn(
                                    "text-sm font-semibold tracking-wide",
                                    "whitespace-nowrap"
                                )}>
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
