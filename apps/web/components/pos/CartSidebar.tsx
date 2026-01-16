/**
 * Cart Sidebar Component
 * Premium shopping cart with smooth animations
 * 
 * Motion Design Features:
 * - AnimatePresence for item enter/exit
 * - Sliding panel animation
 * - Quantity counter "pop" animation
 * - Staggered item entry
 * - Empty state animation
 */

import { useState, useEffect, useRef } from "react";
import { X, ShoppingCart, Package, Minus, Plus, Send, User, Search, Award, Wallet } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { CartItem } from "@/lib/store";
import { customersApi, loyaltyApi, Customer, LoyaltySummary } from "@/lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useToast } from "../../components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { CartItemSkeleton } from "../ui/Skeletons";
import { EmptyCart } from "../ui/EmptyState";

interface CartSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    cart: CartItem[];
    cartTotal: number;
    onRemoveItem: (index: number) => void;
    onIncrementItem: (index: number) => void;
    onSendOrder: () => void;
    isSending?: boolean;
    isLoading?: boolean;
}

// Animation variants
const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
};

const panelVariants = {
    hidden: { x: "100%", opacity: 0 },
    visible: {
        x: 0,
        opacity: 1,
        transition: {
            type: "spring" as const,
            stiffness: 300,
            damping: 30
        }
    },
    exit: {
        x: "100%",
        opacity: 0,
        transition: {
            type: "spring" as const,
            stiffness: 400,
            damping: 40
        }
    }
};

const itemVariants = {
    hidden: { x: 100, opacity: 0 },
    visible: {
        x: 0,
        opacity: 1,
        transition: {
            type: "spring" as const,
            stiffness: 400,
            damping: 25
        }
    },
    exit: {
        x: -100,
        opacity: 0,
        transition: {
            duration: 0.2
        }
    }
};

// Animated counter component for quantity
function AnimatedCounter({ value }: { value: number }) {
    const [displayValue, setDisplayValue] = useState(value);
    const [isAnimating, setIsAnimating] = useState(false);
    const prevValue = useRef(value);

    useEffect(() => {
        if (value !== prevValue.current) {
            setIsAnimating(true);
            setTimeout(() => {
                setDisplayValue(value);
                setIsAnimating(false);
            }, 100);
            prevValue.current = value;
        }
    }, [value]);

    return (
        <motion.span
            className="w-8 text-center font-bold text-white text-lg inline-block"
            animate={isAnimating ? {
                scale: [1, 1.4, 1],
                color: ["#ffffff", "#22c55e", "#ffffff"]
            } : undefined}
            transition={{ duration: 0.3, ease: "easeOut" }}
        >
            {displayValue}
        </motion.span>
    );
}

