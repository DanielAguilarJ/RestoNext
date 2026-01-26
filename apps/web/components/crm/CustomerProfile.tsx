"use client"

import { useState, useEffect } from 'react';
import { Customer, customersApi, loyaltyApi, LoyaltyTransaction } from '../../lib/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { MapPin, Wallet, Award, Phone, Mail, History, TrendingUp, TrendingDown, Gift, Loader2, Edit, UserCircle } from 'lucide-react';
import { AddAddressModal } from './AddAddressModal';

interface CustomerProfileProps {
    customer: Customer | null;
    onUpdate?: () => void;
}

export function CustomerProfile({ customer, onUpdate }: CustomerProfileProps) {
    const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
    const [loadingTx, setLoadingTx] = useState(false);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (customer?.id) {
            loadTransactions(customer.id);
        } else {
            setTransactions([]);
        }
    }, [customer?.id, refreshKey]);

    const loadTransactions = async (customerId: string) => {
        setLoadingTx(true);
        try {
            const data = await loyaltyApi.getHistory(customerId);
            setTransactions(data);
        } catch (error) {
            console.error('Error loading transactions:', error);
            setTransactions([]);
        } finally {
            setLoadingTx(false);
        }
    };

    const handleAddressAdded = () => {
        setRefreshKey(prev => prev + 1);
        onUpdate?.();
    };

    if (!customer) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-950/50">
                <UserCircle className="w-20 h-20 text-slate-700 mb-4" />
                <p className="text-lg">Selecciona un cliente</p>
                <p className="text-sm text-slate-500">para ver su perfil completo</p>
            </div>
        );
    }

    const getTierColors = (tier: string) => {
        switch (tier) {
            case 'Gold':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
            case 'Silver':
                return 'bg-slate-300/20 text-slate-300 border-slate-300/50';
            default:
                return 'bg-orange-700/20 text-orange-400 border-orange-700/50';
        }
    };

    const getTransactionIcon = (type: string) => {
        if (type.includes('earn') || type.includes('purchase')) {
            return <TrendingUp className="w-4 h-4 text-emerald-500" />;
        }
        if (type.includes('redeem') || type.includes('expire')) {
            return <TrendingDown className="w-4 h-4 text-red-500" />;
        }
        return <Gift className="w-4 h-4 text-purple-500" />;
    };

    return (
        <>
            <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-950/50">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">{customer.name}</h1>
                        <div className="flex flex-wrap gap-4 text-slate-400">
                            {customer.phone && (
                                <a href={`tel:${customer.phone}`} className="flex items-center gap-2 hover:text-emerald-400 transition-colors">
                                    <Phone className="w-4 h-4" /> {customer.phone}
                                </a>
                            )}
                            {customer.email && (
                                <a href={`mailto:${customer.email}`} className="flex items-center gap-2 hover:text-emerald-400 transition-colors">
                                    <Mail className="w-4 h-4" /> {customer.email}
                                </a>
                            )}
                        </div>
                    </div>
                    <Badge className={`text-lg px-4 py-1 ${getTierColors(customer.tier_level)}`}>
                        {customer.tier_level} Member
                    </Badge>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Loyalty Card */}
                    <Card className="bg-slate-800/50 border-slate-700/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-slate-400">Puntos de Lealtad</CardTitle>
                            <Award className="w-5 h-5 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-white">{customer.loyalty_points.toLocaleString()} pts</div>
                            <p className="text-xs text-slate-500 mt-1">Próxima recompensa a 1,000 pts</p>
                        </CardContent>
                    </Card>

                    {/* Wallet Card */}
                    <Card className="bg-slate-800/50 border-slate-700/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-slate-400">Saldo de Monedero</CardTitle>
                            <Wallet className="w-5 h-5 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-white">${customer.wallet_balance.toFixed(2)}</div>
                            <p className="text-xs text-slate-500 mt-1">Disponible para uso</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Addresses Section */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-white flex items-center gap-2">
                            <MapPin className="w-5 h-5" /> Direcciones de Entrega
                        </CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddressModal(true)}
                            className="border-dashed border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700"
                        >
                            + Agregar
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {customer.addresses.length === 0 ? (
                            <p className="text-slate-500 italic text-center py-4">Sin direcciones guardadas</p>
                        ) : (
                            customer.addresses.map((addr, idx) => (
                                <div key={idx} className="p-3 rounded-lg bg-slate-700/30 border border-slate-600/30 flex justify-between items-start">
                                    <div>
                                        <p className="font-medium text-white flex items-center gap-2">
                                            {addr.label}
                                        </p>
                                        <p className="text-sm text-slate-400 mt-1">{addr.address}</p>
                                        {addr.instructions && (
                                            <p className="text-xs text-slate-500 mt-1 italic">📝 {addr.instructions}</p>
                                        )}
                                    </div>
                                    <button className="p-1.5 hover:bg-slate-600 rounded transition-colors">
                                        <Edit className="w-4 h-4 text-slate-400" />
                                    </button>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Transaction History */}
                <Card className="bg-slate-800/50 border-slate-700/50">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <History className="w-5 h-5" /> Historial de Actividad
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingTx ? (
                            <div className="py-8 flex flex-col items-center text-slate-400">
                                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                                <p className="text-sm">Cargando historial...</p>
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="py-8 text-center">
                                <History className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                                <p className="text-slate-500">Sin transacciones aún</p>
                                <p className="text-xs text-slate-600 mt-1">Las compras y canjes aparecerán aquí</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {transactions.map((tx) => (
                                    <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/20 hover:bg-slate-700/30 transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                                            {getTransactionIcon(tx.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{tx.description}</p>
                                            <p className="text-xs text-slate-500">
                                                {new Date(tx.created_at).toLocaleDateString('es-MX', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            {tx.points_delta !== 0 && (
                                                <p className={`text-sm font-bold ${tx.points_delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {tx.points_delta > 0 ? '+' : ''}{tx.points_delta} pts
                                                </p>
                                            )}
                                            {tx.amount_delta !== 0 && (
                                                <p className={`text-xs ${tx.amount_delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {tx.amount_delta > 0 ? '+' : ''}${tx.amount_delta.toFixed(2)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Notes Section */}
                {customer.notes && (
                    <Card className="bg-slate-800/50 border-slate-700/50">
                        <CardHeader>
                            <CardTitle className="text-white text-sm">Notas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-400 text-sm whitespace-pre-wrap">{customer.notes}</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            <AddAddressModal
                isOpen={showAddressModal}
                onClose={() => setShowAddressModal(false)}
                customerId={customer.id}
                onSuccess={handleAddressAdded}
            />
        </>
    );
}
