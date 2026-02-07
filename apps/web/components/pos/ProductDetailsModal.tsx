/**
 * Product Details Modal - Modifier Selection
 * Fast, touch-optimized modal for selecting product options
 * 
 * SPEED OPTIMIZATION:
 * - Auto-advance to next group when selection is complete
 * - Large touch targets (56px minimum)
 * - Immediate visual feedback with color-coded selections
 * - Haptic-like animations for mobile
 * - Auto-close when all required modifiers are selected
 * 
 * Target: 3 modifications in under 5 seconds
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { X, Check, Plus, Minus, AlertCircle, ChevronRight, Sparkles } from "lucide-react";
import { MenuItem } from "../../../../packages/shared/src/index";
import { formatPrice } from "@/lib/utils";
import { usePosAudio } from "@/hooks/usePosAudio";

// ============================================
// Types
// ============================================

export interface ModifierOption {
    id: string;
    name: string;
    price_delta: number;
}

export interface ModifierGroup {
    name: string;
    required: boolean;
    min_select: number | null;
    max_select: number | null;
    options: ModifierOption[];
}

interface SelectedModifier {
    group_name: string;
    option_id: string;
    option_name: string;
    price_delta: number;
}

interface ProductDetailsModalProps {
    isOpen: boolean;
    item: MenuItem | null;
    onClose: () => void;
    onAddToCart: (item: MenuItem, modifiers: SelectedModifier[], quantity: number, notes: string) => void;
}

// ============================================
// Constants
// ============================================

const QUICK_NOTES = [
    "Sin cebolla",
    "Extra picante",
    "Sin sal",
    "Bien cocido",
    "Poco hecho",
    "Sin gluten",
    "Alérgico a...",
];

// ============================================
// Component
// ============================================

export function ProductDetailsModal({
    isOpen,
    item,
    onClose,
    onAddToCart,
}: ProductDetailsModalProps) {
    const [selectedModifiers, setSelectedModifiers] = useState<Map<string, SelectedModifier[]>>(new Map());
    const [activeGroupIndex, setActiveGroupIndex] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState("");
    const [errors, setErrors] = useState<Map<string, string>>(new Map());
    const [isClosing, setIsClosing] = useState(false);

    const { playSuccess, playError } = usePosAudio();

    // Parse modifier groups from item schema
    const modifierGroups: ModifierGroup[] = useMemo(() => {
        if (item?.modifier_groups?.length) return item.modifier_groups;
        // Fallback: backend returns modifiers_schema.groups
        if ((item as any)?.modifiers_schema?.groups) return (item as any).modifiers_schema.groups;
        return [];
    }, [item]);

    // Reset state when modal opens with new item
    useEffect(() => {
        if (isOpen && item) {
            setSelectedModifiers(new Map());
            setActiveGroupIndex(0);
            setQuantity(1);
            setNotes("");
            setErrors(new Map());
            setIsClosing(false);
        }
    }, [isOpen, item?.$id]);

    // Calculate total price with modifiers
    const totalPrice = useMemo(() => {
        if (!item) return 0;
        let total = item.price;

        selectedModifiers.forEach((mods) => {
            mods.forEach((mod) => {
                total += mod.price_delta;
            });
        });

        return total * quantity;
    }, [item, selectedModifiers, quantity]);

    // Flatten selected modifiers for display
    const flatModifiers = useMemo(() => {
        const result: SelectedModifier[] = [];
        selectedModifiers.forEach((mods) => {
            result.push(...mods);
        });
        return result;
    }, [selectedModifiers]);

    // Check if a modifier option is selected
    const isOptionSelected = useCallback((groupName: string, optionId: string) => {
        const groupMods = selectedModifiers.get(groupName) || [];
        return groupMods.some(m => m.option_id === optionId);
    }, [selectedModifiers]);

    // Get selection count for a group
    const getGroupSelectionCount = useCallback((groupName: string) => {
        return (selectedModifiers.get(groupName) || []).length;
    }, [selectedModifiers]);

    // Handle modifier selection
    const handleSelectModifier = useCallback((group: ModifierGroup, option: ModifierOption) => {
        setSelectedModifiers(prev => {
            const newMap = new Map(prev);
            const groupMods = [...(newMap.get(group.name) || [])];
            const existingIndex = groupMods.findIndex(m => m.option_id === option.id);

            if (existingIndex >= 0) {
                // Deselect
                groupMods.splice(existingIndex, 1);
            } else {
                // Check max limit
                const maxSelect = group.max_select ?? Infinity;
                if (groupMods.length >= maxSelect) {
                    // If max is 1, replace the selection
                    if (maxSelect === 1) {
                        groupMods.length = 0;
                    } else {
                        // Can't add more
                        playError();
                        return prev;
                    }
                }

                // Add selection
                groupMods.push({
                    group_name: group.name,
                    option_id: option.id,
                    option_name: option.name,
                    price_delta: option.price_delta,
                });
            }

            newMap.set(group.name, groupMods);

            // Clear error for this group
            setErrors(e => {
                const newErrors = new Map(e);
                newErrors.delete(group.name);
                return newErrors;
            });

            // Auto-advance to next group if this one is complete
            const minSelect = group.min_select ?? 0;
            const maxSelect = group.max_select ?? Infinity;
            const isComplete = groupMods.length >= minSelect &&
                (maxSelect === 1 || groupMods.length >= maxSelect);

            if (isComplete && activeGroupIndex < modifierGroups.length - 1) {
                setTimeout(() => setActiveGroupIndex(prev => prev + 1), 150);
            }

            return newMap;
        });
    }, [activeGroupIndex, modifierGroups.length, playError]);

    // Validate all required modifiers
    const validateModifiers = useCallback(() => {
        const newErrors = new Map<string, string>();

        modifierGroups.forEach(group => {
            const count = getGroupSelectionCount(group.name);
            const minSelect = group.min_select ?? (group.required ? 1 : 0);

            if (count < minSelect) {
                newErrors.set(
                    group.name,
                    minSelect === 1
                        ? `Selecciona ${group.name.toLowerCase()}`
                        : `Selecciona al menos ${minSelect} opciones`
                );
            }
        });

        setErrors(newErrors);
        return newErrors.size === 0;
    }, [modifierGroups, getGroupSelectionCount]);

    // Handle adding to cart
    const handleAddToCart = useCallback(() => {
        if (!item) return;

        // Validate if there are modifier groups
        if (modifierGroups.length > 0 && !validateModifiers()) {
            playError();
            return;
        }

        playSuccess();
        onAddToCart(item, flatModifiers, quantity, notes);

        // Close with animation
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 200);
    }, [item, modifierGroups.length, validateModifiers, playSuccess, playError, onAddToCart, flatModifiers, quantity, notes, onClose]);

    // Handle quick note
    const handleQuickNote = useCallback((note: string) => {
        setNotes(prev => prev ? `${prev}, ${note}` : note);
    }, []);

    // Close with animation
    const handleClose = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 200);
    }, [onClose]);

    if (!isOpen || !item) return null;

    const hasModifiers = modifierGroups.length > 0;
    const activeGroup = modifierGroups[activeGroupIndex];

    return (
        <div
            className={`
                fixed inset-0 z-50 flex items-end sm:items-center justify-center
                ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}
            `}
            onClick={handleClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className={`
                    relative w-full max-w-lg max-h-[90vh] overflow-hidden
                    bg-white dark:bg-gray-900 
                    rounded-t-3xl sm:rounded-3xl
                    shadow-2xl
                    ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}
                `}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 bg-gradient-to-b from-white dark:from-gray-900 to-transparent pb-4">
                    <div className="flex items-start justify-between p-4 pb-0">
                        <div className="flex items-center gap-3">
                            {/* Product Image/Emoji */}
                            <div className="w-16 h-16 bg-gradient-to-br from-brand-100 to-brand-200 
                                          dark:from-brand-900/50 dark:to-brand-800/50 
                                          rounded-2xl flex items-center justify-center">
                                <span className="text-3xl">{item.image_url || "🥘"}</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {item.name}
                                </h2>
                                <p className="text-lg font-semibold text-brand-600 dark:text-brand-400">
                                    {formatPrice(totalPrice)}
                                </p>
                            </div>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={handleClose}
                            className="p-2 -mt-1 -mr-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800
                                     transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Quantity Selector - Always visible */}
                    <div className="flex items-center justify-center gap-4 mt-4 px-4">
                        <button
                            onClick={() => setQuantity(q => Math.max(1, q - 1))}
                            className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800
                                     hover:bg-gray-200 dark:hover:bg-gray-700
                                     flex items-center justify-center transition-colors
                                     active:scale-95"
                        >
                            <Minus className="w-5 h-5" />
                        </button>
                        <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
                        <button
                            onClick={() => setQuantity(q => q + 1)}
                            className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800
                                     hover:bg-gray-200 dark:hover:bg-gray-700
                                     flex items-center justify-center transition-colors
                                     active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[50vh] px-4 pb-4">
                    {/* Modifier Groups */}
                    {hasModifiers && (
                        <div className="space-y-4">
                            {/* Group Tabs */}
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {modifierGroups.map((group, index) => {
                                    const count = getGroupSelectionCount(group.name);
                                    const minSelect = group.min_select ?? (group.required ? 1 : 0);
                                    const isComplete = count >= minSelect;
                                    const hasError = errors.has(group.name);

                                    return (
                                        <button
                                            key={group.name}
                                            onClick={() => setActiveGroupIndex(index)}
                                            className={`
                                                flex items-center gap-2 px-4 py-2 rounded-xl
                                                whitespace-nowrap transition-all duration-200
                                                min-h-[44px]
                                                ${activeGroupIndex === index
                                                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                                                    : hasError
                                                        ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                                        : isComplete
                                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                                }
                                            `}
                                        >
                                            {isComplete && <Check className="w-4 h-4" />}
                                            {hasError && <AlertCircle className="w-4 h-4" />}
                                            <span className="font-medium">{group.name}</span>
                                            {count > 0 && (
                                                <span className="text-xs opacity-75">({count})</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Active Group Options */}
                            {activeGroup && (
                                <div className="space-y-2">
                                    {/* Group Info */}
                                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                                        <span>
                                            {activeGroup.required ? "Obligatorio" : "Opcional"}
                                            {activeGroup.max_select === 1
                                                ? " • Elige 1"
                                                : activeGroup.min_select
                                                    ? ` • Mínimo ${activeGroup.min_select}`
                                                    : ""
                                            }
                                            {activeGroup.max_select && activeGroup.max_select > 1
                                                ? ` • Máximo ${activeGroup.max_select}`
                                                : ""
                                            }
                                        </span>
                                        {errors.has(activeGroup.name) && (
                                            <span className="text-red-500 font-medium flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                {errors.get(activeGroup.name)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Options Grid */}
                                    <div className="grid grid-cols-2 gap-2">
                                        {activeGroup.options.map((option) => {
                                            const isSelected = isOptionSelected(activeGroup.name, option.id);

                                            return (
                                                <button
                                                    key={option.id}
                                                    onClick={() => handleSelectModifier(activeGroup, option)}
                                                    className={`
                                                        relative p-4 rounded-xl text-left
                                                        transition-all duration-200
                                                        min-h-[64px]
                                                        active:scale-95
                                                        ${isSelected
                                                            ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30 ring-2 ring-brand-400'
                                                            : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                        }
                                                    `}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium">{option.name}</span>
                                                        {isSelected && (
                                                            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                                                                <Check className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    {option.price_delta !== 0 && (
                                                        <span className={`
                                                            text-sm mt-1 block
                                                            ${isSelected
                                                                ? 'text-white/80'
                                                                : option.price_delta > 0
                                                                    ? 'text-brand-600 dark:text-brand-400'
                                                                    : 'text-green-600 dark:text-green-400'
                                                            }
                                                        `}>
                                                            {option.price_delta > 0 ? '+' : ''}
                                                            {formatPrice(option.price_delta)}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Next Group Button */}
                                    {activeGroupIndex < modifierGroups.length - 1 && (
                                        <button
                                            onClick={() => setActiveGroupIndex(prev => prev + 1)}
                                            className="w-full py-3 text-brand-600 dark:text-brand-400
                                                     flex items-center justify-center gap-2
                                                     hover:bg-brand-50 dark:hover:bg-brand-900/20
                                                     rounded-xl transition-colors"
                                        >
                                            <span>Siguiente: {modifierGroups[activeGroupIndex + 1].name}</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Quick Notes */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                            Notas rápidas
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {QUICK_NOTES.map((note) => (
                                <button
                                    key={note}
                                    onClick={() => handleQuickNote(note)}
                                    className={`
                                        px-3 py-1.5 rounded-full text-sm
                                        transition-all duration-200
                                        ${notes.includes(note)
                                            ? 'bg-brand-500 text-white'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }
                                    `}
                                >
                                    {note}
                                </button>
                            ))}
                        </div>

                        {/* Custom Note Input */}
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Notas adicionales..."
                            className="w-full mt-3 px-4 py-3 rounded-xl
                                     bg-gray-50 dark:bg-gray-800
                                     border border-gray-200 dark:border-gray-700
                                     focus:ring-2 focus:ring-brand-500 focus:border-transparent
                                     outline-none transition-all"
                        />
                    </div>

                    {/* Selection Summary */}
                    {flatModifiers.length > 0 && (
                        <div className="mt-4 p-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl">
                            <p className="text-sm font-medium text-brand-600 dark:text-brand-400 mb-2 flex items-center gap-2">
                                <Sparkles className="w-4 h-4" />
                                Tu selección
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {item.name} ({flatModifiers.map(m => m.option_name).join(', ')})
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer - Add to Cart */}
                <div className="sticky bottom-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={handleAddToCart}
                        className="w-full py-4 px-6 rounded-2xl
                                 bg-gradient-to-r from-brand-500 to-brand-600
                                 hover:from-brand-600 hover:to-brand-700
                                 text-white font-bold text-lg
                                 shadow-lg shadow-brand-500/30
                                 hover:shadow-xl hover:shadow-brand-500/40
                                 transition-all duration-300
                                 active:scale-98
                                 flex items-center justify-between"
                    >
                        <span>Agregar al pedido</span>
                        <span className="bg-white/20 px-3 py-1 rounded-lg">
                            {formatPrice(totalPrice)}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
