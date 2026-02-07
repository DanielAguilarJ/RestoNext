/**
 * Kitchen WebSocket Hook
 * Connects to FastAPI WebSocket for real-time kitchen order updates
 * 
 * Events handled:
 * - kitchen:new_order -> add new ticket
 * - kitchen:order_update -> update existing ticket
 * - kitchen:order_all_ready -> mark ticket as all-ready
 * - kitchen:order_complete -> remove ticket from board
 * - kitchen:item_update -> update individual item status
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useKDSStore } from '@/lib/store';
import type { KDSTicket, KDSItem } from '@/lib/store';
import { tokenUtils } from '@/lib/api';

function getWebSocketUrl(): string {
    const envWsUrl = process.env.NEXT_PUBLIC_WS_URL;

    if (typeof window === 'undefined') {
        return envWsUrl || 'wss://restonext.me/api';
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    if (envWsUrl) {
        return envWsUrl.replace(/^wss?:/, protocol);
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
        try {
            const url = new URL(apiUrl);
            const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
            return `${wsProtocol}//${url.host}${url.pathname}`;
        } catch {
            // Fallback
        }
    }

    return `${protocol}//${window.location.host}/api`;
}

const WS_BASE_URL = getWebSocketUrl();

/** Transform a backend KDS order payload into a frontend KDSTicket */
function payloadToTicket(payload: any): KDSTicket {
    return {
        id: payload.id,
        orderId: payload.id,
        tableNumber: payload.table_number ?? payload.tableNumber ?? 0,
        orderNumber: payload.order_number ?? payload.orderNumber ?? '',
        orderSource: payload.order_source ?? payload.orderSource ?? 'pos',
        maxPrepTimeMinutes: payload.max_prep_time_minutes ?? payload.maxPrepTimeMinutes ?? 15,
        notes: payload.notes ?? undefined,
        items: (payload.items || []).map((item: any) => ({
            id: item.id,
            name: item.name || item.menu_item_name,
            quantity: item.quantity,
            modifiers: item.modifiers
                ? (Array.isArray(item.modifiers)
                    ? item.modifiers.map((m: any) => (typeof m === 'string' ? m : m.option_name || m.name || String(m)))
                    : [])
                : item.selected_modifiers?.map((m: any) => m.option_name || m.name || String(m)) || [],
            notes: item.notes,
            status: item.status || 'pending',
            prep_time_minutes: item.prep_time_minutes ?? 15,
        })),
        createdAt: payload.paid_at
            ? new Date(payload.paid_at)
            : payload.created_at
                ? new Date(payload.created_at)
                : payload.createdAt
                    ? new Date(payload.createdAt)
                    : new Date(),
    };
}

interface UseKitchenSocketOptions {
    autoConnect?: boolean;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
    pingInterval?: number;
}

interface UseKitchenSocketReturn {
    isConnected: boolean;
    connectionError: string | null;
    reconnectAttempts: number;
    connect: () => void;
    disconnect: () => void;
    sendMessage: (message: any) => void;
}

