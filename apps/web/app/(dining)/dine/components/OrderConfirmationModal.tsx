'use client';

/**
 * Order Confirmation Modal Component
 * Shows order confirmation after successful submission
 */

import React from 'react';
import { CheckCircle, Clock, ChefHat, X } from 'lucide-react';
import type { OrderResponse } from '../types';

interface OrderConfirmationModalProps {
    order: OrderResponse;
    isOpen: boolean;
    onClose: () => void;
}

export function OrderConfirmationModal({ order, isOpen, onClose }: OrderConfirmationModalProps) {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Success Icon */}
                <div className="bg-gradient-to-br from-green-400 to-green-500 p-8 text-center">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <CheckCircle className="w-12 h-12 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                        ¡Pedido enviado!
                    </h2>
                    <p className="text-green-100">
                        Tu pedido está siendo preparado
                    </p>
                </div>
                
                {/* Order Details */}
                <div className="p-6">
                    {/* Order Number */}
                    <div className="text-center mb-6">
                        <p className="text-sm text-gray-500 mb-1">Número de pedido</p>
                        <p className="text-3xl font-bold text-gray-900">{order.order_number}</p>
                    </div>
                    
                    {/* Estimated Time */}
                    {order.estimated_time_minutes && (
                        <div className="bg-orange-50 rounded-2xl p-4 flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                                <Clock className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-sm text-orange-600">Tiempo estimado</p>
                                <p className="text-xl font-bold text-orange-700">
                                    {order.estimated_time_minutes} minutos
                                </p>
                            </div>
                        </div>
                    )}
                    
                    {/* Items Summary */}
                    <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                        <div className="flex items-center gap-2 mb-3">
                            <ChefHat className="w-5 h-5 text-gray-600" />
                            <p className="font-semibold text-gray-900">Tu pedido</p>
                        </div>
                        <div className="space-y-2">
                            {order.items.map(item => (
                                <div key={item.id} className="flex justify-between text-sm">
                                    <span className="text-gray-600">
                                        {item.quantity}x {item.menu_item_name}
                                    </span>
                                    <span className="text-gray-400 capitalize">
                                        {item.status === 'pending' ? 'En cola' : item.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Info */}
                    <p className="text-center text-sm text-gray-500 mb-4">
                        Te avisaremos cuando tu pedido esté listo
                    </p>
                    
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-900 text-white font-semibold py-4 rounded-2xl hover:bg-gray-800 active:scale-[0.98] transition-all"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}
