/**
 * RestoNext MX - Offline Module Index
 * Export all offline-first utilities
 */

export {
    RestoNextDB,
    getOfflineDB,
    cacheMenuItems,
    cacheMenuCategories,
    cacheTables,
    getCachedMenuItems,
    getCachedCategories,
    getCachedTables,
    clearOfflineCache,
    type LocalMenuItem,
    type LocalMenuCategory,
    type LocalTable,
    type PendingOrder,
    type PendingOrderData,
    type PendingOrderStatus,
} from './dexie-db';

export {
    isOnline,
    isOffline,
    onNetworkChange,
    waitForOnline,
} from './network-status';

export {
    syncQueueManager,
    type SyncResult,
    type OptimisticOrder,
    type SyncEventType,
    type SyncEventCallback,
} from './sync-queue';
