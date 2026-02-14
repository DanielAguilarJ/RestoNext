"use client";

import { m, AnimatePresence } from "framer-motion";
import {
    UtensilsCrossed, ChefHat, Package, FileText, QrCode, BarChart3,
    Zap, ArrowRight, Check, X, TrendingUp, Clock, Shield,
    Smartphone, Wifi, Users, DollarSign, Target, Lightbulb,
    RefreshCw, AlertTriangle, Receipt, Globe, ShoppingCart,
    PieChart, Activity, CalendarCheck, Layers, Settings,
    CreditCard, Bell, Timer, Truck, Ruler
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useCallback, useEffect, memo } from "react";

// ============================================
// Types
// ============================================
interface UseCase {
    icon: React.ElementType;
    title: string;
    description: string;
}

interface Stat {
    label: string;
    value: string;
    description: string;
}

interface Highlight {
    icon: React.ElementType;
    title: string;
    description: string;
}

interface Feature {
    id: string;
    icon: React.ElementType;
    title: string;
    subtitle: string;
    description: string;
    benefits: string[];
    color: string;
    bgColor: string;
    borderColor: string;
    image: string;
    metric: string;
    longDescription: string;
    useCases: UseCase[];
    stats: Stat[];
    highlights: Highlight[];
}

// ============================================
// Features Data with Detailed Content
// ============================================
const features: Feature[] = [
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
        longDescription: "Nuestro POS fue creado desde cero pensando en la velocidad del servicio en restaurantes mexicanos. Maneja combos de desayunos, modificadores complejos para tacos y platillos a la carta, y divide cuentas entre 2 o 20 comensales sin perder un solo detalle. Todo funciona incluso sin internet — tu operación nunca se detiene.",
        useCases: [
            {
                icon: Clock,
                title: "Servicio rápido en hora pico",
                description: "Los meseros toman pedidos complejos desde la mesa en menos de 30 segundos, incluyendo modificadores y notas especiales de cocina.",
            },
            {
                icon: Users,
                title: "Cuentas separadas sin dolor",
                description: "Divide cuentas por persona, por platillo o por porcentaje. Cada comensal paga exactamente lo suyo, con su propia propina.",
            },
            {
                icon: Wifi,
                title: "Modo offline inteligente",
                description: "Si se cae el internet, el POS sigue funcionando sin interrupciones. Al reconectarse, sincroniza todo automáticamente en segundo plano.",
            },
            {
                icon: CreditCard,
                title: "Pagos múltiples en una orden",
                description: "Acepta efectivo, tarjeta, transferencia SPEI y vales de despensa en la misma cuenta. Calcula cambios y propinas al instante.",
            },
        ],
        stats: [
            { label: "Velocidad de pedido", value: "3x", description: "más rápido que sistemas tradicionales" },
            { label: "Errores en pedidos", value: "-85%", description: "reducción con confirmaciones visuales" },
            { label: "Tiempo de capacitación", value: "15 min", description: "para que un mesero nuevo opere el sistema" },
        ],
        highlights: [
            {
                icon: Smartphone,
                title: "Diseño Touch-First",
                description: "Botones grandes, gestos intuitivos y flujo de pedido optimizado para pantallas táctiles.",
            },
            {
                icon: Layers,
                title: "Combos y Modificadores",
                description: "Configura combos de desayuno, media carta, modificadores por grupo y extras con cargo automático.",
            },
            {
                icon: DollarSign,
                title: "Propinas Digitales",
                description: "Sugiere propinas del 10%, 15% o 20% automáticamente. El cliente elige y se registra al instante.",
            },
            {
                icon: Shield,
                title: "Cortes de Caja Blindados",
                description: "Cortes parciales y finales con desglose por tipo de pago, mesero y turno. Imposible de manipular.",
            },
        ],
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
        longDescription: "El KDS elimina los tickets de papel y transforma tu cocina en una línea de producción organizada. Cada estación ve exactamente lo que debe preparar, con tiempos visibles y alertas automáticas. Los pedidos se priorizan inteligentemente para que la comida salga caliente y completa, reduciendo drásticamente los errores de comunicación entre meseros y cocina.",
        useCases: [
            {
                icon: Timer,
                title: "Control de tiempos por platillo",
                description: "Cada platillo muestra su tiempo estimado de preparación. Cuando se excede, la pantalla cambia de color y alerta al jefe de cocina.",
            },
            {
                icon: Layers,
                title: "Estaciones separadas",
                description: "Configura pantallas por estación: parrilla, fría, postres, barra. Cada cocinero ve solo lo que le toca preparar.",
            },
            {
                icon: Bell,
                title: "Alertas y notificaciones",
                description: "Alerta sonora cuando llega un nuevo pedido, cuando un platillo tarda demasiado o cuando toda la orden está lista para servir.",
            },
            {
                icon: RefreshCw,
                title: "Sincronización al instante",
                description: "Las modificaciones del mesero llegan en menos de 1 segundo a la pantalla de cocina. Cancelaciones y cambios se reflejan al instante.",
            },
        ],
        stats: [
            { label: "Errores de cocina", value: "-40%", description: "menos platillos devueltos por error" },
            { label: "Tiempo de entrega", value: "-25%", description: "reducción en tiempo promedio de servicio" },
            { label: "Comunicación", value: "0", description: "gritos necesarios entre salón y cocina" },
        ],
        highlights: [
            {
                icon: Activity,
                title: "Monitoreo en Tiempo Real",
                description: "Dashboards de rendimiento de cocina: platillos por hora, tiempos promedio y cuellos de botella.",
            },
            {
                icon: Target,
                title: "Priorización Inteligente",
                description: "Reordena pedidos automáticamente considerando tiempos de preparación, prioridades VIP y mesas grandes.",
            },
            {
                icon: AlertTriangle,
                title: "Alertas Inteligentes",
                description: "Código de colores progresivo: verde (a tiempo), amarillo (cuidado) y rojo (urgente). Sin sorpresas.",
            },
            {
                icon: Settings,
                title: "100% Configurable",
                description: "Configura estaciones, tiempos objetivo, sonidos de alerta y agrupación de pedidos como mejor funcione tu cocina.",
            },
        ],
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
        longDescription: "El módulo de inventario se conecta directamente con tu menú a través de recetas. Cada platillo vendido descuenta automáticamente los ingredientes utilizados. La inteligencia artificial analiza tus patrones de venta y te avisa cuándo comprar, cuánto comprar, y te alerta antes de que un ingrediente crítico se agote. Adiós a las emergencias del domingo por la mañana.",
        useCases: [
            {
                icon: Receipt,
                title: "Descuento automático por receta",
                description: "Vendes 10 órdenes de enchiladas y el sistema descuenta automáticamente tortillas, chile, queso, cebolla y crema de tu inventario.",
            },
            {
                icon: TrendingUp,
                title: "Predicción de compras con IA",
                description: "La IA analiza tu historial de ventas y te sugiere exactamente qué comprar para la próxima semana, considerando temporada y eventos.",
            },
            {
                icon: AlertTriangle,
                title: "Alertas de stock crítico",
                description: "Recibe notificaciones en tiempo real cuando un ingrediente está por debajo del mínimo. Configura umbrales personalizados por producto.",
            },
            {
                icon: Ruler,
                title: "Control de mermas y costos",
                description: "Registra mermas por caducidad, desperdicio o accidente. Compara el costo teórico vs. real de cada platillo para maximizar margen.",
            },
        ],
        stats: [
            { label: "Desperdicio de alimentos", value: "-30%", description: "reducción promedio en merma mensual" },
            { label: "Precisión de stock", value: "98%", description: "exactitud en el conteo automático" },
            { label: "Ahorro en compras", value: "+20%", description: "optimización en órdenes de compra" },
        ],
        highlights: [
            {
                icon: Lightbulb,
                title: "Recetas Vinculadas",
                description: "Cada platillo tiene su receta con cantidades exactas. El costo se calcula automáticamente al cambiar precios de insumos.",
            },
            {
                icon: Truck,
                title: "Órdenes de Compra",
                description: "Genera órdenes de compra con un clic basadas en la predicción de IA. Envíalas directo a tus proveedores por email.",
            },
            {
                icon: PieChart,
                title: "Análisis de Costos",
                description: "Visualiza el food cost porcentual de cada platillo y del menú completo. Identifica platillos con bajo margen al instante.",
            },
            {
                icon: CalendarCheck,
                title: "Inventarios Físicos",
                description: "Programa y realiza conteos físicos desde el celular. Compara contra el teórico y ajusta diferencias fácilmente.",
            },
        ],
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
        longDescription: "Olvídate de los dolores de cabeza fiscales. Nuestro módulo de facturación cumple al 100% con la normativa CFDI 4.0 del SAT. Tus clientes se facturan en segundos desde su celular o en el punto de venta, con timbrado instantáneo y envío por email automático. Complementos de pago, notas de crédito y cancelaciones se manejan con un par de clics.",
        useCases: [
            {
                icon: Zap,
                title: "Auto-facturación por QR",
                description: "El cliente escanea un QR en su ticket, captura sus datos fiscales y recibe la factura timbrada en su correo en menos de 30 segundos.",
            },
            {
                icon: Receipt,
                title: "Facturación global automática",
                description: "Al final de cada día, el sistema genera automáticamente la factura global del público en general con todos los tickets no facturados.",
            },
            {
                icon: RefreshCw,
                title: "Cancelaciones sin dolor",
                description: "Cancela facturas cumpliendo con el proceso del SAT automáticamente. El sistema maneja la justificación y notificaciones requeridas.",
            },
            {
                icon: Shield,
                title: "Siempre actualizado con el SAT",
                description: "Actualizamos las reglas fiscales automáticamente cuando el SAT publica cambios. Tu restaurante siempre cumple sin que tengas que hacer nada.",
            },
        ],
        stats: [
            { label: "Cumplimiento SAT", value: "100%", description: "certificación CFDI 4.0 completa" },
            { label: "Tiempo de timbrado", value: "<3s", description: "factura generada y enviada al cliente" },
            { label: "Facturas mensuales", value: "∞", description: "sin cargos extra por volumen de facturación" },
        ],
        highlights: [
            {
                icon: Globe,
                title: "Portal de Auto-factura",
                description: "Tus clientes se facturan solos 24/7 desde una página web personalizada con tu logo y colores.",
            },
            {
                icon: FileText,
                title: "Complementos de Pago",
                description: "Genera complementos de pago para pagos parciales o diferidos. Ideal para eventos de catering y grupos grandes.",
            },
            {
                icon: PieChart,
                title: "Reportes Fiscales",
                description: "Descarga reportes mensuales listos para tu contador: IVA desglosado, retenciones IEPS y conciliación de ingresos.",
            },
            {
                icon: CreditCard,
                title: "Múltiples Razones Sociales",
                description: "Opera con varias razones sociales desde la misma plataforma. Ideal para grupos restauranteros o franquicias.",
            },
        ],
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
        longDescription: "Cada mesa tiene un QR único. El comensal lo escanea, ve el menú con fotos y descripciones, hace su pedido y paga — todo desde su celular. Las sugerencias inteligentes de upselling aumentan el ticket promedio un 25%. Y lo mejor: el menú se actualiza al instante cuando cambias precios, agotas un platillo o lanzas una promoción.",
        useCases: [
            {
                icon: Smartphone,
                title: "Pedido desde la mesa",
                description: "El comensal escanea el QR de su mesa, navega el menú visual con fotos, personaliza su orden y la envía directo a cocina sin esperar mesero.",
            },
            {
                icon: ShoppingCart,
                title: "Upselling automático",
                description: "\"¿Agregar guacamole por $35?\", \"Los más pedidos\", \"Te recomendamos...\" — sugerencias inteligentes que aumentan el ticket un 25%.",
            },
            {
                icon: DollarSign,
                title: "Pago sin esperas",
                description: "El cliente pide su cuenta, ve el desglose, agrega propina y paga con tarjeta o SPEI directo desde su teléfono. Sin esperar a nadie.",
            },
            {
                icon: RefreshCw,
                title: "Actualizaciones al instante",
                description: "¿Se agotó un platillo? ¿Cambio de precio? ¿Nueva promoción? Se refleja al instante en todos los QR sin reimprimir nada.",
            },
        ],
        stats: [
            { label: "Ticket promedio", value: "+25%", description: "incremento con upselling inteligente" },
            { label: "Tiempo de espera", value: "-60%", description: "reducción en tiempo para ordenar" },
            { label: "Satisfacción", value: "4.8★", description: "calificación promedio de comensales" },
        ],
        highlights: [
            {
                icon: Globe,
                title: "Menú Multi-idioma",
                description: "Ofrece tu menú en español e inglés automáticamente. Ideal para zonas turísticas y restaurantes internacionales.",
            },
            {
                icon: Target,
                title: "Promociones Dinámicas",
                description: "Lanza happy hours, 2x1 y promociones de temporada que aparecen automáticamente en el menú QR.",
            },
            {
                icon: Activity,
                title: "Analytics de Menú",
                description: "Descubre qué platillos se ven más, cuáles se agregan al carrito y cuáles se abandonan. Optimiza tu menú con datos.",
            },
            {
                icon: Settings,
                title: "100% Personalizable",
                description: "Tu menú digital con tu logo, colores, fotos profesionales y la personalidad de tu restaurante.",
            },
        ],
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
        longDescription: "Convierte tus datos en decisiones rentables. El módulo de analytics te muestra en tiempo real qué platillos vuelan y cuáles no, cuáles son tus horas pico, qué mesero vende más, y hacia dónde va la tendencia de tu negocio. La IA predice la demanda para que planifiques personal, compras e inventario con precisión quirúrgica.",
        useCases: [
            {
                icon: PieChart,
                title: "Análisis de menú rentable",
                description: "Identifica tus platillos estrella (alto volumen + alto margen) vs. los que solo ocupan espacio en tu menú. Optimiza con datos duros.",
            },
            {
                icon: TrendingUp,
                title: "Predicción de ventas",
                description: "La IA analiza históricos, temporadas, clima y eventos para predecir cuánto venderás mañana, la próxima semana o el próximo mes.",
            },
            {
                icon: Users,
                title: "Rendimiento del equipo",
                description: "Métricas por mesero: ticket promedio, propinas, velocidad de servicio. Premia a los mejores e identifica áreas de capacitación.",
            },
            {
                icon: CalendarCheck,
                title: "Reportes automáticos",
                description: "Recibe diario, semanal o mensualmente un reporte ejecutivo en tu email con los KPIs más importantes de tu restaurante.",
            },
        ],
        stats: [
            { label: "Aumento de utilidades", value: "+15%", description: "optimizando con datos reales" },
            { label: "Métricas disponibles", value: "50+", description: "KPIs de operación, ventas y finanzas" },
            { label: "Actualización", value: "Real-time", description: "datos siempre al segundo" },
        ],
        highlights: [
            {
                icon: Activity,
                title: "Dashboard en Vivo",
                description: "Monitorea ventas, órdenes activas, ticket promedio y ocupación en tiempo real desde cualquier dispositivo.",
            },
            {
                icon: Lightbulb,
                title: "Insights con IA",
                description: "La IA detecta anomalías, identifica oportunidades y te sugiere acciones concretas para mejorar tus números.",
            },
            {
                icon: Receipt,
                title: "Reportes para tu Contador",
                description: "Exporta reportes en Excel, PDF o CSV listos para tu contabilidad. Desglose por día, mes, método de pago y más.",
            },
            {
                icon: Target,
                title: "Metas y Objetivos",
                description: "Fija metas de venta diarias y semanales. El sistema te muestra el progreso en tiempo real y alerta si vas abajo del target.",
            },
        ],
    },
];

