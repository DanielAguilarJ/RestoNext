"use client";

/**
 * Login Page 2.0
 * Super Professional Auth with Glass UI & Zod Validation
 */

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { UtensilsCrossed, Mail, Lock, Loader2, ArrowLeft, Sparkles, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { GlassInput } from "@/components/ui/GlassInput";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Schema Validation
const loginSchema = z.object({
    email: z.string().min(1, "El correo es requerido").email("Correo electrónico inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres")
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm() {
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors }
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: ""
        }
    });

    // Auto-fill demo credentials
    useEffect(() => {
        if (searchParams.get("demo") === "true") {
            setValue("email", "admin@restonext.com");
            setValue("password", "password123");
        }
    }, [searchParams, setValue]);

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true);
        setError(null);

        try {
            await authApi.login(data.email, data.password);
            setSuccess(true);

            // Artificial delay for success animation
            setTimeout(() => {
                const redirectTo = searchParams.get('redirect') || '/dashboard';
                window.location.href = redirectTo;
            }, 800);
        } catch (err: any) {
            let errorMessage = "Credenciales incorrectas. Inténtalo de nuevo.";
            if (err?.response?.data?.detail) {
                errorMessage = typeof err.response.data.detail === 'string'
                    ? err.response.data.detail
                    : JSON.stringify(err.response.data.detail);
            }
            setError(errorMessage);
            setIsLoading(false);
        }
    };

    // Particles/Orbs for background
    const PageBackground = () => (
        <div className="fixed inset-0 z-0 pointer-events-none">
            {/* Deep Base */}
            <div className="absolute inset-0 bg-zinc-950" />

            {/* Animated Mesh Gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-purple-900/20 rounded-full blur-[120px] animate-blob" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-indigo-900/20 rounded-full blur-[120px] animate-blob animation-delay-2000" />
            <div className="absolute top-[30%] left-[20%] w-[60%] h-[60%] bg-brand-900/10 rounded-full blur-[100px] animate-blob animation-delay-4000" />

            {/* Grid Overlay */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px]" />
        </div>
    );

    return (
        <div className="min-h-screen relative flex items-center justify-center p-4 font-sans overflow-hidden">
            <PageBackground />

            {/* Back Button */}
            <Link
                href="/"
                className="absolute top-6 left-6 p-3 glass-dark rounded-xl text-zinc-400 hover:text-white border border-white/5 hover:border-white/20 transition-all duration-300 hover:scale-105 z-20 group"
            >
                <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
            </Link>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-md relative z-10"
            >
                {/* Logo Section */}
                <div className="text-center mb-8 relative">
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-brand-600 to-brand-800 rounded-3xl shadow-[0_0_40px_-10px_rgba(234,88,12,0.5)] mb-6 relative group"
                    >
                        <div className="absolute inset-0 bg-brand-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
                        <UtensilsCrossed className="w-12 h-12 text-white relative z-10" />
                    </motion.div>
                    <h1 className="text-4xl font-bold text-white flex items-center justify-center gap-2 mb-2 tracking-tight">
                        RestoNext
                        <span className="text-brand-500">MX</span>
                    </h1>
                    <p className="text-zinc-400 text-sm font-medium tracking-wide uppercase opacity-80">
                        Professional Restaurant OS
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-zinc-950/50 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl p-8 relative overflow-hidden group">
                    {/* Gloss Effect */}
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />

                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                            Bienvenido de nuevo
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                        </h2>
                        <p className="text-zinc-400 text-sm">
                            Ingresa tus credenciales para acceder al panel.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3"
                                >
                                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-400 font-medium leading-tight">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-4">
                            <GlassInput
                                icon={Mail}
                                placeholder="ejemplo@restaurante.com"
                                type="email"
                                label="Correo Electrónico"
                                error={errors.email?.message}
                                {...register("email")}
                            />

                            <GlassInput
                                icon={Lock}
                                placeholder="••••••••"
                                type="password"
                                label="Contraseña"
                                error={errors.password?.message}
                                {...register("password")}
                            />
                        </div>

                        <motion.button
                            type="submit"
                            disabled={isLoading || success}
                            className={cn(
                                "w-full py-4 rounded-xl font-bold text-white relative overflow-hidden transition-all duration-300",
                                success
                                    ? "bg-emerald-500 hover:bg-emerald-600"
                                    : "bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 shadow-lg shadow-brand-900/20"
                            )}
                            whileHover={!isLoading && !success ? { scale: 1.02, y: -1 } : {}}
                            whileTap={!isLoading && !success ? { scale: 0.98 } : {}}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Autenticando...</span>
                                    </>
                                ) : success ? (
                                    <>
                                        <CheckCircle className="w-5 h-5 animate-bounce-soft" />
                                        <span>¡Acceso Concedido!</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Iniciar Sesión</span>
                                        <Sparkles className="w-4 h-4 opacity-50" />
                                    </>
                                )}
                            </span>

                            {/* Loading Progress Bar */}
                            {isLoading && (
                                <div className="absolute bottom-0 left-0 h-1 bg-white/30 animate-loader w-full" />
                            )}
                        </motion.button>
                    </form>

                    {/* Footer Links */}
                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <p className="text-xs text-zinc-500">
                            ¿Problemas para acceder?{" "}
                            <a href="#" className="text-brand-400 hover:text-brand-300 transition-colors">
                                Contactar soporte
                            </a>
                        </p>
                    </div>
                </div>

                <p className="text-center text-xs text-zinc-600 mt-8 font-medium">
                    RestoNext MX © 2024 • Professional POS System
                </p>
            </motion.div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
