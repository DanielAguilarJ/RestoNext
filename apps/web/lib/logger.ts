/**
 * RestoNext MX - Frontend Activity Logger
 * ========================================
 * 
 * Centralized logging service for tracking user activities in the frontend.
 * Batches events and sends them to the backend for Digital Ocean visibility.
 * 
 * Features:
 * - Page view tracking
 * - User action tracking  
 * - Click event tracking
 * - Navigation tracking
 * - API call logging
 * - Error logging
 * - Automatic batching and sending
 * - Offline queue support
 * 
 * Usage:
 *   import { Logger } from '@/lib/logger';
 *   
 *   Logger.pageView('/pos');
 *   Logger.action('create_order', 'OrderPanel', { items: 5 });
 *   Logger.click('submit_button', 'CheckoutForm');
 *   Logger.error(new Error('Something failed'), 'PaymentProcessor');
 */

// Types
interface ActivityEvent {
    type: string;
    timestamp: string;
    page?: string;
    component?: string;
    action?: string;
    element?: string;
    from_page?: string;
    to_page?: string;
    metadata?: Record<string, any>;
    session_id?: string;
}

interface ActivityBatch {
    events: ActivityEvent[];
    user_id?: string;
    tenant_id?: string;
    session_id?: string;
    client_timestamp: string;
    user_agent?: string;
}

interface ErrorEvent {
    error_type: string;
    message: string;
    stack_trace?: string;
    component?: string;
    page?: string;
    timestamp: string;
    metadata?: Record<string, any>;
    user_id?: string;
    tenant_id?: string;
    session_id?: string;
}

// Configuration
const CONFIG = {
    BATCH_SIZE: 10,           // Max events before forcing send
    BATCH_INTERVAL_MS: 5000,  // Send batch every 5 seconds
    MAX_QUEUE_SIZE: 100,      // Max events to queue (prevents memory issues)
    API_ENDPOINT: '/api/logs',
    ENABLE_CONSOLE: true,     // Also log to console for development
    LOG_LEVEL: 'info' as 'debug' | 'info' | 'warn' | 'error',
};

// Log levels for filtering
const LOG_LEVELS: Record<string, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

/**
 * Generate a unique session ID for this browser session.
 * Persists in sessionStorage for the duration of the tab.
 */
function getSessionId(): string {
    if (typeof window === 'undefined') return 'server';

    let sessionId = sessionStorage.getItem('restonext_session_id');
    if (!sessionId) {
        sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('restonext_session_id', sessionId);
    }
    return sessionId;
}

/**
 * Get the current page path
 */
function getCurrentPage(): string {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname;
}

/**
 * Get API base URL
 */
function getApiBaseUrl(): string {
    if (typeof window === 'undefined') return '';

    // Use the same API URL as the rest of the app
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://whale-app-i6h36.ondigitalocean.app/api';
    return apiUrl.replace(/\/+$/, '');
}

/**
 * Logger class for frontend activity tracking
 */
class ActivityLogger {
    private eventQueue: ActivityEvent[] = [];
    private batchTimer: NodeJS.Timeout | null = null;
    private userId: string | null = null;
    private tenantId: string | null = null;
    private sessionId: string;
    private isOnline: boolean = true;
    private offlineQueue: ActivityEvent[] = [];

    constructor() {
        this.sessionId = typeof window !== 'undefined' ? getSessionId() : 'server';

        // Set up batch sending interval
        if (typeof window !== 'undefined') {
            this.startBatchTimer();

            // Listen for online/offline events
            window.addEventListener('online', () => {
                this.isOnline = true;
                this.flushOfflineQueue();
            });
            window.addEventListener('offline', () => {
                this.isOnline = false;
            });

            // Send remaining events on page unload
            window.addEventListener('beforeunload', () => {
                this.flush(true);
            });
        }
    }

    /**
     * Set the authenticated user context
     */
    setUser(userId: string | null, tenantId: string | null): void {
        this.userId = userId;
        this.tenantId = tenantId;

        if (userId) {
            this.log('debug', 'AUTH', `User context set: ${userId.substring(0, 12)}...`);
        }
    }

    /**
     * Clear user context (on logout)
     */
    clearUser(): void {
        this.userId = null;
        this.tenantId = null;
    }

