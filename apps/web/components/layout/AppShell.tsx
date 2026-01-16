'use client';

/**
 * RestoNext MX - App Shell Component
 * ====================================
 * Wraps the application with global UI components:
 * - Help Slide Over (floating help button)
 * - Onboarding Wizard (shown for new tenants)
 * - Toast notifications
 */

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import HelpSlideOver from '@/components/ui/HelpSlideOver';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

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

interface AppShellProps {
    children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
    const pathname = usePathname();
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [tenantName, setTenantName] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Check if user is authenticated and needs onboarding
    useEffect(() => {
        const checkOnboardingStatus = async () => {
            const token = getToken();

            if (!token) {
                setIsAuthenticated(false);
                return;
            }

            setIsAuthenticated(true);

            // Don't check onboarding on auth pages
            if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
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
    }, [pathname]);

    // Handle onboarding completion
    const handleOnboardingComplete = () => {
        setShowOnboarding(false);
        // Reload the page to refresh all tenant data
        window.location.reload();
    };

    // Don't show help button on public/auth pages
    const showHelpButton = isAuthenticated &&
        !pathname.startsWith('/login') &&
        !pathname.startsWith('/register') &&
        !pathname.startsWith('/dining/') && // Public dining pages
        !pathname.startsWith('/billing'); // Public billing pages

    return (
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
    );
}
