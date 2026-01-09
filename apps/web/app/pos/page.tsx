"use client";

/**
 * Waiter POS Page
 * Mobile-first layout with table map and order management
 */

import { useEffect, useState } from "react";
import { TableMap } from "@/components/pos/TableMap";
import { usePOSStore } from "@/lib/store";
import { formatPrice } from "@/lib/utils";
import {
    ArrowLeft, Plus, Minus, ShoppingCart, X,
    Send, UtensilsCrossed
} from "lucide-react";
import Link from "next/link";
import { menuApi, ordersApi } from "@/lib/api";
import { MenuCategory, MenuItem, Order, OrderItem } from "../../../../packages/shared/src/index";

export default function POSPage() {
    const { selectedTable, setSelectedTable, cart, addToCart, removeFromCart, incrementCartItem, clearCart } =
        usePOSStore();
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showCart, setShowCart] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch Menu Data
    useEffect(() => {
        async function loadMenu() {
            try {
                // In a real app, we'd get tenantId from auth context
                const tenantId = "default-tenant";
                const cats = await menuApi.getCategories(tenantId);
                setCategories(cats);
                if (cats.length > 0) {
                    setSelectedCategory(cats[0].id);
                    const items = await menuApi.getItems(cats[0].id);
                    setMenuItems(items);
                }
            } catch (error) {
                console.error("Failed to load menu:", error);
            } finally {
                setIsLoading(false);
            }
        }
        loadMenu();
    }, []);

    // Load items when category changes
    useEffect(() => {
        if (selectedCategory) {
            menuApi.getItems(selectedCategory).then(setMenuItems);
        }
    }, [selectedCategory]);

    const cartTotal = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    const handleAddItem = (item: MenuItem) => {
        addToCart({
            menu_item_id: item.id,
            menu_item_name: item.name,
            price: item.price,
            quantity: 1,
            selected_modifiers: [],
        });
    };

    const handleSendOrder = async () => {
        if (!selectedTable) return;

        try {
            // Map cart items to OrderItem structure for API
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
                tenant_id: "default-tenant",
                items: items as any, // Mapped for API
                total: cartTotal,
                status: "open",
            });
            alert(`Pedido enviado para Mesa ${selectedTable?.number}`);
            clearCart();
            setSelectedTable(null);
        } catch (error) {
            console.error("Failed to send order:", error);
            alert("Error al enviar pedido");
        }
    };

    // Table Selection View
    if (!selectedTable) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <header className="bg-white dark:bg-gray-800 shadow-sm p-4 flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-xl font-bold">Seleccionar Mesa</h1>
                </header>
                <TableMap />
            </div>
        );
    }

    // Order View
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 shadow-sm p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedTable(null)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">Mesa {selectedTable.number}</h1>
                        <p className="text-sm text-gray-500">Nuevo pedido</p>
                    </div>
                </div>

                {/* Cart Button */}
                <button
                    onClick={() => setShowCart(true)}
                    className="relative p-3 bg-brand-600 text-white rounded-xl"
                >
                    <ShoppingCart className="w-6 h-6" />
                    {cart.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 text-gray-900 
                           rounded-full text-xs font-bold flex items-center justify-center">
                            {cart.length}
                        </span>
                    )}
                </button>
            </header>

            {/* Categories */}
            <div className="flex gap-2 p-4 overflow-x-auto bg-white dark:bg-gray-800 border-b">
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap
                       transition-colors ${selectedCategory === cat.id
                                ? "bg-brand-600 text-white"
                                : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200"
                            }`}
                    >
                        <span>{cat.icon || "🍴"}</span>
                        <span className="font-medium">{cat.name}</span>
                    </button>
                ))}
            </div>

            {/* Menu Items Grid */}
            <div className="flex-1 p-4 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleAddItem(item)}
                                className="bg-white dark:bg-gray-800 rounded-xl p-4 text-left
                            shadow-sm hover:shadow-md transition-all active:scale-95"
                            >
                                <div className="text-4xl mb-2">{item.image_url || "🥘"}</div>
                                <div className="font-medium text-sm">{item.name}</div>
                                <div className="text-brand-600 font-bold mt-1">
                                    {formatPrice(item.price)}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Cart Sidebar */}
            {showCart && (
                <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
                    <div className="w-full max-w-md bg-white dark:bg-gray-800 h-full flex flex-col
                         animate-slide-in">
                        {/* Cart Header */}
                        <div className="p-4 border-b flex items-center justify-between">
                            <h2 className="text-xl font-bold">Tu Pedido</h2>
                            <button
                                onClick={() => setShowCart(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {cart.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                                    <UtensilsCrossed className="w-12 h-12 mb-2" />
                                    <p>No hay productos en el pedido</p>
                                </div>
                            ) : (
                                cart.map((item, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 
                              rounded-lg p-3"
                                    >
                                        <div className="flex-1">
                                            <div className="font-medium">{item.menu_item_name}</div>
                                            <div className="text-brand-600 font-bold">
                                                {formatPrice(item.price)}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => removeFromCart(index)}
                                                className="w-8 h-8 flex items-center justify-center 
                                  bg-gray-200 dark:bg-gray-600 rounded-full"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="w-8 text-center font-bold">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => incrementCartItem(index)}
                                                className="w-8 h-8 flex items-center justify-center 
                                  bg-brand-600 text-white rounded-full"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Cart Footer */}
                        <div className="p-4 border-t bg-gray-50 dark:bg-gray-900">
                            <div className="flex justify-between text-lg font-bold mb-4">
                                <span>Total:</span>
                                <span className="text-brand-600">{formatPrice(cartTotal)}</span>
                            </div>

                            <button
                                onClick={handleSendOrder}
                                disabled={cart.length === 0}
                                className="w-full btn-primary flex items-center justify-center gap-2
                          disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="w-5 h-5" />
                                Enviar a Cocina
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