    /**
     * Internal logging method that respects log level
     */
    private log(level: string, type: string, message: string, data?: Record<string, any>): void {
        const currentLevel = LOG_LEVELS[CONFIG.LOG_LEVEL] || 1;
        const messageLevel = LOG_LEVELS[level] || 1;

        if (messageLevel < currentLevel) return;

        if (CONFIG.ENABLE_CONSOLE && typeof console !== 'undefined') {
            const timestamp = new Date().toISOString();
            const prefix = `[${timestamp}] [${level.toUpperCase()}] [${type}]`;
            const contextInfo = this.userId ? ` | user=${this.userId.substring(0, 12)}` : '';

            const logFn = level === 'error' ? console.error :
                level === 'warn' ? console.warn :
                    level === 'debug' ? console.debug :
                        console.log;

            if (data && Object.keys(data).length > 0) {
                logFn(`${prefix} ${message}${contextInfo}`, data);
            } else {
                logFn(`${prefix} ${message}${contextInfo}`);
            }
        }
    }

    /**
     * Queue an event for batching
     */
    private queueEvent(event: Omit<ActivityEvent, 'timestamp' | 'session_id'>): void {
        const fullEvent: ActivityEvent = {
            ...event,
            timestamp: new Date().toISOString(),
            session_id: this.sessionId,
            page: event.page || getCurrentPage(),
        };

        // Add to queue
        if (this.eventQueue.length < CONFIG.MAX_QUEUE_SIZE) {
            this.eventQueue.push(fullEvent);
        }

        // Force send if batch size reached
        if (this.eventQueue.length >= CONFIG.BATCH_SIZE) {
            this.flush();
        }
    }

    /**
     * Start the batch sending timer
     */
    private startBatchTimer(): void {
        if (this.batchTimer) return;

        this.batchTimer = setInterval(() => {
            if (this.eventQueue.length > 0) {
                this.flush();
            }
        }, CONFIG.BATCH_INTERVAL_MS);
    }

