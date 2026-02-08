"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Receipt, Banknote, CreditCard, ArrowLeft, Clock,
    Check, AlertCircle, RefreshCw, Wallet,
    Sparkles, Phone, ShoppingCart, Plus, Minus, Trash2,
    Search, Loader2, X, ClipboardList, Eye, ChevronDown,
    ChevronUp, Coffee, UtensilsCrossed
} from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";
import { menuApi, ordersApi, cashierApi } from "@/lib/api";

/* ─── Types ────────────────────────────────────────── */

interface MenuCategory {
    id: string;
    $id?: string;
    name: string;
    description?: string;
}

interface MenuItem {
    id: string;
    $id?: string;
    name: string;
    price: number;
    available?: boolean;
    is_available?: boolean;
    image_url?: string;
    description?: string;
}

interface CartItem {
    id: string;
    menu_item_id: string;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
}

interface ActiveOrderItem {
    id: string;
    menu_item_name: string;
    menu_item_id?: string;
    quantity: number;
    unit_price: number;
    status: string;
    notes?: string;
}

interface ActiveOrder {
    id: string;
    table_number?: number;
    table_id?: string;
    status: string;
    total: number;
    subtotal: number;
    tax: number;
    notes?: string;
    items: ActiveOrderItem[];
    created_at: string;
    paid_at?: string;
}

/* ─── Helpers ──────────────────────────────────────── */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://restonext.me/api";

const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("access_token");
};

const getId = (o: { id?: string; $id?: string }) => o.id || o.$id || "";

const elapsed = (iso: string) => {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return "Ahora";
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
};

