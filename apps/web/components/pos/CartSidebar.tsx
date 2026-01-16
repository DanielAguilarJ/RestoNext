import { X, ShoppingCart, Package, Minus, Plus, Send } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { CartItem } from "@/lib/store";

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
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ShoppingCart className="w-6 h-6 text-brand-400" />
                        Tu Pedido
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
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

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => onRemoveItem(index)}
                                        className="w-9 h-9 flex items-center justify-center 
                                                 bg-white/10 hover:bg-red-500/50 rounded-full transition-colors"
                                    >
                                        <Minus className="w-4 h-4 text-white" />
                                    </button>
                                    <span className="w-8 text-center font-bold text-white text-lg">
                                        {item.quantity}
                                    </span>
                                    <button
                                        onClick={() => onIncrementItem(index)}
                                        className="w-9 h-9 flex items-center justify-center 
                                                 bg-brand-500 hover:bg-brand-600 rounded-full transition-colors"
                                    >
                                        <Plus className="w-4 h-4 text-white" />
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
