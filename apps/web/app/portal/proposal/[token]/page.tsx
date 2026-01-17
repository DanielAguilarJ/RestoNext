'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
    Calendar, MapPin, Users, Clock, Download,
    CheckCircle2, AlertCircle, FileText, Pen,
    ChevronDown, ChevronUp, Loader2, CreditCard,
    Shield, Lock, Sparkles
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
    deposit_percentage?: number;
    deposit_amount?: number;
    deposit_paid?: boolean;
}

interface PaymentIntentData {
    client_secret: string;
    amount: number;
    currency: string;
    deposit_percentage: number;
    payment_intent_id: string;
}

type PortalStep = 'view' | 'sign' | 'payment' | 'confirmed' | 'booked';

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
// Stripe Payment Form Component
// ============================================

function StripePaymentForm({
    clientSecret,
    depositAmount,
    depositPercentage,
    onPaymentSuccess,
    onPaymentError,
    priceTotal
}: {
    clientSecret: string;
    depositAmount: number;
    depositPercentage: number;
    onPaymentSuccess: (paymentIntentId: string) => void;
    onPaymentError: (error: string) => void;
    priceTotal: number;
}) {
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');
    const [name, setName] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(amount);
    };

    // Note: In production, use @stripe/react-stripe-js with actual Stripe Elements
    // This is a simplified UI for demo purposes
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setError(null);

        try {
            // In real implementation:
            // 1. Use stripe.confirmCardPayment(clientSecret, { payment_method: { card: elements } })
            // 2. Handle the result

            // For demo, simulate success after validation
            if (!cardNumber || !expiry || !cvc || !name) {
                throw new Error('Por favor complete todos los campos');
            }

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Extract payment intent ID from client secret
            const paymentIntentId = clientSecret.split('_secret_')[0];
            onPaymentSuccess(paymentIntentId);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error al procesar el pago';
            setError(message);
            onPaymentError(message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="bg-neutral-50 rounded-xl p-6">
            {/* Deposit Info */}
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-emerald-800 font-medium">Anticipo ({depositPercentage}%)</span>
                    <span className="text-2xl font-bold text-emerald-700">
                        {formatCurrency(depositAmount)}
                    </span>
                </div>
                <p className="text-sm text-emerald-600">
                    Total del evento: {formatCurrency(priceTotal)}
                </p>
                <p className="text-xs text-emerald-500 mt-2">
                    El saldo restante de {formatCurrency(priceTotal - depositAmount)} se pagará el día del evento.
                </p>
            </div>

            {/* Payment Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Nombre en la tarjeta
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Juan Pérez"
                        className="w-full px-4 py-3 border border-neutral-300 rounded-lg 
                            focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                            text-neutral-900 placeholder-neutral-400"
                        disabled={processing}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Número de tarjeta
                    </label>
                    <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                        <input
                            type="text"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                            placeholder="4242 4242 4242 4242"
                            className="w-full pl-11 pr-4 py-3 border border-neutral-300 rounded-lg 
                                focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                                text-neutral-900 placeholder-neutral-400"
                            disabled={processing}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Vencimiento
                        </label>
                        <input
                            type="text"
                            value={expiry}
                            onChange={(e) => setExpiry(e.target.value)}
                            placeholder="MM/YY"
                            maxLength={5}
                            className="w-full px-4 py-3 border border-neutral-300 rounded-lg 
                                focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                                text-neutral-900 placeholder-neutral-400"
                            disabled={processing}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            CVC
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={cvc}
                                onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                placeholder="123"
                                className="w-full px-4 py-3 border border-neutral-300 rounded-lg 
                                    focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                                    text-neutral-900 placeholder-neutral-400"
                                disabled={processing}
                            />
                            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={processing}
                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 
                        text-white font-bold rounded-xl shadow-lg
                        hover:from-emerald-700 hover:to-emerald-800 transition
                        disabled:opacity-50 disabled:cursor-not-allowed
                        flex items-center justify-center gap-2"
                >
                    {processing ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Procesando pago...
                        </>
                    ) : (
                        <>
                            <Lock className="w-5 h-5" />
                            Pagar {formatCurrency(depositAmount)}
                        </>
                    )}
                </button>

                {/* Security Badge */}
                <div className="flex items-center justify-center gap-2 pt-4 border-t border-neutral-200">
                    <Shield className="w-4 h-4 text-neutral-400" />
                    <span className="text-xs text-neutral-500">
                        Pago seguro procesado por Stripe
                    </span>
                </div>
            </form>
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

    // Portal navigation step
    const [currentStep, setCurrentStep] = useState<PortalStep>('view');

    // Signing state
    const [signerName, setSignerName] = useState('');
    const [signerEmail, setSignerEmail] = useState('');
    const [signatureData, setSignatureData] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [signing, setSigning] = useState(false);
    const [signError, setSignError] = useState<string | null>(null);

    // Payment state
    const [paymentIntent, setPaymentIntent] = useState<PaymentIntentData | null>(null);
    const [paymentLoading, setPaymentLoading] = useState(false);

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

                // Determine initial step based on status
                if (data.deposit_paid) {
                    setCurrentStep('booked');
                } else if (data.status === 'accepted') {
                    setCurrentStep('confirmed');
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

    // Handle signing
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

            // Move to payment step
            setCurrentStep('confirmed');

            // Automatically initiate payment intent
            await initiatePayment();
        } catch (err) {
            setSignError(err instanceof Error ? err.message : 'Error al procesar la firma');
        } finally {
            setSigning(false);
        }
    };

    // Initiate payment
    const initiatePayment = async () => {
        setPaymentLoading(true);
        try {
            const response = await fetch(`${API_BASE}/catering/proposals/${token}/pay-deposit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                // Payment not configured - that's OK, just show confirmation
                if (response.status === 503) {
                    console.log('Payment not configured, staying on confirmation');
                    return;
                }
                throw new Error('Error al iniciar el pago');
            }

            const data: PaymentIntentData = await response.json();
            setPaymentIntent(data);
            setCurrentStep('payment');
        } catch (err) {
            console.error('Payment initiation error:', err);
            // Don't show error - payment might just not be configured
        } finally {
            setPaymentLoading(false);
        }
    };

    // Handle payment success
    const handlePaymentSuccess = async (paymentIntentId: string) => {
        try {
            const response = await fetch(`${API_BASE}/catering/proposals/${token}/confirm-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ payment_intent_id: paymentIntentId }),
            });

            if (!response.ok) {
                throw new Error('Error al confirmar el pago');
            }

            setCurrentStep('booked');
        } catch (err) {
            console.error('Payment confirmation error:', err);
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
    const canSign = currentStep === 'view' && !isExpired && proposal.status !== 'accepted';
    const depositPercentage = proposal.deposit_percentage || 50;
    const depositAmount = proposal.total * (depositPercentage / 100);

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
                {/* Progress Steps */}
                <div className="mb-8">
                    <div className="flex items-center justify-center gap-2">
                        {['Revisar', 'Firmar', 'Pagar', '¡Reservado!'].map((step, idx) => {
                            const stepMap: PortalStep[] = ['view', 'sign', 'payment', 'booked'];
                            const currentIdx = stepMap.indexOf(currentStep);
                            const isActive = idx <= currentIdx || (currentStep === 'confirmed' && idx <= 2);
                            const isCurrent = stepMap[idx] === currentStep || (currentStep === 'confirmed' && idx === 2);

                            return (
                                <div key={step} className="flex items-center">
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition ${isActive
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-neutral-100 text-neutral-400'
                                        } ${isCurrent ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}>
                                        {idx === 3 && isActive ? (
                                            <Sparkles className="w-4 h-4" />
                                        ) : (
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${isActive ? 'bg-emerald-500 text-white' : 'bg-neutral-300 text-white'
                                                }`}>
                                                {idx + 1}
                                            </span>
                                        )}
                                        <span className="hidden sm:inline">{step}</span>
                                    </div>
                                    {idx < 3 && (
                                        <div className={`w-8 h-0.5 mx-1 ${idx < currentIdx || (currentStep === 'confirmed' && idx < 2)
                                                ? 'bg-emerald-300'
                                                : 'bg-neutral-200'
                                            }`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* BOOKED Success State */}
                {currentStep === 'booked' && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-8 text-center text-white shadow-xl"
                    >
                        <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6">
                            <Sparkles className="w-10 h-10" />
                        </div>
                        <h2 className="text-3xl font-bold mb-3">
                            ¡Fecha Reservada!
                        </h2>
                        <p className="text-emerald-100 text-lg mb-6">
                            Tu anticipo ha sido recibido y tu fecha está asegurada.
                        </p>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            Anticipo de {formatCurrency(depositAmount)} pagado
                        </div>
                    </motion.div>
                )}

                {/* Confirmed (Signed) State - Show Payment Option */}
                {currentStep === 'confirmed' && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6"
                    >
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center mb-6">
                            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-emerald-800 mb-2">
                                ¡Propuesta Firmada!
                            </h2>
                            <p className="text-emerald-700">
                                Solo falta un paso: asegura tu fecha con el anticipo
                            </p>
                        </div>

                        {/* Payment CTA */}
                        {paymentLoading ? (
                            <div className="bg-white rounded-xl p-8 text-center shadow-lg">
                                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-4" />
                                <p className="text-neutral-600">Preparando el pago...</p>
                            </div>
                        ) : !paymentIntent ? (
                            <div className="bg-white rounded-xl p-8 shadow-lg">
                                <div className="text-center mb-6">
                                    <CreditCard className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-neutral-900 mb-2">
                                        Reserva tu fecha con el anticipo
                                    </h3>
                                    <p className="text-neutral-600">
                                        Paga el {depositPercentage}% ({formatCurrency(depositAmount)}) para asegurar tu reservación
                                    </p>
                                </div>

                                <button
                                    onClick={initiatePayment}
                                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 
                                        text-white font-bold rounded-xl shadow-lg
                                        hover:from-emerald-700 hover:to-emerald-800 transition
                                        flex items-center justify-center gap-2"
                                >
                                    <CreditCard className="w-5 h-5" />
                                    Pagar Anticipo para Confirmar Fecha
                                </button>

                                <p className="text-center text-xs text-neutral-500 mt-4">
                                    Nos pondremos en contacto para coordinar los detalles del evento
                                </p>
                            </div>
                        ) : null}
                    </motion.div>
                )}

                {/* Payment Step */}
                {currentStep === 'payment' && paymentIntent && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6"
                    >
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h3 className="text-xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-emerald-600" />
                                Pagar Anticipo
                            </h3>

                            <StripePaymentForm
                                clientSecret={paymentIntent.client_secret}
                                depositAmount={paymentIntent.amount}
                                depositPercentage={paymentIntent.deposit_percentage}
                                priceTotal={proposal.total}
                                onPaymentSuccess={handlePaymentSuccess}
                                onPaymentError={(error) => console.error(error)}
                            />
                        </div>
                    </motion.div>
                )}

                {isExpired && currentStep === 'view' && (
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
                            {currentStep !== 'booked' && (
                                <div className="flex justify-between py-2 text-sm text-amber-600 bg-amber-50 px-2 rounded mt-2">
                                    <span>Anticipo ({depositPercentage}%)</span>
                                    <span className="font-semibold">{formatCurrency(depositAmount)}</span>
                                </div>
                            )}
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
                                        Correo Electrónico (para recibir confirmación)
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
                                    incluyendo las políticas de pago (anticipo del {depositPercentage}%), cancelación y modificaciones
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
                                        Firmar y Continuar al Pago
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
