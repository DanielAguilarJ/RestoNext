import {
    MenuCategory, MenuItem, Table, Order, UserRole
} from '../../../packages/shared/src/index';
import { isOnline, syncQueueManager, type OptimisticOrder } from './offline';
import { Logger } from './logger';

// ============================================
// API Configuration
// ============================================

/**
 * API Base URL Configuration
 * 
 * IMPORTANT: DigitalOcean App Platform strips the /api prefix before forwarding to the backend.
 * So when NEXT_PUBLIC_API_URL is set to https://app.example.com/api, the backend receives requests at /
 * 
 * The URL should be the full path to the API including /api suffix.
 * In production, this is set via environment variables in digitalocean-app.yaml
 */
const getRawApiUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'https://restonext.me/api';
};

const rawApiUrl = getRawApiUrl();
// Clean the URL: remove trailing slashes, ensure it ends with /api for consistency
const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');

/**
 * Cookie utilities for middleware compatibility
 * Next.js middleware runs on the edge and only has access to cookies, not localStorage
 */
const setCookie = (name: string, value: string, days: number = 7): void => {
    if (typeof document === 'undefined') return;
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    // Add Secure flag for HTTPS (required in production)
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const secureFlag = isSecure ? ';Secure' : '';
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/${secureFlag};SameSite=Lax`;
};

const removeCookie = (name: string): void => {
    if (typeof document === 'undefined') return;
    // Add Secure flag for HTTPS (required in production)
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const secureFlag = isSecure ? ';Secure' : '';
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/${secureFlag}`;
};

/**
 * Token storage utilities
 * Syncs token to both localStorage (for client) and cookie (for middleware)
 */
const TokenStorage = {
    get: (): string | null => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('access_token');
    },
    set: (token: string): void => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('access_token', token);
            // Sync to cookie for Next.js middleware
            setCookie('restonext_token', token, 7);
        }
    },
    remove: (): void => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
            // Remove cookies too
            removeCookie('restonext_token');
            removeCookie('restonext_licenses');
        }
    }
};

/**
 * Set tenant licenses in cookie for middleware route protection
 */
export const setLicensesCookie = (licenses: string[]): void => {
    setCookie('restonext_licenses', licenses.join(','), 7);
};

