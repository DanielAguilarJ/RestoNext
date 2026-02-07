"use client";

import { useRef, useState, useEffect, useCallback } from "react";

/**
 * Hook for managing audio alerts in kitchen display
 * Browser requires user interaction before playing sound
 */
export function useAudioAlert(enabled: boolean = true) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    const [hasPlayedOnce, setHasPlayedOnce] = useState(false);

    // Enable audio after first user interaction (browser requirement)
    useEffect(() => {
        const enableAudio = () => {
            setIsAudioEnabled(true);
            // Initialize audio element
            if (!audioRef.current) {
                audioRef.current = new Audio();
                // Create simple beep using Web Audio API fallback
                audioRef.current.src = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVEsb7Pa8N6oYQ8WQp/Wz6NvHwVElNvqvXsUABZDk+PAjUQAB1CE5tCNRgAFQITp14xFAARAhOrZi0UABECE69qLRQAEQITr2otFAARAhOvai0UABECI7N2MRQAEQI7u4o9GAARAku/mkEcABECV8OuTSQAFQJry75ZLAAVAH/bzm08ABUAi+PafUwAFQCP5+KNWAAVAJPr6plkABUAl+/yoXAAFQCb8/qthAAVAJv0ArWQABUAm/gGwaAAFQCf/ArJrAAVAKAEEtW8ABkApAgW4cwAGQCoDCLt3AAZAKwQKvnsABkAsBAu/fQAGQC0FDcGAAAZALgYOwYIABkAvBw/CgwAGQDAIEMOFAAZAMQgQw4YABkAyCBDChgAGQDIJEMKGAAZAMgkQwoYABkAzCBDChQAGQDMIDMGEAAZAMwgLwIIABkAzBwq/gAAGQDMGCL59AAZAMwUGvXsABkAzBAO7dwAGQDMDALl0AAZAMwH/t3EABkAz//+1bgAGQDP9/7NrAAZAM/z+sGgABkAz+v2uZQAFQDP5/KtiAAVAM/f6qF8ABUAz9vmkXAAFQDP1+KBZAAVANPb4m1YABUA09fehUwAGQDX2+p9RAAZANvr9n08ABkA29wCcTgAGQDb1AZlMAAZANfIDlkoABkA18wWSSAAGQDXxB41FAAZANOwJiEAABUA07Ad/OwAFQDTqBXgyAAVANOkDciYABUA16gFqGgAFQDbrAF8PAAVANOUA";
            }

            window.removeEventListener("click", enableAudio);
            window.removeEventListener("touchstart", enableAudio);
            window.removeEventListener("keydown", enableAudio);
        };

        window.addEventListener("click", enableAudio);
        window.addEventListener("touchstart", enableAudio);
        window.addEventListener("keydown", enableAudio);

        return () => {
            window.removeEventListener("click", enableAudio);
            window.removeEventListener("touchstart", enableAudio);
            window.removeEventListener("keydown", enableAudio);
        };
    }, []);

    // Play alert sound
    const playAlert = useCallback(() => {
        if (!enabled || !isAudioEnabled) return;

        try {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(console.error);
                setHasPlayedOnce(true);
            }
        } catch (error) {
            console.error("Error playing audio alert:", error);
        }
    }, [enabled, isAudioEnabled]);

    // Play continuous alert for critical items (repeats every 3 seconds)
    const startCriticalAlert = useCallback(() => {
        if (!enabled || !isAudioEnabled) return null;

        playAlert();
        const interval = setInterval(playAlert, 3000);
        return () => clearInterval(interval);
    }, [enabled, isAudioEnabled, playAlert]);

    return {
        isAudioEnabled,
        hasPlayedOnce,
        playAlert,
        startCriticalAlert,
    };
}

/**
 * Hook to fetch KDS config from API
 */
export function useKDSConfig() {
    const [config, setConfig] = useState({
        mode: "restaurant" as "cafeteria" | "restaurant",
        warning_minutes: 5,
        critical_minutes: 10,
        audio_alerts: true,
        shake_animation: true,
        auto_complete_when_ready: false,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadConfig = useCallback(async () => {
        try {
            const token = localStorage.getItem("access_token");
            if (!token) return;

            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://restonext.me/api";
            const response = await fetch(`${API_BASE_URL}/kds/config`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (response.ok) {
                const data = await response.json();
                setConfig({
                    mode: data.mode || "restaurant",
                    warning_minutes: data.warning_minutes || 5,
                    critical_minutes: data.critical_minutes || 10,
                    audio_alerts: data.audio_alerts !== false,
                    shake_animation: data.shake_animation !== false,
                    auto_complete_when_ready: data.auto_complete_when_ready || false,
                });
            }
        } catch (err) {
            console.error("Failed to load KDS config:", err);
            setError("Failed to load kitchen configuration");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    return { config, loading, error, reload: loadConfig };
}
