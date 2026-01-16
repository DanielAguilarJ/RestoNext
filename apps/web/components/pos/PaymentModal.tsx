'use client';

import React, { useState, useMemo } from 'react';
import { X, CreditCard, Banknote, Send, Wallet, DollarSign, Gift, CheckCircle } from 'lucide-react';

// ============================================
// Types
// ============================================

export type PaymentMethod = 'cash' | 'card' | 'transfer';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderTotal: number;
    tableNumber: number | string;
    onProcessPayment: (data: PaymentData) => Promise<void>;
}

export interface PaymentData {
    payment_method: PaymentMethod;
    amount: number;
    tip_amount: number;
    reference?: string;
}

// Suggested tip percentages
const TIP_PERCENTAGES = [10, 15, 20];

// ============================================
// Component
// ============================================

export function PaymentModal({
    isOpen,
    onClose,
    orderTotal,
    tableNumber,
    onProcessPayment
}: PaymentModalProps) {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [tipPercentage, setTipPercentage] = useState<number | null>(15);
    const [customTip, setCustomTip] = useState<string>('');
    const [reference, setReference] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    // Calculate tip amount
    const tipAmount = useMemo(() => {
        if (customTip) {
            const parsed = parseFloat(customTip);
            return isNaN(parsed) ? 0 : parsed;
        }
        if (tipPercentage !== null) {
            return (orderTotal * tipPercentage) / 100;
        }
        return 0;
    }, [orderTotal, tipPercentage, customTip]);

    // Calculate grand total
    const grandTotal = orderTotal + tipAmount;

    const handleTipPercentageClick = (percentage: number) => {
        setTipPercentage(percentage);
        setCustomTip('');
    };

    const handleCustomTipChange = (value: string) => {
        setCustomTip(value);
        setTipPercentage(null);
    };

    const handleSubmit = async () => {
        setIsProcessing(true);
        try {
            await onProcessPayment({
                payment_method: paymentMethod,
                amount: grandTotal,
                tip_amount: tipAmount,
                reference: reference || undefined,
            });
            setIsComplete(true);
        } catch (error) {
            console.error('Payment failed:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClose = () => {
        // Reset state
        setPaymentMethod('cash');
        setTipPercentage(15);
        setCustomTip('');
        setReference('');
        setIsComplete(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-700">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white">Cobrar Pedido</h2>
                            <p className="text-emerald-100 text-sm mt-0.5">
                                Mesa {tableNumber}
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                {isComplete ? (
                    /* Success State */
                    <div className="p-8 text-center space-y-4">
                        <div className="w-20 h-20 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-10 h-10 text-emerald-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white">¡Pago Completado!</h3>
                        <p className="text-gray-400">
                            El pago de ${grandTotal.toFixed(2)} ha sido procesado correctamente.
                        </p>
                        <button
                            onClick={handleClose}
                            className="mt-6 w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-medium transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="p-6 space-y-6">
                            {/* Order Total */}
                            <div className="bg-gray-800/50 rounded-xl p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-400">Subtotal</span>
                                    <span className="text-lg text-white font-medium">
                                        ${orderTotal.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                                    <span className="text-gray-400 flex items-center gap-2">
                                        <Gift className="w-4 h-4 text-amber-400" />
                                        Propina
                                    </span>
                                    <span className="text-lg text-amber-400 font-medium">
                                        ${tipAmount.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mt-3">
                                    <span className="text-white font-bold text-lg">Total a Cobrar</span>
                                    <span className="text-2xl text-emerald-400 font-bold">
                                        ${grandTotal.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Tip Selection */}
                            <div>
                                <label className="block text-gray-400 text-sm mb-3 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4" />
                                    Propina
                                </label>

                                <div className="grid grid-cols-4 gap-2 mb-3">
                                    {TIP_PERCENTAGES.map((pct) => (
                                        <button
                                            key={pct}
                                            onClick={() => handleTipPercentageClick(pct)}
                                            className={`
                                                py-3 rounded-xl font-medium transition-all
                                                ${tipPercentage === pct && !customTip
                                                    ? 'bg-amber-500 text-white'
                                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                                }
                                            `}
                                        >
                                            {pct}%
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => handleTipPercentageClick(0)}
                                        className={`
                                            py-3 rounded-xl font-medium transition-all
                                            ${tipPercentage === 0 && !customTip
                                                ? 'bg-gray-600 text-white'
                                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                            }
                                        `}
                                    >
                                        Sin
                                    </button>
                                </div>

                                {/* Custom Tip Input */}
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                    <input
                                        type="number"
                                        placeholder="Propina personalizada..."
                                        value={customTip}
                                        onChange={(e) => handleCustomTipChange(e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-8 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div>
                                <label className="block text-gray-400 text-sm mb-3">
                                    Método de Pago
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        onClick={() => setPaymentMethod('cash')}
                                        className={`
                                            p-4 rounded-xl font-medium transition-all flex flex-col items-center gap-2
                                            ${paymentMethod === 'cash'
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                            }
                                        `}
                                    >
                                        <Banknote className="w-6 h-6" />
                                        <span>Efectivo</span>
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('card')}
                                        className={`
                                            p-4 rounded-xl font-medium transition-all flex flex-col items-center gap-2
                                            ${paymentMethod === 'card'
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                            }
                                        `}
                                    >
                                        <CreditCard className="w-6 h-6" />
                                        <span>Tarjeta</span>
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('transfer')}
                                        className={`
                                            p-4 rounded-xl font-medium transition-all flex flex-col items-center gap-2
                                            ${paymentMethod === 'transfer'
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                            }
                                        `}
                                    >
                                        <Wallet className="w-6 h-6" />
                                        <span>Transfer</span>
                                    </button>
                                </div>
                            </div>

                            {/* Reference (for card/transfer) */}
                            {paymentMethod !== 'cash' && (
                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">
                                        Referencia {paymentMethod === 'card' ? '(últimos 4 dígitos)' : '(opcional)'}
                                    </label>
                                    <input
                                        type="text"
                                        placeholder={paymentMethod === 'card' ? 'XXXX' : 'ID de transacción'}
                                        value={reference}
                                        onChange={(e) => setReference(e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        maxLength={paymentMethod === 'card' ? 4 : 50}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Footer - Process Button */}
                        <div className="p-6 border-t border-gray-700">
                            <button
                                onClick={handleSubmit}
                                disabled={isProcessing}
                                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 
                                         disabled:opacity-50 disabled:cursor-not-allowed
                                         rounded-xl text-white font-bold text-lg transition-all flex items-center justify-center gap-3
                                         shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        Cobrar ${grandTotal.toFixed(2)}
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default PaymentModal;