// ============================================
// Feature Detail Modal Component
// ============================================
interface FeatureDetailModalProps {
    feature: Feature | null;
    onClose: () => void;
}

const FeatureDetailModal = memo(function FeatureDetailModal({ feature, onClose }: FeatureDetailModalProps) {
    // Lock body scroll when modal is open
    useEffect(() => {
        if (feature) {
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [feature]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    if (!feature) return null;

    const Icon = feature.icon;

    return (
        <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-md py-8 px-4"
            onClick={onClose}
        >
            <m.div
                initial={{ opacity: 0, y: 40, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.97 }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-700/50 rounded-3xl shadow-2xl overflow-hidden"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 z-30 p-2.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-600/50 text-zinc-400 hover:text-white transition-all duration-200 backdrop-blur-sm"
                    aria-label="Cerrar detalle del módulo"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Hero Header */}
                <div className="relative h-48 sm:h-56 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-900/60 to-zinc-900 z-10" />
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-30`} />
                    {feature.image && (
                        <Image
                            src={feature.image}
                            alt={feature.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 1024px) 100vw, 896px"
                        />
                    )}
                    <div className="absolute bottom-6 left-6 sm:left-8 z-20 flex items-end gap-4">
                        <div className={`p-4 rounded-2xl bg-gradient-to-br ${feature.color} shadow-xl shadow-black/30`}>
                            <Icon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                {feature.subtitle}
                            </span>
                            <h3 className="text-2xl sm:text-3xl font-bold text-white">{feature.title}</h3>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 sm:p-8 space-y-10">
                    {/* Long Description */}
                    <p className="text-zinc-300 text-base sm:text-lg leading-relaxed border-l-4 border-brand-500/40 pl-5">
                        {feature.longDescription}
                    </p>

                    {/* Stats Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {feature.stats.map((stat, i) => (
                            <m.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + i * 0.1 }}
                                className={`relative p-5 rounded-2xl bg-gradient-to-br from-zinc-800/90 to-zinc-800/40 border border-zinc-700/50 overflow-hidden`}
                            >
                                <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${feature.color}`} />
                                <p className={`text-3xl font-black bg-gradient-to-r ${feature.color} bg-clip-text text-transparent`}>
                                    {stat.value}
                                </p>
                                <p className="text-sm font-semibold text-white mt-1">{stat.label}</p>
                                <p className="text-xs text-zinc-500 mt-0.5">{stat.description}</p>
                            </m.div>
                        ))}
                    </div>

                    {/* Use Cases */}
                    <div>
                        <h4 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                            <Target className="w-5 h-5 text-brand-400" />
                            Casos de Uso
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {feature.useCases.map((useCase, i) => {
                                const UseCaseIcon = useCase.icon;
                                return (
                                    <m.div
                                        key={i}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 + i * 0.08 }}
                                        className="p-5 rounded-2xl bg-zinc-800/50 border border-zinc-700/40 hover:border-zinc-600/60 transition-colors duration-300 group/card"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`shrink-0 p-2.5 rounded-xl bg-gradient-to-br ${feature.color} opacity-80 group-hover/card:opacity-100 transition-opacity`}>
                                                <UseCaseIcon className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <h5 className="text-sm font-bold text-white mb-1">{useCase.title}</h5>
                                                <p className="text-xs text-zinc-400 leading-relaxed">{useCase.description}</p>
                                            </div>
                                        </div>
                                    </m.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Highlights */}
                    <div>
                        <h4 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-brand-400" />
                            Funcionalidades Destacadas
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {feature.highlights.map((highlight, i) => {
                                const HighlightIcon = highlight.icon;
                                return (
                                    <m.div
                                        key={i}
                                        initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + i * 0.08 }}
                                        className="flex items-start gap-3 p-4 rounded-xl hover:bg-zinc-800/40 transition-colors duration-200"
                                    >
                                        <div className={`shrink-0 p-2 rounded-lg ${feature.bgColor} border ${feature.borderColor}`}>
                                            <HighlightIcon className="w-4 h-4 text-zinc-300" />
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-semibold text-white">{highlight.title}</h5>
                                            <p className="text-xs text-zinc-500 leading-relaxed mt-0.5">{highlight.description}</p>
                                        </div>
                                    </m.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Bottom CTA */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-zinc-800">
                        <p className="text-sm text-zinc-500 text-center sm:text-left">
                            Incluido en todos los planes. Sin costos extra.
                        </p>
                        <Link
                            href="/checkout?plan=starter"
                            className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${feature.color} text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300`}
                        >
                            <span>Probar {feature.title} gratis</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </m.div>
        </m.div>
    );
});

// ============================================
// Feature Card Component
// ============================================
interface FeatureCardProps {
    feature: Feature;
    index: number;
    isActive: boolean;
    onHover: (id: string | null) => void;
    onLearnMore: (feature: Feature) => void;
}

const FeatureCard = memo(function FeatureCard({ feature, index, isActive, onHover, onLearnMore }: FeatureCardProps) {
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
                        {feature.benefits.map((benefit, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                                <Check className={`w-4 h-4 shrink-0`}
                                    style={{
                                        color: 'transparent',
                                        backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))`,
                                        backgroundClip: 'text',
                                        WebkitBackgroundClip: 'text',
                                    }} />
                                <span>{benefit}</span>
                            </li>
                        ))}
                    </ul>

                    {/* Learn more button */}
                    <button
                        onClick={() => onLearnMore(feature)}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-400 hover:text-brand-300 transition-all duration-300 group/btn"
                    >
                        <span>Conocer más</span>
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
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
    const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

    const handleLearnMore = useCallback((feature: Feature) => {
        setSelectedFeature(feature);
    }, []);

    const handleCloseModal = useCallback(() => {
        setSelectedFeature(null);
    }, []);

    return (
        <>
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

                        <p className="text-lg text-zinc-400 max-w-3xl mx-auto">
                            6 módulos diseñados específicamente para restaurantes mexicanos.
                            Desde el punto de venta hasta analytics con IA — sin integraciones complicadas,
                            todo funciona en armonía desde el día uno.
                        </p>

                        <div className="flex items-center justify-center gap-6 mt-6">
                            <div className="flex items-center gap-2 text-sm text-zinc-500">
                                <Check className="w-4 h-4 text-emerald-400" />
                                <span>Sin costos extra</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-zinc-500">
                                <Check className="w-4 h-4 text-emerald-400" />
                                <span>Todo incluido</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-zinc-500">
                                <Check className="w-4 h-4 text-emerald-400" />
                                <span>Activación inmediata</span>
                            </div>
                        </div>
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
                                onLearnMore={handleLearnMore}
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
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </m.div>
                </div>
            </section>

            {/* Detail Modal — Rendered outside the section for proper z-index stacking */}
            <AnimatePresence>
                {selectedFeature && (
                    <FeatureDetailModal
                        feature={selectedFeature}
                        onClose={handleCloseModal}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
