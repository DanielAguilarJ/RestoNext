"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Sparkles, ArrowRight, Check } from "lucide-react";

interface UpgradePromptProps {
    moduleName: string;
    requiredLicense?: string;
    currentPlan?: string | null;
    features?: string[];
    onClose?: () => void;
}

/**
 * Plan upgrade options
 */
const PLANS = {
    starter: {
        name: "Starter",
        price: 999,
        modules: ["inventory"],
    },
    professional: {
        name: "Professional",
        price: 2499,
        modules: ["inventory", "self_service", "kds_pro", "catering", "loyalty", "reservations"],
    },
    enterprise: {
        name: "Enterprise",
        price: 5999,
        modules: ["inventory", "self_service", "kds_pro", "analytics_ai", "multi_branch", "catering", "loyalty", "reservations", "promotions", "admin_access"],
    },
};

/**
 * Get the minimum plan required for a license
 */
function getMinimumPlan(license: string): keyof typeof PLANS {
    if (PLANS.starter.modules.includes(license)) return "starter";
    if (PLANS.professional.modules.includes(license)) return "professional";
    return "enterprise";
}

/**
 * UpgradePrompt Component
 * 
 * Shows when a user tries to access a module they don't have access to.
 * Provides clear upgrade path with pricing and features.
 */
export function UpgradePrompt({
    moduleName,
    requiredLicense,
    currentPlan,
    features = [],
    onClose,
}: UpgradePromptProps) {
    const router = useRouter();

    const minimumPlan = requiredLicense ? getMinimumPlan(requiredLicense) : "professional";
    const suggestedPlan = PLANS[minimumPlan];

    const defaultFeatures = [
        `Acceso completo a ${moduleName}`,
        "Soporte prioritario",
        "Actualizaciones automáticas",
        "Sin límites de uso",
    ];

    const displayFeatures = features.length > 0 ? features : defaultFeatures;

    const handleUpgrade = () => {
        router.push(`/settings/billing?upgrade=${requiredLicense}&plan=${minimumPlan}`);
    };

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-lg w-full"
            >
                {/* Card */}
                <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                                <Lock className="w-8 h-8 text-amber-400" />
                            </div>
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute -top-1 -right-1"
                            >
                                <Sparkles className="w-5 h-5 text-amber-400" />
                            </motion.div>
                        </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-bold text-white text-center mb-2">
                        Desbloquea {moduleName}
                    </h2>
                    <p className="text-zinc-400 text-center mb-8">
                        Esta funcionalidad está disponible en el plan{" "}
                        <span className="text-amber-400 font-medium">{suggestedPlan.name}</span>
                    </p>

                    {/* Features */}
                    <div className="bg-zinc-800/50 rounded-2xl p-4 mb-8">
                        <p className="text-sm font-medium text-zinc-300 mb-3">
                            Lo que obtienes:
                        </p>
                        <ul className="space-y-2">
                            {displayFeatures.map((feature, idx) => (
                                <li key={idx} className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <Check className="w-3 h-3 text-emerald-400" />
                                    </div>
                                    <span className="text-sm text-zinc-300">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Pricing */}
                    <div className="text-center mb-6">
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-3xl font-bold text-white">
                                ${suggestedPlan.price.toLocaleString()}
                            </span>
                            <span className="text-zinc-500">/mes</span>
                        </div>
                        {currentPlan && (
                            <p className="text-sm text-zinc-500 mt-1">
                                Tu plan actual: <span className="text-zinc-400">{currentPlan}</span>
                            </p>
                        )}
                    </div>

                    {/* CTA Buttons */}
                    <div className="space-y-3">
                        <button
                            onClick={handleUpgrade}
                            className="w-full py-3 px-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                        >
                            <span>Actualizar a {suggestedPlan.name}</span>
                            <ArrowRight className="w-5 h-5" />
                        </button>

                        <Link
                            href="/#pricing"
                            className="w-full py-3 px-6 bg-zinc-800 text-zinc-300 font-medium rounded-xl hover:bg-zinc-700 transition-colors flex items-center justify-center"
                        >
                            Ver todos los planes
                        </Link>

                        {onClose && (
                            <button
                                onClick={onClose}
                                className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-400 transition-colors"
                            >
                                Volver
                            </button>
                        )}
                    </div>
                </div>

                {/* Bottom text */}
                <p className="text-center text-xs text-zinc-500 mt-4">
                    ¿Tienes preguntas?{" "}
                    <a href="mailto:ventas@restonext.mx" className="text-brand-400 hover:underline">
                        Contacta a ventas
                    </a>
                </p>
            </motion.div>
        </div>
    );
}

/**
 * Module gate component that wraps protected content
 */
interface ModuleGateProps {
    moduleKey: string;
    moduleName: string;
    requiredLicense: string;
    hasAccess: boolean;
    currentPlan?: string | null;
    children: React.ReactNode;
}

export function ModuleGate({
    moduleKey,
    moduleName,
    requiredLicense,
    hasAccess,
    currentPlan,
    children,
}: ModuleGateProps) {
    if (!hasAccess) {
        return (
            <UpgradePrompt
                moduleName={moduleName}
                requiredLicense={requiredLicense}
                currentPlan={currentPlan}
            />
        );
    }

    return <>{children}</>;
}
