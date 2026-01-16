/**
 * Menu Grid Component
 * Premium product grid optimized for touch interfaces
 * 
 * Fat-Finger Optimization:
 * - Minimum 48x48px touch targets (actually 80x80+ for products)
 * - Visual feedback on press (scale + ripple effect)
 * - Generous spacing between items
 * - Clear hover/active states
 */

import { MenuItem } from "../../../../packages/shared/src/index";
import { formatPrice } from "@/lib/utils";
import { Plus, Check } from "lucide-react";
import { useState, useCallback } from "react";

interface MenuGridProps {
    isLoading: boolean;
    items: MenuItem[];
    onAddItem: (item: MenuItem) => void;
}

export function MenuGrid({ isLoading, items, onAddItem }: MenuGridProps) {
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

    if (isLoading) {
        return (
            <div className="flex-1 p-4 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div
                            key={i}
                            className="bg-white/50 dark:bg-gray-800/50 rounded-2xl p-4 animate-pulse aspect-square min-h-[140px]"
                        >
                            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-xl mb-3 mx-auto" />
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2 mx-auto" />
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {items.map((item, index) => {
                    const isPressed = pressedItem === item.$id;
                    const isAdded = addedItems.has(item.$id);

                    return (
                        <button
                            key={item.$id}
                            onClick={() => handleAddItem(item)}
                            onMouseDown={() => handlePress(item.$id)}
                            onMouseUp={handleRelease}
                            onMouseLeave={handleRelease}
                            onTouchStart={() => handlePress(item.$id)}
                            onTouchEnd={handleRelease}
                            className={`
                                relative group p-4 text-left 
                                bg-white/70 dark:bg-gray-800/70 
                                hover:bg-white dark:hover:bg-gray-800 
                                rounded-2xl transition-all duration-200 
                                shadow-sm hover:shadow-lg
                                border-2 border-transparent hover:border-brand-200 dark:hover:border-brand-800
                                overflow-hidden
                                touch-manipulation
                                
                                /* FAT FINGER OPTIMIZATION */
                                min-h-[140px]  /* Generous height */
                                min-w-[100px]  /* Minimum width */
                                
                                /* Active/Press State */
                                ${isPressed ? 'scale-95 shadow-inner bg-brand-50 dark:bg-brand-900/30' : ''}
                                ${isAdded ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20' : ''}
                                
                                /* Animation */
                                animate-scale-in
                            `}
                            style={{ animationDelay: `${index * 0.03}s` }}
                        >
                            {/* Product Image/Emoji */}
                            <div className={`
                                w-16 h-16 mx-auto
                                bg-gradient-to-br from-brand-100 to-brand-200 
                                dark:from-brand-900/50 dark:to-brand-800/50 
                                rounded-xl flex items-center justify-center mb-3
                                transition-transform duration-300
                                ${isPressed ? 'scale-90' : 'group-hover:scale-110'}
                                ${isAdded ? 'bg-green-100 dark:bg-green-900/50' : ''}
                            `}>
                                {isAdded ? (
                                    <Check className="w-8 h-8 text-green-500 animate-bounce-soft" />
                                ) : (
                                    <span className="text-3xl">{item.image_url || "🥘"}</span>
                                )}
                            </div>

                            {/* Product Name */}
                            <div className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 min-h-[40px] text-center">
                                {item.name}
                            </div>

                            {/* Price */}
                            <div className={`
                                text-lg font-bold mt-2 text-center transition-colors
                                ${isAdded ? 'text-green-600 dark:text-green-400' : 'text-brand-600 dark:text-brand-400'}
                            `}>
                                {formatPrice(item.price)}
                            </div>

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
                                {isAdded ? (
                                    <>
                                        <Check className="w-3 h-3" />
                                        <span>Agregado</span>
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-3 h-3" />
                                        <span>Agregar</span>
                                    </>
                                )}
                            </div>

                            {/* Ripple Effect */}
                            {isPressed && (
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="absolute inset-0 bg-brand-500/10 animate-ripple rounded-2xl" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Empty State */}
            {items.length === 0 && !isLoading && (
                <div className="text-center py-12 text-gray-500">
                    <div className="text-6xl mb-4">🍽️</div>
                    <p className="text-lg font-medium">No hay productos en esta categoría</p>
                    <p className="text-sm">Selecciona otra categoría</p>
                </div>
            )}
        </div>
    );
}
