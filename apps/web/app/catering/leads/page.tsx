"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Filter, Plus, RefreshCcw, LayoutGrid, List, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LeadsKanban, Lead, LeadStatusType } from "@/components/catering/LeadsKanban";
import { CreateLeadModal } from "@/components/catering/CreateLeadModal";
import { cateringApi } from "@/lib/api";

// ============================================
// API Functions (using centralized API client)
// ============================================

async function fetchLeads(): Promise<Lead[]> {
    const data = await cateringApi.getLeads();

    // Transform API response to Lead interface
    return data.map((lead) => ({
        id: lead.id,
        client_name: lead.client_name,
        contact_email: lead.contact_email,
        contact_phone: lead.contact_phone,
        event_date: lead.event_date,
        guest_count: lead.guest_count,
        event_type: lead.event_type,
        status: lead.status as LeadStatusType,
        notes: lead.notes,
        source: lead.source,
        created_at: lead.created_at,
        updated_at: lead.updated_at,
        // Estimate value based on guest count (rough heuristic)
        estimated_value: lead.guest_count ? lead.guest_count * 350 : undefined
    }));
}

async function updateLeadStatus(leadId: string, newStatus: LeadStatusType): Promise<void> {
    await cateringApi.updateLeadStatus(leadId, newStatus);
}

// ============================================
// Main Page Component
// ============================================

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    const [refreshing, setRefreshing] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Load leads
    const loadLeads = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchLeads();
            setLeads(data);
        } catch (err) {
            console.error('Error loading leads:', err);
            setError('Error al cargar los leads');
            setLeads([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLeads();
    }, [loadLeads]);

    // Handle refresh
    const handleRefresh = async () => {
        setRefreshing(true);
        await loadLeads();
        setRefreshing(false);
    };

    // Handle status change from Kanban
    const handleLeadStatusChange = async (leadId: string, newStatus: LeadStatusType) => {
        try {
            await updateLeadStatus(leadId, newStatus);
            // Optimistically already updated in Kanban component
            // Just update local state for consistency
            setLeads(prev =>
                prev.map(lead =>
                    lead.id === leadId
                        ? { ...lead, status: newStatus }
                        : lead
                )
            );
        } catch (err) {
            console.error('Error updating lead status:', err);
            // Kanban component handles revert
            throw err;
        }
    };

    // Handle lead click
    const handleLeadClick = (lead: Lead) => {
        // TODO: Open lead details modal or navigate to lead page
        console.log('Lead clicked:', lead);
    };

    // Filter leads by search query
    const filteredLeads = searchQuery
        ? leads.filter(lead =>
            lead.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.event_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.contact_email?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : leads;

    const handleCreateSuccess = (newLead: Lead) => {
        setLeads(prev => [newLead, ...prev]);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Leads & CRM</h1>
                    <p className="text-neutral-400">
                        Gestiona clientes potenciales y oportunidades de negocio
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-500"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo Lead
                </button>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-3">
                {/* Search */}
                <div className="flex flex-1 items-center gap-2 rounded-lg bg-neutral-950 px-3 py-2.5">
                    <Search className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, tipo de evento..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none"
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    {/* Refresh */}
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition disabled:opacity-50"
                    >
                        <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Actualizar</span>
                    </button>

                    {/* Filter */}
                    <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition">
                        <Filter className="h-4 w-4" />
                        <span className="hidden sm:inline">Filtrar</span>
                    </button>

                    {/* View Toggle */}
                    <div className="flex rounded-lg bg-neutral-800 p-1">
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`p-2 rounded-md transition ${viewMode === 'kanban'
                                ? 'bg-emerald-600 text-white'
                                : 'text-neutral-400 hover:text-white'
                                }`}
                            title="Vista Kanban"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition ${viewMode === 'list'
                                ? 'bg-emerald-600 text-white'
                                : 'text-neutral-400 hover:text-white'
                                }`}
                            title="Vista Lista"
                        >
                            <List className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Error State */}
            {error && !loading && (
                <div className="rounded-xl border border-amber-800/50 bg-amber-900/20 p-4 text-sm text-amber-300">
                    {error} — Mostrando datos de demostración.
                </div>
            )}

            {/* Content */}
            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center py-20"
                    >
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                    </motion.div>
                ) : viewMode === 'kanban' ? (
                    <motion.div
                        key="kanban"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <LeadsKanban
                            leads={filteredLeads}
                            onLeadStatusChange={handleLeadStatusChange}
                            onLeadClick={handleLeadClick}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden"
                    >
                        {/* List View Table */}
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-neutral-800 text-left text-sm text-neutral-500">
                                    <th className="px-4 py-3 font-medium">Cliente</th>
                                    <th className="px-4 py-3 font-medium">Evento</th>
                                    <th className="px-4 py-3 font-medium">Fecha</th>
                                    <th className="px-4 py-3 font-medium">Invitados</th>
                                    <th className="px-4 py-3 font-medium">Valor Est.</th>
                                    <th className="px-4 py-3 font-medium">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLeads.map((lead) => (
                                    <tr
                                        key={lead.id}
                                        onClick={() => handleLeadClick(lead)}
                                        className="border-b border-neutral-800/50 hover:bg-neutral-800/50 cursor-pointer transition"
                                    >
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-medium text-white">{lead.client_name}</p>
                                                {lead.contact_email && (
                                                    <p className="text-xs text-neutral-500">{lead.contact_email}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-neutral-300">
                                            {lead.event_type || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-neutral-400">
                                            {lead.event_date
                                                ? new Date(lead.event_date).toLocaleDateString('es-MX', {
                                                    day: 'numeric',
                                                    month: 'short'
                                                })
                                                : '—'
                                            }
                                        </td>
                                        <td className="px-4 py-3 text-sm text-neutral-400">
                                            {lead.guest_count || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-emerald-400">
                                            {lead.estimated_value
                                                ? new Intl.NumberFormat('es-MX', {
                                                    style: 'currency',
                                                    currency: 'MXN',
                                                    maximumFractionDigits: 0
                                                }).format(lead.estimated_value)
                                                : '—'
                                            }
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${lead.status === 'new' ? 'bg-blue-500/20 text-blue-400' :
                                                lead.status === 'contacted' ? 'bg-cyan-500/20 text-cyan-400' :
                                                    lead.status === 'proposal_sent' ? 'bg-violet-500/20 text-violet-400' :
                                                        lead.status === 'negotiation' ? 'bg-amber-500/20 text-amber-400' :
                                                            lead.status === 'won' ? 'bg-emerald-500/20 text-emerald-400' :
                                                                lead.status === 'lost' ? 'bg-red-500/20 text-red-400' :
                                                                    'bg-neutral-500/20 text-neutral-400'
                                                }`}>
                                                {lead.status === 'new' ? 'Nuevo' :
                                                    lead.status === 'contacted' ? 'Contactado' :
                                                        lead.status === 'proposal_sent' ? 'Propuesta' :
                                                            lead.status === 'negotiation' ? 'Negociación' :
                                                                lead.status === 'won' ? 'Ganado' :
                                                                    lead.status === 'lost' ? 'Perdido' :
                                                                        lead.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredLeads.length === 0 && (
                            <div className="py-12 text-center text-neutral-500">
                                No se encontraron leads
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <CreateLeadModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={handleCreateSuccess}
            />
        </div>
    );
}
