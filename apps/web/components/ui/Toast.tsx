"use client";

/**
 * Toast Component - Premium Notification System
 */

import { useEffect, useState } from "react";
import { Check, X, AlertTriangle, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    onClose: (id: string) => void;
}

const toastConfig = {
    success: {
        icon: Check,
        bgClass: "bg-gradient-to-r from-green-500 to-green-600",
        iconBgClass: "bg-white/20",
        progressClass: "bg-white/30",
    },
    error: {
        icon: X,
        bgClass: "bg-gradient-to-r from-red-500 to-red-600",
        iconBgClass: "bg-white/20",
        progressClass: "bg-white/30",
    },
    warning: {
        icon: AlertTriangle,
        bgClass: "bg-gradient-to-r from-amber-500 to-orange-500",
        iconBgClass: "bg-white/20",
        progressClass: "bg-white/30",
    },
    info: {
        icon: Info,
        bgClass: "bg-gradient-to-r from-blue-500 to-blue-600",
        iconBgClass: "bg-white/20",
        progressClass: "bg-white/30",
    },
};

export function Toast({ id, type, title, message, duration = 5000, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const config = toastConfig[type];
    const Icon = config.icon;

    useEffect(() => {
        // Animate in
        setTimeout(() => setIsVisible(true), 10);

        // Auto dismiss
        const timeout = setTimeout(() => {
            handleClose();
        }, duration);

        return () => clearTimeout(timeout);
    }, [duration]);

    const handleClose = () => {
        setIsLeaving(true);
        setTimeout(() => {
            onClose(id);
        }, 300);
    };

    return (
        <div
            className={cn(
                "glass rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 max-w-sm",
                config.bgClass,
                isVisible && !isLeaving ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
            )}
        >
            <div className="flex items-start gap-4 p-4 text-white">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", config.iconBgClass)}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold">{title}</p>
                    {message && (
                        <p className="text-sm text-white/80 mt-1">{message}</p>
                    )}
                </div>
                <button
                    onClick={handleClose}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Progress bar */}
            <div className={cn("h-1", config.progressClass)}>
                <div
                    className="h-full bg-white/50 transition-all ease-linear"
                    style={{
                        width: "100%",
                        animation: `shrink ${duration}ms linear forwards`
                    }}
                />
            </div>

            <style jsx>{`
                @keyframes shrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </div>
    );
}

// Toast Container
interface ToastContainerProps {
    toasts: Array<{
        id: string;
        type: ToastType;
        title: string;
        message?: string;
        duration?: number;
    }>;
    onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
            {toasts.map((toast) => (
                <Toast key={toast.id} {...toast} onClose={onClose} />
            ))}
        </div>
    );
}

// Hook for managing toasts
export function useToast() {
    const [toasts, setToasts] = useState<Array<{
        id: string;
        type: ToastType;
        title: string;
        message?: string;
        duration?: number;
    }>>([]);

    const addToast = (type: ToastType, title: string, message?: string, duration?: number) => {
        const id = Math.random().toString(36).substring(7);
        setToasts((prev) => [...prev, { id, type, title, message, duration }]);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return {
        toasts,
        addToast,
        removeToast,
        success: (title: string, message?: string) => addToast("success", title, message),
        error: (title: string, message?: string) => addToast("error", title, message),
        warning: (title: string, message?: string) => addToast("warning", title, message),
        info: (title: string, message?: string) => addToast("info", title, message),
        toast: (props: { title?: string; description?: string; variant?: "default" | "destructive"; duration?: number }) => {
            const type = props.variant === "destructive" ? "error" : "info";
            addToast(type, props.title || "Notification", props.description, props.duration);
        }
    };
}
