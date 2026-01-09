"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { databases, DATABASE_ID, account } from "../../lib/api";
import { Query } from "appwrite";

// ============================================
// Types
// ============================================

interface OnboardingData {
    trade_name: string;
    logo_url: string;
    email: string;
    phone: string;
    whatsapp: string;
    legal_name: string;
    rfc: string;
    regimen_fiscal: string;
    uso_cfdi_default: string;
    street: string;
    exterior_number: string;
    interior_number: string;
    neighborhood: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    header_lines: string[];
    footer_lines: string[];
    show_logo: boolean;
}

const REGIMEN_OPTIONS = [
    { value: "601", label: "601 - General de Ley Personas Morales" },
    { value: "603", label: "603 - Personas Morales con Fines no Lucrativos" },
    { value: "605", label: "605 - Sueldos y Salarios" },
    { value: "606", label: "606 - Arrendamiento" },
    { value: "607", label: "607 - Enajenación de Bienes" },
    { value: "608", label: "608 - Demás Ingresos" },
    { value: "610", label: "610 - Residentes en el Extranjero" },
    { value: "611", label: "611 - Ingresos por Dividendos" },
    { value: "612", label: "612 - Personas Físicas con Actividades Empresariales" },
    { value: "614", label: "614 - Ingresos por Intereses" },
    { value: "615", label: "615 - Régimen Sin Obligaciones Fiscales" },
    { value: "616", label: "616 - Sin Obligaciones Fiscales" },
    { value: "620", label: "620 - Sociedades Cooperativas" },
    { value: "621", label: "621 - Incorporación Fiscal" },
    { value: "622", label: "622 - Actividades Agrícolas" },
    { value: "623", label: "623 - Opcional para Grupos de Sociedades" },
    { value: "624", label: "624 - Coordinados" },
    { value: "625", label: "625 - Régimen RESICO" },
    { value: "626", label: "626 - RESICO Personas Físicas" },
];

const USO_CFDI_OPTIONS = [
    { value: "G01", label: "G01 - Adquisición de mercancías" },
    { value: "G02", label: "G02 - Devoluciones, descuentos o bonificaciones" },
    { value: "G03", label: "G03 - Gastos en general" },
    { value: "I01", label: "I01 - Construcciones" },
    { value: "I02", label: "I02 - Mob. y equipo de oficina" },
    { value: "I03", label: "I03 - Equipo de transporte" },
    { value: "I04", label: "I04 - Equipo de cómputo" },
    { value: "I05", label: "I05 - Dados, troqueles, moldes" },
    { value: "I06", label: "I06 - Comunicaciones telefónicas" },
    { value: "I07", label: "I07 - Comunicaciones satelitales" },
    { value: "I08", label: "I08 - Otra maquinaria y equipo" },
    { value: "D01", label: "D01 - Honorarios médicos" },
    { value: "D02", label: "D02 - Gastos médicos por incapacidad" },
    { value: "D03", label: "D03 - Gastos funerales" },
    { value: "D04", label: "D04 - Donativos" },
    { value: "D05", label: "D05 - Intereses de hipoteca" },
    { value: "D06", label: "D06 - Aportaciones voluntarias SAR" },
    { value: "D07", label: "D07 - Primas por seguro de gastos médicos" },
    { value: "D08", label: "D08 - Gastos de transportación escolar" },
    { value: "D09", label: "D09 - Depósitos cuenta ahorro, pensiones" },
    { value: "D10", label: "D10 - Pagos por servicios educativos" },
    { value: "S01", label: "S01 - Sin efectos fiscales" },
    { value: "CP01", label: "CP01 - Pagos" },
    { value: "CN01", label: "CN01 - Nómina" },
];

const STEPS = ["Básico", "Contacto", "Fiscal", "Ticket", "Completar"];

// ============================================
// Component
// ============================================

