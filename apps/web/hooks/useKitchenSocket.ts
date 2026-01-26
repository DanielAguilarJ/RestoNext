/**
 * Kitchen WebSocket Hook
 * Connects to FastAPI WebSocket for real-time kitchen order updates
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useKDSStore } from '@/lib/store';
import { tokenUtils } from '@/lib/api';

/**
 * Construct WebSocket URL that respects HTTPS requirements
 * If the page is served over HTTPS, we must use WSS
 * 
 * DigitalOcean App Platform Routing:
 * - Frontend calls: wss://restonext.me/api/ws/kitchen
 * - DO strips /api prefix before forwarding to backend
 * - Backend receives: /ws/kitchen (which matches @app.websocket("/ws/kitchen"))
 */
function getWebSocketUrl(): string {
    const envWsUrl = process.env.NEXT_PUBLIC_WS_URL;

    if (typeof window === 'undefined') {
        // Server-side: use env var or production default
        // Note: In production this should come from env var
        // Strip trailing /ws if present to avoid duplication (e.g. /api/ws/ws/kitchen)
        // But for path-based routing it should likely be base URL
        return envWsUrl || 'wss://restonext.me/api';
    }

    // Client-side: Derive protocol from current page
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    if (envWsUrl) {
        // Replace ws:// or wss:// with correct protocol based on page
        return envWsUrl.replace(/^wss?:/, protocol);
    }

    // Use API URL base if available (transform http(s) to ws(s))
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
        try {
            const url = new URL(apiUrl);
            const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
            // Keep the full path including /api
            return `${wsProtocol}//${url.host}${url.pathname}`;
        } catch {
            // Fallback on parse error
        }
    }

    // Fallback: use current host with /api path
    return `${protocol}//${window.location.host}/api`;
}

const WS_BASE_URL = getWebSocketUrl();

export interface KitchenMessage {
    type: 'new_order' | 'order_update' | 'item_update' | 'ping' | 'pong';
    payload?: {
        id: string;
        orderId: string;
        tableNumber: number;
        items?: Array<{
            id: string;
            name: string;
            quantity: number;
            modifiers: string[];
            notes?: string;
            status: 'pending' | 'preparing' | 'ready';
        }>;
        createdAt?: string;
        // For item updates
        itemId?: string;
        newStatus?: 'pending' | 'preparing' | 'ready';
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
    sendMessage: (message: KitchenMessage) => void;
}

export function useKitchenSocket(options: UseKitchenSocketOptions = {}): UseKitchenSocketReturn {
    const {
        autoConnect = true,
        reconnectInterval = 3000,
        maxReconnectAttempts = 10,
        pingInterval = 30000,
    } = options;

    // Store actions
    const { addTicket, updateItemStatus, setTickets } = useKDSStore();

    // State
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);

    // Refs
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isManualDisconnectRef = useRef(false);

    // Handle incoming messages
    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            // Handle pong response
            if (event.data === 'pong') {
                return;
            }

            const message: KitchenMessage = JSON.parse(event.data);

            switch (message.type) {
                case 'new_order':
                    if (message.payload) {
                        addTicket({
                            id: message.payload.id,
                            orderId: message.payload.orderId,
                            tableNumber: message.payload.tableNumber,
                            items: message.payload.items || [],
                            createdAt: message.payload.createdAt
                                ? new Date(message.payload.createdAt)
                                : new Date(),
                        });

                        // Play notification sound (optional)
                        playNotificationSound();
                    }
                    break;

                case 'order_update':
                    // Handle full order updates (refresh order data)
                    if (message.payload) {
                        // Could dispatch a full refresh or update specific order
                        console.log('Order update received:', message.payload);
                    }
                    break;

                case 'item_update':
                    // Handle individual item status changes
                    if (message.payload?.orderId && message.payload?.itemId && message.payload?.newStatus) {
                        updateItemStatus(
                            message.payload.orderId,
                            message.payload.itemId,
                            message.payload.newStatus
                        );
                    }
                    break;

                default:
                    console.log('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }, [addTicket, updateItemStatus]);

    // Connect to WebSocket
    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        isManualDisconnectRef.current = false;
        setConnectionError(null);

        // Build WebSocket URL with optional token
        // WS_BASE_URL already includes /api (e.g., wss://domain/api)
        // Append /ws/kitchen to get: wss://domain/api/ws/kitchen
        // DO strips /api, backend receives /ws/kitchen
        const token = tokenUtils.getToken();
        let wsUrl = `${WS_BASE_URL}/ws/kitchen`;
        if (token) {
            wsUrl += `?token=${encodeURIComponent(token)}`;
        }

        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('🍳 Kitchen WebSocket connected');
                setIsConnected(true);
                setConnectionError(null);
                setReconnectAttempts(0);

                // Start ping interval to keep connection alive
                if (pingIntervalRef.current) {
                    clearInterval(pingIntervalRef.current);
                }
                pingIntervalRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send('ping');
                    }
                }, pingInterval);
            };

            ws.onmessage = handleMessage;

            ws.onerror = (error) => {
                console.error('Kitchen WebSocket error:', error);
                setConnectionError('Connection error occurred');
            };

            ws.onclose = (event) => {
                console.log('Kitchen WebSocket closed:', event.code, event.reason);
                setIsConnected(false);
                wsRef.current = null;

                // Clear ping interval
                if (pingIntervalRef.current) {
                    clearInterval(pingIntervalRef.current);
                    pingIntervalRef.current = null;
                }

                // Attempt reconnection unless manually disconnected
                if (!isManualDisconnectRef.current && reconnectAttempts < maxReconnectAttempts) {
                    const delay = Math.min(
                        reconnectInterval * Math.pow(1.5, reconnectAttempts),
                        30000 // Max 30 seconds
                    );

                    console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        setReconnectAttempts(prev => prev + 1);
                        connect();
                    }, delay);
                } else if (reconnectAttempts >= maxReconnectAttempts) {
                    setConnectionError(`Failed to reconnect after ${maxReconnectAttempts} attempts`);
                }
            };
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            setConnectionError('Failed to establish connection');
        }
    }, [handleMessage, maxReconnectAttempts, pingInterval, reconnectAttempts, reconnectInterval]);

    // Disconnect from WebSocket
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

    // Send message through WebSocket
    const sendMessage = useCallback((message: KitchenMessage) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket not connected, cannot send message');
        }
    }, []);

    // Auto-connect on mount
    useEffect(() => {
        if (autoConnect) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [autoConnect]); // Don't include connect/disconnect to avoid infinite loops

    return {
        isConnected,
        connectionError,
        reconnectAttempts,
        connect,
        disconnect,
        sendMessage,
    };
}

// Helper function to play notification sound
function playNotificationSound() {
    try {
        // Using Web Audio API for a simple beep
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
        // Audio not available or blocked
        console.debug('Could not play notification sound');
    }
}

export default useKitchenSocket;
