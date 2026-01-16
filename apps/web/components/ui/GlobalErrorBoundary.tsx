'use client';

/**
 * RestoNext MX - Global Error Boundary
 * =====================================
 * Catches JavaScript errors anywhere in the component tree,
 * logs them, and displays a friendly fallback UI.
 * 
 * CRITICAL FOR POS:
 * A restaurant cannot stop operations due to a frontend bug.
 * This boundary ensures graceful degradation and recovery.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    errorId: string;
}

export default class GlobalErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorId: '',
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        // Update state so the next render will show the fallback UI
        return {
            hasError: true,
            error,
            errorId: `ERR-${Date.now().toString(36).toUpperCase()}`,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log to console for development
        console.error('🚨 GlobalErrorBoundary caught an error:', error, errorInfo);

        // Store error info for display
        this.setState({ errorInfo });

        // Call custom error handler if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        // Send to Sentry if available
        if (typeof window !== 'undefined' && (window as any).Sentry) {
            (window as any).Sentry.captureException(error, {
                extra: {
                    componentStack: errorInfo.componentStack,
                    errorId: this.state.errorId,
                },
            });
        }

        // Log to local storage for debugging
        try {
            const errorLog = {
                timestamp: new Date().toISOString(),
                errorId: this.state.errorId,
                message: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack,
                url: window.location.href,
                userAgent: navigator.userAgent,
            };

            const existingLogs = JSON.parse(localStorage.getItem('restonext_error_logs') || '[]');
            existingLogs.unshift(errorLog);
            // Keep only last 10 errors
            localStorage.setItem('restonext_error_logs', JSON.stringify(existingLogs.slice(0, 10)));
        } catch (e) {
            console.error('Failed to log error to localStorage:', e);
        }
    }

    handleReload = () => {
        // Clear potentially corrupted cache
        try {
            // Clear RxDB/IndexedDB cache if it might be corrupted
            if ('indexedDB' in window) {
                // We don't delete the DB, just reload - the app will reinitialize
                console.log('Reloading application...');
            }

            // Clear session storage
            sessionStorage.clear();

        } catch (e) {
            console.error('Error clearing cache:', e);
        }

        // Force a full page reload
        window.location.reload();
    };

    handleGoHome = () => {
        // Clear error state and navigate to home
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
        window.location.href = '/';
    };

    handleHardReset = () => {
        // Nuclear option: clear everything and reload
        try {
            localStorage.clear();
            sessionStorage.clear();

            // Clear all caches
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                });
            }
        } catch (e) {
            console.error('Error during hard reset:', e);
        }

        window.location.href = '/login';
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                    <div className="max-w-lg w-full">
                        {/* Error Card */}
                        <div className="bg-slate-800/80 backdrop-blur-lg rounded-2xl border border-red-500/30 shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 px-6 py-8 text-center border-b border-red-500/20">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 mb-4">
                                    <AlertTriangle className="w-10 h-10 text-red-400 animate-pulse" />
                                </div>
                                <h1 className="text-2xl font-bold text-white mb-2">
                                    ¡Algo salió mal!
                                </h1>
                                <p className="text-slate-300 text-sm">
                                    Ha ocurrido un error inesperado en la aplicación
                                </p>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-4">
                                {/* Error ID */}
                                <div className="bg-slate-900/50 rounded-lg px-4 py-3 border border-slate-700">
                                    <p className="text-xs text-slate-400 mb-1">ID del Error</p>
                                    <code className="text-sm font-mono text-amber-400">
                                        {this.state.errorId}
                                    </code>
                                </div>

                                {/* Error Message (Development Only) */}
                                {process.env.NODE_ENV === 'development' && this.state.error && (
                                    <div className="bg-red-950/30 rounded-lg px-4 py-3 border border-red-500/30">
                                        <p className="text-xs text-red-400 mb-1 flex items-center gap-1">
                                            <Bug className="w-3 h-3" />
                                            Detalles del Error (Solo Dev)
                                        </p>
                                        <pre className="text-xs font-mono text-red-300 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                                            {this.state.error.message}
                                        </pre>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="space-y-3 pt-2">
                                    {/* Primary: Reload POS */}
                                    <button
                                        onClick={this.handleReload}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-green-500/25 hover:shadow-green-500/40"
                                    >
                                        <RefreshCw className="w-5 h-5" />
                                        Recargar POS
                                    </button>

                                    {/* Secondary: Go Home */}
                                    <button
                                        onClick={this.handleGoHome}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all duration-200"
                                    >
                                        <Home className="w-4 h-4" />
                                        Ir al Inicio
                                    </button>

                                    {/* Tertiary: Hard Reset */}
                                    <button
                                        onClick={this.handleHardReset}
                                        className="w-full text-center text-sm text-slate-400 hover:text-red-400 py-2 transition-colors"
                                    >
                                        Reinicio Completo (Borra Caché Local)
                                    </button>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-700">
                                <p className="text-xs text-slate-500 text-center">
                                    Si el problema persiste, contacte a soporte técnico con el ID del error.
                                </p>
                            </div>
                        </div>

                        {/* Logo */}
                        <div className="mt-6 text-center">
                            <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
                                RestoNext
                            </span>
                            <span className="text-slate-500 ml-2 text-sm">MX</span>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// ============================================
// Hook for functional components
// ============================================
export function useErrorHandler() {
    const handleError = React.useCallback((error: Error) => {
        console.error('useErrorHandler caught:', error);

        // Send to Sentry if available
        if (typeof window !== 'undefined' && (window as any).Sentry) {
            (window as any).Sentry.captureException(error);
        }
    }, []);

    return { handleError };
}

// ============================================
// Error display component for inline errors
// ============================================
interface InlineErrorProps {
    error: Error | string;
    retry?: () => void;
    className?: string;
}

export function InlineError({ error, retry, className = '' }: InlineErrorProps) {
    const message = typeof error === 'string' ? error : error.message;

    return (
        <div className={`flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg ${className}`}>
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-sm text-red-300">{message}</p>
            </div>
            {retry && (
                <button
                    onClick={retry}
                    className="flex-shrink-0 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}
