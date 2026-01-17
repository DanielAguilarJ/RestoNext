'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
    Calendar, MapPin, Users, Clock, Download,
    CheckCircle2, AlertCircle, FileText, Pen,
    ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// Types
// ============================================

interface MenuItem {
    name: string;
    unit_price: number;
    quantity: number;
    notes?: string;
    subtotal: number;
}

interface ProposalData {
    quote_id: string;
    event_name: string;
    event_date: string | null;
    guest_count: number;
    location: string | null;
    client_name: string;
    menu_items: MenuItem[];
    subtotal: number;
    tax: number;
    total: number;
    valid_until: string;
    status: string;
    tenant_name: string;
    tenant_logo: string | null;
}

interface SignatureCanvasRef {
    clear: () => void;
    isEmpty: () => boolean;
    toDataURL: () => string;
}

// ============================================
// Signature Pad Component
// ============================================

function SignaturePad({
    onSign,
    disabled = false
}: {
    onSign: (data: string) => void;
    disabled?: boolean;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);

        // Set drawing style
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Fill white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, []);

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();

        if ('touches' in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }

        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (disabled) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || disabled) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoordinates(e);
        ctx.lineTo(x, y);
        ctx.stroke();
        setHasSignature(true);
    };

    const stopDrawing = () => {
        if (isDrawing && hasSignature) {
            const canvas = canvasRef.current;
            if (canvas) {
                onSign(canvas.toDataURL('image/png'));
            }
        }
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
        onSign('');
    };

    return (
        <div className="relative">
            <canvas
                ref={canvasRef}
                className={`w-full h-40 border-2 border-dashed rounded-lg cursor-crosshair
                    ${disabled ? 'border-neutral-300 bg-neutral-100' : 'border-neutral-400 bg-white'}
                    touch-none`}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
            />
            {!hasSignature && !disabled && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-neutral-400 flex items-center gap-2">
                        <Pen className="w-4 h-4" />
                        Firme aquí
                    </p>
                </div>
            )}
            {hasSignature && !disabled && (
                <button
                    onClick={clearSignature}
                    className="absolute top-2 right-2 text-xs text-neutral-500 hover:text-neutral-700 
                        bg-white px-2 py-1 rounded border border-neutral-300"
                >
                    Limpiar
                </button>
            )}
        </div>
    );
}

// ============================================
// Main Page Component
// ============================================

