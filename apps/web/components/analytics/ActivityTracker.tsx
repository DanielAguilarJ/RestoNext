'use client';

/**
 * RestoNext MX - Activity Tracker Component
 * ==========================================
 * 
 * Wrapper component that automatically tracks user activities:
 * - Page views (using Next.js router)
 * - Navigation events
 * - Click events on buttons/links
 * - Window focus/blur
 * - Global error handling
 * 
 * Usage:
 *   // In app/layout.tsx
 *   <ActivityTracker>
 *     {children}
 *   </ActivityTracker>
 */

import { useEffect, useRef, useCallback, ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Logger } from '@/lib/logger';

interface ActivityTrackerProps {
    children: ReactNode;
    /** Enable click tracking on buttons and links */
    trackClicks?: boolean;
    /** Enable page view tracking */
    trackPageViews?: boolean;
    /** Enable window focus/blur tracking */
    trackFocus?: boolean;
    /** Enable error tracking */
    trackErrors?: boolean;
}

export function ActivityTracker({
    children,
    trackClicks = true,
    trackPageViews = true,
    trackFocus = true,
    trackErrors = true,
}: ActivityTrackerProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const previousPathname = useRef<string>('');
    const isInitialized = useRef(false);

    // ============================================
    // Page View Tracking
    // ============================================
    useEffect(() => {
        if (!trackPageViews) return;

        const currentPath = pathname || '/';
        const queryString = searchParams?.toString();
        const fullPath = queryString ? `${currentPath}?${queryString}` : currentPath;

        // Track navigation if not first load
        if (isInitialized.current && previousPathname.current && previousPathname.current !== currentPath) {
            Logger.navigation(previousPathname.current, currentPath);
        }

        // Track page view
        Logger.pageView(fullPath, {
            referrer: typeof document !== 'undefined' ? document.referrer : undefined,
            query: queryString || undefined,
        });

        previousPathname.current = currentPath;
        isInitialized.current = true;
    }, [pathname, searchParams, trackPageViews]);

    // ============================================
    // Click Tracking
    // ============================================
    const handleClick = useCallback((event: MouseEvent) => {
        if (!trackClicks) return;

        const target = event.target as HTMLElement;
        if (!target) return;

        // Find the nearest interactive element
        const interactiveElement = target.closest('button, a, [role="button"], [data-track]');
        if (!interactiveElement) return;

        // Get element identifier
        const element = interactiveElement.getAttribute('data-track') ||
            interactiveElement.getAttribute('aria-label') ||
            interactiveElement.getAttribute('id') ||
            interactiveElement.textContent?.trim().substring(0, 50) ||
            interactiveElement.tagName.toLowerCase();

        // Get component context
        const component = interactiveElement.closest('[data-component]')?.getAttribute('data-component') ||
            interactiveElement.closest('form')?.getAttribute('name') ||
            interactiveElement.closest('section')?.getAttribute('id') ||
            pathname || 'unknown';

        // Determine element type
        const tagName = interactiveElement.tagName.toLowerCase();
        const isLink = tagName === 'a';
        const href = isLink ? (interactiveElement as HTMLAnchorElement).href : undefined;

        Logger.click(element, component, {
            tag: tagName,
            href: href ? new URL(href).pathname : undefined,
        });
    }, [trackClicks, pathname]);

    useEffect(() => {
        if (!trackClicks || typeof document === 'undefined') return;

        document.addEventListener('click', handleClick, { capture: true });
        return () => {
            document.removeEventListener('click', handleClick, { capture: true });
        };
    }, [handleClick, trackClicks]);

    // ============================================
    // Focus/Blur Tracking  
    // ============================================
    useEffect(() => {
        if (!trackFocus || typeof window === 'undefined') return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                Logger.action('window_blur', 'window', { page: pathname });
            } else {
                Logger.action('window_focus', 'window', { page: pathname });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [trackFocus, pathname]);

    // ============================================
    // Global Error Tracking
    // ============================================
    useEffect(() => {
        if (!trackErrors || typeof window === 'undefined') return;

        const handleError = (event: ErrorEvent) => {
            Logger.error(
                event.error || new Error(event.message),
                'window.onerror',
                {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                }
            );
        };

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            Logger.error(
                event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
                'unhandledRejection',
                {
                    type: 'promise_rejection',
                }
            );
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, [trackErrors]);

    // ============================================
    // User Context from Auth
    // ============================================
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Try to get user context from localStorage (set by auth)
        const checkUserContext = () => {
            try {
                const token = localStorage.getItem('restonext_token');
                if (token) {
                    // Parse JWT to get user info (basic decode, not verification)
                    const parts = token.split('.');
                    if (parts.length === 3) {
                        const payload = JSON.parse(atob(parts[1]));
                        Logger.setUser(payload.sub || null, payload.tenant_id || null);
                    }
                } else {
                    Logger.clearUser();
                }
            } catch (e) {
                // Invalid token or parse error, clear context
                Logger.clearUser();
            }
        };

        // Check on mount
        checkUserContext();

        // Listen for storage changes (login/logout in other tabs)
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'restonext_token') {
                checkUserContext();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    return <>{children}</>;
}

// Export hook for manual tracking
export function useLogger() {
    return Logger;
}
