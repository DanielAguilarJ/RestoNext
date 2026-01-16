/**
 * Category Selector Component
 * Horizontal scrollable category tabs for POS
 * 
 * Fat-Finger Optimization:
 * - Minimum 48px height touch targets
 * - Generous horizontal padding
 * - Clear active state
 * - Momentum scrolling on touch
 */

import { MenuCategory } from "../../../../packages/shared/src/index";
import { cn } from "@/lib/utils";

interface CategorySelectorProps {
    categories: MenuCategory[];
    selectedCategory: string | null;
    onSelectCategory: (categoryId: string) => void;
}

export function CategorySelector({ categories, selectedCategory, onSelectCategory }: CategorySelectorProps) {
    return (
        <div className="glass sticky top-[72px] z-10 border-b border-gray-200/50 dark:border-gray-700/50">
            <div
                className="flex gap-2 p-3 overflow-x-auto scrollbar-hide"
                style={{
                    WebkitOverflowScrolling: 'touch',
                    scrollSnapType: 'x proximity'
                }}
            >
                {categories.map((cat, index) => {
                    const isSelected = selectedCategory === cat.$id;

                    return (
                        <button
                            key={cat.$id}
                            onClick={() => onSelectCategory(cat.$id)}
                            className={cn(
                                // Base styles - FAT FINGER FRIENDLY
                                "flex items-center gap-2 px-5 py-3 rounded-full whitespace-nowrap",
                                "transition-all duration-300 font-medium",
                                "touch-manipulation",
                                "min-h-[48px]",  // Minimum touch target height
                                "min-w-[80px]",  // Minimum width
                                "scroll-snap-align-start",

                                // Animation
                                "animate-scale-in",

                                // States
                                isSelected
                                    ? [
                                        "bg-gradient-to-r from-brand-500 to-brand-600",
                                        "text-white font-semibold",
                                        "shadow-lg shadow-brand-500/30",
                                        "scale-105",
                                        "ring-2 ring-brand-300 ring-offset-2"
                                    ]
                                    : [
                                        "bg-white/80 dark:bg-gray-800/80",
                                        "text-gray-700 dark:text-gray-300",
                                        "hover:bg-white dark:hover:bg-gray-700",
                                        "hover:shadow-md",
                                        "hover:scale-102",
                                        "active:scale-95",
                                        "border border-gray-200 dark:border-gray-700"
                                    ]
                            )}
                            style={{
                                animationDelay: `${index * 0.05}s`,
                                scrollSnapAlign: 'start'
                            }}
                        >
                            {/* Optional Category Icon/Emoji */}
                            {(cat as any).icon && <span className="text-lg">{(cat as any).icon}</span>}

                            {/* Category Name */}
                            <span className="text-sm sm:text-base">{cat.name}</span>

                            {/* Optional Item Count Badge */}
                            {(cat as any).item_count !== undefined && (cat as any).item_count > 0 && (
                                <span className={cn(
                                    "ml-1 px-2 py-0.5 rounded-full text-xs font-bold",
                                    isSelected
                                        ? "bg-white/20 text-white"
                                        : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                                )}>
                                    {(cat as any).item_count}
                                </span>
                            )}
                        </button>
                    );
                })}

                {/* Spacer for scroll padding */}
                <div className="w-4 flex-shrink-0" aria-hidden="true" />
            </div>
        </div>
    );
}
