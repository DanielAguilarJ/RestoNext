"use client";

import { ReactNode } from "react";
import { LicenseProvider } from "@/hooks/useLicenses";

/**
 * Dashboard Layout
 * 
 * Wraps all authenticated dashboard pages with:
 * - License context for module access control
 * - Consistent navigation/sidebar (can be added later)
 */
export default function DashboardLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <LicenseProvider>
            <div className="min-h-screen bg-zinc-950">
                {children}
            </div>
        </LicenseProvider>
    );
}
