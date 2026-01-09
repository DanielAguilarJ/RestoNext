import Link from "next/link";
import {
    UtensilsCrossed, ChefHat, Receipt, QrCode,
    Sparkles, TrendingUp, Clock, Users
} from "lucide-react";

export default function Home() {
    return (
        <main className="min-h-screen bg-mesh relative overflow-hidden">
            {/* Animated Background Orbs */}
            <div className="orb orb-brand w-96 h-96 -top-48 -left-48 animate-float" />
            <div className="orb orb-blue w-72 h-72 top-1/4 -right-36 animate-float-delayed" />
            <div className="orb orb-purple w-64 h-64 bottom-1/4 -left-32 animate-float" style={{ animationDelay: '2s' }} />
            <div className="orb orb-brand w-48 h-48 -bottom-24 right-1/4 animate-float-delayed" style={{ animationDelay: '3s' }} />

            {/* Header */}
            <header className="relative z-10 p-6">
                <div className="glass rounded-2xl p-4 shadow-xl max-w-2xl mx-auto">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30 animate-pulse-glow">
                                <UtensilsCrossed className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    RestoNext MX
                                    <Sparkles className="w-5 h-5 text-brand-500" />
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Sistema de Gestión para Restaurantes
                                </p>
                            </div>
                        </div>

                        {/* Live Status */}
                        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-full border border-green-500/30">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                Sistema activo
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Welcome Message */}
            <div className="relative z-10 text-center px-6 py-8">
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3 animate-slide-up">
                    ¡Bienvenido! 👋
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-lg max-w-md mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    Selecciona un módulo para comenzar
                </p>
            </div>

            {/* Quick Stats */}
            <div className="relative z-10 px-6 pb-4 max-w-2xl mx-auto">
                <div className="grid grid-cols-3 gap-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <div className="glass-subtle rounded-xl p-3 text-center">
                        <TrendingUp className="w-5 h-5 text-brand-600 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Ventas hoy</p>
                        <p className="font-bold text-gray-900 dark:text-white">$12,450</p>
                    </div>
                    <div className="glass-subtle rounded-xl p-3 text-center">
                        <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Pedidos</p>
                        <p className="font-bold text-gray-900 dark:text-white">48</p>
                    </div>
                    <div className="glass-subtle rounded-xl p-3 text-center">
                        <Users className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Mesas activas</p>
                        <p className="font-bold text-gray-900 dark:text-white">6/12</p>
                    </div>
                </div>
            </div>

            {/* Navigation Grid */}
            <div className="relative z-10 p-6 grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                {/* Waiter POS */}
                <Link
                    href="/pos"
                    className="group card-interactive p-6 animate-scale-in"
                    style={{ animationDelay: '0.1s' }}
                >
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mb-4
                          shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-300
                          group-hover:scale-110 group-hover:-rotate-3">
                        <UtensilsCrossed className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors">
                        POS Mesero
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Tomar pedidos y gestionar mesas
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Abrir</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                </Link>

                {/* Kitchen Display */}
                <Link
                    href="/kitchen"
                    className="group card-interactive p-6 animate-scale-in"
                    style={{ animationDelay: '0.2s' }}
                >
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mb-4
                          shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-all duration-300
                          group-hover:scale-110 group-hover:rotate-3">
                        <ChefHat className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-orange-600 transition-colors">
                        Cocina (KDS)
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Pantalla de pedidos en tiempo real
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-orange-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Abrir</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                </Link>

                {/* Cashier / Split Check */}
                <Link
                    href="/cashier"
                    className="group card-interactive p-6 animate-scale-in"
                    style={{ animationDelay: '0.3s' }}
                >
                    <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mb-4
                          shadow-lg shadow-green-500/30 group-hover:shadow-green-500/50 transition-all duration-300
                          group-hover:scale-110 group-hover:-rotate-3">
                        <Receipt className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-green-600 transition-colors">
                        Caja
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Cobros y división de cuentas
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-green-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Abrir</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                </Link>

                {/* Customer QR Menu */}
                <Link
                    href="/menu"
                    className="group card-interactive p-6 animate-scale-in"
                    style={{ animationDelay: '0.4s' }}
                >
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mb-4
                          shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-all duration-300
                          group-hover:scale-110 group-hover:rotate-3">
                        <QrCode className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-purple-600 transition-colors">
                        Menú Digital
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Menú QR para clientes
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-purple-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Abrir</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                </Link>
            </div>

            {/* Footer */}
            <footer className="relative z-10 py-8 text-center">
                <div className="glass-subtle inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm text-gray-600 dark:text-gray-400">
                    <span>RestoNext MX v1.0</span>
                    <span>•</span>
                    <span>Hecho para México 🇲🇽</span>
                </div>
            </footer>
        </main>
    );
}
