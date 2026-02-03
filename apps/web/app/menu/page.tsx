"use client";

/**
 * Customer QR Menu Page - Premium Version
 * Client-side rendered with real API data and beautiful UI
 * Truly dynamic: Loads from backend, shows empty state if no menu configured
 */

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    UtensilsCrossed,
    Phone,
    Loader2,
    ArrowUp,
    ArrowLeft,
    Star,
    Flame,
    Sparkles,
    Clock,
    ChefHat,
    Settings,
    ShoppingBag,
    Plus,
    Minus,
    X,
    ChevronDown,
    MapPin,
    Wifi,
    WifiOff,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import { menuApi } from "@/lib/api";

// ============================================
// Types
// ============================================

interface MenuItemData {
    id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    popular?: boolean;
}

interface MenuCategoryData {
    id: string;
    name: string;
    items: MenuItemData[];
}

interface CartItem extends MenuItemData {
    quantity: number;
}

// ============================================
// Helpers
// ============================================

function formatPrice(price: number): string {
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
    }).format(price);
}

// Category emoji based on name
function getCategoryEmoji(name: string): string {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("taco") || lowerName.includes("entra")) return "🌮";
    if (lowerName.includes("plato") || lowerName.includes("fuerte") || lowerName.includes("principal")) return "🍽️";
    if (lowerName.includes("bebida") || lowerName.includes("drink")) return "🥤";
    if (lowerName.includes("postre") || lowerName.includes("dulce")) return "🍰";
    if (lowerName.includes("ensalada") || lowerName.includes("salad")) return "🥗";
    if (lowerName.includes("sopa") || lowerName.includes("caldo")) return "🍲";
    if (lowerName.includes("pizza")) return "🍕";
    if (lowerName.includes("hamburgue") || lowerName.includes("burger")) return "🍔";
    if (lowerName.includes("café") || lowerName.includes("coffee")) return "☕";
    if (lowerName.includes("cerveza") || lowerName.includes("beer")) return "🍺";
    if (lowerName.includes("vino") || lowerName.includes("wine")) return "🍷";
    if (lowerName.includes("coctel") || lowerName.includes("cocktail")) return "🍸";
    return "🍴";
}

// ============================================
// Component
// ============================================