export function useKitchenSocket(options: UseKitchenSocketOptions = {}): UseKitchenSocketReturn {
    const {
        autoConnect = true,
        reconnectInterval = 3000,
        maxReconnectAttempts = 10,
        pingInterval = 30000,
    } = options;

    const { addTicket, updateTicket, updateItemStatus, removeTicket } = useKDSStore();

    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isManualDisconnectRef = useRef(false);

    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            if (event.data === 'pong') return;

            const rawMessage = JSON.parse(event.data);
            const rawEvent = rawMessage.event || rawMessage.type || '';
            const eventType = rawEvent.includes(':') ? rawEvent.split(':').slice(1).join(':') : rawEvent;
            const payload = rawMessage.payload;

            switch (eventType) {
                case 'new_order': {
                    if (payload) {
                        const ticket = payloadToTicket(payload);
                        addTicket(ticket);
                        playNewOrderSound();
                        triggerVibration([200, 100, 200]);
                    }
                    break;
                }

                case 'order_update': {
                    if (payload) {
                        const ticket = payloadToTicket(payload);
                        updateTicket(ticket);
                    }
                    break;
                }

                case 'order_all_ready': {
                    if (payload) {
                        const ticket = payloadToTicket(payload);
                        updateTicket(ticket);
                        playReadySound();
                    }
                    break;
                }

                case 'order_complete': {
                    if (payload?.order_id) {
                        removeTicket(payload.order_id);
                    }
                    break;
                }

                case 'item_update': {
                    if (payload?.order_id && payload?.item_id && payload?.status) {
                        updateItemStatus(
                            payload.order_id,
                            payload.item_id,
                            payload.status as KDSItem["status"]
                        );
                    }
                    break;
                }

                default:
                    console.log('Unknown kitchen event:', eventType);
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }, [addTicket, updateTicket, updateItemStatus, removeTicket]);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        isManualDisconnectRef.current = false;
        setConnectionError(null);

        const token = tokenUtils.getToken();
        let wsUrl = `${WS_BASE_URL}/ws/kitchen`;
        if (token) {
            wsUrl += `?token=${encodeURIComponent(token)}`;
        }

        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[KDS] WebSocket connected');
                setIsConnected(true);
                setConnectionError(null);
                setReconnectAttempts(0);

                if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) ws.send('ping');
                }, pingInterval);
            };

            ws.onmessage = handleMessage;

            ws.onerror = () => {
                setConnectionError('Error de conexión WebSocket');
            };

            ws.onclose = (event) => {
                console.log('[KDS] WebSocket closed:', event.code);
                setIsConnected(false);
                wsRef.current = null;

                if (pingIntervalRef.current) {
                    clearInterval(pingIntervalRef.current);
                    pingIntervalRef.current = null;
                }

                if (!isManualDisconnectRef.current && reconnectAttempts < maxReconnectAttempts) {
                    const delay = Math.min(reconnectInterval * Math.pow(1.5, reconnectAttempts), 30000);
                    reconnectTimeoutRef.current = setTimeout(() => {
                        setReconnectAttempts(prev => prev + 1);
                        connect();
                    }, delay);
                } else if (reconnectAttempts >= maxReconnectAttempts) {
                    setConnectionError(`No se pudo reconectar después de ${maxReconnectAttempts} intentos`);
                }
            };
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            setConnectionError('No se pudo establecer la conexión');
        }
    }, [handleMessage, maxReconnectAttempts, pingInterval, reconnectAttempts, reconnectInterval]);

    const disconnect = useCallback(() => {
        isManualDisconnectRef.current = true;
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
        }
        if (wsRef.current) {
            wsRef.current.close(1000, 'Manual disconnect');
            wsRef.current = null;
        }
        setIsConnected(false);
        setReconnectAttempts(0);
    }, []);

    const sendMessage = useCallback((message: any) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        }
    }, []);

    useEffect(() => {
        if (autoConnect) connect();
        return () => { disconnect(); };
    }, [autoConnect]);

    return { isConnected, connectionError, reconnectAttempts, connect, disconnect, sendMessage };
}

// ---- Sound & Vibration helpers ----

function playNewOrderSound() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playTone = (freq: number, start: number, dur: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            osc.type = 'sine';
            gain.gain.value = 0.3;
            osc.start(start);
            osc.stop(start + dur);
        };
        const now = ctx.currentTime;
        playTone(523, now, 0.12);        // C5
        playTone(659, now + 0.14, 0.12); // E5
        playTone(784, now + 0.28, 0.18); // G5
    } catch {
        console.debug('Could not play new order sound');
    }
}

function playReadySound() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 1047; // C6
        osc.type = 'sine';
        gain.gain.value = 0.25;
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    } catch {
        console.debug('Could not play ready sound');
    }
}

function triggerVibration(pattern: number[]) {
    try {
        if (navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    } catch {
        // Vibration not supported
    }
}

export default useKitchenSocket;
