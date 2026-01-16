'use client';

/**
 * Dining Header Component
 * Simple header for the self-service dining experience
 */

import React from 'react';
import { Bell, Receipt, User } from 'lucide-react';
import { useDining } from '../context';

interface DiningHeaderProps {
    onCallWaiter: () => void;
    onRequestBill: () => void;
}

export function DiningHeader({ onCallWaiter, onRequestBill }: DiningHeaderProps) {
    const { session, menu } = useDining();
    
    return (
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3">
                {/* Restaurant Info */}
                <div className="flex items-center gap-3">
                    {menu?.logo_url ? (
                        <img 
                            src={menu.logo_url} 
                            alt={menu.restaurant_name}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <span className="text-orange-600 font-bold text-lg">
                                {menu?.restaurant_name?.charAt(0) || 'R'}
                            </span>
                        </div>
                    )}
                    <div>
                        <h1 className="font-semibold text-gray-900 text-sm">
                            {menu?.restaurant_name || 'Restaurante'}
                        </h1>
                        <p className="text-xs text-gray-500">
                            Mesa {session?.table_number || '-'}
                        </p>
                    </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    {/* Call Waiter Button */}
                    <button
                        onClick={onCallWaiter}
                        className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 text-orange-600 rounded-full text-sm font-medium hover:bg-orange-100 transition-colors"
                    >
                        <Bell className="w-4 h-4" />
                        <span className="hidden sm:inline">Mesero</span>
                    </button>
                    
                    {/* Request Bill Button */}
                    <button
                        onClick={onRequestBill}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                        <Receipt className="w-4 h-4" />
                        <span className="hidden sm:inline">Cuenta</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
