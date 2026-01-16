"use client"

import { useState, useEffect } from 'react';
import { reservationsApi, Reservation } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { CalendarDays, List as ListIcon, Clock, Users, PlusCircle } from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import { format } from 'date-fns';

export default function ReservationsPage() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        fetchReservations();
    }, []);

    const fetchReservations = async () => {
        setLoading(true);
        try {
            const data = await reservationsApi.list();
            setReservations(data);
        } catch (e) {
            toast({
                title: "Error",
                description: "Failed to load reservations",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const statusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50';
            case 'seated': return 'bg-blue-500/20 text-blue-500 border-blue-500/50';
            case 'cancelled': return 'bg-red-500/20 text-red-500 border-red-500/50';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
        }
    };

    return (
        <div className="p-8 h-screen w-full bg-slate-950 overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Reservations</h1>
                    <p className="text-slate-400">Manage bookings and table assignments</p>
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                    <PlusCircle className="mr-2 h-4 w-4" /> New Reservation
                </Button>
            </div>

            <Tabs defaultValue="list" className="w-full">
                <TabsList className="bg-slate-800 border border-slate-700">
                    <TabsTrigger value="list"><ListIcon className="w-4 h-4 mr-2" />List View</TabsTrigger>
                    <TabsTrigger value="calendar"><CalendarDays className="w-4 h-4 mr-2" />Calendar</TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="mt-6">
                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="p-8 text-center text-slate-500">Loading reservations...</div>
                            ) : reservations.length === 0 ? (
                                <div className="p-12 text-center text-slate-500">No reservations found.</div>
                            ) : (
                                <div className="divide-y divide-slate-800">
                                    {reservations.map((res) => (
                                        <div key={res.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="text-center w-16">
                                                    <div className="text-lg font-bold text-white">{format(new Date(res.reservation_time), 'HH:mm')}</div>
                                                    <div className="text-xs text-slate-500">{format(new Date(res.reservation_time), 'MMM d')}</div>
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-white text-lg">
                                                        {/* Simplify: In real app we resolve customer name from ID or included in response */}
                                                        {res.customer_id ? 'Customer #' + res.customer_id.slice(0, 4) : 'Guest'}
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                                                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {res.party_size} ppl</span>
                                                        {res.notes && <span className="text-slate-500 truncate max-w-[200px]">{res.notes}</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <Badge variant="outline" className={`${statusColor(res.status)} capitalize`}>
                                                    {res.status}
                                                </Badge>
                                                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                                                    Details
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="calendar">
                    <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-lg text-slate-500">
                        Calendar View Implementation Coming Soon...
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
