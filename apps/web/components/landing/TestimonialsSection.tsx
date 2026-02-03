"use client";

import { m, useMotionValue, useTransform, useSpring } from "framer-motion";
import { Users, Star, Quote, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import Image from "next/image";
import { useState, useCallback, memo } from "react";
import Link from "next/link";

// ============================================
// Testimonials Data
// ============================================
const testimonials = [
    {
        name: "María González",
        role: "Dueña",
        company: "Tacos El Patrón",
        location: "CDMX",
        content: "RestoNext revolucionó mi negocio. Antes tardaba 2 horas en cuadrar caja, ahora 10 minutos. La facturación automática es un sueño. En solo 3 meses aumentamos ventas un 25%.",
        rating: 5,
        image: "/testimonial-maria.png",
        highlight: "Ahorra 2 horas diarias",
        metric: "+25% ventas",
    },
    {
        name: "Roberto Hernández",
        role: "Gerente General",
        company: "Mariscos Costa Azul",
        location: "Cancún",
        content: "El KDS en cocina eliminó los errores de comandas por completo. Mis cocineros aman la pantalla y los clientes reciben su comida más rápido. El ROI fue inmediato.",
        rating: 5,
        image: "/testimonial-roberto.png",
        highlight: "0 errores en comandas",
        metric: "-15 min entrega",
    },
    {
        name: "Ana Torres",
        role: "Administradora",
        company: "Café Central",
        location: "Guadalajara",
        content: "La predicción de inventario con IA nos ha ahorrado miles de pesos en desperdicio. Antes tirábamos producto cada semana, ahora casi nada. Súper recomendado.",
        rating: 5,
        image: "/testimonial-ana.png",
        highlight: "IA que ahorra dinero",
        metric: "-40% desperdicio",
    },
    {
        name: "Carlos Mendoza",
        role: "Propietario",
        company: "Pizzería Don Carlo - 5 sucursales",
        location: "Monterrey",
        content: "El menú QR fue un éxito instantáneo. Nuestros clientes ordenan más rápido, nosotros procesamos más pedidos por hora y la satisfacción se disparó.",
        rating: 5,
        image: "/testimonial-carlos.png",
        highlight: "Auto-servicio QR",
        metric: "+30% pedidos/hora",
    },
    {
        name: "Laura Jiménez",
        role: "Gerente de Operaciones",
        company: "Sushi Express - Franquicia",
        location: "Puebla",
        content: "La integración con Stripe nos simplificó todo. Pagos en línea, propinas digitales, todo automático. Nuestro equipo puede enfocarse en atender clientes.",
        rating: 5,
        image: "/testimonial-laura.png",
        highlight: "Pagos sin fricciones",
        metric: "+20% propinas",
    },
];

// ============================================
// Testimonial Card Component
// ============================================
interface TestimonialCardProps {
    testimonial: typeof testimonials[0];
    index: number;
}

const TestimonialCard = memo(function TestimonialCard({ testimonial, index }: TestimonialCardProps) {
    return (
        <m.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="flex-shrink-0 w-[340px] md:w-[400px] snap-center group"
        >
            <div className="relative h-full p-6 md:p-8 rounded-3xl bg-gradient-to-br from-zinc-800/60 via-zinc-900/80 to-zinc-900 border border-zinc-700/50 backdrop-blur-sm hover:border-zinc-600/50 transition-all duration-300">
                {/* Quote Icon */}
                <div className="absolute -top-3 -left-1 w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-orange-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
                    <Quote className="w-4 h-4 text-white" />
                </div>

                {/* Metric Badge */}
                <div className="absolute -top-3 right-6">
                    <span className="px-3 py-1.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                        {testimonial.metric}
                    </span>
                </div>

                {/* Stars */}
                <div className="flex gap-1 mb-4 pt-2">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                </div>

                {/* Content */}
                <p className="text-zinc-200 leading-relaxed mb-6 text-sm md:text-base">
                    "{testimonial.content}"
                </p>

                {/* Highlight Tag */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-medium mb-6">
                    <Star className="w-3 h-3" />
                    {testimonial.highlight}
                </div>

                {/* Author */}
                <div className="flex items-center gap-4">
                    <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-brand-500/30 ring-offset-2 ring-offset-zinc-900">
                        {testimonial.image ? (
                            <Image
                                src={testimonial.image}
                                alt={testimonial.name}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-brand-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                                {testimonial.name.split(' ').map(n => n[0]).join('')}
                            </div>
                        )}
                    </div>
                    <div>
                        <h4 className="text-white font-bold">{testimonial.name}</h4>
                        <p className="text-sm text-brand-400">{testimonial.role}</p>
                        <p className="text-xs text-zinc-500">{testimonial.company} • {testimonial.location}</p>
                    </div>
                </div>
            </div>
        </m.div>
    );
});

// ============================================
// Company Logos Section
// ============================================
const CompanyLogos = memo(function CompanyLogos() {
    const companies = [
        "Tacos El Patrón",
        "Mariscos Costa Azul",
        "Café Central",
        "Pizzería Don Carlo",
        "Sushi Express",
    ];

    return (
        <div className="mt-16 pt-16 border-t border-zinc-800">
            <p className="text-center text-sm text-zinc-500 mb-8">
                Empresas que confían en RestoNext
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
                {companies.map((company) => (
                    <div
                        key={company}
                        className="px-6 py-3 rounded-xl bg-zinc-800/30 border border-zinc-700/30 text-zinc-400 font-medium text-sm hover:text-zinc-200 hover:border-zinc-600/50 transition-all duration-300"
                    >
                        {company}
                    </div>
                ))}
            </div>
        </div>
    );
});

// ============================================
// Main Component
// ============================================
export default function TestimonialsSection() {
    return (
        <section className="py-24 md:py-32 bg-zinc-900 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-500/5 via-transparent to-transparent" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-500/5 rounded-full blur-[150px]" />
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 font-semibold text-sm uppercase tracking-wider mb-6">
                        <Users className="w-4 h-4" />
                        <span>Historias de Éxito</span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                        Lo que dicen{" "}
                        <span className="bg-gradient-to-r from-brand-400 to-orange-500 bg-clip-text text-transparent">
                            nuestros clientes
                        </span>
                    </h2>

                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        Más de 500 restaurantes en México ya transformaron su operación con RestoNext
                    </p>
                </m.div>

                {/* Stats Row */}
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16"
                >
                    {[
                        { value: "500+", label: "Restaurantes" },
                        { value: "4.9/5", label: "Calificación" },
                        { value: "98%", label: "Retención" },
                        { value: "2hrs", label: "Ahorro diario promedio" },
                    ].map((stat, idx) => (
                        <div key={idx} className="text-center p-6 rounded-2xl bg-zinc-800/30 border border-zinc-700/30">
                            <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
                            <div className="text-sm text-zinc-400">{stat.label}</div>
                        </div>
                    ))}
                </m.div>

                {/* Testimonials Carousel */}
                <div className="relative">
                    {/* Fade edges */}
                    <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-zinc-900 to-transparent z-10 pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-zinc-900 to-transparent z-10 pointer-events-none" />

                    <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide px-8 -mx-4">
                        {testimonials.map((testimonial, idx) => (
                            <TestimonialCard key={testimonial.name} testimonial={testimonial} index={idx} />
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mt-12"
                >
                    <Link
                        href="/checkout?plan=starter"
                        className="group inline-flex items-center gap-2 text-brand-400 font-semibold hover:text-brand-300 transition-colors"
                    >
                        <span>Únete a ellos hoy</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </m.div>

                {/* Company Logos */}
                <CompanyLogos />
            </div>
        </section>
    );
}
