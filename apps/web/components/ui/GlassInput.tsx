import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon?: LucideIcon;
    label?: string;
    error?: string;
    containerClassName?: string;
}

export const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
    ({ className, icon: Icon, label, error, containerClassName, ...props }, ref) => {
        return (
            <div className={cn("space-y-2", containerClassName)}>
                {label && (
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">
                        {label}
                    </label>
                )}
                <div className="relative group">
                    {Icon && (
                        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-brand-500 transition-colors duration-300" />
                    )}
                    <input
                        ref={ref}
                        className={cn(
                            "w-full bg-white/5 border border-white/10 rounded-xl",
                            "text-white placeholder:text-zinc-500",
                            "focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50",
                            "outline-none transition-all duration-300",
                            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                            Icon ? "pl-12 pr-4 py-3.5" : "px-4 py-3.5",
                            error && "border-red-500 focus:ring-red-500/50",
                            className
                        )}
                        {...props}
                    />
                    {/* Animated bottom shimmer for focus state */}
                    <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-brand-600 to-brand-400 group-focus-within:w-full transition-all duration-500 ease-out rounded-full" />
                </div>
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-red-400 ml-1 font-medium flex items-center gap-1"
                    >
                        <span className="w-1 h-1 rounded-full bg-red-400" />
                        {error}
                    </motion.p>
                )}
            </div>
        );
    }
);

GlassInput.displayName = "GlassInput";
