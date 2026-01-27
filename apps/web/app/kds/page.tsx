'use client';

import React, { useState, useEffect } from 'react';
import { useRxDB } from '../../lib/db-provider';
import { TicketCard } from '../../components/kds/TicketCard';
import { Order, OrderItem } from '../../../../packages/shared/src/index';

type KDSView = 'kitchen' | 'bar';

export default function KDSPage() {
    const db = useRxDB();
    const [view, setView] = useState<KDSView>('kitchen');
    const [orders, setOrders] = useState<Order[]>([]);

    useEffect(() => {
        if (!db) return;

        // Subscribe to active orders
        const sub = db.orders.find({
            selector: {
                status: { $in: ['pending', 'in_progress', 'ready'] } // Active orders
            },
            sort: [{ created_at: 'asc' }]
        }).$.subscribe(docs => {
            setOrders(docs.map(d => d.toJSON()) as Order[]);
        });

        // WebSocket Integration
        let unsubscribeNew: () => void;
        let unsubscribeUpdate: () => void;

        const handleNewOrder = async (payload: any) => {
            // When new order comes, fetch full details and save to RxDB
            // The UI will update automatically due to the subscription above
            console.log('[KDS] New order received:', payload);
            try {
                // We might need to fetch the specific order if payload is partial
                // For now, let's assuming payload implies we should sync
                // Or better, just upsert the payload if it matches Order shape, 
                // but usually payload is just a notification.
                // Let's optimize: just re-fetch active orders for now to be safe and simple
                const { ordersApi } = await import('../../lib/api');
                const freshOrders = await ordersApi.list({ status: 'pending,in_progress,ready' });

                // Bulk upsert to RxDB
                await db.orders.bulkUpsert(freshOrders);
            } catch (err) {
                console.error('[KDS] Failed to sync new order', err);
            }
        };

        const handleOrderUpdate = async (payload: any) => {
            console.log('[KDS] Order update:', payload);
            try {
                const { ordersApi } = await import('../../lib/api');
                const order = await ordersApi.get(payload.order_id);
                await db.orders.upsert(order);
            } catch (err) {
                console.error('[KDS] Failed to sync order update', err);
            }
        }

        // Dynamic import to avoid SSR issues with WS if any
        import('../../lib/api').then(({ wsClient }) => {
            wsClient.connect(); // Ensure connected
            unsubscribeNew = wsClient.subscribe('new_order', handleNewOrder);
            unsubscribeUpdate = wsClient.subscribe('order_update', handleOrderUpdate);
        });

        return () => {
            sub.unsubscribe();
            if (unsubscribeNew) unsubscribeNew();
            if (unsubscribeUpdate) unsubscribeUpdate();
        };
    }, [db]);

    const filteredOrders = orders.map(order => {
        // Filter items based on view
        const relevantItems = order.items.filter(item => {
            if (view === 'bar') return item.route_to === 'bar';
            return item.route_to === 'kitchen'; // Kitchen sees kitchen items
            // 'direct' items might go nowhere or kitchen? Assuming kitchen for now or ignored.
        });

        if (relevantItems.length === 0) return null;

        return {
            ...order,
            items: relevantItems
        };
    }).filter((o): o is Order => o !== null);

    const handleCompleteOrder = async (orderId: string) => {
        // Guard clause: Check if db is initialized
        if (!db) {
            console.error('[KDS] Database not initialized');
            return;
        }

        // In a real KDS, we might mark individual items as done.
        // For this demo, completing the ticket clears it from screen (marks completed?)
        // Or maybe just bumps status.
        // Let's assume we mark it as 'ready' if all items are done, or just 'completed' for simple flow.
        const order = await db.orders.findOne(orderId).exec();
        if (order) {
            // Check if we are completing the whole order or just this view's part?
            // Simple logic: Mark order as ready/completed.
            await order.patch({ status: 'completed' });
        }
    };

    const handleItemClick = async (itemId: string) => {
        // Toggle item status logic could go here
        console.log('Item clicked:', itemId);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
                <h1 className="text-2xl font-bold text-gray-800">Expediter Screen</h1>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setView('kitchen')}
                        className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${view === 'kitchen'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Kitchen
                    </button>
                    <button
                        onClick={() => setView('bar')}
                        className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${view === 'bar'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Bar
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 p-6 overflow-x-auto">
                <div className="flex gap-4 items-start min-w-max">
                    {filteredOrders.length === 0 ? (
                        <div className="w-full h-64 flex items-center justify-center text-gray-400">
                            No active tickets for {view}
                        </div>
                    ) : (
                        filteredOrders.map(order => (
                            <div key={order.id} className="w-80 flex-shrink-0">
                                <TicketCard
                                    order={order}
                                    onComplete={handleCompleteOrder}
                                    onItemClick={handleItemClick}
                                />
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}
