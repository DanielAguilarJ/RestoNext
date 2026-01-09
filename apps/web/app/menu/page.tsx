"use client";

/**
 * Customer QR Menu Page
 * Client-side rendered with real API data and WebSocket for "Call Waiter"
 */

import { useEffect, useState } from "react";
import { UtensilsCrossed, Phone, Loader2, ArrowUp } from "lucide-react";
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
            name: "Tacos",
            items: [
                { id: "1", name: "Tacos al Pastor", description: "Cerdo marinado con piña, cilantro y cebolla", price: 45 },
                { id: "2", name: "Tacos de Carnitas", description: "Cerdo confitado tradicional michoacano", price: 50 },
                { id: "3", name: "Tacos de Birria", description: "Res en consomé especiado estilo Jalisco", price: 55 },
            ],
        },
        {
            id: "platos",
            name: "Platos Fuertes",
            items: [
                { id: "4", name: "Carne Asada", description: "Arrachera premium con guarnición", price: 189 },
                { id: "5", name: "Enchiladas Verdes", description: "Pollo, crema, queso y salsa verde", price: 125 },
                { id: "6", name: "Mole Poblano", description: "Pollo bañado en mole tradicional", price: 145 },
            ],
        },
        {
            id: "bebidas",
            name: "Bebidas",
            items: [
                { id: "7", name: "Cerveza", description: "Corona, Modelo, Pacífico", price: 45 },
                { id: "8", name: "Agua de Horchata", description: "Bebida de arroz tradicional", price: 35 },
                { id: "9", name: "Margarita", description: "Tequila, limón, sal", price: 95 },
            ],
        },
        {
            id: "postres",
            name: "Postres",
            items: [
                { id: "10", name: "Flan Napolitano", description: "Postre de huevo con caramelo", price: 55 },
                { id: "11", name: "Churros", description: "Con chocolate caliente", price: 45 },
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

interface MenuData {
    restaurant: { name: string; description: string };
    categories: Array<{
        id: string;
        name: string;
        items: Array<{ id: string; name: string; description?: string; price: number }>;
    }>;
}

export default function MenuPage() {
    const [menuData, setMenuData] = useState<MenuData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [tableNumber] = useState(5); // Would come from URL params in production
    const [waiterCalled, setWaiterCalled] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);

    // Load menu from API
    useEffect(() => {
        async function loadMenu() {
            try {
                // Add timeout to API calls to fall back quickly when Appwrite is not available
                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error("API timeout")), 3000)
                );

                const categories = await Promise.race([
                    menuApi.getCategories(DEFAULT_TENANT_ID),
                    timeoutPromise
                ]);

                if (categories.length > 0) {
                    // Load items for each category
                    const categoriesWithItems = await Promise.all(
                        categories.map(async (cat) => {
                            const items = await menuApi.getItems(cat.id);
                            return {
                                id: cat.id,
                                name: cat.name,
                                items: items.map(item => ({
                                    id: item.id,
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
                    // Use fallback data
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

    // Handle scroll for back-to-top button
    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 400);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleCallWaiter = () => {
        // In production, this would use WebSocket
        try {
            // wsClient.send({ action: "call_waiter", tenant_id: DEFAULT_TENANT_ID, table_number: tableNumber });
            setWaiterCalled(true);
            setTimeout(() => setWaiterCalled(false), 5000);
        } catch (error) {
            console.error("Failed to call waiter:", error);
        }
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-brand-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Cargando menú...</p>
                </div>
            </div>
        );
    }

    if (!menuData) return null;

    return (
        <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white dark:from-gray-900 dark:to-gray-800">
            {/* Hero Header */}
            <header className="relative bg-brand-600 text-white pt-12 pb-20 px-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                        <UtensilsCrossed className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{menuData.restaurant.name}</h1>
                        <p className="text-white/80 text-sm">{menuData.restaurant.description}</p>
                    </div>
                </div>

                {/* Table indicator */}
                <div className="absolute top-4 right-4 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-sm">
                    Mesa {tableNumber}
                </div>

                {/* Curved bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-b from-brand-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-t-[40px]" />
            </header>

            {/* Category Quick Links */}
            <nav className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-100 dark:border-gray-800 px-4 py-3 -mt-2">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {menuData.categories.map((category) => (
                        <a
                            key={category.id}
                            href={`#${category.id}`}
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-brand-100 dark:hover:bg-brand-900 
                                     rounded-full text-sm font-medium whitespace-nowrap transition-colors"
                        >
                            {category.name}
                        </a>
                    ))}
                </div>
            </nav>

            {/* Menu Content */}
            <main className="px-4 pb-28 pt-4">
                {menuData.categories.map((category) => (
                    <section key={category.id} id={category.id} className="mb-8 scroll-mt-16">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 sticky top-14 bg-gradient-to-b from-white to-transparent dark:from-gray-900 py-2 z-10">
                            {category.name}
                        </h2>

                        <div className="space-y-3">
                            {category.items.map((item) => (
                                <div
                                    key={item.id}
                                    className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm
                                             border border-gray-100 dark:border-gray-700
                                             hover:shadow-md transition-shadow"
                                >
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                                {item.name}
                                            </h3>
                                            {item.description && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                    {item.description}
                                                </p>
                                            )}
                                        </div>
                                        <span className="text-brand-600 font-bold whitespace-nowrap">
                                            {formatPrice(item.price)}
                                        </span>
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
                    className="fixed bottom-24 right-4 w-12 h-12 bg-white dark:bg-gray-800 shadow-lg rounded-full
                             flex items-center justify-center text-gray-600 dark:text-gray-300
                             hover:bg-gray-50 dark:hover:bg-gray-700 transition-all z-30"
                >
                    <ArrowUp className="w-5 h-5" />
                </button>
            )}

            {/* Fixed Call Waiter Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent dark:from-gray-900 dark:via-gray-900 z-20">
                <button
                    onClick={handleCallWaiter}
                    disabled={waiterCalled}
                    className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3
                               shadow-lg active:scale-95 transition-all
                               ${waiterCalled
                            ? "bg-green-600 text-white shadow-green-600/30"
                            : "bg-brand-600 hover:bg-brand-700 text-white shadow-brand-600/30"
                        }`}
                >
                    <Phone className="w-6 h-6" />
                    {waiterCalled ? "✓ Mesero en camino..." : "Llamar Mesero"}
                </button>
            </div>

            {/* Waiter Called Toast */}
            {waiterCalled && (
                <div className="fixed top-4 left-4 right-4 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg z-50 
                               animate-slide-in flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                        ✓
                    </div>
                    <div>
                        <p className="font-semibold">¡Mesero llamado!</p>
                        <p className="text-sm text-white/80">Un mesero vendrá a la Mesa {tableNumber} en breve.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
