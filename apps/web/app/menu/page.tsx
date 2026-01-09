"use client";

/**
 * Customer QR Menu Page - Premium Version
 * Client-side rendered with real API data and beautiful UI
 */

import { useEffect, useState } from "react";
import { UtensilsCrossed, Phone, Loader2, ArrowUp, ArrowLeft, Star, Flame, Sparkles, Clock } from "lucide-react";
import Link from "next/link";
import { menuApi, wsClient } from "@/lib/api";
import { MenuCategory, MenuItem } from "../../../../packages/shared/src/index";

// Default tenant for demo
const DEFAULT_TENANT_ID = "default-tenant";

// Fallback menu data for when API is not available
const FALLBACK_MENU = {
    restaurant: {
        name: "Taquería El Patrón",
        description: "Auténtica cocina mexicana desde 1985",
    },
    categories: [
        {
            id: "tacos",
            name: "🌮 Tacos",
            items: [
                { id: "1", name: "Tacos al Pastor", description: "Cerdo marinado con piña, cilantro y cebolla", price: 45, popular: true },
                { id: "2", name: "Tacos de Carnitas", description: "Cerdo confitado tradicional michoacano", price: 50 },
                { id: "3", name: "Tacos de Birria", description: "Res en consomé especiado estilo Jalisco", price: 55, popular: true },
            ],
        },
        {
            id: "platos",
            name: "🍽️ Platos Fuertes",
            items: [
                { id: "4", name: "Carne Asada", description: "Arrachera premium con guarnición", price: 189, popular: true },
                { id: "5", name: "Enchiladas Verdes", description: "Pollo, crema, queso y salsa verde", price: 125 },
                { id: "6", name: "Mole Poblano", description: "Pollo bañado en mole tradicional", price: 145 },
            ],
        },
        {
            id: "bebidas",
            name: "🍺 Bebidas",
            items: [
                { id: "7", name: "Cerveza", description: "Corona, Modelo, Pacífico", price: 45 },
                { id: "8", name: "Agua de Horchata", description: "Bebida de arroz tradicional", price: 35, popular: true },
                { id: "9", name: "Margarita", description: "Tequila, limón, sal", price: 95 },
            ],
        },
        {
            id: "postres",
            name: "🍮 Postres",
            items: [
                { id: "10", name: "Flan Napolitano", description: "Postre de huevo con caramelo", price: 55 },
                { id: "11", name: "Churros", description: "Con chocolate caliente", price: 45, popular: true },
            ],
        },
    ],
};

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
    const [tableNumber] = useState(5);
    const [waiterCalled, setWaiterCalled] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    // Load menu from API
    useEffect(() => {
        async function loadMenu() {
            try {
                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error("API timeout")), 3000)
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
                                })),
                            };
                        })
                    );

                    setMenuData({
                        restaurant: {
                            name: "Taquería El Patrón",
                            description: "Auténtica cocina mexicana desde 1985",
                        },
                        categories: categoriesWithItems,
                    });
                } else {
                    setMenuData(FALLBACK_MENU);
                }
            } catch (error) {
                console.error("Failed to load menu, using fallback:", error);
                setMenuData(FALLBACK_MENU);
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

            // Update active category based on scroll position
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

    if (!menuData) return null;

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
                        Abierto ahora • Cierra 11:00 PM
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
                                        {/* Image placeholder */}
                                        <div className="w-24 h-24 bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/50 dark:to-brand-800/50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                                            <span className="text-4xl">
                                                {category.name.includes("Tacos") ? "🌮" :
                                                    category.name.includes("Platos") ? "🍽️" :
                                                        category.name.includes("Bebidas") ? "🍺" : "🍮"}
                                            </span>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                                        {item.name}
                                                        {(item as any).popular && (
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
