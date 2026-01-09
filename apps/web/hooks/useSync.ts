/**
 * RestoNext MX - useSync Hook
 * React hook for monitoring sync status and handling reconnection
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    isOnline as checkOnline,
    onNetworkChange,
    syncQueueManager,
    type PendingOrder,
    type SyncEventType,
} from '../lib/offline';

export interface SyncState {
    isOnline: boolean;
    isSyncing: boolean;
    pendingCount: number;
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
}

/**
 * Hook for managing offline sync state and actions
 */
export function useSync(): UseSyncReturn {
    const [state, setState] = useState<SyncState>({
        isOnline: true,
        isSyncing: false,
        pendingCount: 0,
        conflicts: [],
    });

    // Refresh pending count and conflicts
    const refreshStatus = useCallback(async () => {
        try {
            const [pendingCount, conflicts] = await Promise.all([
                syncQueueManager.getPendingCount(),
                syncQueueManager.getConflicts(),
            ]);

            setState((prev) => ({
                ...prev,
                pendingCount,
                conflicts,
            }));
        } catch (error) {
            console.error('[useSync] Error refreshing status:', error);
        }
    }, []);

    // Manual sync trigger
    const syncNow = useCallback(async () => {
        if (!checkOnline()) {
            console.log('[useSync] Cannot sync while offline');
            return;
        }

        setState((prev) => ({ ...prev, isSyncing: true }));

        try {
            await syncQueueManager.processQueue();
        } finally {
            await refreshStatus();
            setState((prev) => ({ ...prev, isSyncing: false }));
        }
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

    // Initialize and set up listeners
    useEffect(() => {
        // Set initial online state
        setState((prev) => ({ ...prev, isOnline: checkOnline() }));

        // Initial status refresh
        refreshStatus();

        // Network change listener
        const unsubscribeNetwork = onNetworkChange((online) => {
            setState((prev) => ({ ...prev, isOnline: online }));

            if (online) {
                console.log('[useSync] Back online, triggering sync...');
                syncQueueManager.processQueue().then(() => {
                    refreshStatus();
                });
            }
        });

        // Sync events listener
        const unsubscribeSyncEvents = syncQueueManager.subscribe(
            (event: SyncEventType, data?: any) => {
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
                        refreshStatus();
                        break;

                    case 'conflict_detected':
                        refreshStatus();
                        break;
                }
            }
        );

        return () => {
            unsubscribeNetwork();
            unsubscribeSyncEvents();
        };
    }, [refreshStatus]);

    return {
        ...state,
        syncNow,
        resolveConflict,
        discardOrder,
        refreshStatus,
    };
}

export default useSync;
