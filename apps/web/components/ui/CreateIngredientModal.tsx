
"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { inventoryApi } from "../../lib/api";

type UnitOfMeasure = 'kg' | 'g' | 'lt' | 'ml' | 'pza' | 'porcion';

interface CreateIngredientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function CreateIngredientModal({ isOpen, onClose, onSuccess }: CreateIngredientModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        unit: 'kg' as UnitOfMeasure,
        min_stock_alert: 0,
        cost_per_unit: 0
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await inventoryApi.create({
                ...formData,
                is_active: true
            });
            onSuccess();
            onClose();
            // Reset form
            setFormData({
                name: '',
                sku: '',
                unit: 'kg',
                min_stock_alert: 0,
                cost_per_unit: 0
            });
        } catch (err: any) {
            setError(err.message || 'Failed to create ingredient');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nuevo Insumo">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nombre *
                    </label>
                    <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input-premium"
                        placeholder="Ej. Jitomate Bola"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            SKU (Opcional)
                        </label>
                        <input
                            type="text"
                            value={formData.sku}
                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                            className="input-premium"
                            placeholder="COD-123"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Unidad *
                        </label>
                        <select
                            value={formData.unit}
                            onChange={(e) => setFormData({ ...formData, unit: e.target.value as UnitOfMeasure })}
                            className="input-premium"
                        >
                            <option value="kg">Kilogramo (kg)</option>
                            <option value="g">Gramo (g)</option>
                            <option value="lt">Litro (l)</option>
                            <option value="ml">Mililitro (ml)</option>
                            <option value="pza">Pieza (pza)</option>
                            <option value="porcion">Porción</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Stock Mínimo *
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.min_stock_alert}
                            onChange={(e) => setFormData({ ...formData, min_stock_alert: parseFloat(e.target.value) })}
                            className="input-premium"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Costo Unitario ($) *
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.cost_per_unit}
                            onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) })}
                            className="input-premium"
                        />
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary"
                    >
                        {loading ? 'Creando...' : 'Guardar Insumo'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
