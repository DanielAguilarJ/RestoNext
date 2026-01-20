"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    CheckCircle,
    PartyPopper,
    Loader2,
    Sparkles,
    XCircle,
} from "lucide-react";

// Import the OnboardingWizard component
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

function OnboardingContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const success = searchParams.get("success") === "true";
    const canceled = searchParams.get("canceled") === "true";
    const sessionId = searchParams.get("session_id");

    const [isLoading, setIsLoading] = useState(true);
    const [verificationStatus, setVerificationStatus] = useState<"pending" | "success" | "error">("pending");
    const [showWizard, setShowWizard] = useState(false);

    useEffect(() => {
        async function verifySession() {
            if (success && sessionId) {
                // Optionally verify the session with your backend
                try {
                    // The webhook should have already processed this
                    // This is just for UI feedback
                    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate loading
                    setVerificationStatus("success");
                    setShowWizard(true);
                } catch (error) {
                    console.error("Session verification error:", error);
                    setVerificationStatus("error");
                }
            } else if (success) {
                setVerificationStatus("success");
                setShowWizard(true);
            } else if (canceled) {
                setVerificationStatus("error");
            }
            setIsLoading(false);
        }

        verifySession();
    }, [success, canceled, sessionId]);

    // Handle wizard completion - redirect to dashboard (safe route)
    const handleWizardComplete = useCallback(() => {
        router.push('/dashboard');
    }, [router]);

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-brand-500 mx-auto mb-4" />
                    <p className="text-zinc-400">Verificando tu pago...</p>
                </div>
            </div>
        );
    }

    // Canceled or error state
    if (canceled || verificationStatus === "error") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md text-center"
                >
                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                        <XCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-4">
                        El pago fue cancelado
                    </h1>
                    <p className="text-zinc-400 mb-8">
                        No te preocupes, no se realizó ningún cargo. Puedes volver a intentarlo cuando quieras.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/#pricing"
                            className="px-6 py-3 bg-brand-500 text-white font-medium rounded-xl hover:bg-brand-600 transition-colors"
                        >
                            Ver planes
                        </Link>
                        <Link
                            href="/"
                            className="px-6 py-3 bg-zinc-800 text-white font-medium rounded-xl hover:bg-zinc-700 transition-colors"
                        >
                            Volver al inicio
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Success state - show the OnboardingWizard
    if (success && verificationStatus === "success") {
        return (
            <>
                {/* Background for the wizard */}
                <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
                    {/* Animated Background */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-20 left-10 w-72 h-72 bg-brand-600/20 rounded-full blur-[100px] animate-float" />
                        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] animate-float-delayed" />
                    </div>
                </div>

                {/* Render the OnboardingWizard */}
                <OnboardingWizard
                    isOpen={showWizard}
                    onComplete={handleWizardComplete}
                    tenantName="Mi Restaurante"
                />
            </>
        );
    }

    // Default fallback - redirect to home if no valid state
    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
            <div className="text-center">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="relative inline-block mb-6"
                >
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                    <motion.div
                        animate={{ y: [-10, -30], opacity: [1, 0] }}
                        transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                        className="absolute -top-2 -right-2"
                    >
                        <Sparkles className="w-6 h-6 text-yellow-400" />
                    </motion.div>
                    <motion.div
                        animate={{ y: [-10, -25], opacity: [1, 0] }}
                        transition={{ duration: 1.2, delay: 0.5, repeat: Infinity, repeatDelay: 2 }}
                        className="absolute -top-1 -left-3"
                    >
                        <PartyPopper className="w-5 h-5 text-pink-400" />
                    </motion.div>
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-4">¡Bienvenido a RestoNext!</h2>
                <p className="text-zinc-400 mb-6">Redirigiendo...</p>
                <Link
                    href="/dashboard"
                    className="px-6 py-3 bg-brand-500 text-white font-medium rounded-xl hover:bg-brand-600 transition-colors"
                >
                    Ir al Dashboard
                </Link>
            </div>
        </div>
    );
}

export default function OnboardingSuccessPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
        }>
            <OnboardingContent />
        </Suspense>
    );
}
