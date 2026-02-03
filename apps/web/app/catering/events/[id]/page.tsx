"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    ChefHat,
    FileText,
    DollarSign,
    Calendar,
    Clock,
    MapPin,
    Download,
    Users,
    Loader2,
    Edit2,
    ExternalLink,
    Plus,
    Trash2,
} from "lucide-react";
import Link from "next/link";
import { cateringApi, type CateringEvent, menuApi } from "@/lib/api";
import { motion } from "framer-motion";

export default function EventDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const eventId = params.id as string;

    const [event, setEvent] = useState<CateringEvent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("overview");

    // Menu selection modal
    const [showMenuModal, setShowMenuModal] = useState(false);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [addingItem, setAddingItem] = useState(false);

    // Fetch event data
    useEffect(() => {
        const fetchEvent = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await cateringApi.getEvent(eventId);
                setEvent(data);
            } catch (err: any) {
                console.error('Error fetching event:', err);
                setError(err.message || 'Error al cargar el evento');
            } finally {
                setLoading(false);
            }
        };

        if (eventId) {
            fetchEvent();
        }
    }, [eventId]);

    // Fetch menu items when modal opens
    useEffect(() => {
        const fetchMenuItems = async () => {
            try {
                const items = await menuApi.getItems();
                setMenuItems(items);
            } catch (err) {
                console.error('Error fetching menu items:', err);
            }
        };

        if (showMenuModal) {
            fetchMenuItems();
        }
    }, [showMenuModal]);

    // Format date
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    // Format time
    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(amount);
    };

    // Add menu item to event
    const handleAddMenuItem = async (menuItemId: string, quantity: number = 1) => {
        if (!event) return;

        try {
            setAddingItem(true);
            const updatedEvent = await cateringApi.addMenuItem(event.id, {
                menu_item_id: menuItemId,
                quantity,
            });
            setEvent(updatedEvent);
            setShowMenuModal(false);
        } catch (err: any) {
            console.error('Error adding menu item:', err);
            alert('Error al agregar el item: ' + err.message);
        } finally {
            setAddingItem(false);
        }
    };

    // Status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'bg-emerald-500/10 text-emerald-500';
            case 'draft':
                return 'bg-amber-500/10 text-amber-500';
            case 'cancelled':
                return 'bg-red-500/10 text-red-500';
            default:
                return 'bg-neutral-500/10 text-neutral-500';
        }
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            draft: 'Borrador',
            confirmed: 'Confirmado',
            cancelled: 'Cancelado',
            completed: 'Completado',
        };
        return labels[status] || status;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        );
    }

    if (error || !event) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <p className="text-red-400 mb-4">{error || 'Evento no encontrado'}</p>
                <button
                    onClick={() => router.push('/catering')}
                    className="text-emerald-500 hover:text-emerald-400"
                >
                    Volver al calendario
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <Link href="/catering" className="flex items-center gap-2 text-sm text-neutral-500 hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Volver al Calendario
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-white">{event.name}</h1>
                        <span className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(event.status)}`}>
                            {getStatusLabel(event.status)}
                        </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-6 text-sm text-neutral-400">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {formatDate(event.start_time)}
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {formatTime(event.start_time)} - {formatTime(event.end_time)}
                        </div>
                        {event.location && (
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {event.location}
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {event.guest_count} invitados
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => router.push(`/catering/events/${event.id}/edit`)}
                        className="flex items-center gap-2 rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
                    >
                        <Edit2 className="w-4 h-4" />
                        Editar
                    </button>
                    <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
                        Acciones
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-neutral-800">
                <nav className="flex gap-6">
                    {[
                        { id: 'overview', label: 'Resumen' },
                        { id: 'menu', label: 'Menú' },
                        { id: 'beo', label: 'BEO y Logística' },
                        { id: 'finance', label: 'Cotización' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`border-b-2 pb-3 text-sm font-medium transition ${activeTab === tab.id
                                ? "border-emerald-500 text-white"
                                : "border-transparent text-neutral-500 hover:text-neutral-300"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {/* Overview Tab */}
                {activeTab === "overview" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-3 gap-6"
                    >
                        <div className="col-span-2 space-y-6">
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                                    <p className="text-sm text-neutral-500">Total Estimado</p>
                                    <p className="text-2xl font-bold text-emerald-500">{formatCurrency(event.total_amount)}</p>
                                </div>
                                <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                                    <p className="text-sm text-neutral-500">Invitados</p>
                                    <p className="text-2xl font-bold text-white">{event.guest_count}</p>
                                </div>
                                <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                                    <p className="text-sm text-neutral-500">Items en Menú</p>
                                    <p className="text-2xl font-bold text-white">{event.menu_selections?.length || 0}</p>
                                </div>
                            </div>

                            {/* Menu Summary */}
                            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
                                <h3 className="mb-4 font-semibold text-white flex items-center justify-between">
                                    Menú del Evento
                                    <button
                                        onClick={() => setShowMenuModal(true)}
                                        className="text-sm text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Agregar
                                    </button>
                                </h3>
                                {event.menu_selections && event.menu_selections.length > 0 ? (
                                    <div className="space-y-3">
                                        {event.menu_selections.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-800">
                                                <div>
                                                    <p className="font-medium text-white">{item.item_name}</p>
                                                    <p className="text-sm text-neutral-500">
                                                        {item.quantity}x @ {formatCurrency(item.unit_price)}
                                                    </p>
                                                </div>
                                                <p className="font-semibold text-white">
                                                    {formatCurrency(item.quantity * item.unit_price)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-neutral-500">
                                        <ChefHat className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                        <p>No hay items en el menú</p>
                                        <button
                                            onClick={() => setShowMenuModal(true)}
                                            className="mt-2 text-emerald-500 hover:text-emerald-400"
                                        >
                                            Agregar items
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
                                <h3 className="mb-4 font-semibold text-white">Acciones Rápidas</h3>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => window.open(cateringApi.getProposalPdfUrl(event.id), '_blank')}
                                        className="flex w-full items-center gap-3 rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white"
                                    >
                                        <Download className="h-4 w-4" />
                                        Descargar Propuesta (PDF)
                                    </button>
                                    <button
                                        onClick={() => window.open(cateringApi.getProductionSheetPdfUrl(event.id), '_blank')}
                                        className="flex w-full items-center gap-3 rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white"
                                    >
                                        <ChefHat className="h-4 w-4" />
                                        Hoja de Producción
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
                                <h3 className="mb-4 font-semibold text-white">Información</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-neutral-500">Creado</span>
                                        <span className="text-white">
                                            {new Date(event.created_at).toLocaleDateString('es-MX')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-neutral-500">Actualizado</span>
                                        <span className="text-white">
                                            {new Date(event.updated_at).toLocaleDateString('es-MX')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-neutral-500">ID</span>
                                        <span className="text-neutral-400 font-mono text-xs">
                                            {event.id.slice(0, 8)}...
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Menu Tab */}
                {activeTab === "menu" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-xl border border-neutral-800 bg-neutral-900 p-6"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-white">Selección de Menú</h3>
                            <button
                                onClick={() => setShowMenuModal(true)}
                                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                            >
                                <Plus className="w-4 h-4" />
                                Agregar Item
                            </button>
                        </div>

                        {event.menu_selections && event.menu_selections.length > 0 ? (
                            <div className="space-y-4">
                                {event.menu_selections.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-neutral-800 border border-neutral-700">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-white">{item.item_name}</h4>
                                            <p className="text-sm text-neutral-500">
                                                Cantidad: {item.quantity} | Precio unitario: {formatCurrency(item.unit_price)}
                                            </p>
                                            {item.notes && (
                                                <p className="text-sm text-neutral-400 mt-1">{item.notes}</p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-emerald-500">
                                                {formatCurrency(item.quantity * item.unit_price)}
                                            </p>
                                        </div>
                                    </div>
                                ))}

                                <div className="pt-4 border-t border-neutral-700 flex justify-between">
                                    <span className="text-lg font-medium text-white">Total</span>
                                    <span className="text-2xl font-bold text-emerald-500">
                                        {formatCurrency(event.total_amount)}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <ChefHat className="mx-auto mb-4 h-12 w-12 text-neutral-700" />
                                <h3 className="text-lg font-medium text-white">No hay items seleccionados</h3>
                                <p className="text-neutral-500">Selecciona items de tu menú para este evento</p>
                                <button
                                    onClick={() => setShowMenuModal(true)}
                                    className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                                >
                                    Agregar Items
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* BEO Tab */}
                {activeTab === "beo" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-xl border border-neutral-800 bg-neutral-900 p-12 text-center"
                    >
                        <FileText className="mx-auto mb-4 h-12 w-12 text-neutral-700" />
                        <h3 className="text-lg font-medium text-white">BEO (Banquet Event Order)</h3>
                        <p className="text-neutral-500 mb-4">Crea la hoja de evento con todos los detalles logísticos</p>
                        <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
                            Crear BEO
                        </button>
                    </motion.div>
                )}

                {/* Finance Tab */}
                {activeTab === "finance" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-xl border border-neutral-800 bg-neutral-900 p-12 text-center"
                    >
                        <DollarSign className="mx-auto mb-4 h-12 w-12 text-neutral-700" />
                        <h3 className="text-lg font-medium text-white">Cotización</h3>
                        <p className="text-neutral-500 mb-4">Genera una cotización formal para el cliente</p>
                        <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
                            Generar Cotización
                        </button>
                    </motion.div>
                )}
            </div>

            {/* Menu Selection Modal */}
            {showMenuModal && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-neutral-900 rounded-2xl border border-neutral-800 w-full max-w-2xl max-h-[80vh] overflow-hidden"
                    >
                        <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-white">Agregar Item al Menú</h3>
                            <button
                                onClick={() => setShowMenuModal(false)}
                                className="text-neutral-500 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6 overflow-auto max-h-[60vh]">
                            {menuItems.length > 0 ? (
                                <div className="space-y-3">
                                    {menuItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between p-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 transition"
                                        >
                                            <div>
                                                <p className="font-medium text-white">{item.name}</p>
                                                <p className="text-sm text-neutral-500">{item.category}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <p className="font-semibold text-emerald-500">
                                                    {formatCurrency(item.price)}
                                                </p>
                                                <button
                                                    onClick={() => handleAddMenuItem(item.id)}
                                                    disabled={addingItem}
                                                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-500 disabled:opacity-50"
                                                >
                                                    {addingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Agregar'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-neutral-500">
                                    <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                                    <p>Cargando items del menú...</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
