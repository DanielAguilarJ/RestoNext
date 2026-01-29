"use client";

/**
 * Customer QR Menu Page - Premium Version
 * Client-side rendered with real API data and beautiful UI
 * NO DEMO DATA - Shows empty state for new users to configure
 */

import { useEffect, useState } from "react";
import { UtensilsCrossed, Phone, Loader2, ArrowUp, ArrowLeft, Star, Flame, Sparkles, Clock, Settings, ChefHat } from "lucide-react";
import Link from "next/link";
import { menuApi } from "@/lib/api";

// Default tenant for demo
const DEFAULT_TENANT_ID = "default-tenant";

function formatPrice(price: number): string {
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
    }).format(price);
}

interface MenuItemData {
    id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    popular?: boolean;
}

interface MenuData {
    restaurant: { name: string; description: string };
    categories: Array<{
        id: string;
        name: string;
        items: MenuItemData[];
    }>;
}

export default function MenuPage() {
    const [menuData, setMenuData] = useState<MenuData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasNoMenu, setHasNoMenu] = useState(false);
    const [tableNumber] = useState(5);
    const [waiterCalled, setWaiterCalled] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    // Load menu from API
    useEffect(() => {
        async function loadMenu() {
            try {
                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error("API timeout")), 5000)
                );

                const categories = await Promise.race([
                    menuApi.getCategories(DEFAULT_TENANT_ID),
                    timeoutPromise
                ]);

                if (categories.length > 0) {
                    const categoriesWithItems = await Promise.all(
                        categories.map(async (cat) => {
                            const items = await menuApi.getItems(cat.$id);
                            return {
                                id: cat.$id,
                                name: cat.name,
                                items: items.map(item => ({
                                    id: item.$id,
                                    name: item.name,
                                    description: item.description,
                                    price: item.price,
                                    image_url: item.image_url,
                                })),
                            };
                        })
                    );

                    setMenuData({
                        restaurant: {
                            name: "Mi Restaurante",
                            description: "Bienvenido a nuestro menú digital",
                        },
                        categories: categoriesWithItems,
                    });
                } else {
                    // No categories = empty menu, show setup screen
                    setHasNoMenu(true);
                }
            } catch (error) {
                console.error("Failed to load menu:", error);
                // On error, show setup screen instead of demo data
                setHasNoMenu(true);
            } finally {
                setIsLoading(false);
            }
        }

        loadMenu();
    }, []);

    // Handle scroll
    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 400);

            const sections = document.querySelectorAll('section[id]');
            sections.forEach((section) => {
                const rect = section.getBoundingClientRect();
                if (rect.top <= 120 && rect.bottom >= 120) {
                    setActiveCategory(section.id);
                }
            });
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleCallWaiter = () => {
        setWaiterCalled(true);
        setTimeout(() => setWaiterCalled(false), 5000);
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-mesh flex items-center justify-center">
                <div className="text-center animate-scale-in">
                    <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-brand-700 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand-500/30 animate-pulse-glow">
                        <UtensilsCrossed className="w-10 h-10 text-white" />
                    </div>
                    <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Cargando menú...</p>
                </div>
            </div>
        );
    }

    // Empty state - No menu configured
    if (hasNoMenu || !menuData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                    {/* Icon */}
                    <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/30">
                        <ChefHat className="w-12 h-12 text-white" />
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl font-bold text-white mb-4">
                        Menú No Configurado
                    </h1>

                    {/* Description */}
                    <p className="text-slate-400 mb-8 leading-relaxed">
                        Este restaurante aún no ha configurado su menú digital.
                        Si eres el administrador, configura tus categorías y productos para que tus clientes puedan ver el menú.
                    </p>

                    {/* CTA Button */}
                    <Link
                        href="/admin/menu"
                        className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-xl shadow-emerald-500/30 transition-all duration-300 hover:scale-105"
                    >
                        <Settings className="w-5 h-5" />
                        Configurar Menú
                    </Link>

                    {/* Secondary link */}
                    <div className="mt-6">
                        <Link
                            href="/"
                            className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
                        >
                            ← Volver al inicio
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Menu exists - show it
    return (
        <div className="min-h-screen bg-gradient-to-b from-brand-600 via-brand-50 to-white dark:from-brand-900 dark:via-gray-900 dark:to-gray-800">
            {/* Hero Header */}
            <header className="relative bg-gradient-to-br from-brand-600 via-brand-600 to-brand-700 text-white pt-16 pb-28 px-6 overflow-hidden">
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-float" />
                    <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/10 rounded-full blur-2xl animate-float-delayed" />
                    <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-white/5 rounded-full blur-xl animate-pulse" />
                </div>

                {/* Back Button */}
                <Link
                    href="/"
                    className="absolute top-4 left-4 p-3 bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl transition-all duration-300 text-white hover:scale-105 z-10"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>

                {/* Table Badge */}
                <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 z-10">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Mesa {tableNumber}
                </div>

                {/* Restaurant Info */}
                <div className="relative z-10 text-center animate-slide-up">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl mb-6 shadow-xl">
                        <UtensilsCrossed className="w-10 h-10" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">{menuData.restaurant.name}</h1>
                    <p className="text-white/80 flex items-center justify-center gap-2">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        {menuData.restaurant.description}
                    </p>

                    {/* Open Hours Badge */}
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 backdrop-blur rounded-full text-sm">
                        <Clock className="w-4 h-4" />
                        Abierto ahora
                    </div>
                </div>

                {/* Curved bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-b from-brand-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-t-[50px]" />
            </header>

            {/* Category Quick Links */}
            <nav className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-gray-100 dark:border-gray-800 px-4 py-3 -mt-4">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {menuData.categories.map((category) => (
                        <a
                            key={category.id}
                            href={`#${category.id}`}
                            className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-300 ${activeCategory === category.id
                                ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/30"
                                : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                                }`}
                        >
                            {category.name}
                        </a>
                    ))}
                </div>
            </nav>

            {/* Menu Content */}
            <main className="px-4 pb-32 pt-6">
                {menuData.categories.map((category, catIndex) => (
                    <section
                        key={category.id}
                        id={category.id}
                        className="mb-10 scroll-mt-20 animate-slide-up"
                        style={{ animationDelay: `${catIndex * 0.1}s` }}
                    >
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2 sticky top-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur py-2 z-10 rounded-lg">
                            {category.name}
                        </h2>

                        <div className="space-y-3">
                            {category.items.map((item, itemIndex) => (
                                <div
                                    key={item.id}
                                    className="card-premium p-5 animate-scale-in group"
                                    style={{ animationDelay: `${itemIndex * 0.05}s` }}
                                >
                                    <div className="flex gap-4">
                                        {/* Image */}
                                        <div className="w-24 h-24 bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/50 dark:to-brand-800/50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300 overflow-hidden">
                                            {item.image_url ? (
                                                <img
                                                    src={item.image_url}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-4xl">🍽️</span>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                                        {item.name}
                                                        {item.popular && (
                                                            <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-bold rounded-full flex items-center gap-1">
                                                                <Flame className="w-3 h-3" />
                                                                Popular
                                                            </span>
                                                        )}
                                                    </h3>
                                                    {item.description && (
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between">
                                                <span className="text-xl font-bold text-brand-600">
                                                    {formatPrice(item.price)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </main>

            {/* Back to top button */}
            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-28 right-4 w-14 h-14 glass shadow-xl rounded-2xl
                             flex items-center justify-center text-gray-600 dark:text-gray-300
                             hover:bg-white dark:hover:bg-gray-700 transition-all z-40
                             animate-scale-in hover:scale-110"
                >
                    <ArrowUp className="w-6 h-6" />
                </button>
            )}

            {/* Fixed Call Waiter Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent dark:from-gray-900 dark:via-gray-900 z-20">
                <button
                    onClick={handleCallWaiter}
                    disabled={waiterCalled}
                    className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3
                               shadow-2xl active:scale-[0.98] transition-all duration-300 ${waiterCalled
                            ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green-500/30"
                            : "bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white shadow-brand-500/30"
                        }`}
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

                    {/* Pulse ring when not called */}
                    {!waiterCalled && (
                        <span className="absolute inset-0 rounded-2xl border-2 border-brand-400 animate-ripple" />
                    )}
                </button>
            </div>

            {/* Waiter Called Toast */}
            {waiterCalled && (
                <div className="fixed top-4 left-4 right-4 glass bg-green-500/90 text-white px-5 py-4 rounded-2xl shadow-2xl z-50 
                               animate-slide-down flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">✓</span>
                    </div>
                    <div>
                        <p className="font-bold text-lg">¡Mesero llamado!</p>
                        <p className="text-sm text-white/80">Un mesero vendrá a la Mesa {tableNumber} en breve.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
