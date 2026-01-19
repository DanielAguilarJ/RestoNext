/**
 * RestoNext MX - Network Status Utilities
 * Detect online/offline state for Offline-First functionality
 * 
 * Features:
 * - Debounced network status to prevent flicker
 * - Active connectivity check via backend ping
 * - Configurable via environment variables
 */

// ============================================
// Configuration (Environment Variables)
// ============================================

const NETWORK_DEBOUNCE_MS = parseInt(
    process.env.NEXT_PUBLIC_NETWORK_DEBOUNCE_MS || '3000'
);
const NETWORK_PING_TIMEOUT_MS = parseInt(
    process.env.NEXT_PUBLIC_NETWORK_PING_TIMEOUT_MS || '5000'
);

// ============================================
// Internal State
// ============================================

type NetworkChangeCallback = (online: boolean) => void;

const listeners: Set<NetworkChangeCallback> = new Set();
let isListenerAttached = false;
let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
let lastConfirmedState: boolean = true;
let isCheckingConnectivity = false;

// ============================================
// Core Functions
// ============================================

/**
 * Check if the browser reports online status
 * Note: This is just a hint, not reliable for actual connectivity
 */
export function isOnline(): boolean {
    if (typeof window === 'undefined') {
        return true; // SSR: assume online
    }
    return navigator.onLine && lastConfirmedState;
}

/**
 * Check if the browser is currently offline
 */
export function isOffline(): boolean {
    return !isOnline();
}

/**
 * Get the debounced/confirmed network state
 * This is more reliable than raw navigator.onLine
 */
export function getConfirmedNetworkState(): boolean {
    return lastConfirmedState;
}

/**
 * Perform an active connectivity check by pinging the backend
 * Returns true if the backend is reachable
 */
async function checkRealConnectivity(): Promise<boolean> {
    if (typeof window === 'undefined') return true;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    if (!apiUrl) {
        // Fallback to navigator.onLine if no API URL configured
        return navigator.onLine;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), NETWORK_PING_TIMEOUT_MS);

        const response = await fetch(`${apiUrl}/ping`, {
            method: 'GET',
            cache: 'no-store',
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response.ok;
    } catch (error) {
        // Network error, timeout, or abort
        return false;
    }
}

/**
 * Notify all listeners of network state change
 */
function notifyListeners(online: boolean): void {
    if (lastConfirmedState === online) return; // No change

    lastConfirmedState = online;
    console.log(`[NetworkStatus] State confirmed: ${online ? 'ONLINE' : 'OFFLINE'}`);
    listeners.forEach((callback) => callback(online));
}

/**
 * Handle browser online event
 * Verifies actual connectivity before announcing online
 */
async function handleOnline(): Promise<void> {
    // Clear any pending offline debounce
    if (debounceTimeout) {
        clearTimeout(debounceTimeout);
        debounceTimeout = null;
    }

    // Avoid concurrent checks
    if (isCheckingConnectivity) return;
    isCheckingConnectivity = true;

    try {
        // Verify with actual ping before announcing online
        const reallyOnline = await checkRealConnectivity();

        if (reallyOnline) {
            notifyListeners(true);
        }
    } finally {
        isCheckingConnectivity = false;
    }
}

/**
 * Handle browser offline event
 * Debounces before confirming offline to prevent flicker
 */
function handleOffline(): void {
    // Clear any previous debounce
    if (debounceTimeout) {
        clearTimeout(debounceTimeout);
    }

    console.log(`[NetworkStatus] Offline detected, waiting ${NETWORK_DEBOUNCE_MS}ms to confirm...`);

    // Wait for debounce period before confirming offline
    debounceTimeout = setTimeout(async () => {
        // Double-check with real connectivity test
        const reallyOffline = !(await checkRealConnectivity());

        if (reallyOffline) {
            notifyListeners(false);
        } else {
            console.log('[NetworkStatus] False alarm - connectivity restored');
        }
    }, NETWORK_DEBOUNCE_MS);
}

/**
 * Subscribe to network status changes
 * Uses debounced detection to prevent UI flicker
 * @returns Unsubscribe function
 */
export function onNetworkChange(callback: NetworkChangeCallback): () => void {
    if (typeof window === 'undefined') {
        return () => { }; // SSR: no-op
    }

    listeners.add(callback);

    // Attach global listeners only once
    if (!isListenerAttached) {
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        isListenerAttached = true;

        // Initialize state
        lastConfirmedState = navigator.onLine;
    }

    // Return unsubscribe function
    return () => {
        listeners.delete(callback);

        // Clean up global listeners if no more subscribers
        if (listeners.size === 0 && isListenerAttached) {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (debounceTimeout) {
                clearTimeout(debounceTimeout);
                debounceTimeout = null;
            }
            isListenerAttached = false;
        }
    };
}

/**
 * Wait for network to come back online
 * @param timeoutMs Optional timeout in milliseconds
 */
export function waitForOnline(timeoutMs?: number): Promise<void> {
    return new Promise((resolve, reject) => {
        if (isOnline()) {
            resolve();
            return;
        }

        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        const unsubscribe = onNetworkChange((online) => {
            if (online) {
                if (timeoutId) clearTimeout(timeoutId);
                unsubscribe();
                resolve();
            }
        });

        if (timeoutMs) {
            timeoutId = setTimeout(() => {
                unsubscribe();
                reject(new Error('Network timeout: still offline'));
            }, timeoutMs);
        }
    });
}

/**
 * Force a connectivity check and update state
 * Useful for manual refresh or diagnostics
 */
export async function forceConnectivityCheck(): Promise<boolean> {
    const isConnected = await checkRealConnectivity();
    notifyListeners(isConnected);
    return isConnected;
}
