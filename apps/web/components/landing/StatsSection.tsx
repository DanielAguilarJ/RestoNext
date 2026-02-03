"use client";

import { m } from "framer-motion";
import { UtensilsCrossed, Receipt, Shield, Star, TrendingUp, Clock } from "lucide-react";
import { useState, useRef, useEffect, memo } from "react";
import { useInView } from "framer-motion";

// ============================================
// Animated Counter Component
// ============================================
function AnimatedCounter({ end, suffix = "", prefix = "", decimals = 0 }: {
    end: number;
    suffix?: string;
    prefix?: string;
    decimals?: number;
}) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    useEffect(() => {
        if (!isInView) return;

        const duration = 2000;
        const steps = 60;
        const increment = end / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= end) {
                setCount(end);
                clearInterval(timer);
            } else {
                setCount(current);
            }
        }, duration / steps);

        return () => clearInterval(timer);
    }, [isInView, end]);

    const displayValue = decimals > 0
        ? count.toFixed(decimals)
        : Math.floor(count).toLocaleString();

    return (
        <span ref={ref} className="tabular-nums">
            {prefix}{displayValue}{suffix}
        </span>
    );
}

// ============================================
// Stats Data
// ============================================
const stats = [
    {
        value: 500,
        suffix: "+",
        label: "Restaurantes Activos",
        sublabel: "En todo México",
        icon: UtensilsCrossed,
        color: "from-brand-500 to-orange-500",
    },
    {
        value: 10,
        suffix: "M+",
        label: "Transacciones",
        sublabel: "Procesadas este año",
        icon: Receipt,
        color: "from-blue-500 to-cyan-500",
    },
    {
        value: 99.9,
        suffix: "%",
        label: "Uptime",
        sublabel: "Disponibilidad garantizada",
        icon: Shield,
        decimals: 1,
        color: "from-emerald-500 to-teal-500",
    },
    {
        value: 4.9,
        suffix: "/5",
        label: "Rating",
        sublabel: "Satisfacción del cliente",
        icon: Star,
        decimals: 1,
        color: "from-amber-500 to-orange-500",
    },
];

// ============================================
// Stat Card Component
// ============================================
interface StatCardProps {
    stat: typeof stats[0];
    index: number;
}

const StatCard = memo(function StatCard({ stat, index }: StatCardProps) {
    const Icon = stat.icon;

    return (
        <m.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5, scale: 1.02 }}
            className="relative group"
        >
            <div className="relative text-center p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 overflow-hidden">
                {/* Background glow on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.color} mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-7 h-7 text-white" />
                </div>

                {/* Number */}
                <div className="text-4xl sm:text-5xl font-bold text-white mb-2">
                    <AnimatedCounter
                        end={stat.value}
                        suffix={stat.suffix}
                        decimals={stat.decimals || 0}
                    />
                </div>

                {/* Label */}
                <p className="text-zinc-200 font-semibold mb-1">{stat.label}</p>
                <p className="text-sm text-zinc-500">{stat.sublabel}</p>
            </div>
        </m.div>
    );
});

// ============================================
// Main Component
// ============================================
export default function StatsSection() {
    return (
        <section className="py-20 md:py-24 bg-zinc-950 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Subtle radial gradient */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-brand-500/5 rounded-full blur-[100px]" />
            </div>

            {/* Top border with gradient */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

            {/* Bottom border with gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Section Intro */}
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-12"
                >
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                        Números que{" "}
                        <span className="bg-gradient-to-r from-brand-400 to-orange-500 bg-clip-text text-transparent">
                            inspiran confianza
                        </span>
                    </h2>
                    <p className="text-zinc-400 max-w-xl mx-auto">
                        Resultados reales de restaurantes reales en toda la República Mexicana
                    </p>
                </m.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, idx) => (
                        <StatCard key={stat.label} stat={stat} index={idx} />
                    ))}
                </div>

                {/* Additional Trust Elements */}
                <m.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="mt-12 flex flex-wrap justify-center items-center gap-6 md:gap-10"
                >
                    {[
                        { icon: Clock, text: "Implementación en 24 hrs" },
                        { icon: TrendingUp, text: "ROI promedio: 3 meses" },
                    ].map(({ icon: Icon, text }) => (
                        <div key={text} className="flex items-center gap-2 text-zinc-400">
                            <Icon className="w-4 h-4 text-brand-400" />
                            <span className="text-sm font-medium">{text}</span>
                        </div>
                    ))}
                </m.div>
            </div>
        </section>
    );
}
