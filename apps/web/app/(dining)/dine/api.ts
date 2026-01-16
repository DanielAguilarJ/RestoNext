/**
 * Dining API Client
 * API functions for self-service dining endpoints
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface DiningApiConfig {
    tenantId: string;
    tableId: string;
    token: string;
}

class DiningApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'DiningApiError';
        this.status = status;
    }
}

async function diningRequest<T>(
    config: DiningApiConfig,
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE_URL}/dining/${config.tenantId}/table/${config.tableId}${endpoint}?token=${config.token}`;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new DiningApiError(
            errorData.detail || `Error: ${response.status}`,
            response.status
        );
    }

    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}

// ============================================
// Menu API
// ============================================

import type { PublicMenu, TableSession, OrderResponse, ServiceRequest, Bill } from './types';

export async function getMenu(config: DiningApiConfig): Promise<PublicMenu> {
    return diningRequest<PublicMenu>(config, '/menu');
}

// ============================================
// Session API
// ============================================

export async function getSession(config: DiningApiConfig): Promise<TableSession> {
    return diningRequest<TableSession>(config, '/session');
}

export async function validateToken(
    tenantId: string,
    tableId: string,
    token: string
): Promise<{ valid: boolean; session?: TableSession; error?: string }> {
    const url = `${API_BASE_URL}/dining/validate-token?tenant_id=${tenantId}&table_id=${tableId}&token=${token}`;

    const response = await fetch(url);
    return response.json();
}

// ============================================
// Order API
// ============================================

interface CreateOrderPayload {
    items: Array<{
        menu_item_id: string;
        quantity: number;
        selected_modifiers: Array<{
            group_name: string;
            option_id: string;
            option_name: string;
            price_delta: number;
        }>;
        notes?: string;
    }>;
    notes?: string;
    customer_name?: string;
}

export async function createOrder(
    config: DiningApiConfig,
    payload: CreateOrderPayload
): Promise<OrderResponse> {
    return diningRequest<OrderResponse>(config, '/order', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function getOrderStatus(config: DiningApiConfig): Promise<{
    order_id: string;
    status: string;
    items: Array<{
        name: string;
        quantity: number;
        status: string;
        ready_at?: string;
    }>;
    estimated_ready_at?: string;
}> {
    return diningRequest(config, '/order/status');
}

// ============================================
// Service Request API
// ============================================

export async function createServiceRequest(
    config: DiningApiConfig,
    requestType: 'waiter' | 'bill' | 'refill' | 'custom',
    message?: string
): Promise<ServiceRequest> {
    return diningRequest<ServiceRequest>(config, '/service-request', {
        method: 'POST',
        body: JSON.stringify({
            request_type: requestType,
            message,
        }),
    });
}

export async function getActiveServiceRequests(config: DiningApiConfig): Promise<{
    requests: ServiceRequest[];
    has_pending: boolean;
}> {
    return diningRequest(config, '/service-requests');
}

// ============================================
// Bill API
// ============================================

export async function getBill(config: DiningApiConfig): Promise<Bill> {
    return diningRequest<Bill>(config, '/bill');
}

interface BillRequestResponse {
    success: boolean;
    table_number: number;
    table_id: string;
    message: string;
    items: Array<{
        name: string;
        quantity: number;
        unit_price: number;
        modifiers_total: number;
        subtotal: number;
    }>;
    subtotal: number;
    tax: number;
    discount: number;
    tip_suggested: number;
    total: number;
    currency: string;
    status: string;
    estimated_wait_minutes: number;
    requested_at: string;
}

/**
 * Request the bill / check for the table.
 * This is the critical endpoint for the "Pedir Cuenta" flow.
 * 
 * On success:
 * - Table status changes to "payment_requested"
 * - WebSocket notification sent to waiter/cashier
 * - Returns full bill breakdown
 */
export async function requestBill(config: DiningApiConfig): Promise<BillRequestResponse> {
    return diningRequest<BillRequestResponse>(config, '/request-bill', {
        method: 'POST',
    });
}

export type { BillRequestResponse };

// ============================================
// AI Upselling API
// ============================================

interface CartItemSimple {
    name: string;
    quantity: number;
}

interface UpsellSuggestion {
    id: string;
    name: string;
    price: number;
    image_url?: string;
    reason: string;
}

interface UpsellResponse {
    suggestions: UpsellSuggestion[];
    source: 'ai' | 'random';
}

export async function getUpsellSuggestions(
    config: DiningApiConfig,
    cartItems: CartItemSimple[]
): Promise<UpsellResponse> {
    return diningRequest<UpsellResponse>(config, '/suggest-upsell', {
        method: 'POST',
        body: JSON.stringify({ cart_items: cartItems }),
    });
}

// ============================================
// Export error class
// ============================================

export { DiningApiError };
