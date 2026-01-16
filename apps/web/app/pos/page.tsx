"use client";

/**
 * Waiter POS Page
 * Premium mobile-first layout with table map and order management
 */

import { useEffect, useState } from "react";
import { TableMap } from "@/components/pos/TableMap";
import { usePOSStore } from "@/lib/store";
import { ArrowLeft, ShoppingCart, Sparkles } from "lucide-react";
import Link from "next/link";
import { menuApi, ordersApi } from "@/lib/api";
import { MenuCategory, MenuItem } from "../../../../packages/shared/src/index";
import { CategorySelector } from "@/components/pos/CategorySelector";
import { MenuGrid } from "@/components/pos/MenuGrid";
import { CartSidebar } from "@/components/pos/CartSidebar";
import { useToast, ToastContainer } from "@/components/ui/use-toast";

export default function POSPage() {
    const { selectedTable, setSelectedTable, cart, addToCart, removeFromCart, incrementCartItem, clearCart } =
        usePOSStore();
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showCart, setShowCart] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const { toast, toasts, removeToast } = useToast();

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

            toast({
                title: "¡Pedido Enviado!",
                description: `Pedido para Mesa ${selectedTable?.number} confirmado`,
                className: "bg-green-600 text-white border-none"
            });

            clearCart();
            setSelectedTable(null);
            setShowCart(false);
        } catch (error) {
            console.error("Failed to send order:", error);
            toast({
                title: "Error",
                description: "No se pudo enviar el pedido. Intente nuevamente.",
                variant: "destructive"
            });
        } finally {
            setIsSending(false);
        }
    };

    // Table Selection View
    if (!selectedTable) {
        return (
            <div className="min-h-screen bg-mesh relative overflow-hidden">
                {/* Background Orbs */}
                <div className="orb orb-blue w-64 h-64 -top-32 -right-32 animate-float" />
                <div className="orb orb-brand w-48 h-48 bottom-1/4 -left-24 animate-float-delayed" />

                <header className="glass shadow-lg p-4 flex items-center gap-4 sticky top-0 z-20">
                    <Link href="/" className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-300">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            Seleccionar Mesa
                            <Sparkles className="w-5 h-5 text-brand-500" />
                        </h1>
                        <p className="text-sm text-gray-500">Toca una mesa para comenzar</p>
                    </div>
                </header>
                <TableMap />
            </div>
        );
    }

    // Order View
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
                        className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-300"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            Mesa {selectedTable.number}
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        </h1>
                        <p className="text-sm text-gray-500">Nuevo pedido</p>
                    </div>
                </div>

                {/* Cart Button */}
                <button
                    onClick={() => setShowCart(true)}
                    className="relative p-4 bg-gradient-to-br from-brand-500 to-brand-700 text-white rounded-2xl
                             shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40
                             transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
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

            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}