    /**
     * Flush the event queue to the backend
     */
    async flush(sync: boolean = false): Promise<void> {
        if (this.eventQueue.length === 0) return;

        const events = [...this.eventQueue];
        this.eventQueue = [];

        const batch: ActivityBatch = {
            events,
            user_id: this.userId || undefined,
            tenant_id: this.tenantId || undefined,
            session_id: this.sessionId,
            client_timestamp: new Date().toISOString(),
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        };

        if (!this.isOnline) {
            // Queue for later when offline
            this.offlineQueue.push(...events);
            return;
        }

        try {
            const apiUrl = getApiBaseUrl();
            const endpoint = `${apiUrl}/logs/activity`;

            if (sync && typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
                // Use sendBeacon for page unload (more reliable)
                navigator.sendBeacon(endpoint, JSON.stringify(batch));
            } else {
                await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(batch),
                    keepalive: true,
                });
            }
        } catch (error) {
            // Failed to send - queue for retry
            this.offlineQueue.push(...events);
            this.log('warn', 'LOGGER', 'Failed to send activity batch, queued for retry');
        }
    }

    /**
     * Flush offline queue when back online
     */
    private async flushOfflineQueue(): Promise<void> {
        if (this.offlineQueue.length === 0) return;

        const events = [...this.offlineQueue];
        this.offlineQueue = [];

        // Add to main queue to be sent
        this.eventQueue.push(...events);
        this.flush();
    }

    // ============================================
    // Public Logging Methods
    // ============================================

    /**
     * Log a page view
     */
    pageView(page?: string, metadata?: Record<string, any>): void {
        const currentPage = page || getCurrentPage();
        this.log('info', 'PAGE_VIEW', `Viewed: ${currentPage}`, metadata);

        this.queueEvent({
            type: 'page_view',
            page: currentPage,
            metadata,
        });
    }

    /**
     * Log navigation between pages
     */
    navigation(fromPage: string, toPage: string, metadata?: Record<string, any>): void {
        this.log('info', 'NAVIGATION', `${fromPage} → ${toPage}`, metadata);

        this.queueEvent({
            type: 'navigation',
            from_page: fromPage,
            to_page: toPage,
            metadata,
        });
    }

    /**
     * Log a user action
     */
    action(actionName: string, component: string, data?: Record<string, any>): void {
        this.log('info', 'ACTION', `${actionName} on ${component}`, data);

        this.queueEvent({
            type: 'action',
            action: actionName,
            component,
            metadata: data,
        });
    }

    /**
     * Log a click event
     */
    click(element: string, component: string, metadata?: Record<string, any>): void {
        this.log('debug', 'CLICK', `${element} in ${component}`, metadata);

        this.queueEvent({
            type: 'click',
            element,
            component,
            metadata,
        });
    }

    /**
     * Log a form submission
     */
    formSubmit(formName: string, success: boolean = true, errors?: string[], metadata?: Record<string, any>): void {
        const status = success ? 'success' : 'failed';
        this.log(success ? 'info' : 'warn', 'FORM_SUBMIT', `${formName}: ${status}`, { errors, ...metadata });

        this.queueEvent({
            type: 'form_submit',
            component: formName,
            metadata: {
                success,
                errors,
                ...metadata,
            },
        });
    }

    /**
     * Log an API call
     */
    apiCall(method: string, path: string, status: number, durationMs: number, error?: string): void {
        const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'debug';
        this.log(level, 'API_CALL', `${method} ${path} → ${status} (${durationMs.toFixed(0)}ms)`,
            error ? { error } : undefined);

        this.queueEvent({
            type: 'api_call',
            metadata: {
                method,
                path,
                status,
                duration_ms: durationMs,
                error,
            },
        });
    }

    /**
     * Log a WebSocket event
     */
    websocket(event: 'connect' | 'disconnect' | 'message' | 'error', channel: string, metadata?: Record<string, any>): void {
        this.log('info', 'WEBSOCKET', `${event}: ${channel}`, metadata);

        this.queueEvent({
            type: 'websocket',
            action: event,
            component: channel,
            metadata,
        });
    }

    /**
     * Log an error - immediately sent (not batched)
     */
    async error(error: Error | string, component?: string, metadata?: Record<string, any>): Promise<void> {
        const errorMessage = typeof error === 'string' ? error : error.message;
        const errorType = typeof error === 'string' ? 'Error' : error.name;
        const stackTrace = typeof error === 'string' ? undefined : error.stack;

        this.log('error', 'ERROR', `[${errorType}] ${errorMessage}`, { component, ...metadata });

        // Errors are sent immediately, not batched
        const errorEvent: ErrorEvent = {
            error_type: errorType,
            message: errorMessage,
            stack_trace: stackTrace,
            component,
            page: getCurrentPage(),
            timestamp: new Date().toISOString(),
            metadata,
            user_id: this.userId || undefined,
            tenant_id: this.tenantId || undefined,
            session_id: this.sessionId,
        };

        try {
            const apiUrl = getApiBaseUrl();
            await fetch(`${apiUrl}/logs/error`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(errorEvent),
            });
        } catch (e) {
            // Can't send error, just log locally
            console.error('[Logger] Failed to send error event:', e);
        }
    }

    /**
     * Log a warning
     */
    warn(message: string, component?: string, metadata?: Record<string, any>): void {
        this.log('warn', 'WARNING', message, { component, ...metadata });

        this.queueEvent({
            type: 'warning',
            action: message,
            component,
            metadata,
        });
    }

    /**
     * Log debug information
     */
    debug(message: string, data?: Record<string, any>): void {
        this.log('debug', 'DEBUG', message, data);
    }

    /**
     * Log info
     */
    info(message: string, data?: Record<string, any>): void {
        this.log('info', 'INFO', message, data);
    }

    // ============================================
    // Business Event Logging
    // ============================================

    /**
     * Log authentication events
     */
    authLogin(success: boolean, method: string = 'password', error?: string): void {
        this.log(success ? 'info' : 'warn', 'AUTH', `Login ${success ? 'successful' : 'failed'} via ${method}`,
            error ? { error } : undefined);

        this.queueEvent({
            type: 'auth',
            action: success ? 'login_success' : 'login_failed',
            metadata: { method, error },
        });
    }

    authLogout(): void {
        this.log('info', 'AUTH', 'User logged out');

        this.queueEvent({
            type: 'auth',
            action: 'logout',
        });
    }

    /**
     * Log order events
     */
    orderCreated(orderId: string, tableNumber: number, itemsCount: number, total: number): void {
        this.log('info', 'ORDER', `Created: ${orderId.substring(0, 8)}... | Table ${tableNumber} | ${itemsCount} items | $${total.toFixed(2)}`);

        this.queueEvent({
            type: 'order',
            action: 'created',
            metadata: {
                order_id: orderId,
                table_number: tableNumber,
                items_count: itemsCount,
                total,
            },
        });
    }

    /**
     * Log payment events
     */
    paymentProcessed(orderId: string, amount: number, method: string, success: boolean): void {
        this.log(success ? 'info' : 'error', 'PAYMENT',
            `${success ? 'Completed' : 'Failed'}: $${amount.toFixed(2)} via ${method}`);

        this.queueEvent({
            type: 'payment',
            action: success ? 'completed' : 'failed',
            metadata: {
                order_id: orderId,
                amount,
                method,
                success,
            },
        });
    }
}

// Export singleton instance
export const Logger = new ActivityLogger();

// Export type for use in components
export type { ActivityEvent, ActivityBatch, ErrorEvent };
