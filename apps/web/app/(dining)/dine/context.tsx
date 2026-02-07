'use client';

/**
 * Dining Context Provider
 * Manages state for the self-service dining experience
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type {
    DiningContextType,
    TableSession,
    PublicMenu,
    Cart,
    CartItem,
    MenuItem,
    SelectedModifier,
    OrderResponse,
    ServiceRequest,
    Bill
} from './types';
import * as api from './api';

const DiningContext = createContext<DiningContextType | null>(null);

interface DiningProviderProps {
    children: React.ReactNode;
    tenantId: string;
    tableId: string;
    token: string;
}

export function DiningProvider({ children, tenantId, tableId, token }: DiningProviderProps) {
    // API Config
    const apiConfig = { tenantId, tableId, token };

    // Session State
    const [session, setSession] = useState<TableSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Menu State
    const [menu, setMenu] = useState<PublicMenu | null>(null);

    // Cart State
    const [cart, setCart] = useState<Cart>({ items: [], subtotal: 0 });

    // Order State
    const [currentOrder, setCurrentOrder] = useState<OrderResponse | null>(null);

    // Bill State
    const [bill, setBill] = useState<Bill | null>(null);

    // Initialize session and menu
    useEffect(() => {
        async function initialize() {
            setIsLoading(true);
            setError(null);

            try {
                const [sessionData, menuData] = await Promise.all([
                    api.getSession(apiConfig),
                    api.getMenu(apiConfig)
                ]);

                setSession(sessionData);
                setMenu(menuData);
            } catch (err) {
                let message: string;
                if (err instanceof api.DiningApiError) {
                    // Map specific API errors to user-friendly Spanish messages
                    if (err.status === 403) {
                        message = 'El servicio de auto-pedido no está disponible en este momento. Contacta al mesero.';
                    } else if (err.status === 401) {
                        message = 'El código QR ha expirado. Por favor, escanea de nuevo el código de tu mesa.';
                    } else if (err.status === 404) {
                        message = 'Mesa no encontrada. Verifica el código QR.';
                    } else {
                        message = err.message;
                    }
                } else {
                    message = 'Error al conectar con el restaurante. Verifica tu conexión a internet.';
                }
                setError(message);
            } finally {
                setIsLoading(false);
            }
        }

        initialize();
    }, [tenantId, tableId, token]);

    // Cart Functions
    const addToCart = useCallback((
        item: MenuItem,
        quantity: number,
        modifiers: SelectedModifier[],
        notes?: string
    ) => {
        const modifiersTotal = modifiers.reduce((sum, m) => sum + m.price_delta, 0);
        const unitPrice = item.price + modifiersTotal;

        const cartItem: CartItem = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            menu_item: item,
            quantity,
            selected_modifiers: modifiers,
            notes,
            unit_price: unitPrice
        };

        setCart(prev => {
            const newItems = [...prev.items, cartItem];
            const newSubtotal = newItems.reduce(
                (sum, item) => sum + (item.unit_price * item.quantity),
                0
            );
            return { ...prev, items: newItems, subtotal: newSubtotal };
        });
    }, []);

    const removeFromCart = useCallback((cartItemId: string) => {
        setCart(prev => {
            const newItems = prev.items.filter(item => item.id !== cartItemId);
            const newSubtotal = newItems.reduce(
                (sum, item) => sum + (item.unit_price * item.quantity),
                0
            );
            return { ...prev, items: newItems, subtotal: newSubtotal };
        });
    }, []);

    const updateCartItemQuantity = useCallback((cartItemId: string, quantity: number) => {
        setCart(prev => {
            const newItems = prev.items.map(item =>
                item.id === cartItemId ? { ...item, quantity } : item
            );
            const newSubtotal = newItems.reduce(
                (sum, item) => sum + (item.unit_price * item.quantity),
                0
            );
            return { ...prev, items: newItems, subtotal: newSubtotal };
        });
    }, []);

    const clearCart = useCallback(() => {
        setCart({ items: [], subtotal: 0 });
    }, []);

    // Order Functions
    const submitOrder = useCallback(async (): Promise<OrderResponse> => {
        if (cart.items.length === 0) {
            throw new Error('El carrito está vacío');
        }

        const payload = {
            items: cart.items.map(item => ({
                menu_item_id: item.menu_item.id,
                quantity: item.quantity,
                selected_modifiers: item.selected_modifiers,
                notes: item.notes
            })),
            notes: cart.notes
        };

        const order = await api.createOrder(apiConfig, payload);
        setCurrentOrder(order);
        clearCart();

        // Refresh bill after order
        refreshBill();

        return order;
    }, [cart, apiConfig, clearCart]);

    // Service Request Functions
    const callWaiter = useCallback(async (message?: string): Promise<ServiceRequest> => {
        return api.createServiceRequest(apiConfig, 'waiter', message);
    }, [apiConfig]);

    const requestBill = useCallback(async (): Promise<ServiceRequest> => {
        return api.createServiceRequest(apiConfig, 'bill');
    }, [apiConfig]);

    // Bill Functions
    const refreshBill = useCallback(async () => {
        try {
            const billData = await api.getBill(apiConfig);
            setBill(billData);
        } catch (err) {
            console.error('Error fetching bill:', err);
        }
    }, [apiConfig]);

    const value: DiningContextType = {
        // Config
        apiConfig,

        // Session
        session,
        isLoading,
        error,

        // Menu
        menu,

        // Cart
        cart,
        addToCart,
        removeFromCart,
        updateCartItemQuantity,
        clearCart,

        // Orders
        submitOrder,
        currentOrder,

        // Service Requests
        callWaiter,
        requestBill,

        // Bill
        bill,
        refreshBill
    };


    return (
        <DiningContext.Provider value={value}>
            {children}
        </DiningContext.Provider>
    );
}

export function useDining(): DiningContextType {
    const context = useContext(DiningContext);
    if (!context) {
        throw new Error('useDining must be used within a DiningProvider');
    }
    return context;
}
