/**
 * Service Request WebSocket Hook
 * Connects to FastAPI WebSocket for real-time service request notifications
 * 
 * Features:
 * - Exponential backoff with jitter for reconnection
 * - Debounced connection state to prevent UI flicker
 * - Configurable via environment variables
 * 
 * Events handled:
 * - service_request:new - Customer calls waiter
 * - table:bill_requested - Customer requests bill from QR
 * - table:new_self_service_order - New order from tablet
 * - table:status_changed - Table status updates
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { tokenUtils } from '@/lib/api';

// ============================================
// Configuration (Environment Variables)
// ============================================

const WS_RECONNECT_BASE_MS = parseInt(
    process.env.NEXT_PUBLIC_WS_RECONNECT_BASE_MS || '3000'
);
const WS_RECONNECT_MAX_MS = parseInt(
    process.env.NEXT_PUBLIC_WS_RECONNECT_MAX_MS || '30000'
);
const WS_CONNECTION_DEBOUNCE_MS = parseInt(
    process.env.NEXT_PUBLIC_WS_CONNECTION_DEBOUNCE_MS || '3000'
);
const WS_PING_INTERVAL_MS = parseInt(
    process.env.NEXT_PUBLIC_WS_PING_INTERVAL_MS || '30000'
);

/**
 * Construct WebSocket URL that respects HTTPS requirements
 * If the page is served over HTTPS, we must use WSS
 */
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
            return `${protocol}//${url.host}`;
        } catch {
            // Fallback to current host
        }
    }

    return `${protocol}//${window.location.host}`;
}

const WS_BASE_URL = getWebSocketUrl();

// ============================================
// Global Circuit Breaker
// ============================================
let globalLastAttempt = 0;
let globalAttemptCount = 0;
const CIRCUIT_BREAKER_WINDOW = 2000; // 2 seconds
const CIRCUIT_BREAKER_THRESHOLD = 5; // Max 5 attempts in window

// ============================================
// Types
// ============================================

export interface ServiceRequestNotification {
    id: string;
    table_number: number;
    table_id: string;
    request_type: 'waiter' | 'bill' | 'refill' | 'custom';
    message?: string;
    order_total?: number;
    order_id?: string;
    created_at: string;
}

export interface BillRequestNotification {
    table_id: string;
    table_number: number;
    order_id: string;
    total: number;
    items_count: number;
    created_at: string;
}

export interface TableStatusNotification {
    table_id: string;
    table_number: number;
    status: 'free' | 'occupied' | 'bill_requested' | 'service_requested';
    previous_status?: string;
}

export interface SelfServiceOrderNotification {
    table_number: number;
    table_id: string;
    order_id: string;
    order_total: number;
    items_count: number;
}

interface UseServiceSocketOptions {
    autoConnect?: boolean;
    onServiceRequest?: (request: ServiceRequestNotification) => void;
    onBillRequest?: (request: BillRequestNotification) => void;
    onTableStatusChange?: (status: TableStatusNotification) => void;
    onSelfServiceOrder?: (order: SelfServiceOrderNotification) => void;
    playSound?: boolean;
}

interface UseServiceSocketReturn {
    isConnected: boolean;
    connectionError: string | null;
    connect: () => void;
    disconnect: () => void;
    pendingRequests: ServiceRequestNotification[];
    pendingBillRequests: BillRequestNotification[];
    clearRequest: (requestId: string) => void;
    clearBillRequest: (tableId: string) => void;
}

