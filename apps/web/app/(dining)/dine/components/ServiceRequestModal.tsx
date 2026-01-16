'use client';

/**
 * Service Request Modal Component
 * Modal for calling waiter or requesting bill
 */

import React, { useState } from 'react';
import { X, Bell, Receipt, Coffee, MessageSquare, Loader2, CheckCircle } from 'lucide-react';

interface ServiceRequestModalProps {
    type: 'waiter' | 'bill' | null;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (type: 'waiter' | 'bill' | 'refill' | 'custom', message?: string) => Promise<void>;
}

export function ServiceRequestModal({ type, isOpen, onClose, onSubmit }: ServiceRequestModalProps) {
    const [selectedType, setSelectedType] = useState<'waiter' | 'bill' | 'refill' | 'custom'>(type || 'waiter');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    
    const requestTypes = [
        { 
            id: 'waiter' as const, 
            icon: Bell, 
            label: 'Llamar mesero', 
            description: 'Un mesero vendrá a tu mesa' 
        },
        { 
            id: 'bill' as const, 
            icon: Receipt, 
            label: 'Pedir la cuenta', 
            description: 'Solicitar el cierre de la cuenta' 
        },
        { 
            id: 'refill' as const, 
            icon: Coffee, 
            label: 'Rellenar bebidas', 
            description: 'Solicitar recarga de bebidas' 
        },
        { 
            id: 'custom' as const, 
            icon: MessageSquare, 
            label: 'Otro', 
            description: 'Enviar un mensaje personalizado' 
        },
    ];
    
    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await onSubmit(selectedType, selectedType === 'custom' ? message : undefined);
            setIsSuccess(true);
            setTimeout(() => {
                onClose();
                setIsSuccess(false);
                setMessage('');
            }, 2000);
        } catch (error) {
            // Error handling could be added here
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (!isOpen) return null;
    
    // Success State
    if (isSuccess) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-3xl max-w-sm w-full p-8 text-center animate-in zoom-in-95">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        ¡Solicitud enviada!
                    </h3>
                    <p className="text-gray-500">
                        {selectedType === 'waiter' && 'Un mesero viene en camino'}
                        {selectedType === 'bill' && 'Te traerán la cuenta pronto'}
                        {selectedType === 'refill' && 'Recargaremos tus bebidas'}
                        {selectedType === 'custom' && 'Recibimos tu mensaje'}
                    </p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">
                        ¿Cómo podemos ayudarte?
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
                    >
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
                
                {/* Request Type Options */}
                <div className="p-4 space-y-2">
                    {requestTypes.map(option => {
                        const Icon = option.icon;
                        const isSelected = selectedType === option.id;
                        
                        return (
                            <button
                                key={option.id}
                                onClick={() => setSelectedType(option.id)}
                                className={`
                                    w-full flex items-center gap-4 p-4 rounded-2xl transition-all
                                    ${isSelected 
                                        ? 'bg-orange-50 border-2 border-orange-500' 
                                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                                    }
                                `}
                            >
                                <div className={`
                                    w-12 h-12 rounded-full flex items-center justify-center
                                    ${isSelected ? 'bg-orange-500 text-white' : 'bg-white text-gray-600'}
                                `}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <p className={`font-semibold ${isSelected ? 'text-orange-700' : 'text-gray-900'}`}>
                                        {option.label}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {option.description}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
                
                {/* Custom Message Input */}
                {selectedType === 'custom' && (
                    <div className="px-4 pb-4">
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Escribe tu solicitud..."
                            maxLength={200}
                            className="w-full p-4 border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                            rows={3}
                        />
                    </div>
                )}
                
                {/* Submit Button */}
                <div className="p-4 border-t border-gray-100 safe-bottom">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || (selectedType === 'custom' && !message.trim())}
                        className="w-full bg-orange-500 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            'Enviar solicitud'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
