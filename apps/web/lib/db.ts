/**
 * RestoNext MX - RxDB Offline Database
 * Local-first database with FastAPI backend sync
 * 
 * NOTE: This file is a work in progress for offline-first support.
 * Replication is temporarily disabled until FastAPI sync endpoints are implemented.
 */

import {
    createRxDatabase,
    RxDatabase,
    RxCollection,
    RxJsonSchema,
    addRxPlugin
} from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';

// Enable dev mode and other plugins
if (typeof window !== 'undefined') {
    if (process.env.NODE_ENV === 'development') {
        addRxPlugin(RxDBDevModePlugin);
    }
    addRxPlugin(RxDBUpdatePlugin);
    addRxPlugin(RxDBQueryBuilderPlugin);
}

// ============================================
// Local Types (without Appwrite dependencies)
// ============================================

export interface LocalOrder {
    id: string;
    restaurant_id: string;
    table_id: string;
    table_number?: number;
    waiter_id?: string;
    waiter_name?: string;
    status: string;
    order_type?: string;
    items: Array<{
        id: string;
        menu_item_id: string;
        name: string;
        quantity: number;
        unit_price: number;
        selected_modifiers?: any[];
        line_total?: number;
        seat_number?: number;
        status?: string;
        notes?: string;
        route_to?: string;
    }>;
    subtotal?: number;
    tax?: number;
    tip?: number;
    total: number;
    notes?: string;
    created_at?: string;
    completed_at?: string;
    payment_method?: string;
    payment_reference?: string;
}

export interface LocalMenuItem {
    id: string;
    restaurant_id?: string;
    category_id?: string;
    name: string;
    description?: string;
    price: number;
    cost?: number;
    image_url?: string;
    route_to?: string;
    prep_time_minutes?: number;
    is_available?: boolean;
    modifier_groups?: any[];
    tags?: string[];
    allergens?: string[];
    calories?: number;
}

export interface LocalMenuCategory {
    id: string;
    restaurant_id?: string;
    name: string;
    description?: string;
    sort_order?: number;
    is_active?: boolean;
    image_url?: string;
}

// ============================================
// Schemas
// ============================================

const orderSchema: RxJsonSchema<LocalOrder> = {
    title: 'order',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        restaurant_id: { type: 'string' },
        table_id: { type: 'string' },
        table_number: { type: 'number' },
        waiter_id: { type: 'string' },
        waiter_name: { type: 'string' },
        status: { type: 'string' },
        order_type: { type: 'string' },
        items: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    menu_item_id: { type: 'string' },
                    name: { type: 'string' },
                    quantity: { type: 'number' },
                    unit_price: { type: 'number' },
                    selected_modifiers: { type: 'array' },
                    line_total: { type: 'number' },
                    seat_number: { type: 'number' },
                    status: { type: 'string' },
                    notes: { type: 'string' },
                    route_to: { type: 'string' }
                }
            }
        },
        subtotal: { type: 'number' },
        tax: { type: 'number' },
        tip: { type: 'number' },
        total: { type: 'number' },
        notes: { type: 'string' },
        created_at: { type: 'string' },
        completed_at: { type: 'string' },
        payment_method: { type: 'string' },
        payment_reference: { type: 'string' },
    },
    required: ['id', 'restaurant_id', 'status', 'total', 'items']
};

const menuItemSchema: RxJsonSchema<LocalMenuItem> = {
    title: 'menu_item',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        restaurant_id: { type: 'string' },
        category_id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number' },
        cost: { type: 'number' },
        image_url: { type: 'string' },
        route_to: { type: 'string' },
        prep_time_minutes: { type: 'number' },
        is_available: { type: 'boolean' },
        modifier_groups: { type: 'array' },
        tags: { type: 'array', items: { type: 'string' } },
        allergens: { type: 'array', items: { type: 'string' } },
        calories: { type: 'number' },
    },
    required: ['id', 'name', 'price']
};

const categorySchema: RxJsonSchema<LocalMenuCategory> = {
    title: 'menu_category',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        restaurant_id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        sort_order: { type: 'number' },
        is_active: { type: 'boolean' },
        image_url: { type: 'string' },
    },
    required: ['id', 'name']
};

// ============================================
// Database Type Definition
// ============================================

export type RxRestoCollections = {
    orders: RxCollection<LocalOrder>;
    menu_items: RxCollection<LocalMenuItem>;
    menu_categories: RxCollection<LocalMenuCategory>;
};

export type RxRestoDatabase = RxDatabase<RxRestoCollections>;

// ============================================
// Database Creation
// ============================================

let dbPromise: Promise<RxRestoDatabase> | null = null;

export const createDatabase = async (): Promise<RxRestoDatabase> => {
    console.log('Database creation started...');
    let storage: any = getRxStorageDexie();
    if (process.env.NODE_ENV === 'development') {
        storage = wrappedValidateAjvStorage({ storage });
    }

    const db = await createRxDatabase<RxRestoCollections>({
        name: 'restonext_db',
        storage
    });
    console.log('Database created');

    await db.addCollections({
        orders: {
            schema: orderSchema
        },
        menu_items: {
            schema: menuItemSchema
        },
        menu_categories: {
            schema: categorySchema
        }
    });
    console.log('Collections added');

    // TODO: Implement replication with FastAPI backend
    // startReplication(db);

    return db;
};

export const getDatabase = () => {
    if (!dbPromise) {
        dbPromise = createDatabase();
    }
    return dbPromise;
};

// ============================================
// Helper Functions
// ============================================

/**
 * Map API response document to RxDB-compatible format
 */
export function mapApiDoc<T extends { id: string }>(doc: Record<string, any>): T {
    return {
        ...doc,
        id: doc.id || doc.$id,
    } as T;
}
