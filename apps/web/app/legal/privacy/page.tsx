'use client';

/**
 * RestoNext MX - Política de Privacidad Page
 * ==========================================
 * Public page to display the current Privacy Policy.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Shield,
    ChevronLeft,
    Calendar,
    FileText,
    CheckCircle2,
    Loader2,
    AlertCircle
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://restonext.me/api';

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

// Simple Markdown-to-HTML renderer
function renderMarkdown(markdown: string): string {
    let html = markdown
        .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-white mt-6 mb-3">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-white mt-8 mb-4 pb-2 border-b border-slate-700">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mt-10 mb-4">$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^\- (.+)/gim, '<li class="ml-4 text-slate-300">$1</li>')
        .replace(/\n\n/g, '</p><p class="text-slate-300 leading-relaxed mb-4">')
        .replace(/\n/g, '<br />');

    html = '<p class="text-slate-300 leading-relaxed mb-4">' + html + '</p>';

    return html;
}

export default function PrivacyPage() {
    const [document, setDocument] = useState<LegalDocument | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPrivacy = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/legal/latest/privacy`);

                if (!response.ok) {
                    throw new Error('Failed to fetch privacy policy');
                }

                const data = await response.json();
                setDocument(data);
            } catch (err) {
                console.error('Error fetching privacy:', err);
                setError('No se pudo cargar la política de privacidad');
            } finally {
                setLoading(false);
            }
        };

        fetchPrivacy();
    }, []);

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

                        <div className="w-20" />
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                        <p className="text-slate-400">Cargando documento...</p>
                    </div>
                )}

                {error && !loading && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
                        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
                        <p className="text-slate-300">{error}</p>
                    </div>
                )}

                {document && !loading && (
                    <>
                        <div className="mb-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
                                    <Shield className="w-6 h-6 text-blue-400" />
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
                                        <FileText className="w-4 h-4" />
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

                        <article className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8 sm:p-10">
                            <div
                                className="prose prose-invert prose-slate max-w-none"
                                dangerouslySetInnerHTML={{ __html: renderMarkdown(document.content) }}
                            />
                        </article>

                        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-slate-500 text-sm text-center sm:text-left">
                                Última actualización: {formatDate(document.created_at)}
                            </p>

                            <div className="flex items-center gap-3">
                                <Link
                                    href="/legal/terms"
                                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm"
                                >
                                    Términos y Condiciones
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

            <style jsx global>{`
                @media print {
                    body { background: white !important; }
                    header, footer, button { display: none !important; }
                    article { background: white !important; border: none !important; color: black !important; }
                    .text-white, .text-slate-300, .text-slate-400 { color: black !important; }
                }
            `}</style>
        </div>
    );
}