export function useServiceSocket(options: UseServiceSocketOptions = {}): UseServiceSocketReturn {
    const {
        autoConnect = true,
        onServiceRequest,
        onBillRequest,
        onTableStatusChange,
        onSelfServiceOrder,
        playSound = true
    } = options;

    // Raw connection state (updates immediately)
    const [rawIsConnected, setRawIsConnected] = useState(false);
    // Debounced connection state (what UI sees)
    const [isConnected, setIsConnected] = useState(true); // Start optimistic
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [pendingRequests, setPendingRequests] = useState<ServiceRequestNotification[]>([]);
    const [pendingBillRequests, setPendingBillRequests] = useState<BillRequestNotification[]>([]);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const connectionDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts = useRef(0);
    const mountedRef = useRef(true);
    const manualDisconnect = useRef(false);

    /**
     * Calculate reconnection delay with exponential backoff and jitter
     */
    const getReconnectDelay = useCallback((): number => {
        const baseDelay = Math.min(
            WS_RECONNECT_BASE_MS * Math.pow(1.5, reconnectAttempts.current),
            WS_RECONNECT_MAX_MS
        );
        // Add jitter (±20%)
        const jitter = baseDelay * (0.8 + Math.random() * 0.4);
        return Math.round(jitter);
    }, []);

    /**
     * Update debounced connection state
     * Immediately shows connected, but debounces disconnected
     */
    const updateDebouncedConnectionState = useCallback((connected: boolean) => {
        if (connectionDebounceRef.current) {
            clearTimeout(connectionDebounceRef.current);
            connectionDebounceRef.current = null;
        }

        if (connected) {
            // Immediately show connected
            setIsConnected(true);
            setConnectionError(null);
            reconnectAttempts.current = 0;
        } else {
            // Debounce disconnected state to prevent flicker
            connectionDebounceRef.current = setTimeout(() => {
                if (mountedRef.current && !rawIsConnected) {
                    setIsConnected(false);
                }
            }, WS_CONNECTION_DEBOUNCE_MS);
        }
    }, [rawIsConnected]);

    // Play notification sound with vibration
    const playNotificationSound = useCallback((type: 'waiter' | 'bill' | 'order' | 'alert') => {
        if (!playSound) return;

        try {
            const soundMap: Record<string, string> = {
                'waiter': '/sounds/bell.mp3',
                'bill': '/sounds/cash.mp3',
                'order': '/sounds/new-order.mp3',
                'alert': '/sounds/urgent.mp3'
            };

            const audio = new Audio(soundMap[type] || '/sounds/notification.mp3');
            audio.volume = type === 'bill' ? 0.9 : 0.7;
            audio.play().catch(console.error);

            if (type === 'bill' && 'vibrate' in navigator) {
                navigator.vibrate([200, 100, 200]);
            }
        } catch (error) {
            console.error('Error playing notification sound:', error);
        }
    }, [playSound]);

    // Handle incoming messages
    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            if (event.data === 'pong') return;

            const data = JSON.parse(event.data);

            switch (data.event) {
                case 'service_request:new':
                    const request: ServiceRequestNotification = data.payload;

                    setPendingRequests(prev => {
                        if (prev.some(r => r.id === request.id)) return prev;
                        return [...prev, request];
                    });

                    playNotificationSound(request.request_type === 'bill' ? 'bill' : 'waiter');
                    onServiceRequest?.(request);
                    break;

                case 'service_request:resolved':
                    setPendingRequests(prev =>
                        prev.filter(r => r.id !== data.payload.id)
                    );
                    break;

                case 'table:bill_requested':
                    const billRequest: BillRequestNotification = {
                        table_id: data.payload.table_id,
                        table_number: data.payload.table_number,
                        order_id: data.payload.order_id,
                        total: data.payload.total,
                        items_count: data.payload.items_count || 0,
                        created_at: data.payload.created_at || new Date().toISOString()
                    };

                    setPendingBillRequests(prev => {
                        if (prev.some(r => r.table_id === billRequest.table_id)) return prev;
                        return [...prev, billRequest];
                    });

                    playNotificationSound('bill');
                    onBillRequest?.(billRequest);
                    break;

                case 'table:status_changed':
                    const statusChange: TableStatusNotification = data.payload;

                    if (statusChange.status === 'free' || statusChange.status === 'occupied') {
                        setPendingBillRequests(prev =>
                            prev.filter(r => r.table_id !== statusChange.table_id)
                        );
                    }

                    onTableStatusChange?.(statusChange);
                    break;

                case 'table:new_self_service_order':
                    const order: SelfServiceOrderNotification = data.payload;
                    playNotificationSound('order');
                    onSelfServiceOrder?.(order);
                    break;

                case 'table:call_waiter':
                    playNotificationSound('waiter');
                    break;

                default:
                    console.log('Unknown service event:', data.event);
            }
        } catch (error) {
            console.error('Error parsing service WebSocket message:', error);
        }
    }, [onServiceRequest, onBillRequest, onTableStatusChange, onSelfServiceOrder, playNotificationSound]);

    // Connect to WebSocket
    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        if (manualDisconnect.current) return;

        setConnectionError(null);

        const token = tokenUtils.getToken();
        let wsUrl = `${WS_BASE_URL}/ws/waiter`;
        if (token) {
            wsUrl += `?token=${encodeURIComponent(token)}`;
        }

        try {
            // Circuit Breaker Check
            const now = Date.now();
            if (now - globalLastAttempt < CIRCUIT_BREAKER_WINDOW) {
                globalAttemptCount++;
            } else {
                globalAttemptCount = 1; // Reset if outside window
            }
            globalLastAttempt = now;

            if (globalAttemptCount > CIRCUIT_BREAKER_THRESHOLD) {
                console.error(`[ServiceSocket] ⛔ Circuit breaker activated: ${globalAttemptCount} attempts in < ${CIRCUIT_BREAKER_WINDOW}ms`);
                if (mountedRef.current) {
                    setConnectionError('Connection blocked: Too many attempts');
                    manualDisconnect.current = true; // Stop auto-reconnect
                }
                return;
            }

            console.log(`[ServiceSocket] Connecting... (local attempt ${reconnectAttempts.current + 1}, global ${globalAttemptCount})`);
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                if (!mountedRef.current) return;

                console.log('📢 Service WebSocket connected');
                setRawIsConnected(true);
                updateDebouncedConnectionState(true);

                // Ping to keep alive
                pingIntervalRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send('ping');
                    }
                }, WS_PING_INTERVAL_MS);
            };

            ws.onmessage = handleMessage;

            ws.onerror = (error) => {
                console.error('Service WebSocket error:', error);
                if (mountedRef.current) {
                    setConnectionError('Connection error');
                }
            };

            ws.onclose = (event) => {
                if (!mountedRef.current) return;

                console.log(`[ServiceSocket] Closed (code: ${event.code})`);
                setRawIsConnected(false);
                updateDebouncedConnectionState(false);
                wsRef.current = null;

                if (pingIntervalRef.current) {
                    clearInterval(pingIntervalRef.current);
                    pingIntervalRef.current = null;
                }

                // Auto-reconnect with exponential backoff (unless manually disconnected)
                if (!manualDisconnect.current) {
                    const delay = getReconnectDelay();
                    reconnectAttempts.current++;

                    console.log(`[ServiceSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        if (mountedRef.current && !manualDisconnect.current) {
                            connect();
                        }
                    }, delay);
                }
            };
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            if (mountedRef.current) {
                setConnectionError('Failed to connect');
                updateDebouncedConnectionState(false);
            }
        }
    }, [handleMessage, getReconnectDelay, updateDebouncedConnectionState]);

    // Disconnect
    const disconnect = useCallback(() => {
        manualDisconnect.current = true;

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
        }
        if (connectionDebounceRef.current) {
            clearTimeout(connectionDebounceRef.current);
            connectionDebounceRef.current = null;
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        setRawIsConnected(false);
        setIsConnected(false);
        reconnectAttempts.current = 0;
    }, []);

    // Clear a specific request (mark as handled)
    const clearRequest = useCallback((requestId: string) => {
        setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    }, []);

    // Clear a bill request (mark as handled)
    const clearBillRequest = useCallback((tableId: string) => {
        setPendingBillRequests(prev => prev.filter(r => r.table_id !== tableId));
    }, []);

    // Auto-connect on mount
    useEffect(() => {
        mountedRef.current = true;
        manualDisconnect.current = false;

        if (autoConnect) {
            connect();
        }

        return () => {
            mountedRef.current = false;
            disconnect();
        };
    }, [autoConnect]); // Don't include connect/disconnect to avoid infinite loops

    return {
        isConnected,
        connectionError,
        connect,
        disconnect,
        pendingRequests,
        pendingBillRequests,
        clearRequest,
        clearBillRequest
    };
}
