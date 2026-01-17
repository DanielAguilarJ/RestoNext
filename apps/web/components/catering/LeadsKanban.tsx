'use client';

import { useState, useCallback } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Phone,
    Mail,
    Calendar,
    Users,
    DollarSign,
    MoreHorizontal,
    AlertCircle,
    Clock,
    CheckCircle2,
    XCircle,
    Send,
    MessageSquare,
    Sparkles,
    GripVertical,
} from 'lucide-react';

// ============================================
// Types
// ============================================

export interface Lead {
    id: string;
    client_name: string;
    contact_email?: string;
    contact_phone?: string;
    event_date?: string;
    guest_count?: number;
    event_type?: string;
    status: LeadStatusType;
    notes?: string;
    source?: string;
    created_at: string;
    updated_at: string;
    estimated_value?: number;
}

export type LeadStatusType =
    | 'new'
    | 'contacted'
    | 'proposal_sent'
    | 'negotiation'
    | 'quoting'
    | 'won'
    | 'lost';

interface KanbanColumn {
    id: LeadStatusType;
    title: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
}

interface LeadsKanbanProps {
    leads: Lead[];
    onLeadStatusChange: (leadId: string, newStatus: LeadStatusType) => Promise<void>;
    onLeadClick?: (lead: Lead) => void;
    isLoading?: boolean;
}

// ============================================
// Column Configuration
// ============================================

const COLUMNS: KanbanColumn[] = [
    {
        id: 'new',
        title: 'Nuevo',
        icon: <Sparkles className="w-4 h-4" />,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
    },
    {
        id: 'contacted',
        title: 'Contactado',
        icon: <Phone className="w-4 h-4" />,
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/10',
    },
    {
        id: 'proposal_sent',
        title: 'Propuesta Enviada',
        icon: <Send className="w-4 h-4" />,
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/10',
    },
    {
        id: 'negotiation',
        title: 'Negociación',
        icon: <MessageSquare className="w-4 h-4" />,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
    },
    {
        id: 'won',
        title: 'Ganado',
        icon: <CheckCircle2 className="w-4 h-4" />,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
    },
    {
        id: 'lost',
        title: 'Perdido',
        icon: <XCircle className="w-4 h-4" />,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
    },
];

// ============================================
// Lead Card Component (Sortable)
// ============================================

interface LeadCardProps {
    lead: Lead;
    onClick?: () => void;
    isDragging?: boolean;
}

