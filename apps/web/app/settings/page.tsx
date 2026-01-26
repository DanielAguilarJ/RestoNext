'use client';

/**
 * RestoNext MX - Settings Page
 * ============================
 * Main settings hub for restaurant configuration.
 * 
 * Sections:
 * - Profile: Business name, logo, timezone
 * - Fiscal: RFC, regimen fiscal, fiscal address
 * - Contacts: Email, phone, WhatsApp
 * - Billing: Subscription and payment management
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Settings,
    Building2,
    FileText,
    Phone,
    CreditCard,
    ChevronRight,
    Loader2,
    CheckCircle,
    AlertCircle,
    User,
    MapPin,
    Globe,
    ArrowLeft,
    Save,
    ChefHat,
} from 'lucide-react';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://restonext.me/api';

const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
};

// Types
interface FiscalAddress {
    street?: string;
    ext_number?: string;
    int_number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
}

interface Contacts {
    email?: string;
    phone?: string;
    whatsapp?: string;
}

interface TenantSettings {
    id: string;
    name: string;
    slug: string;
    trade_name: string;
    legal_name: string;
    logo_url: string;
    rfc: string;
    regimen_fiscal: string;
    uso_cfdi_default: string;
    fiscal_address: FiscalAddress;
    contacts: Contacts;
    timezone: string;
    currency: string;
    locale: string;
    onboarding_complete: boolean;
    onboarding_step: string;
}

// Settings sections configuration
const settingsSections = [
    {
        id: 'profile',
        title: 'Perfil del Negocio',
        description: 'Nombre comercial, logo y preferencias',
        icon: Building2,
        color: 'from-violet-500 to-purple-600',
        fields: ['trade_name', 'legal_name', 'logo_url', 'timezone', 'currency'],
    },
    {
        id: 'fiscal',
        title: 'Configuración Fiscal',
        description: 'RFC, régimen fiscal y domicilio',
        icon: FileText,
        color: 'from-blue-500 to-cyan-600',
        fields: ['rfc', 'regimen_fiscal', 'fiscal_address'],
    },
    {
        id: 'contacts',
        title: 'Contactos',
        description: 'Email, teléfono y WhatsApp',
        icon: Phone,
        color: 'from-emerald-500 to-teal-600',
        fields: ['contacts'],
    },
    {
        id: 'kitchen',
        title: 'Cocina / KDS',
        description: 'Tiempos de preparación y alertas',
        icon: ChefHat,
        color: 'from-orange-500 to-red-600',
        href: '/settings/kitchen',
        external: true,
    },
    {
        id: 'billing',
        title: 'Facturación y Planes',
        description: 'Suscripción y métodos de pago',
        icon: CreditCard,
        color: 'from-amber-500 to-orange-600',
        href: '/settings/billing',
        external: true,
    },
];

// Regimen Fiscal catalog (SAT)
const regimenFiscalOptions = [
    { code: '601', name: 'General de Ley Personas Morales' },
    { code: '603', name: 'Personas Morales con Fines no Lucrativos' },
    { code: '605', name: 'Sueldos y Salarios e Ingresos Asimilados a Salarios' },
    { code: '606', name: 'Arrendamiento' },
    { code: '607', name: 'Régimen de Enajenación o Adquisición de Bienes' },
    { code: '608', name: 'Demás ingresos' },
    { code: '610', name: 'Residentes en el Extranjero sin Establecimiento Permanente' },
    { code: '611', name: 'Ingresos por Dividendos' },
    { code: '612', name: 'Personas Físicas con Actividades Empresariales y Profesionales' },
    { code: '614', name: 'Ingresos por intereses' },
    { code: '615', name: 'Régimen de los ingresos por obtención de premios' },
    { code: '616', name: 'Sin obligaciones fiscales' },
    { code: '620', name: 'Sociedades Cooperativas de Producción' },
    { code: '621', name: 'Incorporación Fiscal' },
    { code: '622', name: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
    { code: '623', name: 'Opcional para Grupos de Sociedades' },
    { code: '624', name: 'Coordinados' },
    { code: '625', name: 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas' },
    { code: '626', name: 'Régimen Simplificado de Confianza' },
];

// Mexican states catalog
const mexicanStates = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
    'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Guanajuato',
    'Guerrero', 'Hidalgo', 'Jalisco', 'México', 'Michoacán', 'Morelos', 'Nayarit',
    'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
    'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas',
];

// Timezones for Mexico
const timezoneOptions = [
    { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
    { value: 'America/Cancun', label: 'Cancún (GMT-5)' },
    { value: 'America/Monterrey', label: 'Monterrey (GMT-6)' },
    { value: 'America/Tijuana', label: 'Tijuana (GMT-8)' },
    { value: 'America/Chihuahua', label: 'Chihuahua (GMT-7)' },
    { value: 'America/Mazatlan', label: 'Mazatlán (GMT-7)' },
    { value: 'America/Hermosillo', label: 'Hermosillo (GMT-7)' },
];

export default function SettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [settings, setSettings] = useState<TenantSettings | null>(null);
    const [activeSection, setActiveSection] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState<Partial<TenantSettings>>({});

    // Load tenant settings
    useEffect(() => {
        async function loadSettings() {
            try {
                const token = getToken();
                if (!token) {
                    router.push('/login');
                    return;
                }

                const response = await fetch(`${API_BASE_URL}/tenant/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        router.push('/login');
                        return;
                    }
                    throw new Error('Failed to load settings');
                }

                const data = await response.json();
                setSettings(data);
                setFormData(data);
            } catch (err) {
                setError('No se pudieron cargar las configuraciones');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        loadSettings();
    }, [router]);

    // Save settings
    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            const token = getToken();
            if (!token) {
                router.push('/login');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/onboarding/profile`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to save settings');
            }

            const updatedData = await response.json();
            setSettings(updatedData);
            setFormData(updatedData);
            setSuccess('Configuraciones guardadas exitosamente');

            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Error al guardar las configuraciones');
        } finally {
            setSaving(false);
        }
    };

    // Update form field
    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Update nested field (for fiscal_address and contacts)
    const updateNestedField = (parent: 'fiscal_address' | 'contacts', field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [parent]: {
                ...(prev[parent] as any || {}),
                [field]: value,
            },
        }));
    };

    // Check if section is complete
    const isSectionComplete = (sectionId: string): boolean => {
        if (!settings) return false;

        switch (sectionId) {
            case 'profile':
                return !!(settings.trade_name && settings.legal_name);
            case 'fiscal':
                return !!(settings.rfc && settings.regimen_fiscal && settings.fiscal_address?.postal_code);
            case 'contacts':
                return !!(settings.contacts?.email);
            case 'billing':
                return true; // Always show as complete for navigation
            default:
                return false;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-300">Cargando configuraciones...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <div className="bg-slate-900/80 border-b border-slate-700/50 backdrop-blur-xl sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/dashboard"
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <Settings className="w-7 h-7 text-violet-400" />
                                    Configuraciones
                                </h1>
                                <p className="text-slate-400 text-sm mt-0.5">
                                    {settings?.trade_name || settings?.name || 'Mi Restaurante'}
                                </p>
                            </div>
                        </div>

                        {activeSection && (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                            >
                                {saving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                Guardar Cambios
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Alerts */}
            <div className="max-w-6xl mx-auto px-6 pt-6">
                {error && (
                    <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <p className="text-red-300">{error}</p>
                        <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">×</button>
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-xl flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <p className="text-emerald-300">{success}</p>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-6 pb-12">
                <div className="flex gap-8">
                    {/* Sidebar Navigation */}
                    <div className="w-80 flex-shrink-0">
                        <div className="sticky top-24 space-y-2">
                            {settingsSections.map((section) => (
                                section.external ? (
                                    <Link
                                        key={section.id}
                                        href={section.href!}
                                        className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-all group"
                                    >
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center`}>
                                            <section.icon className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-medium text-white group-hover:text-violet-300 transition-colors">
                                                {section.title}
                                            </h3>
                                            <p className="text-sm text-slate-400">{section.description}</p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-violet-400 transition-colors" />
                                    </Link>
                                ) : (
                                    <button
                                        key={section.id}
                                        onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
                                        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeSection === section.id
                                            ? 'bg-violet-600/20 border-2 border-violet-500'
                                            : 'bg-slate-800/50 border border-slate-700 hover:border-slate-600'
                                            }`}
                                    >
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center`}>
                                            <section.icon className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <h3 className="font-medium text-white">{section.title}</h3>
                                            <p className="text-sm text-slate-400">{section.description}</p>
                                        </div>
                                        {isSectionComplete(section.id) && (
                                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                                        )}
                                    </button>
                                )
                            ))}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 min-w-0">
                        {!activeSection ? (
                            <div className="bg-slate-800/50 rounded-3xl border border-slate-700 p-8 text-center">
                                <Settings className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                <h2 className="text-xl font-medium text-white mb-2">
                                    Selecciona una sección
                                </h2>
                                <p className="text-slate-400">
                                    Elige una sección de la izquierda para ver y editar tus configuraciones
                                </p>
                            </div>
                        ) : activeSection === 'profile' ? (
                            <ProfileSection
                                formData={formData}
                                updateField={updateField}
                                timezoneOptions={timezoneOptions}
                            />
                        ) : activeSection === 'fiscal' ? (
                            <FiscalSection
                                formData={formData}
                                updateField={updateField}
                                updateNestedField={updateNestedField}
                                regimenFiscalOptions={regimenFiscalOptions}
                                mexicanStates={mexicanStates}
                            />
                        ) : activeSection === 'contacts' ? (
                            <ContactsSection
                                formData={formData}
                                updateNestedField={updateNestedField}
                            />
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Profile Section Component
function ProfileSection({ formData, updateField, timezoneOptions }: {
    formData: Partial<TenantSettings>;
    updateField: (field: string, value: any) => void;
    timezoneOptions: Array<{ value: string; label: string }>;
}) {
    return (
        <div className="bg-slate-800/50 rounded-3xl border border-slate-700 p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-white">Perfil del Negocio</h2>
            </div>

            <div className="space-y-6">
                {/* Trade Name */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Nombre Comercial *
                    </label>
                    <input
                        type="text"
                        value={formData.trade_name || ''}
                        onChange={(e) => updateField('trade_name', e.target.value)}
                        placeholder="Mi Restaurante"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-sm text-slate-500">El nombre que verán tus clientes</p>
                </div>

                {/* Legal Name */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Razón Social
                    </label>
                    <input
                        type="text"
                        value={formData.legal_name || ''}
                        onChange={(e) => updateField('legal_name', e.target.value)}
                        placeholder="Restaurante SA de CV"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-sm text-slate-500">Nombre legal para facturación</p>
                </div>

                {/* Logo URL */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        URL del Logo
                    </label>
                    <input
                        type="url"
                        value={formData.logo_url === 'stored_in_features_config' ? '' : (formData.logo_url || '')}
                        onChange={(e) => updateField('logo_url', e.target.value)}
                        placeholder="https://ejemplo.com/logo.png"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                </div>

                {/* Timezone */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        <Globe className="w-4 h-4 inline mr-1" />
                        Zona Horaria
                    </label>
                    <select
                        value={formData.timezone || 'America/Mexico_City'}
                        onChange={(e) => updateField('timezone', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                        {timezoneOptions.map(tz => (
                            <option key={tz.value} value={tz.value}>{tz.label}</option>
                        ))}
                    </select>
                </div>

                {/* Currency */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Moneda
                    </label>
                    <select
                        value={formData.currency || 'MXN'}
                        onChange={(e) => updateField('currency', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                        <option value="MXN">MXN - Peso Mexicano</option>
                        <option value="USD">USD - Dólar Estadounidense</option>
                    </select>
                </div>
            </div>
        </div>
    );
}

// Fiscal Section Component
function FiscalSection({ formData, updateField, updateNestedField, regimenFiscalOptions, mexicanStates }: {
    formData: Partial<TenantSettings>;
    updateField: (field: string, value: any) => void;
    updateNestedField: (parent: 'fiscal_address' | 'contacts', field: string, value: string) => void;
    regimenFiscalOptions: Array<{ code: string; name: string }>;
    mexicanStates: string[];
}) {
    const fiscalAddress = formData.fiscal_address || {};

    return (
        <div className="bg-slate-800/50 rounded-3xl border border-slate-700 p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-white">Configuración Fiscal</h2>
            </div>

            <div className="space-y-6">
                {/* RFC */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        RFC *
                    </label>
                    <input
                        type="text"
                        value={formData.rfc || ''}
                        onChange={(e) => updateField('rfc', e.target.value.toUpperCase())}
                        placeholder="XAXX010101000"
                        maxLength={13}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent uppercase"
                    />
                </div>

                {/* Regimen Fiscal */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Régimen Fiscal *
                    </label>
                    <select
                        value={formData.regimen_fiscal || ''}
                        onChange={(e) => updateField('regimen_fiscal', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                        <option value="">Selecciona un régimen</option>
                        {regimenFiscalOptions.map(reg => (
                            <option key={reg.code} value={reg.code}>
                                {reg.code} - {reg.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Uso CFDI Default */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Uso CFDI por Defecto
                    </label>
                    <select
                        value={formData.uso_cfdi_default || 'G03'}
                        onChange={(e) => updateField('uso_cfdi_default', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                        <option value="G01">G01 - Adquisición de mercancías</option>
                        <option value="G02">G02 - Devoluciones, descuentos o bonificaciones</option>
                        <option value="G03">G03 - Gastos en general</option>
                        <option value="P01">P01 - Por definir</option>
                    </select>
                </div>

                {/* Fiscal Address */}
                <div className="pt-4 border-t border-slate-700">
                    <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-blue-400" />
                        Domicilio Fiscal
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Calle *
                            </label>
                            <input
                                type="text"
                                value={fiscalAddress.street || ''}
                                onChange={(e) => updateNestedField('fiscal_address', 'street', e.target.value)}
                                placeholder="Av. Reforma"
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                No. Exterior
                            </label>
                            <input
                                type="text"
                                value={fiscalAddress.ext_number || ''}
                                onChange={(e) => updateNestedField('fiscal_address', 'ext_number', e.target.value)}
                                placeholder="123"
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                No. Interior
                            </label>
                            <input
                                type="text"
                                value={fiscalAddress.int_number || ''}
                                onChange={(e) => updateNestedField('fiscal_address', 'int_number', e.target.value)}
                                placeholder="A"
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Colonia
                            </label>
                            <input
                                type="text"
                                value={fiscalAddress.neighborhood || ''}
                                onChange={(e) => updateNestedField('fiscal_address', 'neighborhood', e.target.value)}
                                placeholder="Centro"
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Código Postal *
                            </label>
                            <input
                                type="text"
                                value={fiscalAddress.postal_code || ''}
                                onChange={(e) => updateNestedField('fiscal_address', 'postal_code', e.target.value)}
                                placeholder="06600"
                                maxLength={5}
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Ciudad *
                            </label>
                            <input
                                type="text"
                                value={fiscalAddress.city || ''}
                                onChange={(e) => updateNestedField('fiscal_address', 'city', e.target.value)}
                                placeholder="Ciudad de México"
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Estado *
                            </label>
                            <select
                                value={fiscalAddress.state || ''}
                                onChange={(e) => updateNestedField('fiscal_address', 'state', e.target.value)}
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            >
                                <option value="">Selecciona un estado</option>
                                {mexicanStates.map(state => (
                                    <option key={state} value={state}>{state}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Contacts Section Component
function ContactsSection({ formData, updateNestedField }: {
    formData: Partial<TenantSettings>;
    updateNestedField: (parent: 'fiscal_address' | 'contacts', field: string, value: string) => void;
}) {
    const contacts = formData.contacts || {};

    return (
        <div className="bg-slate-800/50 rounded-3xl border border-slate-700 p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-white">Contactos</h2>
            </div>

            <div className="space-y-6">
                {/* Email */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Correo Electrónico *
                    </label>
                    <input
                        type="email"
                        value={contacts.email || ''}
                        onChange={(e) => updateNestedField('contacts', 'email', e.target.value)}
                        placeholder="contacto@mirestaurante.com"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-sm text-slate-500">Para recibir notificaciones y facturas</p>
                </div>

                {/* Phone */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Teléfono
                    </label>
                    <input
                        type="tel"
                        value={contacts.phone || ''}
                        onChange={(e) => updateNestedField('contacts', 'phone', e.target.value)}
                        placeholder="+52 55 1234 5678"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                </div>

                {/* WhatsApp */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        WhatsApp
                    </label>
                    <input
                        type="tel"
                        value={contacts.whatsapp || ''}
                        onChange={(e) => updateNestedField('contacts', 'whatsapp', e.target.value)}
                        placeholder="+52 55 1234 5678"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-sm text-slate-500">Para recibir pedidos y contacto con clientes</p>
                </div>
            </div>
        </div>
    );
}
