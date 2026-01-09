/**
 * RestoNext MX - Sync Queue Manager
 * Handles offline order queue and synchronization with backend
 */

import {
    getOfflineDB,
    PendingOrder,
    PendingOrderData,
    PendingOrderStatus,
} from './dexie-db';
import { isOnline } from './network-status';

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
    | 'order_queued';

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
        // Use timestamp + random for uniqueness without external deps
        return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
     * Get all pending orders
     */
    async getPendingOrders(): Promise<PendingOrder[]> {
        const db = getOfflineDB();
        return db.pending_orders.where('status').equals('pending_sync').toArray();
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
     */
    async processQueue(): Promise<SyncResult[]> {
        if (this.isSyncing) {
            console.log('[SyncQueue] Already syncing, skipping...');
            return [];
        }

        if (!isOnline()) {
            console.log('[SyncQueue] Still offline, cannot sync');
            return [];
        }

        this.isSyncing = true;
        this.emit('sync_started');

        const results: SyncResult[] = [];
        const db = getOfflineDB();

        try {
            const pendingOrders = await this.getPendingOrders();
            console.log(`[SyncQueue] Processing ${pendingOrders.length} pending orders`);

            for (const order of pendingOrders) {
                const result = await this.syncOrder(order);
                results.push(result);

                if (result.conflict) {
                    this.emit('conflict_detected', {
                        local_id: order.local_id,
                        details: result.error,
                    });
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
        }

        return results;
    }

    /**
     * Sync a single order to the backend
     */
    private async syncOrder(order: PendingOrder): Promise<SyncResult> {
        const db = getOfflineDB();
        const API_BASE_URL =
            process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

        // Mark as syncing
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

                    return {
                        success: false,
                        local_id: order.local_id,
                        error: errorData.detail,
                        conflict: true,
                    };
                }

                // Other API error
                await db.pending_orders.update(order.local_id, {
                    status: 'failed' as PendingOrderStatus,
                    last_error: errorData.detail || `API Error: ${response.status}`,
                });

                return {
                    success: false,
                    local_id: order.local_id,
                    error: errorData.detail || `API Error: ${response.status}`,
                };
            }

            const serverOrder = await response.json();

            // Success: remove from queue
            await db.pending_orders.delete(order.local_id);

            console.log(
                `[SyncQueue] Order ${order.local_id} synced as ${serverOrder.id}`
            );

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
            });
        } else {
            await db.pending_orders.update(localId, {
                status: 'pending_sync' as PendingOrderStatus,
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
    }

    /**
     * Check if there are any pending or conflicting orders
     */
    async hasPendingWork(): Promise<boolean> {
        const db = getOfflineDB();
        const count = await db.pending_orders.count();
        return count > 0;
    }
}

// Export singleton instance
export const syncQueueManager = new SyncQueueManagerClass();
