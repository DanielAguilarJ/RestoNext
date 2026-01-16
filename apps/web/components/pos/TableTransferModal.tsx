/**
 * Table Transfer Modal
 * Quick modal for moving orders between tables
 * 
 * Features:
 * - Visual grid of free tables
 * - Large touch targets for fast selection
 * - Confirmation before transfer
 * - Real-time free table list
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ArrowRight, Check, Info } from "lucide-react";

interface FreeTable {
    id: string;
    number: number;
    capacity: number;
}

interface TableTransferModalProps {
    isOpen: boolean;
    sourceTable: { id: string; number: number } | null;
    onClose: () => void;
    onTransfer: (sourceId: string, destId: string) => Promise<boolean>;
    fetchFreeTables: () => Promise<FreeTable[]>;
}

export function TableTransferModal({
    isOpen,
    sourceTable,
    onClose,
    onTransfer,
    fetchFreeTables,
}: TableTransferModalProps) {
    const [freeTables, setFreeTables] = useState<FreeTable[]>([]);
    const [selectedTable, setSelectedTable] = useState<FreeTable | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTransferring, setIsTransferring] = useState(false);
    const [step, setStep] = useState<'select' | 'confirm'>('select');

    // Load free tables
    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            setSelectedTable(null);
            setStep('select');

            fetchFreeTables()
                .then(setFreeTables)
                .catch(console.error)
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, fetchFreeTables]);

    const handleSelectTable = useCallback((table: FreeTable) => {
        setSelectedTable(table);
        setStep('confirm');
    }, []);

    const handleConfirmTransfer = useCallback(async () => {
        if (!sourceTable || !selectedTable) return;

        setIsTransferring(true);
        try {
            const success = await onTransfer(sourceTable.id, selectedTable.id);
            if (success) {
                onClose();
            }
        } finally {
            setIsTransferring(false);
        }
    }, [sourceTable, selectedTable, onTransfer, onClose]);

    const handleBack = useCallback(() => {
        setStep('select');
        setSelectedTable(null);
    }, []);

    if (!isOpen || !sourceTable) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-lg font-bold">Mover Mesa</h2>
                        <p className="text-sm text-gray-500">
                            Mesa {sourceTable.number} → {selectedTable ? `Mesa ${selectedTable.number}` : 'Selecciona destino'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {step === 'select' && (
                        <>
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-8 h-8 border-3 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                                </div>
                            ) : freeTables.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p className="font-medium">No hay mesas libres</p>
                                    <p className="text-sm mt-1">Libera una mesa primero</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-3">
                                    {freeTables.map((table) => (
                                        <button
                                            key={table.id}
                                            onClick={() => handleSelectTable(table)}
                                            className={`
                                                p-4 rounded-xl text-center
                                                bg-green-50 dark:bg-green-900/20
                                                hover:bg-green-100 dark:hover:bg-green-900/40
                                                border-2 border-green-200 dark:border-green-800
                                                hover:border-green-400 dark:hover:border-green-600
                                                transition-all duration-200
                                                active:scale-95
                                                min-h-[80px]
                                            `}
                                        >
                                            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                                                {table.number}
                                            </div>
                                            <div className="text-xs text-green-600 dark:text-green-500 mt-1">
                                                {table.capacity} personas
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {step === 'confirm' && selectedTable && (
                        <div className="py-6">
                            {/* Visual Transfer */}
                            <div className="flex items-center justify-center gap-4 mb-6">
                                <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <span className="text-3xl font-bold text-gray-600 dark:text-gray-400">
                                        {sourceTable.number}
                                    </span>
                                </div>
                                <ArrowRight className="w-8 h-8 text-brand-500" />
                                <div className="w-20 h-20 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center ring-2 ring-green-500">
                                    <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                                        {selectedTable.number}
                                    </span>
                                </div>
                            </div>

                            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                                ¿Mover todos los pedidos de la Mesa {sourceTable.number} a la Mesa {selectedTable.number}?
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleBack}
                                    disabled={isTransferring}
                                    className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 dark:border-gray-700
                                             hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                                             disabled:opacity-50"
                                >
                                    Cambiar
                                </button>
                                <button
                                    onClick={handleConfirmTransfer}
                                    disabled={isTransferring}
                                    className="flex-1 py-3 px-4 rounded-xl bg-brand-500 text-white
                                             hover:bg-brand-600 transition-colors
                                             disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isTransferring ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Moviendo...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Confirmar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
