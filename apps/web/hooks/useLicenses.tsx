"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

/**
 * Module license definitions
 */
export const MODULES = {
    pos: { name: "Punto de Venta", route: "/pos", requiredLicense: null },
    kitchen: { name: "Kitchen Display", route: "/kitchen", requiredLicense: null },
    inventory: { name: "Inventario", route: "/inventory", requiredLicense: "inventory" },
    catering: { name: "Catering", route: "/catering", requiredLicense: "catering" },
    analytics_ai: { name: "Analytics IA", route: "/modules/ai-forecasting", requiredLicense: "analytics_ai" },
    loyalty: { name: "Lealtad", route: "/customers", requiredLicense: "loyalty" },
    reservations: { name: "Reservaciones", route: "/reservations", requiredLicense: "reservations" },
    promotions: { name: "Promociones", route: "/promotions", requiredLicense: "promotions" },
    multi_branch: { name: "Multi-Sucursal", route: "/modules/multi-branch", requiredLicense: "multi_branch" },
} as const;

export type ModuleKey = keyof typeof MODULES;

/**
 * License context value type
 */
interface LicenseContextValue {
    licenses: Record<string, boolean>;
    isLoading: boolean;
    hasLicense: (module: string) => boolean;
    hasAnyLicense: (modules: string[]) => boolean;
    refreshLicenses: () => Promise<void>;
    currentPlan: string | null;
}

const LicenseContext = createContext<LicenseContextValue | undefined>(undefined);

/**
 * Cookie name for storing licenses (synced with middleware)
 */
const LICENSE_COOKIE_NAME = "restonext_licenses";

/**
 * Get licenses from cookie
 */
function getLicensesFromCookie(): string[] {
    if (typeof document === "undefined") return [];

    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split("=");
        if (name === LICENSE_COOKIE_NAME) {
            return value.split(",").filter(Boolean);
        }
    }
    return [];
}

/**
 * Set licenses cookie for middleware
 */
function setLicensesCookie(licenses: string[]): void {
    if (typeof document === "undefined") return;

    const expires = new Date();
    expires.setDate(expires.getDate() + 7); // 7 days

    document.cookie = `${LICENSE_COOKIE_NAME}=${licenses.join(",")};path=/;expires=${expires.toUTCString()};SameSite=Strict`;
}

/**
 * Provider props
 */
interface LicenseProviderProps {
    children: ReactNode;
    initialLicenses?: Record<string, boolean>;
}

/**
 * License Provider Component
 * 
 * Provides license information to all children components.
 * Syncs with cookies for middleware access.
 */
export function LicenseProvider({ children, initialLicenses }: LicenseProviderProps) {
    const [licenses, setLicenses] = useState<Record<string, boolean>>(initialLicenses || {});
    const [isLoading, setIsLoading] = useState(!initialLicenses);
    const [currentPlan, setCurrentPlan] = useState<string | null>(null);

    /**
     * Fetch licenses from API
     */
    const refreshLicenses = useCallback(async () => {
        try {
            setIsLoading(true);

            // Get token from localStorage
            const token = typeof localStorage !== "undefined"
                ? localStorage.getItem("restonext_token")
                : null;

            if (!token) {
                setLicenses({});
                setCurrentPlan(null);
                return;
            }

            const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://restonext.me/api";

            const response = await fetch(`${API_URL}/auth/me`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch user data");
            }

            const userData = await response.json();

            // Extract active_addons from tenant
            const activeAddons = userData.tenant?.active_addons || {};
            setLicenses(activeAddons);
            setCurrentPlan(userData.tenant?.billing_config?.current_plan || "starter");

            // Sync with cookie for middleware
            const enabledModules = Object.entries(activeAddons)
                .filter(([_, enabled]) => enabled)
                .map(([key]) => key);
            setLicensesCookie(enabledModules);

        } catch (error) {
            console.error("Failed to refresh licenses:", error);
            // Use cached cookie values as fallback
            const cachedLicenses = getLicensesFromCookie();
            const licenseMap: Record<string, boolean> = {};
            cachedLicenses.forEach(key => {
                licenseMap[key] = true;
            });
            setLicenses(licenseMap);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Check if user has a specific license
     */
    const hasLicense = useCallback((module: string): boolean => {
        // Core modules are always available
        const coreModules = ["pos", "kitchen", "kds", "cashier"];
        if (coreModules.includes(module)) return true;

        return licenses[module] === true;
    }, [licenses]);

    /**
     * Check if user has any of the specified licenses
     */
    const hasAnyLicense = useCallback((modules: string[]): boolean => {
        return modules.length === 0 || modules.some(m => hasLicense(m));
    }, [hasLicense]);

    // Load licenses on mount
    useEffect(() => {
        if (!initialLicenses) {
            refreshLicenses();
        } else {
            // Sync initial licenses with cookie
            const enabledModules = Object.entries(initialLicenses)
                .filter(([_, enabled]) => enabled)
                .map(([key]) => key);
            setLicensesCookie(enabledModules);
        }
    }, [initialLicenses, refreshLicenses]);

    const value: LicenseContextValue = {
        licenses,
        isLoading,
        hasLicense,
        hasAnyLicense,
        refreshLicenses,
        currentPlan,
    };

    return (
        <LicenseContext.Provider value={value}>
            {children}
        </LicenseContext.Provider>
    );
}

/**
 * Hook to access license context
 */
export function useLicenses(): LicenseContextValue {
    const context = useContext(LicenseContext);

    if (!context) {
        throw new Error("useLicenses must be used within a LicenseProvider");
    }

    return context;
}

/**
 * Hook to check if current route requires upgrade
 */
export function useModuleAccess(moduleKey: ModuleKey) {
    const { hasLicense, isLoading, currentPlan } = useLicenses();

    const module = MODULES[moduleKey];
    const requiredLicense = module?.requiredLicense;

    const hasAccess = !requiredLicense || hasLicense(requiredLicense);

    return {
        hasAccess,
        isLoading,
        moduleName: module?.name || moduleKey,
        requiredLicense,
        currentPlan,
        upgradeRequired: !hasAccess && !isLoading,
    };
}
