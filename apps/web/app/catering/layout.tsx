import Link from "next/link";
import { Calendar, Users, FileText, Settings, PlusCircle } from "lucide-react";

export default function CateringLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-neutral-950 text-neutral-100">
            {/* Sidebar specific for Catering Module */}
            <aside className="w-64 border-r border-neutral-800 bg-neutral-900/50 p-4">
                <div className="mb-8 flex items-center gap-2 px-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 p-1.5 text-emerald-500">
                        <Calendar className="h-full w-full" />
                    </div>
                    <span className="text-lg font-bold text-emerald-500">Events & Catering</span>
                </div>

                <nav className="space-y-1">
                    <Link
                        href="/catering"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 hover:bg-neutral-800 hover:text-white"
                    >
                        <Calendar className="h-4 w-4" />
                        Event Calendar
                    </Link>
                    <Link
                        href="/catering/leads"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 hover:bg-neutral-800 hover:text-white"
                    >
                        <Users className="h-4 w-4" />
                        Leads & CRM
                    </Link>
                    <div className="pt-4 pb-2">
                        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-neutral-600">
                            Operational
                        </p>
                    </div>
                    <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 hover:bg-neutral-800 hover:text-white">
                        <FileText className="h-4 w-4" />
                        Production Lists
                    </button>
                    <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 hover:bg-neutral-800 hover:text-white">
                        <Settings className="h-4 w-4" />
                        Settings
                    </button>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-neutral-950 p-8">
                {children}
            </main>
        </div>
    );
}