const badge = (s: string) => {
    const map: Record<string, { label: string; color: string }> = {
        open: { label: "Abierta", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
        in_progress: { label: "En Cocina", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
        ready: { label: "Lista", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
        delivered: { label: "Entregada", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
        pending_payment: { label: "Por Cobrar", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    };
    return map[s] ?? { label: s, color: "bg-slate-500/20 text-slate-400 border-slate-500/30" };
};

/* ─── Page ─────────────────────────────────────────── */

export default function CafeteriaCashierPage() {
    // Tabs
    const [tab, setTab] = useState<"orders" | "pos">("orders");

    // Menu
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [selCat, setSelCat] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [loadMenu, setLoadMenu] = useState(true);

    // Cart
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);

    // Orders
    const [orders, setOrders] = useState<ActiveOrder[]>([]);
    const [loadOrders, setLoadOrders] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [paying, setPaying] = useState<string | null>(null);

    // Payment
    const [payMethod, setPayMethod] = useState("cash");
    const [processing, setProcessing] = useState(false);

    // UI
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    /* ── Load menu ── */
    useEffect(() => {
        (async () => {
            try {
                setLoadMenu(true);
                const cats = (await menuApi.getCategories()) as unknown as MenuCategory[];
                setCategories(cats);
                if (cats.length > 0) {
                    const cid = getId(cats[0]);
                    setSelCat(cid);
                    setMenuItems((await menuApi.getItems(cid)) as unknown as MenuItem[]);
                }
            } catch (e) {
                console.error("menu:", e);
            } finally {
                setLoadMenu(false);
            }
        })();
    }, []);

    useEffect(() => {
        if (selCat) {
            menuApi
                .getItems(selCat)
                .then((i) => setMenuItems(i as unknown as MenuItem[]))
                .catch(console.error);
        }
    }, [selCat]);

    /* ── Load orders ── */
    const fetchOrders = useCallback(async () => {
        try {
            setLoadOrders(true);
            const list = (await ordersApi.list({
                status: "open,in_progress,ready,delivered,pending_payment",
            })) as unknown as ActiveOrder[];
            setOrders(list.filter((o) => o.status !== "paid" && o.status !== "cancelled"));
        } catch (e) {
            console.error("orders:", e);
        } finally {
            setLoadOrders(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
        const iv = setInterval(fetchOrders, 15000);
        return () => clearInterval(iv);
    }, [fetchOrders]);

    /* ── Cart helpers ── */
    const addToCart = (item: MenuItem) => {
        const mid = getId(item);
        setCart((prev) => {
            const ex = prev.find((i) => i.menu_item_id === mid);
            if (ex) return prev.map((i) => (i.menu_item_id === mid ? { ...i, quantity: i.quantity + 1 } : i));
            return [...prev, { id: Date.now().toString(), menu_item_id: mid, name: item.name, price: item.price, quantity: 1 }];
        });
    };

    const updateQty = (id: string, d: number) =>
        setCart((p) =>
            p
                .map((i) => (i.id === id ? { ...i, quantity: Math.max(0, i.quantity + d) } : i))
                .filter((i) => i.quantity > 0),
        );

    const removeItem = (id: string) => setCart((p) => p.filter((i) => i.id !== id));
    const clearCart = () => setCart([]);
    const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

    /* ── Checkout (new cafeteria order) ── */
    const handleCheckout = async () => {
        if (!cart.length) return;
        setProcessing(true);
        setError(null);
        try {
            const token = getToken();
            if (!token) { window.location.href = "/login"; return; }
            const res = await fetch(`${API_BASE}/orders/cafeteria`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: cart.map((i) => ({ menu_item_id: i.menu_item_id, quantity: i.quantity, notes: i.notes })),
                    payment_method: payMethod,
                    total: cartTotal,
                }),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.detail || "Error al procesar el pedido");
            }
            const data = await res.json().catch(() => ({}));
            setSuccess(`Pedido de ${formatPrice(cartTotal)} enviado a cocina!`);
            clearCart();
            setShowCart(false);
            try {
                await cashierApi.recordSale({ order_id: data.order_id || "", amount: cartTotal, tip_amount: 0, payment_method: payMethod as "cash" | "card" | "transfer" });
            } catch { /* no shift */ }
            setTimeout(() => setSuccess(null), 3000);
        } catch (e: any) {
            setError(e.message || "Error");
        } finally {
            setProcessing(false);
        }
    };

    /* ── Pay existing order ── */
    const handlePay = async (oid: string, method: string) => {
        setPaying(oid);
        setError(null);
        try {
            await ordersApi.pay(oid, { payment_method: method as any, amount: 0 });
            const order = orders.find((o) => o.id === oid);
            if (order) {
                try {
                    await cashierApi.recordSale({ order_id: oid, amount: order.total, tip_amount: 0, payment_method: method as "cash" | "card" | "transfer" });
                } catch { /* no shift */ }
            }
            setSuccess(`Orden cobrada! ${formatPrice(order?.total || 0)}`);
            setOrders((p) => p.filter((o) => o.id !== oid));
            setTimeout(() => setSuccess(null), 3000);
        } catch (e: any) {
            setError(e.message || "Error al procesar el pago");
        } finally {
            setPaying(null);
        }
    };

    const filtered = search ? menuItems.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())) : menuItems;

    /* ── Loading ── */
    if (loadMenu && loadOrders) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
            </div>
        );
    }

    /* ─────────────────── RENDER ─────────────────── */
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
            {/* HEADER */}
            <header className="bg-slate-900/80 border-b border-slate-700/50 backdrop-blur-xl sticky top-0 z-20">
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-lg font-bold text-white flex items-center gap-2">
                            Caja <Sparkles className="w-4 h-4 text-yellow-400" />
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/cashier" className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl" title="Panel de Caja">
                            <Receipt className="w-5 h-5" />
                        </Link>
                        {tab === "pos" && (
                            <button onClick={() => setShowCart(true)} className="relative p-3 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl shadow-lg">
                                <ShoppingCart className="w-6 h-6" />
                                {cartCount > 0 && (
                                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 text-slate-900 rounded-full text-sm font-bold flex items-center justify-center">
                                        {cartCount}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* TAB BAR */}
                <div className="px-4 pb-2 flex gap-2">
                    <button
                        onClick={() => setTab("orders")}
                        className={cn(
                            "flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all",
                            tab === "orders" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-slate-800/50 text-slate-400 hover:bg-slate-700/50",
                        )}
                    >
                        <ClipboardList className="w-4 h-4" />
                        Pedidos Activos
                        {orders.length > 0 && (
                            <span className="ml-1 bg-amber-500 text-slate-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                {orders.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setTab("pos")}
                        className={cn(
                            "flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all",
                            tab === "pos" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-800/50 text-slate-400 hover:bg-slate-700/50",
                        )}
                    >
                        <Coffee className="w-4 h-4" />
                        Nueva Orden
                    </button>
                </div>
            </header>

            {/* BANNERS */}
            {success && (
                <div className="px-4 pt-4">
                    <div className="p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-xl flex items-center gap-3">
                        <Check className="w-5 h-5 text-emerald-400" />
                        <span className="text-emerald-300 font-medium">{success}</span>
                    </div>
                </div>
            )}
            {error && (
                <div className="px-4 pt-4">
                    <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                            <span className="text-red-300">{error}</span>
                        </div>
                        <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* ═══════ TAB: PEDIDOS ACTIVOS ═══════ */}
            {tab === "orders" && (
                <div className="flex-1 px-4 py-4 overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <UtensilsCrossed className="w-5 h-5 text-amber-400" />
                            Cuentas por Cobrar
                        </h2>
                        <button onClick={fetchOrders} disabled={loadOrders} className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm">
                            <RefreshCw className={cn("w-4 h-4", loadOrders && "animate-spin")} />
                            Actualizar
                        </button>
                    </div>

                    {loadOrders && orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                            <Loader2 className="w-10 h-10 animate-spin mb-4 text-slate-600" />
                            <p>Cargando pedidos...</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                            <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mb-4">
                                <Check className="w-10 h-10 text-slate-600" />
                            </div>
                            <p className="text-lg font-medium text-slate-400 mb-1">No hay cuentas pendientes</p>
                            <p className="text-sm text-slate-500">Todas las ordenes han sido cobradas</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {orders.map((order) => {
                                const st = badge(order.status);
                                const open = expanded === order.id;
                                const isPaying = paying === order.id;
                                return (
                                    <div key={order.id} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
                                        {/* header row */}
                                        <button onClick={() => setExpanded(open ? null : order.id)} className="w-full p-4 flex items-center justify-between hover:bg-slate-800/80 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl flex items-center justify-center">
                                                    <span className="text-amber-400 font-bold text-lg">{order.table_number || "C"}</span>
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-bold text-white">{order.table_number ? `Mesa ${order.table_number}` : "Mostrador"}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", st.color)}>{st.label}</span>
                                                        <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{elapsed(order.created_at)}</span>
                                                        <span className="text-xs text-slate-500">{order.items?.length || 0} items</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl font-black text-amber-400">{formatPrice(order.total)}</span>
                                                {open ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                                            </div>
                                        </button>

                                        {/* expanded detail */}
                                        {open && (
                                            <div className="border-t border-slate-700/50">
                                                {/* items */}
                                                <div className="p-4 space-y-2">
                                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Detalle del consumo</p>
                                                    {order.items && order.items.length > 0 ? (
                                                        order.items.map((it, idx) => (
                                                            <div key={it.id || idx} className="flex items-center justify-between py-2 px-3 bg-slate-700/30 rounded-lg">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-sm font-bold text-emerald-400 w-6 text-center">{it.quantity}x</span>
                                                                    <div>
                                                                        <p className="text-sm font-medium text-white">{it.menu_item_name || "Producto"}</p>
                                                                        {it.notes && <p className="text-xs text-slate-500 italic">{it.notes}</p>}
                                                                    </div>
                                                                </div>
                                                                <span className="text-sm font-bold text-slate-300">{formatPrice(it.unit_price * it.quantity)}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-slate-500 italic py-2">Sin productos registrados</p>
                                                    )}
                                                </div>

                                                {/* totals */}
                                                <div className="px-4 pb-2 space-y-1">
                                                    <div className="flex justify-between text-sm text-slate-400">
                                                        <span>Subtotal</span>
                                                        <span>{formatPrice(order.subtotal || order.total / 1.16)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm text-slate-400">
                                                        <span>IVA 16%</span>
                                                        <span>{formatPrice(order.tax || order.total - order.total / 1.16)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-lg font-black text-white pt-1 border-t border-slate-700/50">
                                                        <span>Total</span>
                                                        <span className="text-amber-400">{formatPrice(order.total)}</span>
                                                    </div>
                                                </div>

                                                {/* pay buttons */}
                                                <div className="p-4 border-t border-slate-700/50">
                                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Cobrar con</p>
                                                    {isPaying ? (
                                                        <div className="flex items-center justify-center py-4">
                                                            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                                                            <span className="ml-2 text-slate-400">Procesando pago...</span>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <button onClick={() => handlePay(order.id, "cash")} className="py-3 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95">
                                                                <Banknote className="w-4 h-4" />Efectivo
                                                            </button>
                                                            <button onClick={() => handlePay(order.id, "card")} className="py-3 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95">
                                                                <CreditCard className="w-4 h-4" />Tarjeta
                                                            </button>
                                                            <button onClick={() => handlePay(order.id, "transfer")} className="py-3 px-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95">
                                                                <Phone className="w-4 h-4" />Transfer
                                                            </button>
                                                        </div>
                                                    )}
                                                    <Link href={`/cashier/split/${order.id}`} className="mt-3 w-full py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                                                        <Eye className="w-4 h-4" />Dividir Cuenta
                                                    </Link>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ═══════ TAB: NUEVA ORDEN (POS) ═══════ */}
            {tab === "pos" && (
                <>
                    {categories.length === 0 && !loadMenu && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                            <div className="w-24 h-24 bg-slate-800 rounded-3xl flex items-center justify-center mb-6">
                                <Receipt className="w-12 h-12 text-slate-600" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">No hay productos configurados</h2>
                            <p className="text-slate-400 mb-6 max-w-md">Primero debes agregar categorias y productos desde el administrador del menu.</p>
                            <Link href="/admin/menu" className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl">
                                Ir a Configurar Menu
                            </Link>
                        </div>
                    )}

                    {categories.length > 0 && (
                        <>
                            {/* Search */}
                            <div className="px-4 py-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Buscar producto..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            {/* Categories */}
                            <div className="px-4 pb-3">
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                    {categories.map((cat) => {
                                        const cid = getId(cat);
                                        return (
                                            <button
                                                key={cid}
                                                onClick={() => { setSelCat(cid); setSearch(""); }}
                                                className={cn("px-4 py-2 rounded-xl font-medium whitespace-nowrap", selCat === cid ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700")}
                                            >
                                                {cat.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Products */}
                            <div className="flex-1 px-4 pb-4 overflow-y-auto">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {filtered.map((item) => {
                                        const iid = getId(item);
                                        const avail = item.is_available !== false && item.available !== false;
                                        return (
                                            <button
                                                key={iid}
                                                onClick={() => addToCart(item)}
                                                disabled={!avail}
                                                className={cn(
                                                    "p-4 rounded-2xl border text-left transition-all active:scale-95",
                                                    avail ? "bg-slate-800/50 border-slate-700 hover:border-emerald-500/50" : "bg-slate-800/30 border-slate-700/50 opacity-50 cursor-not-allowed",
                                                )}
                                            >
                                                {item.image_url && (
                                                    <div className="w-full aspect-square rounded-xl bg-slate-700 mb-3 overflow-hidden">
                                                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                                <h3 className="font-medium text-white text-sm line-clamp-2 mb-1">{item.name}</h3>
                                                <p className="text-emerald-400 font-bold">{formatPrice(item.price)}</p>
                                                {!avail && <span className="text-xs text-red-400">No disponible</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                                {filtered.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                                        <Search className="w-12 h-12 mb-4 text-slate-600" />
                                        <p>No se encontraron productos</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </>
            )}

            {/* ═══════ CART SIDEBAR ═══════ */}
            {showCart && (
                <div className="fixed inset-0 z-30">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCart(false)} />
                    <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-slate-900 border-l border-slate-700 flex flex-col">
                        {/* header */}
                        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <ShoppingCart className="w-6 h-6 text-emerald-400" /> Carrito
                            </h2>
                            <button onClick={() => setShowCart(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* items */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {cart.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                    <ShoppingCart className="w-16 h-16 mb-4 text-slate-600" />
                                    <p>El carrito esta vacio</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {cart.map((item) => (
                                        <div key={item.id} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-white">{item.name}</h4>
                                                    <p className="text-sm text-emerald-400">{formatPrice(item.price)}</p>
                                                </div>
                                                <button onClick={() => removeItem(item.id)} className="p-1 text-red-400 hover:text-red-300">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-3 mt-2">
                                                <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center text-white">
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <span className="font-bold text-white w-8 text-center">{item.quantity}</span>
                                                <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center text-white">
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                                <span className="ml-auto font-bold text-white">{formatPrice(item.price * item.quantity)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* payment */}
                        {cart.length > 0 && (
                            <div className="p-4 border-t border-slate-700 space-y-4">
                                <div>
                                    <p className="text-sm text-slate-400 mb-2">Metodo de Pago</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { key: "cash", icon: Banknote, label: "Efectivo", active: "bg-emerald-600 text-white" },
                                            { key: "card", icon: CreditCard, label: "Tarjeta", active: "bg-blue-600 text-white" },
                                            { key: "transfer", icon: Phone, label: "Trans.", active: "bg-violet-600 text-white" },
                                        ].map((m) => (
                                            <button
                                                key={m.key}
                                                onClick={() => setPayMethod(m.key)}
                                                className={cn("py-2 px-3 rounded-xl font-medium text-sm flex items-center justify-center gap-1", payMethod === m.key ? m.active : "bg-slate-700 text-slate-300")}
                                            >
                                                <m.icon className="w-4 h-4" />{m.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between py-3 border-t border-slate-700">
                                    <span className="text-lg text-slate-400">Total</span>
                                    <span className="text-2xl font-bold text-white">{formatPrice(cartTotal)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={clearCart} className="py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl">Limpiar</button>
                                    <button
                                        onClick={handleCheckout}
                                        disabled={processing}
                                        className="py-3 font-bold text-white rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {processing ? <><Loader2 className="w-5 h-5 animate-spin" />Procesando...</> : <><Check className="w-5 h-5" />Cobrar</>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
