import { Client, Databases, Account, ID, Query } from 'appwrite';
import {
    MenuCategory, MenuItem, Table, Order, OrderItem, UserRole
} from '../../../packages/shared/src/index';

// Initialize Appwrite Client
const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'restonext');

export const databases = new Databases(client);
export const account = new Account(client);

export const DATABASE_ID = 'restonext';

/**
 * Document Mapping Utility
 * Ensures Appwrite documents match our shared interfaces
 */
export function mapDoc<T>(doc: any): T {
    // We keep the internal Appwrite fields ($id, $createdAt, etc.)
    // as our shared interfaces extend AppwriteDocument
    return {
        ...doc,
        // Optional: keep aliases for backward compatibility if needed, 
        // but it's better to use the shared interfaces directly.
        id: doc.$id,
    } as T;
}

// ============================================
// Auth API
// ============================================

export const authApi = {
    login: async (email: string, password: string) => {
        const session = await account.createEmailPasswordSession(email, password);
        const user = await account.get();
        return { access_token: session.$id, user };
    },

    logout: async () => {
        await account.deleteSession('current');
    },

    me: async (): Promise<any | null> => {
        try {
            const user = await account.get();
            const profile = await databases.listDocuments(DATABASE_ID, 'profiles', [
                Query.equal('user_id', user.$id)
            ]);
            if (profile.documents.length > 0) {
                const p = profile.documents[0];
                return {
                    id: user.$id,
                    email: user.email,
                    name: user.name,
                    role: p.role as UserRole,
                    restaurant_id: p.restaurant_id,
                };
            }
            return null;
        } catch {
            return null;
        }
    }
};

// ============================================
// Orders API
// ============================================

export const ordersApi = {
    create: async (order: Partial<Order>): Promise<Order> => {
        const doc = await databases.createDocument(
            DATABASE_ID,
            'orders',
            ID.unique(),
            order
        );
        return mapDoc<Order>(doc);
    },

    get: async (orderId: string): Promise<Order> => {
        const doc = await databases.getDocument(DATABASE_ID, 'orders', orderId);
        return mapDoc<Order>(doc);
    },

    list: async (params?: { status?: string; table_id?: string; restaurant_id?: string }): Promise<Order[]> => {
        const queries = [];
        if (params?.status) queries.push(Query.equal('status', params.status));
        if (params?.table_id) queries.push(Query.equal('table_id', params.table_id));
        if (params?.restaurant_id) queries.push(Query.equal('restaurant_id', params.restaurant_id));

        const res = await databases.listDocuments(DATABASE_ID, 'orders', queries);
        return res.documents.map(mapDoc<Order>);
    },

    updateItemStatus: async (orderId: string, itemId: string, status: string): Promise<OrderItem> => {
        // Appwrite Function should handle item status updates in embedded items
        throw new Error("Update item status logic moved to Appwrite Functions/Orders update");
    },

    pay: async (orderId: string, payment?: any): Promise<Order> => {
        const doc = await databases.updateDocument(DATABASE_ID, 'orders', orderId, { status: 'completed' });
        return mapDoc<Order>(doc);
    },

    requestBill: async (orderId: string): Promise<Table> => {
        // Assuming orderId is linked to a table status update
        const doc = await databases.updateDocument(DATABASE_ID, 'tables', orderId, { status: 'bill_requested' });
        return mapDoc<Table>(doc);
    }
};

// ============================================
// Menu API
// ============================================

export const menuApi = {
    getCategories: async (restaurantId: string): Promise<MenuCategory[]> => {
        const res = await databases.listDocuments(DATABASE_ID, 'menu_categories', [
            Query.equal('restaurant_id', restaurantId),
            Query.orderAsc('sort_order')
        ]);
        return res.documents.map(mapDoc<MenuCategory>);
    },

    getItems: async (categoryId: string): Promise<MenuItem[]> => {
        const res = await databases.listDocuments(DATABASE_ID, 'menu_items', [
            Query.equal('category_id', categoryId),
            Query.orderAsc('sort_order')
        ]);
        return res.documents.map(mapDoc<MenuItem>);
    }
};

// ============================================
// Tables API
// ============================================

export const tablesApi = {
    list: async (restaurantId: string): Promise<Table[]> => {
        const res = await databases.listDocuments(DATABASE_ID, 'tables', [
            Query.equal('restaurant_id', restaurantId),
            Query.orderAsc('number')
        ]);
        return res.documents.map(mapDoc<Table>);
    },

    updateStatus: async (id: string, status: string): Promise<Table> => {
        const doc = await databases.updateDocument(DATABASE_ID, 'tables', id, { status });
        return mapDoc<Table>(doc);
    }
};

// ============================================
// Billing & Analytics
// ============================================

export const billingApi = {
    createSelfInvoice: async (data: any) => {
        // Trigger Appwrite Function
        throw new Error("Billing logic moved to Appwrite Functions");
    }
};

export const analyticsApi = {
    getForecast: async (ingredient: string) => {
        // Trigger Appwrite Function
        throw new Error("Forecasting logic moved to Appwrite Functions");
    }
};

// ============================================
// Realtime Client
// ============================================

export class AppwriteRealtimeClient {
    private unsubscribe: (() => void) | null = null;

    subscribe(collection: string, callback: (data: any) => void) {
        if (this.unsubscribe) this.unsubscribe();

        this.unsubscribe = client.subscribe(
            `databases.${DATABASE_ID}.collections.${collection}.documents`,
            response => {
                callback(response);
            }
        );

        return this.unsubscribe;
    }
}

export const wsClient = new AppwriteRealtimeClient();