/**
 * API Client with JWT handling and global error handling
 * 
 * Features:
 * - Automatic JWT token attachment
 * - Global 401 error handling with redirect to login
 * - Proper error message extraction
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

    // Ensure endpoint starts with / for proper URL construction
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE_URL}${normalizedEndpoint}`;
    const method = (options.method || 'GET').toUpperCase();
    const startTime = performance.now();

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        const durationMs = performance.now() - startTime;

        // Handle 401 Unauthorized - clear token and redirect to login
        if (response.status === 401) {
            Logger.apiCall(method, normalizedEndpoint, 401, durationMs, 'Unauthorized');
            console.warn('[API] Unauthorized (401) - redirecting to login');
            TokenStorage.remove();
            // Only redirect if we're in the browser and not already on login page
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
            throw new Error('Sesión expirada. Por favor inicia sesión de nuevo.');
        }

        // Handle 403 Forbidden
        if (response.status === 403) {
            console.warn('[API] Forbidden (403) - access denied');
            throw new Error('Acceso denegado. No tienes permisos para esta acción.');
        }

        // Handle 404 Not Found
        if (response.status === 404) {
            console.warn(`[API] Not Found (404) - endpoint: ${endpoint}`);
            throw new Error('Recurso no encontrado. Verifica la configuración del servidor.');
        }

        // Handle 422 Validation Error
        if (response.status === 422) {
            const errorData = await response.json().catch(() => ({}));
            console.warn('[API] Validation Error (422):', errorData);
            const detail = errorData.detail;
            if (Array.isArray(detail)) {
                const messages = detail.map((e: { msg?: string; loc?: string[] }) => e.msg || 'Error de validación').join('. ');
                throw new Error(messages);
            }
            throw new Error(typeof detail === 'string' ? detail : 'Error de validación en los datos enviados.');
        }

        // Handle 500+ Server Errors
        if (response.status >= 500) {
            console.error(`[API] Server Error (${response.status}) - endpoint: ${endpoint}`);
            throw new Error('Error del servidor. Por favor intenta de nuevo más tarde.');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.detail || errorData.message || `Error de API: ${response.status}`;
            throw new Error(errorMessage);
        }

        // Handle 204 No Content
        if (response.status === 204) {
            Logger.apiCall(method, normalizedEndpoint, 204, durationMs);
            return {} as T;
        }

        // Log successful request
        Logger.apiCall(method, normalizedEndpoint, response.status, durationMs);

        return response.json();
    } catch (error) {
        const durationMs = performance.now() - startTime;

        // Re-throw if it's already an Error with a message (our custom errors)
        if (error instanceof Error && error.message) {
            // Check if it's a network error (TypeError with "Failed to fetch")
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                Logger.apiCall(method, normalizedEndpoint, 0, durationMs, 'Network error');
                console.error('[API] Network error - cannot reach server:', url);
                throw new Error('No se puede conectar al servidor. Verifica tu conexión a internet.');
            }
            throw error;
        }
        // Unknown errors
        Logger.apiCall(method, normalizedEndpoint, 0, durationMs, 'Unknown error');
        console.error('[API] Unknown error:', error);
        throw new Error('Error desconocido. Por favor intenta de nuevo.');
    }
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
     * Backend expects JSON: { email: string, password: string }
     */
    login: async (email: string, password: string): Promise<LoginResponse> => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            // Extract meaningful error message
            let errorMessage = 'Login failed';
            if (errorData.detail) {
                errorMessage = typeof errorData.detail === 'string'
                    ? errorData.detail
                    : JSON.stringify(errorData.detail);
            }
            throw new Error(errorMessage);
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
    },

    /**
     * Login with PIN for fast POS access
     */
    pinLogin: async (pin: string, tenantId?: string): Promise<LoginResponse & { success: boolean }> => {
        const response = await fetch(`${API_BASE_URL}/auth/pin-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pin,
                tenant_id: tenantId
            }),
        });

        if (!response.ok) {
            return {
                success: false,
                access_token: '',
                token_type: 'bearer',
                user: {} as User
            };
        }

        const data = await response.json();
        if (data.access_token) {
            TokenStorage.set(data.access_token);
        }
        return { ...data, success: true };
    },

    /**
     * Set up PIN for current user
     */
    setupPin: async (pin: string): Promise<{ success: boolean; message: string }> => {
        return apiRequest('/auth/setup-pin', {
            method: 'POST',
            body: JSON.stringify({ pin }),
        });
    },

    /**
     * Remove PIN for current user
     */
    removePin: async (): Promise<{ success: boolean; message: string }> => {
        return apiRequest('/auth/remove-pin', {
            method: 'DELETE',
        });
    }
};

// ============================================
// Table Transfer API
// ============================================

interface FreeTable {
    id: string;
    number: number;
    capacity: number;
}

interface TableTransferResponse {
    success: boolean;
    message: string;
    transferred_orders: number;
    source_table_number: number;
    destination_table_number: number;
}

export const tableTransferApi = {
    /**
     * Get all free tables for transfer destination
     */
    getFreeTables: async (): Promise<FreeTable[]> => {
        const response = await apiRequest<{ tables: FreeTable[] }>('/pos/tables/free');
        return response.tables;
    },

    /**
     * Transfer orders from one table to another
     */
    transfer: async (sourceTableId: string, destTableId: string): Promise<TableTransferResponse> => {
        return apiRequest<TableTransferResponse>('/pos/tables/transfer', {
            method: 'POST',
            body: JSON.stringify({
                source_table_id: sourceTableId,
                destination_table_id: destTableId,
                transfer_all_orders: true,
            }),
        });
    }
};

// ============================================
// Orders API
// ============================================

export interface SelectedModifier {
    group_name: string;
    option_id: string;
    option_name: string;
    price_delta: number;
}

export interface CreateOrderRequest {
    table_id: string;
    items: Array<{
        menu_item_id: string;
        quantity: number;
        notes?: string;
        selected_modifiers?: SelectedModifier[];
    }>;
    notes?: string;
}

export interface PaymentRequest {
    payment_method: 'cash' | 'card' | 'transfer';
    amount: number;
    tip?: number;
    reference?: string;
}

// ============================================
// Bill Split Types
// ============================================

export interface SplitDetail {
    split_number: number;
    item_ids: string[];
    amount: number;
    paid: boolean;
    payment_method?: string;
}

export interface BillSplitResponse {
    id: string;
    order_id: string;
    split_type: string;
    splits: SplitDetail[];
    created_at: string;
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
    },

    /**
     * Get saved bill split configuration for an order
     */
    getSplits: async (orderId: string): Promise<BillSplitResponse | null> => {
        try {
            return await apiRequest<BillSplitResponse>(`/orders/${orderId}/splits`);
        } catch {
            // No splits saved yet - return null
            return null;
        }
    },

    /**
     * Save or update bill split configuration for an order
     */
    saveSplits: async (orderId: string, splits: SplitDetail[]): Promise<BillSplitResponse> => {
        return apiRequest<BillSplitResponse>(`/orders/${orderId}/splits`, {
            method: 'POST',
            body: JSON.stringify({
                order_id: orderId,
                split_type: 'custom',
                splits: splits
            }),
        });
    },

    /**
     * Delete bill split configuration for an order
     */
    deleteSplits: async (orderId: string): Promise<void> => {
        await apiRequest(`/orders/${orderId}/splits`, {
            method: 'DELETE',
        });
    }
};

// ============================================
// KDS (Kitchen Display System) API
// ============================================

export interface KDSConfig {
    mode: 'cafeteria' | 'restaurant';
    warning_minutes: number;
    critical_minutes: number;
    audio_alerts: boolean;
    shake_animation: boolean;
}

export const kdsApi = {
    /**
     * Get KDS configuration for current tenant
     */
    getConfig: async (): Promise<KDSConfig> => {
        return apiRequest<KDSConfig>('/kds/config');
    },

    /**
     * Update KDS configuration
     */
    updateConfig: async (config: Partial<KDSConfig>): Promise<KDSConfig> => {
        return apiRequest<KDSConfig>('/kds/config', {
            method: 'PATCH',
            body: JSON.stringify(config),
        });
    },

    /**
     * Mark order as paid and send to kitchen (cafeteria mode)
     */
    markPaid: async (orderId: string, paymentMethod?: string, notes?: string): Promise<Order> => {
        return apiRequest<Order>(`/kds/orders/${orderId}/paid`, {
            method: 'POST',
            body: JSON.stringify({ payment_method: paymentMethod, notes }),
        });
    },

    /**
     * Update order status in kitchen
     */
    updateOrderStatus: async (orderId: string, status: string): Promise<Order> => {
        return apiRequest<Order>(`/kds/orders/${orderId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    },

    /**
     * Get active kitchen orders
     */
    getOrders: async (): Promise<Order[]> => {
        return apiRequest<Order[]>('/kds/orders');
    },

    /**
     * Complete and remove order from kitchen display
     */
    completeOrder: async (orderId: string): Promise<{ message: string }> => {
        return apiRequest<{ message: string }>(`/kds/orders/${orderId}/complete`, {
            method: 'DELETE',
        });
    }
};

// ============================================
// Menu API
// ============================================

export interface CategoryCreateData {
    name: string;
    description?: string;
    sort_order?: number;
    printer_target?: string;
}

export interface CategoryUpdateData {
    name?: string;
    description?: string;
    sort_order?: number;
    is_active?: boolean;
    printer_target?: string;
}

export interface ItemCreateData {
    category_id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    route_to?: string;
    modifiers_schema?: Record<string, unknown>;
    tax_config?: Record<string, number>;
    sort_order?: number;
}

export interface ItemUpdateData {
    category_id?: string;
    name?: string;
    description?: string;
    price?: number;
    image_url?: string;
    route_to?: string;
    modifiers_schema?: Record<string, unknown>;
    tax_config?: Record<string, number>;
    is_available?: boolean;
    sort_order?: number;
}

export interface AIOptimizationResponse {
    suggested_description: string;
    market_price_analysis: string;
}

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
     * Create a new category
     */
    createCategory: async (data: CategoryCreateData): Promise<MenuCategory> => {
        return apiRequest<MenuCategory>('/menu/categories', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Update a category
     */
    updateCategory: async (id: string, data: CategoryUpdateData): Promise<MenuCategory> => {
        return apiRequest<MenuCategory>(`/menu/categories/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    /**
     * Delete a category (soft delete)
     */
    deleteCategory: async (id: string): Promise<void> => {
        await apiRequest(`/menu/categories/${id}`, {
            method: 'DELETE',
        });
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
    },

    /**
     * Create a new menu item
     */
    createItem: async (data: ItemCreateData): Promise<MenuItem> => {
        return apiRequest<MenuItem>('/menu/items', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Update a menu item
     */
    updateItem: async (id: string, data: ItemUpdateData): Promise<MenuItem> => {
        return apiRequest<MenuItem>(`/menu/items/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    /**
     * Delete a menu item (soft delete)
     */
    deleteItem: async (id: string): Promise<void> => {
        await apiRequest(`/menu/items/${id}`, {
            method: 'DELETE',
        });
    },

    /**
     * AI-powered menu item optimization
     * Generates neuromarketing description and market price analysis
     */
    optimizeItem: async (itemId: string): Promise<AIOptimizationResponse> => {
        return apiRequest<AIOptimizationResponse>(`/menu/${itemId}/optimize`, {
            method: 'POST',
        });
    },
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

        // For WebSocket connections in production with DigitalOcean:
        // The API_BASE_URL is https://domain/api
        // DO routes /api/* to the backend and STRIPS /api
        // So we need to connect to wss://domain/api/ws/... which becomes /ws/... at the backend
        // 
        // Transform: https://restonext.me/api -> wss://restonext.me/api
        const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + endpoint;
        const url = token ? `${wsUrl}?token=${token}` : wsUrl;

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // Backend sends 'event' field (e.g., 'kitchen:new_order')
                // Normalize by taking the part after colon if present
                const rawEvent = data.event || data.type || '';
                const eventType = rawEvent.includes(':') ? rawEvent.split(':')[1] : rawEvent;

                const handlers = this.messageHandlers.get(eventType);
                if (handlers) {
                    handlers.forEach(handler => handler(data.payload));
                }
                // Also try with full event name for specific listeners
                const fullHandlers = this.messageHandlers.get(rawEvent);
                if (fullHandlers) {
                    fullHandlers.forEach(handler => handler(data.payload));
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
// AI Forecast API Types
// ============================================

export interface ForecastPrediction {
    date: string;
    predicted_demand: number;
    lower_bound: number;
    upper_bound: number;
}

export interface ForecastResponse {
    ingredient: string;
    predictions: ForecastPrediction[];
    error?: string;
    model_metrics?: {
        data_points: number;
        forecast_days: number;
    };
}

export interface BatchForecastResponse {
    forecasts: ForecastResponse[];
}

// ============================================
// AI Forecast API
// ============================================

export const forecastApi = {
    /**
     * Get AI-powered demand forecast for a single ingredient
     * Uses Facebook Prophet with Mexican holiday adjustments
     */
    getIngredientForecast: async (ingredient: string, daysAhead: number = 7): Promise<ForecastResponse> => {
        const params = new URLSearchParams();
        params.append('ingredient', ingredient);
        params.append('days_ahead', daysAhead.toString());

        return apiRequest<ForecastResponse>(`/analytics/forecast?${params.toString()}`);
    },

    /**
     * Get forecasts for multiple ingredients at once
     */
    getBatchForecast: async (ingredients: string[], daysAhead: number = 7): Promise<BatchForecastResponse> => {
        const params = new URLSearchParams();
        params.append('ingredients', ingredients.join(','));
        params.append('days_ahead', daysAhead.toString());

        return apiRequest<BatchForecastResponse>(`/analytics/forecast/batch?${params.toString()}`);
    },

    /**
     * Get demand analysis context using Perplexity AI
     * Analyzes events, holidays, weather that impact demand
     */
    getDemandContext: async (location: string, startDate: Date, endDate: Date): Promise<{
        demand_multiplier: number;
        analysis_summary: string;
    }> => {
        const params = new URLSearchParams();
        params.append('location', location);
        params.append('start_date', startDate.toISOString());
        params.append('end_date', endDate.toISOString());

        return apiRequest<{ demand_multiplier: number; analysis_summary: string }>(`/analytics/demand-context?${params.toString()}`);
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
    },

    /**
     * List all invoices for current tenant
     * @param status - Optional filter: 'pending', 'stamped', 'cancelled', 'error'
     * @param limit - Max results (default 50)
     * @param offset - Pagination offset
     */
    listInvoices: async (options?: { status?: string; limit?: number; offset?: number }): Promise<InvoiceResponse[]> => {
        const params = new URLSearchParams();
        if (options?.status) params.append('status', options.status);
        if (options?.limit) params.append('limit', options.limit.toString());
        if (options?.offset) params.append('offset', options.offset.toString());

        const query = params.toString();
        return apiRequest<InvoiceResponse[]>(query ? `/billing/invoices?${query}` : '/billing/invoices');
    },

    /**
     * Cancel a CFDI invoice
     * @param invoiceId - Invoice UUID to cancel
     * @param motivo - SAT cancellation reason code:
     *   - '01': Error CON relación
     *   - '02': Error SIN relación (default)
     *   - '03': Operación no realizada
     *   - '04': Operación nominativa en factura global
     */
    cancelInvoice: async (invoiceId: string, motivo: string = '02'): Promise<{
        success: boolean;
        message: string;
        uuid: string;
        cancel_response: any;
    }> => {
        return apiRequest(`/billing/invoices/${invoiceId}/cancel?motivo=${motivo}`, {
            method: 'POST',
        });
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
    total_tips: number;  // Total tips collected during shift
    expected_cash: number;
    transactions_count: number;
}

export interface CashTransaction {
    id: string;
    type: string;
    amount: number;
    tip_amount: number;  // Tip for this transaction
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
    },

    /**
     * Record a sale transaction with optional tip
     */
    recordSale: async (data: {
        order_id: string;
        amount: number;
        tip_amount?: number;
        payment_method: 'cash' | 'card' | 'transfer';
        reference?: string;
    }): Promise<{ message: string; transaction_id: string | null; shift_active: boolean }> => {
        return apiRequest('/shift/sale', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Get X Report - mid-shift summary without closing
     */
    getXReport: async (): Promise<XReportResponse> => {
        return apiRequest<XReportResponse>('/shift/x-report');
    }
};

export interface XReportResponse {
    shift_id: string;
    opened_at: string;
    duration_hours: number;
    cashier: string;
    register_id?: string;
    opening_amount: number;
    total_sales: number;
    cash_sales: number;
    card_sales: number;
    transfer_sales: number;
    total_tips: number;
    total_drops: number;
    drops_count: number;
    expected_cash: number;
    sales_count: number;
    transactions_count: number;
}

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
    customer_name?: string;
    agent_id?: string;
    table_id?: string;
    reservation_time: string;
    party_size: number;
    status: string;
    deposit_amount?: number;
    payment_status?: string;
    additional_table_ids?: string[];
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

    getById: async (id: string): Promise<Reservation> => {
        return apiRequest<Reservation>(`/reservations/${id}`);
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

    delete: async (id: string): Promise<void> => {
        return apiRequest<void>(`/reservations/${id}`, {
            method: 'DELETE',
        });
    },

    checkAvailability: async (reservationTime: Date, partySize: number): Promise<any[]> => {
        const params = new URLSearchParams({
            reservation_time: reservationTime.toISOString(),
            party_size: partySize.toString(),
        });
        return apiRequest<any[]>(`/reservations/check-availability?${params}`);
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
     * Get the publicly visible profile for the current tenant
     */
    get_current_tenant_profile: async (): Promise<any> => {
        return apiRequest<any>('/tenant/me');
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

// ============================================
// Catering API
// ============================================

export interface EventLead {
    id: string;
    tenant_id: string;
    client_name: string;
    contact_email?: string;
    contact_phone?: string;
    event_date?: string;
    guest_count?: number;
    event_type?: string;
    status: string;
    notes?: string;
    source?: string;
    created_at: string;
    updated_at: string;
}

export interface CateringEvent {
    id: string;
    tenant_id: string;
    lead_id?: string;
    name: string;
    start_time: string;
    end_time: string;
    guest_count: number;
    location?: string;
    status: string;
    total_amount: number;
    created_at: string;
    updated_at: string;
    menu_selections: EventMenuItem[];
}

export interface EventMenuItem {
    id: string;
    event_id: string;
    menu_item_id: string;
    item_name: string;
    unit_price: number;
    quantity: number;
    notes?: string;
}

export interface CateringQuote {
    id: string;
    event_id: string;
    valid_until: string;
    status: string;
    public_token: string;
    subtotal: number;
    tax: number;
    total: number;
    created_at: string;
}

export interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    status: string;
    color: string;
    backgroundColor: string;
    borderColor: string;
    extendedProps: {
        guest_count: number;
        location: string | null;
        client_name: string;
        total_amount: number;
        menu_items_count: number;
    };
}

export interface ProductionItem {
    ingredient_id: string;
    name: string;
    quantity: number;
    unit: string;
}

export interface ProductionSheet {
    event_id: string;
    event_name: string;
    event_date?: string;
    guest_count: number;
    production_list: ProductionItem[];
}

export const cateringApi = {
    // ==========================================
    // Leads
    // ==========================================

    /**
     * Get all leads
     */
    getLeads: async (status?: string): Promise<EventLead[]> => {
        const query = status ? `?status=${status}` : '';
        return apiRequest<EventLead[]>(`/catering/leads${query}`);
    },

    /**
     * Create a new lead
     */
    createLead: async (data: Partial<EventLead>): Promise<EventLead> => {
        return apiRequest<EventLead>('/catering/leads', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Convert lead to event
     */
    convertLead: async (leadId: string): Promise<CateringEvent> => {
        return apiRequest<CateringEvent>(`/catering/leads/${leadId}/convert`, {
            method: 'POST',
        });
    },

    // ==========================================
    // Events
    // ==========================================

    /**
     * Get all events
     */
    getEvents: async (): Promise<CateringEvent[]> => {
        return apiRequest<CateringEvent[]>('/catering/events');
    },

    /**
     * Get event by ID
     */
    getEvent: async (eventId: string): Promise<CateringEvent> => {
        return apiRequest<CateringEvent>(`/catering/events/${eventId}`);
    },

    /**
     * Create a new event
     */
    createEvent: async (data: {
        lead_id?: string;
        name: string;
        start_time: string;
        end_time: string;
        guest_count: number;
        location?: string;
    }): Promise<CateringEvent> => {
        return apiRequest<CateringEvent>('/catering/events', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Update an existing event
     */
    updateEvent: async (eventId: string, data: {
        name?: string;
        start_time?: string;
        end_time?: string;
        guest_count?: number;
        location?: string;
        status?: string;
    }): Promise<CateringEvent> => {
        return apiRequest<CateringEvent>(`/catering/events/${eventId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    /**
     * Update event status
     */
    updateEventStatus: async (eventId: string, status: string): Promise<CateringEvent> => {
        return apiRequest<CateringEvent>(`/catering/events/${eventId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    },

    /**
     * Delete an event
     */
    deleteEvent: async (eventId: string): Promise<{ message: string; id: string }> => {
        return apiRequest<{ message: string; id: string }>(`/catering/events/${eventId}`, {
            method: 'DELETE',
        });
    },

    /**
     * Add menu item to event
     */
    addMenuItem: async (eventId: string, data: {
        menu_item_id: string;
        quantity: number;
        notes?: string;
    }): Promise<CateringEvent> => {
        return apiRequest<CateringEvent>(`/catering/events/${eventId}/items`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },


    /**
     * Get production list for event
     */
    getProductionList: async (eventId: string): Promise<ProductionSheet> => {
        return apiRequest<ProductionSheet>(`/catering/events/${eventId}/production-list`);
    },

    // ==========================================
    // Quotes
    // ==========================================

    /**
     * Generate a quote for an event
     */
    createQuote: async (eventId: string, validUntil: string): Promise<CateringQuote> => {
        return apiRequest<CateringQuote>(`/catering/events/${eventId}/quote`, {
            method: 'POST',
            body: JSON.stringify({ valid_until: validUntil }),
        });
    },

    // ==========================================
    // Calendar
    // ==========================================

    /**
     * Get events for calendar display
     */
    getCalendarEvents: async (startDate?: Date, endDate?: Date): Promise<{ events: CalendarEvent[] }> => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate.toISOString());
        if (endDate) params.append('end_date', endDate.toISOString());

        const query = params.toString();
        const endpoint = query ? `/catering/calendar/events?${query}` : '/catering/calendar/events';

        return apiRequest<{ events: CalendarEvent[] }>(endpoint);
    },

    // ==========================================
    // PDF Generation
    // ==========================================

    /**
     * Get proposal PDF URL for an event
     */
    getProposalPdfUrl: (eventId: string): string => {
        return `${API_BASE_URL}/catering/events/${eventId}/proposal/pdf`;
    },

    /**
     * Get production sheet PDF URL for an event
     */
    getProductionSheetPdfUrl: (eventId: string): string => {
        return `${API_BASE_URL}/catering/events/${eventId}/production-sheet/pdf`;
    },

    // ==========================================
    // AI Proposal
    // ==========================================

    /**
     * Generate AI-powered catering proposal
     */
    generateAiProposal: async (data: {
        event_type: string;
        guest_count: number;
        budget_per_person: number;
        theme: string;
    }): Promise<{ suggested_menu: Array<Record<string, unknown>>; sales_pitch: string }> => {
        return apiRequest('/catering/events/ai-proposal', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // ==========================================
    // Leads Status (Kanban)
    // ==========================================

    /**
     * Update lead status (for Kanban drag & drop)
     */
    updateLeadStatus: async (leadId: string, status: string): Promise<EventLead> => {
        return apiRequest<EventLead>(`/catering/leads/${leadId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    },

    /**
     * Get single lead by ID
     */
    getLead: async (leadId: string): Promise<EventLead> => {
        return apiRequest<EventLead>(`/catering/leads/${leadId}`);
    },

    // ==========================================
    // Catering Packages (Bundles)
    // ==========================================

    /**
     * List all catering packages
     */
    getPackages: async (category?: string): Promise<CateringPackage[]> => {
        const params = category ? `?category=${encodeURIComponent(category)}` : '';
        return apiRequest<CateringPackage[]>(`/catering/packages${params}`);
    },

    /**
     * Create a new catering package
     */
    createPackage: async (data: {
        name: string;
        description?: string;
        items: Array<{
            menu_item_id: string;
            name: string;
            quantity: number;
            unit_price: number;
        }>;
        base_price_per_person: number;
        min_guests?: number;
        max_guests?: number;
        category?: string;
    }): Promise<CateringPackage> => {
        return apiRequest<CateringPackage>('/catering/packages', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Apply a package to an event
     */
    applyPackageToEvent: async (eventId: string, packageId: string): Promise<CateringEvent> => {
        return apiRequest<CateringEvent>(`/catering/events/${eventId}/apply-package`, {
            method: 'POST',
            body: JSON.stringify({ package_id: packageId }),
        });
    },
};

// ============================================
// Catering Package Type
// ============================================

export interface CateringPackage {
    id: string;
    name: string;
    description?: string;
    items: Array<{
        menu_item_id: string;
        name: string;
        quantity: number;
        unit_price: number;
    }>;
    base_price_per_person: number;
    min_guests: number;
    max_guests?: number;
    category?: string;
    is_active: boolean;
}
