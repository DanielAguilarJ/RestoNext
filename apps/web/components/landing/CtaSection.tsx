"use client";

import { memo } from "react";
import { m, type Variants } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";

// ============================================
// Animation Variants
// ============================================
const containerVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: "easeOut" },
    },
};

// ============================================
// Main Component
// ============================================
function CtaSection() {
    return (
        <section
            id="cta"
            aria-labelledby="cta-heading"
            className="py-32 relative overflow-hidden bg-zinc-950"
        >
            {/* Background Decorations */}
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), 
                                     linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                    backgroundSize: "40px 40px",
                }}
                aria-hidden="true"
            />
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[800px] md:h-[800px] bg-brand-500/15 rounded-full blur-[120px] pointer-events-none"
                aria-hidden="true"
            />

            <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
                <m.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                >
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm font-medium mb-8">
                        <Star className="w-4 h-4 fill-current" aria-hidden="true" />
                        <span>Prueba gratuita de 14 días</span>
                    </div>

                    {/* Heading */}
                    <h2
                        id="cta-heading"
                        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight mb-8 leading-[1.1]"
                    >
                        ¿Listo para modernizar <br className="hidden sm:block" />
                        <span className="text-zinc-500">tu restaurante?</span>
                    </h2>

                    {/* Description */}
                    <p className="text-lg md:text-xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed">
                        Únete a cientos de restaurantes en México que ya están usando RestoNext
                        para vender más y perder menos.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link
                            href="/checkout?plan=starter"
                            className="group relative inline-flex items-center gap-3 px-8 py-4 md:px-10 md:py-5 bg-white text-zinc-950 font-bold text-base md:text-lg rounded-full hover:bg-zinc-100 transition-colors shadow-[0_0_50px_-12px_rgba(255,255,255,0.4)] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-zinc-950"
                        >
                            <span>Comenzar Ahora</span>
                            <ArrowRight
                                className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                                aria-hidden="true"
                            />
                        </Link>

                        <Link
                            href="/contact"
                            className="px-8 py-4 md:px-10 md:py-5 text-zinc-400 font-semibold hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-950 rounded-full"
                        >
                            Agendar una Demo
                        </Link>
                    </div>

                    {/* Disclaimer */}
                    <p className="mt-10 text-sm text-zinc-500">
                        No se requiere tarjeta de crédito para empezar.
                    </p>
                </m.div>
            </div>
        </section>
    );
}

export default memo(CtaSection);
