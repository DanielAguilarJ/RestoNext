import { Plus } from "lucide-react";

export default function CateringPage() {
    // Placeholder for real events data
    const upcomingEvents = [
        { id: 1, name: "Wedding: Sarah & Mike", date: "Oct 24, 2024", guests: 150, status: "Confirmed" },
        { id: 2, name: "TechCorp Annual Dinner", date: "Nov 02, 2024", guests: 80, status: "Quote Sent" },
        { id: 3, name: "Birthday: Julian 30th", date: "Nov 05, 2024", guests: 40, status: "Draft" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Event Calendar</h1>
                    <p className="text-neutral-400">View and manage upcoming events</p>
                </div>
                <button className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-500">
                    <Plus className="h-4 w-4" />
                    New Event
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                    <p className="text-sm font-medium text-neutral-500">Upcoming Events</p>
                    <p className="mt-1 text-2xl font-bold text-white">12</p>
                </div>
                <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                    <p className="text-sm font-medium text-neutral-500">Pending Quotes</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-500">5</p>
                </div>
                <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                    <p className="text-sm font-medium text-neutral-500">Projected Revenue</p>
                    <p className="mt-1 text-2xl font-bold text-white">$45,200</p>
                </div>
                <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                    <p className="text-sm font-medium text-neutral-500">Active Leads</p>
                    <p className="mt-1 text-2xl font-bold text-amber-500">28</p>
                </div>
            </div>

            {/* Calendar Area (Placeholder) */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 min-h-[500px]">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">October 2024</h2>
                    <div className="flex gap-2">
                        <button className="rounded-lg border border-neutral-700 px-3 py-1 text-sm text-neutral-300 hover:bg-neutral-800">Week</button>
                        <button className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1 text-sm text-white">Month</button>
                    </div>
                </div>

                {/* Simple List for now instead of full calendar grid */}
                <div className="space-y-3">
                    {upcomingEvents.map((event) => (
                        <div key={event.id} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950 p-4 hover:border-neutral-700">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-neutral-800 text-center">
                                    <span className="text-xs font-bold uppercase text-neutral-500">{event.date.split(" ")[0]}</span>
                                    <span className="font-bold text-white">{event.date.split(" ")[1].replace(",", "")}</span>
                                </div>
                                <div>
                                    <h3 className="font-medium text-white">{event.name}</h3>
                                    <p className="text-sm text-neutral-500">{event.guests} Guests</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`rounded-full px-3 py-1 text-xs font-medium ${event.status === "Confirmed" ? "bg-emerald-500/10 text-emerald-500" :
                                        event.status === "Quote Sent" ? "bg-blue-500/10 text-blue-500" :
                                            "bg-neutral-500/10 text-neutral-500"
                                    }`}>
                                    {event.status}
                                </span>
                                <button className="text-sm font-medium text-neutral-400 hover:text-white">View</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
