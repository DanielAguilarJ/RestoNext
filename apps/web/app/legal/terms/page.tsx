'use client';

/**
 * RestoNext MX - Términos y Condiciones Page
 * ===========================================
 * Public page to display the current Terms of Service.
 * Renders Markdown content with beautiful, professional styling.
 * 
 * Features:
 * - Fetches latest terms from API
 * - Markdown rendering with custom styles
 * - Mobile-responsive layout
 * - Print-friendly formatting
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    FileText,
    ChevronLeft,
    Calendar,
    Shield,
    CheckCircle2,
    Loader2,
    AlertCircle
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://whale-app-i6h36.ondigitalocean.app/api';

interface LegalDocument {
    id: string;
    type: string;
    version: string;
    title: string;
    content: string;
    effective_date: string;
    is_current: boolean;
    created_at: string;
}

// Simple Markdown-to-HTML renderer (for basic markdown)
function renderMarkdown(markdown: string): string {
    let html = markdown
        // Headers
        .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-white mt-6 mb-3">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-white mt-8 mb-4 pb-2 border-b border-slate-700">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mt-10 mb-4">$1</h1>')
        // Bold and Italic
        .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Lists
        .replace(/^\- (.+)/gim, '<li class="ml-4 text-slate-300">$1</li>')
        // Paragraphs
        .replace(/\n\n/g, '</p><p class="text-slate-300 leading-relaxed mb-4">')
        // Line breaks
        .replace(/\n/g, '<br />');

    // Wrap in paragraphs
    html = '<p class="text-slate-300 leading-relaxed mb-4">' + html + '</p>';

    // Fix list wrapping
    html = html.replace(/<li/g, '</p><ul class="list-disc pl-6 mb-4 space-y-1"><li')
        .replace(/<\/li>/g, '</li>')
        .replace(/<\/li><br \/><ul/g, '</li></ul><ul')
        .replace(/<\/li>(?!<\/ul>)(?!<li)/g, '</li></ul><p class="text-slate-300 leading-relaxed mb-4">');

    return html;
}

export default function TermsPage() {
    // Static Terms Document
    const STATIC_TERMS: LegalDocument = {
        id: "terms-v1",
        type: "terms",
        version: "1.0",
        title: "Términos y Condiciones de Uso",
        content: `
### 1. Aceptación de los Términos

Bienvenido a RestoNext ("nosotros", "nuestro" o "la Plataforma"). Al acceder o utilizar nuestro software como servicio (SaaS) para la gestión de restaurantes, usted ("el Cliente" o "Usuario") acepta estar legalmente vinculado por estos Términos y Condiciones.

Si no está de acuerdo con alguna parte de estos términos, no podrá utilizar nuestros servicios.

### 2. Descripción del Servicio

RestoNext proporciona una plataforma integral de gestión para restaurantes que incluye, pero no se limita a:
- Punto de Venta (POS) en la nube.
- Sistema de Pantallas de Cocina (KDS).
- Gestión de Inventarios y Menús.
- Facturación Electrónica (CFDI 4.0).
- Reportes y Analítica.

Nos reservamos el derecho de modificar, suspender o discontinuar cualquier aspecto del servicio en cualquier momento, notificando a los usuarios sobre cambios significativos.

### 3. Cuentas y Seguridad

Para utilizar el servicio, debe registrarse y crear una cuenta. Usted es responsable de:
- Mantener la confidencialidad de sus credenciales de acceso.
- Todas las actividades que ocurran bajo su cuenta.
- Notificarnos inmediatamente sobre cualquier uso no autorizado.

RestoNext implementa medidas de seguridad estándar de la industria, pero no se hace responsable por pérdidas derivadas del robo de credenciales del usuario.

### 4. Planes y Pagos

**4.1 Suscripciones**
El servicio se ofrece bajo modelos de suscripción mensual o anual. Los precios están publicados en nuestro sitio web y pueden estar sujetos a impuestos aplicables (IVA).

**4.2 Facturación**
El cobro se realiza por adelantado. Al proporcionar un método de pago, nos autoriza a cobrar las tarifas correspondientes.

**4.3 Cancelación**
Puede cancelar su suscripción en cualquier momento. El servicio continuará activo hasta el final del periodo de facturación pagado. No se ofrecen reembolsos por periodos parciales.

### 5. Propiedad Intelectual

**5.1 RestoNext**
Todo el software, código, diseños, logotipos y tecnología subyacente son propiedad exclusiva de RestoNext y están protegidos por leyes de derechos de autor y propiedad intelectual.

**5.2 Datos del Cliente**
Usted conserva la propiedad total de los datos (menús, ventas, clientes) que ingresa en la plataforma. Nos otorga una licencia limitada para alojar, procesar y realizar copias de seguridad de estos datos para la prestación del servicio.

### 6. Facturación Electrónica (SAT)

RestoNext facilita la emisión de CFDI 4.0. Sin embargo, el Cliente es el único responsable de la veracidad de los datos fiscales ingresados y del cumplimiento de sus obligaciones tributarias ante el Servicio de Administración Tributaria (SAT).

### 7. Limitación de Responsabilidad

El servicio se proporciona "tal cual" (as is). En la máxima medida permitida por la ley, RestoNext no será responsable por:
- Daños indirectos, incidentales o consecuentes (pérdida de beneficios, datos o interrupción del negocio).
- Fallos derivados de problemas de conectividad a internet del Cliente.

### 8. Nivel de Servicio (SLA)

Nos esforzamos por mantener una disponibilidad del 99.9%. En caso de interrupciones programadas por mantenimiento, notificaremos con anticipación.

### 9. Legislación Aplicable

Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier disputa se resolverá en los tribunales competentes de la Ciudad de México.

---
**Contacto Legal**
Si tiene dudas sobre estos términos, contáctenos en: legal@restonext.mx
        `,
        effective_date: new Date().toISOString(),
        is_current: true,
        created_at: new Date().toISOString()
    };

    const [document, setDocument] = useState<LegalDocument | null>(STATIC_TERMS);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Removed dynamic fetch to ensure immediate availability
    /*
    useEffect(() => { ... }
    */

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                            <span className="text-sm font-medium">Volver</span>
                        </Link>

                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
                                RestoNext
                            </span>
                            <span className="text-slate-500 text-sm">MX</span>
                        </div>

                        <div className="w-20" /> {/* Spacer for centering */}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 text-red-500 animate-spin mb-4" />
                        <p className="text-slate-400">Cargando documento...</p>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
                        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
                        <p className="text-slate-300">{error}</p>
                    </div>
                )}

                {/* Content */}
                {document && !loading && (
                    <>
                        {/* Document Header */}
                        <div className="mb-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30">
                                    <FileText className="w-6 h-6 text-red-400" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-white">
                                        {document.title}
                                    </h1>
                                    <p className="text-slate-400 text-sm">
                                        Versión {document.version}
                                    </p>
                                </div>
                            </div>

                            {/* Metadata Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                                <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-xs font-medium">Fecha Vigente</span>
                                    </div>
                                    <p className="text-white font-medium">
                                        {formatDate(document.effective_date)}
                                    </p>
                                </div>

                                <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <Shield className="w-4 h-4" />
                                        <span className="text-xs font-medium">Versión</span>
                                    </div>
                                    <p className="text-white font-medium">
                                        {document.version}
                                    </p>
                                </div>

                                <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span className="text-xs font-medium">Estado</span>
                                    </div>
                                    <p className="text-emerald-400 font-medium">
                                        {document.is_current ? 'Versión Actual' : 'Versión Anterior'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Document Content */}
                        <article className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8 sm:p-10">
                            <div
                                className="prose prose-invert prose-slate max-w-none
                                    prose-headings:font-bold
                                    prose-h1:text-3xl prose-h1:text-white
                                    prose-h2:text-2xl prose-h2:text-white prose-h2:border-b prose-h2:border-slate-700 prose-h2:pb-2
                                    prose-h3:text-xl prose-h3:text-white
                                    prose-p:text-slate-300 prose-p:leading-relaxed
                                    prose-ul:text-slate-300
                                    prose-li:text-slate-300
                                    prose-strong:text-white prose-strong:font-semibold
                                "
                                dangerouslySetInnerHTML={{ __html: renderMarkdown(document.content) }}
                            />
                        </article>

                        {/* Footer Actions */}
                        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-slate-500 text-sm text-center sm:text-left">
                                Última actualización: {formatDate(document.created_at)}
                            </p>

                            <div className="flex items-center gap-3">
                                <Link
                                    href="/legal/privacy"
                                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm"
                                >
                                    Política de Privacidad
                                </Link>
                                <button
                                    onClick={() => window.print()}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
                                >
                                    Imprimir
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    body {
                        background: white !important;
                    }
                    header, footer, button {
                        display: none !important;
                    }
                    article {
                        background: white !important;
                        border: none !important;
                        color: black !important;
                    }
                    .text-white, .text-slate-300, .text-slate-400 {
                        color: black !important;
                    }
                }
            `}</style>
        </div>
    );
}
