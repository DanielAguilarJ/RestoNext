import Link from "next/link";
import { UtensilsCrossed, ChefHat, Receipt, QrCode } from "lucide-react";

export default function Home() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-brand-50 to-brand-100 dark:from-gray-900 dark:to-gray-800">
            {/* Header */}
            <header className="p-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center">
                        <UtensilsCrossed className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            RestoNext MX
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Sistema de Gestión para Restaurantes
                        </p>
                    </div>
                </div>
            </header>

            {/* Navigation Grid */}
            <div className="p-6 grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                {/* Waiter POS */}
                <Link
                    href="/pos"
                    className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg 
                     hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                    <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4
                          group-hover:bg-blue-500 transition-colors duration-300">
                        <UtensilsCrossed className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        POS Mesero
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Tomar pedidos y gestionar mesas
                    </p>
                </Link>

                {/* Kitchen Display */}
                <Link
                    href="/kitchen"
                    className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg 
                     hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                    <div className="w-14 h-14 bg-orange-500/10 rounded-xl flex items-center justify-center mb-4
                          group-hover:bg-orange-500 transition-colors duration-300">
                        <ChefHat className="w-7 h-7 text-orange-600 group-hover:text-white transition-colors" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        Cocina (KDS)
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Pantalla de pedidos en tiempo real
                    </p>
                </Link>

                {/* Cashier / Split Check */}
                <Link
                    href="/cashier"
                    className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg 
                     hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                    <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center mb-4
                          group-hover:bg-green-500 transition-colors duration-300">
                        <Receipt className="w-7 h-7 text-green-600 group-hover:text-white transition-colors" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        Caja
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Cobros y división de cuentas
                    </p>
                </Link>

                {/* Customer QR Menu */}
                <Link
                    href="/menu"
                    className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg 
                     hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                    <div className="w-14 h-14 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4
                          group-hover:bg-purple-500 transition-colors duration-300">
                        <QrCode className="w-7 h-7 text-purple-600 group-hover:text-white transition-colors" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        Menú Digital
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Menú QR para clientes
                    </p>
                </Link>
            </div>

            {/* Footer */}
            <footer className="fixed bottom-0 left-0 right-0 p-4 text-center text-sm text-gray-500">
                RestoNext MX v1.0 &bull; Hecho para México 🇲🇽
            </footer>
        </main>
    );
}
