"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { reservationsApi, Reservation } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { CalendarDays, List as ListIcon, Clock, Users, PlusCircle, ArrowLeft, RefreshCw, Filter } from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CreateReservationModal } from '../../components/reservations/CreateReservationModal';
import { ReservationCalendar } from '../../components/reservations/ReservationCalendar';
import { ReservationDetailsModal } from '../../components/reservations/ReservationDetailsModal';

export default function ReservationsPage() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const { toast } = useToast();

    useEffect(() => {
        fetchReservations();
    }, [statusFilter]);

    const fetchReservations = async () => {
        setLoading(true);
        try {
            const data = await reservationsApi.list(undefined, statusFilter || undefined);
            setReservations(data);
        } catch (e) {
            toast({
                title: "Error",
                description: "No se pudieron cargar las reservaciones",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleReservationCreated = () => {
        fetchReservations();
        toast({
            title: "Reservación creada",
            description: "La reservación se ha creado correctamente",
        });
    };

    const handleReservationUpdated = () => {
        fetchReservations();
        toast({
            title: "Reservación actualizada",
            description: "El estado se ha actualizado",
        });
    };

    const handleSelectReservation = (reservation: Reservation) => {
        setSelectedReservation(reservation);
        setShowDetailsModal(true);
    };

    const handleSelectDate = (date: Date) => {
        setSelectedDate(date);
    };

    const statusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
            case 'seated': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
            case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/50';
            case 'completed': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
            case 'no_show': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
        }
    };

    const statusLabel = (status: string) => {
        const labels: Record<string, string> = {
            pending: 'Pendiente',
            confirmed: 'Confirmada',
            seated: 'Sentada',
            completed: 'Completada',
            cancelled: 'Cancelada',
            no_show: 'No Show'
        };
        return labels[status] || status;
    };

    // Sort reservations by time
    const sortedReservations = [...reservations].sort(
        (a, b) => new Date(a.reservation_time).getTime() - new Date(b.reservation_time).getTime()
    );

    // Group by date for list view
    const groupedByDate = sortedReservations.reduce((acc, res) => {
        const dateKey = format(new Date(res.reservation_time), 'yyyy-MM-dd');
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(res);
        return acc;
    }, {} as Record<string, Reservation[]>);

    return (
        <div className="p-6 md:p-8 min-h-screen w-full bg-slate-950 overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard"
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">Reservaciones</h1>
                        <p className="text-slate-400">Gestiona las reservaciones y asignación de mesas</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchReservations}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Actualizar"
                    >
                        <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" /> Nueva Reservación
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="list" className="w-full">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <TabsList className="bg-slate-800 border border-slate-700">
                        <TabsTrigger value="list" className="data-[state=active]:bg-slate-700">
                            <ListIcon className="w-4 h-4 mr-2" />Lista
                        </TabsTrigger>
                        <TabsTrigger value="calendar" className="data-[state=active]:bg-slate-700">
                            <CalendarDays className="w-4 h-4 mr-2" />Calendario
                        </TabsTrigger>
                    </TabsList>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-500" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">Todos los estados</option>
                            <option value="pending">Pendiente</option>
                            <option value="confirmed">Confirmada</option>
                            <option value="seated">Sentada</option>
                            <option value="completed">Completada</option>
                            <option value="cancelled">Cancelada</option>
                        </select>
                    </div>
                </div>

                {/* List View */}
                <TabsContent value="list" className="mt-0">
                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="p-8 text-center text-slate-500">
                                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                                    Cargando reservaciones...
                                </div>
                            ) : reservations.length === 0 ? (
                                <div className="p-12 text-center">
                                    <CalendarDays className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                    <p className="text-slate-400 text-lg">Sin reservaciones</p>
                                    <p className="text-slate-500 text-sm mt-1">
                                        {statusFilter ? 'No hay reservaciones con ese estado' : 'Crea tu primera reservación'}
                                    </p>
                                    {!statusFilter && (
                                        <Button
                                            onClick={() => setShowCreateModal(true)}
                                            className="mt-4 bg-emerald-600 hover:bg-emerald-700"
                                        >
                                            <PlusCircle className="mr-2 h-4 w-4" /> Nueva Reservación
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-800">
                                    {Object.entries(groupedByDate).map(([dateKey, dateReservations]) => (
                                        <div key={dateKey}>
                                            {/* Date Header */}
                                            <div className="px-4 py-2 bg-slate-800/50 sticky top-0">
                                                <span className="text-sm font-medium text-slate-400">
                                                    {format(new Date(dateKey), "EEEE d 'de' MMMM", { locale: es })}
                                                </span>
                                                <span className="ml-2 text-xs text-slate-500">
                                                    ({dateReservations.length} reservación{dateReservations.length !== 1 ? 'es' : ''})
                                                </span>
                                            </div>

                                            {/* Reservations for this date */}
                                            {dateReservations.map((res) => (
                                                <div
                                                    key={res.id}
                                                    onClick={() => handleSelectReservation(res)}
                                                    className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-center w-16">
                                                            <div className="text-lg font-bold text-white">
                                                                {format(new Date(res.reservation_time), 'HH:mm')}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-white text-lg">
                                                                {res.customer_name || 'Invitado'}
                                                            </div>
                                                            <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                                                                <span className="flex items-center gap-1">
                                                                    <Users className="w-3 h-3" /> {res.party_size} personas
                                                                </span>
                                                                {res.notes && (
                                                                    <span className="text-slate-500 truncate max-w-[200px]">
                                                                        {res.notes}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <Badge variant="outline" className={`${statusColor(res.status)} capitalize`}>
                                                            {statusLabel(res.status)}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Calendar View */}
                <TabsContent value="calendar" className="mt-0">
                    <ReservationCalendar
                        reservations={reservations}
                        onSelectDate={handleSelectDate}
                        onSelectReservation={handleSelectReservation}
                    />
                </TabsContent>
            </Tabs>

            {/* Modals */}
            <CreateReservationModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={handleReservationCreated}
                initialDate={selectedDate || undefined}
            />

            <ReservationDetailsModal
                isOpen={showDetailsModal}
                onClose={() => {
                    setShowDetailsModal(false);
                    setSelectedReservation(null);
                }}
                reservation={selectedReservation}
                onUpdate={handleReservationUpdated}
            />
        </div>
    );
}
