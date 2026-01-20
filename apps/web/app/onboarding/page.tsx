"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    CheckCircle,
    PartyPopper,
    ArrowRight,
    Loader2,
    Sparkles,
    UtensilsCrossed,
    Building,
    Settings,
    Users,
    Menu as MenuIcon,
    Package,
    XCircle,
} from "lucide-react";

// Onboarding steps
const ONBOARDING_STEPS = [
    {
        id: "menu",
        title: "Configura tu Menú",
        description: "Agrega tus platillos, categorías y precios",
        icon: MenuIcon,
        href: "/inventory/menu-items",
        color: "from-orange-500 to-red-500",
    },
    {
        id: "tables",
        title: "Crea tus Mesas",
        description: "Define el layout de tu restaurante",
        icon: UtensilsCrossed,
        href: "/admin/tables",
        color: "from-blue-500 to-cyan-500",
    },
    {
        id: "team",
        title: "Invita a tu Equipo",
        description: "Agrega meseros, cocineros y cajeros",
        icon: Users,
        href: "/settings/team",
        color: "from-purple-500 to-pink-500",
    },
    {
        id: "branding",
        title: "Personaliza tu Marca",
        description: "Logo, colores y datos fiscales",
        icon: Building,
        href: "/settings/branding",
        color: "from-emerald-500 to-teal-500",
    },
];

function OnboardingContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const success = searchParams.get("success") === "true";
    const canceled = searchParams.get("canceled") === "true";
    const sessionId = searchParams.get("session_id");

    const [isLoading, setIsLoading] = useState(true);
    const [verificationStatus, setVerificationStatus] = useState<"pending" | "success" | "error">("pending");

    useEffect(() => {
        async function verifySession() {
            if (success && sessionId) {
                // Optionally verify the session with your backend
                try {
                    // The webhook should have already processed this
                    // This is just for UI feedback
                    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate loading
                    setVerificationStatus("success");
                } catch (error) {
                    console.error("Session verification error:", error);
                    setVerificationStatus("error");
                }
            } else if (success) {
                setVerificationStatus("success");
            } else if (canceled) {
                setVerificationStatus("error");
            }
            setIsLoading(false);
        }

        verifySession();
    }, [success, canceled, sessionId]);

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-20 left-10 w-72 h-72 bg-brand-600/20 rounded-full blur-[100px] animate-float" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] animate-float-delayed" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-4 py-16">
                {/* Success Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    {/* Confetti Animation Trigger */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.2 }}
                        className="relative inline-block mb-6"
                    >
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                            <CheckCircle className="w-10 h-10 text-white" />
                        </div>
                        {/* Floating particles */}
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

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-3xl sm:text-4xl font-bold text-white mb-4"
                    >
                        ¡Bienvenido a RestoNext! 🎉
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-lg text-zinc-400 max-w-lg mx-auto"
                    >
                        Tu cuenta está lista. Sigue estos pasos para configurar tu restaurante
                        y comenzar a usar el sistema.
                    </motion.p>
                </motion.div>

                {/* Onboarding Steps */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12"
                >
                    {ONBOARDING_STEPS.map((step, idx) => (
                        <motion.div
                            key={step.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 + idx * 0.1 }}
                        >
                            <Link
                                href={step.href}
                                className="group block p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:-translate-y-1"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Step Number */}
                                    <div className="flex-shrink-0">
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
                                            <step.icon className="w-6 h-6 text-white" />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold text-white group-hover:text-brand-400 transition-colors">
                                                {step.title}
                                            </h3>
                                            <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-brand-400 group-hover:translate-x-1 transition-all" />
                                        </div>
                                        <p className="text-sm text-zinc-400 mt-1">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Quick Actions */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="text-center"
                >
                    <p className="text-zinc-500 text-sm mb-4">
                        ¿Prefieres explorar por tu cuenta?
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/pos"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/25 hover:shadow-xl transition-all hover:scale-105"
                        >
                            <UtensilsCrossed className="w-5 h-5" />
                            <span>Ir al POS</span>
                        </Link>
                        <Link
                            href="/settings"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-zinc-800 text-white font-medium rounded-xl hover:bg-zinc-700 transition-colors"
                        >
                            <Settings className="w-5 h-5" />
                            <span>Configuración</span>
                        </Link>
                    </div>
                </motion.div>

                {/* Help Box */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 }}
                    className="mt-16 p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800 text-center"
                >
                    <Package className="w-8 h-8 text-brand-400 mx-auto mb-3" />
                    <h3 className="font-semibold text-white mb-2">
                        ¿Necesitas ayuda para configurar?
                    </h3>
                    <p className="text-sm text-zinc-400 mb-4">
                        Nuestro equipo puede hacer una sesión de onboarding contigo sin costo adicional.
                    </p>
                    <a
                        href="mailto:soporte@restonext.mx?subject=Solicitud%20de%20onboarding"
                        className="text-brand-400 hover:text-brand-300 text-sm font-medium"
                    >
                        Agendar sesión de onboarding →
                    </a>
                </motion.div>
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
