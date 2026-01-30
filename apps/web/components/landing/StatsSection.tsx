"use client";

import { m } from "framer-motion";
import { UtensilsCrossed, Receipt, Shield, Star } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useInView } from "framer-motion";

// ============================================
// Animated Counter Component
// ============================================
function AnimatedCounter({ end, suffix = "", prefix = "" }: { end: number; suffix?: string; prefix?: string }) {
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
                setCount(Math.floor(current));
            }
        }, duration / steps);

        return () => clearInterval(timer);
    }, [isInView, end]);

    return (
        <span ref={ref} className="tabular-nums">
            {prefix}{count.toLocaleString()}{suffix}
        </span>
    );
}

// ============================================
// Stats Section
// ============================================
export default function StatsSection() {
    const stats = [
        { value: 500, suffix: "+", label: "Restaurantes", icon: UtensilsCrossed },
        { value: 10, suffix: "M+", label: "Transacciones", icon: Receipt },
        { value: 99.9, suffix: "%", label: "Uptime", icon: Shield },
        { value: 4.9, suffix: "/5", label: "Rating", icon: Star },
    ];

    return (
        <section className="py-20 bg-zinc-950 border-y border-zinc-800/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {stats.map((stat, idx) => (
                        <m.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="text-center group"
                        >
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500/20 to-brand-600/10 border border-brand-500/20 mb-4 group-hover:scale-110 transition-transform">
                                <stat.icon className="w-6 h-6 text-brand-400" />
                            </div>
                            <div className="text-4xl sm:text-5xl font-bold text-white mb-2">
                                <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                            </div>
                            <p className="text-zinc-500 font-medium">{stat.label}</p>
                        </m.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
