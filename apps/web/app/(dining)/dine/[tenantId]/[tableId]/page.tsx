'use client';

/**
 * Self-Service Dining Page
 * Main page for customers to browse menu and place orders from tablets
 * 
 * URL: /dine/[tenantId]/[tableId]?token=xxx
 */

import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { DiningProvider, useDining } from '../../context';
import {
    DiningHeader,
    CategoryTabs,
    MenuItemCard,
    ItemDetailModal,
    FloatingCartButton,
    CartModal,
    OrderConfirmationModal,
    ServiceRequestModal
} from '../../components';
import type { MenuItem, MenuCategory, OrderResponse, SelectedModifier } from '../../types';

interface DiningPageProps {
    params: {
        tenantId: string;
        tableId: string;
    };
}

export default function DiningPage({ params }: DiningPageProps) {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    
    // If no token, show error
    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
                <div className="text-center max-w-sm">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">
                        Código QR inválido
                    </h1>
                    <p className="text-gray-500 mb-6">
                        Por favor, escanea el código QR de tu mesa para acceder al menú.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-full"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <DiningProvider 
            tenantId={params.tenantId} 
            tableId={params.tableId} 
            token={token}
        >
            <DiningContent />
        </DiningProvider>
    );
}

function DiningContent() {
    const { 
        session, 
        menu, 
        isLoading, 
        error, 
        addToCart, 
        currentOrder,
        callWaiter,
        requestBill
    } = useDining();
    
    // State
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
    const [confirmedOrder, setConfirmedOrder] = useState<OrderResponse | null>(null);
    const [serviceRequestType, setServiceRequestType] = useState<'waiter' | 'bill' | null>(null);
    
    // Refs for scroll tracking
    const categoryRefs = useRef<Map<string, HTMLElement>>(new Map());
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Set initial active category when menu loads
    useEffect(() => {
        if (menu?.categories.length && !activeCategory) {
            setActiveCategory(menu.categories[0].id);
        }
    }, [menu, activeCategory]);
    
    // Handle scroll to track active category
    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;
            
            const scrollTop = containerRef.current.scrollTop + 150; // Offset for headers
            
            const entries = Array.from(categoryRefs.current.entries());
            for (const [categoryId, element] of entries) {
                const rect = element.getBoundingClientRect();
                const containerRect = containerRef.current.getBoundingClientRect();
                const relativeTop = rect.top - containerRect.top + containerRef.current.scrollTop;
                const relativeBottom = relativeTop + rect.height;
                
                if (scrollTop >= relativeTop && scrollTop < relativeBottom) {
                    setActiveCategory(categoryId);
                    break;
                }
            }
        };
        
        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, []);
    
    // Handle category selection (scroll to category)
    const handleSelectCategory = (categoryId: string) => {
        setActiveCategory(categoryId);
        const element = categoryRefs.current.get(categoryId);
        if (element && containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            const offset = elementRect.top - containerRect.top + containerRef.current.scrollTop - 120;
            
            containerRef.current.scrollTo({
                top: offset,
                behavior: 'smooth'
            });
        }
    };
    
    // Handle add to cart
    const handleAddToCart = (quantity: number, modifiers: SelectedModifier[], notes?: string) => {
        if (selectedItem) {
            addToCart(selectedItem, quantity, modifiers, notes);
            setSelectedItem(null);
        }
    };
    
    // Handle order success
    const handleOrderSuccess = () => {
        setIsCartOpen(false);
        if (currentOrder) {
            setConfirmedOrder(currentOrder);
            setIsConfirmationOpen(true);
        }
    };
    
    // Handle service request
    const handleServiceRequest = async (type: 'waiter' | 'bill' | 'refill' | 'custom', message?: string) => {
        if (type === 'waiter' || type === 'custom') {
            await callWaiter(message);
        } else if (type === 'bill') {
            await requestBill();
        }
    };
    
    // Loading State
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Cargando menú...</p>
                </div>
            </div>
        );
    }
    
    // Error State
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
                <div className="text-center max-w-sm">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">
                        No se pudo conectar
                    </h1>
                    <p className="text-gray-500 mb-6">
                        {error}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-full hover:bg-orange-600"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }
    
    if (!menu || !session) {
        return null;
    }
    
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <DiningHeader 
                onCallWaiter={() => setServiceRequestType('waiter')}
                onRequestBill={() => setServiceRequestType('bill')}
            />
            
            {/* Category Tabs */}
            <CategoryTabs
                categories={menu.categories}
                activeCategory={activeCategory}
                onSelectCategory={handleSelectCategory}
            />
            
            {/* Menu Content */}
            <div 
                ref={containerRef}
                className="flex-1 overflow-y-auto pb-32"
            >
                {menu.categories.map((category: MenuCategory) => (
                    <section
                        key={category.id}
                        ref={(el) => {
                            if (el) categoryRefs.current.set(category.id, el);
                        }}
                        className="px-4 py-6"
                    >
                        {/* Category Header */}
                        <div className="mb-4">
                            <h2 className="text-xl font-bold text-gray-900">
                                {category.name}
                            </h2>
                            {category.description && (
                                <p className="text-gray-500 text-sm mt-1">
                                    {category.description}
                                </p>
                            )}
                        </div>
                        
                        {/* Items Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {category.items.map((item: MenuItem) => (
                                <MenuItemCard
                                    key={item.id}
                                    item={item}
                                    currency={menu.currency}
                                    showPrices={menu.show_prices}
                                    onSelect={setSelectedItem}
                                />
                            ))}
                        </div>
                    </section>
                ))}
            </div>
            
            {/* Floating Cart Button */}
            <FloatingCartButton
                currency={menu.currency}
                onClick={() => setIsCartOpen(true)}
            />
            
            {/* Item Detail Modal */}
            {selectedItem && (
                <ItemDetailModal
                    item={selectedItem}
                    currency={menu.currency}
                    isOpen={!!selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onAddToCart={handleAddToCart}
                />
            )}
            
            {/* Cart Modal */}
            <CartModal
                currency={menu.currency}
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                onOrderSuccess={handleOrderSuccess}
            />
            
            {/* Order Confirmation Modal */}
            {confirmedOrder && (
                <OrderConfirmationModal
                    order={confirmedOrder}
                    isOpen={isConfirmationOpen}
                    onClose={() => {
                        setIsConfirmationOpen(false);
                        setConfirmedOrder(null);
                    }}
                />
            )}
            
            {/* Service Request Modal */}
            <ServiceRequestModal
                type={serviceRequestType}
                isOpen={!!serviceRequestType}
                onClose={() => setServiceRequestType(null)}
                onSubmit={handleServiceRequest}
            />
        </div>
    );
}
