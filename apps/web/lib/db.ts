import {
    createRxDatabase,
    RxDatabase,
    RxCollection,
    RxJsonSchema,
    RxDocument,
    addRxPlugin
} from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { replicateRxCollection } from 'rxdb/plugins/replication';
import { ID, Query } from 'appwrite';
import { databases, DATABASE_ID, mapDoc } from './api';
import {
    MenuCategory,
    MenuItem,
    Order,
    Table,
    OrderStatus,
    OrderType,
    OrderItem,
    RouteDestination
} from '../../../packages/shared/src/index';

// Enable dev mode and other plugins
if (typeof window !== 'undefined') {
    if (process.env.NODE_ENV === 'development') {
        addRxPlugin(RxDBDevModePlugin);
    }
    addRxPlugin(RxDBUpdatePlugin);
    addRxPlugin(RxDBQueryBuilderPlugin);
}

// ============================================
// Schemas
// ============================================

export type OrderWithoutAppwrite = Omit<Order, '$id' | '$createdAt' | '$updatedAt' | '$permissions' | '$databaseId' | '$collectionId'>;
const orderSchema: RxJsonSchema<OrderWithoutAppwrite> = {
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
        status: { type: 'string' }, // OrderStatus
        order_type: { type: 'string' }, // OrderType
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
        // Appwrite fields
        // RxDB does not allow fields starting with $ in the schema
        // We will handle mapping separately if needed
    },
    required: ['restaurant_id', 'status', 'total', 'items']
};

export type MenuItemWithoutAppwrite = Omit<MenuItem, '$id' | '$createdAt' | '$updatedAt' | '$permissions' | '$databaseId' | '$collectionId'>;
const menuItemSchema: RxJsonSchema<MenuItemWithoutAppwrite> = {
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
        // Appwrite fields
        // RxDB does not allow fields starting with $ in the schema
    },
    required: ['name', 'price']
};

export type CategoryWithoutAppwrite = Omit<MenuCategory, '$id' | '$createdAt' | '$updatedAt' | '$permissions' | '$databaseId' | '$collectionId'>;
const categorySchema: RxJsonSchema<CategoryWithoutAppwrite> = {
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
        // Appwrite fields
        // RxDB does not allow fields starting with $ in the schema
    },
    required: ['name']
};

// ============================================
// Database Type Definition
// ============================================

export type RxRestoCollections = {
    orders: RxCollection<OrderWithoutAppwrite>;
    menu_items: RxCollection<MenuItemWithoutAppwrite>;
    menu_categories: RxCollection<CategoryWithoutAppwrite>;
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

    // Start Replication
    startReplication(db);

    return db;
};

// ============================================
// Replication Logic
// ============================================

const BATCH_SIZE = 50;

async function syncCollection(
    collection: RxCollection,
    appwriteCollectionId: string
) {
    console.log(`Starting sync for ${collection.name}...`);

    return replicateRxCollection({
        collection,
        replicationIdentifier: `appwrite-${appwriteCollectionId}`, // unique id for this replication
        pull: {
            async handler(lastCheckpoint: any, batchSize: number) {
                const limit = batchSize || BATCH_SIZE;
                const minTimestamp = lastCheckpoint ? lastCheckpoint.updatedAt : '1970-01-01T00:00:00.000Z';

                try {
                    const queries = [
                        Query.limit(limit),
                        Query.orderAsc('$updatedAt') // Sort by UpdatedAt for checkpointing
                    ];

                    if (minTimestamp) {
                        queries.push(Query.greaterThan('$updatedAt', minTimestamp));
                    }

                    const response = await databases.listDocuments(
                        DATABASE_ID,
                        appwriteCollectionId,
                        queries
                    );

                    const documents = response.documents.map(doc => {
                        const mapped = mapDoc(doc) as any;
                        // Strip Appwrite fields that are excluded from RxDB schema
                        const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...rest } = mapped;
                        return rest;
                    });

                    // If we got fewer docs than limit, we are done for now
                    const hasMore = documents.length === limit;

                    // New checkpoint is the last doc's updatedAt
                    const newCheckpoint = documents.length > 0
                        ? { updatedAt: documents[documents.length - 1].$updatedAt }
                        : lastCheckpoint;

                    return {
                        documents,
                        checkpoint: newCheckpoint
                    };
                } catch (err) {
                    console.error(`Pull error for ${collection.name}:`, err);
                    throw err;
                }
            }
        },
        push: {
            async handler(docs) {
                const pushedRowErrors: any[] = [];

                for (const row of docs) {
                    try {
                        const docData = row.newDocumentState as any;
                        // If it's a new document (locally created)
                        // In RxDB, we might use a temporary ID or check if it exists in Appwrite
                        // Since we use uuid for IDs, we can just try to create or update.

                        // Check if exists to decide update vs create is expensive 1 by 1.
                        // We'll try update first, if 404 then create? 
                        // Or if we know it's new (assumed = true which RxDB defines).

                        // For simplicity in this demo:
                        // Appwrite createDocument requires a unique ID.
                        // We use the ID from the doc.

                        // Note: We need to strip RxDB internal fields if any, 
                        // but our schema defines them explicitly so it should be fine.
                        // We DO need to strip $id, $createdAt, $updatedAt etc when sending to Appwrite usually,
                        // unless we are system user. Client SDK ignores them or errors.

                        const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...payload } = docData;

                        // Identify if exists
                        try {
                            await databases.updateDocument(
                                DATABASE_ID,
                                appwriteCollectionId,
                                docData.id,
                                payload
                            );
                        } catch (e: any) {
                            if (e.code === 404) {
                                // Create
                                await databases.createDocument(
                                    DATABASE_ID,
                                    appwriteCollectionId,
                                    docData.id,
                                    payload
                                );
                            } else {
                                throw e;
                            }
                        }
                    } catch (err) {
                        console.error(`Push error for ${collection.name}:`, err);
                        pushedRowErrors.push(row);
                    }
                }
                return pushedRowErrors;
            },
            batchSize: 5
        },
        live: true,
        waitForLeadership: true
    });
}

function startReplication(db: RxRestoDatabase) {
    // Sync Orders
    syncCollection(db.orders, 'orders');

    // Sync Menu (Read-only mostly, but technically writable in this logic)
    syncCollection(db.menu_items, 'menu_items');
    syncCollection(db.menu_categories, 'menu_categories');
}

export const getDatabase = () => {
    if (!dbPromise) {
        dbPromise = createDatabase();
    }
    return dbPromise;
};
