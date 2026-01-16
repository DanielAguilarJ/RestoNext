"use client";

import { useState } from "react";
import { Search, Filter, Plus, Phone, Mail, MoreHorizontal } from "lucide-react";

// Mock Data
const initialLeads = [
    { id: 1, name: "Maria Gonzalez", company: "Tech Startups Inc.", event: "Annual Party", date: "Dec 15", guests: 120, status: "New", email: "maria@example.com", phone: "555-0101" },
    { id: 2, name: "John Smith", company: null, event: "Wedding Reception", date: "Jan 10, 2025", guests: 200, status: "Contacted", email: "john@example.com", phone: "555-0102" },
    { id: 3, name: "Corporate Lunch", company: "Bank of Mexico", event: "Executive Lunch", date: "Oct 30", guests: 25, status: "Quoting", email: "contact@bank.com", phone: "555-0103" },
];

const statuses = ["New", "Contacted", "Quoting", "Won", "Lost"];

export default function LeadsPage() {
    const [leads, setLeads] = useState(initialLeads);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Leads & CRM</h1>
                    <p className="text-neutral-400">Manage potential clients and upcoming opportunities</p>
                </div>
                <button className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-500">
                    <Plus className="h-4 w-4" />
                    Add Lead
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-2">
                <div className="flex flex-1 items-center gap-2 rounded-lg bg-neutral-950 px-3 py-2">
                    <Search className="h-4 w-4 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Search leads..."
                        className="w-full bg-transparent text-sm text-white focus:outline-none"
                    />
                </div>
                <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 hover:text-white">
                    <Filter className="h-4 w-4" />
                    Filter
                </button>
            </div>

            {/* Kanban Board */}
            <div className="flex gap-6 overflow-x-auto pb-6">
                {statuses.map((status) => (
                    <div key={status} className="w-80 flex-shrink-0">
                        <div className="mb-4 flex items-center justify-between px-1">
                            <span className="font-semibold text-neutral-300">{status}</span>
                            <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-500">
                                {leads.filter((l) => l.status === status).length}
                            </span>
                        </div>

                        <div className="space-y-3">
                            {leads
                                .filter((lead) => lead.status === status)
                                .map((lead) => (
                                    <div key={lead.id} className="cursor-pointer rounded-lg border border-neutral-800 bg-neutral-900 p-4 transition hover:border-neutral-700 hover:bg-neutral-800">
                                        <div className="mb-3 flex justify-between">
                                            <h3 className="font-medium text-white">{lead.name}</h3>
                                            <button className="text-neutral-500 hover:text-white"><MoreHorizontal className="h-4 w-4" /></button>
                                        </div>
                                        {lead.company && <p className="mb-2 text-xs font-medium uppercase text-emerald-500">{lead.company}</p>}
                                        <p className="mb-1 text-sm text-neutral-300">{lead.event}</p>
                                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                                            <span>{lead.date}</span>
                                            <span>•</span>
                                            <span>{lead.guests} guests</span>
                                        </div>

                                        <div className="mt-4 flex gap-2 border-t border-neutral-800 pt-3">
                                            <button className="flex h-8 w-8 items-center justify-center rounded bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white">
                                                <Phone className="h-3.5 w-3.5" />
                                            </button>
                                            <button className="flex h-8 w-8 items-center justify-center rounded bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white">
                                                <Mail className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                            <button className="flex w-full items-center justify-center rounded-lg border border-dashed border-neutral-800 py-2 text-sm text-neutral-500 hover:bg-neutral-900">
                                <Plus className="mr-2 h-3.5 w-3.5" />
                                New
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
