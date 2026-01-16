import {
    MenuCategory, MenuItem, Table, Order, UserRole
} from '../../../packages/shared/src/index';
import { isOnline, syncQueueManager, type OptimisticOrder } from './offline';
import { Client, Account, Databases } from 'appwrite';

// ============================================
// Appwrite SDK (for backward compatibility)
// ============================================

const appwriteClient = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT || '');

export const account = new Account(appwriteClient);
export const databases = new Databases(appwriteClient);
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '';

// ============================================
// API Configuration
// ============================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * Token storage utilities
 */
const TokenStorage = {
    get: (): string | null => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('access_token');
    },
    set: (token: string): void => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('access_token', token);
        }
    },
    remove: (): void => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
        }
    }
};

/**
 * API Client with JWT handling
 */
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = TokenStorage.get();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API Error: ${response.status}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}

// ============================================
// User Types
// ============================================

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    restaurant_id: string;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
    user: User;
}

// ============================================
// Auth API
// ============================================

export const authApi = {
    /**
     * Login with email and password
     */
    login: async (email: string, password: string): Promise<LoginResponse> => {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Login failed');
        }

        const data: LoginResponse = await response.json();
        TokenStorage.set(data.access_token);
        return data;
    },

    /**
     * Logout current user
     */
    logout: async (): Promise<void> => {
        try {
            await apiRequest('/auth/logout', { method: 'POST' });
        } finally {
            TokenStorage.remove();
        }
    },

    /**
     * Get current authenticated user
     */
    me: async (): Promise<User | null> => {
        try {
            return await apiRequest<User>('/auth/me');
        } catch {
            return null;
        }
    }
};

// ============================================
// Orders API
// ============================================

export interface CreateOrderRequest {
    table_id: string;
    items: Array<{
        menu_item_id: string;
        quantity: number;
        notes?: string;
        modifiers?: string[];
    }>;
    notes?: string;
}

export interface PaymentRequest {
    payment_method: 'cash' | 'card' | 'transfer';
    amount: number;
    tip?: number;
    reference?: string;
}

export const ordersApi = {
    /**
     * Create a new order
     * When offline, stores order locally and returns optimistic response
     */
    create: async (order: CreateOrderRequest): Promise<Order | OptimisticOrder> => {
        // Check network status for offline-first handling
        if (typeof window !== 'undefined' && !isOnline()) {
            console.log('[ordersApi] Offline - queuing order for sync');
            const optimisticOrder = await syncQueueManager.enqueue({
                table_id: order.table_id,
                items: order.items,
                notes: order.notes,
            });
            // Return optimistic response as Order-like object
            return optimisticOrder as unknown as Order;
        }

        // Online: normal API call
        return apiRequest<Order>('/orders', {
            method: 'POST',
            body: JSON.stringify(order),
        });
    },

    /**
     * Get a specific order by ID
     */
    get: async (orderId: string): Promise<Order> => {
        return apiRequest<Order>(`/orders/${orderId}`);
    },

    /**
     * List orders with optional filters
     */
    list: async (params?: {
        status?: string;
        table_id?: string;
        restaurant_id?: string;
        limit?: number;
        offset?: number;
    }): Promise<Order[]> => {
        const searchParams = new URLSearchParams();

        if (params?.status) searchParams.append('status', params.status);
        if (params?.table_id) searchParams.append('table_id', params.table_id);
        if (params?.restaurant_id) searchParams.append('restaurant_id', params.restaurant_id);
        if (params?.limit) searchParams.append('limit', params.limit.toString());
        if (params?.offset) searchParams.append('offset', params.offset.toString());

        const query = searchParams.toString();
        const endpoint = query ? `/orders?${query}` : '/orders';

        return apiRequest<Order[]>(endpoint);
    },

    /**
     * Process payment for an order
     */
    pay: async (orderId: string, payment?: PaymentRequest): Promise<Order> => {
        return apiRequest<Order>(`/orders/${orderId}/pay`, {
            method: 'POST',
            body: payment ? JSON.stringify(payment) : undefined,
        });
    }
};

// ============================================
// Menu API
// ============================================

