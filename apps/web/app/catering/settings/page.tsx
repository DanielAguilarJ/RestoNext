'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Settings,
    ArrowLeft,
    Package,
    DollarSign,
    Calendar,
    Users,
    Mail,
    Bell,
    FileText,
    Plus,
    Trash2,
    Edit2,
    Save,
    Loader2,
    ChefHat,
    CheckCircle2,
    AlertCircle,
    Building2,
    Percent,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { cateringApi, type CateringPackage } from '@/lib/api';

// ============================================
// Catering Settings Page
// ============================================

type TabId = 'packages' | 'pricing' | 'notifications' | 'documents';

interface PricingConfig {
    defaultTaxRate: number;
    serviceChargePercent: number;
    depositPercent: number;
    minimumGuests: number;
    minimumOrderValue: number;
}

interface NotificationConfig {
    emailConfirmations: boolean;
    emailReminders: boolean;
    reminderDaysBefore: number;
    sendProductionAlerts: boolean;
    sendPaymentReminders: boolean;
}

// ============================================
// Package Form Modal Component
// ============================================

interface PackageFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingPackage: CateringPackage | null;
    onSave: (pkg: CateringPackage) => Promise<void>;
}

interface PackageFormItem {
    menu_item_id: string;
    name: string;
    quantity: number;
    unit_price: number;
}

