"use client";

import { Check, X, Printer, Download, MapPin, Calendar, Clock, CreditCard, ChefHat, FileText } from "lucide-react";

export default function EventViewPage({ params }: { params: { id: string } }) {
    // Mock Data
    const event = {
        name: "Wedding Reception: Sarah & Mike",
        date: "October 24, 2024",
        time: "4:00 PM - 11:00 PM",
        location: "Grand Ballroom, Hotel Lux",
        guests: 150,
        status: "Quote Sent",
        valid_until: "Oct 15, 2024",
        items: [
            { name: "Appetizer Selection (3 pcs)", qty: 150, price: 120, total: 18000 },
            { name: "Premium Plated Dinner", qty: 150, price: 450, total: 67500 },
            { name: "Open Bar (4 hours)", qty: 150, price: 350, total: 52500 },
            { name: "Service Staff (10)", qty: 7, price: 1200, total: 8400 },
            { name: "Venue Rental", qty: 1, price: 15000, total: 15000 },
        ],
        subtotal: 161400,
        tax: 25824,
        total: 187224
    };

    return (
        <div className="min-h-screen bg-mesh text-gray-900 dark:text-gray-100 p-6">
            {/* Top Banner / Breadcrumb area could go here */}

            <div className="mx-auto max-w-4xl relative">
                {/* Dossier Folder Effect Tab */}
                <div className="absolute -top-10 left-0 bg-brand-600 text-white px-6 py-2 rounded-t-xl font-mono text-sm tracking-wider shadow-lg flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    EXPEDIENTE #{params.id.slice(0, 8).toUpperCase()}
                </div>

                {/* Main Card */}
                <div className="glass overflow-hidden rounded-2xl shadow-2xl border-t-8 border-brand-600 relative">
                    {/* Watermark/Background decoration */}
                    <div className="absolute top-0 right-0 p-20 opacity-[0.03] pointer-events-none">
                        <ChefHat className="w-96 h-96" />
                    </div>

                    {/* Header */}
                    <div className="border-b border-black/10 dark:border-white/10 p-8 relative z-10">
                        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                            <div>
                                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-brand-400 dark:from-brand-400 dark:to-brand-200">
                                    {event.name}
                                </h2>
                                <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-black/5 dark:bg-white/10">
                                            <Calendar className="h-4 w-4 text-brand-500" />
                                        </div>
                                        {event.date}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-black/5 dark:bg-white/10">
                                            <Clock className="h-4 w-4 text-brand-500" />
                                        </div>
                                        {event.time}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-black/5 dark:bg-white/10">
                                            <MapPin className="h-4 w-4 text-brand-500" />
                                        </div>
                                        {event.location}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right glass-subtle p-4 rounded-xl border border-black/5 dark:border-white/5">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Estado del Evento</p>
                                <div className="inline-flex items-center rounded-lg bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 text-sm font-bold text-blue-700 dark:text-blue-300">
                                    {event.status}
                                </div>
                                <p className="text-xs text-gray-400 mt-2">Válido hasta: <span className="text-gray-600 dark:text-gray-300 font-medium">{event.valid_until}</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Menu & Items */}
                    <div className="p-8 relative z-10">
                        <h3 className="mb-6 text-xl font-bold flex items-center gap-2">
                            <ChefHat className="w-5 h-5 text-gray-400" />
                            Servicios y Menú
                        </h3>
                        <div className="overflow-hidden rounded-xl border border-black/5 dark:border-white/5">
                            <table className="w-full">
                                <thead className="bg-black/5 dark:bg-white/5">
                                    <tr className="text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                                        <th className="py-4 px-6">Concepto</th>
                                        <th className="py-4 px-6 text-center">Cant</th>
                                        <th className="py-4 px-6 text-right">Precio Unit.</th>
                                        <th className="py-4 px-6 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5 dark:divide-white/5 text-sm">
                                    {event.items.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                            <td className="py-4 px-6 font-medium text-gray-900 dark:text-white">{item.name}</td>
                                            <td className="py-4 px-6 text-center text-gray-600 dark:text-gray-400">{item.qty}</td>
                                            <td className="py-4 px-6 text-right text-gray-600 dark:text-gray-400">${item.price.toFixed(2)}</td>
                                            <td className="py-4 px-6 text-right font-bold text-gray-900 dark:text-white">${item.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="bg-black/5 dark:bg-white/5 p-8 relative z-10">
                        <div className="flex flex-col items-end gap-3">
                            <div className="flex w-64 justify-between text-gray-600 dark:text-gray-400">
                                <span>Subtotal</span>
                                <span>${event.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex w-64 justify-between text-gray-600 dark:text-gray-400">
                                <span>IVA (16%)</span>
                                <span>${event.tax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex w-64 justify-between border-t border-black/10 dark:border-white/10 pt-4 text-2xl font-bold text-gray-900 dark:text-white">
                                <span>Total</span>
                                <span className="text-brand-500">${event.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-center justify-between border-t border-black/10 dark:border-white/10 p-8 gap-4 relative z-10">
                        <div className="flex gap-4 w-full sm:w-auto">
                            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl border border-black/10 dark:border-white/10 px-5 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 transition hover:bg-black/5 dark:hover:bg-white/5 touch-target">
                                <Download className="h-4 w-4" /> PDF
                            </button>
                            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl border border-black/10 dark:border-white/10 px-5 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 transition hover:bg-black/5 dark:hover:bg-white/5 touch-target">
                                <Printer className="h-4 w-4" /> Print
                            </button>
                        </div>
                        <div className="flex gap-4 w-full sm:w-auto">
                            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 px-6 py-3 font-medium text-red-600 dark:text-red-400 transition hover:bg-red-100 dark:hover:bg-red-900/40 touch-target">
                                <X className="h-4 w-4" /> Rechazar
                            </button>
                            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-3 font-medium text-white shadow-lg shadow-brand-500/25 transition hover:shadow-xl hover:-translate-y-0.5 touch-target">
                                <Check className="h-4 w-4" /> Aprobar Propuesta
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                    Powered by RestoNext MX Catering
                </div>
            </div>
        </div>
    );
}
