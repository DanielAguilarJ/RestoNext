"use client";

import { m } from "framer-motion";
import { Users, Star } from "lucide-react";
import Image from "next/image";

// ============================================
// Testimonials Section
// ============================================
const testimonials = [
    {
        name: "María González",
        role: "Dueña",
        company: "Tacos El Patrón",
        content: "RestoNext revolucionó mi negocio. Antes tardaba 2 horas en cuadrar caja, ahora 10 minutos. La facturación automática es un sueño.",
        rating: 5,
        image: "/testimonial-maria.png",
    },
    {
        name: "Roberto Hernández",
        role: "Gerente",
        company: "Mariscos Costa Azul",
        content: "El KDS en cocina eliminó los errores de comandas. Mis cocineros aman la pantalla y los clientes reciben su comida más rápido.",
        rating: 5,
        image: "/testimonial-roberto.png",
    },
    {
        name: "Ana Torres",
        role: "Administradora",
        company: "Café Central",
        content: "La predicción de inventario con IA nos ha ahorrado miles de pesos en desperdicio. Súper recomendado.",
        rating: 5,
        image: "/testimonial-ana.png",
    },
    {
        name: "Carlos Mendoza",
        role: "Propietario",
        company: "Pizzería Don Carlo",
        content: "El menú QR fue un éxito instantáneo. Nuestros clientes ordenan más rápido y nosotros procesamos más pedidos por hora.",
        rating: 5,
        image: "/testimonial-carlos.png",
    },
    {
        name: "Laura Jiménez",
        role: "Gerente General",
        company: "Sushi Express",
        content: "La integración con Stripe nos simplificó los pagos. Todo automático, sin errores. Increíble servicio.",
        rating: 5,
        image: "/testimonial-laura.png",
    },
];

export default function TestimonialsSection() {
    return (
        <section className="py-24 bg-zinc-900 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-500/5 via-transparent to-transparent" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 font-semibold text-sm uppercase tracking-wider mb-4">
                        <Users className="w-4 h-4" />
                        Testimonios
                    </span>
                    <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
                        Lo que dicen nuestros clientes
                    </h2>
                </m.div>

                {/* Testimonials Carousel */}
                <div className="relative">
                    <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide">
                        {testimonials.map((testimonial, idx) => (
                            <m.div
                                key={testimonial.name}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="flex-shrink-0 w-[350px] snap-center"
                            >
                                <div className="relative p-8 rounded-3xl bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border border-zinc-700/50 backdrop-blur-sm h-full">
                                    {/* Quote mark */}
                                    <div className="absolute -top-2 left-6 text-6xl font-serif text-brand-500/30 leading-none">"</div>

                                    {/* Stars */}
                                    <div className="flex gap-1 mb-4 relative z-10">
                                        {Array.from({ length: testimonial.rating }).map((_, i) => (
                                            <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                                        ))}
                                    </div>

                                    {/* Content */}
                                    <p className="text-zinc-300 leading-relaxed mb-6 relative z-10">
                                        {testimonial.content}
                                    </p>

                                    {/* Author */}
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 shadow-lg shadow-brand-500/30 relative">
                                            {testimonial.image ? (
                                                <Image
                                                    src={testimonial.image}
                                                    alt={testimonial.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-zinc-700 flex items-center justify-center text-zinc-500">
                                                    <Users className="w-6 h-6" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold">{testimonial.name}</h4>
                                            <p className="text-sm text-brand-400">{testimonial.role}</p>
                                            <p className="text-xs text-zinc-500">{testimonial.company}</p>
                                        </div>
                                    </div>
                                </div>
                            </m.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
