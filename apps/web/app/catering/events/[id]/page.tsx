"use client";

import { useState } from "react";
import { ArrowLeft, ChefHat, FileText, DollarSign, Calendar, Clock, MapPin, Download } from "lucide-react";
import Link from "next/link";

export default function EventDetailsPage({ params }: { params: { id: string } }) {
    const [activeTab, setActiveTab] = useState("overview");

    return (
        <div className="space-y-6">
            <Link href="/catering" className="flex items-center gap-2 text-sm text-neutral-500 hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Back to Calendar
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-white">Wedding: Sarah & Mike</h1>
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-500">Confirmed</span>
                    </div>
                    <div className="mt-2 flex items-center gap-6 text-sm text-neutral-400">
                        <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Oct 24, 2024</div>
                        <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> 16:00 - 23:00</div>
                        <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Grand Ballroom</div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">Edit Details</button>
                    <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">Actions</button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-neutral-800">
                <nav className="flex gap-6">
                    <button
                        onClick={() => setActiveTab("overview")}
                        className={`border-b-2 pb-3 text-sm font-medium transition ${activeTab === "overview" ? "border-emerald-500 text-white" : "border-transparent text-neutral-500 hover:text-neutral-300"}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab("menu")}
                        className={`border-b-2 pb-3 text-sm font-medium transition ${activeTab === "menu" ? "border-emerald-500 text-white" : "border-transparent text-neutral-500 hover:text-neutral-300"}`}
                    >
                        Menu & Food
                    </button>
                    <button
                        onClick={() => setActiveTab("beo")}
                        className={`border-b-2 pb-3 text-sm font-medium transition ${activeTab === "beo" ? "border-emerald-500 text-white" : "border-transparent text-neutral-500 hover:text-neutral-300"}`}
                    >
                        BEO & Logistics
                    </button>
                    <button
                        onClick={() => setActiveTab("finance")}
                        className={`border-b-2 pb-3 text-sm font-medium transition ${activeTab === "finance" ? "border-emerald-500 text-white" : "border-transparent text-neutral-500 hover:text-neutral-300"}`}
                    >
                        Quote & Billing
                    </button>
                </nav>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {activeTab === "overview" && (
                    <div className="grid grid-cols-3 gap-6">
                        <div className="col-span-2 space-y-6">
                            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
                                <h3 className="mb-4 font-semibold text-white">Event Timeline</h3>
                                {/* Mock Timeline */}
                                <div className="space-y-4 border-l-2 border-neutral-800 pl-4">
                                    <div className="relative">
                                        <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-emerald-500"></div>
                                        <p className="text-sm font-bold text-white">14:00 - Setup Access</p>
                                        <p className="text-sm text-neutral-500">Staff arrival and room preparation</p>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-neutral-700"></div>
                                        <p className="text-sm font-bold text-white">16:00 - Guest Arrival / Cocktail</p>
                                        <p className="text-sm text-neutral-500">Lobby area. Passed appetizers.</p>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-neutral-700"></div>
                                        <p className="text-sm font-bold text-white">18:00 - Dinner Service</p>
                                        <p className="text-sm text-neutral-500">3-Course Plated Dinner</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
                                <h3 className="mb-4 font-semibold text-white">Client Info</h3>
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800 text-lg font-bold text-white">SG</div>
                                <p className="mt-2 font-medium text-white">Sarah Green</p>
                                <p className="text-sm text-neutral-500">sarah@example.com</p>
                                <p className="text-sm text-neutral-500">+52 55 1234 5678</p>
                                <button className="mt-4 w-full rounded-lg border border-neutral-700 py-2 text-sm text-white hover:bg-neutral-800">View CRM Profile</button>
                            </div>

                            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
                                <h3 className="mb-4 font-semibold text-white">Quick Actions</h3>
                                <div className="space-y-2">
                                    <button className="flex w-full items-center gap-3 rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white">
                                        <Download className="h-4 w-4" /> Download BEO (PDF)
                                    </button>
                                    <button className="flex w-full items-center gap-3 rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white">
                                        <ChefHat className="h-4 w-4" /> Production List
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Placeholders for other tabs */}
                {activeTab === "menu" && (
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-12 text-center">
                        <ChefHat className="mx-auto mb-4 h-12 w-12 text-neutral-700" />
                        <h3 className="text-lg font-medium text-white">Menu Selection</h3>
                        <p className="text-neutral-500">Select items from your existing menu to build this event's offering.</p>
                        <button className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white">Add Menu Items</button>
                    </div>
                )}
            </div>
        </div>
    );
}
