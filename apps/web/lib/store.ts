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
const DEMO_TABLES: Table[] = [];

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
    updateCartItemNotes: (index: number, notes: string) => void;
    removeFromCart: (index: number) => void;
    incrementCartItem: (index: number) => void;
    decrementCartItem: (index: number) => void;
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
    // Tables - empty by default, loaded from API
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

    updateCartItemNotes: (index, notes) =>
        set((state) => ({
            cart: state.cart.map((item, i) =>
                i === index ? { ...item, notes } : item
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

    decrementCartItem: (index) =>
        set((state) => {
            const item = state.cart[index];
            if (!item) return state;

            if (item.quantity <= 1) {
                // Remove item if quantity would go to 0
                return { cart: state.cart.filter((_, i) => i !== index) };
            }

            return {
                cart: state.cart.map((itm, i) =>
                    i === index ? { ...itm, quantity: itm.quantity - 1 } : itm
                )
            };
        }),

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
    setTickets: (tickets: KDSState["tickets"] | ((prev: KDSState["tickets"]) => KDSState["tickets"])) => void;
    updateItemStatus: (ticketId: string, itemId: string, status: "pending" | "preparing" | "ready") => void;
    removeTicket: (ticketId: string) => void;
}

export const useKDSStore = create<KDSState>((set) => ({
    tickets: [],

    setTickets: (tickets) => {
        if (typeof tickets === 'function') {
            set((state) => ({ tickets: (tickets as any)(state.tickets) }));
        } else {
            set({ tickets });
        }
    },

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
