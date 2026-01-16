/**
 * Dining Types
 * TypeScript interfaces for the self-service dining module
 */

export interface ModifierOption {
    id: string;
    name: string;
    price_delta: number;
    description?: string;
}

export interface ModifierGroup {
    name: string;
    required: boolean;
    min_select?: number;
    max_select?: number;
    options: ModifierOption[];
}

export interface MenuItem {
    id: string;
    name: string;
    description?: string;
    ai_description?: string;
    price: number;
    image_url?: string;
    is_available: boolean;
    modifiers?: ModifierGroup[];
    tags: string[];
}

export interface MenuCategory {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    items: MenuItem[];
}

export interface PublicMenu {
    restaurant_name: string;
    logo_url?: string;
    table_number: number;
    categories: MenuCategory[];
    currency: string;
    allow_special_requests: boolean;
    show_prices: boolean;
}

export interface SelectedModifier {
    group_name: string;
    option_id: string;
    option_name: string;
    price_delta: number;
}

export interface CartItem {
    id: string; // Client-side ID
    menu_item: MenuItem;
    quantity: number;
    selected_modifiers: SelectedModifier[];
    notes?: string;
    unit_price: number; // Pre-calculated with modifiers
}

export interface Cart {
    items: CartItem[];
    subtotal: number;
    notes?: string;
}

export interface OrderResponse {
    id: string;
    order_number: string;
    table_number: number;
    status: string;
    items: OrderItemResponse[];
    subtotal: number;
    tax: number;
    total: number;
    estimated_time_minutes?: number;
    created_at: string;
}

export interface OrderItemResponse {
    id: string;
    menu_item_name: string;
    quantity: number;
    unit_price: number;
    modifiers: SelectedModifier[];
    notes?: string;
    status: string;
}

export interface ServiceRequest {
    id: string;
    request_type: 'waiter' | 'bill' | 'refill' | 'custom';
    status: 'pending' | 'acknowledged' | 'resolved';
    message?: string;
    created_at: string;
    estimated_response_minutes?: number;
}

export interface TableSession {
    table_id: string;
    table_number: number;
    tenant_name: string;
    tenant_logo?: string;
    is_occupied: boolean;
    current_order_id?: string;
    current_order_total: number;
    can_order: boolean;
    can_call_waiter: boolean;
    can_request_bill: boolean;
    can_view_order_status: boolean;
}

export interface BillItem {
    name: string;
    quantity: number;
    unit_price: number;
    modifiers_total: number;
    subtotal: number;
}

export interface Bill {
    table_number: number;
    items: BillItem[];
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
    can_pay_online: boolean;
    payment_methods: string[];
}

export interface DiningContextType {
    // Session
    session: TableSession | null;
    isLoading: boolean;
    error: string | null;
    
    // Menu
    menu: PublicMenu | null;
    
    // Cart
    cart: Cart;
    addToCart: (item: MenuItem, quantity: number, modifiers: SelectedModifier[], notes?: string) => void;
    removeFromCart: (cartItemId: string) => void;
    updateCartItemQuantity: (cartItemId: string, quantity: number) => void;
    clearCart: () => void;
    
    // Orders
    submitOrder: () => Promise<OrderResponse>;
    currentOrder: OrderResponse | null;
    
    // Service Requests
    callWaiter: (message?: string) => Promise<ServiceRequest>;
    requestBill: () => Promise<ServiceRequest>;
    
    // Bill
    bill: Bill | null;
    refreshBill: () => Promise<void>;
}
