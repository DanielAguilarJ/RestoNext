import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Gift, Cake } from "lucide-react";

export function LoyaltyHighlights() {
    return (
        <div className="space-y-4">
            {/* VIP Customers */}
            <Card className="shadow-md">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        Top Clientes (Mes)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[
                            { name: "Roberto Gómez", level: "Platino", visits: 12, spent: "$4,500" },
                            { name: "Ana Martínez", level: "Oro", visits: 8, spent: "$2,800" },
                            { name: "Carlos Ruiz", level: "Oro", visits: 7, spent: "$2,450" },
                        ].map((customer, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold">
                                        {customer.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium leading-none">{customer.name}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{customer.level} • {customer.visits} visitas</p>
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{customer.spent}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Birthdays */}
            <Card className="bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/20 shadow-none">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-white dark:bg-purple-900/30 rounded-full shadow-sm">
                            <Cake className="h-5 w-5 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-purple-900 dark:text-purple-200">Cumpleaños Hoy</p>
                            <p className="text-xs text-purple-700 dark:text-purple-300">3 clientes celebran hoy</p>
                        </div>
                    </div>
                    <div className="flex -space-x-2 overflow-hidden">
                        {[1, 2, 3].map((_, i) => (
                            <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-zinc-900 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs">
                                🎂
                            </div>
                        ))}
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white text-xs text-gray-500 ring-2 ring-white pl-1">
                            +
                        </div>
                    </div>
                    <button className="w-full mt-3 text-xs font-medium text-purple-600 hover:text-purple-800 border border-purple-200 rounded py-1 bg-white/50">
                        Enviar Promoción
                    </button>
                </CardContent>
            </Card>
        </div>
    );
}
