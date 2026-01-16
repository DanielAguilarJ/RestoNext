'use client';

/**
 * RestoNext MX - Help Slide-Over Component
 * =========================================
 * Contextual help system that shows relevant documentation
 * based on the current page the user is viewing.
 * 
 * Features:
 * - Floating "?" button in the corner
 * - Slide-over panel with contextual help
 * - Page-specific documentation
 * - Search functionality
 * - Video tutorials links
 */

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
    HelpCircle,
    X,
    Search,
    Book,
    Video,
    ExternalLink,
    ChevronRight,
    Lightbulb,
    MessageSquare,
    ArrowRight,
    Utensils,
    ShoppingCart,
    Package,
    BarChart3,
    Users,
    Calendar,
    Settings,
    CreditCard,
    Truck,
    Sparkles,
    Play,
} from 'lucide-react';

// Help content organized by route
interface HelpArticle {
    id: string;
    title: string;
    description: string;
    content: string[];
    tips?: string[];
    videoUrl?: string;
}

interface HelpSection {
    route: string;
    title: string;
    icon: React.ReactNode;
    articles: HelpArticle[];
}

const helpContent: HelpSection[] = [
    {
        route: '/pos',
        title: 'Punto de Venta (POS)',
        icon: <ShoppingCart className="w-5 h-5" />,
        articles: [
            {
                id: 'pos-basics',
                title: 'Crear una Orden',
                description: 'Aprende a tomar pedidos de manera eficiente',
                content: [
                    'Selecciona una mesa disponible desde el mapa o la lista.',
                    'Elige los productos del menú haciendo clic en cada uno.',
                    'Ajusta la cantidad con los botones + y -.',
                    'Agrega notas especiales si el cliente tiene preferencias.',
                    'Haz clic en "Enviar a Cocina" para confirmar el pedido.',
                ],
                tips: [
                    'Usa el buscador para encontrar productos rápidamente.',
                    'Los productos de colores diferentes van a distintas estaciones (cocina/bar).',
                ],
            },
            {
                id: 'pos-modifiers',
                title: 'Modificadores de Productos',
                description: 'Personaliza cada platillo según las preferencias del cliente',
                content: [
                    'Los modificadores aparecen al seleccionar un producto.',
                    'Marca las opciones deseadas (ej: término de la carne, extras).',
                    'Los precios adicionales se calculan automáticamente.',
                ],
            },
        ],
    },
    {
        route: '/inventory',
        title: 'Gestión de Inventario',
        icon: <Package className="w-5 h-5" />,
        articles: [
            {
                id: 'inv-create',
                title: 'Crear Nuevos Insumos',
                description: 'Registra los ingredientes de tu restaurante',
                content: [
                    'Haz clic en "Nuevo Insumo" en la esquina superior.',
                    'Ingresa el nombre, SKU (opcional) y unidad de medida.',
                    'Define el stock mínimo para recibir alertas automáticas.',
                    'Ingresa el costo por unidad para el cálculo de Food Cost.',
                ],
                tips: [
                    'Usa unidades consistentes (ej: kg para carnes, litros para líquidos).',
                    'El SKU te ayudará a identificar productos en compras.',
                ],
            },
            {
                id: 'inv-adjust',
                title: 'Ajustes de Inventario',
                description: 'Registra entradas, salidas y mermas',
                content: [
                    'Selecciona un insumo de la lista.',
                    'Elige el tipo: Compra (entrada), Merma (pérdida), o Ajuste.',
                    'Ingresa la cantidad y una nota explicativa.',
                    'El historial de movimientos queda registrado automáticamente.',
                ],
            },
        ],
    },
    {
        route: '/analytics',
        title: 'Analytics y Reportes',
        icon: <BarChart3 className="w-5 h-5" />,
        articles: [
            {
                id: 'analytics-kpis',
                title: 'Entender los KPIs',
                description: 'Métricas clave para tu restaurante',
                content: [
                    'Ticket Promedio: Monto promedio por orden (meta: $250+).',
                    'Food Cost: Porcentaje del costo de ingredientes (ideal: 28-32%).',
                    'Ventas del Día: Total de ingresos en el período seleccionado.',
                    'Platillos Top: Los productos más rentables de tu menú.',
                ],
                tips: [
                    'Revisa el mapa de calor para optimizar horarios de personal.',
                    'Compara semanas para identificar tendencias.',
                ],
            },
        ],
    },
    {
        route: '/customers',
        title: 'Gestión de Clientes (CRM)',
        icon: <Users className="w-5 h-5" />,
        articles: [
            {
                id: 'crm-loyalty',
                title: 'Programa de Lealtad',
                description: 'Fideliza a tus clientes con puntos y recompensas',
                content: [
                    'Los puntos se acumulan automáticamente con cada compra.',
                    'Los niveles (Base, Gold, Platinum) ofrecen beneficios crecientes.',
                    'Configura promociones especiales para clientes VIP.',
                ],
            },
        ],
    },
    {
        route: '/reservations',
        title: 'Reservaciones',
        icon: <Calendar className="w-5 h-5" />,
        articles: [
            {
                id: 'res-create',
                title: 'Crear Reservaciones',
                description: 'Administra las mesas con anticipación',
                content: [
                    'Selecciona fecha y hora de la reservación.',
                    'Ingresa los datos del cliente y número de comensales.',
                    'El sistema verifica la disponibilidad automáticamente.',
                    'Envía confirmación por email o WhatsApp.',
                ],
            },
        ],
    },
    {
        route: '/procurement',
        title: 'Compras y Proveedores',
        icon: <Truck className="w-5 h-5" />,
        articles: [
            {
                id: 'proc-ai',
                title: 'Compras Inteligentes con IA',
                description: 'Optimiza tus pedidos con predicción de demanda',
                content: [
                    'La IA analiza tu historial de ventas y estacionalidad.',
                    'Genera sugerencias de compra automáticas.',
                    'Considera tu inventario actual y tiempos de entrega.',
                    'Reduce mermas hasta un 30% con predicciones precisas.',
                ],
                tips: [
                    'Revisa las sugerencias diariamente antes del cierre.',
                    'Ajusta manualmente si esperas eventos especiales.',
                ],
            },
        ],
    },
    {
        route: '/settings/billing',
        title: 'Facturación y Planes',
        icon: <CreditCard className="w-5 h-5" />,
        articles: [
            {
                id: 'billing-plans',
                title: 'Planes de Suscripción',
                description: 'Elige el plan ideal para tu restaurante',
                content: [
                    'Starter: Ideal para restaurantes pequeños (hasta 5 mesas).',
                    'Professional: Incluye KDS, Auto-Servicio QR y Analytics.',
                    'Enterprise: Todo + IA, Multi-sucursal y API Access.',
                ],
            },
            {
                id: 'billing-invoices',
                title: 'Descargar Facturas',
                description: 'Accede a tus comprobantes fiscales',
                content: [
                    'Haz clic en "Ver Facturas" para abrir el Portal de Stripe.',
                    'Descarga facturas en PDF para tu contabilidad.',
                    'Actualiza tu método de pago si es necesario.',
                ],
            },
        ],
    },
];

