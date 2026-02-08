'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Calendar,
    Clock,
    Users,
    MapPin,
    Loader2,
    Sparkles,
    Save,
    PartyPopper,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cateringApi } from '@/lib/api';

// ============================================
// New Event Page
// ============================================

export default function NewEventPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        start_date: '',
        start_time: '12:00',
        end_date: '',
        end_time: '18:00',
        guest_count: 50,
        location: '',
        event_type: 'wedding', // wedding, corporate, birthday, social
        notes: '',
    });

    // Event types for selection
    const eventTypes = [
        { value: 'wedding', label: 'Boda', icon: '💒' },
        { value: 'corporate', label: 'Corporativo', icon: '🏢' },
        { value: 'birthday', label: 'Cumpleaños', icon: '🎂' },
        { value: 'social', label: 'Social', icon: '🎉' },
        { value: 'quinceañera', label: 'XV Años', icon: '👑' },
        { value: 'graduation', label: 'Graduación', icon: '🎓' },
    ];

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.name.trim()) {
            setError('El nombre del evento es requerido');
            return;
        }
        if (!formData.start_date) {
            setError('La fecha de inicio es requerida');
            return;
        }
        if (formData.guest_count < 1) {
            setError('Debe haber al menos 1 invitado');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Validate dates before combining
            if (!formData.start_date) {
                setError('La fecha de inicio es requerida');
                setLoading(false);
                return;
            }

            // Combine date and time into ISO strings
            const startDateTime = new Date(`${formData.start_date}T${formData.start_time}:00`);
            const endDate = formData.end_date || formData.start_date;
            const endDateTime = new Date(`${endDate}T${formData.end_time}:00`);

            // Validate resulting dates
            if (isNaN(startDateTime.getTime())) {
                setError('La fecha/hora de inicio no es válida');
                setLoading(false);
                return;
            }
            if (isNaN(endDateTime.getTime())) {
                setError('La fecha/hora de fin no es válida');
                setLoading(false);
                return;
            }
            if (endDateTime <= startDateTime) {
                setError('La fecha de fin debe ser posterior a la fecha de inicio');
                setLoading(false);
                return;
            }

            // Create the event
            const event = await cateringApi.createEvent({
                name: formData.name.trim(),
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                guest_count: formData.guest_count,
                location: formData.location.trim() || undefined,
            });

            // Navigate to the new event's detail page
            router.push(`/catering/events/${event.id}`);
        } catch (err: any) {
            console.error('Error creating event:', err);
            setError(err.message || 'Error al crear el evento');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-neutral-400 hover:text-white transition mb-4"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Volver
                </button>

                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                        <PartyPopper className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Nuevo Evento</h1>
                        <p className="text-neutral-400">
                            Crea un nuevo evento de catering
                        </p>
                    </div>
                </div>
            </div>

            {/* Form */}
            <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleSubmit}
                className="max-w-4xl"
            >
                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                        {error}
                    </div>
                )}

                {/* Main Info Card */}
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 mb-6">
                    <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-emerald-500" />
                        Información del Evento
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Event Name */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-neutral-300 mb-2">
                                Nombre del Evento *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej: Boda García - López"
                                className="w-full px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 
                                    text-white placeholder-neutral-500 focus:border-emerald-500 
                                    focus:ring-2 focus:ring-emerald-500/20 transition outline-none"
                            />
                        </div>

                        {/* Event Type */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-neutral-300 mb-3">
                                Tipo de Evento
                            </label>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                                {eventTypes.map((type) => (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, event_type: type.value })}
                                        className={`p-3 rounded-xl border-2 transition text-center ${formData.event_type === type.value
                                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                                : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                                            }`}
                                    >
                                        <div className="text-2xl mb-1">{type.icon}</div>
                                        <div className="text-xs font-medium">{type.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Guest Count */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">
                                <Users className="w-4 h-4 inline mr-2" />
                                Número de Invitados *
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={5000}
                                value={formData.guest_count}
                                onChange={(e) => setFormData({ ...formData, guest_count: parseInt(e.target.value) || 1 })}
                                className="w-full px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 
                                    text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 
                                    transition outline-none"
                            />
                        </div>

                        {/* Location */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">
                                <MapPin className="w-4 h-4 inline mr-2" />
                                Ubicación
                            </label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                placeholder="Ej: Salón Las Palmas"
                                className="w-full px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 
                                    text-white placeholder-neutral-500 focus:border-emerald-500 
                                    focus:ring-2 focus:ring-emerald-500/20 transition outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Date & Time Card */}
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 mb-6">
                    <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-500" />
                        Fecha y Hora
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Start Date */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">
                                Fecha de Inicio *
                            </label>
                            <input
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 
                                    text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 
                                    transition outline-none"
                            />
                        </div>

                        {/* Start Time */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">
                                <Clock className="w-4 h-4 inline mr-2" />
                                Hora de Inicio
                            </label>
                            <input
                                type="time"
                                value={formData.start_time}
                                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 
                                    text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 
                                    transition outline-none"
                            />
                        </div>

                        {/* End Date */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">
                                Fecha de Fin
                                <span className="text-neutral-500 text-xs ml-2">(opcional)</span>
                            </label>
                            <input
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                min={formData.start_date || new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 
                                    text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 
                                    transition outline-none"
                            />
                        </div>

                        {/* End Time */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">
                                <Clock className="w-4 h-4 inline mr-2" />
                                Hora de Fin
                            </label>
                            <input
                                type="time"
                                value={formData.end_time}
                                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 
                                    text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 
                                    transition outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Notes Card */}
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 mb-6">
                    <h2 className="text-xl font-semibold text-white mb-4">
                        Notas Adicionales
                    </h2>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Notas sobre el evento, preferencias del cliente, restricciones dietéticas, etc."
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 
                            text-white placeholder-neutral-500 focus:border-emerald-500 
                            focus:ring-2 focus:ring-emerald-500/20 transition outline-none resize-none"
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-3 rounded-xl border border-neutral-700 text-neutral-400 
                            hover:bg-neutral-800 hover:text-white transition"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r 
                            from-emerald-500 to-teal-600 text-white font-semibold 
                            hover:from-emerald-400 hover:to-teal-500 transition 
                            disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Creando...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Crear Evento
                            </>
                        )}
                    </button>
                </div>
            </motion.form>
        </div>
    );
}
