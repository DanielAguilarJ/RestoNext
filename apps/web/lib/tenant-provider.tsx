"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { tokenUtils } from "./api";

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://restonext.me/api';

// Tenant profile interface matching backend TenantPublic
export interface TenantProfile {
    id: string;
    name: string;
    slug: string;
    legal_name: string | null;
    trade_name: string | null;
    logo_url: string | null;
    rfc: string | null;
    regimen_fiscal: string | null;
    uso_cfdi_default: string;
    fiscal_address: {
        street?: string;
        exterior_number?: string;
        interior_number?: string | null;
        neighborhood?: string;
        city?: string;
        state?: string;
        postal_code?: string;
        country?: string;
    };
    contacts: {
        email?: string;
        phone?: string | null;
        whatsapp?: string | null;
    };
    ticket_config: {
        header_lines?: string[];
        footer_lines?: string[];
        show_logo?: boolean;
        additional_notes?: string | null;
    };
    billing_config: {
        pac_provider?: string | null;
        csd_cert_path?: string | null;
        csd_key_path?: string | null;
        series?: string;
        folio_start?: number;
    };
    timezone: string;
    currency: string;
    locale: string;
    onboarding_complete: boolean;
    onboarding_step: string;
}

interface TenantContextValue {
    tenant: TenantProfile | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    updateTenant: (updates: Partial<TenantProfile>) => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

interface TenantProviderProps {
    children: ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
    const [tenant, setTenant] = useState<TenantProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTenant = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get token from storage
            const token = tokenUtils.getToken();

            if (!token) {
                // No token means not authenticated, don't try to fetch
                setTenant(null);
                return;
            }

            // Fetch tenant profile from FastAPI backend
            const response = await fetch(`${API_BASE_URL}/tenant/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired or invalid
                    tokenUtils.removeToken();
                    setTenant(null);
                    return;
                }
                throw new Error(`Failed to fetch tenant: ${response.status}`);
            }

            const tenantData = await response.json();

            // Map backend response to TenantProfile
            const tenantProfile: TenantProfile = {
                id: tenantData.id,
                name: tenantData.name || "",
                slug: tenantData.slug || "",
                legal_name: tenantData.legal_name || null,
                trade_name: tenantData.trade_name || null,
                logo_url: tenantData.logo_url || null,
                rfc: tenantData.rfc || null,
                regimen_fiscal: tenantData.regimen_fiscal || null,
                uso_cfdi_default: tenantData.uso_cfdi_default || "G03",
                fiscal_address: tenantData.fiscal_address || {},
                contacts: tenantData.contacts || {},
                ticket_config: tenantData.ticket_config || {},
                billing_config: tenantData.billing_config || {},
                timezone: tenantData.timezone || "America/Mexico_City",
                currency: tenantData.currency || "MXN",
                locale: tenantData.locale || "es-MX",
                onboarding_complete: tenantData.onboarding_complete || false,
                onboarding_step: tenantData.onboarding_step || "basic",
            };

            setTenant(tenantProfile);
        } catch (err: any) {
            console.error("Failed to fetch tenant:", err);
            setError(err.message || "Failed to load tenant profile");
            setTenant(null);
        } finally {
            setLoading(false);
        }
    };

    const updateTenant = (updates: Partial<TenantProfile>) => {
        if (tenant) {
            setTenant({ ...tenant, ...updates });
        }
    };

    useEffect(() => {
        fetchTenant();
    }, []);

    return (
        <TenantContext.Provider
            value={{
                tenant,
                loading,
                error,
                refetch: fetchTenant,
                updateTenant,
            }}
        >
            {children}
        </TenantContext.Provider>
    );
}

export function useTenant() {
    const context = useContext(TenantContext);
    if (!context) {
        throw new Error("useTenant must be used within a TenantProvider");
    }
    return context;
}

/**
 * Hook to check if onboarding is complete
 * Returns true if complete, false otherwise
 */
export function useOnboardingStatus() {
    const { tenant, loading } = useTenant();
    return {
        isComplete: tenant?.onboarding_complete ?? false,
        currentStep: tenant?.onboarding_step ?? "basic",
        loading,
    };
}
