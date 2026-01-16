/**
 * PIN Pad Authentication Component
 * Fast, touch-optimized numeric keypad for quick staff login
 * 
 * SPEED OPTIMIZATION:
 * - Auto-submit when PIN is complete (4-6 digits)
 * - Large 60px touch targets
 * - Haptic feedback on press
 * - Visual PIN dots with animation
 * - Delete with long-press to clear all
 * 
 * Target: Login in under 3 seconds
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Delete, Lock, Fingerprint, User } from "lucide-react";
import { usePosAudio } from "@/hooks/usePosAudio";

// ============================================
// Types
// ============================================

interface PinPadProps {
    isOpen: boolean;
    onLogin: (pin: string) => Promise<{ success: boolean; user?: any; error?: string }>;
    onCancel?: () => void;
    logoUrl?: string;
    restaurantName?: string;
    minLength?: number;
    maxLength?: number;
}

// ============================================
// Component
// ============================================

export function PinPad({
    isOpen,
    onLogin,
    onCancel,
    logoUrl,
    restaurantName = "RestoNext",
    minLength = 4,
    maxLength = 6,
}: PinPadProps) {
    const [pin, setPin] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [shake, setShake] = useState(false);
    const [lastUser, setLastUser] = useState<string | null>(null);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);

    const { playSuccess, playError, playClick } = usePosAudio();

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setPin("");
            setError(null);
            setShake(false);
            // Try to get last logged in user from localStorage
            const savedUser = localStorage.getItem('restonext_last_user');
            if (savedUser) {
                try {
                    setLastUser(JSON.parse(savedUser).name);
                } catch {
                    setLastUser(null);
                }
            }
        }
    }, [isOpen]);

    // Auto-submit when PIN reaches max length
    useEffect(() => {
        if (pin.length === maxLength) {
            handleSubmit();
        }
    }, [pin, maxLength]);

    // Handle digit press
    const handleDigit = useCallback((digit: string) => {
        if (pin.length >= maxLength || isLoading) return;

        playClick();
        setError(null);
        setPin(prev => prev + digit);
    }, [pin.length, maxLength, isLoading, playClick]);

    // Handle backspace
    const handleBackspace = useCallback(() => {
        if (pin.length === 0 || isLoading) return;

        playClick();
        setPin(prev => prev.slice(0, -1));
    }, [pin.length, isLoading, playClick]);

    // Handle clear (long press)
    const handleClear = useCallback(() => {
        if (isLoading) return;

        playClick();
        setPin("");
        setError(null);
    }, [isLoading, playClick]);

    // Long press handlers
    const handleBackspaceStart = useCallback(() => {
        longPressTimer.current = setTimeout(() => {
            handleClear();
        }, 500);
    }, [handleClear]);

    const handleBackspaceEnd = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    // Submit PIN
    const handleSubmit = useCallback(async () => {
        if (pin.length < minLength || isLoading) {
            setShake(true);
            playError();
            setTimeout(() => setShake(false), 500);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await onLogin(pin);

            if (result.success) {
                playSuccess();
                // Save last user to localStorage
                if (result.user) {
                    localStorage.setItem('restonext_last_user', JSON.stringify({
                        name: result.user.name,
                        role: result.user.role,
                    }));
                }
            } else {
                playError();
                setError(result.error || "PIN incorrecto");
                setShake(true);
                setTimeout(() => {
                    setShake(false);
                    setPin("");
                }, 500);
            }
        } catch (err) {
            playError();
            setError("Error de conexión");
            setShake(true);
            setTimeout(() => {
                setShake(false);
                setPin("");
            }, 500);
        } finally {
            setIsLoading(false);
        }
    }, [pin, minLength, isLoading, onLogin, playSuccess, playError]);

    if (!isOpen) return null;

    // Digit buttons
    const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

    return (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-500 via-transparent to-transparent" />
            </div>

            {/* Floating Orbs */}
            <div className="orb orb-brand w-64 h-64 -top-32 -right-32 opacity-20 animate-float" />
            <div className="orb orb-blue w-48 h-48 bottom-1/4 -left-24 opacity-20 animate-float-delayed" />

            {/* Content */}
            <div className="relative z-10 w-full max-w-sm">
                {/* Logo & Restaurant Name */}
                <div className="text-center mb-8">
                    {logoUrl ? (
                        <img
                            src={logoUrl}
                            alt={restaurantName}
                            className="w-20 h-20 mx-auto mb-4 rounded-2xl shadow-lg"
                        />
                    ) : (
                        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 
                                      flex items-center justify-center shadow-lg shadow-brand-500/30">
                            <Lock className="w-10 h-10 text-white" />
                        </div>
                    )}
                    <h1 className="text-2xl font-bold text-white">{restaurantName}</h1>
                    {lastUser && (
                        <p className="text-gray-400 mt-1 flex items-center justify-center gap-2">
                            <User className="w-4 h-4" />
                            Último: {lastUser}
                        </p>
                    )}
                </div>

                {/* PIN Dots */}
                <div className={`
                    flex items-center justify-center gap-4 mb-8
                    ${shake ? 'animate-shake' : ''}
                `}>
                    {Array.from({ length: maxLength }).map((_, i) => (
                        <div
                            key={i}
                            className={`
                                w-4 h-4 rounded-full transition-all duration-200
                                ${i < pin.length
                                    ? 'bg-brand-500 scale-110 shadow-lg shadow-brand-500/50'
                                    : 'bg-gray-600 scale-100'
                                }
                            `}
                        />
                    ))}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 text-center text-red-400 font-medium animate-fade-in">
                        {error}
                    </div>
                )}

                {/* Number Pad */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {digits.map((digit, index) => {
                        if (digit === "") {
                            return <div key={index} className="aspect-square" />;
                        }

                        if (digit === "⌫") {
                            return (
                                <button
                                    key={index}
                                    onClick={handleBackspace}
                                    onMouseDown={handleBackspaceStart}
                                    onMouseUp={handleBackspaceEnd}
                                    onMouseLeave={handleBackspaceEnd}
                                    onTouchStart={handleBackspaceStart}
                                    onTouchEnd={handleBackspaceEnd}
                                    disabled={isLoading}
                                    className={`
                                        aspect-square rounded-2xl
                                        bg-gray-700/50 hover:bg-gray-600/50
                                        text-white
                                        flex items-center justify-center
                                        transition-all duration-200
                                        active:scale-95 active:bg-red-500/30
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                        min-h-[60px]
                                    `}
                                >
                                    <Delete className="w-6 h-6" />
                                </button>
                            );
                        }

                        return (
                            <button
                                key={index}
                                onClick={() => handleDigit(digit)}
                                disabled={isLoading || pin.length >= maxLength}
                                className={`
                                    aspect-square rounded-2xl
                                    bg-gray-700/50 hover:bg-gray-600/50
                                    text-3xl font-bold text-white
                                    flex items-center justify-center
                                    transition-all duration-200
                                    active:scale-95 active:bg-brand-500/30
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    min-h-[60px]
                                `}
                            >
                                {digit}
                            </button>
                        );
                    })}
                </div>

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={pin.length < minLength || isLoading}
                    className={`
                        w-full py-4 rounded-2xl
                        flex items-center justify-center gap-3
                        text-lg font-bold
                        transition-all duration-300
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${isLoading
                            ? 'bg-gray-600 text-gray-300'
                            : 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40'
                        }
                    `}
                >
                    {isLoading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Verificando...</span>
                        </>
                    ) : (
                        <>
                            <Fingerprint className="w-5 h-5" />
                            <span>Ingresar</span>
                        </>
                    )}
                </button>

                {/* Cancel Button */}
                {onCancel && (
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="w-full mt-4 py-3 text-gray-400 hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                )}
            </div>

            {/* Time Display */}
            <div className="absolute bottom-8 text-gray-500 text-sm">
                {new Date().toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit'
                })}
            </div>

            {/* Keyframes for shake animation */}
            <style jsx global>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
                    20%, 40%, 60%, 80% { transform: translateX(8px); }
                }
                .animate-shake {
                    animation: shake 0.5s ease-in-out;
                }
            `}</style>
        </div>
    );
}

// ============================================
// PIN Lock Screen Wrapper
// ============================================

interface PinLockScreenProps {
    isLocked: boolean;
    onUnlock: (user: any) => void;
    inactivityTimeout?: number; // milliseconds
    children: React.ReactNode;
    loginFn: (pin: string) => Promise<{ success: boolean; user?: any; error?: string }>;
    restaurantName?: string;
    logoUrl?: string;
}

export function PinLockScreen({
    isLocked: externalLocked,
    onUnlock,
    inactivityTimeout = 5 * 60 * 1000, // 5 minutes default
    children,
    loginFn,
    restaurantName,
    logoUrl,
}: PinLockScreenProps) {
    const [isLocked, setIsLocked] = useState(externalLocked);
    const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

    // Sync with external lock state
    useEffect(() => {
        setIsLocked(externalLocked);
    }, [externalLocked]);

    // Reset inactivity timer on user activity
    const resetInactivityTimer = useCallback(() => {
        if (inactivityTimer.current) {
            clearTimeout(inactivityTimer.current);
        }

        if (!isLocked && inactivityTimeout > 0) {
            inactivityTimer.current = setTimeout(() => {
                setIsLocked(true);
            }, inactivityTimeout);
        }
    }, [isLocked, inactivityTimeout]);

    // Listen for user activity
    useEffect(() => {
        const events = ['mousedown', 'touchstart', 'keydown', 'scroll'];

        events.forEach(event => {
            window.addEventListener(event, resetInactivityTimer);
        });

        // Initial timer
        resetInactivityTimer();

        return () => {
            if (inactivityTimer.current) {
                clearTimeout(inactivityTimer.current);
            }
            events.forEach(event => {
                window.removeEventListener(event, resetInactivityTimer);
            });
        };
    }, [resetInactivityTimer]);

    // Handle successful login
    const handleLogin = useCallback(async (pin: string) => {
        const result = await loginFn(pin);

        if (result.success && result.user) {
            setIsLocked(false);
            onUnlock(result.user);
            resetInactivityTimer();
        }

        return result;
    }, [loginFn, onUnlock, resetInactivityTimer]);

    return (
        <>
            {children}
            <PinPad
                isOpen={isLocked}
                onLogin={handleLogin}
                restaurantName={restaurantName}
                logoUrl={logoUrl}
            />
        </>
    );
}
