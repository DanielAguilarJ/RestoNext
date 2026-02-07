"use client";

import { useEffect, useState } from "react";
import { SplitCheck } from "@/components/cashier/SplitCheck";
import { ArrowLeft, Receipt, Sparkles } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ordersApi, cashierApi } from "@/lib/api";

export default function SplitCheckPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.id as string;
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const data = await ordersApi.get(orderId);
                setOrder(data);
            } catch (error) {
                console.error("Error fetching order:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [orderId]);

    const handleComplete = () => {
        router.push("/cashier");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-mesh flex items-center justify-center">
                <div className="animate-pulse text-emerald-500 font-bold">Cargando Orden...</div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-mesh flex items-center justify-center">
                <div className="glass p-8 rounded-3xl text-center">
                    <h1 className="text-xl font-bold mb-4">Orden no encontrada</h1>
                    <Link href="/cashier" className="btn-primary">Volver a Caja</Link>
                </div>
            </div>
        );
    }

    // Map backend items to SplitCheck format
    const orderItems = order.items.map((item: any) => ({
        id: item.id || item.menu_item_id,
        name: item.menu_item_name || "Producto",
        price: item.unit_price,
        quantity: item.quantity
    }));

    const handlePay = async (amount: number, method: "cash" | "card") => {
        // Record payment for the order
        await ordersApi.pay(orderId, {
            amount,
            payment_method: method,
        });

        // Also record to the active cashier shift (if any)
        try {
            await cashierApi.recordSale({
                order_id: orderId,
                amount,
                tip_amount: 0, // Tips are handled at full payment, not split
                payment_method: method,
            });
        } catch (err) {
            // Ignore if no shift is open - flexible mode
            console.log("[SplitCheck] No active shift to record sale");
        }
    };

    return (
        <div className="min-h-screen bg-mesh relative overflow-hidden">
            {/* Header */}
            <header className="glass shadow-lg p-4 flex items-center gap-4 sticky top-0 z-20">
                <Link
                    href="/cashier"
                    className="p-3 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-xl transition-all"
                >
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                        <Receipt className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            Mesa {order.table_number || "N/A"}
                            <Sparkles className="w-5 h-5 text-green-500" />
                        </h1>
                        <p className="text-sm text-gray-500">Cerrar Cuenta</p>
                    </div>
                </div>
            </header>

            {/* Split Check Component */}
            <SplitCheck
                orderId={orderId}
                orderItems={orderItems}
                onComplete={handleComplete}
                onPay={handlePay}
            />
        </div>
    );
}
