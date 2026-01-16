'use client';

/**
 * Cart Modal Component
 * Full-screen cart view with order summary and AI upselling
 */

import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, Trash2, ChevronRight, Loader2, Sparkles, PlusCircle } from 'lucide-react';
import { useDining } from '../context';
import { getUpsellSuggestions } from '../api';
import type { CartItem } from '../types';

interface UpsellSuggestion {
    id: string;
    name: string;
    price: number;
    image_url?: string;
    reason: string;
}

interface CartModalProps {
    currency: string;
    isOpen: boolean;
    onClose: () => void;
    onOrderSuccess: () => void;
}

export function CartModal({ currency, isOpen, onClose, onOrderSuccess }: CartModalProps) {
    const { cart, updateCartItemQuantity, removeFromCart, submitOrder, apiConfig, addToCart, menu } = useDining();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Upsell state
    const [upsellSuggestions, setUpsellSuggestions] = useState<UpsellSuggestion[]>([]);
    const [loadingUpsell, setLoadingUpsell] = useState(false);
    const [addingUpsell, setAddingUpsell] = useState<string | null>(null);

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: currency
        }).format(price);
    };

    // Fetch upsell suggestions when cart opens
    useEffect(() => {
        if (isOpen && cart.items.length > 0 && apiConfig) {
            fetchUpsellSuggestions();
        }
    }, [isOpen, cart.items.length]);

    const fetchUpsellSuggestions = async () => {
        if (!apiConfig) return;

        setLoadingUpsell(true);
        try {
            const cartItems = cart.items.map(item => ({
                name: item.menu_item.name,
                quantity: item.quantity
            }));

            const response = await getUpsellSuggestions(apiConfig, cartItems);
            setUpsellSuggestions(response.suggestions);
        } catch (err) {
            console.error('Failed to fetch upsell suggestions:', err);
            setUpsellSuggestions([]);
        } finally {
            setLoadingUpsell(false);
        }
    };

    const handleAddUpsellItem = async (suggestion: UpsellSuggestion) => {
        // Find the menu item in the menu data
        if (!menu) return;

        setAddingUpsell(suggestion.id);

        try {
            // Find the item across all categories
            let menuItem = null;
            for (const category of menu.categories) {
                const found = category.items.find(item => item.id === suggestion.id);
                if (found) {
                    menuItem = found;
                    break;
                }
            }

            if (menuItem) {
                addToCart(menuItem, 1, [], undefined);
                // Remove suggestion from list after adding
                setUpsellSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
            }
        } catch (err) {
            console.error('Failed to add upsell item:', err);
        } finally {
            setAddingUpsell(null);
        }
    };

    // Calculate totals
    const tax = cart.subtotal * 0.16;
    const total = cart.subtotal + tax;

    const handleSubmitOrder = async () => {
        setIsSubmitting(true);
        setError(null);

        try {
            await submitOrder();
            onOrderSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al enviar el pedido');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Tu pedido</h2>
                <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
                >
                    <X className="w-5 h-5 text-gray-600" />
                </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto">
                {cart.items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <span className="text-6xl mb-4">🛒</span>
                        <p className="text-lg">Tu carrito está vacío</p>
                        <p className="text-sm">Agrega algo delicioso</p>
                    </div>
                ) : (
                    <>
                        <div className="divide-y divide-gray-100">
                            {cart.items.map(item => (
                                <CartItemRow
                                    key={item.id}
                                    item={item}
                                    currency={currency}
                                    onUpdateQuantity={(qty) => updateCartItemQuantity(item.id, qty)}
                                    onRemove={() => removeFromCart(item.id)}
                                />
                            ))}
                        </div>

                        {/* AI Upselling Suggestions */}
                        {upsellSuggestions.length > 0 && (
                            <div className="px-4 py-4 bg-gradient-to-br from-amber-50 to-orange-50 border-t border-amber-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                        <Sparkles className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Sugerencias del Chef</h3>
                                        <p className="text-xs text-gray-500">Complementa tu pedido</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {upsellSuggestions.map(suggestion => (
                                        <div
                                            key={suggestion.id}
                                            className="bg-white rounded-xl p-3 flex items-center gap-3 border border-amber-200 shadow-sm"
                                        >
                                            {/* Image */}
                                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                {suggestion.image_url ? (
                                                    <img
                                                        src={suggestion.image_url}
                                                        alt={suggestion.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <span className="text-xl">🍽️</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-gray-900 text-sm truncate">
                                                    {suggestion.name}
                                                </h4>
                                                <p className="text-xs text-amber-600 italic">
                                                    ✨ {suggestion.reason}
                                                </p>
                                                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                                                    {formatPrice(suggestion.price)}
                                                </p>
                                            </div>

                                            {/* Add Button */}
                                            <button
                                                onClick={() => handleAddUpsellItem(suggestion)}
                                                disabled={addingUpsell === suggestion.id}
                                                className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center hover:shadow-lg transition-all disabled:opacity-50 active:scale-95"
                                            >
                                                {addingUpsell === suggestion.id ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <PlusCircle className="w-5 h-5" />
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Loading Upsell */}
                        {loadingUpsell && (
                            <div className="px-4 py-6 bg-gradient-to-br from-amber-50 to-orange-50 border-t border-amber-100">
                                <div className="flex items-center justify-center gap-2 text-amber-600">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-sm">Buscando sugerencias...</span>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Order Summary & Submit */}
            {cart.items.length > 0 && (
                <div className="border-t border-gray-200 bg-gray-50 p-4 safe-bottom">
                    {/* Summary */}
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-gray-600">
                            <span>Subtotal</span>
                            <span>{formatPrice(cart.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>IVA (16%)</span>
                            <span>{formatPrice(tax)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                            <span>Total</span>
                            <span>{formatPrice(total)}</span>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-3">
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmitOrder}
                        disabled={isSubmitting}
                        className="w-full bg-orange-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Enviando a cocina...
                            </>
                        ) : (
                            <>
                                Enviar pedido
                                <ChevronRight className="w-5 h-5" />
                            </>
                        )}
                    </button>

                    <p className="text-center text-xs text-gray-400 mt-3">
                        Tu pedido será enviado directamente a cocina
                    </p>
                </div>
            )}
        </div>
    );
}


// Cart Item Row Component
function CartItemRow({
    item,
    currency,
    onUpdateQuantity,
    onRemove
}: {
    item: CartItem;
    currency: string;
    onUpdateQuantity: (qty: number) => void;
    onRemove: () => void;
}) {
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: currency
        }).format(price);
    };

    const itemTotal = item.unit_price * item.quantity;

    return (
        <div className="flex gap-3 p-4">
            {/* Image */}
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                {item.menu_item.image_url ? (
                    <img
                        src={item.menu_item.image_url}
                        alt={item.menu_item.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl">🍽️</span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">
                    {item.menu_item.name}
                </h3>

                {/* Modifiers */}
                {item.selected_modifiers.length > 0 && (
                    <p className="text-sm text-gray-500 truncate">
                        {item.selected_modifiers.map(m => m.option_name).join(', ')}
                    </p>
                )}

                {/* Notes */}
                {item.notes && (
                    <p className="text-xs text-orange-600 truncate">
                        📝 {item.notes}
                    </p>
                )}

                {/* Price & Quantity */}
                <div className="flex items-center justify-between mt-2">
                    <span className="font-semibold text-gray-900">
                        {formatPrice(itemTotal)}
                    </span>

                    <div className="flex items-center gap-2">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 bg-gray-100 rounded-full px-1 py-1">
                            <button
                                onClick={() => {
                                    if (item.quantity === 1) {
                                        onRemove();
                                    } else {
                                        onUpdateQuantity(item.quantity - 1);
                                    }
                                }}
                                className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-sm"
                            >
                                {item.quantity === 1 ? (
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                ) : (
                                    <Minus className="w-4 h-4 text-gray-600" />
                                )}
                            </button>
                            <span className="w-6 text-center text-sm font-semibold">
                                {item.quantity}
                            </span>
                            <button
                                onClick={() => onUpdateQuantity(item.quantity + 1)}
                                className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-sm"
                                disabled={item.quantity >= 20}
                            >
                                <Plus className="w-4 h-4 text-gray-600" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
