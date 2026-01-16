/**
 * Service Request WebSocket Hook
 * Connects to FastAPI WebSocket for real-time service request notifications
 * Used by POS/Waiter stations to receive call-waiter, bill requests, etc.
 * 
 * Events handled:
 * - service_request:new - Customer calls waiter
 * - table:bill_requested - Customer requests bill from QR
 * - table:new_self_service_order - New order from tablet
 * - table:status_changed - Table status updates
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { tokenUtils } from '@/lib/api';

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

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

    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [pendingRequests, setPendingRequests] = useState<ServiceRequestNotification[]>([]);
    const [pendingBillRequests, setPendingBillRequests] = useState<BillRequestNotification[]>([]);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Play notification sound with vibration
    const playNotificationSound = useCallback((type: 'waiter' | 'bill' | 'order' | 'alert') => {
        if (!playSound) return;

        try {
            // Different sounds for different request types
            const soundMap: Record<string, string> = {
                'waiter': '/sounds/bell.mp3',
                'bill': '/sounds/cash.mp3',
                'order': '/sounds/new-order.mp3',
                'alert': '/sounds/urgent.mp3'
            };

            const audio = new Audio(soundMap[type] || '/sounds/notification.mp3');
            audio.volume = type === 'bill' ? 0.9 : 0.7; // Bill requests are louder
            audio.play().catch(console.error);

            // Trigger vibration on mobile for bill requests
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

                    // Add to pending requests
                    setPendingRequests(prev => {
                        // Avoid duplicates
                        if (prev.some(r => r.id === request.id)) return prev;
                        return [...prev, request];
                    });

                    // Play appropriate sound
                    playNotificationSound(request.request_type === 'bill' ? 'bill' : 'waiter');

                    // Callback
                    onServiceRequest?.(request);
                    break;

                case 'service_request:resolved':
                    // Remove from pending requests
                    setPendingRequests(prev =>
                        prev.filter(r => r.id !== data.payload.id)
                    );
                    break;

                case 'table:bill_requested':
                    // Nuevo: Manejo de solicitud de cuenta desde QR
                    const billRequest: BillRequestNotification = {
                        table_id: data.payload.table_id,
                        table_number: data.payload.table_number,
                        order_id: data.payload.order_id,
                        total: data.payload.total,
                        items_count: data.payload.items_count || 0,
                        created_at: data.payload.created_at || new Date().toISOString()
                    };

                    // Add to pending bill requests
                    setPendingBillRequests(prev => {
                        if (prev.some(r => r.table_id === billRequest.table_id)) return prev;
                        return [...prev, billRequest];
                    });

                    // Play urgent bill sound
                    playNotificationSound('bill');

                    // Callback
                    onBillRequest?.(billRequest);
                    break;

                case 'table:status_changed':
                    // Mesa cambió de estado (sincronización en tiempo real)
                    const statusChange: TableStatusNotification = data.payload;

                    // If status is no longer bill_requested or service_requested, remove from pending
                    if (statusChange.status === 'free' || statusChange.status === 'occupied') {
                        setPendingBillRequests(prev =>
                            prev.filter(r => r.table_id !== statusChange.table_id)
                        );
                    }

                    // Callback
                    onTableStatusChange?.(statusChange);
                    break;

                case 'table:new_self_service_order':
                    const order: SelfServiceOrderNotification = data.payload;

                    // Play order sound
                    playNotificationSound('order');

                    // Callback
                    onSelfServiceOrder?.(order);
                    break;

                case 'table:call_waiter':
                    // Legacy call waiter event (backward compatibility)
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

        setConnectionError(null);

        const token = tokenUtils.getToken();
        let wsUrl = `${WS_BASE_URL}/ws/waiter`;
        if (token) {
            wsUrl += `?token=${encodeURIComponent(token)}`;
        }

        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('📢 Service WebSocket connected');
                setIsConnected(true);
                setConnectionError(null);

                // Ping to keep alive
                pingIntervalRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send('ping');
                    }
                }, 30000);
            };

            ws.onmessage = handleMessage;

            ws.onerror = (error) => {
                console.error('Service WebSocket error:', error);
                setConnectionError('Connection error');
            };

            ws.onclose = () => {
                setIsConnected(false);
                wsRef.current = null;

                if (pingIntervalRef.current) {
                    clearInterval(pingIntervalRef.current);
                }

                // Reconnect after delay
                reconnectTimeoutRef.current = setTimeout(() => {
                    connect();
                }, 3000);
            };
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            setConnectionError('Failed to connect');
        }
    }, [handleMessage]);

    // Disconnect
    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
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
        if (autoConnect) {
            connect();
        }
        return () => {
            disconnect();
        };
    }, [autoConnect, connect, disconnect]);

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
