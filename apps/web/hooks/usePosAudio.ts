"use client";

import { useCallback, useRef, useEffect, useState } from "react";

type SoundType = 'success' | 'error' | 'notification' | 'click';

const SOUND_URLS: Record<SoundType, string> = {
    success: '/sounds/success.mp3',
    error: '/sounds/error.mp3',
    notification: '/sounds/notification.mp3',
    click: '/sounds/click.mp3',
};

const FALLBACK_TONES: Record<SoundType, { freq: number; dur: number }> = {
    success: { freq: 880, dur: 150 },
    error: { freq: 220, dur: 200 },
    notification: { freq: 660, dur: 100 },
    click: { freq: 1000, dur: 30 },
};

export function usePosAudio(opts: { enabled?: boolean; volume?: number } = {}) {
    const { enabled: init = true, volume: initVol = 0.5 } = opts;
    const [isEnabled, setIsEnabled] = useState(init);
    const [volume, setVolume] = useState(initVol);
    const ctxRef = useRef<AudioContext | null>(null);
    const audioRef = useRef<Map<SoundType, HTMLAudioElement>>(new Map());

    useEffect(() => {
        const handler = () => {
            if (!ctxRef.current) {
                ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
        };
        window.addEventListener('click', handler, { once: true });
        return () => window.removeEventListener('click', handler);
    }, []);

    useEffect(() => {
        if (!isEnabled) return;
        Object.entries(SOUND_URLS).forEach(([k, url]) => {
            const a = new Audio(url);
            a.preload = 'auto';
            a.volume = volume;
            audioRef.current.set(k as SoundType, a);
        });
        return () => { audioRef.current.clear(); };
    }, [isEnabled, volume]);

    const playBeep = useCallback((type: SoundType) => {
        const ctx = ctxRef.current;
        if (!ctx) return;
        const { freq, dur } = FALLBACK_TONES[type];
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur / 1000);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + dur / 1000);
    }, [volume]);

    const play = useCallback((type: SoundType) => {
        if (!isEnabled) return;
        const a = audioRef.current.get(type);
        if (a && a.readyState >= 2) {
            a.currentTime = 0;
            a.play().catch(() => playBeep(type));
        } else {
            playBeep(type);
        }
    }, [isEnabled, playBeep]);

    return {
        playSuccess: useCallback(() => play('success'), [play]),
        playError: useCallback(() => play('error'), [play]),
        playNotification: useCallback(() => play('notification'), [play]),
        playClick: useCallback(() => play('click'), [play]),
        play,
        setEnabled: setIsEnabled,
        setVolume,
        isEnabled,
    };
}
