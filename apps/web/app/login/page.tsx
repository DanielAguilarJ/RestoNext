"use client";

/**
 * Login Page
 * Authentication with Appwrite - Premium UI
 */

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UtensilsCrossed, Mail, Lock, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { authApi } from "@/lib/api";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-fill demo credentials if ?demo=true
    useEffect(() => {
        if (searchParams.get("demo") === "true") {
            setEmail("admin@restonext.com");
            setPassword("password123");
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            await authApi.login(email, password);
            // Respect redirect param, default to dashboard
            const redirectTo = searchParams.get('redirect') || '/dashboard';
            router.push(redirectTo);
        } catch (err: any) {
            // Robust error message extraction
            let errorMessage = "Error al iniciar sesión. Verifica tus credenciales.";

            if (err?.message) {
                errorMessage = typeof err.message === 'string'
                    ? err.message
                    : JSON.stringify(err.message);
            } else if (err?.response?.data?.detail) {
                const detail = err.response.data.detail;
                errorMessage = typeof detail === 'string'
                    ? detail
                    : JSON.stringify(detail);
            }

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-mesh relative overflow-hidden flex items-center justify-center p-4">
            {/* Animated Background Elements */}
            <div className="orb orb-brand w-80 h-80 -top-32 -right-32 animate-float" />
            <div className="orb orb-blue w-64 h-64 bottom-1/4 -left-32 animate-float-delayed" />
            <div className="orb orb-purple w-48 h-48 top-1/3 -right-24 animate-float" style={{ animationDelay: '2s' }} />

            {/* Floating Shapes */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-4 h-4 bg-brand-400 rounded-full animate-bounce-soft opacity-60" />
                <div className="absolute top-40 right-20 w-3 h-3 bg-blue-400 rounded-full animate-bounce-soft opacity-60" style={{ animationDelay: '0.5s' }} />
                <div className="absolute bottom-32 left-1/4 w-5 h-5 bg-purple-400 rounded-full animate-bounce-soft opacity-60" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 right-1/4 w-3 h-3 bg-green-400 rounded-full animate-bounce-soft opacity-60" style={{ animationDelay: '1.5s' }} />
            </div>

            {/* Back Button */}
            <Link
                href="/"
                className="absolute top-6 left-6 p-3 glass rounded-xl text-gray-600 dark:text-gray-300 hover:text-brand-600 transition-all duration-300 hover:scale-105 z-20"
            >
                <ArrowLeft className="w-6 h-6" />
            </Link>

            <div className="w-full max-w-md relative z-10 animate-scale-in">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-brand-500 to-brand-700 rounded-3xl shadow-2xl shadow-brand-500/40 mb-6 animate-pulse-glow">
                        <UtensilsCrossed className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
                        RestoNext MX
                        <Sparkles className="w-6 h-6 text-brand-500" />
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Sistema de Gestión para Restaurantes
                    </p>
                </div>

                {/* Login Form Card */}
                <div className="glass rounded-3xl shadow-2xl p-8 border border-white/30">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        Iniciar Sesión
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    </h2>

                    {error && (
                        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm animate-slide-up">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Correo electrónico
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700 rounded-xl
                                             focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all duration-300
                                             text-gray-900 dark:text-white placeholder-gray-400
                                             hover:border-gray-300 dark:hover:border-gray-600"
                                    placeholder="ejemplo@restaurante.com"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Contraseña
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700 rounded-xl
                                             focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all duration-300
                                             text-gray-900 dark:text-white placeholder-gray-400
                                             hover:border-gray-300 dark:hover:border-gray-600"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 
                                     disabled:from-brand-400 disabled:to-brand-500 disabled:cursor-not-allowed
                                     text-white font-bold rounded-xl transition-all duration-300
                                     flex items-center justify-center gap-2
                                     shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40
                                     hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]
                                     animate-slide-up relative overflow-hidden group"
                            style={{ animationDelay: '0.3s' }}
                        >
                            {/* Shimmer effect */}
                            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Iniciando sesión...
                                </>
                            ) : (
                                "Iniciar Sesión"
                            )}
                        </button>
                    </form>

                    {/* Demo Credentials */}
                    <div className="mt-6 pt-6 border-t border-gray-200/50 dark:border-gray-700/50 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                        <div className="glass-subtle rounded-xl p-4 text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                Credenciales de demostración
                            </p>
                            <div className="flex items-center justify-center gap-4 text-sm">
                                <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300">
                                    admin@restonext.com
                                </code>
                                <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300">
                                    password123
                                </code>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                    RestoNext MX © 2024 • Hecho para México 🇲🇽
                </p>
            </div>
        </div>
    );
}

// Suspense Boundary wrapper due to useSearchParams
import { Suspense } from "react";

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-brand-500" /></div>}>
            <LoginForm />
        </Suspense>
    );
}

