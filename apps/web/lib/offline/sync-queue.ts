/**
 * RestoNext MX - Sync Queue Manager
 * Handles offline order queue and synchronization with backend
 * 
 * Features:
 * - Bulletproof persistence in Dexie (IndexedDB)
 * - Exponential backoff with jitter for retries
 * - Sync status tracking for UI feedback
 * - Configurable via environment variables
 */

import {
    getOfflineDB,
    PendingOrder,
    PendingOrderData,
    PendingOrderStatus,
} from './dexie-db';
import { isOnline, getConfirmedNetworkState } from './network-status';

// ============================================
// Configuration (Environment Variables)
// ============================================

const SYNC_RETRY_DELAY_MS = parseInt(
    process.env.NEXT_PUBLIC_SYNC_RETRY_DELAY_MS || '5000'
);
const SYNC_MAX_RETRIES = parseInt(
    process.env.NEXT_PUBLIC_SYNC_MAX_RETRIES || '10'
);
const SYNC_BACKOFF_MAX_MS = parseInt(
    process.env.NEXT_PUBLIC_SYNC_BACKOFF_MAX_MS || '60000'
);

// ============================================
// Types
// ============================================

export interface SyncResult {
    success: boolean;
    local_id: string;
    server_id?: string;
    error?: string;
    conflict?: boolean;
}

export interface OptimisticOrder {
    id: string;
    local_id: string;
    status: 'pending_sync';
    table_id: string;
    items: PendingOrderData['items'];
    notes?: string;
    created_at: string;
    is_offline: true;
}

export type SyncEventType =
    | 'sync_started'
    | 'sync_completed'
    | 'sync_failed'
    | 'conflict_detected'
    | 'order_queued'
    | 'order_syncing'
    | 'order_synced';

export type SyncEventCallback = (
    event: SyncEventType,
    data?: any
) => void;

// ============================================
// Sync Queue Manager
// ============================================

class SyncQueueManagerClass {
    private isSyncing = false;
    private listeners: Set<SyncEventCallback> = new Set();
    private syncingItems: Set<string> = new Set();
    private syncPromise: Promise<SyncResult[]> | null = null;

    /**
     * Subscribe to sync events
     */
    subscribe(callback: SyncEventCallback): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    private emit(event: SyncEventType, data?: any): void {
        this.listeners.forEach((callback) => callback(event, data));
    }

