/**
 * RestoNext MX - Dexie.js Offline Database
 * IndexedDB wrapper for Offline-First POS functionality
 */

import Dexie, { Table } from 'dexie';

// ============================================
// Types for Local Storage
// ============================================

export interface LocalMenuItem {
    id: string;
    restaurant_id: string;
    category_id: string;
    name: string;
    description?: string;
    price: number;
    cost?: number;
    image_url?: string;
    route_to?: string;
    prep_time_minutes?: number;
    is_available: boolean;
    modifier_groups?: any[];
    tags?: string[];
    allergens?: string[];
    calories?: number;
    synced_at: Date;
}

export interface LocalMenuCategory {
    id: string;
    restaurant_id: string;
    name: string;
    description?: string;
    sort_order: number;
    is_active: boolean;
    image_url?: string;
    synced_at: Date;
}

export interface LocalTable {
    id: string;
    restaurant_id: string;
    number: number;
    capacity: number;
    status: 'free' | 'occupied' | 'reserved' | 'bill_requested';
    pos_x: number;
    pos_y: number;
    section?: string;
    current_order_id?: string;
    synced_at: Date;
}

export type PendingOrderStatus = 'pending_sync' | 'syncing' | 'conflict' | 'failed';

export interface PendingOrderItem {
    menu_item_id: string;
    quantity: number;
    notes?: string;
    modifiers?: string[];
}

export interface PendingOrderData {
    table_id: string;
    items: PendingOrderItem[];
    notes?: string;
}

export interface PendingOrder {
    local_id: string;
    order_data: PendingOrderData;
    created_at: Date;
    sync_attempts: number;
    last_error?: string;
    status: PendingOrderStatus;
    conflict_details?: string;
}

// ============================================
// Dexie Database Class
// ============================================

export class RestoNextDB extends Dexie {
    menu_items!: Table<LocalMenuItem, string>;
    menu_categories!: Table<LocalMenuCategory, string>;
    restaurant_tables!: Table<LocalTable, string>;
    pending_orders!: Table<PendingOrder, string>;

    constructor() {
        super('RestoNextDB');

        this.version(1).stores({
            // Indexed fields for each table
            menu_items: 'id, restaurant_id, category_id, name, is_available',
            menu_categories: 'id, restaurant_id, sort_order, is_active',
            restaurant_tables: 'id, restaurant_id, number, status',
            pending_orders: 'local_id, status, created_at, sync_attempts',
        });
    }
}

// ============================================
// Database Instance (Singleton)
// ============================================

let dbInstance: RestoNextDB | null = null;

export function getOfflineDB(): RestoNextDB {
    if (typeof window === 'undefined') {
        throw new Error('Dexie can only be used in browser environment');
    }

    if (!dbInstance) {
        dbInstance = new RestoNextDB();
    }

    return dbInstance;
}

// ============================================
// Cache Management Functions
// ============================================

/**
 * Sync menu items from server to local cache
 */
export async function cacheMenuItems(items: LocalMenuItem[]): Promise<void> {
    const db = getOfflineDB();
    const now = new Date();

    const itemsWithTimestamp = items.map((item) => ({
        ...item,
        synced_at: now,
    }));

    await db.menu_items.bulkPut(itemsWithTimestamp);
}

/**
 * Sync categories from server to local cache
 */
export async function cacheMenuCategories(
    categories: LocalMenuCategory[]
): Promise<void> {
    const db = getOfflineDB();
    const now = new Date();

    const categoriesWithTimestamp = categories.map((cat) => ({
        ...cat,
        synced_at: now,
    }));

    await db.menu_categories.bulkPut(categoriesWithTimestamp);
}

/**
 * Sync tables from server to local cache
 */
export async function cacheTables(tables: LocalTable[]): Promise<void> {
    const db = getOfflineDB();
    const now = new Date();

    const tablesWithTimestamp = tables.map((table) => ({
        ...table,
        synced_at: now,
    }));

    await db.restaurant_tables.bulkPut(tablesWithTimestamp);
}

/**
 * Get cached menu items for offline use
 */
export async function getCachedMenuItems(
    restaurantId?: string
): Promise<LocalMenuItem[]> {
    const db = getOfflineDB();

    if (restaurantId) {
        return db.menu_items.where('restaurant_id').equals(restaurantId).toArray();
    }

    return db.menu_items.toArray();
}

/**
 * Get cached categories for offline use
 */
export async function getCachedCategories(
    restaurantId?: string
): Promise<LocalMenuCategory[]> {
    const db = getOfflineDB();

    if (restaurantId) {
        return db.menu_categories
            .where('restaurant_id')
            .equals(restaurantId)
            .toArray();
    }

    return db.menu_categories.toArray();
}

/**
 * Get cached tables for offline use
 */
export async function getCachedTables(
    restaurantId?: string
): Promise<LocalTable[]> {
    const db = getOfflineDB();

    if (restaurantId) {
        return db.restaurant_tables.where('restaurant_id').equals(restaurantId).toArray();
    }

    return db.restaurant_tables.toArray();
}

/**
 * Clear all cached data (useful for logout)
 */
export async function clearOfflineCache(): Promise<void> {
    const db = getOfflineDB();

    await Promise.all([
        db.menu_items.clear(),
        db.menu_categories.clear(),
        db.restaurant_tables.clear(),
    ]);
}

export default RestoNextDB;
