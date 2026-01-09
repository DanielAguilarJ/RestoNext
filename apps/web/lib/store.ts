/**
 * RestoNext MX - Zustand Store
 * Global state management for the POS system
 */

import { create } from "zustand";
import {
    Table, Order, OrderItem, MenuCategory, MenuItem, UserRole
} from "../../../packages/shared/src/index";

export interface CartItem {
    menu_item_id: string;
    menu_item_name: string;
    price: number;
    quantity: number;
    selected_modifiers: any[];
    seat_number?: number;
    notes?: string;
}

// Demo tables for development
const DEMO_TABLES: Table[] = [
    { id: "table-1", restaurant_id: "default-tenant", number: 1, capacity: 2, status: "free", pos_x: 0, pos_y: 0 },
    { id: "table-2", restaurant_id: "default-tenant", number: 2, capacity: 4, status: "occupied", pos_x: 1, pos_y: 0 },
    { id: "table-3", restaurant_id: "default-tenant", number: 3, capacity: 4, status: "free", pos_x: 2, pos_y: 0 },
    { id: "table-4", restaurant_id: "default-tenant", number: 4, capacity: 6, status: "bill_requested", pos_x: 0, pos_y: 1 },
    { id: "table-5", restaurant_id: "default-tenant", number: 5, capacity: 4, status: "occupied", pos_x: 1, pos_y: 1 },
    { id: "table-6", restaurant_id: "default-tenant", number: 6, capacity: 2, status: "free", pos_x: 2, pos_y: 1 },
    { id: "table-7", restaurant_id: "default-tenant", number: 7, capacity: 8, status: "free", pos_x: 0, pos_y: 2 },
    { id: "table-8", restaurant_id: "default-tenant", number: 8, capacity: 4, status: "occupied", pos_x: 1, pos_y: 2 },
    { id: "table-9", restaurant_id: "default-tenant", number: 9, capacity: 4, status: "free", pos_x: 2, pos_y: 2 },
] as any[];

// Store State
interface POSState {
    // Tables
    tables: Table[];
    selectedTable: Table | null;
    setSelectedTable: (table: Table | null) => void;
    setTables: (tables: Table[]) => void;
    updateTableStatus: (tableId: string, status: Table["status"]) => void;

    // Cart (current order being built)
    cart: CartItem[];
    addToCart: (item: CartItem) => void;
    updateCartItem: (index: number, updates: Partial<CartItem>) => void;
    removeFromCart: (index: number) => void;
    incrementCartItem: (index: number) => void;
    clearCart: () => void;

    // Orders
    activeOrders: Order[];
    addOrder: (order: Order) => void;
    updateOrderStatus: (orderId: string, status: Order["status"]) => void;

    // UI State
    isOrderModalOpen: boolean;
    setOrderModalOpen: (open: boolean) => void;
    selectedCategory: string | null;
    setSelectedCategory: (category: string | null) => void;
}

// Create Store
export const usePOSStore = create<POSState>((set) => ({
    // Tables - initialized with demo data for development
    tables: DEMO_TABLES,
    selectedTable: null,

    setSelectedTable: (table) => set({ selectedTable: table }),
    setTables: (tables) => set({ tables }),

    updateTableStatus: (tableId, status) =>
        set((state) => ({
            tables: state.tables.map((t) =>
                t.id === tableId ? { ...t, status } : t
            ),
        })),

    // Cart
    cart: [],

    addToCart: (item) =>
        set((state) => ({
            cart: [...state.cart, item],
        })),

    updateCartItem: (index, updates) =>
        set((state) => ({
            cart: state.cart.map((item, i) =>
                i === index ? { ...item, ...updates } : item
            ),
        })),

    removeFromCart: (index) =>
        set((state) => ({
            cart: state.cart.filter((_, i) => i !== index),
        })),

    incrementCartItem: (index) =>
        set((state) => ({
            cart: state.cart.map((item, i) =>
                i === index ? { ...item, quantity: item.quantity + 1 } : item
            ),
        })),

    clearCart: () => set({ cart: [] }),

    // Orders
    activeOrders: [],

    addOrder: (order) =>
        set((state) => ({
            activeOrders: [...state.activeOrders, order],
        })),

    updateOrderStatus: (orderId, status) =>
        set((state) => ({
            activeOrders: state.activeOrders.map((o) =>
                o.id === orderId ? { ...o, status } : o
            ),
        })),

    // UI State
    isOrderModalOpen: false,
    setOrderModalOpen: (open) => set({ isOrderModalOpen: open }),

    selectedCategory: null,
    setSelectedCategory: (category) => set({ selectedCategory: category }),
}));

// Kitchen Display Store
interface KDSState {
    tickets: Array<{
        id: string;
        orderId: string;
        tableNumber: number;
        items: Array<{
            id: string;
            name: string;
            quantity: number;
            modifiers: string[];
            notes?: string;
            status: "pending" | "preparing" | "ready";
        }>;
        createdAt: Date;
    }>;
    addTicket: (ticket: KDSState["tickets"][0]) => void;
    setTickets: (tickets: KDSState["tickets"]) => void;
    updateItemStatus: (ticketId: string, itemId: string, status: "pending" | "preparing" | "ready") => void;
    removeTicket: (ticketId: string) => void;
}

export const useKDSStore = create<KDSState>((set) => ({
    tickets: [],

    setTickets: (tickets) => set({ tickets }),

    addTicket: (ticket) =>
        set((state) => ({
            tickets: [...state.tickets, ticket],
        })),

    updateItemStatus: (ticketId, itemId, status) =>
        set((state) => ({
            tickets: state.tickets.map((ticket) =>
                ticket.id === ticketId
                    ? {
                        ...ticket,
                        items: ticket.items.map((item) =>
                            item.id === itemId ? { ...item, status } : item
                        ),
                    }
                    : ticket
            ),
        })),

    removeTicket: (ticketId) =>
        set((state) => ({
            tickets: state.tickets.filter((t) => t.id !== ticketId),
        })),
}));
