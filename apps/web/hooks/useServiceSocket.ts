/**
 * Service Request WebSocket Hook
 * Connects to FastAPI WebSocket for real-time service request notifications
 * Used by POS/Waiter stations to receive call-waiter, bill requests, etc.
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
    created_at: string;
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
    onSelfServiceOrder?: (order: SelfServiceOrderNotification) => void;
    playSound?: boolean;
}

interface UseServiceSocketReturn {
    isConnected: boolean;
    connectionError: string | null;
    connect: () => void;
    disconnect: () => void;
    pendingRequests: ServiceRequestNotification[];
    clearRequest: (requestId: string) => void;
}

export function useServiceSocket(options: UseServiceSocketOptions = {}): UseServiceSocketReturn {
    const {
        autoConnect = true,
        onServiceRequest,
        onSelfServiceOrder,
        playSound = true
    } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [pendingRequests, setPendingRequests] = useState<ServiceRequestNotification[]>([]);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Play notification sound
    const playNotificationSound = useCallback((type: 'waiter' | 'bill' | 'order') => {
        if (!playSound) return;
        
        try {
            // Different sounds for different request types
            const soundMap: Record<string, string> = {
                'waiter': '/sounds/bell.mp3',
                'bill': '/sounds/cash.mp3',
                'order': '/sounds/new-order.mp3'
            };
            
            const audio = new Audio(soundMap[type] || '/sounds/notification.mp3');
            audio.volume = 0.7;
            audio.play().catch(console.error);
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
    }, [onServiceRequest, onSelfServiceOrder, playNotificationSound]);

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
        clearRequest
    };
}