export default function OnboardingPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [errors, setErrors] = useState<string[]>([]);

    const [data, setData] = useState<OnboardingData>({
        trade_name: "",
        logo_url: "",
        email: "",
        phone: "",
        whatsapp: "",
        legal_name: "",
        rfc: "",
        regimen_fiscal: "612",
        uso_cfdi_default: "G03",
        street: "",
        exterior_number: "",
        interior_number: "",
        neighborhood: "",
        city: "",
        state: "",
        postal_code: "",
        country: "México",
        header_lines: [],
        footer_lines: ["¡Gracias por su preferencia!"],
        show_logo: true,
    });

    // Load existing data
    useEffect(() => {
        const loadData = async () => {
            try {
                const user = await account.get();
                const profileRes = await databases.listDocuments(DATABASE_ID, "profiles", [
                    Query.equal("user_id", user.$id),
                ]);

                if (profileRes.documents.length > 0) {
                    const resId = profileRes.documents[0].restaurant_id;
                    if (resId) {
                        setRestaurantId(resId);
                        const doc = await databases.getDocument(DATABASE_ID, "restaurants", resId);

                        const parse = (val: any) => typeof val === 'string' ? JSON.parse(val || '{}') : (val || {});

                        const contacts = parse(doc.contacts);
                        const fiscalAddr = parse(doc.fiscal_address);
                        const ticketCfg = parse(doc.ticket_config);

                        // Map existing data
                        setData((prev) => ({
                            ...prev,
                            trade_name: doc.trade_name || doc.name || "",
                            logo_url: doc.logo_url || "",
                            email: contacts.email || "",
                            phone: contacts.phone || "",
                            whatsapp: contacts.whatsapp || "",
                            legal_name: doc.legal_name || "",
                            rfc: doc.rfc || "",
                            regimen_fiscal: doc.regimen_fiscal || "612",
                            uso_cfdi_default: doc.uso_cfdi_default || "G03",
                            street: fiscalAddr.street || "",
                            exterior_number: fiscalAddr.exterior_number || "",
                            interior_number: fiscalAddr.interior_number || "",
                            neighborhood: fiscalAddr.neighborhood || "",
                            city: fiscalAddr.city || "",
                            state: fiscalAddr.state || "",
                            postal_code: fiscalAddr.postal_code || "",
                            country: fiscalAddr.country || "México",
                            header_lines: ticketCfg.header_lines || [],
                            footer_lines: ticketCfg.footer_lines || ["¡Gracias por su preferencia!"],
                            show_logo: ticketCfg.show_logo ?? true,
                        }));

                        // Set step based on saved progress
                        const stepMap: Record<string, number> = {
                            basic: 0,
                            contacts: 1,
                            fiscal: 2,
                            ticket: 3,
                            complete: 4,
                        };
                        setCurrentStep(stepMap[doc.onboarding_step] || 0);

                        // If already complete, redirect
                        if (doc.onboarding_complete) {
                            router.push("/pos");
                            return;
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load onboarding data:", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [router]);

    const updateField = (field: keyof OnboardingData, value: any) => {
        setData((prev) => ({ ...prev, [field]: value }));
    };

    const saveProgress = async (nextStep: string) => {
        if (!restaurantId) return;
        setSaving(true);
        setErrors([]);

        try {
            const updatePayload: any = {
                trade_name: data.trade_name,
                legal_name: data.legal_name,
                logo_url: data.logo_url || null,
                rfc: data.rfc || null,
                regimen_fiscal: data.regimen_fiscal || null,
                uso_cfdi_default: data.uso_cfdi_default,
                fiscal_address: JSON.stringify({
                    street: data.street,
                    exterior_number: data.exterior_number,
                    interior_number: data.interior_number || null,
                    neighborhood: data.neighborhood,
                    city: data.city,
                    state: data.state,
                    postal_code: data.postal_code,
                    country: data.country,
                }),
                contacts: JSON.stringify({
                    email: data.email,
                    phone: data.phone || null,
                    whatsapp: data.whatsapp || null,
                }),
                ticket_config: JSON.stringify({
                    header_lines: data.header_lines,
                    footer_lines: data.footer_lines,
                    show_logo: data.show_logo,
                }),
                onboarding_step: nextStep,
            };

            await databases.updateDocument(DATABASE_ID, "restaurants", restaurantId, updatePayload);
        } catch (err: any) {
            console.error("Failed to save progress:", err);
            setErrors([err.message || "Error al guardar"]);
        } finally {
            setSaving(false);
        }
    };

    const handleNext = async () => {
        const stepNames = ["contacts", "fiscal", "ticket", "complete", "complete"];
        await saveProgress(stepNames[currentStep]);
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = async () => {
        if (!restaurantId) return;
        setSaving(true);
        setErrors([]);

        try {
            // Validate required fields
            const validationErrors: string[] = [];
            if (!data.trade_name || data.trade_name.length < 2) validationErrors.push("Nombre comercial es requerido");
            if (!data.legal_name || data.legal_name.length < 2) validationErrors.push("Razón social es requerida");
            if (!data.rfc || data.rfc.length < 12) validationErrors.push("RFC es requerido (12-13 caracteres)");
            if (!data.regimen_fiscal) validationErrors.push("Régimen fiscal es requerido");
            if (!data.postal_code || data.postal_code.length !== 5) validationErrors.push("Código postal es requerido (5 dígitos)");
            if (!data.street) validationErrors.push("Calle es requerida");
            if (!data.city) validationErrors.push("Ciudad es requerida");
            if (!data.state) validationErrors.push("Estado es requerido");
            if (!data.email) validationErrors.push("Email de contacto es requerido");

            if (validationErrors.length > 0) {
                setErrors(validationErrors);
                setSaving(false);
                return;
            }

            await databases.updateDocument(DATABASE_ID, "restaurants", restaurantId, {
                trade_name: data.trade_name,
                legal_name: data.legal_name,
                logo_url: data.logo_url || null,
                rfc: data.rfc.toUpperCase(),
                regimen_fiscal: data.regimen_fiscal,
                uso_cfdi_default: data.uso_cfdi_default,
                fiscal_address: JSON.stringify({
                    street: data.street,
                    exterior_number: data.exterior_number,
                    interior_number: data.interior_number || null,
                    neighborhood: data.neighborhood,
                    city: data.city,
                    state: data.state,
                    postal_code: data.postal_code,
                    country: data.country,
                }),
                contacts: JSON.stringify({
                    email: data.email,
                    phone: data.phone || null,
                    whatsapp: data.whatsapp || null,
                }),
                ticket_config: JSON.stringify({
                    header_lines: data.header_lines,
                    footer_lines: data.footer_lines,
                    show_logo: data.show_logo,
                }),
                onboarding_complete: true,
                onboarding_step: "complete",
            });

            router.push("/pos");
        } catch (err: any) {
            console.error("Failed to complete onboarding:", err);
            setErrors([err.message || "Error al completar"]);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-red-500/20" />
                    <p className="text-white/60">Cargando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Configuración de Restaurante
                    </h1>
                    <p className="text-gray-400">
                        Complete su perfil para comenzar a usar RestoNext
                    </p>
                </div>

                {/* Stepper */}
                <div className="flex items-center justify-center mb-8">
                    {STEPS.map((step, idx) => (
                        <React.Fragment key={step}>
                            <div
                                className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold transition-all ${idx < currentStep
                                    ? "bg-green-500 text-white"
                                    : idx === currentStep
                                        ? "bg-red-500 text-white ring-4 ring-red-500/30"
                                        : "bg-gray-700 text-gray-400"
                                    }`}
                            >
                                {idx < currentStep ? "✓" : idx + 1}
                            </div>
                            {idx < STEPS.length - 1 && (
                                <div
                                    className={`w-12 h-1 mx-1 transition-all ${idx < currentStep ? "bg-green-500" : "bg-gray-700"
                                        }`}
                                />
                            )}
                        </React.Fragment>
                    ))}
                </div>
                <div className="text-center mb-6">
                    <span className="text-white font-medium">{STEPS[currentStep]}</span>
                </div>

                {/* Card */}
                <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700/50 p-6 shadow-2xl">
                    {/* Step 0: Basic */}
                    {currentStep === 0 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Nombre Comercial *
                                </label>
                                <input
                                    type="text"
                                    value={data.trade_name}
                                    onChange={(e) => updateField("trade_name", e.target.value)}
                                    placeholder="Ej: Taquería El Comal"
                                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    URL del Logo (opcional)
                                </label>
                                <input
                                    type="url"
                                    value={data.logo_url}
                                    onChange={(e) => updateField("logo_url", e.target.value)}
                                    placeholder="https://..."
                                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                />
                            </div>
                            {data.logo_url && (
                                <div className="flex justify-center">
                                    <img
                                        src={data.logo_url}
                                        alt="Logo preview"
                                        className="h-24 w-24 object-contain rounded-lg border border-gray-600"
                                        onError={(e) => (e.currentTarget.style.display = "none")}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 1: Contacts */}
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Email de Contacto *
                                </label>
                                <input
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => updateField("email", e.target.value)}
                                    placeholder="facturacion@restaurante.mx"
                                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Teléfono
                                </label>
                                <input
                                    type="tel"
                                    value={data.phone}
                                    onChange={(e) => updateField("phone", e.target.value)}
                                    placeholder="+52 55 1234 5678"
                                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    WhatsApp
                                </label>
                                <input
                                    type="tel"
                                    value={data.whatsapp}
                                    onChange={(e) => updateField("whatsapp", e.target.value)}
                                    placeholder="+52 55 1234 5678"
                                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Fiscal */}
                    {currentStep === 2 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Razón Social *
                                </label>
                                <input
                                    type="text"
                                    value={data.legal_name}
                                    onChange={(e) => updateField("legal_name", e.target.value)}
                                    placeholder="Ej: Restaurantes El Comal SA de CV"
                                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        RFC *
                                    </label>
                                    <input
                                        type="text"
                                        value={data.rfc}
                                        onChange={(e) => updateField("rfc", e.target.value.toUpperCase())}
                                        placeholder="XAXX010101000"
                                        maxLength={13}
                                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Código Postal *
                                    </label>
                                    <input
                                        type="text"
                                        value={data.postal_code}
                                        onChange={(e) => updateField("postal_code", e.target.value.replace(/\D/g, "").slice(0, 5))}
                                        placeholder="06600"
                                        maxLength={5}
                                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Régimen Fiscal *
                                </label>
                                <select
                                    value={data.regimen_fiscal}
                                    onChange={(e) => updateField("regimen_fiscal", e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                >
                                    {REGIMEN_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Uso CFDI por Defecto
                                </label>
                                <select
                                    value={data.uso_cfdi_default}
                                    onChange={(e) => updateField("uso_cfdi_default", e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                >
                                    {USO_CFDI_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="border-t border-gray-700 pt-4 mt-4">
                                <h3 className="text-white font-medium mb-4">Dirección Fiscal</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Calle *</label>
                                        <input
                                            type="text"
                                            value={data.street}
                                            onChange={(e) => updateField("street", e.target.value)}
                                            placeholder="Av. Reforma"
                                            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">No. Exterior *</label>
                                            <input
                                                type="text"
                                                value={data.exterior_number}
                                                onChange={(e) => updateField("exterior_number", e.target.value)}
                                                placeholder="123"
                                                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">No. Interior</label>
                                            <input
                                                type="text"
                                                value={data.interior_number}
                                                onChange={(e) => updateField("interior_number", e.target.value)}
                                                placeholder="A"
                                                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Colonia *</label>
                                        <input
                                            type="text"
                                            value={data.neighborhood}
                                            onChange={(e) => updateField("neighborhood", e.target.value)}
                                            placeholder="Centro"
                                            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Ciudad *</label>
                                            <input
                                                type="text"
                                                value={data.city}
                                                onChange={(e) => updateField("city", e.target.value)}
                                                placeholder="Ciudad de México"
                                                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Estado *</label>
                                            <input
                                                type="text"
                                                value={data.state}
                                                onChange={(e) => updateField("state", e.target.value)}
                                                placeholder="CDMX"
                                                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Ticket */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="show_logo"
                                    checked={data.show_logo}
                                    onChange={(e) => updateField("show_logo", e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-600 bg-gray-900/50 text-red-500 focus:ring-red-500"
                                />
                                <label htmlFor="show_logo" className="text-gray-300">
                                    Mostrar logo en tickets
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Líneas de Pie de Ticket
                                </label>
                                <textarea
                                    value={data.footer_lines.join("\n")}
                                    onChange={(e) => updateField("footer_lines", e.target.value.split("\n"))}
                                    placeholder="¡Gracias por su preferencia!"
                                    rows={3}
                                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">Una línea por renglón</p>
                            </div>

                            {/* Ticket Preview */}
                            <div className="border-t border-gray-700 pt-4">
                                <h3 className="text-white font-medium mb-4">Vista Previa del Ticket</h3>
                                <div className="bg-white text-black rounded-lg p-4 font-mono text-sm max-w-xs mx-auto shadow-xl">
                                    {data.show_logo && data.logo_url && (
                                        <div className="flex justify-center mb-2">
                                            <img
                                                src={data.logo_url}
                                                alt="Logo"
                                                className="h-12 object-contain"
                                                onError={(e) => (e.currentTarget.style.display = "none")}
                                            />
                                        </div>
                                    )}
                                    <div className="text-center font-bold text-lg mb-1">
                                        {data.trade_name || "Nombre del Restaurante"}
                                    </div>
                                    <div className="text-center text-xs text-gray-600 mb-2">
                                        {data.street && `${data.street} ${data.exterior_number}`}
                                        {data.neighborhood && `, ${data.neighborhood}`}
                                        <br />
                                        {data.city && `${data.city}, ${data.state}`}
                                        {data.postal_code && ` C.P. ${data.postal_code}`}
                                    </div>
                                    <div className="border-t border-dashed border-gray-400 my-2" />
                                    <div className="text-center text-gray-500 text-xs">
                                        [Items de la orden aquí]
                                    </div>
                                    <div className="border-t border-dashed border-gray-400 my-2" />
                                    <div className="text-center text-xs">
                                        {data.footer_lines.map((line, i) => (
                                            <div key={i}>{line}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Complete */}
                    {currentStep === 4 && (
                        <div className="space-y-6 text-center">
                            <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                                <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-white">
                                ¡Listo para comenzar!
                            </h2>
                            <p className="text-gray-400">
                                Su perfil de restaurante está completo. Haga clic en "Finalizar" para acceder al sistema POS.
                            </p>

                            <div className="bg-gray-900/50 rounded-lg p-4 text-left">
                                <h3 className="font-semibold text-white mb-2">Resumen:</h3>
                                <ul className="text-sm text-gray-300 space-y-1">
                                    <li>• <strong>Nombre:</strong> {data.trade_name}</li>
                                    <li>• <strong>RFC:</strong> {data.rfc}</li>
                                    <li>• <strong>Email:</strong> {data.email}</li>
                                    <li>• <strong>Ciudad:</strong> {data.city}, {data.state}</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Errors */}
                    {errors.length > 0 && (
                        <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                            <ul className="text-red-300 text-sm space-y-1">
                                {errors.map((err, i) => (
                                    <li key={i}>• {err}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between mt-8 pt-6 border-t border-gray-700">
                        <button
                            onClick={handleBack}
                            disabled={currentStep === 0 || saving}
                            className="px-6 py-3 rounded-lg bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                        >
                            Anterior
                        </button>

                        {currentStep < STEPS.length - 1 ? (
                            <button
                                onClick={handleNext}
                                disabled={saving || (currentStep === 0 && !data.trade_name)}
                                className="px-6 py-3 rounded-lg bg-red-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-600 transition-colors"
                            >
                                {saving ? "Guardando..." : "Siguiente"}
                            </button>
                        ) : (
                            <button
                                onClick={handleComplete}
                                disabled={saving}
                                className="px-8 py-3 rounded-lg bg-green-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
                            >
                                {saving ? "Finalizando..." : "Finalizar"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