function PackageFormModal({ isOpen, onClose, editingPackage, onSave }: PackageFormModalProps) {
    const [name, setName] = useState(editingPackage?.name || '');
    const [description, setDescription] = useState(editingPackage?.description || '');
    const [category, setCategory] = useState(editingPackage?.category || '');
    const [basePricePerPerson, setBasePricePerPerson] = useState(editingPackage?.base_price_per_person || 0);
    const [minGuests, setMinGuests] = useState(editingPackage?.min_guests || 20);
    const [maxGuests, setMaxGuests] = useState(editingPackage?.max_guests || 100);
    const [items, setItems] = useState<PackageFormItem[]>(editingPackage?.items || []);
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState(0);
    const [newItemQty, setNewItemQty] = useState(1);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Category options
    const categories = [
        { value: 'corporativo', label: 'Corporativo' },
        { value: 'social', label: 'Social' },
        { value: 'bodas', label: 'Bodas' },
        { value: 'quinceañera', label: 'Quinceañera' },
        { value: 'infantil', label: 'Infantil' },
        { value: 'graduacion', label: 'Graduación' },
    ];

    const addItem = () => {
        if (!newItemName.trim()) return;

        const newItem: PackageFormItem = {
            menu_item_id: `temp-${Date.now()}`, // Temporary ID, backend will assign real one
            name: newItemName.trim(),
            quantity: newItemQty,
            unit_price: newItemPrice,
        };

        setItems([...items, newItem]);
        setNewItemName('');
        setNewItemPrice(0);
        setNewItemQty(1);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItemQty = (index: number, qty: number) => {
        setItems(items.map((item, i) =>
            i === index ? { ...item, quantity: qty } : item
        ));
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            setError('El nombre del paquete es requerido');
            return;
        }

        if (basePricePerPerson <= 0) {
            setError('El precio base por persona debe ser mayor a 0');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            let result: CateringPackage;

            if (editingPackage) {
                // For now, we'll create a new package since update API might not exist
                result = { ...editingPackage, name, description, category, base_price_per_person: basePricePerPerson, min_guests: minGuests, max_guests: maxGuests, items };
            } else {
                result = await cateringApi.createPackage({
                    name: name.trim(),
                    description: description.trim() || undefined,
                    category: category || undefined,
                    base_price_per_person: basePricePerPerson,
                    min_guests: minGuests,
                    max_guests: maxGuests,
                    items: items.map(item => ({
                        menu_item_id: item.menu_item_id.startsWith('temp-') ? '' : item.menu_item_id,
                        name: item.name,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                    })),
                });
            }

            await onSave(result);
        } catch (err: any) {
            console.error('Error saving package:', err);
            setError(err.message || 'Error al guardar el paquete');
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-neutral-900 rounded-2xl border border-neutral-800 w-full max-w-2xl overflow-hidden my-4"
            >
                {/* Header */}
                <div className="p-6 border-b border-neutral-800">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Package className="w-5 h-5 text-purple-500" />
                        {editingPackage ? 'Editar Paquete' : 'Nuevo Paquete de Catering'}
                    </h3>
                </div>

                {/* Form */}
                <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                            Nombre del Paquete *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Paquete Ejecutivo Premium"
                            className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 
                                text-white placeholder-neutral-500 focus:border-purple-500 outline-none"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                            Descripción
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe lo que incluye este paquete..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 
                                text-white placeholder-neutral-500 focus:border-purple-500 outline-none resize-none"
                        />
                    </div>

                    {/* Category and Price Row */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">
                                Categoría
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 
                                    text-white focus:border-purple-500 outline-none"
                            >
                                <option value="">Sin categoría</option>
                                {categories.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">
                                Precio Base por Persona *
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                                <input
                                    type="number"
                                    value={basePricePerPerson}
                                    onChange={(e) => setBasePricePerPerson(Number(e.target.value))}
                                    min={0}
                                    className="w-full pl-8 pr-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 
                                        text-white focus:border-purple-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Guest Limits */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">
                                Mínimo de Invitados
                            </label>
                            <input
                                type="number"
                                value={minGuests}
                                onChange={(e) => setMinGuests(Number(e.target.value))}
                                min={1}
                                className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 
                                    text-white focus:border-purple-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">
                                Máximo de Invitados
                            </label>
                            <input
                                type="number"
                                value={maxGuests}
                                onChange={(e) => setMaxGuests(Number(e.target.value))}
                                min={minGuests}
                                className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 
                                    text-white focus:border-purple-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Package Items */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-3">
                            Items Incluidos
                        </label>

                        {/* Add Item Row */}
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                placeholder="Nombre del item"
                                className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 
                                    text-white placeholder-neutral-500 focus:border-purple-500 outline-none text-sm"
                            />
                            <input
                                type="number"
                                value={newItemQty}
                                onChange={(e) => setNewItemQty(Number(e.target.value))}
                                min={1}
                                placeholder="Cant"
                                className="w-20 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 
                                    text-white focus:border-purple-500 outline-none text-sm text-center"
                            />
                            <input
                                type="number"
                                value={newItemPrice}
                                onChange={(e) => setNewItemPrice(Number(e.target.value))}
                                min={0}
                                placeholder="Precio"
                                className="w-24 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 
                                    text-white focus:border-purple-500 outline-none text-sm"
                            />
                            <button
                                type="button"
                                onClick={addItem}
                                className="px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Items List */}
                        {items.length > 0 ? (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 p-3 rounded-lg bg-neutral-800/50 border border-neutral-700"
                                    >
                                        <div className="flex-1">
                                            <span className="text-white text-sm">{item.name}</span>
                                            <span className="text-neutral-500 text-xs ml-2">
                                                {formatCurrency(item.unit_price)}
                                            </span>
                                        </div>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => updateItemQty(index, Number(e.target.value))}
                                            min={1}
                                            className="w-16 px-2 py-1 rounded bg-neutral-700 border border-neutral-600 
                                                text-white text-sm text-center"
                                        />
                                        <button
                                            onClick={() => removeItem(index)}
                                            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 rounded-lg border border-dashed border-neutral-700 text-center">
                                <p className="text-sm text-neutral-500">
                                    Agrega items al paquete usando el formulario arriba
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-neutral-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 transition disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 rounded-lg bg-purple-600 text-white 
                            hover:bg-purple-500 transition disabled:opacity-50"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {editingPackage ? 'Actualizar' : 'Crear Paquete'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ============================================
// Template Customization Modal Component
// ============================================

type TemplateType = 'proposal' | 'beo' | 'production' | 'contract';

interface TemplateConfig {
    logoUrl: string;
    companyName: string;
    companyAddress: string;
    companyPhone: string;
    companyEmail: string;
    primaryColor: string;
    secondaryColor: string;
    headerText: string;
    footerText: string;
    termsAndConditions: string;
}

interface TemplateCustomizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    templateType: TemplateType;
    config: TemplateConfig;
    onSave: (config: TemplateConfig) => Promise<void>;
}

const templateLabels: Record<TemplateType, { title: string; description: string; icon: string }> = {
    proposal: {
        title: 'Plantilla de Propuesta',
        description: 'Personaliza el diseño de tus cotizaciones y propuestas',
        icon: 'amber',
    },
    beo: {
        title: 'Plantilla de BEO',
        description: 'Personaliza la Orden de Evento de Banquete',
        icon: 'blue',
    },
    production: {
        title: 'Hoja de Producción',
        description: 'Personaliza la lista de ingredientes y preparación',
        icon: 'emerald',
    },
    contract: {
        title: 'Contrato de Servicio',
        description: 'Personaliza los términos y condiciones',
        icon: 'purple',
    },
};

function TemplateCustomizationModal({
    isOpen,
    onClose,
    templateType,
    config: initialConfig,
    onSave
}: TemplateCustomizationModalProps) {
    const [config, setConfig] = useState<TemplateConfig>(initialConfig);
    const [activeSection, setActiveSection] = useState<'branding' | 'content' | 'preview'>('branding');
    const [saving, setSaving] = useState(false);

    const templateInfo = templateLabels[templateType];

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(config);
            onClose();
        } catch (error) {
            console.error('Error saving template:', error);
        } finally {
            setSaving(false);
        }
    };

    const updateConfig = (field: keyof TemplateConfig, value: string) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-neutral-900 rounded-2xl border border-neutral-800 w-full max-w-4xl overflow-hidden my-4"
            >
                {/* Header */}
                <div className="p-6 border-b border-neutral-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-semibold text-white">{templateInfo.title}</h3>
                            <p className="text-sm text-neutral-400 mt-1">{templateInfo.description}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Section Tabs */}
                    <div className="flex gap-2 mt-4">
                        {[
                            { id: 'branding', label: 'Marca' },
                            { id: 'content', label: 'Contenido' },
                            { id: 'preview', label: 'Vista Previa' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSection(tab.id as typeof activeSection)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeSection === tab.id
                                    ? 'bg-purple-600 text-white'
                                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {activeSection === 'branding' && (
                        <div className="space-y-6">
                            {/* Company Info */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                                        Nombre de la Empresa
                                    </label>
                                    <input
                                        type="text"
                                        value={config.companyName}
                                        onChange={(e) => updateConfig('companyName', e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 
                                            text-white focus:border-purple-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                                        URL del Logo
                                    </label>
                                    <input
                                        type="text"
                                        value={config.logoUrl}
                                        onChange={(e) => updateConfig('logoUrl', e.target.value)}
                                        placeholder="https://..."
                                        className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 
                                            text-white placeholder-neutral-500 focus:border-purple-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-300 mb-2">
                                    Dirección
                                </label>
                                <input
                                    type="text"
                                    value={config.companyAddress}
                                    onChange={(e) => updateConfig('companyAddress', e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 
                                        text-white focus:border-purple-500 outline-none"
                                />
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                                        Teléfono
                                    </label>
                                    <input
                                        type="text"
                                        value={config.companyPhone}
                                        onChange={(e) => updateConfig('companyPhone', e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 
                                            text-white focus:border-purple-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                                        Email de Contacto
                                    </label>
                                    <input
                                        type="email"
                                        value={config.companyEmail}
                                        onChange={(e) => updateConfig('companyEmail', e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 
                                            text-white focus:border-purple-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Colors */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                                        Color Primario
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={config.primaryColor}
                                            onChange={(e) => updateConfig('primaryColor', e.target.value)}
                                            className="w-12 h-12 rounded-lg cursor-pointer bg-transparent"
                                        />
                                        <input
                                            type="text"
                                            value={config.primaryColor}
                                            onChange={(e) => updateConfig('primaryColor', e.target.value)}
                                            className="flex-1 px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 
                                                text-white focus:border-purple-500 outline-none uppercase"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                                        Color Secundario
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={config.secondaryColor}
                                            onChange={(e) => updateConfig('secondaryColor', e.target.value)}
                                            className="w-12 h-12 rounded-lg cursor-pointer bg-transparent"
                                        />
                                        <input
                                            type="text"
                                            value={config.secondaryColor}
                                            onChange={(e) => updateConfig('secondaryColor', e.target.value)}
                                            className="flex-1 px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 
                                                text-white focus:border-purple-500 outline-none uppercase"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'content' && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-neutral-300 mb-2">
                                    Texto de Encabezado
                                </label>
                                <textarea
                                    value={config.headerText}
                                    onChange={(e) => updateConfig('headerText', e.target.value)}
                                    rows={2}
                                    placeholder="Texto que aparecerá en la parte superior del documento"
                                    className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 
                                        text-white placeholder-neutral-500 focus:border-purple-500 outline-none resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-300 mb-2">
                                    Texto de Pie de Página
                                </label>
                                <textarea
                                    value={config.footerText}
                                    onChange={(e) => updateConfig('footerText', e.target.value)}
                                    rows={2}
                                    placeholder="Texto que aparecerá en la parte inferior del documento"
                                    className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 
                                        text-white placeholder-neutral-500 focus:border-purple-500 outline-none resize-none"
                                />
                            </div>

                            {(templateType === 'proposal' || templateType === 'contract') && (
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                                        Términos y Condiciones
                                    </label>
                                    <textarea
                                        value={config.termsAndConditions}
                                        onChange={(e) => updateConfig('termsAndConditions', e.target.value)}
                                        rows={8}
                                        placeholder="Ingresa los términos y condiciones que aplican..."
                                        className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 
                                            text-white placeholder-neutral-500 focus:border-purple-500 outline-none resize-none"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {activeSection === 'preview' && (
                        <div className="bg-white rounded-lg p-8 text-black">
                            {/* Preview Header */}
                            <div
                                className="border-b-4 pb-4 mb-6"
                                style={{ borderColor: config.primaryColor }}
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        {config.logoUrl ? (
                                            <img
                                                src={config.logoUrl}
                                                alt="Logo"
                                                className="h-16 mb-2"
                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                            />
                                        ) : (
                                            <div
                                                className="text-2xl font-bold mb-2"
                                                style={{ color: config.primaryColor }}
                                            >
                                                {config.companyName || 'Nombre de la Empresa'}
                                            </div>
                                        )}
                                        <div className="text-sm text-gray-600">
                                            {config.companyAddress && <p>{config.companyAddress}</p>}
                                            <p>
                                                {config.companyPhone && <span>{config.companyPhone}</span>}
                                                {config.companyPhone && config.companyEmail && <span> | </span>}
                                                {config.companyEmail && <span>{config.companyEmail}</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <h1
                                            className="text-xl font-bold"
                                            style={{ color: config.primaryColor }}
                                        >
                                            {templateInfo.title.replace('Plantilla de ', '').replace('Hoja de ', '')}
                                        </h1>
                                        <p className="text-sm text-gray-500">Fecha: {new Date().toLocaleDateString('es-MX')}</p>
                                        <p className="text-sm text-gray-500">Folio: PREVIEW-001</p>
                                    </div>
                                </div>
                                {config.headerText && (
                                    <p className="mt-4 text-sm text-gray-600 italic">{config.headerText}</p>
                                )}
                            </div>

                            {/* Preview Body Placeholder */}
                            <div className="space-y-4 my-8">
                                <div className="h-6 bg-gray-100 rounded w-3/4"></div>
                                <div className="h-6 bg-gray-100 rounded w-1/2"></div>
                                <div className="h-32 bg-gray-50 rounded border border-gray-200 flex items-center justify-center text-gray-400">
                                    [Contenido del documento]
                                </div>
                                <div className="h-6 bg-gray-100 rounded w-2/3"></div>
                            </div>

                            {/* Preview Footer */}
                            <div
                                className="border-t-2 pt-4 mt-8"
                                style={{ borderColor: config.secondaryColor }}
                            >
                                {config.footerText && (
                                    <p className="text-xs text-gray-500 mb-2">{config.footerText}</p>
                                )}
                                {config.termsAndConditions && (templateType === 'proposal' || templateType === 'contract') && (
                                    <div className="text-xs text-gray-400 mt-4">
                                        <p className="font-semibold text-gray-500 mb-1">Términos y Condiciones:</p>
                                        <p className="whitespace-pre-line">{config.termsAndConditions.substring(0, 200)}...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-neutral-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 transition disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 rounded-lg bg-purple-600 text-white 
                            hover:bg-purple-500 transition disabled:opacity-50"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Guardar Plantilla
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export default function CateringSettingsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabId>('packages');

    // Packages state
    const [packages, setPackages] = useState<CateringPackage[]>([]);
    const [packagesLoading, setPackagesLoading] = useState(true);
    const [packagesError, setPackagesError] = useState<string | null>(null);
    const [showPackageModal, setShowPackageModal] = useState(false);
    const [editingPackage, setEditingPackage] = useState<CateringPackage | null>(null);

    // Pricing config (mock for now - would come from API)
    const [pricingConfig, setPricingConfig] = useState<PricingConfig>({
        defaultTaxRate: 16,
        serviceChargePercent: 15,
        depositPercent: 50,
        minimumGuests: 20,
        minimumOrderValue: 5000,
    });
    const [pricingSaving, setPricingSaving] = useState(false);

    // Notification config
    const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>({
        emailConfirmations: true,
        emailReminders: true,
        reminderDaysBefore: 3,
        sendProductionAlerts: true,
        sendPaymentReminders: true,
    });
    const [notificationsSaving, setNotificationsSaving] = useState(false);

    // Template customization state
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [editingTemplateType, setEditingTemplateType] = useState<TemplateType>('proposal');
    const [templateConfigs, setTemplateConfigs] = useState<Record<TemplateType, TemplateConfig>>({
        proposal: {
            logoUrl: '',
            companyName: '',
            companyAddress: '',
            companyPhone: '',
            companyEmail: '',
            primaryColor: '#9333ea',
            secondaryColor: '#6366f1',
            headerText: '',
            footerText: 'Gracias por confiar en nosotros para su evento especial.',
            termsAndConditions: '1. El anticipo del 50% es necesario para confirmar la reservación.\n2. El saldo restante debe pagarse 7 días antes del evento.\n3. Cancelaciones con menos de 72 horas no son reembolsables.',
        },
        beo: {
            logoUrl: '',
            companyName: '',
            companyAddress: '',
            companyPhone: '',
            companyEmail: '',
            primaryColor: '#3b82f6',
            secondaryColor: '#06b6d4',
            headerText: 'Orden de Evento de Banquete',
            footerText: '',
            termsAndConditions: '',
        },
        production: {
            logoUrl: '',
            companyName: '',
            companyAddress: '',
            companyPhone: '',
            companyEmail: '',
            primaryColor: '#10b981',
            secondaryColor: '#34d399',
            headerText: 'Lista de Producción',
            footerText: '',
            termsAndConditions: '',
        },
        contract: {
            logoUrl: '',
            companyName: '',
            companyAddress: '',
            companyPhone: '',
            companyEmail: '',
            primaryColor: '#9333ea',
            secondaryColor: '#a855f7',
            headerText: '',
            footerText: '',
            termsAndConditions: 'TÉRMINOS Y CONDICIONES DEL SERVICIO DE CATERING\n\n1. RESERVACIONES\nTodas las reservaciones requieren un anticipo del 50% para ser confirmadas.\n\n2. CANCELACIONES\n- Más de 7 días: Reembolso completo del anticipo\n- 3-7 días: Reembolso del 50% del anticipo\n- Menos de 72 horas: Sin reembolso\n\n3. CAMBIOS\nCambios en el número de invitados deben comunicarse con 48 horas de anticipación.',
        },
    });

    const openTemplateEditor = (type: TemplateType) => {
        setEditingTemplateType(type);
        setShowTemplateModal(true);
    };

    const handleSaveTemplate = async (config: TemplateConfig) => {
        setTemplateConfigs(prev => ({
            ...prev,
            [editingTemplateType]: config,
        }));
        // In a real app, this would save to the API
        setShowTemplateModal(false);
    };

    // Tabs configuration
    const tabs = [
        { id: 'packages' as TabId, label: 'Paquetes', icon: Package },
        { id: 'pricing' as TabId, label: 'Precios', icon: DollarSign },
        { id: 'notifications' as TabId, label: 'Notificaciones', icon: Bell },
        { id: 'documents' as TabId, label: 'Documentos', icon: FileText },
    ];

    // Fetch packages
    useEffect(() => {
        const fetchPackages = async () => {
            try {
                setPackagesLoading(true);
                const data = await cateringApi.getPackages();
                setPackages(data);
            } catch (err: any) {
                console.error('Error fetching packages:', err);
                setPackagesError(err.message || 'Error al cargar los paquetes');
            } finally {
                setPackagesLoading(false);
            }
        };

        if (activeTab === 'packages') {
            fetchPackages();
        }
    }, [activeTab]);

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    // Save pricing config
    const savePricingConfig = async () => {
        setPricingSaving(true);
        // API call would go here
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setPricingSaving(false);
    };

    // Save notification config
    const saveNotificationConfig = async () => {
        setNotificationsSaving(true);
        // API call would go here
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setNotificationsSaving(false);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Link
                        href="/catering"
                        className="flex items-center gap-2 text-sm text-neutral-500 hover:text-white mb-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver al Calendario
                    </Link>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                            <Settings className="w-6 h-6 text-purple-500" />
                        </div>
                        Configuración de Catering
                    </h1>
                    <p className="text-neutral-400 mt-1">
                        Administra paquetes, precios y preferencias del módulo de catering
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-neutral-800">
                <nav className="flex gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium 
                                border-b-2 transition ${activeTab === tab.id
                                    ? 'border-purple-500 text-white'
                                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            <div className="min-h-[500px]">
                {/* Packages Tab */}
                {activeTab === 'packages' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-white">Paquetes de Catering</h2>
                                <p className="text-sm text-neutral-500">
                                    Define paquetes predefinidos para agilizar la venta
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingPackage(null);
                                    setShowPackageModal(true);
                                }}
                                className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 
                                    text-sm font-medium text-white hover:bg-purple-500"
                            >
                                <Plus className="w-4 h-4" />
                                Nuevo Paquete
                            </button>
                        </div>

                        {packagesLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                            </div>
                        ) : packagesError ? (
                            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center">
                                <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                                <p className="text-red-400">{packagesError}</p>
                            </div>
                        ) : packages.length === 0 ? (
                            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-12 text-center">
                                <Package className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-white mb-2">
                                    No hay paquetes definidos
                                </h3>
                                <p className="text-neutral-500 mb-4">
                                    Crea paquetes para ofrecer opciones pre-diseñadas a tus clientes
                                </p>
                                <button
                                    onClick={() => setShowPackageModal(true)}
                                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium 
                                        text-white hover:bg-purple-500"
                                >
                                    Crear Primer Paquete
                                </button>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {packages.map((pkg) => (
                                    <motion.div
                                        key={pkg.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 
                                            hover:border-purple-500/50 transition group"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h3 className="font-semibold text-white group-hover:text-purple-400 transition">
                                                    {pkg.name}
                                                </h3>
                                                {pkg.category && (
                                                    <span className="text-xs text-neutral-500">{pkg.category}</span>
                                                )}
                                            </div>
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded-full ${pkg.is_active
                                                    ? 'bg-emerald-500/10 text-emerald-500'
                                                    : 'bg-neutral-700 text-neutral-400'
                                                    }`}
                                            >
                                                {pkg.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </div>

                                        {pkg.description && (
                                            <p className="text-sm text-neutral-400 mb-4 line-clamp-2">
                                                {pkg.description}
                                            </p>
                                        )}

                                        <div className="flex items-center justify-between text-sm">
                                            <div className="text-neutral-500">
                                                <Users className="w-4 h-4 inline mr-1" />
                                                {pkg.min_guests}
                                                {pkg.max_guests ? `-${pkg.max_guests}` : '+'} pax
                                            </div>
                                            <div className="text-xl font-bold text-purple-500">
                                                {formatCurrency(pkg.base_price_per_person)}
                                                <span className="text-xs text-neutral-500">/pax</span>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-neutral-800 flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setEditingPackage(pkg);
                                                    setShowPackageModal(true);
                                                }}
                                                className="flex-1 flex items-center justify-center gap-1 py-2 
                                                    rounded-lg bg-neutral-800 text-neutral-400 text-sm 
                                                    hover:bg-neutral-700 hover:text-white transition"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                                Editar
                                            </button>
                                            <button
                                                className="flex items-center justify-center px-3 py-2 
                                                    rounded-lg bg-neutral-800 text-red-400 text-sm 
                                                    hover:bg-red-500/10 transition"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Pricing Tab */}
                {activeTab === 'pricing' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="max-w-2xl space-y-6"
                    >
                        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
                            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-emerald-500" />
                                Configuración de Precios
                            </h2>

                            <div className="space-y-5">
                                {/* Tax Rate */}
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                                        Tasa de IVA (%)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={pricingConfig.defaultTaxRate}
                                            onChange={(e) =>
                                                setPricingConfig({
                                                    ...pricingConfig,
                                                    defaultTaxRate: Number(e.target.value),
                                                })
                                            }
                                            className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 
                                                text-white focus:border-purple-500 outline-none"
                                        />
                                        <Percent className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                                    </div>
                                </div>

                                {/* Service Charge */}
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                                        Cargo por Servicio (%)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={pricingConfig.serviceChargePercent}
                                            onChange={(e) =>
                                                setPricingConfig({
                                                    ...pricingConfig,
                                                    serviceChargePercent: Number(e.target.value),
                                                })
                                            }
                                            className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 
                                                text-white focus:border-purple-500 outline-none"
                                        />
                                        <Percent className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                                    </div>
                                    <p className="text-xs text-neutral-500 mt-1">
                                        Se aplica automáticamente a todas las cotizaciones
                                    </p>
                                </div>

                                {/* Deposit Percentage */}
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                                        Anticipo Requerido (%)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={pricingConfig.depositPercent}
                                            onChange={(e) =>
                                                setPricingConfig({
                                                    ...pricingConfig,
                                                    depositPercent: Number(e.target.value),
                                                })
                                            }
                                            className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 
                                                text-white focus:border-purple-500 outline-none"
                                        />
                                        <Percent className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                                    </div>
                                </div>

                                {/* Minimum Guests */}
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                                        Mínimo de Invitados
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={pricingConfig.minimumGuests}
                                            onChange={(e) =>
                                                setPricingConfig({
                                                    ...pricingConfig,
                                                    minimumGuests: Number(e.target.value),
                                                })
                                            }
                                            className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 
                                                text-white focus:border-purple-500 outline-none"
                                        />
                                        <Users className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                                    </div>
                                </div>

                                {/* Minimum Order */}
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                                        Pedido Mínimo (MXN)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                                        <input
                                            type="number"
                                            value={pricingConfig.minimumOrderValue}
                                            onChange={(e) =>
                                                setPricingConfig({
                                                    ...pricingConfig,
                                                    minimumOrderValue: Number(e.target.value),
                                                })
                                            }
                                            className="w-full pl-8 pr-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 
                                                text-white focus:border-purple-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-neutral-800 flex justify-end">
                                <button
                                    onClick={savePricingConfig}
                                    disabled={pricingSaving}
                                    className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2.5 
                                        text-sm font-medium text-white hover:bg-purple-500 
                                        disabled:opacity-50 transition"
                                >
                                    {pricingSaving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="max-w-2xl space-y-6"
                    >
                        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
                            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                <Bell className="w-5 h-5 text-blue-500" />
                                Preferencias de Notificaciones
                            </h2>

                            <div className="space-y-5">
                                {/* Email Confirmations */}
                                <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-800/50">
                                    <div>
                                        <h4 className="font-medium text-white">Confirmaciones por Email</h4>
                                        <p className="text-sm text-neutral-500">
                                            Enviar email cuando se confirme un evento
                                        </p>
                                    </div>
                                    <button
                                        onClick={() =>
                                            setNotificationConfig({
                                                ...notificationConfig,
                                                emailConfirmations: !notificationConfig.emailConfirmations,
                                            })
                                        }
                                        className={`relative w-12 h-6 rounded-full transition ${notificationConfig.emailConfirmations
                                            ? 'bg-purple-600'
                                            : 'bg-neutral-700'
                                            }`}
                                    >
                                        <span
                                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition ${notificationConfig.emailConfirmations
                                                ? 'right-1'
                                                : 'left-1'
                                                }`}
                                        />
                                    </button>
                                </div>

                                {/* Email Reminders */}
                                <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-800/50">
                                    <div>
                                        <h4 className="font-medium text-white">Recordatorios por Email</h4>
                                        <p className="text-sm text-neutral-500">
                                            Enviar recordatorios antes del evento
                                        </p>
                                    </div>
                                    <button
                                        onClick={() =>
                                            setNotificationConfig({
                                                ...notificationConfig,
                                                emailReminders: !notificationConfig.emailReminders,
                                            })
                                        }
                                        className={`relative w-12 h-6 rounded-full transition ${notificationConfig.emailReminders
                                            ? 'bg-purple-600'
                                            : 'bg-neutral-700'
                                            }`}
                                    >
                                        <span
                                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition ${notificationConfig.emailReminders
                                                ? 'right-1'
                                                : 'left-1'
                                                }`}
                                        />
                                    </button>
                                </div>

                                {/* Reminder Days */}
                                {notificationConfig.emailReminders && (
                                    <div className="pl-4 border-l-2 border-purple-500/30">
                                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                                            Días de anticipación para recordatorio
                                        </label>
                                        <select
                                            value={notificationConfig.reminderDaysBefore}
                                            onChange={(e) =>
                                                setNotificationConfig({
                                                    ...notificationConfig,
                                                    reminderDaysBefore: Number(e.target.value),
                                                })
                                            }
                                            className="w-full px-4 py-2.5 rounded-lg bg-neutral-800 border border-neutral-700 
                                                text-white focus:border-purple-500 outline-none"
                                        >
                                            <option value={1}>1 día antes</option>
                                            <option value={2}>2 días antes</option>
                                            <option value={3}>3 días antes</option>
                                            <option value={5}>5 días antes</option>
                                            <option value={7}>1 semana antes</option>
                                        </select>
                                    </div>
                                )}

                                {/* Production Alerts */}
                                <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-800/50">
                                    <div>
                                        <h4 className="font-medium text-white">Alertas de Producción</h4>
                                        <p className="text-sm text-neutral-500">
                                            Notificar cuando se genere una lista de producción
                                        </p>
                                    </div>
                                    <button
                                        onClick={() =>
                                            setNotificationConfig({
                                                ...notificationConfig,
                                                sendProductionAlerts: !notificationConfig.sendProductionAlerts,
                                            })
                                        }
                                        className={`relative w-12 h-6 rounded-full transition ${notificationConfig.sendProductionAlerts
                                            ? 'bg-purple-600'
                                            : 'bg-neutral-700'
                                            }`}
                                    >
                                        <span
                                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition ${notificationConfig.sendProductionAlerts
                                                ? 'right-1'
                                                : 'left-1'
                                                }`}
                                        />
                                    </button>
                                </div>

                                {/* Payment Reminders */}
                                <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-800/50">
                                    <div>
                                        <h4 className="font-medium text-white">Recordatorios de Pago</h4>
                                        <p className="text-sm text-neutral-500">
                                            Enviar recordatorios para pagos pendientes
                                        </p>
                                    </div>
                                    <button
                                        onClick={() =>
                                            setNotificationConfig({
                                                ...notificationConfig,
                                                sendPaymentReminders: !notificationConfig.sendPaymentReminders,
                                            })
                                        }
                                        className={`relative w-12 h-6 rounded-full transition ${notificationConfig.sendPaymentReminders
                                            ? 'bg-purple-600'
                                            : 'bg-neutral-700'
                                            }`}
                                    >
                                        <span
                                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition ${notificationConfig.sendPaymentReminders
                                                ? 'right-1'
                                                : 'left-1'
                                                }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-neutral-800 flex justify-end">
                                <button
                                    onClick={saveNotificationConfig}
                                    disabled={notificationsSaving}
                                    className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2.5 
                                        text-sm font-medium text-white hover:bg-purple-500 
                                        disabled:opacity-50 transition"
                                >
                                    {notificationsSaving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="max-w-2xl space-y-6"
                    >
                        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
                            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-amber-500" />
                                Plantillas de Documentos
                            </h2>

                            <div className="space-y-4">
                                {/* Proposal Template */}
                                <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-800/50 
                                    border border-neutral-700 hover:border-amber-500/30 transition">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-lg bg-amber-500/10">
                                            <FileText className="w-6 h-6 text-amber-500" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-white">Plantilla de Propuesta</h4>
                                            <p className="text-sm text-neutral-500">
                                                Formato para cotizaciones y propuestas
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => openTemplateEditor('proposal')}
                                        className="px-4 py-2 rounded-lg border border-amber-500/50 
                                            text-amber-400 text-sm hover:bg-amber-500/10 hover:border-amber-500 transition"
                                    >
                                        Personalizar
                                    </button>
                                </div>

                                {/* BEO Template */}
                                <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-800/50 
                                    border border-neutral-700 hover:border-blue-500/30 transition">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-lg bg-blue-500/10">
                                            <ClipboardList className="w-6 h-6 text-blue-500" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-white">Plantilla de BEO</h4>
                                            <p className="text-sm text-neutral-500">
                                                Orden de Evento de Banquete
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => openTemplateEditor('beo')}
                                        className="px-4 py-2 rounded-lg border border-blue-500/50 
                                            text-blue-400 text-sm hover:bg-blue-500/10 hover:border-blue-500 transition"
                                    >
                                        Personalizar
                                    </button>
                                </div>

                                {/* Production Sheet Template */}
                                <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-800/50 
                                    border border-neutral-700 hover:border-emerald-500/30 transition">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-lg bg-emerald-500/10">
                                            <ChefHat className="w-6 h-6 text-emerald-500" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-white">Hoja de Producción</h4>
                                            <p className="text-sm text-neutral-500">
                                                Lista de ingredientes y preparación
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => openTemplateEditor('production')}
                                        className="px-4 py-2 rounded-lg border border-emerald-500/50 
                                            text-emerald-400 text-sm hover:bg-emerald-500/10 hover:border-emerald-500 transition"
                                    >
                                        Personalizar
                                    </button>
                                </div>

                                {/* Contract Template */}
                                <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-800/50 
                                    border border-neutral-700 hover:border-purple-500/30 transition">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-lg bg-purple-500/10">
                                            <Building2 className="w-6 h-6 text-purple-500" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-white">Contrato de Servicio</h4>
                                            <p className="text-sm text-neutral-500">
                                                Términos y condiciones del servicio
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => openTemplateEditor('contract')}
                                        className="px-4 py-2 rounded-lg border border-purple-500/50 
                                            text-purple-400 text-sm hover:bg-purple-500/10 hover:border-purple-500 transition"
                                    >
                                        Personalizar
                                    </button>
                                </div>
                            </div>

                            <div className="mt-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-green-300">Personalización Disponible</h4>
                                        <p className="text-sm text-green-400/70 mt-1">
                                            Haz clic en "Personalizar" para agregar tu logo, colores corporativos,
                                            y términos personalizados a cada tipo de documento.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Package Modal */}
            {showPackageModal && (
                <PackageFormModal
                    isOpen={showPackageModal}
                    onClose={() => {
                        setShowPackageModal(false);
                        setEditingPackage(null);
                    }}
                    editingPackage={editingPackage}
                    onSave={async (newPackage) => {
                        setPackages(prev => {
                            if (editingPackage) {
                                return prev.map(p => p.id === editingPackage.id ? newPackage : p);
                            }
                            return [...prev, newPackage];
                        });
                        setShowPackageModal(false);
                        setEditingPackage(null);
                    }}
                />
            )}

            {/* Template Customization Modal */}
            {showTemplateModal && (
                <TemplateCustomizationModal
                    isOpen={showTemplateModal}
                    onClose={() => setShowTemplateModal(false)}
                    templateType={editingTemplateType}
                    config={templateConfigs[editingTemplateType]}
                    onSave={handleSaveTemplate}
                />
            )}
        </div>
    );
}

// Helper component for clipboard icon
function ClipboardList({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
        </svg>
    );
}
