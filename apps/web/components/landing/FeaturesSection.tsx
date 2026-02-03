"use client";

import { m, AnimatePresence } from "framer-motion";
import { UtensilsCrossed, ChefHat, Package, FileText, QrCode, BarChart3, Zap, ArrowRight, Check, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, memo } from "react";

// ============================================
// Features Data
// ============================================
const features = [
    {
        id: "pos",
        icon: UtensilsCrossed,
        title: "POS Inteligente",
        subtitle: "Punto de Venta",
        description: "Interfaz touch-friendly diseñada para velocidad. Toma pedidos en segundos, no minutos.",
        benefits: [
            "Modificadores y combos automáticos",
            "División de cuentas con un toque",
            "Propinas digitales integradas",
            "Modo offline automático",
        ],
        color: "from-blue-500 to-cyan-500",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
        image: "/feature-pos.png",
        metric: "3x más rápido",
    },
    {
        id: "kds",
        icon: ChefHat,
        title: "Kitchen Display (KDS)",
        subtitle: "Pantalla de Cocina",
        description: "Tu cocina organizada y sincronizada. Cada orden en el momento justo.",
        benefits: [
            "Tiempos de preparación en tiempo real",
            "Priorización inteligente de pedidos",
            "Alertas de pedidos retrasados",
            "Comunicación con meseros",
        ],
        color: "from-orange-500 to-red-500",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/20",
        image: "/feature-kds.png",
        metric: "-40% errores",
    },
    {
        id: "inventory",
        icon: Package,
        title: "Inventario con IA",
        subtitle: "Control de Stock",
        description: "Nunca más te quedes sin ingredientes. La IA predice lo que necesitas.",
        benefits: [
            "Descuento automático por receta",
            "Alertas de stock bajo",
            "Predicción de compras con ML",
            "Control de mermas y costos",
        ],
        color: "from-emerald-500 to-teal-500",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20",
        image: "/feature-inventory.png",
        metric: "-30% desperdicio",
    },
    {
        id: "cfdi",
        icon: FileText,
        title: "Facturación CFDI 4.0",
        subtitle: "100% SAT Válido",
        description: "Genera facturas electrónicas en segundos. Siempre al día con el SAT.",
        benefits: [
            "Timbrado instantáneo",
            "Cancelación automática",
            "Complementos de pago",
            "Reportes fiscales automáticos",
        ],
        color: "from-purple-500 to-pink-500",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/20",
        image: "/feature-cfdi.png",
        metric: "100% cumplimiento",
    },
    {
        id: "qr",
        icon: QrCode,
        title: "Menú Digital QR",
        subtitle: "Auto-servicio",
        description: "Tus clientes ordenan y pagan desde su celular. Sin esperas, sin fricciones.",
        benefits: [
            "Menú siempre actualizado",
            "Pedidos directos a cocina",
            "Upselling automático",
            "Cero contacto con meseros",
        ],
        color: "from-violet-500 to-purple-500",
        bgColor: "bg-violet-500/10",
        borderColor: "border-violet-500/20",
        image: "/feature-qr.png",
        metric: "+25% ticket promedio",
    },
    {
        id: "analytics",
        icon: BarChart3,
        title: "Analytics Avanzado",
        subtitle: "Reportes Inteligentes",
        description: "Toma decisiones basadas en datos reales, no en corazonadas.",
        benefits: [
            "Dashboard en tiempo real",
            "Top productos vendidos",
            "Análisis de tendencias",
            "Predicción de demanda",
        ],
        color: "from-amber-500 to-orange-500",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/20",
        image: "/feature-analytics.png",
        metric: "+15% utilidades",
    },
];

// ============================================
// Feature Card Component
// ============================================
interface FeatureCardProps {
    feature: typeof features[0];
    index: number;
    isActive: boolean;
    onHover: (id: string | null) => void;
}

