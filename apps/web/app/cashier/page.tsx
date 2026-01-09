"use client";

/**
 * Cashier Page
 * Displays split check functionality for handling payments
 */

import { SplitCheck } from "@/components/cashier/SplitCheck";
import { ArrowLeft } from "lucide-react";
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 shadow-sm p-4 flex items-center gap-4">
                <Link
                    href="/"
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold">Caja - Mesa 5</h1>
                    <p className="text-sm text-gray-500">División de cuenta</p>
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
