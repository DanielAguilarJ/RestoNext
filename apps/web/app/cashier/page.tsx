"use client";

/**
 * Cashier Page
 * Premium split check functionality for handling payments
 */

import { SplitCheck } from "@/components/cashier/SplitCheck";
import { ArrowLeft, Receipt, Sparkles } from "lucide-react";
import Link from "next/link";

// Sample order data
const SAMPLE_ORDER_ITEMS = [
    { id: "1", name: "Tacos al Pastor (3)", price: 45, quantity: 3 },
    { id: "2", name: "Carne Asada", price: 189, quantity: 1 },
    { id: "3", name: "Cerveza", price: 45, quantity: 2 },
    { id: "4", name: "Agua de Horchata", price: 35, quantity: 1 },
    { id: "5", name: "Flan", price: 55, quantity: 2 },
];

export default function CashierPage() {
    const handleComplete = () => {
        alert("Mesa cerrada exitosamente");
    };

    return (
        <div className="min-h-screen bg-mesh relative overflow-hidden">
            {/* Background Orbs */}
            <div className="orb orb-green w-64 h-64 -top-32 -right-32 animate-float opacity-20" style={{ background: 'rgb(34, 197, 94)' }} />
            <div className="orb orb-blue w-48 h-48 bottom-1/4 -left-24 animate-float-delayed opacity-20" />

            {/* Header */}
            <header className="glass shadow-lg p-4 flex items-center gap-4 sticky top-0 z-20">
                <Link
                    href="/"
                    className="p-3 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-300 hover:scale-105"
                >
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                        <Receipt className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            Caja - Mesa 5
                            <Sparkles className="w-5 h-5 text-green-500" />
                        </h1>
                        <p className="text-sm text-gray-500">División de cuenta</p>
                    </div>
                </div>
            </header>

            {/* Split Check Component */}
            <SplitCheck
                orderId="order-123"
                orderItems={SAMPLE_ORDER_ITEMS}
                onComplete={handleComplete}
            />
        </div>
    );
}
