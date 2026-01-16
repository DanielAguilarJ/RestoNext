import Link from "next/link";
import {
    UtensilsCrossed, ChefHat, Receipt, QrCode,
    Sparkles, Package
} from "lucide-react";
import { OperationsPulse } from "@/components/dashboard/OperationsPulse";
import { AiProcurementWidget } from "@/components/dashboard/AiProcurementWidget";
import { CateringOverview } from "@/components/dashboard/CateringOverview";
import { LoyaltyHighlights } from "@/components/dashboard/LoyaltyHighlights";

export default function Home() {
    return (
        <main className="min-h-screen bg-gray-50/50 dark:bg-zinc-950/50 relative overflow-hidden font-sans">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-brand-500/5 to-transparent -z-10" />
            <div className="hidden lg:block absolute right-0 top-0 w-1/3 h-[600px] bg-gradient-radial from-blue-500/10 to-transparent blur-3xl -z-10" />

            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-zinc-900/70 border-b border-gray-200/50 dark:border-zinc-800/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-800 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                                <UtensilsCrossed className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    RestoNext <span className="text-brand-600">AI</span>
                                    <Sparkles className="w-4 h-4 text-amber-400" />
                                </h1>
                            </div>
                        </div>

                        {/* Live Status */}
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                                    Sistema Operativo
                                </span>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-zinc-800 border-2 border-white dark:border-zinc-700 shadow-sm" />
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Section */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Buenos días, Operaciones ☀️
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                        Aquí tienes el pulso de tu restaurante en tiempo real.
                    </p>
                </div>

                {/* Operations Pulse (Top Row) */}
                <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <OperationsPulse />
                </div>

                {/* Main Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    {/* Left Column (Main Stats) */}
                    <div className="lg:col-span-2 space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <AiProcurementWidget />
                            <CateringOverview />
                        </div>

                        {/* Modules (moved here for better flow) */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Módulos Operativos</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {/* Waiter POS */}
                                <Link href="/pos" className="group relative overflow-hidden rounded-xl border bg-white dark:bg-zinc-900 p-4 hover:border-brand-500 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/10">
                                    <div className="absolute inset-0 bg-gradient-to-br from-brand-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative z-10">
                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-3 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                                            <UtensilsCrossed className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white">POS Mesero</h4>
                                        <p className="text-xs text-gray-500 mt-1">Órdenes y Mesas</p>
                                    </div>
                                </Link>

                                {/* Kitchen */}
                                <Link href="/kitchen" className="group relative overflow-hidden rounded-xl border bg-white dark:bg-zinc-900 p-4 hover:border-orange-500 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
                                    <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative z-10">
                                        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-3 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
                                            <ChefHat className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white">Cocina (KDS)</h4>
                                        <p className="text-xs text-gray-500 mt-1">Pantalla Cocina</p>
                                    </div>
                                </Link>

                                {/* Cashier */}
                                <Link href="/cashier" className="group relative overflow-hidden rounded-xl border bg-white dark:bg-zinc-900 p-4 hover:border-green-500 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10">
                                    <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative z-10">
                                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-3 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
                                            <Receipt className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white">Caja & Cobro</h4>
                                        <p className="text-xs text-gray-500 mt-1">Cerrar Cuentas</p>
                                    </div>
                                </Link>

                                {/* Inventory */}
                                <Link href="/inventory" className="group relative overflow-hidden rounded-xl border bg-white dark:bg-zinc-900 p-4 hover:border-teal-500 transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/10">
                                    <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative z-10">
                                        <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center mb-3 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform">
                                            <Package className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white">Inventario</h4>
                                        <p className="text-xs text-gray-500 mt-1">Stock y Mermas</p>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Right Column (Side Widgets) */}
                    <div className="lg:col-span-1 space-y-6 animate-in fade-in slide-in-from-right-8 duration-700 delay-200">
                        <LoyaltyHighlights />

                        {/* Quick Action: Menu QR */}
                        <div className="p-4 rounded-xl border border-dashed border-purple-200 bg-purple-50/50 dark:bg-purple-900/10 dark:border-purple-800 text-center">
                            <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-200 mb-2">Menú Digital</h4>
                            <div className="bg-white p-2 w-24 h-24 mx-auto rounded-lg shadow-sm mb-3">
                                <QrCode className="w-full h-full text-gray-800" />
                            </div>
                            <Link href="/menu" className="text-xs font-medium text-purple-600 hover:underline">
                                Ver Menú Público →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t bg-white dark:bg-zinc-950 py-8 text-center text-sm text-gray-500">
                <p>RestoNext AI Enterprise © 2024 • Hecho con 🌮 en México</p>
            </footer>
        </main>
    );
}
