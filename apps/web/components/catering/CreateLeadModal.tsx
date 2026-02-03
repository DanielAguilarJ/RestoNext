
import { useState } from 'react';
import { X, Loader2, Calendar, Users, Mail, Phone, User, FileText, Sparkles, Tag } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { cateringApi } from '@/lib/api';
import { Lead } from './LeadsKanban';

interface CreateLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (lead: Lead) => void;
}

export function CreateLeadModal({ isOpen, onClose, onSuccess }: CreateLeadModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        client_name: '',
        contact_email: '',
        contact_phone: '',
        event_date: '',
        guest_count: '',
        event_type: '',
        source: '',
        notes: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Validate required fields
            if (!formData.client_name.trim()) {
                throw new Error('El nombre del cliente es obligatorio');
            }

            const payload = {
                client_name: formData.client_name,
                contact_email: formData.contact_email || undefined,
                contact_phone: formData.contact_phone || undefined,
                event_date: formData.event_date ? new Date(formData.event_date).toISOString() : undefined,
                guest_count: formData.guest_count ? parseInt(formData.guest_count) : undefined,
                event_type: formData.event_type || undefined,
                source: formData.source || undefined,
                notes: formData.notes || undefined,
            };

            const newLead = await cateringApi.createLead(payload);

            // Adapt API response (EventLead) to Kanban Lead interface if necessary
            // Assuming they are compatible or mapping is handled in parent
            onSuccess(newLead as unknown as Lead);
            onClose();

            // Reset form
            setFormData({
                client_name: '',
                contact_email: '',
                contact_phone: '',
                event_date: '',
                guest_count: '',
                event_type: '',
                source: '',
                notes: ''
            });

        } catch (err: any) {
            console.error('Error creating lead:', err);
            setError(err.message || 'Error al crear el lead. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nuevo Lead">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    {/* Client Info */}
                    <div className="space-y-3">
                        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                            Información del Cliente
                        </label>

                        <div className="group relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500 group-focus-within:text-emerald-500 transition-colors" />
                            <input
                                type="text"
                                name="client_name"
                                value={formData.client_name}
                                onChange={handleChange}
                                placeholder="Nombre del cliente *"
                                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 pl-9 pr-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="group relative">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500 group-focus-within:text-emerald-500 transition-colors" />
                                <input
                                    type="email"
                                    name="contact_email"
                                    value={formData.contact_email}
                                    onChange={handleChange}
                                    placeholder="Email"
                                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 pl-9 pr-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all"
                                />
                            </div>
                            <div className="group relative">
                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500 group-focus-within:text-emerald-500 transition-colors" />
                                <input
                                    type="tel"
                                    name="contact_phone"
                                    value={formData.contact_phone}
                                    onChange={handleChange}
                                    placeholder="Teléfono"
                                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 pl-9 pr-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Event Info */}
                    <div className="space-y-3 pt-2">
                        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                            Detalles del Evento
                        </label>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="group relative">
                                <Sparkles className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500 group-focus-within:text-emerald-500 transition-colors" />
                                <select
                                    name="event_type"
                                    value={formData.event_type}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 pl-9 pr-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all appearance-none"
                                >
                                    <option value="">Tipo de Evento</option>
                                    <option value="Boda">Boda</option>
                                    <option value="Empresarial">Empresarial</option>
                                    <option value="Cumpleaños">Cumpleaños</option>
                                    <option value="Graduación">Graduación</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div className="group relative">
                                <Tag className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500 group-focus-within:text-emerald-500 transition-colors" />
                                <select
                                    name="source"
                                    value={formData.source}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 pl-9 pr-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all appearance-none"
                                >
                                    <option value="">Fuente</option>
                                    <option value="Website">Website</option>
                                    <option value="Instagram">Instagram</option>
                                    <option value="Facebook">Facebook</option>
                                    <option value="Recomendación">Recomendación</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="group relative">
                                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500 group-focus-within:text-emerald-500 transition-colors" />
                                <input
                                    type="date"
                                    name="event_date"
                                    value={formData.event_date}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 pl-9 pr-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all"
                                />
                            </div>
                            <div className="group relative">
                                <Users className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500 group-focus-within:text-emerald-500 transition-colors" />
                                <input
                                    type="number"
                                    name="guest_count"
                                    value={formData.guest_count}
                                    onChange={handleChange}
                                    placeholder="Invitados"
                                    min="1"
                                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 pl-9 pr-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all"
                                />
                            </div>
                        </div>

                        <div className="group relative">
                            <FileText className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500 group-focus-within:text-emerald-500 transition-colors" />
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                placeholder="Notas adicionales..."
                                rows={3}
                                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 pl-9 pr-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            'Crear Lead'
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
