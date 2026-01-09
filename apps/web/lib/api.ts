import {
    MenuCategory, MenuItem, Table, Order, UserRole
} from '../../../packages/shared/src/index';
import { isOnline, syncQueueManager, type OptimisticOrder } from './offline';

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
// Export token utilities for external use
// ============================================

export const tokenUtils = {
    getToken: TokenStorage.get,
    setToken: TokenStorage.set,
    removeToken: TokenStorage.remove,
};
