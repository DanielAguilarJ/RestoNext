import { useState, useEffect } from "react";
import { X, ShoppingCart, Package, Minus, Plus, Send, User, Search, Award, Wallet } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { CartItem } from "@/lib/store";
import { customersApi, loyaltyApi, Customer, LoyaltySummary } from "@/lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useToast } from "../../components/ui/use-toast";

interface CartSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    cart: CartItem[];
    cartTotal: number;
    onRemoveItem: (index: number) => void;
    onIncrementItem: (index: number) => void;
    onSendOrder: () => void;
    isSending?: boolean;
}

export function CartSidebar({
    isOpen,
    onClose,
    cart,
    cartTotal,
    onRemoveItem,
    onIncrementItem,
    onSendOrder,
    isSending = false
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

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
                onClick={onClose}
            />

            {/* Cart Panel */}
            <div className="fixed top-0 right-0 bottom-0 w-full max-w-md glass-dark z-50 flex flex-col animate-slide-in-right">
                {/* Cart Header */}
                {/* Cart Header */}
                <div className="p-5 border-b border-white/10 flex items-center justify-between glass-subtle">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 bg-brand-500/20 rounded-xl">
                            <ShoppingCart className="w-6 h-6 text-brand-500" />
                        </div>
                        Tu Pedido
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-white/10 rounded-xl transition-all active:scale-95 touch-target"
                    >
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {/* Customer Section */}
                <div className="p-4 bg-white/5 border-b border-white/10">
                    {!selectedCustomer ? (
                        <div className="space-y-2">
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
                            {searchResults.length > 0 && (
                                <div className="bg-slate-800 rounded border border-slate-700 max-h-40 overflow-y-auto">
                                    {searchResults.map(c => (
                                        <div key={c.id} onClick={() => selectCustomer(c)} className="p-2 hover:bg-slate-700 cursor-pointer text-sm text-white flex justify-between">
                                            <span>{c.name}</span>
                                            <span className="text-slate-400">{c.phone}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-slate-800/80 rounded-lg p-3 border border-brand-500/30">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center">
                                        <User className="w-4 h-4 text-brand-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white leading-none">{selectedCustomer.name}</p>
                                        <p className="text-xs text-brand-400 mt-1">{selectedCustomer.tier_level}</p>
                                    </div>
                                </div>
                                <button onClick={clearCustomer} className="p-1 hover:bg-white/10 rounded">
                                    <X className="w-4 h-4 text-slate-400" />
                                </button>
                            </div>

                            {loyaltySummary && (
                                <div className="flex gap-4 mt-2 pt-2 border-t border-white/10">
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
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <Package className="w-16 h-16 mb-4 opacity-50" />
                            <p className="text-lg mb-2">Carrito vacío</p>
                            <p className="text-sm text-center">Agrega productos del menú para comenzar</p>
                        </div>
                    ) : (
                        cart.map((item, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl p-4 animate-slide-up"
                                style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                <div className="w-12 h-12 bg-gradient-to-br from-brand-500/20 to-brand-600/20 rounded-lg flex items-center justify-center text-2xl">
                                    🥘
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium text-white">{item.menu_item_name}</div>
                                    <div className="text-brand-400 font-bold">
                                        {formatPrice(item.price * item.quantity)}
                                    </div>
                                    {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                                        <div className="text-xs text-gray-400 mt-1">
                                            {item.selected_modifiers.map(m => m.name).join(', ')}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 bg-black/20 rounded-xl p-1">
                                    <button
                                        onClick={() => onRemoveItem(index)}
                                        className="w-10 h-10 flex items-center justify-center 
                                                 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-500 
                                                 rounded-lg transition-all active:scale-90 touch-target"
                                    >
                                        <Minus className="w-5 h-5" />
                                    </button>
                                    <span className="w-6 text-center font-bold text-white text-lg">
                                        {item.quantity}
                                    </span>
                                    <button
                                        onClick={() => onIncrementItem(index)}
                                        className="w-10 h-10 flex items-center justify-center 
                                                 bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-900/20
                                                 rounded-lg transition-all active:scale-90 touch-target"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Cart Footer */}
                <div className="p-4 border-t border-white/10 bg-black/20">
                    <div className="flex justify-between text-xl font-bold mb-4 text-white">
                        <span>Total:</span>
                        <span className="text-brand-400">{formatPrice(cartTotal)}</span>
                    </div>

                    <button
                        onClick={onSendOrder}
                        disabled={cart.length === 0 || isSending}
                        className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700
                                 text-white font-bold rounded-xl transition-all duration-300
                                 flex items-center justify-center gap-3
                                 shadow-lg shadow-green-500/30 hover:shadow-xl
                                 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg
                                 hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <Send className="w-5 h-5" />
                        {isSending ? 'Enviando...' : 'Enviar a Cocina'}
                    </button>
                </div>
            </div>
        </>
    );
}
