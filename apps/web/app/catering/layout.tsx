'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Users, FileText, Settings, ChefHat, ClipboardList, CalendarDays } from "lucide-react";

export default function CateringLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    // Helper function to check if a route is active
    const isActive = (href: string) => {
        if (href === '/catering') {
            return pathname === '/catering';
        }
        return pathname.startsWith(href);
    };

    // Navigation items configuration
    const navItems = [
        { href: '/catering', label: 'Calendario de Eventos', icon: CalendarDays },
        { href: '/catering/events', label: 'Todos los Eventos', icon: Calendar },
        { href: '/catering/leads', label: 'Leads & CRM', icon: Users },
    ];

    const operationalItems = [
        { href: '/catering/production', label: 'Listas de Producción', icon: ClipboardList },
        { href: '/catering/settings', label: 'Configuración', icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-neutral-950 text-neutral-100">
            {/* Sidebar specific for Catering Module */}
            <aside className="w-64 border-r border-neutral-800 bg-neutral-900/50 p-4 flex flex-col">
                <div className="mb-8 flex items-center gap-2 px-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 p-1.5 text-emerald-500">
                        <ChefHat className="h-full w-full" />
                    </div>
                    <span className="text-lg font-bold text-emerald-500">Catering</span>
                </div>

                <nav className="space-y-1 flex-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                                    ${active
                                        ? 'bg-emerald-500/10 text-emerald-500 border-l-2 border-emerald-500 -ml-0.5 pl-[14px]'
                                        : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        );
                    })}

                    <div className="pt-4 pb-2">
                        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-neutral-600">
                            Operaciones
                        </p>
                    </div>

                    {operationalItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                                    ${active
                                        ? 'bg-emerald-500/10 text-emerald-500 border-l-2 border-emerald-500 -ml-0.5 pl-[14px]'
                                        : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Back to Dashboard link */}
                <div className="pt-4 border-t border-neutral-800">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium 
                            text-neutral-500 hover:bg-neutral-800 hover:text-white transition-colors"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                        </svg>
                        Volver al Dashboard
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-neutral-950 p-8">
                {children}
            </main>
        </div>
    );
}
