import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, AlertTriangle, TrendingUp, PackageCheck } from "lucide-react";

export function AiProcurementWidget() {
    return (
        <Card className="col-span-1 shadow-md border-0 bg-gradient-to-br from-white to-orange-50/50 dark:from-zinc-900 dark:to-zinc-900/50">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            <BrainCircuit className="h-5 w-5 text-brand-500" />
                            IA Procurement
                        </CardTitle>
                        <CardDescription>
                            Predicciones de inventario y compras inteligentes
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-brand-100 text-brand-700 border-brand-200 dark:bg-brand-900/30 dark:text-brand-400 dark:border-brand-800">
                        High Confidence
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Alert Item */}
                <div className="flex items-start gap-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                    <div className="p-2 bg-white dark:bg-red-900/20 rounded-full shadow-sm">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm text-red-900 dark:text-red-200">Stock Crítico: Ribeye Importado</h4>
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                            Quedan solo 4.5kg. Se proyecta un consumo de 12kg para este fin de semana.
                        </p>
                        <button className="text-xs font-medium text-red-600 underline mt-2 hover:text-red-800">
                            Generar Orden de Compra
                        </button>
                    </div>
                </div>

                {/* Prediction Item */}
                <div className="flex items-start gap-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                    <div className="p-2 bg-white dark:bg-blue-900/20 rounded-full shadow-sm">
                        <TrendingUp className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-200">Alta Demanda: Sábado Noche</h4>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                            Reservas al 90%. Se recomienda aumentar prep de postres (+20%).
                        </p>
                    </div>
                </div>

                {/* Suggestion Item */}
                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                        <PackageCheck className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Proveedores sugeridos: 3</span>
                    </div>
                    <span className="text-xs text-gray-400">Actualizado hace 5m</span>
                </div>
            </CardContent>
        </Card>
    );
}