export default function ProposalPortalPage() {
    const params = useParams();
    const token = params.token as string;

    const [proposal, setProposal] = useState<ProposalData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showMenu, setShowMenu] = useState(true);

    // Signing state
    const [signerName, setSignerName] = useState('');
    const [signerEmail, setSignerEmail] = useState('');
    const [signatureData, setSignatureData] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [signing, setSigning] = useState(false);
    const [signed, setSigned] = useState(false);
    const [signError, setSignError] = useState<string | null>(null);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

    // Fetch proposal data
    useEffect(() => {
        async function fetchProposal() {
            try {
                const response = await fetch(`${API_BASE}/catering/proposals/${token}`);
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('Propuesta no encontrada');
                    }
                    throw new Error('Error al cargar la propuesta');
                }
                const data = await response.json();
                setProposal(data);

                // Check if already signed
                if (data.status === 'accepted') {
                    setSigned(true);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error desconocido');
            } finally {
                setLoading(false);
            }
        }

        if (token) {
            fetchProposal();
        }
    }, [token, API_BASE]);

    // Handle form submission
    const handleSign = async () => {
        if (!signerName.trim()) {
            setSignError('Por favor ingrese su nombre');
            return;
        }
        if (!signatureData) {
            setSignError('Por favor firme en el recuadro');
            return;
        }
        if (!acceptedTerms) {
            setSignError('Debe aceptar los términos y condiciones');
            return;
        }

        setSigning(true);
        setSignError(null);

        try {
            const response = await fetch(`${API_BASE}/catering/proposals/${token}/sign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    signature_data: signatureData,
                    signer_name: signerName,
                    signer_email: signerEmail || null,
                    accepted_terms: acceptedTerms,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error al firmar');
            }

            setSigned(true);
        } catch (err) {
            setSignError(err instanceof Error ? err.message : 'Error al procesar la firma');
        } finally {
            setSigning(false);
        }
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(amount);
    };

    // Format date
    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Por confirmar';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
                    <p className="text-neutral-600">Cargando propuesta...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !proposal) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                        Propuesta no encontrada
                    </h1>
                    <p className="text-neutral-600">
                        {error || 'El enlace puede haber expirado o ser inválido.'}
                    </p>
                    <p className="text-neutral-500 mt-4 text-sm">
                        Por favor contacte al restaurante para obtener un nuevo enlace.
                    </p>
                </div>
            </div>
        );
    }

    // Check if expired
    const isExpired = new Date(proposal.valid_until) < new Date();
    const canSign = !signed && !isExpired && proposal.status !== 'accepted';

    return (
        <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-neutral-200">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-neutral-900">
                                {proposal.tenant_name}
                            </h1>
                            <p className="text-neutral-500 text-sm">Propuesta de Catering</p>
                        </div>
                        {proposal.tenant_logo && (
                            <img
                                src={proposal.tenant_logo}
                                alt={proposal.tenant_name}
                                className="h-12 w-auto"
                            />
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8">
                {/* Status Banner */}
                {signed && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center"
                    >
                        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-emerald-800 mb-2">
                            ¡Propuesta Aceptada!
                        </h2>
                        <p className="text-emerald-700">
                            Tu evento ha sido confirmado exitosamente.
                            Nos pondremos en contacto contigo pronto.
                        </p>
                    </motion.div>
                )}

                {isExpired && !signed && (
                    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                        <h2 className="text-lg font-bold text-amber-800 mb-1">
                            Propuesta Expirada
                        </h2>
                        <p className="text-amber-700 text-sm">
                            Esta propuesta expiró el {formatDate(proposal.valid_until)}.
                            Por favor contacte al restaurante para una nueva cotización.
                        </p>
                    </div>
                )}

                {/* Event Info Card */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
                    <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-6">
                        <h2 className="text-2xl font-bold mb-1">{proposal.event_name}</h2>
                        <p className="text-emerald-100">Para: {proposal.client_name}</p>
                    </div>

                    <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-start gap-3">
                            <Calendar className="w-5 h-5 text-emerald-600 mt-0.5" />
                            <div>
                                <p className="text-xs text-neutral-500 uppercase">Fecha</p>
                                <p className="text-sm font-medium text-neutral-900">
                                    {formatDate(proposal.event_date)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Users className="w-5 h-5 text-emerald-600 mt-0.5" />
                            <div>
                                <p className="text-xs text-neutral-500 uppercase">Invitados</p>
                                <p className="text-sm font-medium text-neutral-900">
                                    {proposal.guest_count} personas
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-emerald-600 mt-0.5" />
                            <div>
                                <p className="text-xs text-neutral-500 uppercase">Lugar</p>
                                <p className="text-sm font-medium text-neutral-900">
                                    {proposal.location || 'Por confirmar'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Clock className="w-5 h-5 text-emerald-600 mt-0.5" />
                            <div>
                                <p className="text-xs text-neutral-500 uppercase">Válido hasta</p>
                                <p className={`text-sm font-medium ${isExpired ? 'text-red-600' : 'text-neutral-900'}`}>
                                    {new Date(proposal.valid_until).toLocaleDateString('es-MX')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Menu Section */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="w-full p-6 flex items-center justify-between hover:bg-neutral-50 transition"
                    >
                        <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-emerald-600" />
                            Menú Propuesto
                        </h3>
                        {showMenu ? <ChevronUp /> : <ChevronDown />}
                    </button>

                    <AnimatePresence>
                        {showMenu && (
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="px-6 pb-6">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-neutral-200">
                                                <th className="text-left py-3 text-sm font-medium text-neutral-500">
                                                    Platillo
                                                </th>
                                                <th className="text-center py-3 text-sm font-medium text-neutral-500">
                                                    Cantidad
                                                </th>
                                                <th className="text-right py-3 text-sm font-medium text-neutral-500">
                                                    Precio Unit.
                                                </th>
                                                <th className="text-right py-3 text-sm font-medium text-neutral-500">
                                                    Subtotal
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {proposal.menu_items.map((item, index) => (
                                                <tr key={index} className="border-b border-neutral-100">
                                                    <td className="py-3 text-neutral-900">{item.name}</td>
                                                    <td className="py-3 text-center text-neutral-600">{item.quantity}</td>
                                                    <td className="py-3 text-right text-neutral-600">
                                                        {formatCurrency(item.unit_price)}
                                                    </td>
                                                    <td className="py-3 text-right font-medium text-neutral-900">
                                                        {formatCurrency(item.subtotal)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Totals */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                    <div className="flex justify-end">
                        <div className="w-64">
                            <div className="flex justify-between py-2 text-neutral-600">
                                <span>Subtotal</span>
                                <span>{formatCurrency(proposal.subtotal)}</span>
                            </div>
                            <div className="flex justify-between py-2 text-neutral-600">
                                <span>IVA (16%)</span>
                                <span>{formatCurrency(proposal.tax)}</span>
                            </div>
                            <div className="flex justify-between py-3 border-t-2 border-emerald-600 text-xl font-bold text-emerald-700">
                                <span>Total</span>
                                <span>{formatCurrency(proposal.total)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Download PDF Button */}
                <div className="flex justify-center mb-8">
                    <a
                        href={`${API_BASE}/catering/proposals/${token}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white 
                            rounded-lg font-medium hover:bg-neutral-800 transition shadow-lg"
                    >
                        <Download className="w-5 h-5" />
                        Descargar PDF
                    </a>
                </div>

                {/* Signature Section */}
                {canSign && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl shadow-lg p-6"
                    >
                        <h3 className="text-xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
                            <Pen className="w-5 h-5 text-emerald-600" />
                            Aceptar y Firmar Propuesta
                        </h3>

                        <div className="space-y-6">
                            {/* Signer info */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                                        Nombre Completo *
                                    </label>
                                    <input
                                        type="text"
                                        value={signerName}
                                        onChange={(e) => setSignerName(e.target.value)}
                                        placeholder="Ingrese su nombre"
                                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg 
                                            focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                                            text-neutral-900 placeholder-neutral-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                                        Correo Electrónico (opcional)
                                    </label>
                                    <input
                                        type="email"
                                        value={signerEmail}
                                        onChange={(e) => setSignerEmail(e.target.value)}
                                        placeholder="correo@ejemplo.com"
                                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg 
                                            focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                                            text-neutral-900 placeholder-neutral-400"
                                    />
                                </div>
                            </div>

                            {/* Signature pad */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Firma Digital *
                                </label>
                                <SignaturePad
                                    onSign={setSignatureData}
                                    disabled={signing}
                                />
                            </div>

                            {/* Terms checkbox */}
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    checked={acceptedTerms}
                                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                                    className="mt-1 w-5 h-5 text-emerald-600 border-neutral-300 rounded
                                        focus:ring-emerald-500"
                                />
                                <label htmlFor="terms" className="text-sm text-neutral-600">
                                    He leído y acepto los <span className="text-emerald-600 font-medium">términos y condiciones</span> del servicio,
                                    incluyendo las políticas de pago, cancelación y modificaciones
                                    establecidas en esta propuesta.
                                </label>
                            </div>

                            {/* Error message */}
                            {signError && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {signError}
                                </div>
                            )}

                            {/* Submit button */}
                            <button
                                onClick={handleSign}
                                disabled={signing}
                                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 
                                    text-white font-bold rounded-xl shadow-lg
                                    hover:from-emerald-700 hover:to-emerald-800 transition
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    flex items-center justify-center gap-2"
                            >
                                {signing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-5 h-5" />
                                        Aceptar y Confirmar Evento
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-neutral-900 text-neutral-400 py-8 mt-12">
                <div className="max-w-4xl mx-auto px-4 text-center text-sm">
                    <p>Propuesta generada por {proposal.tenant_name}</p>
                    <p className="mt-2">Powered by RestoNext</p>
                </div>
            </footer>
        </div>
    );
}
