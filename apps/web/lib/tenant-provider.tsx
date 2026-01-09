"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { databases, DATABASE_ID, account } from "./api";
import { Query } from "appwrite";

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

            // Get current user
            const user = await account.get();

            // Get user's profile to find restaurant_id
            const profileRes = await databases.listDocuments(DATABASE_ID, "profiles", [
                Query.equal("user_id", user.$id),
            ]);

            if (profileRes.documents.length === 0) {
                setTenant(null);
                return;
            }

            const profile = profileRes.documents[0];
            const restaurantId = profile.restaurant_id;

            if (!restaurantId) {
                setTenant(null);
                return;
            }

            // Fetch restaurant/tenant document
            const restaurantDoc = await databases.getDocument(
                DATABASE_ID,
                "restaurants",
                restaurantId
            );

            // Helper to safe parse JSON attributes (Appwrite stores them as strings)
            const parseJson = (val: any, fallback: any) => {
                if (!val) return fallback;
                if (typeof val === 'object') return val; // Already an object (future proof)
                try {
                    return JSON.parse(val);
                } catch (e) {
                    console.warn("Failed to parse JSON attribute:", val);
                    return fallback;
                }
            };

            // Map Appwrite document to TenantProfile
            const tenantProfile: TenantProfile = {
                id: restaurantDoc.$id,
                name: restaurantDoc.name || "",
                slug: restaurantDoc.slug || "",
                legal_name: restaurantDoc.legal_name || null,
                trade_name: restaurantDoc.trade_name || null,
                logo_url: restaurantDoc.logo_url || null,
                rfc: restaurantDoc.rfc || null,
                regimen_fiscal: restaurantDoc.regimen_fiscal || null,
                uso_cfdi_default: restaurantDoc.uso_cfdi_default || "G03",
                fiscal_address: parseJson(restaurantDoc.fiscal_address, {}),
                contacts: parseJson(restaurantDoc.contacts, {}),
                ticket_config: parseJson(restaurantDoc.ticket_config, {}),
                billing_config: parseJson(restaurantDoc.billing_config, {}),
                timezone: restaurantDoc.timezone || "America/Mexico_City",
                currency: restaurantDoc.currency || "MXN",
                locale: restaurantDoc.locale || "es-MX",
                onboarding_complete: restaurantDoc.onboarding_complete || false,
                onboarding_step: restaurantDoc.onboarding_step || "basic",
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
