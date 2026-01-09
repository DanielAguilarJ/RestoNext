"use client";

/**
 * Waiter POS Page
 * Premium mobile-first layout with table map and order management
 */

import { useEffect, useState } from "react";
import { TableMap } from "@/components/pos/TableMap";
import { usePOSStore } from "@/lib/store";
import { formatPrice } from "@/lib/utils";
import {
    ArrowLeft, Plus, Minus, ShoppingCart, X,
    Send, UtensilsCrossed, Sparkles, Package
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

    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handleAddItem = (item: MenuItem) => {
        addToCart({
            menu_item_id: item.$id,
            menu_item_name: item.name,
            price: item.price,
            quantity: 1,
            selected_modifiers: [],
        });
    };

    const handleSendOrder = async () => {
        if (!selectedTable) return;

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

            {/* Categories */}
            <div className="flex gap-2 p-4 overflow-x-auto glass sticky top-[72px] z-10 scrollbar-hide">
                {categories.map((cat, index) => (
                    <button
                        key={cat.$id}
                        onClick={() => setSelectedCategory(cat.$id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap
                       transition-all duration-300 font-medium animate-scale-in ${selectedCategory === cat.$id
                                ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/30"
                                : "bg-white/70 dark:bg-gray-800/70 hover:bg-white dark:hover:bg-gray-700 hover:shadow-md"
                            }`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                    >
                        <span>{cat.name}</span>
                    </button>
                ))}
            </div>

            {/* Menu Items Grid */}
            <div className="flex-1 p-4 overflow-y-auto">
                {isLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white/50 dark:bg-gray-800/50 rounded-2xl p-4 animate-pulse">
                                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-xl mb-3" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {menuItems.map((item, index) => (
                            <button
                                key={item.$id}
                                onClick={() => handleAddItem(item)}
                                className="card-interactive p-4 text-left animate-scale-in group"
                                style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                <div className="w-16 h-16 bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/50 dark:to-brand-800/50 
                                              rounded-xl flex items-center justify-center mb-3
                                              group-hover:scale-110 transition-transform duration-300">
                                    <span className="text-3xl">{item.image_url || "🥘"}</span>
                                </div>
                                <div className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2">
                                    {item.name}
                                </div>
                                <div className="text-brand-600 font-bold mt-2 text-lg">
                                    {formatPrice(item.price)}
                                </div>
                                <div className="mt-2 flex items-center gap-1 text-brand-600 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Plus className="w-3 h-3" />
                                    <span>Agregar</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Cart Sidebar */}
            {showCart && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
                        onClick={() => setShowCart(false)}
                    />

                    {/* Cart Panel */}
                    <div className="fixed top-0 right-0 bottom-0 w-full max-w-md glass-dark z-50 flex flex-col animate-slide-in-right">
                        {/* Cart Header */}
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <ShoppingCart className="w-6 h-6 text-brand-400" />
                                Tu Pedido
                            </h2>
                            <button
                                onClick={() => setShowCart(false)}
                                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                            >
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {cart.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                    <Package className="w-16 h-16 mb-4 opacity-50" />
                                    <p className="text-lg mb-2">Carrito vacío</p>
                                    <p className="text-sm text-center">Agrega productos del menú para comenzar</p>
                                </div>
                            ) : (
                                cart.map((item, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl p-4 animate-slide-up"
                                        style={{ animationDelay: `${index * 0.05}s` }}
                                    >
                                        <div className="w-12 h-12 bg-gradient-to-br from-brand-500/20 to-brand-600/20 rounded-lg flex items-center justify-center text-2xl">
                                            🥘
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-white">{item.menu_item_name}</div>
                                            <div className="text-brand-400 font-bold">
                                                {formatPrice(item.price * item.quantity)}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => removeFromCart(index)}
                                                className="w-9 h-9 flex items-center justify-center 
                                                         bg-white/10 hover:bg-red-500/50 rounded-full transition-colors"
                                            >
                                                <Minus className="w-4 h-4 text-white" />
                                            </button>
                                            <span className="w-8 text-center font-bold text-white text-lg">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => incrementCartItem(index)}
                                                className="w-9 h-9 flex items-center justify-center 
                                                         bg-brand-500 hover:bg-brand-600 rounded-full transition-colors"
                                            >
                                                <Plus className="w-4 h-4 text-white" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Cart Footer */}
                        <div className="p-4 border-t border-white/10 bg-black/20">
                            <div className="flex justify-between text-xl font-bold mb-4 text-white">
                                <span>Total:</span>
                                <span className="text-brand-400">{formatPrice(cartTotal)}</span>
                            </div>

                            <button
                                onClick={handleSendOrder}
                                disabled={cart.length === 0}
                                className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700
                                         text-white font-bold rounded-xl transition-all duration-300
                                         flex items-center justify-center gap-3
                                         shadow-lg shadow-green-500/30 hover:shadow-xl
                                         disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg
                                         hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <Send className="w-5 h-5" />
                                Enviar a Cocina
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
