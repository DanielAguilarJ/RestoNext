"use client";

/**
 * Waiter POS Page - Command Center
 * Premium mobile-first layout with real-time table monitoring and order management
 * 
 * Features:
 * - Real-time service request notifications (WebSocket)
 * - Live table status updates  
 * - Feature gating based on subscription plan
 * - Fat-finger optimized touch targets
 */

import { useEffect, useState, useCallback } from "react";
import { TableMap } from "@/components/pos/TableMap";
import { ServiceRequestPopup } from "@/components/pos/ServiceRequestPopup";
import { usePOSStore } from "@/lib/store";
import {
    ArrowLeft, ShoppingCart, Sparkles, Send, SplitSquareHorizontal,
    Wifi, WifiOff, Bell
} from "lucide-react";
import Link from "next/link";
import { menuApi, ordersApi } from "@/lib/api";
import { MenuCategory, MenuItem } from "../../../../packages/shared/src/index";
import { CategorySelector } from "@/components/pos/CategorySelector";
import { MenuGrid } from "@/components/pos/MenuGrid";
import { CartSidebar } from "@/components/pos/CartSidebar";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import { FeatureGate, useFeatureAccess } from "@/components/ui/FeatureGate";
import {
    useServiceSocket,
    BillRequestNotification,
    ServiceRequestNotification,
    TableStatusNotification
} from "@/hooks/useServiceSocket";

