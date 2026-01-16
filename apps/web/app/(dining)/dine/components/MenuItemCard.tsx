'use client';

/**
 * Menu Item Card Component
 * Large card design for easy touch interaction on tablets
 */

import React from 'react';
import { Plus, Leaf, Flame, AlertTriangle } from 'lucide-react';
import type { MenuItem } from '../types';

interface MenuItemCardProps {
    item: MenuItem;
    currency: string;
    showPrices: boolean;
    onSelect: (item: MenuItem) => void;
}

export function MenuItemCard({ item, currency, showPrices, onSelect }: MenuItemCardProps) {
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: currency
        }).format(price);
    };
    
    // Tag icons
    const tagIcons: Record<string, React.ReactNode> = {
        'vegetarian': <Leaf className="w-3 h-3" />,
        'vegan': <Leaf className="w-3 h-3" />,
        'spicy': <Flame className="w-3 h-3" />,
        'gluten-free': <AlertTriangle className="w-3 h-3" />
    };
    
    const tagColors: Record<string, string> = {
        'vegetarian': 'bg-green-100 text-green-700',
        'vegan': 'bg-green-100 text-green-700',
        'spicy': 'bg-red-100 text-red-700',
        'gluten-free': 'bg-yellow-100 text-yellow-700'
    };
    
    return (
        <button
            onClick={() => onSelect(item)}
            disabled={!item.is_available}
            className={`
                w-full bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100
                transition-all duration-200 text-left
                ${item.is_available 
                    ? 'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]' 
                    : 'opacity-60 cursor-not-allowed'
                }
            `}
        >
            {/* Image */}
            <div className="relative aspect-[4/3] bg-gray-100">
                {item.image_url ? (
                    <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
                        <span className="text-4xl">🍽️</span>
                    </div>
                )}
                
                {/* Unavailable Badge */}
                {!item.is_available && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="bg-white text-gray-800 px-4 py-2 rounded-full text-sm font-medium">
                            No disponible
                        </span>
                    </div>
                )}
                
                {/* Tags */}
                {item.tags.length > 0 && (
                    <div className="absolute top-2 left-2 flex gap-1">
                        {item.tags.slice(0, 2).map(tag => (
                            <span 
                                key={tag}
                                className={`
                                    inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                                    ${tagColors[tag] || 'bg-gray-100 text-gray-700'}
                                `}
                            >
                                {tagIcons[tag]}
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
                
                {/* Quick Add Button */}
                {item.is_available && !item.modifiers?.length && (
                    <div className="absolute bottom-2 right-2">
                        <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg">
                            <Plus className="w-5 h-5" />
                        </div>
                    </div>
                )}
            </div>
            
            {/* Content */}
            <div className="p-4">
                <h3 className="font-semibold text-gray-900 text-lg leading-tight mb-1">
                    {item.name}
                </h3>
                
                {(item.description || item.ai_description) && (
                    <p className="text-gray-500 text-sm line-clamp-2 mb-3">
                        {item.ai_description || item.description}
                    </p>
                )}
                
                {showPrices && (
                    <div className="flex items-center justify-between">
                        <span className="text-orange-600 font-bold text-lg">
                            {formatPrice(item.price)}
                        </span>
                        
                        {item.modifiers && item.modifiers.length > 0 && (
                            <span className="text-xs text-gray-400">
                                + opciones
                            </span>
                        )}
                    </div>
                )}
            </div>
        </button>
    );
}