    /**
     * Generate a unique local ID for offline orders
     */
    private generateLocalId(): string {
        return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Calculate retry delay with exponential backoff and jitter
     */
    private getRetryDelay(attempts: number): number {
        // Exponential backoff: 5s, 10s, 20s, 40s, max 60s
        const baseDelay = Math.min(
            SYNC_RETRY_DELAY_MS * Math.pow(2, attempts),
            SYNC_BACKOFF_MAX_MS
        );
        // Add jitter (±20%)
        const jitter = baseDelay * (0.8 + Math.random() * 0.4);
        return Math.round(jitter);
    }

    /**
     * Check if a specific item is currently being synced
     */
    isSyncingItem(localId: string): boolean {
        return this.syncingItems.has(localId);
    }

    /**
     * Get all items currently being synced
     */
    getSyncingItems(): Set<string> {
        return new Set(this.syncingItems);
    }

    /**
     * Enqueue an order for later sync (when offline)
     * Returns an optimistic order for immediate UI feedback
     */
    async enqueue(orderData: PendingOrderData): Promise<OptimisticOrder> {
        const db = getOfflineDB();
        const localId = this.generateLocalId();

        const pendingOrder: PendingOrder = {
            local_id: localId,
            order_data: orderData,
            created_at: new Date(),
            sync_attempts: 0,
            status: 'pending_sync',
        };

        await db.pending_orders.add(pendingOrder);

        console.log(`[SyncQueue] Order ${localId} queued for sync`);
        this.emit('order_queued', { local_id: localId });

        // Return optimistic response for UI
        return {
            id: localId,
            local_id: localId,
            status: 'pending_sync',
            table_id: orderData.table_id,
            items: orderData.items,
            notes: orderData.notes,
            created_at: new Date().toISOString(),
            is_offline: true,
        };
    }

    /**
     * Get count of pending orders
     */
    async getPendingCount(): Promise<number> {
        const db = getOfflineDB();
        return db.pending_orders.where('status').equals('pending_sync').count();
    }

    /**
     * Get all pending orders (for UI display)
     */
    async getPendingOrders(): Promise<PendingOrder[]> {
        const db = getOfflineDB();
        return db.pending_orders.where('status').equals('pending_sync').toArray();
    }

    /**
     * Get all orders including syncing ones (for complete queue view)
     */
    async getAllQueuedOrders(): Promise<PendingOrder[]> {
        const db = getOfflineDB();
        return db.pending_orders
            .where('status')
            .anyOf(['pending_sync', 'syncing'])
            .toArray();
    }

    /**
     * Get orders with conflicts
     */
    async getConflicts(): Promise<PendingOrder[]> {
        const db = getOfflineDB();
        return db.pending_orders.where('status').equals('conflict').toArray();
    }

    /**
     * Process all pending orders in the queue
     * Returns immediately if already syncing (deduplication)
     */
    async processQueue(): Promise<SyncResult[]> {
        // Deduplication: if already syncing, return the existing promise
        if (this.isSyncing && this.syncPromise) {
            console.log('[SyncQueue] Already syncing, waiting for existing process...');
            return this.syncPromise;
        }

        // Check network state with debounced confirmation
        if (!getConfirmedNetworkState()) {
            console.log('[SyncQueue] Network offline (confirmed), skipping sync');
            return [];
        }

        this.syncPromise = this.doProcessQueue();
        return this.syncPromise;
    }

    /**
     * Internal queue processing
     */
    private async doProcessQueue(): Promise<SyncResult[]> {
        this.isSyncing = true;
        this.emit('sync_started');

        const results: SyncResult[] = [];

        try {
            const pendingOrders = await this.getPendingOrders();
            console.log(`[SyncQueue] Processing ${pendingOrders.length} pending orders`);

            for (const order of pendingOrders) {
                // Skip if max retries exceeded
                if (order.sync_attempts >= SYNC_MAX_RETRIES) {
                    console.log(`[SyncQueue] Order ${order.local_id} exceeded max retries, marking as failed`);
                    const db = getOfflineDB();
                    await db.pending_orders.update(order.local_id, {
                        status: 'failed' as PendingOrderStatus,
                        last_error: 'Max retries exceeded',
                    });
                    continue;
                }

                const result = await this.syncOrder(order);
                results.push(result);

                if (result.conflict) {
                    this.emit('conflict_detected', {
                        local_id: order.local_id,
                        details: result.error,
                    });
                }

                // Add delay between orders to prevent overwhelming the server
                if (pendingOrders.indexOf(order) < pendingOrders.length - 1) {
                    await this.delay(500);
                }
            }

            const successCount = results.filter((r) => r.success).length;
            const conflictCount = results.filter((r) => r.conflict).length;

            this.emit('sync_completed', {
                total: results.length,
                success: successCount,
                conflicts: conflictCount,
            });
        } catch (error) {
            console.error('[SyncQueue] Queue processing error:', error);
            this.emit('sync_failed', { error });
        } finally {
            this.isSyncing = false;
            this.syncPromise = null;
        }

        return results;
    }

    /**
     * Delay helper
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Sync a single order to the backend
     */
    private async syncOrder(order: PendingOrder): Promise<SyncResult> {
        const db = getOfflineDB();
        const API_BASE_URL =
            process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

        // Track as syncing
        this.syncingItems.add(order.local_id);
        this.emit('order_syncing', { local_id: order.local_id });

        // Mark as syncing in DB
        await db.pending_orders.update(order.local_id, {
            status: 'syncing' as PendingOrderStatus,
            sync_attempts: order.sync_attempts + 1,
        });

        try {
            // Get auth token
            const token = localStorage.getItem('access_token');

            const response = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` }),
                },
                body: JSON.stringify(order.order_data),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                // Check for table conflict (409 or specific error message)
                if (
                    response.status === 409 ||
                    errorData.detail?.includes('table') ||
                    errorData.detail?.includes('occupied')
                ) {
                    await db.pending_orders.update(order.local_id, {
                        status: 'conflict' as PendingOrderStatus,
                        last_error: errorData.detail || 'Table conflict detected',
                        conflict_details: `Table ${order.order_data.table_id} may have been occupied while offline`,
                    });

                    this.syncingItems.delete(order.local_id);

                    return {
                        success: false,
                        local_id: order.local_id,
                        error: errorData.detail,
                        conflict: true,
                    };
                }

                // Other API error - mark for retry
                const retryDelay = this.getRetryDelay(order.sync_attempts);
                console.log(`[SyncQueue] Order ${order.local_id} failed, will retry in ${retryDelay}ms`);

                await db.pending_orders.update(order.local_id, {
                    status: 'pending_sync' as PendingOrderStatus,
                    last_error: errorData.detail || `API Error: ${response.status}`,
                });

                this.syncingItems.delete(order.local_id);

                return {
                    success: false,
                    local_id: order.local_id,
                    error: errorData.detail || `API Error: ${response.status}`,
                };
            }

            const serverOrder = await response.json();

            // Success: remove from queue
            await db.pending_orders.delete(order.local_id);
            this.syncingItems.delete(order.local_id);

            console.log(
                `[SyncQueue] Order ${order.local_id} synced as ${serverOrder.id}`
            );

            this.emit('order_synced', {
                local_id: order.local_id,
                server_id: serverOrder.id,
            });

            return {
                success: true,
                local_id: order.local_id,
                server_id: serverOrder.id,
            };
        } catch (error) {
            // Network error - keep as pending for retry
            await db.pending_orders.update(order.local_id, {
                status: 'pending_sync' as PendingOrderStatus,
                last_error: error instanceof Error ? error.message : 'Network error',
            });

            this.syncingItems.delete(order.local_id);

            return {
                success: false,
                local_id: order.local_id,
                error: error instanceof Error ? error.message : 'Network error',
            };
        }
    }

    /**
     * Resolve a conflict by retrying with updated data
     */
    async resolveConflict(
        localId: string,
        updatedOrderData?: PendingOrderData
    ): Promise<SyncResult> {
        const db = getOfflineDB();
        const order = await db.pending_orders.get(localId);

        if (!order) {
            return {
                success: false,
                local_id: localId,
                error: 'Order not found',
            };
        }

        // Update order data if provided (e.g., different table)
        if (updatedOrderData) {
            await db.pending_orders.update(localId, {
                order_data: updatedOrderData,
                status: 'pending_sync' as PendingOrderStatus,
                conflict_details: undefined,
                sync_attempts: 0, // Reset retry count
            });
        } else {
            await db.pending_orders.update(localId, {
                status: 'pending_sync' as PendingOrderStatus,
                sync_attempts: 0,
            });
        }

        const updatedOrder = await db.pending_orders.get(localId);
        return this.syncOrder(updatedOrder!);
    }

    /**
     * Discard a conflicting order
     */
    async discardOrder(localId: string): Promise<void> {
        const db = getOfflineDB();
        await db.pending_orders.delete(localId);
        this.syncingItems.delete(localId);
        console.log(`[SyncQueue] Order ${localId} discarded`);
    }

    /**
     * Check if there are any pending or conflicting orders
     */
    async hasPendingWork(): Promise<boolean> {
        const db = getOfflineDB();
        const count = await db.pending_orders.count();
        return count > 0;
    }

    /**
     * Get sync status (for UI)
     */
    getSyncStatus(): { isSyncing: boolean; syncingCount: number } {
        return {
            isSyncing: this.isSyncing,
            syncingCount: this.syncingItems.size,
        };
    }
}

// Export singleton instance
export const syncQueueManager = new SyncQueueManagerClass();
