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
 * - Shift enforcement (must have active shift to operate)
 * - Offline-first order submission with sync queue
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TableMap } from "@/components/pos/TableMap";
import { ServiceRequestPopup } from "@/components/pos/ServiceRequestPopup";
import { ShiftRequiredModal } from "@/components/pos/ShiftRequiredModal";
import { usePOSStore } from "@/lib/store";
import {
    ArrowLeft, ShoppingCart, Sparkles, Send, SplitSquareHorizontal,
    Wifi, WifiOff, Bell, CloudOff, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { menuApi, ordersApi, cashierApi, tableTransferApi } from "@/lib/api";
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
import { isOnline, onNetworkChange, syncQueueManager, PendingOrderData } from "@/lib/offline";
import { ProductDetailsModal } from "@/components/pos/ProductDetailsModal";
import { TableTransferModal } from "@/components/pos/TableTransferModal";
import { usePosAudio } from "@/hooks/usePosAudio";

// ============================================
// Types
// ============================================

interface PendingSyncInfo {
    count: number;
    isSyncing: boolean;
}

export default function POSPage() {
    const router = useRouter();
    const { selectedTable, setSelectedTable, cart, addToCart, removeFromCart, incrementCartItem, clearCart, updateTableStatus } =
        usePOSStore();
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showCart, setShowCart] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const { toast, toasts, removeToast, success, error: toastError } = useToast();

    // ============================================
    // Product Modifiers State
    // ============================================
    const [selectedProductForModifiers, setSelectedProductForModifiers] = useState<MenuItem | null>(null);
    const [showProductModal, setShowProductModal] = useState(false);

    // ============================================
    // Table Transfer State
    // ============================================
    const [showTransferModal, setShowTransferModal] = useState(false);

    // ============================================
    // Audio Feedback
    // ============================================
    const { playSuccess, playError, playClick } = usePosAudio();

    // ============================================
    // Shift Enforcement State
    // ============================================
    const [hasActiveShift, setHasActiveShift] = useState<boolean | null>(null); // null = loading
    const [showShiftModal, setShowShiftModal] = useState(false);

    // ============================================
    // Offline Sync State
    // ============================================
    const [networkOnline, setNetworkOnline] = useState(true);
    const [pendingSync, setPendingSync] = useState<PendingSyncInfo>({ count: 0, isSyncing: false });
    const [pendingTables, setPendingTables] = useState<Set<string>>(new Set());

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

    // ============================================
    // Shift Validation on Mount
    // ============================================
    useEffect(() => {
        async function checkShift() {
            try {
                const shift = await cashierApi.getCurrentShift();
                if (shift && shift.shift_id) {
                    setHasActiveShift(true);
                    setShowShiftModal(false);
                } else {
                    setHasActiveShift(false);
                    setShowShiftModal(true);
                }
            } catch (error: any) {
                // No shift found or 404 - need to open one
                console.log('[POS] No active shift found');
                setHasActiveShift(false);
                setShowShiftModal(true);
            }
        }
        checkShift();
    }, []);

    // ============================================
    // Network Status & Sync Queue Monitoring
    // ============================================
    useEffect(() => {
        // Initial network state
        setNetworkOnline(isOnline());

        // Subscribe to network changes
        const unsubscribeNetwork = onNetworkChange((online) => {
            setNetworkOnline(online);

            if (online) {
                toast({
                    title: "📶 Conexión Restaurada",
                    description: "Sincronizando pedidos pendientes...",
                    duration: 3000,
                });
                // Trigger sync when back online
                triggerSync();
            } else {
                toast({
                    title: "📵 Sin Conexión",
                    description: "Los pedidos se guardarán localmente",
                    variant: "destructive",
                    duration: 4000,
                });
            }
        });

        // Subscribe to sync events
        const unsubscribeSync = syncQueueManager.subscribe((event, data) => {
            if (event === 'sync_started') {
                setPendingSync(prev => ({ ...prev, isSyncing: true }));
            }
            if (event === 'sync_completed') {
                setPendingSync({ count: 0, isSyncing: false });
                // Clear pending tables visual state
                setPendingTables(new Set());

                if (data?.success > 0) {
                    success(
                        "✅ Sincronización Completa",
                        `${data.success} pedido(s) sincronizado(s)`
                    );
                }
            }
            if (event === 'sync_failed') {
                setPendingSync(prev => ({ ...prev, isSyncing: false }));
            }
            if (event === 'order_queued') {
                updatePendingCount();
            }
        });

        // Initial pending count
        updatePendingCount();

        return () => {
            unsubscribeNetwork();
            unsubscribeSync();
        };
    }, [toast, success]);

    const updatePendingCount = async () => {
        try {
            const count = await syncQueueManager.getPendingCount();
            setPendingSync(prev => ({ ...prev, count }));
        } catch (error) {
            console.error('[POS] Failed to get pending count:', error);
        }
    };

    const triggerSync = async () => {
        if (pendingSync.isSyncing) return;

        try {
            await syncQueueManager.processQueue();
        } catch (error) {
            console.error('[POS] Sync failed:', error);
        }
    };

    // ============================================
    // Shift Handling
    // ============================================
    const handleOpenShift = async (openingAmount: number) => {
        await cashierApi.openShift(openingAmount);
        setHasActiveShift(true);
        setShowShiftModal(false);
        success("✅ Turno Abierto", `Fondo inicial: $${openingAmount.toFixed(2)}`);
    };

    const handleGoToCashier = () => {
        router.push('/cashier');
    };

    // ============================================
    // Menu Loading
    // ============================================
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
        // Check if item has modifiers - if so, open the modal
        if (item.modifier_groups && item.modifier_groups.length > 0) {
            setSelectedProductForModifiers(item);
            setShowProductModal(true);
            playClick();
            return;
        }

        // No modifiers - add directly to cart
        addToCart({
            menu_item_id: item.$id,
            menu_item_name: item.name,
            price: item.price,
            quantity: 1,
            selected_modifiers: [],
        });
        playSuccess();
        toast({
            title: "Agregado",
            description: `${item.name} agregado al pedido`,
            duration: 1500,
        });
    };

    // Handle adding item with modifiers from modal
    // Signature matches ProductDetailsModal's onAddToCart callback
    const handleAddItemWithModifiers = (
        item: MenuItem,
        modifiers: Array<{ group_name: string; option_id: string; option_name: string; price_delta: number }>,
        quantity: number,
        notes: string
    ) => {
        const modifierSummary = modifiers.map(m => m.option_name).join(", ");
        const displayName = modifierSummary ? `${item.name} (${modifierSummary})` : item.name;
        const priceWithModifiers = item.price + modifiers.reduce((sum, m) => sum + m.price_delta, 0);

        // Convert to the SelectedModifier format expected by store
        const selectedModifiers = modifiers.map(m => ({
            group: m.group_name,
            option: m.option_name,
            option_id: m.option_id,
            price_delta: m.price_delta,
        }));

        addToCart({
            menu_item_id: item.$id,
            menu_item_name: displayName,
            price: priceWithModifiers,
            quantity: quantity,
            selected_modifiers: selectedModifiers,
            notes: notes || undefined,
        });

        playSuccess();
        setShowProductModal(false);
        setSelectedProductForModifiers(null);
        toast({
            title: "Agregado",
            description: `${displayName} agregado al pedido`,
            duration: 1500,
        });
    };

    // Handle table transfer
    const handleTableTransfer = async (sourceId: string, destId: string): Promise<boolean> => {
        try {
            const result = await tableTransferApi.transfer(sourceId, destId);
            if (result.success) {
                playSuccess();
                success("Mesa Transferida", result.message);
                // Update table statuses
                updateTableStatus(sourceId, 'free');
                updateTableStatus(destId, 'occupied');
                setSelectedTable(null);
                return true;
            }
            return false;
        } catch (error) {
            playError();
            toastError("Error", "No se pudo transferir la mesa");
            return false;
        }
    };

    // ============================================
    // RESILIENT SEND ORDER (Offline-First)
    // ============================================
    const handleSendOrder = async () => {
        if (!selectedTable) return;
        setIsSending(true);

        const orderData: PendingOrderData = {
            table_id: selectedTable.id,
            items: cart.map(item => ({
                menu_item_id: item.menu_item_id,
                quantity: item.quantity,
                notes: undefined,
                modifiers: item.selected_modifiers?.map(m => m.option) || [],
            })),
        };

        try {
            // Attempt online submission first
            const result = await ordersApi.create({
                table_id: selectedTable.id,
                items: orderData.items,
            });

            // Check if it was an offline optimistic response
            if ('is_offline' in result && result.is_offline) {
                // Order was queued locally
                setPendingTables(prev => new Set(prev).add(selectedTable.id));

                toast({
                    title: "📱 Orden Guardada Localmente",
                    description: `Pedido para Mesa ${selectedTable?.number} guardado. Se enviará cuando haya conexión.`,
                    duration: 4000,
                });

                // Update pending count
                updatePendingCount();
            } else {
                // Success - online order created
                success(
                    "¡Pedido Enviado!",
                    `Pedido para Mesa ${selectedTable?.number} confirmado`
                );
            }

            // Update table status to occupied
            updateTableStatus(selectedTable.id, 'occupied');

            clearCart();
            setSelectedTable(null);
            setShowCart(false);
        } catch (error) {
            console.error("Failed to send order:", error);

            // OFFLINE FALLBACK: Save to local queue
            if (!isOnline()) {
                try {
                    await syncQueueManager.enqueue(orderData);
                    setPendingTables(prev => new Set(prev).add(selectedTable.id));

                    toast({
                        title: "📱 Sin Conexión - Orden Guardada",
                        description: `Pedido para Mesa ${selectedTable?.number} guardado en dispositivo. Se sincronizará automáticamente.`,
                        duration: 5000,
                    });

                    updatePendingCount();
                    updateTableStatus(selectedTable.id, 'occupied');
                    clearCart();
                    setSelectedTable(null);
                    setShowCart(false);
                } catch (queueError) {
                    console.error("Failed to queue order:", queueError);
                    toastError(
                        "Error",
                        "No se pudo guardar el pedido. Intente nuevamente."
                    );
                }
            } else {
                toastError(
                    "Error",
                    "No se pudo enviar el pedido. Intente nuevamente."
                );
            }
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

    // ============================================
    // Pending Sync Status Badge Component
    // ============================================
    const PendingSyncBadge = () => {
        if (pendingSync.count === 0 && networkOnline) return null;

        return (
            <div className={`
                flex items-center gap-2 px-3 py-2 rounded-xl
                ${networkOnline
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-red-500/10 text-red-400'
                }
            `}>
                {pendingSync.isSyncing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                    <CloudOff className="w-4 h-4" />
                )}
                <span className="font-medium text-sm">
                    {pendingSync.isSyncing
                        ? 'Sincronizando...'
                        : `${pendingSync.count} pendiente(s)`
                    }
                </span>
            </div>
        );
    };

    // ============================================
    // Show Loading While Checking Shift
    // ============================================
    if (hasActiveShift === null) {
        return (
            <div className="min-h-screen bg-mesh flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto" />
                    <p className="text-gray-400">Verificando turno...</p>
                </div>
            </div>
        );
    }

    // ============================================
    // Table Selection View
    // ============================================
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

                    {/* Connection, Sync & Alert Status */}
                    <div className="flex items-center gap-3">
                        {/* Pending Sync Badge */}
                        <PendingSyncBadge />

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
                            ${isConnected && networkOnline
                                ? 'text-green-600 bg-green-500/10'
                                : 'text-red-600 bg-red-500/10 animate-pulse'
                            }
                        `}>
                            {isConnected && networkOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                        </div>
                    </div>
                </header>

                <TableMap pendingTables={pendingTables} />

                {/* Service Request Popup - Shows bill & service requests */}
                <ServiceRequestPopup
                    onTableSelect={handleTableSelectFromPopup}
                />

                {/* Shift Required Modal */}
                <ShiftRequiredModal
                    isOpen={showShiftModal}
                    onOpenShift={handleOpenShift}
                    onGoToCashier={handleGoToCashier}
                />

                <ToastContainer toasts={toasts} onClose={removeToast} />
            </div>
        );
    }

    // ============================================
    // Order View (Table Selected)
    // ============================================
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
                            <span className={`w-2 h-2 rounded-full animate-pulse ${isConnected && networkOnline ? 'bg-green-500' : 'bg-red-500'
                                }`} />
                        </h1>
                        <p className="text-sm text-gray-500">Nuevo pedido</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Offline indicator */}
                    {!networkOnline && (
                        <div className="px-3 py-2 bg-amber-500/10 text-amber-400 rounded-xl flex items-center gap-2">
                            <CloudOff className="w-4 h-4" />
                            <span className="text-sm font-medium">Modo Offline</span>
                        </div>
                    )}

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

                    {/* Move Table Button */}
                    <button
                        onClick={() => setShowTransferModal(true)}
                        className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 
                                 rounded-xl hover:bg-amber-500/20 transition-all
                                 min-w-[48px] min-h-[48px] flex items-center justify-center"
                        title="Mover Mesa"
                    >
                        <ArrowLeft className="w-5 h-5 rotate-180" />
                    </button>

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

            {/* Product Details Modal (for items with modifiers) */}
            <ProductDetailsModal
                item={selectedProductForModifiers}
                isOpen={showProductModal}
                onClose={() => {
                    setShowProductModal(false);
                    setSelectedProductForModifiers(null);
                }}
                onAddToCart={handleAddItemWithModifiers}
            />

            {/* Table Transfer Modal */}
            <TableTransferModal
                isOpen={showTransferModal}
                sourceTable={selectedTable ? { id: selectedTable.id, number: selectedTable.number } : null}
                onClose={() => setShowTransferModal(false)}
                onTransfer={handleTableTransfer}
                fetchFreeTables={tableTransferApi.getFreeTables}
            />

            {/* Service Request Popup - Shows even when taking order */}
            <ServiceRequestPopup
                onTableSelect={handleTableSelectFromPopup}
            />

            {/* Shift Required Modal */}
            <ShiftRequiredModal
                isOpen={showShiftModal}
                onOpenShift={handleOpenShift}
                onGoToCashier={handleGoToCashier}
            />

            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}