function LeadCard({ lead, onClick, isDragging = false }: LeadCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging: isSorting,
    } = useSortable({ id: lead.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isSorting ? 0.5 : 1,
    };

    // Calculate if event is upcoming (within 14 days)
    const isUpcoming = lead.event_date
        ? new Date(lead.event_date).getTime() - Date.now() < 14 * 24 * 60 * 60 * 1000 &&
        new Date(lead.event_date).getTime() > Date.now()
        : false;

    // Calculate days until event
    const daysUntilEvent = lead.event_date
        ? Math.ceil(
            (new Date(lead.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
        : null;

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            maximumFractionDigits: 0,
        }).format(amount);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
        });
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group relative rounded-xl border bg-neutral-900 p-4 transition-all ${isDragging
                    ? 'border-emerald-500 shadow-lg shadow-emerald-500/20'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition cursor-grab active:cursor-grabbing"
            >
                <GripVertical className="w-4 h-4 text-neutral-600" />
            </div>

            {/* Content */}
            <div className="pl-4" onClick={onClick}>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">{lead.client_name}</h3>
                        {lead.event_type && (
                            <p className="text-xs font-medium uppercase text-emerald-500 mt-0.5">
                                {lead.event_type}
                            </p>
                        )}
                    </div>
                    <button className="text-neutral-500 hover:text-white transition p-1">
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                </div>

                {/* Event Info */}
                <div className="space-y-2 mb-3">
                    {lead.event_date && (
                        <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                            <span className="text-sm text-neutral-400">
                                {formatDate(lead.event_date)}
                            </span>
                            {isUpcoming && daysUntilEvent !== null && (
                                <span className="ml-auto px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/20 text-amber-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {daysUntilEvent}d
                                </span>
                            )}
                        </div>
                    )}
                    {lead.guest_count && (
                        <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-neutral-500" />
                            <span className="text-sm text-neutral-400">
                                {lead.guest_count} invitados
                            </span>
                        </div>
                    )}
                    {lead.estimated_value && (
                        <div className="flex items-center gap-2">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-sm font-medium text-emerald-400">
                                {formatCurrency(lead.estimated_value)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-neutral-800">
                    {lead.contact_phone && (
                        <a
                            href={`tel:${lead.contact_phone}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white transition"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Phone className="w-3.5 h-3.5" />
                        </a>
                    )}
                    {lead.contact_email && (
                        <a
                            href={`mailto:${lead.contact_email}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white transition"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Mail className="w-3.5 h-3.5" />
                        </a>
                    )}
                    {lead.source && (
                        <span className="ml-auto text-xs text-neutral-600 self-center">
                            via {lead.source}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================
// Kanban Column Component
// ============================================

interface KanbanColumnProps {
    column: KanbanColumn;
    leads: Lead[];
    onLeadClick?: (lead: Lead) => void;
}

function KanbanColumnComponent({ column, leads, onLeadClick }: KanbanColumnProps) {
    // Calculate total value in column
    const totalValue = leads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            maximumFractionDigits: 0,
        }).format(amount);

    return (
        <div className="flex-shrink-0 w-80">
            {/* Column Header */}
            <div className="mb-4 px-1">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className={`${column.color}`}>{column.icon}</span>
                        <h3 className="font-semibold text-neutral-300">{column.title}</h3>
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-neutral-800 text-neutral-500">
                            {leads.length}
                        </span>
                    </div>
                </div>
                {totalValue > 0 && (
                    <p className="text-xs text-neutral-500">
                        <span className="text-emerald-400 font-medium">
                            {formatCurrency(totalValue)}
                        </span>{' '}
                        en pipeline
                    </p>
                )}
            </div>

            {/* Droppable Area */}
            <div
                className={`min-h-[200px] rounded-xl border border-dashed border-neutral-800 ${column.bgColor} p-2 transition-colors`}
            >
                <SortableContext
                    items={leads.map((l) => l.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {leads.map((lead) => (
                                <motion.div
                                    key={lead.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    layout
                                >
                                    <LeadCard
                                        lead={lead}
                                        onClick={() => onLeadClick?.(lead)}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {leads.length === 0 && (
                            <div className="py-8 text-center">
                                <div className={`${column.color} opacity-30 mb-2`}>
                                    {column.icon}
                                </div>
                                <p className="text-sm text-neutral-600">
                                    Arrastra leads aquí
                                </p>
                            </div>
                        )}
                    </div>
                </SortableContext>
            </div>
        </div>
    );
}

// ============================================
// Drag Overlay Card
// ============================================

function DragOverlayCard({ lead }: { lead: Lead }) {
    return (
        <div className="w-80">
            <LeadCard lead={lead} isDragging />
        </div>
    );
}

// ============================================
// Main Kanban Component
// ============================================

export function LeadsKanban({
    leads,
    onLeadStatusChange,
    onLeadClick,
    isLoading = false,
}: LeadsKanbanProps) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [localLeads, setLocalLeads] = useState<Lead[]>(leads);
    const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);

    // Update local leads when prop changes
    useState(() => {
        setLocalLeads(leads);
    });

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Find active lead for overlay
    const activeLead = activeId ? localLeads.find((l) => l.id === activeId) : null;

    // Group leads by status
    const leadsByStatus = COLUMNS.reduce((acc, column) => {
        acc[column.id] = localLeads.filter((lead) => lead.status === column.id);
        return acc;
    }, {} as Record<LeadStatusType, Lead[]>);

    // Find which column a lead belongs to
    const findColumn = (id: string): LeadStatusType | null => {
        const lead = localLeads.find((l) => l.id === id);
        return lead?.status || null;
    };

    // Handle drag start
    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    // Handle drag over (for cross-column movement)
    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeColumn = findColumn(active.id as string);
        const overColumn = COLUMNS.find((c) => c.id === over.id)?.id || findColumn(over.id as string);

        if (!activeColumn || !overColumn || activeColumn === overColumn) return;

        // Optimistically update local state
        setLocalLeads((prev) =>
            prev.map((lead) =>
                lead.id === active.id ? { ...lead, status: overColumn } : lead
            )
        );
    };

    // Handle drag end
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeColumn = findColumn(active.id as string);
        const overColumn = COLUMNS.find((c) => c.id === over.id)?.id || findColumn(over.id as string);

        if (!activeColumn || !overColumn) return;

        // If moved to a different column, update backend
        if (activeColumn !== overColumn) {
            setUpdatingLeadId(active.id as string);
            try {
                await onLeadStatusChange(active.id as string, overColumn);
            } catch (error) {
                // Revert on error
                setLocalLeads((prev) =>
                    prev.map((lead) =>
                        lead.id === active.id ? { ...lead, status: activeColumn } : lead
                    )
                );
                console.error('Failed to update lead status:', error);
            } finally {
                setUpdatingLeadId(null);
            }
        }
    };

    // Calculate totals
    const totalPipeline = localLeads
        .filter((l) => l.status !== 'won' && l.status !== 'lost')
        .reduce((sum, l) => sum + (l.estimated_value || 0), 0);

    const totalWon = localLeads
        .filter((l) => l.status === 'won')
        .reduce((sum, l) => sum + (l.estimated_value || 0), 0);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            maximumFractionDigits: 0,
        }).format(amount);

    if (isLoading) {
        return (
            <div className="flex gap-6 overflow-x-auto pb-6">
                {COLUMNS.map((column) => (
                    <div key={column.id} className="flex-shrink-0 w-80">
                        <div className="animate-pulse">
                            <div className="h-6 w-32 bg-neutral-800 rounded mb-4" />
                            <div className="space-y-3">
                                {[1, 2].map((i) => (
                                    <div
                                        key={i}
                                        className="h-32 bg-neutral-900 rounded-xl border border-neutral-800"
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div>
            {/* Pipeline Summary */}
            <div className="flex items-center gap-6 mb-6 px-1">
                <div>
                    <p className="text-xs text-neutral-500 uppercase tracking-wider">Pipeline</p>
                    <p className="text-lg font-bold text-white">
                        {formatCurrency(totalPipeline)}
                    </p>
                </div>
                <div className="h-8 w-px bg-neutral-800" />
                <div>
                    <p className="text-xs text-neutral-500 uppercase tracking-wider">Ganado</p>
                    <p className="text-lg font-bold text-emerald-400">
                        {formatCurrency(totalWon)}
                    </p>
                </div>
                <div className="h-8 w-px bg-neutral-800" />
                <div>
                    <p className="text-xs text-neutral-500 uppercase tracking-wider">Total Leads</p>
                    <p className="text-lg font-bold text-white">{localLeads.length}</p>
                </div>
            </div>

            {/* Kanban Board */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-6 overflow-x-auto pb-6">
                    {COLUMNS.map((column) => (
                        <KanbanColumnComponent
                            key={column.id}
                            column={column}
                            leads={leadsByStatus[column.id] || []}
                            onLeadClick={onLeadClick}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeLead && <DragOverlayCard lead={activeLead} />}
                </DragOverlay>
            </DndContext>
        </div>
    );
}

export default LeadsKanban;
