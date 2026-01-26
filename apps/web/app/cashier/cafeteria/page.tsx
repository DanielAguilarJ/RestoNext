"use client";

/**
 * RestoNext MX - Cafeteria Cashier Page (Full POS)
 * =================================================
 * Complete point-of-sale for cafeteria mode:
 * 1. Product catalog with categories
 * 2. Cart management
 * 3. Payment processing
 * 4. Sends paid orders directly to kitchen
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Receipt, Banknote, CreditCard, ArrowLeft, Clock,
    Check, AlertCircle, RefreshCw, Wallet, ChefHat,
    Sparkles, Phone, ShoppingCart, Plus, Minus, Trash2,
    Search, Loader2, X
} from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";
import { menuApi } from "@/lib/api";

// Local type definitions
interface MenuCategory {
    $id: string;
    name: string;
    description?: string;
}

interface MenuItem {
    $id: string;
    name: string;
    price: number;
    available?: boolean;
    is_available?: boolean;  // Alternate field name from API
    image_url?: string;
    description?: string;
}

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://restonext.me/api';

const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
};

interface CartItem {
    id: string;
    menu_item_id: string;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
}

export default function CafeteriaCashierPage() {
    // Menu state
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [loadingMenu, setLoadingMenu] = useState(true);

    // Cart state
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);

    // Payment state
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("cash");
    const [processing, setProcessing] = useState(false);

    // UI state
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Load menu categories and items
    useEffect(() => {
        async function loadMenu() {
            try {
                setLoadingMenu(true);
                const cats = await menuApi.getCategories() as unknown as MenuCategory[];
                setCategories(cats);

                if (cats.length > 0) {
                    setSelectedCategory(cats[0].$id);
                    const items = await menuApi.getItems(cats[0].$id) as unknown as MenuItem[];
                    setMenuItems(items);
                }
            } catch (err) {
                console.error("Failed to load menu:", err);
                setError("No se pudo cargar el menú. Verifica que hayas configurado tus productos.");
            } finally {
                setLoadingMenu(false);
            }
        }
        loadMenu();
    }, []);

    // Load items when category changes
    useEffect(() => {
        if (selectedCategory) {
            menuApi.getItems(selectedCategory).then(items => setMenuItems(items as unknown as MenuItem[])).catch(console.error);
        }
    }, [selectedCategory]);

    // Cart operations
    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(i => i.menu_item_id === item.$id);
            if (existing) {
                return prev.map(i =>
                    i.menu_item_id === item.$id
                        ? { ...i, quantity: i.quantity + 1 }
                        : i
                );
            }
            return [...prev, {
                id: Date.now().toString(),
                menu_item_id: item.$id,
                name: item.name,
                price: item.price,
                quantity: 1,
            }];
        });
    };

    const updateQuantity = (itemId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === itemId) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : item;
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => prev.filter(item => item.id !== itemId));
    };

    const clearCart = () => {
        setCart([]);
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Process payment and send to kitchen
    const handleCheckout = async () => {
        if (cart.length === 0) return;

        setProcessing(true);
        setError(null);

        try {
            const token = getToken();
            if (!token) {
                window.location.href = '/login';
                return;
            }

            // Create order and mark as paid in one step
            const response = await fetch(`${API_BASE_URL}/orders/cafeteria`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: cart.map(item => ({
                        menu_item_id: item.menu_item_id,
                        quantity: item.quantity,
                        notes: item.notes,
                    })),
                    payment_method: selectedPaymentMethod,
                    total: cartTotal,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Error al procesar el pedido');
            }

            // Success!
            setSuccessMessage(`¡Pedido de ${formatPrice(cartTotal)} enviado a cocina!`);
            clearCart();
            setShowCart(false);

            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMessage(null), 3000);

        } catch (err: any) {
            setError(err.message || 'Error al procesar el pedido');
        } finally {
            setProcessing(false);
        }
    };

    // Filter items by search
    const filteredItems = searchQuery
        ? menuItems.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : menuItems;

    if (loadingMenu) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                    <p className="text-slate-400 font-medium">Cargando menú...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
            {/* Header */}
            <header className="bg-slate-900/80 border-b border-slate-700/50 backdrop-blur-xl sticky top-0 z-20">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/dashboard"
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                                    <Wallet className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold text-white flex items-center gap-2">
                                        Caja Cafetería
                                        <Sparkles className="w-4 h-4 text-yellow-400" />
                                    </h1>
                                </div>
                            </div>
                        </div>

                        {/* Cart Button */}
                        <button
                            onClick={() => setShowCart(true)}
                            className="relative p-3 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl shadow-lg"
                        >
                            <ShoppingCart className="w-6 h-6" />
                            {cartItemCount > 0 && (
                                <span className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 text-slate-900 rounded-full text-sm font-bold flex items-center justify-center">
                                    {cartItemCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* Success Banner */}
            {successMessage && (
                <div className="px-4 pt-4">
                    <div className="p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-xl flex items-center gap-3">
                        <Check className="w-5 h-5 text-emerald-400" />
                        <span className="text-emerald-300 font-medium">{successMessage}</span>
                    </div>
                </div>
            )}

            {/* Error Banner */}
            {error && (
                <div className="px-4 pt-4">
                    <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                            <span className="text-red-300">{error}</span>
                        </div>
                        <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* No Products Warning */}
            {categories.length === 0 && !loadingMenu && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-24 h-24 bg-slate-800 rounded-3xl flex items-center justify-center mb-6">
                        <Receipt className="w-12 h-12 text-slate-600" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">No hay productos configurados</h2>
                    <p className="text-slate-400 mb-6 max-w-md">
                        Primero debes agregar categorías y productos desde el administrador del menú.
                    </p>
                    <Link
                        href="/menu"
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors"
                    >
                        Ir a Configurar Menú
                    </Link>
                </div>
            )}

            {/* Main Content */}
            {categories.length > 0 && (
                <>
                    {/* Search Bar */}
                    <div className="px-4 py-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Buscar producto..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="px-4 pb-3">
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {categories.map(cat => (
                                <button
                                    key={cat.$id}
                                    onClick={() => {
                                        setSelectedCategory(cat.$id);
                                        setSearchQuery("");
                                    }}
                                    className={cn(
                                        "px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all",
                                        selectedCategory === cat.$id
                                            ? "bg-emerald-600 text-white"
                                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                    )}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Products Grid */}
                    <div className="flex-1 px-4 pb-4 overflow-y-auto">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {filteredItems.map(item => (
                                <button
                                    key={item.$id}
                                    onClick={() => addToCart(item)}
                                    disabled={!item.available}
                                    className={cn(
                                        "p-4 rounded-2xl border text-left transition-all active:scale-95",
                                        item.available
                                            ? "bg-slate-800/50 border-slate-700 hover:border-emerald-500/50"
                                            : "bg-slate-800/30 border-slate-700/50 opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    {item.image_url && (
                                        <div className="w-full aspect-square rounded-xl bg-slate-700 mb-3 overflow-hidden">
                                            <img
                                                src={item.image_url}
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                    <h3 className="font-medium text-white text-sm line-clamp-2 mb-1">
                                        {item.name}
                                    </h3>
                                    <p className="text-emerald-400 font-bold">
                                        {formatPrice(item.price)}
                                    </p>
                                    {!item.available && (
                                        <span className="text-xs text-red-400">No disponible</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {filteredItems.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                                <Search className="w-12 h-12 mb-4 text-slate-600" />
                                <p>No se encontraron productos</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Cart Sidebar */}
            {showCart && (
                <div className="fixed inset-0 z-30">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowCart(false)}
                    />

                    {/* Cart Panel */}
                    <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-slate-900 border-l border-slate-700 flex flex-col">
                        {/* Cart Header */}
                        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <ShoppingCart className="w-6 h-6 text-emerald-400" />
                                Carrito
                            </h2>
                            <button
                                onClick={() => setShowCart(false)}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {cart.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                    <ShoppingCart className="w-16 h-16 mb-4 text-slate-600" />
                                    <p>El carrito está vacío</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {cart.map(item => (
                                        <div
                                            key={item.id}
                                            className="bg-slate-800/50 rounded-xl p-3 border border-slate-700"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-white">{item.name}</h4>
                                                    <p className="text-sm text-emerald-400">{formatPrice(item.price)}</p>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="p-1 text-red-400 hover:text-red-300"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-3 mt-2">
                                                <button
                                                    onClick={() => updateQuantity(item.id, -1)}
                                                    className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center text-white"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <span className="font-bold text-white w-8 text-center">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, 1)}
                                                    className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center text-white"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                                <span className="ml-auto font-bold text-white">
                                                    {formatPrice(item.price * item.quantity)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Payment Section */}
                        {cart.length > 0 && (
                            <div className="p-4 border-t border-slate-700 space-y-4">
                                {/* Payment Method */}
                                <div>
                                    <p className="text-sm text-slate-400 mb-2">Método de Pago</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            onClick={() => setSelectedPaymentMethod("cash")}
                                            className={cn(
                                                "py-2 px-3 rounded-xl font-medium text-sm flex items-center justify-center gap-1",
                                                selectedPaymentMethod === "cash"
                                                    ? "bg-emerald-600 text-white"
                                                    : "bg-slate-700 text-slate-300"
                                            )}
                                        >
                                            <Banknote className="w-4 h-4" />
                                            Efectivo
                                        </button>
                                        <button
                                            onClick={() => setSelectedPaymentMethod("card")}
                                            className={cn(
                                                "py-2 px-3 rounded-xl font-medium text-sm flex items-center justify-center gap-1",
                                                selectedPaymentMethod === "card"
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-slate-700 text-slate-300"
                                            )}
                                        >
                                            <CreditCard className="w-4 h-4" />
                                            Tarjeta
                                        </button>
                                        <button
                                            onClick={() => setSelectedPaymentMethod("transfer")}
                                            className={cn(
                                                "py-2 px-3 rounded-xl font-medium text-sm flex items-center justify-center gap-1",
                                                selectedPaymentMethod === "transfer"
                                                    ? "bg-violet-600 text-white"
                                                    : "bg-slate-700 text-slate-300"
                                            )}
                                        >
                                            <Phone className="w-4 h-4" />
                                            Trans.
                                        </button>
                                    </div>
                                </div>

                                {/* Total */}
                                <div className="flex items-center justify-between py-3 border-t border-slate-700">
                                    <span className="text-lg text-slate-400">Total</span>
                                    <span className="text-2xl font-bold text-white">{formatPrice(cartTotal)}</span>
                                </div>

                                {/* Actions */}
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={clearCart}
                                        className="py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
                                    >
                                        Limpiar
                                    </button>
                                    <button
                                        onClick={handleCheckout}
                                        disabled={processing}
                                        className={cn(
                                            "py-3 font-bold text-white rounded-xl transition-all flex items-center justify-center gap-2",
                                            "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500",
                                            "disabled:opacity-50 disabled:cursor-not-allowed"
                                        )}
                                    >
                                        {processing ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Procesando...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-5 h-5" />
                                                Cobrar
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
