/**
 * RestoNext MX - useSync Hook
 * React hook for monitoring sync status and handling reconnection
 * 
 * Features:
 * - Debounced sync triggers to prevent race conditions
 * - Optimistic UI state preservation
 * - Configurable via environment variables
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    isOnline as checkOnline,
    getConfirmedNetworkState,
    onNetworkChange,
    syncQueueManager,
    type PendingOrder,
    type SyncEventType,
} from '../lib/offline';

// ============================================
// Configuration (Environment Variables)
// ============================================

const SYNC_DEBOUNCE_MS = parseInt(
    process.env.NEXT_PUBLIC_SYNC_DEBOUNCE_MS || '2000'
);

// ============================================
// Types
// ============================================

export interface SyncState {
    isOnline: boolean;
    isSyncing: boolean;
    pendingCount: number;
    syncingCount: number;
    conflicts: PendingOrder[];
    lastSyncResult?: {
        total: number;
        success: number;
        conflicts: number;
    };
}

export interface UseSyncReturn extends SyncState {
    syncNow: () => Promise<void>;
    resolveConflict: (localId: string, newTableId?: string) => Promise<void>;
    discardOrder: (localId: string) => Promise<void>;
    refreshStatus: () => Promise<void>;
    isSyncingItem: (localId: string) => boolean;
}

/**
 * Hook for managing offline sync state and actions
 */
export function useSync(): UseSyncReturn {
    const [state, setState] = useState<SyncState>({
        isOnline: true,
        isSyncing: false,
        pendingCount: 0,
        syncingCount: 0,
        conflicts: [],
    });

    // Refs for debouncing and cleanup
    const syncDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const mountedRef = useRef(true);

    // Refresh pending count and conflicts
    const refreshStatus = useCallback(async () => {
        if (!mountedRef.current) return;

        try {
            const [pendingCount, conflicts] = await Promise.all([
                syncQueueManager.getPendingCount(),
                syncQueueManager.getConflicts(),
            ]);

            const { isSyncing, syncingCount } = syncQueueManager.getSyncStatus();

            setState((prev) => ({
                ...prev,
                pendingCount,
                conflicts,
                isSyncing,
                syncingCount,
            }));
        } catch (error) {
            console.error('[useSync] Error refreshing status:', error);
        }
    }, []);

    // Manual sync trigger
    const syncNow = useCallback(async () => {
        if (!getConfirmedNetworkState()) {
            console.log('[useSync] Cannot sync while offline (confirmed)');
            return;
        }

        setState((prev) => ({ ...prev, isSyncing: true }));

        try {
            await syncQueueManager.processQueue();
        } finally {
            await refreshStatus();
        }
    }, [refreshStatus]);

    // Debounced sync trigger for network changes
    const scheduleSyncOnReconnect = useCallback(() => {
        // Clear any existing debounce
        if (syncDebounceRef.current) {
            clearTimeout(syncDebounceRef.current);
        }

        console.log(`[useSync] Scheduling sync in ${SYNC_DEBOUNCE_MS}ms...`);

        syncDebounceRef.current = setTimeout(async () => {
            if (!mountedRef.current) return;

            console.log('[useSync] Debounce complete, triggering sync...');
            await syncQueueManager.processQueue();
            await refreshStatus();
        }, SYNC_DEBOUNCE_MS);
    }, [refreshStatus]);

    // Resolve a conflict with optional new table
    const resolveConflict = useCallback(
        async (localId: string, newTableId?: string) => {
            if (newTableId) {
                const order = state.conflicts.find((c) => c.local_id === localId);
                if (order) {
                    await syncQueueManager.resolveConflict(localId, {
                        ...order.order_data,
                        table_id: newTableId,
                    });
                }
            } else {
                await syncQueueManager.resolveConflict(localId);
            }
            await refreshStatus();
        },
        [state.conflicts, refreshStatus]
    );

    // Discard a pending/conflicting order
    const discardOrder = useCallback(
        async (localId: string) => {
            await syncQueueManager.discardOrder(localId);
            await refreshStatus();
        },
        [refreshStatus]
    );

    // Check if a specific item is syncing
    const isSyncingItem = useCallback((localId: string): boolean => {
        return syncQueueManager.isSyncingItem(localId);
    }, []);

    // Initialize and set up listeners
    useEffect(() => {
        mountedRef.current = true;

        // Set initial online state (use confirmed network state)
        setState((prev) => ({ ...prev, isOnline: getConfirmedNetworkState() }));

        // Initial status refresh
        refreshStatus();

        // Network change listener (debounced via network-status.ts)
        const unsubscribeNetwork = onNetworkChange((online) => {
            if (!mountedRef.current) return;

            console.log(`[useSync] Network state changed: ${online ? 'ONLINE' : 'OFFLINE'}`);
            setState((prev) => ({ ...prev, isOnline: online }));

            if (online) {
                // Debounced sync trigger
                scheduleSyncOnReconnect();
            }
        });

        // Sync events listener
        const unsubscribeSyncEvents = syncQueueManager.subscribe(
            (event: SyncEventType, data?: any) => {
                if (!mountedRef.current) return;

                switch (event) {
                    case 'sync_started':
                        setState((prev) => ({ ...prev, isSyncing: true }));
                        break;

                    case 'sync_completed':
                        setState((prev) => ({
                            ...prev,
                            isSyncing: false,
                            lastSyncResult: data,
                        }));
                        refreshStatus();
                        break;

                    case 'sync_failed':
                        setState((prev) => ({ ...prev, isSyncing: false }));
                        break;

                    case 'order_queued':
                    case 'order_syncing':
                    case 'order_synced':
                        refreshStatus();
                        break;

                    case 'conflict_detected':
                        refreshStatus();
                        break;
                }
            }
        );

        return () => {
            mountedRef.current = false;
            unsubscribeNetwork();
            unsubscribeSyncEvents();

            if (syncDebounceRef.current) {
                clearTimeout(syncDebounceRef.current);
            }
        };
    }, [refreshStatus, scheduleSyncOnReconnect]);

    return {
        ...state,
        syncNow,
        resolveConflict,
        discardOrder,
        refreshStatus,
        isSyncingItem,
    };
}

export default useSync;
