'use client';

/**
 * Floating Cart Button Component
 * Sticky cart button at the bottom of the screen
 */

import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { useDining } from '../context';

interface FloatingCartButtonProps {
    currency: string;
    onClick: () => void;
}

export function FloatingCartButton({ currency, onClick }: FloatingCartButtonProps) {
    const { cart } = useDining();
    
    // Don't show if cart is empty
    if (cart.items.length === 0) return null;
    
    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: currency
        }).format(price);
    };
    
    return (
        <div className="fixed bottom-4 left-4 right-4 z-40 safe-bottom">
            <button
                onClick={onClick}
                className="w-full bg-orange-500 text-white rounded-2xl p-4 flex items-center justify-between shadow-xl hover:bg-orange-600 active:scale-[0.98] transition-all"
            >
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <ShoppingCart className="w-6 h-6" />
                        <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-orange-500 text-xs font-bold rounded-full flex items-center justify-center">
                            {totalItems}
                        </span>
                    </div>
                    <span className="font-semibold">Ver carrito</span>
                </div>
                
                <span className="font-bold text-lg">
                    {formatPrice(cart.subtotal)}
                </span>
            </button>
        </div>
    );
}