export const menuApi = {
    /**
     * Get all categories for a restaurant
     */
    getCategories: async (restaurantId?: string): Promise<MenuCategory[]> => {
        const searchParams = new URLSearchParams();
        if (restaurantId) searchParams.append('restaurant_id', restaurantId);

        const query = searchParams.toString();
        const endpoint = query ? `/menu/categories?${query}` : '/menu/categories';

        return apiRequest<MenuCategory[]>(endpoint);
    },

    /**
     * Get menu items, optionally filtered by category
     */
    getItems: async (categoryId?: string): Promise<MenuItem[]> => {
        const searchParams = new URLSearchParams();
        if (categoryId) searchParams.append('category_id', categoryId);

        const query = searchParams.toString();
        const endpoint = query ? `/menu/items?${query}` : '/menu/items';

        return apiRequest<MenuItem[]>(endpoint);
    }
};

// ============================================
// Tables API
// ============================================

export const tablesApi = {
    /**
     * List all tables for a restaurant
     */
    list: async (restaurantId?: string): Promise<Table[]> => {
        const searchParams = new URLSearchParams();
        if (restaurantId) searchParams.append('restaurant_id', restaurantId);

        const query = searchParams.toString();
        const endpoint = query ? `/tables?${query}` : '/tables';

        return apiRequest<Table[]>(endpoint);
    },

    /**
     * Update a table's status
     */
    updateStatus: async (id: string, status: string): Promise<Table> => {
        return apiRequest<Table>(`/tables/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    }
};

// ============================================
// WebSocket Client for Real-time Updates
// ============================================

export class WebSocketClient {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private messageHandlers: Map<string, Set<(data: any) => void>> = new Map();

    connect(endpoint: string = '/ws'): void {
        const token = TokenStorage.get();
        const wsUrl = API_BASE_URL.replace(/^http/, 'ws').replace('/api', '') + endpoint;
        const url = token ? `${wsUrl}?token=${token}` : wsUrl;

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const handlers = this.messageHandlers.get(data.type);
                if (handlers) {
                    handlers.forEach(handler => handler(data.payload));
                }
            } catch (error) {
                console.error('WebSocket message parse error:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.attemptReconnect(endpoint);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    private attemptReconnect(endpoint: string): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            console.log(`Attempting to reconnect in ${delay}ms...`);
            setTimeout(() => this.connect(endpoint), delay);
        }
    }

    subscribe(eventType: string, callback: (data: any) => void): () => void {
        if (!this.messageHandlers.has(eventType)) {
            this.messageHandlers.set(eventType, new Set());
        }
        this.messageHandlers.get(eventType)!.add(callback);

        // Return unsubscribe function
        return () => {
            const handlers = this.messageHandlers.get(eventType);
            if (handlers) {
                handlers.delete(callback);
            }
        };
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.messageHandlers.clear();
    }
}

export const wsClient = new WebSocketClient();

// ============================================
// Analytics API Types
// ============================================

export interface HourlySalesData {
    hour: number;
    day_of_week: number;
    day_name: string;
    total_sales: number;
    order_count: number;
}

export interface SalesByHourResponse {
    data: HourlySalesData[];
    max_sales: number;
    start_date: string;
    end_date: string;
}

export interface TopDishData {
    id: string;
    name: string;
    category_name: string;
    sales_count: number;
    revenue: number;
    cost: number;
    profit: number;
    profit_margin: number;
}

export interface TopDishesResponse {
    dishes: TopDishData[];
    start_date: string;
    end_date: string;
}

export interface DailySalesPoint {
    date: string;
    day_name: string;
    total_sales: number;
    order_count: number;
}

export interface SalesComparisonResponse {
    current_week: DailySalesPoint[];
    previous_week: DailySalesPoint[];
    current_week_total: number;
    previous_week_total: number;
    change_percentage: number;
    current_week_start: string;
    current_week_end: string;
    previous_week_start: string;
    previous_week_end: string;
}

export interface KPIResponse {
    average_ticket: number;
    total_sales: number;
    total_orders: number;
    food_cost_percentage: number;
    average_orders_per_day: number;
    busiest_hour: number | null;
    busiest_day: string | null;
    start_date: string;
    end_date: string;
}

export interface CategorySalesData {
    category_id: string;
    category_name: string;
    total_sales: number;
    order_count: number;
    percentage: number;
    color: string;
}

export interface SalesByCategoryResponse {
    categories: CategorySalesData[];
    total_sales: number;
    start_date: string;
    end_date: string;
}

// ============================================
// Analytics API
// ============================================

export const analyticsApi = {
    /**
     * Get sales aggregated by hour and day of week for heatmap
     */
    getSalesByHour: async (startDate?: Date, endDate?: Date): Promise<SalesByHourResponse> => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate.toISOString());
        if (endDate) params.append('end_date', endDate.toISOString());

        const query = params.toString();
        const endpoint = query ? `/analytics/sales-by-hour?${query}` : '/analytics/sales-by-hour';

        return apiRequest<SalesByHourResponse>(endpoint);
    },

    /**
     * Get top profitable dishes
     */
    getTopDishes: async (startDate?: Date, endDate?: Date, limit: number = 10): Promise<TopDishesResponse> => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate.toISOString());
        if (endDate) params.append('end_date', endDate.toISOString());
        params.append('limit', limit.toString());

        return apiRequest<TopDishesResponse>(`/analytics/top-dishes?${params.toString()}`);
    },

    /**
     * Get current vs previous week sales comparison
     */
    getSalesComparison: async (): Promise<SalesComparisonResponse> => {
        return apiRequest<SalesComparisonResponse>('/analytics/sales-comparison');
    },

    /**
     * Get KPIs for dashboard cards
     */
    getKPIs: async (startDate?: Date, endDate?: Date): Promise<KPIResponse> => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate.toISOString());
        if (endDate) params.append('end_date', endDate.toISOString());

        const query = params.toString();
        const endpoint = query ? `/analytics/kpis?${query}` : '/analytics/kpis';

        return apiRequest<KPIResponse>(endpoint);
    },

    /**
     * Get sales distribution by category for pie chart
     */
    getSalesByCategory: async (startDate?: Date, endDate?: Date): Promise<SalesByCategoryResponse> => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate.toISOString());
        if (endDate) params.append('end_date', endDate.toISOString());

        const query = params.toString();
        const endpoint = query ? `/analytics/sales-by-category?${query}` : '/analytics/sales-by-category';

        return apiRequest<SalesByCategoryResponse>(endpoint);
    }
};

// ============================================
// Export token utilities for external use
// ============================================

export const tokenUtils = {
    getToken: TokenStorage.get,
    setToken: TokenStorage.set,
    removeToken: TokenStorage.remove,
};

// ============================================
// Inventory API
// ============================================

export interface Ingredient {
    id: string;
    tenant_id: string;
    name: string;
    sku?: string;
    unit: string;
    stock_quantity: number;
    min_stock_alert: number;
    cost_per_unit: number;
    modifier_link?: Record<string, any>;
    is_active: boolean;
    usage_count?: number;
    created_at: string;
}

export interface InventoryTransaction {
    id: string;
    ingredient_id: string;
    transaction_type: 'purchase' | 'sale' | 'adjustment' | 'waste';
    quantity: number;
    unit: string;
    stock_after: number;
    notes?: string;
    created_at: string;
    created_by?: string;
}

export const inventoryApi = {
    /**
     * List all ingredients
     */
    list: async (lowStock?: boolean): Promise<Ingredient[]> => {
        const query = lowStock ? '?low_stock=true' : '';
        return apiRequest<Ingredient[]>(`/inventory${query}`);
    },

    /**
     * Create new ingredient
     */
    create: async (data: any): Promise<Ingredient> => {
        return apiRequest<Ingredient>('/inventory', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Get ingredient details
     */
    get: async (id: string): Promise<Ingredient> => {
        return apiRequest<Ingredient>(`/inventory/${id}`);
    },

    /**
     * Update ingredient
     */
    update: async (id: string, data: Partial<Ingredient>): Promise<Ingredient> => {
        return apiRequest<Ingredient>(`/inventory/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    /**
     * Adjust stock
     */
    adjustStock: async (id: string, quantity: number, type: string, notes?: string): Promise<InventoryTransaction> => {
        return apiRequest<InventoryTransaction>(`/inventory/${id}/adjust`, {
            method: 'POST',
            body: JSON.stringify({
                quantity,
                transaction_type: type,
                notes
            }),
        });
    },

    /**
     * Get stock history
     */
    getTransactions: async (id: string): Promise<InventoryTransaction[]> => {
        return apiRequest<InventoryTransaction[]>(`/inventory/${id}/transactions`);
    }
};

// ============================================
// Billing API (Facturación)
// ============================================

export interface SelfInvoiceRequest {
    order_id: string;
    receptor_rfc: string;
    receptor_nombre: string;
    receptor_cp: string;
    uso_cfdi: string;
}

export interface InvoiceResponse {
    id: string;
    order_id: string;
    uuid?: string;
    status: string;
    receptor_rfc: string;
    receptor_nombre: string;
    subtotal: number;
    iva: number;
    total: number;
    pdf_url?: string;
    xml_url?: string;
    created_at: string;
}

export const billingApi = {
    /**
     * Create a self-invoice (Auto-factura)
     */
    createSelfInvoice: async (data: SelfInvoiceRequest): Promise<InvoiceResponse> => {
        return apiRequest<InvoiceResponse>('/billing/self-invoice', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Get invoice by ID
     */
    getInvoice: async (id: string): Promise<InvoiceResponse> => {
        return apiRequest<InvoiceResponse>(`/billing/invoices/${id}`);
    },

    /**
     * Get invoices for a specific order
     */
    getOrderInvoices: async (orderId: string): Promise<InvoiceResponse[]> => {
        return apiRequest<InvoiceResponse[]>(`/billing/order/${orderId}/invoices`);
    }
};

// ============================================
// Cashier API (Caja)
// ============================================

export interface CashShift {
    shift_id: string;
    opened_at: string;
    closed_at?: string;
    opening_amount: number;
    register_id?: string;
    cash_sales: number;
    card_sales: number;
    total_drops: number;
    expected_cash: number;
    transactions_count: number;
}

export interface CashTransaction {
    id: string;
    type: string;
    amount: number;
    payment_method?: string;
    order_id?: string;
    notes?: string;
    created_at: string;
}

export const cashierApi = {
    /**
     * Get the current open shift
     */
    getCurrentShift: async (): Promise<CashShift> => {
        return apiRequest<CashShift>('/shift/current');
    },

    /**
     * Open a new cash shift
     */
    openShift: async (openingAmount: number, registerId?: string): Promise<any> => {
        return apiRequest('/shift/open', {
            method: 'POST',
            body: JSON.stringify({ opening_amount: openingAmount, register_id: registerId }),
        });
    },

    /**
     * Record a cash drop (withdrawal)
     */
    recordDrop: async (amount: number, notes?: string): Promise<any> => {
        return apiRequest('/shift/drop', {
            method: 'POST',
            body: JSON.stringify({ amount, notes }),
        });
    },

    /**
     * Close the current shift
     */
    closeShift: async (data: { real_cash: number; cash_breakdown?: any; notes?: string }): Promise<any> => {
        return apiRequest('/shift/close', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * List all transactions for current shift
     */
    getTransactions: async (): Promise<{ transactions: CashTransaction[] }> => {
        return apiRequest('/shift/transactions');
    }
};

// ============================================
// Customers & CRM API
// ============================================

export interface Customer {
    id: string;
    tenant_id: string;
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
    addresses: Array<{
        label: string;
        address: string;
        instructions?: string;
    }>;
    loyalty_points: number;
    wallet_balance: number;
    tier_level: string;
    created_at: string;
}

export const customersApi = {
    list: async (search?: string): Promise<Customer[]> => {
        const query = search ? `?search=${search}` : '';
        return apiRequest<Customer[]>(`/customers${query}`);
    },

    create: async (data: any): Promise<Customer> => {
        return apiRequest<Customer>('/customers', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    update: async (id: string, data: any): Promise<Customer> => {
        return apiRequest<Customer>(`/customers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    addAddress: async (id: string, address: { label: string; address: string; instructions?: string }): Promise<Customer> => {
        return apiRequest<Customer>(`/customers/${id}/addresses`, {
            method: 'POST',
            body: JSON.stringify(address),
        });
    }
};

// ============================================
// Loyalty API
// ============================================

export interface LoyaltySummary {
    points: number;
    wallet_balance: number;
    tier: string;
}

export interface LoyaltyTransaction {
    id: string;
    type: string;
    points_delta: number;
    amount_delta: number;
    description: string;
    created_at: string;
}

export const loyaltyApi = {
    getSummary: async (customerId: string): Promise<LoyaltySummary> => {
        return apiRequest<LoyaltySummary>(`/loyalty/${customerId}`);
    },

    getHistory: async (customerId: string): Promise<LoyaltyTransaction[]> => {
        return apiRequest<LoyaltyTransaction[]>(`/loyalty/${customerId}/transactions`);
    }
};

// ============================================
// Reservations API
// ============================================

export interface Reservation {
    id: string;
    customer_id?: string;
    agent_id?: string;
    table_id?: string;
    reservation_time: string;
    party_size: number;
    status: string;
    notes?: string;
    tags: string[];
}

export const reservationsApi = {
    list: async (date?: Date, status?: string): Promise<Reservation[]> => {
        const searchParams = new URLSearchParams();
        if (date) searchParams.append('date', date.toISOString());
        if (status) searchParams.append('status', status);

        const query = searchParams.toString();
        return apiRequest<Reservation[]>(query ? `/reservations?${query}` : '/reservations');
    },

    create: async (data: any): Promise<Reservation> => {
        return apiRequest<Reservation>('/reservations', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    updateStatus: async (id: string, status: string, tableId?: string): Promise<Reservation> => {
        return apiRequest<Reservation>(`/reservations/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status, table_id: tableId }),
        });
    },

    getAgents: async (): Promise<Array<{ id: string; name: string; type: string }>> => {
        return apiRequest('/reservations/agents');
    }
};

// ============================================
// Promotions API
// ============================================

export interface Promotion {
    id: string;
    name: string;
    description?: string;
    rules: any;
    effect: any;
    is_active: boolean;
}

export const promotionsApi = {
    listActive: async (): Promise<Promotion[]> => {
        return apiRequest<Promotion[]>('/promotions/active');
    },

    create: async (data: any): Promise<Promotion> => {
        return apiRequest<Promotion>('/promotions', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    validateCart: async (cartItems: any[]): Promise<any> => {
        return apiRequest('/promotions/validate-cart', {
            method: 'POST',
            body: JSON.stringify(cartItems),
        });
    }
};

// ============================================
// Admin / SaaS Stats API
// ============================================

export interface TenantPlanInfo {
    id: string;
    name: string;
    slug: string;
    plan: 'starter' | 'professional' | 'enterprise';
    estimated_revenue: number;
    is_active: boolean;
    created_at: string;
}

export interface AIUsageInfo {
    tenant_id: string;
    tenant_name: string;
    ai_requests_30d: number;
    estimated_cost_usd: number;
}

export interface SaaSStatsResponse {
    total_tenants: number;
    active_tenants: number;
    tenants_by_plan: {
        starter: number;
        professional: number;
        enterprise: number;
    };
    estimated_mrr: number;
    tenants: TenantPlanInfo[];
    ai_usage: AIUsageInfo[];
}

export interface BackupInfo {
    filename: string;
    size: string;
    size_bytes: number;
    created: string;
}

export const adminApi = {
    /**
     * Get SaaS platform statistics
     * Requires Super Admin role
     */
    getSaaSStats: async (): Promise<SaaSStatsResponse> => {
        return apiRequest<SaaSStatsResponse>('/admin/saas-stats');
    },

    /**
     * List database backups
     */
    listBackups: async (): Promise<{ total: number; backups: BackupInfo[] }> => {
        return apiRequest('/admin/backups');
    },

    /**
     * Trigger immediate backup
     */
    createBackup: async (): Promise<{ status: string; message: string }> => {
        return apiRequest('/admin/backups/create', { method: 'POST' });
    },

    /**
     * Delete a backup file
     */
    deleteBackup: async (filename: string): Promise<{ message: string }> => {
        return apiRequest(`/admin/backups/${filename}`, { method: 'DELETE' });
    },

    /**
     * Run a scheduled job manually
     */
    runJob: async (jobName: string): Promise<{ status: string; message: string }> => {
        return apiRequest(`/admin/jobs/${jobName}/run`, { method: 'POST' });
    },

    /**
     * Health check
     */
    healthCheck: async (): Promise<{ status: string; service: string; version: string }> => {
        return apiRequest('/admin/health');
    }
};

// ============================================
// Tenant Context / Feature Access API
// ============================================

export interface TenantContext {
    id: string;
    name: string;
    slug: string;
    plan: 'starter' | 'professional' | 'enterprise';
    features: string[];
    addons: {
        self_service: boolean;
        delivery: boolean;
        kds_pro: boolean;
        analytics_ai: boolean;
    };
}

export const tenantApi = {
    /**
     * Get current tenant context with plan and features
     */
    getContext: async (): Promise<TenantContext> => {
        // This would come from the auth context or a dedicated endpoint
        // For now, we'll use the user's tenant info
        const user = await authApi.me();
        if (!user) throw new Error('Not authenticated');

        // The actual plan info would come from a dedicated endpoint
        return apiRequest<TenantContext>('/tenant/context');
    },

    /**
     * Check if current tenant has access to a feature
     */
    hasFeature: async (feature: string): Promise<boolean> => {
        try {
            const context = await tenantApi.getContext();
            return context.features.includes(feature);
        } catch {
            return false;
        }
    }
};

// ============================================
// Subscription API (Stripe B2B Billing)
// ============================================

export interface SubscriptionPlan {
    id: string;
    name: string;
    price_mxn: number;
    features: string[];
    is_current: boolean;
    is_upgrade: boolean;
}

export interface CurrentSubscription {
    plan: string;
    plan_name: string;
    price_mxn: number;
    features: string[];
    status: 'active' | 'trialing' | 'past_due' | 'canceled';
    stripe_customer_id?: string;
    current_period_end?: string;
    cancel_at_period_end: boolean;
}

export interface CheckoutResponse {
    checkout_url: string;
    session_id: string;
}

export interface PortalResponse {
    portal_url: string;
}

export const subscriptionApi = {
    /**
     * Get current subscription plan
     */
    getCurrent: async (): Promise<CurrentSubscription> => {
        return apiRequest<CurrentSubscription>('/subscription/current');
    },

    /**
     * Get available plans
     */
    getPlans: async (): Promise<{ current_plan: string; plans: SubscriptionPlan[] }> => {
        return apiRequest('/subscription/plans');
    },

    /**
     * Create Stripe Checkout session for upgrade
     */
    createCheckout: async (plan: string): Promise<CheckoutResponse> => {
        return apiRequest<CheckoutResponse>('/subscription/checkout', {
            method: 'POST',
            body: JSON.stringify({ plan }),
        });
    },

    /**
     * Create Stripe Customer Portal session
     */
    createPortal: async (): Promise<PortalResponse> => {
        return apiRequest<PortalResponse>('/subscription/portal', {
            method: 'POST',
        });
    },
};

// ============================================
// Onboarding API
// ============================================

export interface OnboardingStatus {
    show_wizard: boolean;
    onboarding_step: string;
    onboarding_complete: boolean;
    tenant_name: string;
    has_logo: boolean;
}

export interface QuickOnboardingRequest {
    name: string;
    logo_url?: string;
    currency: string;
    service_types: string[];
    seed_demo_data: boolean;
}

export interface QuickOnboardingResponse {
    success: boolean;
    message: string;
    tenant_name: string;
    demo_data_seeded: boolean;
}

export const onboardingApi = {
    /**
     * Get current onboarding status
     */
    getStatus: async (): Promise<OnboardingStatus> => {
        return apiRequest<OnboardingStatus>('/onboarding/status');
    },

    /**
     * Complete onboarding with quick wizard
     */
    quickComplete: async (data: QuickOnboardingRequest): Promise<QuickOnboardingResponse> => {
        return apiRequest<QuickOnboardingResponse>('/onboarding/quick-complete', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
};

