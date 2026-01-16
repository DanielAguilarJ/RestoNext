"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign, Activity } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";

const dataSales = [
    { value: 400 }, { value: 600 }, { value: 500 }, { value: 900 }, { value: 800 }, { value: 1200 }, { value: 1100 }
];

const dataOccupancy = [
    { value: 30 }, { value: 45 }, { value: 55 }, { value: 40 }, { value: 70 }, { value: 85 }, { value: 80 }
];

const dataSpeed = [
    { value: 15 }, { value: 12 }, { value: 18 }, { value: 10 }, { value: 8 }, { value: 14 }, { value: 11 }
];

export function OperationsPulse() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-sm border-l-4 border-l-brand-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Ventas (En vivo)</CardTitle>
                    <DollarSign className="h-4 w-4 text-brand-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">$12,450</div>
                    <p className="text-xs text-green-500 font-medium flex items-center">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +18% vs ayer
                    </p>
                    <div className="h-[40px] mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dataSales}>
                                <Tooltip content={<></>} cursor={false} />
                                <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Ocupación</CardTitle>
                    <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">85%</div>
                    <p className="text-xs text-muted-foreground">18 mesas activas</p>
                    <div className="h-[40px] mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dataOccupancy}>
                                <Tooltip content={<></>} cursor={false} />
                                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-l-4 border-l-purple-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Velocidad Cocina</CardTitle>
                    <Activity className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">12m 30s</div>
                    <p className="text-xs text-green-500 font-medium">
                        -2m vs objetivo
                    </p>
                    <div className="h-[40px] mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dataSpeed}>
                                <Tooltip content={<></>} cursor={false} />
                                <Line type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
