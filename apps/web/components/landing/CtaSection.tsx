"use client";

import { memo } from "react";
import { m, type Variants } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Star, Check, Clock, Headphones, Zap, Shield, Users } from "lucide-react";

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

const floatVariants: Variants = {
    animate: {
        y: [-10, 10, -10],
        transition: { duration: 6, repeat: Infinity, ease: "easeInOut" }
    }
};

// ============================================
// Floating Testimonial Card
// ============================================
const FloatingTestimonial = memo(function FloatingTestimonial() {
    return (
        <m.div
            variants={floatVariants}
            animate="animate"
            className="absolute -left-4 md:left-10 top-1/2 -translate-y-1/2 hidden lg:block"
        >
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 backdrop-blur-sm shadow-xl max-w-[280px]">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-orange-500 flex items-center justify-center text-white font-bold">
                        MG
                    </div>
                    <div>
                        <p className="text-sm font-medium text-white">María González</p>
                        <p className="text-xs text-zinc-500">Tacos El Patrón</p>
                    </div>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">
                    "En 2 semanas recuperamos la inversión. Ahora facturamos 30% más."
                </p>
                <div className="flex gap-0.5 mt-2">
                    {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                    ))}
                </div>
            </div>
        </m.div>
    );
});

// ============================================
// Floating Stats Card
// ============================================
const FloatingStats = memo(function FloatingStats() {
    return (
        <m.div
            variants={floatVariants}
            animate="animate"
            style={{ animationDelay: "2s" }}
            className="absolute -right-4 md:right-10 top-1/2 -translate-y-1/2 hidden lg:block"
        >
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 backdrop-blur-sm shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5 text-brand-400" />
                    <span className="text-sm font-medium text-zinc-200">Clientes felices</span>
                </div>
                <div className="text-3xl font-bold text-white mb-1">500+</div>
                <div className="text-xs text-emerald-400 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    +45 este mes
                </div>
            </div>
        </m.div>
    );
});

// ============================================
// Main Component
// ============================================
function CtaSection() {
    return (
        <section
            id="cta"
            aria-labelledby="cta-heading"
            className="py-32 md:py-40 relative overflow-hidden bg-zinc-950"
        >
            {/* Background Decorations */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Grid */}
                <div
                    className="absolute inset-0 opacity-[0.02]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), 
                                         linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                        backgroundSize: "40px 40px",
                    }}
                />

                {/* Large gradient orb */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] md:w-[1200px] md:h-[1200px]">
                    <div className="absolute inset-0 bg-brand-500/10 rounded-full blur-[150px]" />
                    <m.div
                        className="absolute inset-[100px] bg-purple-500/10 rounded-full blur-[100px]"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 8, repeat: Infinity }}
                    />
                </div>
            </div>

            {/* Floating Elements */}
            <FloatingTestimonial />
            <FloatingStats />

            <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
                <m.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                >
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-brand-500/20 to-purple-500/20 border border-brand-500/30 text-brand-300 text-sm font-semibold mb-8">
                        <m.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        >
                            <Star className="w-4 h-4 fill-current" />
                        </m.div>
                        <span>Únete a 500+ restaurantes exitosos</span>
                    </div>

                    {/* Heading */}
                    <h2
                        id="cta-heading"
                        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight mb-6 leading-[1.1]"
                    >
                        ¿Listo para{" "}
                        <span className="bg-gradient-to-r from-brand-400 via-orange-400 to-purple-400 bg-clip-text text-transparent">
                            transformar
                        </span>
                        <br className="hidden sm:block" />
                        tu restaurante?
                    </h2>

                    {/* Description */}
                    <p className="text-lg md:text-xl text-zinc-400 mb-8 max-w-2xl mx-auto leading-relaxed">
                        En solo 5 minutos tendrás tu sistema funcionando.
                        Sin complicaciones, sin contratos, sin riesgos.
                    </p>

                    {/* Value Props */}
                    <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-12">
                        {[
                            { icon: Clock, text: "Setup en 5 minutos" },
                            { icon: Shield, text: "14 días gratis" },
                            { icon: Headphones, text: "Soporte incluido" },
                        ].map(({ icon: Icon, text }) => (
                            <div key={text} className="flex items-center gap-2 text-zinc-300">
                                <Icon className="w-4 h-4 text-emerald-400" />
                                <span className="text-sm font-medium">{text}</span>
                            </div>
                        ))}
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link
                            href="/checkout?plan=starter"
                            className="group relative inline-flex items-center gap-3 px-10 py-5 bg-white text-zinc-950 font-bold text-lg rounded-2xl hover:bg-zinc-100 transition-all duration-300 shadow-[0_0_60px_-10px_rgba(255,255,255,0.5)] hover:shadow-[0_0_80px_-10px_rgba(255,255,255,0.6)] focus:outline-none focus:ring-4 focus:ring-white/30"
                        >
                            <span>Comenzar Ahora — Es Gratis</span>
                            <ArrowRight
                                className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                            />
                        </Link>

                        <Link
                            href="/contact"
                            className="group inline-flex items-center gap-2 px-8 py-5 text-zinc-300 font-semibold hover:text-white transition-colors rounded-2xl border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50"
                        >
                            <Headphones className="w-5 h-5 text-zinc-500 group-hover:text-brand-400 transition-colors" />
                            <span>Hablar con Ventas</span>
                        </Link>
                    </div>

                    {/* Micro-conversions */}
                    <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-zinc-500">
                        {[
                            "No se requiere tarjeta",
                            "Cancela cuando quieras",
                            "Migración gratuita",
                        ].map((text) => (
                            <span key={text} className="flex items-center gap-1">
                                <Check className="w-4 h-4 text-emerald-500" />
                                {text}
                            </span>
                        ))}
                    </div>
                </m.div>
            </div>

            {/* Bottom Gradient Line */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />
        </section>
    );
}

export default memo(CtaSection);