// Default help content when no specific route matches
const defaultHelp: HelpSection = {
    route: '/',
    title: 'Centro de Ayuda',
    icon: <HelpCircle className="w-5 h-5" />,
    articles: [
        {
            id: 'getting-started',
            title: 'Primeros Pasos',
            description: 'Aprende lo básico de RestoNext',
            content: [
                'Completa tu perfil en Configuración > Mi Restaurante.',
                'Configura tu menú con categorías y productos.',
                'Agrega las mesas de tu restaurante.',
                'Invita a tu equipo con diferentes roles.',
                '¡Comienza a tomar pedidos!',
            ],
        },
    ],
};

export default function HelpSlideOver() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedArticle, setExpandedArticle] = useState<string | null>(null);

    // Find relevant help content based on current route
    const currentHelp = helpContent.find(h => pathname.startsWith(h.route)) || defaultHelp;

    // Filter articles by search
    const filteredArticles = searchQuery
        ? currentHelp.articles.filter(a =>
            a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : currentHelp.articles;

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    return (
        <>
            {/* Floating Help Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white rounded-full shadow-lg shadow-violet-500/30 flex items-center justify-center transition-all hover:scale-110 group"
                aria-label="Abrir ayuda"
            >
                <HelpCircle className="w-7 h-7" />
                {/* Tooltip */}
                <span className="absolute right-full mr-3 px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    ¿Necesitas ayuda?
                </span>
            </button>

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Slide-over Panel */}
            <div
                className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-slate-900 border-l border-slate-700 shadow-2xl transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-violet-500/20 rounded-xl text-violet-400">
                                {currentHelp.icon}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{currentHelp.title}</h2>
                                <p className="text-slate-400 text-sm">Ayuda contextual</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar en la ayuda..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto h-[calc(100%-16rem)]">
                    {/* Articles */}
                    <div className="space-y-4">
                        {filteredArticles.map((article) => (
                            <div
                                key={article.id}
                                className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden"
                            >
                                {/* Article Header */}
                                <button
                                    onClick={() => setExpandedArticle(
                                        expandedArticle === article.id ? null : article.id
                                    )}
                                    className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <Book className="w-5 h-5 text-violet-400" />
                                        <div>
                                            <p className="text-white font-medium">{article.title}</p>
                                            <p className="text-slate-400 text-sm">{article.description}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expandedArticle === article.id ? 'rotate-90' : ''
                                        }`} />
                                </button>

                                {/* Article Content */}
                                {expandedArticle === article.id && (
                                    <div className="px-4 pb-4 pt-0 border-t border-slate-700/50">
                                        <ol className="space-y-3 mt-4">
                                            {article.content.map((step, idx) => (
                                                <li key={idx} className="flex items-start gap-3">
                                                    <span className="flex-shrink-0 w-6 h-6 bg-violet-500/20 text-violet-400 rounded-full flex items-center justify-center text-sm font-medium">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="text-slate-300">{step}</span>
                                                </li>
                                            ))}
                                        </ol>

                                        {/* Tips */}
                                        {article.tips && article.tips.length > 0 && (
                                            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                                <div className="flex items-center gap-2 text-amber-400 mb-2">
                                                    <Lightbulb className="w-4 h-4" />
                                                    <span className="text-sm font-medium">Tips</span>
                                                </div>
                                                <ul className="space-y-1">
                                                    {article.tips.map((tip, idx) => (
                                                        <li key={idx} className="text-slate-300 text-sm flex items-start gap-2">
                                                            <span className="text-amber-400">•</span>
                                                            {tip}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Video Link */}
                                        {article.videoUrl && (
                                            <a
                                                href={article.videoUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-4 flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-colors"
                                            >
                                                <Video className="w-4 h-4" />
                                                <span className="text-sm">Ver video tutorial</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {filteredArticles.length === 0 && (
                            <div className="text-center py-8">
                                <HelpCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                <p className="text-slate-400">No se encontraron artículos</p>
                                <p className="text-slate-500 text-sm">Intenta con otro término de búsqueda</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-700 bg-slate-900">
                    <div className="grid grid-cols-2 gap-3">
                        <a
                            href="https://docs.restonext.mx"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
                        >
                            <Book className="w-5 h-5" />
                            <span className="text-sm font-medium">Documentación</span>
                        </a>
                        <button
                            onClick={() => {
                                // Would open chat widget
                                alert('Abriendo chat de soporte...');
                            }}
                            className="flex items-center justify-center gap-2 p-3 bg-violet-500 hover:bg-violet-400 text-white rounded-xl transition-colors"
                        >
                            <MessageSquare className="w-5 h-5" />
                            <span className="text-sm font-medium">Chat Soporte</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
