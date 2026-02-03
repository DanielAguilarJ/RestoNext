'use client';

/**
 * RestoNext MX - Legal Terms Acceptance Page
 * ==========================================
 * Page for users to review and accept updated terms.
 * Includes both Terms and Privacy acceptance.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    FileText,
    Shield,
    CheckCircle2,
    Loader2,
    AlertCircle,
    ArrowLeft
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://restonext.me/api';

const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
};

interface LegalDocument {
    id: string;
    type: string;
    version: string;
    title: string;
    content: string;
    effective_date: string;
    is_current: boolean;
}

interface AcceptanceStatus {
    terms_accepted: boolean;
    privacy_accepted: boolean;
    requires_acceptance: boolean;
}

export default function AcceptTermsPage() {
    const router = useRouter();
    const [termsDoc, setTermsDoc] = useState<LegalDocument | null>(null);
    const [privacyDoc, setPrivacyDoc] = useState<LegalDocument | null>(null);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDocuments = async () => {
            try {
                const [termsRes, privacyRes, statusRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/legal/latest/terms`),
                    fetch(`${API_BASE_URL}/legal/latest/privacy`),
                    fetch(`${API_BASE_URL}/legal/acceptance-status`, {
                        headers: {
                            'Authorization': `Bearer ${getToken()}`,
                        },
                    }),
                ]);

                if (termsRes.ok) {
                    setTermsDoc(await termsRes.json());
                }
                if (privacyRes.ok) {
                    setPrivacyDoc(await privacyRes.json());
                }
                if (statusRes.ok) {
                    const status: AcceptanceStatus = await statusRes.json();
                    setTermsAccepted(status.terms_accepted);
                    setPrivacyAccepted(status.privacy_accepted);

                    // If already accepted, redirect to dashboard
                    if (!status.requires_acceptance) {
                        router.push('/dashboard');
                    }
                }
            } catch (err) {
                console.error('Error fetching documents:', err);
                setError('Error al cargar los documentos legales');
            } finally {
                setLoading(false);
            }
        };

        fetchDocuments();
    }, [router]);

    const acceptDocument = async (documentId: string) => {
        const token = getToken();
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/legal/accept`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ document_id: documentId }),
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.detail || 'Error al aceptar el documento');
        }

        return response.json();
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);

        try {
            const promises = [];

            if (!termsAccepted && termsDoc) {
                promises.push(acceptDocument(termsDoc.id));
            }
            if (!privacyAccepted && privacyDoc) {
                promises.push(acceptDocument(privacyDoc.id));
            }

            await Promise.all(promises);

            // Redirect to dashboard after acceptance
            router.push('/dashboard');
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Error al procesar la aceptación');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
                            RestoNext
                        </span>
                        <span className="text-slate-500 text-sm">MX</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Aceptación de Términos
                    </h1>
                    <p className="text-slate-400">
                        Por favor revisa y acepta los siguientes documentos para continuar
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <p className="text-red-300">{error}</p>
                    </div>
                )}

                {/* Documents */}
                <div className="space-y-6">
                    {/* Terms Section */}
                    {termsDoc && (
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden">
                            <div className="p-6 border-b border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-amber-500/20">
                                        <FileText className="w-5 h-5 text-amber-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-lg font-semibold text-white">
                                            {termsDoc.title}
                                        </h2>
                                        <p className="text-sm text-slate-400">
                                            Versión {termsDoc.version}
                                        </p>
                                    </div>
                                    {termsAccepted && (
                                        <div className="flex items-center gap-1 text-emerald-400">
                                            <CheckCircle2 className="w-5 h-5" />
                                            <span className="text-sm">Aceptado</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="max-h-64 overflow-y-auto text-slate-300 text-sm leading-relaxed prose prose-invert prose-sm">
                                    <pre className="whitespace-pre-wrap font-sans">
                                        {termsDoc.content.substring(0, 1000)}...
                                    </pre>
                                </div>
                                <button
                                    onClick={() => window.open('/legal/terms', '_blank')}
                                    className="mt-4 text-sm text-amber-400 hover:text-amber-300 transition-colors"
                                >
                                    Ver documento completo →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Privacy Section */}
                    {privacyDoc && (
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden">
                            <div className="p-6 border-b border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-blue-500/20">
                                        <Shield className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-lg font-semibold text-white">
                                            {privacyDoc.title}
                                        </h2>
                                        <p className="text-sm text-slate-400">
                                            Versión {privacyDoc.version}
                                        </p>
                                    </div>
                                    {privacyAccepted && (
                                        <div className="flex items-center gap-1 text-emerald-400">
                                            <CheckCircle2 className="w-5 h-5" />
                                            <span className="text-sm">Aceptado</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="max-h-64 overflow-y-auto text-slate-300 text-sm leading-relaxed">
                                    <pre className="whitespace-pre-wrap font-sans">
                                        {privacyDoc.content.substring(0, 1000)}...
                                    </pre>
                                </div>
                                <button
                                    onClick={() => window.open('/legal/privacy', '_blank')}
                                    className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    Ver documento completo →
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="mt-8 space-y-4">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || (termsAccepted && privacyAccepted)}
                        className={`w-full py-4 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2
                            ${termsAccepted && privacyAccepted
                                ? 'bg-emerald-600 cursor-default'
                                : submitting
                                    ? 'bg-slate-600 cursor-wait'
                                    : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-lg shadow-red-500/25'
                            }`}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Procesando...
                            </>
                        ) : termsAccepted && privacyAccepted ? (
                            <>
                                <CheckCircle2 className="w-5 h-5" />
                                Términos Aceptados
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-5 h-5" />
                                Acepto los Términos y Política de Privacidad
                            </>
                        )}
                    </button>

                    <p className="text-center text-xs text-slate-500">
                        Al hacer clic, confirmas que has leído y aceptas los documentos mostrados.
                        Tu IP y la fecha serán registrados conforme a la normativa vigente.
                    </p>
                </div>
            </div>
        </div>
    );
}