export function CartSidebar({
    isOpen,
    onClose,
    cart,
    cartTotal,
    onRemoveItem,
    onIncrementItem,
    onSendOrder,
    isSending = false,
    isLoading = false
}: CartSidebarProps) {
    const [customerQuery, setCustomerQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [loyaltySummary, setLoyaltySummary] = useState<LoyaltySummary | null>(null);
    const { toast } = useToast();

    // Handle searching
    const handleSearch = async () => {
        if (!customerQuery.trim()) return;
        setIsSearching(true);
        try {
            const results = await customersApi.list(customerQuery);
            setSearchResults(results);
            if (results.length === 0) {
                toast({ description: "No customer found." });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
    };

    // Attach customer
    const selectCustomer = async (c: Customer) => {
        setSelectedCustomer(c);
        setSearchResults([]);
        setCustomerQuery("");
        try {
            const summary = await loyaltyApi.getSummary(c.id);
            setLoyaltySummary(summary);
        } catch (e) {
            console.error(e);
        }
    };

    // Detach
    const clearCustomer = () => {
        setSelectedCustomer(null);
        setLoyaltySummary(null);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={onClose}
                    />

                    {/* Cart Panel */}
                    <motion.div
                        className="fixed top-0 right-0 bottom-0 w-full max-w-md glass-dark z-50 flex flex-col"
                        variants={panelVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        {/* Cart Header */}
                        <motion.div
                            className="p-5 border-b border-white/10 flex items-center justify-between glass-subtle"
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                <motion.div
                                    className="p-2 bg-brand-500/20 rounded-xl"
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <ShoppingCart className="w-6 h-6 text-brand-500" />
                                </motion.div>
                                Tu Pedido
                                {/* Cart Count Badge */}
                                <AnimatePresence>
                                    {cart.length > 0 && (
                                        <motion.span
                                            key="cart-count"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                            className="px-2 py-0.5 bg-brand-500 text-white text-sm font-bold rounded-full"
                                        >
                                            {cart.reduce((sum, item) => sum + item.quantity, 0)}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </h2>
                            <motion.button
                                onClick={onClose}
                                className="p-3 hover:bg-white/10 rounded-xl transition-all touch-target"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <X className="w-6 h-6 text-gray-400" />
                            </motion.button>
                        </motion.div>

                        {/* Customer Section */}
                        <motion.div
                            className="p-4 bg-white/5 border-b border-white/10"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.15 }}
                        >
                            <AnimatePresence mode="wait">
                                {!selectedCustomer ? (
                                    <motion.div
                                        key="search"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-2"
                                    >
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <Input
                                                    className="bg-black/40 border-white/10 text-white h-12 pl-10 rounded-xl focus:border-brand-500/50 focus:ring-brand-500/20"
                                                    placeholder="Buscar cliente (Tel/Nombre)..."
                                                    value={customerQuery}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerQuery(e.target.value)}
                                                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSearch()}
                                                />
                                            </div>
                                            <Button
                                                size="lg"
                                                onClick={handleSearch}
                                                disabled={isSearching}
                                                className="h-12 w-12 p-0 bg-brand-600 hover:bg-brand-700 rounded-xl shadow-lg shadow-brand-900/20"
                                            >
                                                <Search className="w-5 h-5" />
                                            </Button>
                                        </div>

                                        <AnimatePresence>
                                            {searchResults.length > 0 && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="bg-slate-800 rounded border border-slate-700 max-h-40 overflow-y-auto"
                                                >
                                                    {searchResults.map((c) => (
                                                        <motion.div
                                                            key={c.id}
                                                            onClick={() => selectCustomer(c)}
                                                            className="p-2 hover:bg-slate-700 cursor-pointer text-sm text-white flex justify-between"
                                                            whileHover={{ x: 4 }}
                                                        >
                                                            <span>{c.name}</span>
                                                            <span className="text-slate-400">{c.phone}</span>
                                                        </motion.div>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="customer"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="bg-slate-800/80 rounded-lg p-3 border border-brand-500/30"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <motion.div
                                                    className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center"
                                                    initial={{ rotate: -180 }}
                                                    animate={{ rotate: 0 }}
                                                    transition={{ type: "spring" }}
                                                >
                                                    <User className="w-4 h-4 text-brand-400" />
                                                </motion.div>
                                                <div>
                                                    <p className="text-sm font-bold text-white leading-none">{selectedCustomer.name}</p>
                                                    <p className="text-xs text-brand-400 mt-1">{selectedCustomer.tier_level}</p>
                                                </div>
                                            </div>
                                            <motion.button
                                                onClick={clearCustomer}
                                                className="p-1 hover:bg-white/10 rounded"
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                            >
                                                <X className="w-4 h-4 text-slate-400" />
                                            </motion.button>
                                        </div>

                                        <AnimatePresence>
                                            {loyaltySummary && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="flex gap-4 mt-2 pt-2 border-t border-white/10"
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <Award className="w-3.5 h-3.5 text-yellow-500" />
                                                        <span className="text-xs text-slate-300">
                                                            <span className="text-white font-bold">{loyaltySummary.points.toFixed(0)}</span> pts
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                                                        <span className="text-xs text-slate-300">
                                                            <span className="text-white font-bold">${loyaltySummary.wallet_balance.toFixed(2)}</span>
                                                        </span>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>

                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {isLoading ? (
                                <CartItemSkeleton count={3} />
                            ) : cart.length === 0 ? (
                                <EmptyCart />
                            ) : (
                                <motion.div
                                    className="space-y-3"
                                    initial="hidden"
                                    animate="visible"
                                    variants={{
                                        visible: {
                                            transition: { staggerChildren: 0.05 }
                                        }
                                    }}
                                >
                                    <AnimatePresence mode="popLayout">
                                        {cart.map((item, index) => (
                                            <motion.div
                                                key={`${item.menu_item_id}-${index}`}
                                                variants={itemVariants}
                                                layout
                                                exit="exit"
                                                className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl p-4"
                                            >
                                                {/* Product Icon */}
                                                <motion.div
                                                    className="w-12 h-12 bg-gradient-to-br from-brand-500/20 to-brand-600/20 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                                >
                                                    🥘
                                                </motion.div>

                                                {/* Product Details */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-white truncate">{item.menu_item_name}</div>
                                                    <motion.div
                                                        className="text-brand-400 font-bold"
                                                        key={item.price * item.quantity}
                                                        initial={{ scale: 1 }}
                                                        animate={{ scale: [1, 1.05, 1] }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        {formatPrice(item.price * item.quantity)}
                                                    </motion.div>
                                                    {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                                                        <div className="text-xs text-gray-400 mt-1 truncate">
                                                            {item.selected_modifiers.map(m => m.name).join(', ')}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Quantity Controls */}
                                                <div className="flex items-center gap-1 bg-black/20 rounded-xl p-1 flex-shrink-0">
                                                    <motion.button
                                                        onClick={() => onRemoveItem(index)}
                                                        className="w-10 h-10 flex items-center justify-center 
                                                                 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-500 
                                                                 rounded-lg transition-colors touch-target"
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                    >
                                                        <Minus className="w-5 h-5" />
                                                    </motion.button>

                                                    <AnimatedCounter value={item.quantity} />

                                                    <motion.button
                                                        onClick={() => onIncrementItem(index)}
                                                        className="w-10 h-10 flex items-center justify-center 
                                                                 bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-900/20
                                                                 rounded-lg transition-colors touch-target"
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                    >
                                                        <Plus className="w-5 h-5" />
                                                    </motion.button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </motion.div>
                            )}
                        </div>

                        {/* Cart Footer */}
                        <motion.div
                            className="p-4 border-t border-white/10 bg-black/20"
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="flex justify-between text-xl font-bold mb-4 text-white">
                                <span>Total:</span>
                                <motion.span
                                    className="text-brand-400"
                                    key={cartTotal}
                                    initial={{ scale: 1 }}
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {formatPrice(cartTotal)}
                                </motion.span>
                            </div>

                            <motion.button
                                onClick={onSendOrder}
                                disabled={cart.length === 0 || isSending}
                                className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700
                                         text-white font-bold rounded-xl transition-colors duration-300
                                         flex items-center justify-center gap-3
                                         shadow-lg shadow-green-500/30 hover:shadow-xl
                                         disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                                whileHover={{ y: -2 }}
                                whileTap={{ y: 0, scale: 0.98 }}
                            >
                                <Send className="w-5 h-5" />
                                {isSending ? 'Enviando...' : 'Enviar a Cocina'}
                            </motion.button>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
