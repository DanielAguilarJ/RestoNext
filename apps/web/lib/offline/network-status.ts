/**
 * RestoNext MX - Network Status Utilities
 * Detect online/offline state for Offline-First functionality
 */

/**
 * Check if the browser is currently online
 */
export function isOnline(): boolean {
    if (typeof window === 'undefined') {
        return true; // SSR: assume online
    }
    return navigator.onLine;
}

/**
 * Check if the browser is currently offline
 */
export function isOffline(): boolean {
    return !isOnline();
}

type NetworkChangeCallback = (online: boolean) => void;

const listeners: Set<NetworkChangeCallback> = new Set();
let isListenerAttached = false;

function handleOnline() {
    listeners.forEach((callback) => callback(true));
}

function handleOffline() {
    listeners.forEach((callback) => callback(false));
}

/**
 * Subscribe to network status changes
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
    }

    // Return unsubscribe function
    return () => {
        listeners.delete(callback);

        // Clean up global listeners if no more subscribers
        if (listeners.size === 0 && isListenerAttached) {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
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