export default function MenuPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const tableParam = searchParams.get("mesa") || searchParams.get("table");

    // Data state
    const [categories, setCategories] = useState<MenuCategoryData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasNoMenu, setHasNoMenu] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // UI state
    const [tableNumber] = useState(tableParam ? parseInt(tableParam) : 1);
    const [waiterCalled, setWaiterCalled] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);

    // ============================================
    // Load Menu Data
    // ============================================

    useEffect(() => {
        async function loadMenu() {
            try {
                setIsLoading(true);
                setError(null);

                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error("timeout")), 8000)
                );

                const cats = await Promise.race([
                    menuApi.getCategories(),
                    timeoutPromise,
                ]);

                if (!cats || cats.length === 0) {
                    setHasNoMenu(true);
                    return;
                }

                // Load items for each category
                const categoriesWithItems = await Promise.all(
                    cats.map(async (cat) => {
                        const catId = cat.$id || cat.id;
                        try {
                            const items = await menuApi.getItems(catId);
                            return {
                                id: catId,
                                name: cat.name,
                                items: items.map((item) => ({
                                    id: item.$id || item.id,
                                    name: item.name,
                                    description: item.description,
                                    price: item.price,
                                    image_url: item.image_url,
                                })),
                            };
                        } catch {
                            return { id: catId, name: cat.name, items: [] };
                        }
                    })
                );

                // Filter out empty categories
                const nonEmptyCategories = categoriesWithItems.filter((c) => c.items.length > 0);

                if (nonEmptyCategories.length === 0) {
                    setHasNoMenu(true);
                    return;
                }

                setCategories(nonEmptyCategories);
                setActiveCategory(nonEmptyCategories[0].id);
            } catch (err) {
                console.error("Failed to load menu:", err);
                if (!navigator.onLine) {
                    setIsOffline(true);
                }
                setHasNoMenu(true);
            } finally {
                setIsLoading(false);
            }
        }

        loadMenu();
    }, []);

    // ============================================
    // Scroll Handler
    // ============================================

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 400);

            const sections = document.querySelectorAll("section[id]");
            sections.forEach((section) => {
                const rect = section.getBoundingClientRect();
                if (rect.top <= 140 && rect.bottom >= 140) {
                    setActiveCategory(section.id);
                }
            });
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // ============================================
    // Actions
    // ============================================

    const handleCallWaiter = () => {
        setWaiterCalled(true);
        setTimeout(() => setWaiterCalled(false), 5000);
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const scrollToCategory = (catId: string) => {
        const element = document.getElementById(catId);
        if (element) {
            const yOffset = -120;
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: "smooth" });
        }
    };

    const addToCart = (item: MenuItemData) => {
        setCart((prev) => {
            const existing = prev.find((i) => i.id === item.id);
            if (existing) {
                return prev.map((i) =>
                    i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                );
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    };

    const removeFromCart = (itemId: string) => {
        setCart((prev) => {
            const existing = prev.find((i) => i.id === itemId);
            if (existing && existing.quantity > 1) {
                return prev.map((i) =>
                    i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
                );
            }
            return prev.filter((i) => i.id !== itemId);
        });
    };

    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    // ============================================
    // Loading State
    // ============================================

    if (isLoading) {
        return (
            <LazyMotion features={domAnimation}>
                <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                    <m.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center"
                    >
                        <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/30">
                            <UtensilsCrossed className="w-12 h-12 text-white" />
                        </div>
                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
                        <p className="text-slate-400">Cargando menú...</p>
                    </m.div>
                </div>
            </LazyMotion>
        );
    }

    // ============================================
    // Empty / No Menu State
    // ============================================

    if (hasNoMenu) {
        return (
            <LazyMotion features={domAnimation}>
                <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
                    <m.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center max-w-md"
                    >
                        <div className="w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-amber-500/30">
                            {isOffline ? (
                                <WifiOff className="w-12 h-12 text-white" />
                            ) : (
                                <ChefHat className="w-12 h-12 text-white" />
                            )}
                        </div>

                        <h1 className="text-3xl font-bold text-white mb-4">
                            {isOffline ? "Sin Conexión" : "Menú No Disponible"}
                        </h1>

                        <p className="text-slate-400 mb-8 leading-relaxed">
                            {isOffline
                                ? "No hay conexión a internet. Por favor verifica tu conexión e intenta de nuevo."
                                : "Este restaurante aún no ha configurado su menú digital. Si eres el administrador, configura tus productos."}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            {isOffline ? (
                                <button
                                    onClick={() => window.location.reload()}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl transition-all"
                                >
                                    <Wifi className="w-5 h-5" />
                                    Reintentar
                                </button>
                            ) : (
                                <Link
                                    href="/admin/menu"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/30 transition-all"
                                >
                                    <Settings className="w-5 h-5" />
                                    Configurar Menú
                                </Link>
                            )}
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 px-6 py-3 border border-slate-600 text-slate-300 hover:bg-slate-700 rounded-xl transition-all"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                Volver
                            </Link>
                        </div>
                    </m.div>
                </div>
            </LazyMotion>
        );
    }

    // ============================================
    // Main Menu Render
    // ============================================

    return (
        <LazyMotion features={domAnimation}>
            <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
                {/* Hero Header */}
                <header className="relative bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white pt-16 pb-28 px-6 overflow-hidden">
                    {/* Animated Background */}
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
                        <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-white/10 rounded-full blur-2xl" />
                        <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-teal-400/20 rounded-full blur-xl animate-pulse" />
                    </div>

                    {/* Back Button */}
                    <button
                        onClick={() => router.back()}
                        className="absolute top-4 left-4 p-3 bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl transition-all text-white hover:scale-105 z-10"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    {/* Table Badge */}
                    <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 z-10">
                        <MapPin className="w-4 h-4" />
                        Mesa {tableNumber}
                    </div>

                    {/* Restaurant Info */}
                    <m.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative z-10 text-center"
                    >
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl mb-6 shadow-xl">
                            <UtensilsCrossed className="w-10 h-10" />
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Nuestro Menú</h1>
                        <p className="text-white/80 flex items-center justify-center gap-2">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            Bienvenido, elige tu platillo favorito
                        </p>

                        {/* Status Badge */}
                        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-400/20 backdrop-blur rounded-full text-sm">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            <Clock className="w-4 h-4" />
                            Abierto ahora
                        </div>
                    </m.div>

                    {/* Curved bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-slate-900 rounded-t-[3rem]" />
                </header>

                {/* Category Navigation - Sticky */}
                <nav className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 px-4 py-3 -mt-3">
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                        {categories.map((category) => {
                            const isActive = activeCategory === category.id;
                            const emoji = getCategoryEmoji(category.name);

                            return (
                                <button
                                    key={category.id}
                                    onClick={() => scrollToCategory(category.id)}
                                    className={`
                                    flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all
                                    ${isActive
                                            ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30"
                                            : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                                        }
                                `}
                                >
                                    <span>{emoji}</span>
                                    {category.name}
                                </button>
                            );
                        })}
                    </div>
                </nav>

                {/* Menu Content */}
                <main className="px-4 pb-36 pt-6">
                    {categories.map((category, catIndex) => (
                        <m.section
                            key={category.id}
                            id={category.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: catIndex * 0.1 }}
                            className="mb-10 scroll-mt-24"
                        >
                            <h2 className="text-2xl font-bold text-white mb-5 flex items-center gap-3 sticky top-16 bg-slate-900/90 backdrop-blur py-2 z-10">
                                <span className="text-2xl">{getCategoryEmoji(category.name)}</span>
                                {category.name}
                                <span className="text-sm font-normal text-slate-500">
                                    ({category.items.length})
                                </span>
                            </h2>

                            <div className="space-y-4">
                                {category.items.map((item, itemIndex) => (
                                    <m.div
                                        key={item.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: itemIndex * 0.05 }}
                                        className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-4 hover:border-emerald-500/30 transition-all group"
                                    >
                                        <div className="flex gap-4">
                                            {/* Image */}
                                            <div className="w-28 h-28 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex-shrink-0 overflow-hidden group-hover:ring-2 ring-emerald-500/30 transition-all relative">
                                                {item.image_url ? (
                                                    <Image
                                                        src={item.image_url}
                                                        alt={item.name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <span className="text-5xl opacity-50">
                                                            {getCategoryEmoji(category.name)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <h3 className="font-bold text-lg text-white flex items-center gap-2 flex-wrap">
                                                            {item.name}
                                                            {item.popular && (
                                                                <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-bold rounded-full flex items-center gap-1">
                                                                    <Flame className="w-3 h-3" />
                                                                    Popular
                                                                </span>
                                                            )}
                                                        </h3>
                                                        {item.description && (
                                                            <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                                                                {item.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-3 flex items-center justify-between">
                                                    <span className="text-xl font-bold text-emerald-400">
                                                        {formatPrice(item.price)}
                                                    </span>
                                                    <button
                                                        onClick={() => addToCart(item)}
                                                        className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all hover:scale-105 shadow-lg shadow-emerald-500/20"
                                                    >
                                                        <Plus className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </m.div>
                                ))}
                            </div>
                        </m.section>
                    ))}
                </main>

                {/* Back to top button */}
                <AnimatePresence>
                    {showScrollTop && (
                        <m.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={scrollToTop}
                            className="fixed bottom-36 right-4 w-12 h-12 bg-slate-700/90 backdrop-blur shadow-xl rounded-2xl flex items-center justify-center text-slate-300 hover:bg-slate-600 transition-all z-30"
                        >
                            <ArrowUp className="w-5 h-5" />
                        </m.button>
                    )}
                </AnimatePresence>

                {/* Cart FAB */}
                {cartItemCount > 0 && (
                    <m.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        onClick={() => setShowCart(true)}
                        className="fixed bottom-36 left-4 p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-2xl shadow-emerald-500/30 z-30 flex items-center gap-2"
                    >
                        <ShoppingBag className="w-6 h-6" />
                        <span className="font-bold">{cartItemCount}</span>
                    </m.button>
                )}

                {/* Fixed Call Waiter Button */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent z-20">
                    <button
                        onClick={handleCallWaiter}
                        disabled={waiterCalled}
                        className={`
                        w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3
                        shadow-2xl active:scale-[0.98] transition-all relative overflow-hidden
                        ${waiterCalled
                                ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green-500/30"
                                : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/30"
                            }
                    `}
                    >
                        <Phone className="w-6 h-6" />
                        {waiterCalled ? (
                            <span className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5" />
                                Mesero en camino...
                            </span>
                        ) : (
                            "Llamar Mesero"
                        )}
                    </button>
                </div>

                {/* Waiter Called Toast */}
                <AnimatePresence>
                    {waiterCalled && (
                        <m.div
                            initial={{ y: -100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -100, opacity: 0 }}
                            className="fixed top-4 left-4 right-4 bg-green-600/95 backdrop-blur text-white px-5 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-4"
                        >
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">✓</span>
                            </div>
                            <div>
                                <p className="font-bold text-lg">¡Mesero llamado!</p>
                                <p className="text-sm text-white/80">
                                    Un mesero vendrá a la Mesa {tableNumber} en breve.
                                </p>
                            </div>
                        </m.div>
                    )}
                </AnimatePresence>

                {/* Cart Modal */}
                <AnimatePresence>
                    {showCart && (
                        <m.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
                            onClick={() => setShowCart(false)}
                        >
                            <m.div
                                initial={{ y: 100, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 100, opacity: 0 }}
                                className="bg-slate-800 rounded-t-3xl sm:rounded-3xl border border-slate-700 w-full max-w-md max-h-[80vh] overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <ShoppingBag className="w-5 h-5 text-emerald-400" />
                                        Tu Orden
                                    </h3>
                                    <button
                                        onClick={() => setShowCart(false)}
                                        className="p-2 hover:bg-slate-700 rounded-xl text-slate-400"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Cart Items */}
                                <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                                    {cart.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-xl"
                                        >
                                            <div className="flex-1">
                                                <p className="font-medium text-white">{item.name}</p>
                                                <p className="text-sm text-emerald-400">
                                                    {formatPrice(item.price)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="p-1.5 bg-slate-600 hover:bg-red-500/50 rounded-lg text-white transition-all"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <span className="w-8 text-center font-bold text-white">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => addToCart(item)}
                                                    className="p-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition-all"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Total and Actions */}
                                <div className="p-4 border-t border-slate-700 space-y-4">
                                    <div className="flex items-center justify-between text-lg">
                                        <span className="text-slate-400">Total</span>
                                        <span className="font-bold text-white">
                                            {formatPrice(cartTotal)}
                                        </span>
                                    </div>
                                    <button className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg transition-all">
                                        Enviar al Mesero
                                    </button>
                                </div>
                            </m.div>
                        </m.div>
                    )}
                </AnimatePresence>
            </div>
        </LazyMotion>
    );
}
