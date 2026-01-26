'use client';

/**
 * RestoNext MX - App Shell Component
 * ====================================
 * Wraps the application with global UI components:
 * - GlobalErrorBoundary (crash protection for POS)
 * - Help Slide Over (floating help button)
 * - Onboarding Wizard (shown for new tenants)
 * - Legal Terms Blocker (Stripe compliance)
 * - Toast notifications
 */

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import HelpSlideOver from '@/components/ui/HelpSlideOver';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import GlobalErrorBoundary from '@/components/ui/GlobalErrorBoundary';
import { FileText, Shield, ArrowRight, Loader2 } from 'lucide-react';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://restonext.me/api';

const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
};

interface OnboardingStatus {
    show_wizard: boolean;
    onboarding_step: string;
    onboarding_complete: boolean;
    tenant_name: string;
    has_logo: boolean;
}

interface AcceptanceStatus {
    terms_accepted: boolean;
    terms_version: string | null;
    privacy_accepted: boolean;
    privacy_version: string | null;
    requires_acceptance: boolean;
}

interface AppShellProps {
    children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [tenantName, setTenantName] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [requiresLegalAcceptance, setRequiresLegalAcceptance] = useState(false);
    const [isLoadingLegal, setIsLoadingLegal] = useState(true);

    // Public paths that don't require auth or legal checks
    const isPublicPath =
        pathname.startsWith('/login') ||
        pathname.startsWith('/register') ||
        pathname.startsWith('/dining/') ||
        pathname.startsWith('/billing') ||
        pathname.startsWith('/legal/');

    // Check if user is authenticated and needs onboarding
    useEffect(() => {
        const checkOnboardingStatus = async () => {
            const token = getToken();

            if (!token) {
                setIsAuthenticated(false);
                setIsLoadingLegal(false);
                return;
            }

            setIsAuthenticated(true);

            // Don't check onboarding on public pages
            if (isPublicPath) {
                setIsLoadingLegal(false);
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/onboarding/status`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const status: OnboardingStatus = await response.json();
                    setShowOnboarding(status.show_wizard);
                    setTenantName(status.tenant_name);
                }
            } catch (error) {
                console.error('Failed to check onboarding status:', error);
            }
        };

        checkOnboardingStatus();
    }, [pathname, isPublicPath]);

    // Check legal acceptance status (Stripe compliance)
    useEffect(() => {
        const checkLegalStatus = async () => {
            const token = getToken();

            if (!token || isPublicPath) {
                setIsLoadingLegal(false);
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/legal/acceptance-status`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const status: AcceptanceStatus = await response.json();
                    setRequiresLegalAcceptance(status.requires_acceptance);
                }
            } catch (error) {
                console.error('Failed to check legal status:', error);
                // If we can't check, don't block (fail open for UX)
                setRequiresLegalAcceptance(false);
            } finally {
                setIsLoadingLegal(false);
            }
        };

        checkLegalStatus();
    }, [pathname, isPublicPath]);

    // Handle onboarding completion
    const handleOnboardingComplete = () => {
        setShowOnboarding(false);
        window.location.reload();
    };

    // Render legal acceptance blocking screen
    const renderLegalBlocker = () => (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="max-w-lg w-full">
                <div className="bg-slate-800/80 backdrop-blur-lg rounded-2xl border border-amber-500/30 shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 px-6 py-8 text-center border-b border-amber-500/20">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/20 mb-4">
                            <Shield className="w-10 h-10 text-amber-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">
                            Actualización de Términos
                        </h1>
                        <p className="text-slate-300 text-sm">
                            Hemos actualizado nuestros Términos de Servicio y/o Política de Privacidad.
                            Por favor revísalos para continuar.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="p-6 space-y-3">
                        <button
                            onClick={() => router.push('/legal/terms')}
                            className="w-full flex items-center justify-between gap-2 px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all duration-200"
                        >
                            <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-amber-400" />
                                <span className="font-medium">Términos y Condiciones</span>
                            </div>
                            <ArrowRight className="w-5 h-5 text-slate-400" />
                        </button>

                        <button
                            onClick={() => router.push('/legal/privacy')}
                            className="w-full flex items-center justify-between gap-2 px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all duration-200"
                        >
                            <div className="flex items-center gap-3">
                                <Shield className="w-5 h-5 text-blue-400" />
                                <span className="font-medium">Política de Privacidad</span>
                            </div>
                            <ArrowRight className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-700">
                        <p className="text-xs text-slate-500 text-center">
                            Al continuar usando RestoNext, confirmas que has leído y aceptas estos documentos.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    // Don't show help button on public/auth pages
    const showHelpButton = isAuthenticated &&
        !isPublicPath &&
        !requiresLegalAcceptance;

    // Show loading while checking legal status
    if (!isPublicPath && isLoadingLegal && isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                    <p className="text-slate-400 text-sm">Verificando estado...</p>
                </div>
            </div>
        );
    }

    // Block access if legal acceptance required
    if (!isPublicPath && requiresLegalAcceptance && isAuthenticated) {
        return renderLegalBlocker();
    }

    return (
        <GlobalErrorBoundary>
            <>
                {children}

                {/* Global Help Button */}
                {showHelpButton && <HelpSlideOver />}

                {/* Onboarding Wizard */}
                <OnboardingWizard
                    isOpen={showOnboarding}
                    onComplete={handleOnboardingComplete}
                    tenantName={tenantName}
                />
            </>
        </GlobalErrorBoundary>
    );
}

