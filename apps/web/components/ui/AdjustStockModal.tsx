
"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { inventoryApi, Ingredient } from "../../lib/api";
import { ArrowUpCircle, ArrowDownCircle, Trash2, Clipboard } from "lucide-react";

interface AdjustStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    ingredient: Ingredient | null;
}

type TransactionType = 'purchase' | 'sale' | 'waste' | 'adjustment';

export function AdjustStockModal({ isOpen, onClose, onSuccess, ingredient }: AdjustStockModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [type, setType] = useState<TransactionType>('purchase');
    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');

    if (!ingredient) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Logic: Backend handles the sign (+/-) based on transaction type if implemented correctly,
            // OR we send negative for exits. Looking at backend code 'update_stock':
            // "if transaction_type in [SALE, WASTE]: quantity = -abs(quantity)"
            // So we just send positive quantity and let backend handle logic.

            await inventoryApi.adjustStock(
                ingredient.id,
                parseFloat(quantity),
                type,
                notes
            );
            onSuccess();
            onClose();
            setQuantity('');
            setNotes('');
            setType('purchase');
        } catch (err: any) {
            setError(err.message || 'Failed to adjust stock');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Ajustar Stock: ${ingredient.name}`}>
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {/* Type Selection */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setType('purchase')}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${type === 'purchase'
                                ? 'bg-green-50 border-green-200 text-green-700'
                                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                            }`}
                    >
                        <ArrowUpCircle className="w-6 h-6" />
                        <span className="text-sm font-medium">Compra / Entrada</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setType('waste')}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${type === 'waste'
                                ? 'bg-red-50 border-red-200 text-red-700'
                                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                            }`}
                    >
                        <Trash2 className="w-6 h-6" />
                        <span className="text-sm font-medium">Merma / Desperdicio</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setType('adjustment')}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${type === 'adjustment'
                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                            }`}
                    >
                        <Clipboard className="w-6 h-6" />
                        <span className="text-sm font-medium">Corrección Manual</span>
                    </button>
                </div>

                {/* Quantity Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Cantidad ({ingredient.unit})
                    </label>
                    <div className="relative">
                        <input
                            required
                            type="number"
                            min="0.001"
                            step="any"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="input-premium text-2xl font-bold text-center"
                            placeholder="0.00"
                            autoFocus
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                            {ingredient.unit}
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                        Stock Actual: {ingredient.stock_quantity} {ingredient.unit}
                    </p>
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Notas (Opcional)
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="input-premium min-h-[80px]"
                        placeholder="Razón del ajuste..."
                    />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !quantity}
                        className={`btn-primary w-full sm:w-auto ${type === 'waste' ? 'bg-red-600 hover:bg-red-700' :
                                type === 'purchase' ? 'bg-green-600 hover:bg-green-700' : ''
                            }`}
                    >
                        {loading ? 'Procesando...' : 'Confirmar Ajuste'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
