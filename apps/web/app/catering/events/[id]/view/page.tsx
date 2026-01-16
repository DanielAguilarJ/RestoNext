"use client";

import { Check, X, Printer, Download, MapPin, Calendar, Clock, CreditCard } from "lucide-react";

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
        <div className="min-h-screen bg-neutral-50">
            {/* Top Banner */}
            <div className="h-48 w-full bg-neutral-900 object-cover">
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-r from-neutral-900 to-neutral-800">
                    <h1 className="text-3xl font-light tracking-widest text-white uppercase">Event Proposal</h1>
                </div>
            </div>

            <div className="mx-auto max-w-4xl -translate-y-12 px-4 pb-20">
                {/* Main Card */}
                <div className="overflow-hidden rounded-xl bg-white shadow-2xl">
                    {/* Header */}
                    <div className="border-b border-neutral-100 p-8">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-neutral-900">{event.name}</h2>
                                <div className="mt-4 space-y-2 text-sm text-neutral-600">
                                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-emerald-600" /> {event.date}</div>
                                    <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-emerald-600" /> {event.time}</div>
                                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-600" /> {event.location}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-neutral-500">Proposal Valid Until</p>
                                <p className="font-semibold text-neutral-900">{event.valid_until}</p>
                                <div className="mt-4 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                                    {event.status}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Menu & Items */}
                    <div className="p-8">
                        <h3 className="mb-6 text-lg font-bold text-neutral-900">Services & Menu</h3>
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-neutral-200 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                    <th className="pb-3">Item / Service</th>
                                    <th className="pb-3 text-center">Qty</th>
                                    <th className="pb-3 text-right">Price</th>
                                    <th className="pb-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 text-sm">
                                {event.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="py-4 font-medium text-neutral-800">{item.name}</td>
                                        <td className="py-4 text-center text-neutral-600">{item.qty}</td>
                                        <td className="py-4 text-right text-neutral-600">${item.price.toFixed(2)}</td>
                                        <td className="py-4 text-right font-medium text-neutral-900">${item.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="bg-neutral-50 p-8">
                        <div className="flex flex-col items-end gap-3">
                            <div className="flex w-64 justify-between text-neutral-600">
                                <span>Subtotal</span>
                                <span>${event.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex w-64 justify-between text-neutral-600">
                                <span>IVA (16%)</span>
                                <span>${event.tax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex w-64 justify-between border-t border-neutral-200 pt-3 text-xl font-bold text-neutral-900">
                                <span>Total</span>
                                <span>${event.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between border-t border-neutral-100 p-8">
                        <div className="flex gap-4">
                            <button className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-900">
                                <Download className="h-4 w-4" /> Download PDF
                            </button>
                            <button className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-900">
                                <Printer className="h-4 w-4" /> Print
                            </button>
                        </div>
                        <div className="flex gap-4">
                            <button className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-6 py-2.5 font-medium text-red-600 transition hover:bg-red-100">
                                <X className="h-4 w-4" /> Decline
                            </button>
                            <button className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 font-medium text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 hover:shadow-xl">
                                <Check className="h-4 w-4" /> Approve Proposal
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-sm text-neutral-400">
                    <p>Powered by RestoNext MX Catering</p>
                </div>
            </div>
        </div>
    );
}
