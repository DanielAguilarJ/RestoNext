'use client';

/**
 * Service Request Popup Component
 * Shows popup notifications for service requests from self-service tablets
 * Used in POS/Cashier/Waiter views
 */

import React, { useState, useEffect } from 'react';
import { X, Bell, Receipt, Coffee, MessageSquare, Check, Clock } from 'lucide-react';
import { useServiceSocket, ServiceRequestNotification } from '@/hooks/useServiceSocket';

interface ServiceRequestPopupProps {
    onResolve?: (requestId: string) => void;
}

export function ServiceRequestPopup({ onResolve }: ServiceRequestPopupProps) {
    const { pendingRequests, clearRequest, isConnected } = useServiceSocket({
        playSound: true
    });

    const [expandedRequest, setExpandedRequest] = useState<string | null>(null);

    const handleResolve = async (request: ServiceRequestNotification) => {
        // Call API to mark as resolved
        try {
            // TODO: Call API endpoint to resolve request
            // await api.resolveServiceRequest(request.id);
            
            clearRequest(request.id);
            onResolve?.(request.id);
        } catch (error) {
            console.error('Error resolving request:', error);
        }
    };

    const getRequestIcon = (type: string) => {
        const icons: Record<string, React.ReactNode> = {
            'waiter': <Bell className="w-5 h-5" />,
            'bill': <Receipt className="w-5 h-5" />,
            'refill': <Coffee className="w-5 h-5" />,
            'custom': <MessageSquare className="w-5 h-5" />
        };
        return icons[type] || <Bell className="w-5 h-5" />;
    };

    const getRequestLabel = (type: string) => {
        const labels: Record<string, string> = {
            'waiter': 'Llamando mesero',
            'bill': 'Pide la cuenta',
            'refill': 'Recarga bebidas',
            'custom': 'Solicitud'
        };
        return labels[type] || 'Solicitud';
    };

    const getRequestColor = (type: string) => {
        const colors: Record<string, string> = {
            'waiter': 'bg-orange-500',
            'bill': 'bg-green-500',
            'refill': 'bg-blue-500',
            'custom': 'bg-purple-500'
        };
        return colors[type] || 'bg-gray-500';
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    };

    if (pendingRequests.length === 0) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
            {/* Connection Status Indicator */}
            {!isConnected && (
                <div className="bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full flex items-center gap-1 self-end">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    Desconectado
                </div>
            )}

            {/* Service Request Cards */}
            {pendingRequests.map(request => (
                <div
                    key={request.id}
                    className={`
                        bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden
                        animate-in slide-in-from-right duration-300
                        ${expandedRequest === request.id ? 'ring-2 ring-orange-500' : ''}
                    `}
                >
                    {/* Header */}
                    <div 
                        className={`${getRequestColor(request.request_type)} text-white px-4 py-2 flex items-center justify-between cursor-pointer`}
                        onClick={() => setExpandedRequest(
                            expandedRequest === request.id ? null : request.id
                        )}
                    >
                        <div className="flex items-center gap-2">
                            {getRequestIcon(request.request_type)}
                            <span className="font-semibold">
                                Mesa {request.table_number}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 opacity-80" />
                            <span className="text-sm opacity-90">
                                {formatTime(request.created_at)}
                            </span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                        <p className="font-medium text-gray-900 mb-1">
                            {getRequestLabel(request.request_type)}
                        </p>
                        
                        {request.message && (
                            <p className="text-sm text-gray-500 mb-3">
                                "{request.message}"
                            </p>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleResolve(request)}
                                className="flex-1 bg-green-500 text-white font-medium py-2 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 active:scale-95 transition-all"
                            >
                                <Check className="w-4 h-4" />
                                Atender
                            </button>
                            <button
                                onClick={() => clearRequest(request.id)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            {/* Summary Badge (when multiple requests) */}
            {pendingRequests.length > 1 && (
                <div className="bg-orange-500 text-white text-sm font-medium px-4 py-2 rounded-full self-end shadow-lg animate-pulse">
                    {pendingRequests.length} solicitudes pendientes
                </div>
            )}
        </div>
    );
}
