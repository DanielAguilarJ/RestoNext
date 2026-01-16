import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, CheckCircle2 } from "lucide-react";

export function CateringOverview() {
    return (
        <Card className="col-span-1 shadow-md">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-brand-600" />
                            Catering & Eventos
                        </CardTitle>
                        <CardDescription>Próximos eventos y estado de cotizaciones</CardDescription>
                    </div>
                    <Badge variant="secondary">3 Pendientes</Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Event 1 */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b last:border-0 last:pb-0">
                        <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center justify-center w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-700 dark:text-orange-400">
                                <span className="text-xs font-bold uppercase">Oct</span>
                                <span className="text-lg font-bold">24</span>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm">Boda Civil - Familia González</h4>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> 14:00 PM
                                    </span>
                                    <span>50 Pax</span>
                                </div>
                            </div>
                        </div>
                        <Badge className="w-fit bg-green-100 text-green-700 hover:bg-green-200 border-none shadow-none">
                            Confirmado
                        </Badge>
                    </div>

                    {/* Event 2 */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b last:border-0 last:pb-0">
                        <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center justify-center w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
                                <span className="text-xs font-bold uppercase">Oct</span>
                                <span className="text-lg font-bold">28</span>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm">Cena Corporativa - TechSol</h4>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> 19:30 PM
                                    </span>
                                    <span>25 Pax</span>
                                </div>
                            </div>
                        </div>
                        <Badge variant="outline" className="w-fit text-yellow-600 border-yellow-200 bg-yellow-50">
                            Pendiente Pago
                        </Badge>
                    </div>

                    {/* Action */}
                    <button className="w-full mt-2 py-2 text-sm text-center text-brand-600 hover:bg-brand-50 rounded-md transition-colors font-medium border border-dashed border-brand-200">
                        + Nueva Cotización
                    </button>
                </div>
            </CardContent>
        </Card>
    );
}