const FeatureCard = memo(function FeatureCard({ feature, index, isActive, onHover }: FeatureCardProps) {
    const Icon = feature.icon;

    return (
        <m.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            onMouseEnter={() => onHover(feature.id)}
            onMouseLeave={() => onHover(null)}
            className="group relative"
        >
            <m.div
                whileHover={{ y: -8 }}
                transition={{ duration: 0.3 }}
                className={`relative h-full p-6 rounded-3xl bg-gradient-to-br from-zinc-900/90 to-zinc-900/50 border backdrop-blur-sm overflow-hidden transition-colors duration-300 ${isActive ? 'border-zinc-600' : 'border-zinc-800 hover:border-zinc-700'
                    }`}
            >
                {/* Background Gradient on hover */}
                <div className={`absolute inset-0 ${feature.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                {/* Shine effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                {/* Image Header */}
                <div className="relative h-44 -mx-6 -mt-6 mb-6 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent z-10" />
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} mix-blend-overlay opacity-40`} />
                    {feature.image && (
                        <Image
                            src={feature.image}
                            alt={feature.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                    )}

                    {/* Metric Badge */}
                    <div className="absolute top-4 right-4 z-20">
                        <span className="px-3 py-1.5 text-xs font-bold bg-black/60 backdrop-blur-sm text-white rounded-full border border-white/10">
                            {feature.metric}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="relative z-10">
                    {/* Icon & Title Row */}
                    <div className="flex items-start gap-4 mb-4">
                        <m.div
                            className={`shrink-0 p-3 rounded-xl bg-gradient-to-br ${feature.color} shadow-lg`}
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{ type: "spring", stiffness: 400 }}
                        >
                            <Icon className="w-6 h-6 text-white" />
                        </m.div>
                        <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                {feature.subtitle}
                            </span>
                            <h3 className="text-xl font-bold text-white group-hover:text-brand-300 transition-colors">
                                {feature.title}
                            </h3>
                        </div>
                    </div>

                    {/* Description */}
                    <p className="text-zinc-400 text-sm leading-relaxed mb-5">
                        {feature.description}
                    </p>

                    {/* Benefits List */}
                    <ul className="space-y-2 mb-6">
                        {feature.benefits.slice(0, 3).map((benefit, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                                <Check className={`w-4 h-4 shrink-0 bg-gradient-to-r ${feature.color} bg-clip-text text-transparent`}
                                    style={{ color: 'transparent', backgroundClip: 'text', WebkitBackgroundClip: 'text' }} />
                                <span>{benefit}</span>
                            </li>
                        ))}
                    </ul>

                    {/* Learn more link */}
                    <Link
                        href={`/features/${feature.id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-brand-400 hover:text-brand-300 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                    >
                        <span>Conocer más</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </m.div>
        </m.div>
    );
});

// ============================================
// Main Component
// ============================================
export default function FeaturesSection() {
    const [activeFeature, setActiveFeature] = useState<string | null>(null);

    return (
        <section id="features" className="py-24 md:py-32 bg-zinc-950 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-brand-500/5 via-transparent to-transparent rounded-full" />
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
                        <Zap className="w-4 h-4" />
                        <span>Módulos Integrados</span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                        Todo lo que necesitas,{" "}
                        <span className="bg-gradient-to-r from-brand-400 via-orange-400 to-brand-500 bg-clip-text text-transparent">
                            en una plataforma
                        </span>
                    </h2>

                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        6 módulos diseñados específicamente para restaurantes mexicanos.
                        Sin integraciones complicadas, todo funciona junto desde el día uno.
                    </p>
                </m.div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, idx) => (
                        <FeatureCard
                            key={feature.id}
                            feature={feature}
                            index={idx}
                            isActive={activeFeature === feature.id}
                            onHover={setActiveFeature}
                        />
                    ))}
                </div>

                {/* Bottom CTA */}
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mt-16 text-center"
                >
                    <div className="inline-flex flex-col sm:flex-row items-center gap-4">
                        <Link
                            href="/checkout?plan=starter"
                            className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/40 transition-all duration-300 hover:scale-105"
                        >
                            <span>Probar todos los módulos gratis</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>

                        <Link
                            href="/features"
                            className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-200 font-medium transition-colors"
                        >
                            <span>Ver documentación completa</span>
                            <ExternalLink className="w-4 h-4" />
                        </Link>
                    </div>
                </m.div>
            </div>
        </section>
    );
}