export default function POSPage() {
    const { selectedTable, setSelectedTable, cart, addToCart, removeFromCart, incrementCartItem, clearCart, updateTableStatus } =
        usePOSStore();
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showCart, setShowCart] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const { toast, toasts, removeToast, success, error: toastError } = useToast();

    // Feature access for plan-based gating (TODO: Get from auth context)
    const currentPlan = 'professional' as const; // This should come from user context
    const { hasAccess } = useFeatureAccess(currentPlan);

    // WebSocket connection for real-time updates
    const {
        isConnected,
        pendingRequests,
        pendingBillRequests
    } = useServiceSocket({
        playSound: true,
        onBillRequest: useCallback((bill: BillRequestNotification) => {
            // Show toast for bill request
            toast({
                title: `💵 Mesa ${bill.table_number} pide cuenta`,
                description: `Total: $${bill.total.toFixed(2)}`,
                duration: 5000,
            });
            // Update table status
            updateTableStatus(bill.table_id, 'bill_requested');
        }, [toast, updateTableStatus]),
        onServiceRequest: useCallback((request: ServiceRequestNotification) => {
            toast({
                title: `🔔 Mesa ${request.table_number}`,
                description: request.request_type === 'waiter' ? 'Llama al mesero' : request.message,
                duration: 4000,
            });
        }, [toast]),
        onTableStatusChange: useCallback((status: TableStatusNotification) => {
            updateTableStatus(status.table_id, status.status as any);
        }, [updateTableStatus])
    });

    // Total pending alerts count
    const totalAlerts = pendingRequests.length + pendingBillRequests.length;

    // Fetch Menu Data
    useEffect(() => {
        async function loadMenu() {
            try {
                const tenantId = "default-tenant";
                const cats = await menuApi.getCategories(tenantId);
                setCategories(cats);
                if (cats.length > 0) {
                    setSelectedCategory(cats[0].$id);
                    const items = await menuApi.getItems(cats[0].$id);
                    setMenuItems(items);
                }
            } catch (error) {
                console.error("Failed to load menu:", error);
                toast({
                    title: "Error",
                    description: "No se pudo cargar el menú",
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        }
        loadMenu();
    }, []);

    // Load items when category changes
    useEffect(() => {
        if (selectedCategory) {
            menuApi.getItems(selectedCategory).then(setMenuItems).catch(console.error);
        }
    }, [selectedCategory]);

    const cartTotal = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handleAddItem = (item: MenuItem) => {
        addToCart({
            menu_item_id: item.$id,
            menu_item_name: item.name,
            price: item.price,
            quantity: 1,
            selected_modifiers: [],
        });
        toast({
            title: "Agregado",
            description: `${item.name} agregado al pedido`,
            duration: 1500,
        });
    };

    const handleSendOrder = async () => {
        if (!selectedTable) return;
        setIsSending(true);

        try {
            const items = cart.map(item => ({
                menu_item_id: item.menu_item_id,
                menu_item_name: item.menu_item_name,
                quantity: item.quantity,
                unit_price: item.price,
                selected_modifiers: item.selected_modifiers,
                status: 'pending' as const
            }));

            await ordersApi.create({
                table_id: selectedTable.id,
                items: items.map(item => ({
                    menu_item_id: item.menu_item_id,
                    quantity: item.quantity,
                    modifiers: item.selected_modifiers,
                })),
            });

            success(
                "¡Pedido Enviado!",
                `Pedido para Mesa ${selectedTable?.number} confirmado`
            );

            // Update table status to occupied
            updateTableStatus(selectedTable.id, 'occupied');

            clearCart();
            setSelectedTable(null);
            setShowCart(false);
        } catch (error) {
            console.error("Failed to send order:", error);
            toastError(
                "Error",
                "No se pudo enviar el pedido. Intente nuevamente."
            );
        } finally {
            setIsSending(false);
        }
    };

    // Handle table selection from service popup
    const handleTableSelectFromPopup = (tableId: string) => {
        const table = usePOSStore.getState().tables.find(t => t.id === tableId);
        if (table) {
            setSelectedTable(table);
        }
    };

    // Table Selection View
    if (!selectedTable) {
        return (
            <div className="min-h-screen bg-mesh relative overflow-hidden">
                {/* Background Orbs */}
                <div className="orb orb-blue w-64 h-64 -top-32 -right-32 animate-float" />
                <div className="orb orb-brand w-48 h-48 bottom-1/4 -left-24 animate-float-delayed" />

                <header className="glass shadow-lg p-4 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-300 min-w-[48px] min-h-[48px] flex items-center justify-center">
                            <ArrowLeft className="w-6 h-6" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                Seleccionar Mesa
                                <Sparkles className="w-5 h-5 text-brand-500" />
                            </h1>
                            <p className="text-sm text-gray-500">Toca una mesa para comenzar</p>
                        </div>
                    </div>

                    {/* Connection & Alert Status */}
                    <div className="flex items-center gap-3">
                        {/* Pending Alerts Badge */}
                        {totalAlerts > 0 && (
                            <div className="relative">
                                <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-xl animate-pulse">
                                    <Bell className="w-4 h-4" />
                                    <span className="font-bold">{totalAlerts}</span>
                                </div>
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                            </div>
                        )}

                        {/* Connection Status */}
                        <div className={`
                            p-2 rounded-xl transition-colors
                            ${isConnected
                                ? 'text-green-600 bg-green-500/10'
                                : 'text-red-600 bg-red-500/10 animate-pulse'
                            }
                        `}>
                            {isConnected ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                        </div>
                    </div>
                </header>

                <TableMap />

                {/* Service Request Popup - Shows bill & service requests */}
                <ServiceRequestPopup
                    onTableSelect={handleTableSelectFromPopup}
                />

                <ToastContainer toasts={toasts} onClose={removeToast} />
            </div>
        );
    }

    // Order View (Table Selected)
    return (
        <div className="min-h-screen bg-mesh relative flex flex-col overflow-hidden">
            {/* Background Orbs */}
            <div className="orb orb-blue w-48 h-48 -top-24 -right-24 animate-float" />
            <div className="orb orb-brand w-32 h-32 bottom-1/3 -left-16 animate-float-delayed" />

            {/* Header */}
            <header className="glass shadow-lg p-4 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedTable(null)}
                        className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-300 min-w-[48px] min-h-[48px] flex items-center justify-center"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            Mesa {selectedTable.number}
                            <span className={`w-2 h-2 rounded-full animate-pulse ${isConnected ? 'bg-green-500' : 'bg-red-500'
                                }`} />
                        </h1>
                        <p className="text-sm text-gray-500">Nuevo pedido</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Advanced Features with Feature Gating */}

                    {/* Divide Bill - Only Professional+ */}
                    <FeatureGate
                        feature="bill_splitting"
                        currentPlan={currentPlan}
                        mode="hide"
                    >
                        <button
                            className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 
                                     rounded-xl hover:bg-purple-500/20 transition-all
                                     min-w-[48px] min-h-[48px] flex items-center justify-center"
                            title="Dividir Cuenta"
                        >
                            <SplitSquareHorizontal className="w-5 h-5" />
                        </button>
                    </FeatureGate>

                    {/* Send to KDS - Only Professional+ */}
                    <FeatureGate
                        feature="kds_full"
                        currentPlan={currentPlan}
                        mode="hide"
                    >
                        <button
                            className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 
                                     rounded-xl hover:bg-blue-500/20 transition-all
                                     min-w-[48px] min-h-[48px] flex items-center justify-center"
                            title="Enviar a Cocina (KDS)"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </FeatureGate>

                    {/* Cart Button */}
                    <button
                        onClick={() => setShowCart(true)}
                        className="relative p-4 bg-gradient-to-br from-brand-500 to-brand-700 text-white rounded-2xl
                                 shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40
                                 transition-all duration-300 hover:-translate-y-0.5 active:scale-95
                                 min-w-[56px] min-h-[56px]"
                    >
                        <ShoppingCart className="w-6 h-6" />
                        {cartItemCount > 0 && (
                            <span className="absolute -top-2 -right-2 w-7 h-7 bg-yellow-400 text-gray-900 
                               rounded-full text-sm font-bold flex items-center justify-center
                               shadow-lg animate-bounce-soft">
                                {cartItemCount}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* Components */}
            <CategorySelector
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
            />

            <MenuGrid
                isLoading={isLoading}
                items={menuItems}
                onAddItem={handleAddItem}
            />

            <CartSidebar
                isOpen={showCart}
                onClose={() => setShowCart(false)}
                cart={cart}
                cartTotal={cartTotal}
                onIncrementItem={incrementCartItem}
                onRemoveItem={removeFromCart}
                onSendOrder={handleSendOrder}
                isSending={isSending}
            />

            {/* Service Request Popup - Shows even when taking order */}
            <ServiceRequestPopup
                onTableSelect={handleTableSelectFromPopup}
            />

            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}
