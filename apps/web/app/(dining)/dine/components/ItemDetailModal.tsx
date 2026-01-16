'use client';

/**
 * Item Detail Modal Component
 * Full-screen modal for selecting modifiers and adding item to cart
 */

import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, ChevronRight } from 'lucide-react';
import type { MenuItem, SelectedModifier, ModifierGroup } from '../types';

interface ItemDetailModalProps {
    item: MenuItem;
    currency: string;
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (quantity: number, modifiers: SelectedModifier[], notes?: string) => void;
}

export function ItemDetailModal({ 
    item, 
    currency, 
    isOpen, 
    onClose, 
    onAddToCart 
}: ItemDetailModalProps) {
    const [quantity, setQuantity] = useState(1);
    const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([]);
    const [notes, setNotes] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    // Reset state when item changes
    useEffect(() => {
        setQuantity(1);
        setSelectedModifiers([]);
        setNotes('');
        setErrors({});
    }, [item.id]);
    
    // Calculate total price
    const modifiersTotal = selectedModifiers.reduce((sum, m) => sum + m.price_delta, 0);
    const unitPrice = item.price + modifiersTotal;
    const totalPrice = unitPrice * quantity;
    
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: currency
        }).format(price);
    };
    
    // Handle modifier selection
    const handleModifierToggle = (group: ModifierGroup, optionId: string) => {
        const option = group.options.find(o => o.id === optionId);
        if (!option) return;
        
        const existingIndex = selectedModifiers.findIndex(
            m => m.group_name === group.name && m.option_id === optionId
        );
        
        if (existingIndex >= 0) {
            // Remove selection
            setSelectedModifiers(prev => prev.filter((_, i) => i !== existingIndex));
        } else {
            // Add selection (check max_select)
            const groupSelections = selectedModifiers.filter(m => m.group_name === group.name);
            
            if (group.max_select && groupSelections.length >= group.max_select) {
                // If max_select is 1, replace the selection
                if (group.max_select === 1) {
                    setSelectedModifiers(prev => [
                        ...prev.filter(m => m.group_name !== group.name),
                        {
                            group_name: group.name,
                            option_id: option.id,
                            option_name: option.name,
                            price_delta: option.price_delta
                        }
                    ]);
                }
                // Otherwise, don't allow more selections
                return;
            }
            
            setSelectedModifiers(prev => [
                ...prev,
                {
                    group_name: group.name,
                    option_id: option.id,
                    option_name: option.name,
                    price_delta: option.price_delta
                }
            ]);
        }
        
        // Clear error for this group
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[group.name];
            return newErrors;
        });
    };
    
    // Validate required modifiers
    const validateModifiers = (): boolean => {
        const newErrors: Record<string, string> = {};
        
        item.modifiers?.forEach(group => {
            if (group.required) {
                const groupSelections = selectedModifiers.filter(m => m.group_name === group.name);
                const minSelect = group.min_select || 1;
                
                if (groupSelections.length < minSelect) {
                    newErrors[group.name] = `Selecciona al menos ${minSelect} opción${minSelect > 1 ? 'es' : ''}`;
                }
            }
        });
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    // Handle add to cart
    const handleAddToCart = () => {
        if (!validateModifiers()) return;
        onAddToCart(quantity, selectedModifiers, notes || undefined);
        onClose();
    };
    
    // Check if an option is selected
    const isOptionSelected = (groupName: string, optionId: string): boolean => {
        return selectedModifiers.some(
            m => m.group_name === groupName && m.option_id === optionId
        );
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
            {/* Header with Image */}
            <div className="relative">
                {/* Image */}
                <div className="aspect-video bg-gray-100">
                    {item.image_url ? (
                        <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
                            <span className="text-6xl">🍽️</span>
                        </div>
                    )}
                </div>
                
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-lg"
                >
                    <X className="w-5 h-5 text-gray-700" />
                </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pb-32">
                {/* Item Info */}
                <div className="p-4 border-b border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {item.name}
                    </h2>
                    <p className="text-gray-500 mb-3">
                        {item.ai_description || item.description}
                    </p>
                    <p className="text-xl font-bold text-orange-600">
                        {formatPrice(item.price)}
                    </p>
                </div>
                
                {/* Modifier Groups */}
                {item.modifiers?.map(group => (
                    <div key={group.name} className="border-b border-gray-100">
                        <div className="px-4 py-3 bg-gray-50">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-gray-900">
                                    {group.name}
                                </h3>
                                <div className="flex items-center gap-2">
                                    {group.required && (
                                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                                            Requerido
                                        </span>
                                    )}
                                    {group.max_select && group.max_select > 1 && (
                                        <span className="text-xs text-gray-500">
                                            Máx. {group.max_select}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {errors[group.name] && (
                                <p className="text-red-500 text-sm mt-1">{errors[group.name]}</p>
                            )}
                        </div>
                        
                        <div className="divide-y divide-gray-100">
                            {group.options.map(option => {
                                const isSelected = isOptionSelected(group.name, option.id);
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => handleModifierToggle(group, option.id)}
                                        className={`
                                            w-full flex items-center justify-between p-4 text-left
                                            transition-colors
                                            ${isSelected ? 'bg-orange-50' : 'hover:bg-gray-50'}
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Checkbox/Radio */}
                                            <div className={`
                                                w-5 h-5 rounded-full border-2 flex items-center justify-center
                                                transition-all
                                                ${isSelected 
                                                    ? 'border-orange-500 bg-orange-500' 
                                                    : 'border-gray-300'
                                                }
                                            `}>
                                                {isSelected && (
                                                    <div className="w-2 h-2 bg-white rounded-full" />
                                                )}
                                            </div>
                                            
                                            <span className={`
                                                ${isSelected ? 'text-orange-700 font-medium' : 'text-gray-700'}
                                            `}>
                                                {option.name}
                                            </span>
                                        </div>
                                        
                                        {option.price_delta !== 0 && (
                                            <span className={`
                                                text-sm
                                                ${option.price_delta > 0 ? 'text-gray-500' : 'text-green-600'}
                                            `}>
                                                {option.price_delta > 0 ? '+' : ''}
                                                {formatPrice(option.price_delta)}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
                
                {/* Special Instructions */}
                <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">
                        Instrucciones especiales
                    </h3>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ej: Sin cebolla, poco picante..."
                        maxLength={200}
                        className="w-full p-3 border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        rows={3}
                    />
                    <p className="text-xs text-gray-400 text-right mt-1">
                        {notes.length}/200
                    </p>
                </div>
            </div>
            
            {/* Fixed Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-bottom">
                <div className="flex items-center gap-4">
                    {/* Quantity Selector */}
                    <div className="flex items-center gap-3 bg-gray-100 rounded-full px-2 py-1">
                        <button
                            onClick={() => setQuantity(q => Math.max(1, q - 1))}
                            className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm"
                            disabled={quantity <= 1}
                        >
                            <Minus className="w-4 h-4 text-gray-600" />
                        </button>
                        <span className="w-8 text-center font-semibold text-gray-900">
                            {quantity}
                        </span>
                        <button
                            onClick={() => setQuantity(q => Math.min(20, q + 1))}
                            className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm"
                            disabled={quantity >= 20}
                        >
                            <Plus className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>
                    
                    {/* Add to Cart Button */}
                    <button
                        onClick={handleAddToCart}
                        className="flex-1 bg-orange-500 text-white font-semibold py-3 px-6 rounded-full flex items-center justify-center gap-2 hover:bg-orange-600 active:scale-[0.98] transition-all shadow-lg"
                    >
                        <span>Agregar</span>
                        <span className="opacity-90">{formatPrice(totalPrice)}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
